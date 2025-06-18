/**
 * index.js
 * This file is the main entrypoint for the application.
 * @author  Denis Bled - Yike Ouyang
 * @see https://www.newmips.com
 */
const express = require('express');
const ffmpeg = require('fluent-ffmpeg');
const { PassThrough } = require('stream');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();


app.use(express.json());


/**
 * Convert audio buffer using FFmpeg to ensure compatibility with AudioSocket
 * @param {Buffer} audioBuffer - The audio buffer to convert
 * @returns {Promise<Buffer>} - The converted audio buffer
 */
const convertAudioWithFFmpeg = (audioPassthrough) => {
  return new Promise((resolve, reject) => {
    try {
      const inputStream = audioPassthrough;
      const outputChunks = [];

      ffmpeg(inputStream)
        .inputFormat('wav')
        .audioCodec('pcm_s16le')
        .audioFrequency(8000)
        .audioChannels(1)
        .format('s16le') // Output raw PCM
        .on('start', (cmdLine) => {
          console.log('FFmpeg conversion started:', cmdLine);
        })
        .on('error', (err) => {
          console.error('FFmpeg conversion error:', err.message);
          reject(err);
        })
        .on('end', () => {
          console.log('FFmpeg conversion completed');
          const convertedBuffer = Buffer.concat(outputChunks);
          resolve(convertedBuffer);
        })
        .pipe(new PassThrough())
        .on('data', (chunk) => {
          outputChunks.push(chunk);
        });

      // Write the audio buffer to ffmpeg input stream
      inputStream.end();

    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Handle incoming HTTP POST request with JSON body containing a text string,
 * and streams the text-to-speech audio response back to the client.
 *
 * @param {express.Request} req
 * @param {express.Response} res
 */
const handleTextToSpeech = async (req, res) => {
  const { text } = req.body;

  if (!text) {
    return res.status(400).json({ message: 'Text is required' });
  }

  try {

    const u = new URLSearchParams({ text: text });

    res.setHeader('Content-Type', 'audio/wav');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const response = await fetch(`${process.env.COQUI_AI_TTS_URL}`, { method: 'POST', body: u });

    if (response) {
      const audioPassthrough = response.body;

      // Convert audio content with FFmpeg before sending
      const convertedAudio = await convertAudioWithFFmpeg(audioPassthrough);
      console.log("Converted audio size:", convertedAudio.length, "bytes");

      res.write(convertedAudio);
    }
    else {
      res.write(null);
    }

    res.end();

  } catch (error) {
    console.error('Error calling CoquiTTS API:', error.message);
    res.status(500).json({ message: 'Error communicating with CoquiTTS' });
  }
}

app.post('/text-to-speech-stream', handleTextToSpeech);

const port = process.env.PORT || 6003;
app.listen(port, () => {
  console.log(`Coqui TTS listening on port ${port}`);
});

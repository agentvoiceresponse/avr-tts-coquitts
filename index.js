const express = require('express');
const axios = require('axios');
const { spawn } = require('child_process');

require('dotenv').config();

const app = express();
app.use(express.json());

const COQUI_AI_TTS_URL = process.env.COQUI_AI_TTS_URL || 'http://avr-coqui-ai-tts:5002/api/tts';
const FFMPEG_BIN = process.env.FFMPEG_PATH || 'ffmpeg';

const handleTextToSpeech = async (req, res) => {
  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ message: 'Text is required' });
  }

  try {
    const params = new URLSearchParams({ text, speaker_id: 'p376', style_wav: '', language_id: '' });
    const url = COQUI_AI_TTS_URL + '?' + params.toString();
    console.log(`Calling Coqui AI TTS API at ${url}`);
    // Call TTS API (audio stream)
    const response = await axios.get(url, {
      responseType: 'stream',
      validateStatus: () => true, // manual status handling so we can inspect response
    });
    
    console.log(`Response from Coqui AI TTS API status: ${response.status}`);

    if (response.status < 200 || response.status >= 300) {
      return res.status(response.status).json({ message: 'Error from TTS API' });
    }
    if (!response.data || typeof response.data.pipe !== 'function') {
      throw new Error('TTS stream not readable');
    }

    // HTTP response headers
    res.writeHead(200, {
      'Content-Type': 'audio/wav',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Transfer-Encoding': 'chunked',
    });

    // Run ffmpeg in streaming mode
    // Input: stdin (API stream)
    // Output: stdout (converted stream)
    const ffmpeg = spawn(FFMPEG_BIN, [
      '-i', 'pipe:0',        // Input from stdin
      '-ar', '8000',         // Sample rate 8000 Hz
      '-ac', '1',            // 1 channel (mono)
      '-f', 'wav',           // Format WAV
      '-acodec', 'pcm_s16le' // PCM 16 bits little endian
      , 'pipe:1'             // Output to stdout
    ]);

    // ffmpeg error handling
    ffmpeg.stderr.on('data', (data) => {
      console.error(`ffmpeg stderr: ${data.toString()}`);
    });

    ffmpeg.on('error', (err) => {
      console.error('ffmpeg process error:', err);
      if (!res.headersSent) {
        const message = err.code === 'ENOENT'
          ? 'ffmpeg binary not found. Install ffmpeg or set FFMPEG_PATH.'
          : 'ffmpeg error';
        res.status(500).json({ message });
      }
    });

    ffmpeg.on('close', (code) => {
      if (code !== 0) {
        console.error(`ffmpeg exited with code ${code}`);
      }
      res.end();
    });

    // Pipe API audio stream to ffmpeg stdin
    response.data.pipe(ffmpeg.stdin);

    // Pipe ffmpeg output to HTTP response
    ffmpeg.stdout.pipe(res);

  } catch (error) {
    console.error('Error in TTS streaming:', error.message);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Internal Server Error' });
    }
  }
};

app.post('/text-to-speech-stream', handleTextToSpeech);

const port = process.env.PORT || 6032;
app.listen(port, () => {
  console.log(`Coqui TTS proxy listening on port ${port}`);
});

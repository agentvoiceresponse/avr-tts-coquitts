const express = require('express');
const fetch = require('node-fetch');
const { spawn } = require('child_process');

const app = express();

app.use(express.json());

const handleTextToSpeech = async (req, res) => {
  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ message: 'Text is required' });
  }

  try {
    const params = new URLSearchParams({ text });

    // Appel API TTS (le flux audio)
    const response = await fetch(`${process.env.COQUI_AI_TTS_URL}`, {
      method: 'POST',
      body: params,
    });

    if (!response.ok) {
      return res.status(response.status).json({ message: 'Error from TTS API' });
    }

    // Headers réponse HTTP
    res.writeHead(200, {
      'Content-Type': 'audio/wav',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Transfer-Encoding': 'chunked',
    });

    // Lancer ffmpeg en mode streaming
    // Input : stdin (flux de l'API)
    // Output : stdout (flux converti)
    const ffmpeg = spawn('ffmpeg', [
      '-i', 'pipe:0',        // Input depuis stdin
      '-ar', '8000',         // Sample rate 8000 Hz
      '-ac', '1',            // 1 channel (mono)
      '-f', 'wav',           // Format WAV
      '-acodec', 'pcm_s16le' // PCM 16 bits little endian
      , 'pipe:1'             // Output vers stdout
    ]);

    // Gestion erreur ffmpeg
    ffmpeg.stderr.on('data', (data) => {
      console.error(`ffmpeg stderr: ${data.toString()}`);
    });

    ffmpeg.on('error', (err) => {
      console.error('ffmpeg process error:', err);
      if (!res.headersSent) {
        res.status(500).json({ message: 'ffmpeg error' });
      }
    });

    ffmpeg.on('close', (code) => {
      if (code !== 0) {
        console.error(`ffmpeg exited with code ${code}`);
      }
      res.end();
    });

    // Pipe du flux audio API vers ffmpeg stdin
    response.body.pipe(ffmpeg.stdin);

    // Pipe sortie ffmpeg vers réponse HTTP
    ffmpeg.stdout.pipe(res);

  } catch (error) {
    console.error('Error in TTS streaming:', error.message);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Internal Server Error' });
    }
  }
};

app.post('/text-to-speech-stream', handleTextToSpeech);

const port = process.env.PORT || 6003;
app.listen(port, () => {
  console.log(`Coqui TTS proxy listening on port ${port}`);
});

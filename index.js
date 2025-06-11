const express = require("express");
const { Readable } = require("stream");

require("dotenv").config();

const DEFAULT_PORT = 6032;

const app = express();
app.use(express.json());

const handleTextToSpeech = async (req, res) => {
  const { text, voice = "alloy" } = req.body;

  console.log(`[${new Date().toISOString()}] Received TTS request`);
  console.log(
    `Text: ${
      text ? text.slice(0, 50) + (text.length > 50 ? "..." : "") : "N/A"
    }`
  );
  console.log(`Voice: ${voice}`);

  if (!text) {
    console.warn(`[${new Date().toISOString()}] No text provided in request`);
    return res.status(400).json({ message: "Text is required" });
  }

  res.setHeader("Content-Type", "audio/wav");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    const response = await fetch(
      `https://api.coqui.ai/v1/tts?text=${encodeURIComponent(
        text
      )}&voice=${voice}`
    );
    const audioBuffer = await response.arrayBuffer();
    const audioStream = Readable.from(Buffer.from(audioBuffer));
    audioStream.pipe(res);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] TTS processing error:`, error);
    if (!res.headersSent) {
      res.status(500).json({
        message: "Error processing text-to-speech request",
        error: error.message,
      });
    }
  }
};

app.post("/text-to-speech-stream", handleTextToSpeech);

const port = process.env.PORT || DEFAULT_PORT;
app.listen(port, () => {
  console.log(`Coqui TTS service listening on port ${port}`);
});

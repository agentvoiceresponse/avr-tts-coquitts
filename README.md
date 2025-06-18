# Agent Voice Response - CoquiTTS Text-to-Speech Integration

[![Discord](https://img.shields.io/discord/1347239846632226998?label=Discord&logo=discord)](https://discord.gg/DFTU69Hg74)
[![GitHub Repo stars](https://img.shields.io/github/stars/agentvoiceresponse/avr-tts-google-cloud-tts?style=social)](https://github.com/agentvoiceresponse/avr-tts-google-cloud-tts)
[![Docker Pulls](https://img.shields.io/docker/pulls/agentvoiceresponse/avr-tts-google-cloud-tts?label=Docker%20Pulls&logo=docker)](https://hub.docker.com/r/agentvoiceresponse/avr-tts-google-cloud-tts)
[![Ko-fi](https://img.shields.io/badge/Support%20us%20on-Ko--fi-ff5e5b.svg)](https://ko-fi.com/agentvoiceresponse)


This project demonstrates the integration of **Agent Voice Response** with **CoquiTTS Text-to-Speech (TTS)** localy or remotely. The application sets up an Express.js server that accepts a text string from a client via HTTP POST requests, converts the text into speech using CoquiTTS, and streams the audio back to the client in real-time.

## Prerequisites

To run this project, you will need:

1. **Node.js** and **npm** installed.
2. An instance of **Coqui AI TTS API** for which we provide local setup instructions (a minimum of **10 to 12Gb** disk space is required).


## Setup Coqui AI TTS

First of all, you will need to have an instance of CoquiAI TTS API running.

Simply run the following command:

```bash
docker run --rm -it -p 5002:5002 --entrypoint /bin/bash ghcr.io/coqui-ai/tts-cpu
python3 TTS/server/server.py --list_models #To get the list of available models
python3 TTS/server/server.py --model_name tts_models/en/vctk/vits # To start a server
```

When getting the list of models, you will be able to choose the suitable model for your language. Then replace ```tts_models/en/vctk/vits``` in last instruction with your selected model.

For instance, you can use ```tts_models/fr/mai/tacotron2-DDC``` for french language.

Please note that Coqui AI TTS may take some minutes to start...


## Setup AVR CoquiTTS

### 1. Clone the Repository

```bash
git clone https://github.com/agentvoiceresponse/avr-tts-coquitts
cd avr-tts-coquitts
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

The following environment variables can be configured in your `.env` file:

```bash
PORT=6032                             # Server port (default: 6032)
```

## How It Works

The application accepts a text input from the client via an HTTP POST request to the `/text-to-speech-stream` route, converts the text into speech using **CoquiTTS Text-to-Speech**, and streams the resulting audio back in WAV format (l16), suitable for integration with **Asterisk Audio Socket**.

### Key Components

- **Express.js Server**: Handles incoming HTTP POST requests with the text body and streams the audio back to the client.
- **CoquiTTS Text-to-Speech Client**: Converts text into speech using the CoquiTTS API.
- **Audio Streaming**: The audio data is streamed back to the client in real-time using Node.js streams.

### Example Code Overview

- **CoquiTTS Request Configuration**: Set up voice settings like model and voice selection.
- **Audio Streaming**: The application streams the audio content directly to the client using the `res.write()` method.

## Running the Application

To start the application:

```bash
npm start
```

For development with auto-reload:

```bash
npm run start:dev
```

The server will start and listen on the port defined in the environment variable or default to `6032`.

### Sending a Text Request

You can use `curl` to send a POST request to the server with a JSON body containing `text` and optional `voice` fields:

```bash
curl -X POST http://localhost:6032/text-to-speech-stream \
     -H "Content-Type: application/json" \
     -d '{"text": "Hello, welcome to Agent Voice Response!", "voice": "alloy"}' --output response.wav
```

The audio response will be saved in `response.wav` in WAV format.


## Setup Coqui services in AVR-Infra


Modify "docker-compose.yaml" file to include the 2 following services for TTS:

```bash
  avr-tts-coquitts:
    image: agentvoiceresponse/ave-tts-coquitts
    platform: linux/x86_64
    container_name: avr-tts-coquitts
    restart: always
    environment:
      - PORT=6032
    ports:
      - 6032:6032
    networks:
      - avr

  avr-coqui-ai-tts:
    image: ghcr.io/coqui-ai/tts-cpu
    platform: linux/x86_64
    container_name: avr-coqui-ai-tts
    entrypoint: "python3 TTS/server/server.py --model_name tts_models/en/vctk/vits"
    restart: always
    environment:
      - PORT=5002
    ports:
      - 5002:5002
    networks:
      - avr
```

Same has before, replace model name ``tts_models/en/vctk/vits``` with your favourite one.

Please make sure, your .env variables are pointing to TTS URL:

```bash
TTS_URL=http://avr-tts-coquitts:6032/text-to-speech-stream
```


## Contributors

We would like to express our gratitude to all the contributors who have helped make this project possible:

- [Denis Bled & Yike Ouyang](https://github.com/newmips) - For their valuable contributions and support


## Support & Community

*   **Website:** [https://agentvoiceresponse.com](https://agentvoiceresponse.com) - Official website.
*   **GitHub:** [https://github.com/agentvoiceresponse](https://github.com/agentvoiceresponse) - Report issues, contribute code.
*   **Discord:** [https://discord.gg/DFTU69Hg74](https://discord.gg/DFTU69Hg74) - Join the community discussion.
*   **Docker Hub:** [https://hub.docker.com/u/agentvoiceresponse](https://hub.docker.com/u/agentvoiceresponse) - Find Docker images.
*   **NPM:** [https://www.npmjs.com/~agentvoiceresponse](https://www.npmjs.com/~agentvoiceresponse) - Browse our packages.
*   **Wiki:** [https://wiki.agentvoiceresponse.com/en/home](https://wiki.agentvoiceresponse.com/en/home) - Project documentation and guides.

## Support AVR

AVR is free and open-source. If you find it valuable, consider supporting its development:

<a href="https://ko-fi.com/agentvoiceresponse" target="_blank"><img src="https://ko-fi.com/img/githubbutton_sm.svg" alt="Support us on Ko-fi"></a>

## License

MIT License - see the [LICENSE](LICENSE.md) file for details.
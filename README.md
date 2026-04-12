# Hour of Robotics

Interactive learning app for teaching robotics concepts through guided lessons, Blockly exercises, and progress tracking.

## Stack

- Next.js
- TypeScript
- Tailwind CSS

## Development

```bash
npm install
npm run dev
```

## Local Gemma

Run Gemma locally through Ollama in Docker so the web app can call it:

```bash
cp .env.example .env.local
docker compose --env-file .env.local -f docker-compose.gemma.yml up -d
```

This starts an Ollama container on `http://127.0.0.1:11434` and pulls `gemma3:1b` by default, which is a reasonable laptop-sized model. You can override the model in `.env.local` with `GEMMA_MODEL=gemma3:4b` or another Ollama-compatible Gemma tag if your machine can handle it.

The app proxies requests through `POST /api/gemma`, and the Blockly `gemma` block uses that route at runtime.

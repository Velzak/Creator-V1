# Creator-V1

A Netlify-ready AI chat application built with React, Vite, and a serverless function that includes a built-in Creator-V1 AI model.

## Features

- Modern React + TypeScript frontend
- Built-in Creator-V1 local AI model in `netlify/functions/chat.js`
- Optional OpenAI fallback for GPT-4o Mini and GPT-3.5 Turbo
- Conversation history and reset control
- Netlify deployment configuration included

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run locally:
   ```bash
   npm run dev
   ```

3. Build for production:
   ```bash
   npm run build
   ```

## Using the app

- The default model is `creator-v1`, which runs locally inside the Netlify function and does not require an external API key.
- To use OpenAI fallback, select `GPT-4o Mini` or `GPT-3.5 Turbo` in the model selector and add `OPENAI_API_KEY`.

## Netlify Deployment

This repo is configured for Netlify with `netlify.toml` and a serverless function at `netlify/functions/chat.js`.

1. Push your repository to GitHub.
2. Create a new Netlify site and connect to your repo.
3. If you plan to use the OpenAI fallback, add `OPENAI_API_KEY` in Netlify site settings.
4. Deploy the site.

## Local development with Netlify CLI

To test the function locally with Netlify:
```bash
npm install -g netlify-cli
npm run netlify:dev
```

## File structure

- `src/` — React app files
- `netlify/functions/chat.js` — serverless API function with local Creator-V1 AI logic
- `netlify.toml` — Netlify build and functions config
- `.gitignore` — excludes `node_modules` and build artifacts

## Notes

The default Creator-V1 model is implemented directly in the Netlify function. It combines intent detection, local knowledge retrieval, and response composition so you own the AI logic in this repository. Use the OpenAI fallback only if you want remote model responses.


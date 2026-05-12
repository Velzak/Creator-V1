const knowledgeBase = [
  {
    title: 'Netlify Deployment',
    text: 'This project is a Vite + React app with a Netlify Functions backend. Deploy by connecting the repository to Netlify, setting the publish directory to dist, functions to netlify/functions, and adding environment variables if using the OpenAI fallback.',
  },
  {
    title: 'Creator-V1 Local AI Model',
    text: 'Creator-V1 uses a built-in model engine in the Netlify function. It analyzes your question, finds relevant knowledge, and returns a tailored response without requiring an external LLM by default.',
  },
  {
    title: 'React + Vite Frontend',
    text: 'The frontend is built with React and TypeScript, featuring a conversation UI, model selector, message history, and Netlify API integration via /api/chat.',
  },
  {
    title: 'AI Model Strategy',
    text: 'The local AI model combines intent classification, document retrieval, and response composition. It is designed to be extensible and to let you own the entire inference logic within the Netlify function.',
  },
  {
    title: 'OpenAI Fallback',
    text: 'If you choose the OpenAI fallback model, the function forwards requests to the OpenAI chat completion API using an OPENAI_API_KEY stored securely as a Netlify environment variable.',
  },
];

const normalizeText = (text) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const textToVector = (text) => {
  const tokens = normalizeText(text).split(' ').filter(Boolean);
  return tokens.reduce((vector, token) => {
    vector[token] = (vector[token] || 0) + 1;
    return vector;
  }, {});
};

const dotProduct = (a, b) =>
  Object.keys(a).reduce((sum, key) => sum + (a[key] || 0) * (b[key] || 0), 0);

const vectorNorm = (vector) => Math.sqrt(Object.values(vector).reduce((sum, value) => sum + value * value, 0));

const cosineSimilarity = (a, b) => {
  const denom = vectorNorm(a) * vectorNorm(b);
  return denom === 0 ? 0 : dotProduct(a, b) / denom;
};

const getRelevantKnowledge = (query, count = 2) => {
  const queryVector = textToVector(query);
  return knowledgeBase
    .map((item) => ({ item, score: cosineSimilarity(queryVector, textToVector(item.text)) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map(({ item }) => item);
};

const detectIntent = (query) => {
  if (/\b(netlify|deploy|deploying|publish|launch|hosting|site)\b/.test(query)) {
    return 'deploy';
  }

  if (/\b(model|ai|assistant|train|learn|custom|create|build)\b/.test(query)) {
    return 'model';
  }

  if (/\b(react|vite|typescript|component|css|javascript|frontend|web)\b/.test(query)) {
    return 'web';
  }

  if (/\b(bug|error|issue|fix|debug|problem)\b/.test(query)) {
    return 'debug';
  }

  return 'general';
};

const makeLocalResponse = (messages) => {
  const lastUserMessage = [...messages].reverse().find((message) => message.role === 'user');
  const userText = lastUserMessage ? lastUserMessage.content : '';
  const normalizedQuery = normalizeText(userText);
  const intent = detectIntent(normalizedQuery);
  const knowledge = getRelevantKnowledge(normalizedQuery, 3);

  const knowledgeText = knowledge.map((doc) => `• ${doc.title}: ${doc.text}`).join('\n');

  const explanations = {
    deploy: `Your custom AI app is already structured for Netlify deployment with a React frontend and a serverless function. To launch it, connect the repo to Netlify and confirm that netlify.toml points to dist for publish and netlify/functions for functions. The built-in Creator-V1 model works without any external key.`,
    model: `Creator-V1 is your own AI model. It runs locally inside the Netlify function, analyzes your question, and uses the app's knowledge base to answer. You can extend it by adding new documents or rules inside netlify/functions/chat.js.`,
    web: `This is a web-first AI assistant built with React, Vite, and Netlify Functions. Your app includes a chat UI, a message composer, and a model selector for the built-in Creator-V1 engine and optional OpenAI fallback.`,
    debug: `For issues, review the rendered error or check the function logs in Netlify. The default model is local, so most problems stem from the frontend request, JSON parsing, or function configuration rather than an external AI provider.`,
    general: `Creator-V1 is designed to answer developer questions about deployment, web apps, and custom AI models. It fuses intent detection and retrieval over the local knowledge base to create helpful responses.`,
  };

  const base = explanations[intent] || explanations.general;

  if (/\bcreate\b|\bbuild\b|\bown\b|\bcustom\b/.test(normalizedQuery) && intent === 'model') {
    return `${base}\n\nWhat makes this a locally owned AI model:\n- Built directly into the Netlify function.\n- No external inference service required for the default Creator-V1 mode.\n- Easy to customize with additional knowledge, patterns, or response rules.\n\nRelevant details:\n${knowledgeText}`;
  }

  return `${base}\n\nRelevant details:\n${knowledgeText}\n\nIf you want, I can also explain how to add new AI capabilities or how to wire the OpenAI fallback for even more advanced responses.`;
};

const callOpenAI = async (messages, model) => {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Missing OPENAI_API_KEY environment variable for OpenAI fallback.' }),
    };
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 1000,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    return {
      statusCode: response.status,
      body: JSON.stringify({ error: data.error?.message || 'OpenAI request failed.' }),
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ text: data.choices?.[0]?.message?.content || '', raw: data }),
  };
};

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (error) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid JSON body.' }),
    };
  }

  const messages = body.messages;
  const model = body.model || 'creator-v1';

  if (!Array.isArray(messages) || messages.length === 0) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Messages array is required.' }),
    };
  }

  try {
    if (model === 'creator-v1') {
      const text = makeLocalResponse(messages);
      return {
        statusCode: 200,
        body: JSON.stringify({ text, raw: { model: 'creator-v1' } }),
      };
    }

    return await callOpenAI(messages, model);
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error.' }),
    };
  }
};

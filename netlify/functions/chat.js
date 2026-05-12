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

const pickResponse = (options) => options[Math.floor(Math.random() * options.length)];

const hasKeyword = (query, keywords) => keywords.some((keyword) => query.includes(keyword));

const makeLocalResponse = (messages) => {
  const lastUserMessage = [...messages].reverse().find((message) => message.role === 'user');
  const lastAssistantMessage = [...messages].reverse().find((message) => message.role === 'assistant');
  const userText = lastUserMessage ? lastUserMessage.content : '';
  const normalizedQuery = normalizeText(userText);
  const intent = detectIntent(normalizedQuery);
  const knowledge = getRelevantKnowledge(normalizedQuery, 3);
  const knowledgeText = knowledge.map((doc) => `• ${doc.title}: ${doc.text}`).join('\n');

  const greetings = [
    'Hey there! I’m Creator-V1. What would you like to talk about today?',
    'Hello! I’m here and ready to chat. Ask me anything about your app, deployment, or AI model.',
    'Hi! I’m Creator-V1. Let’s work through your question together.',
  ];

  const farewells = [
    'Thanks for the chat! If you want, I can help again anytime.',
    'Goodbye for now. I’m here when you want to continue.',
    'Nice talking with you. Let me know when you want to keep building.',
  ];

  const statusReplies = [
    'I’m running well and ready to keep the conversation going. What else can I help you with?',
    'I’m here and working as your AI assistant. Let’s continue whenever you’re ready.',
    'All systems green. Tell me what you want to build or debug next.',
  ];

  const nameReplies = [
    'I’m Creator-V1, your custom AI assistant built into this app. I can help with code, deployment, and AI integration.',
    'I’m Creator-V1. I live in the Netlify function and I’m designed to chat, explain, and help you build your own model.',
  ];

  const repeatReplies = [
    'I’m sorry if I sounded repetitive—I’m switching to a more conversational mode now. What do you want to discuss next?',
    'I hear you. Let’s keep this more natural. Tell me more about what you need.',
    'Thanks for the feedback. I’ll answer more directly and keep the chat moving.',
  ];

  const helpReplies = [
    'I can help you with deployment, React, Vite, or building your own AI model. What do you want to focus on?',
    'Feel free to ask anything specific, like how to deploy to Netlify, how the chat works, or how to improve this AI.',
    'I’m ready to help you step-by-step. What should we cover next?',
  ];

  if (!userText) {
    return `${pickResponse(greetings)}

${pickResponse(helpReplies)}`;
  }

  if (hasKeyword(normalizedQuery, ['hello', 'hi', 'hey', 'greetings'])) {
    return `${pickResponse(greetings)}

${pickResponse(helpReplies)}`;
  }

  if (hasKeyword(normalizedQuery, ['bye', 'goodbye', 'see you', 'later'])) {
    return pickResponse(farewells);
  }

  if (hasKeyword(normalizedQuery, ['thanks', 'thank you', 'thx'])) {
    return `${pickResponse(['You’re welcome!', 'Happy to help!', 'Anytime!'])} ${pickResponse(farewells)}`;
  }

  if (hasKeyword(normalizedQuery, ['how are you', 'how you doing', 'how is it going'])) {
    return pickResponse(statusReplies);
  }

  if (hasKeyword(normalizedQuery, ['your name', 'who are you', 'what are you'])) {
    return pickResponse(nameReplies);
  }

  if (hasKeyword(normalizedQuery, ['repeat', 'again', 'same answer', 'same message', 'repetitive'])) {
    return pickResponse(repeatReplies);
  }

  const lastAssistantText = lastAssistantMessage ? lastAssistantMessage.content : '';
  const summary = userText ? `You asked: "${userText}".` : '';

  const intentReplies = {
    deploy: `I can help you deploy this app to Netlify. ${summary} I’ll explain how the build, publish folder, and functions tie together so it works smoothly.`,
    model: `Creator-V1 is your custom local AI model inside this app. ${summary} I can help you make it feel more conversational, add more knowledge, or switch to an OpenAI fallback if you want.`,
    web: `This is a web chat app built with React and Vite. ${summary} I’m here to help you make it work, design the UI, or connect the frontend to the backend.`,
    debug: `Let’s troubleshoot that issue together. ${summary} I’ll help you find where it’s breaking and how to fix it.`,
    general: `I’m here to chat naturally and help you with your project. ${summary} Tell me more about what you want, and I’ll respond with a practical answer.`,
  };

  let base = intentReplies[intent] || intentReplies.general;

  if (knowledgeText) {
    base += `\n\nI found some relevant details you may want to use:\n${knowledgeText}`;
  }

  if (!knowledgeText && intent === 'general') {
    base += '\n\nIf you want, I can also explain how the chat works or give a step-by-step example.';
  }

  const followUps = [
    'What else would you like me to explain?',
    'Do you want me to continue with an example or a next step?',
    'Would you like me to make this more conversational or technical?',
  ];

  if (lastAssistantText && lastAssistantText.includes(base)) {
    base = `${pickResponse(repeatReplies)}\n\n${base}`;
  }

  return `${base}\n\n${pickResponse(followUps)}`;
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

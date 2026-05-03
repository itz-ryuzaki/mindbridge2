require('dotenv').config();
const express = require('express');
const path = require('path');

const fetch = globalThis.fetch || ((...args) => import('node-fetch').then(({ default: f }) => f(...args)));

if (!process.env.GEMINI_API_KEY) {
  console.error("❌ GEMINI_API_KEY is missing.");
  process.exit(1);
}

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Try multiple models in order — if one quota is exhausted, fall through to next
const GEMINI_MODELS = [
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-flash-8b',
];

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.set('trust proxy', 1);

// ── Retry a single model URL ──────────────────────────────────
async function tryModel(modelName, geminiBody) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(geminiBody)
  });
  return res;
}

// ── Gemini proxy — tries each model until one succeeds ────────
app.post('/api/gemini-flash', async (req, res) => {
  console.log('POST /api/gemini-flash | body:', JSON.stringify(req.body));

  try {
    let userMessage = req.body && (req.body.message || req.body.text || req.body.content);
    if (typeof req.body === 'string') userMessage = req.body;

    if (!userMessage || !userMessage.trim()) {
      console.error('400: Empty message. req.body:', req.body);
      return res.status(400).json({ error: 'No message provided', received: req.body });
    }

    const geminiBody = {
      contents: [{
        parts: [{
          text: `You are MindBridge AI, a compassionate mental wellness and academic support assistant for college students. Be warm, empathetic, concise, and helpful. Focus on mental health, stress management, academic advice, and student wellbeing. If a user seems in crisis, always recommend speaking to a professional counselor.\n\nUser message: ${userMessage}`
        }]
      }]
    };

    // Try each model, move to next on 429
    for (const model of GEMINI_MODELS) {
      console.log(`Trying model: ${model}`);
      const apiRes = await tryModel(model, geminiBody);

      if (apiRes.status === 429) {
        console.log(`Model ${model} rate limited, trying next...`);
        continue; // try next model
      }

      if (!apiRes.ok) {
        const err = await apiRes.text();
        console.error(`Model ${model} error ${apiRes.status}:`, err);
        continue; // try next model
      }

      const data = await apiRes.json();
      console.log(`Success with model: ${model}`);
      return res.json(data);
    }

    // All models exhausted
    return res.status(429).json({
      error: 'rate_limited',
      message: 'All AI models are busy right now. Please wait 1 minute and try again.'
    });

  } catch (err) {
    console.error('FULL ERROR:', err);
    res.status(500).json({ error: 'Gemini proxy error', details: err.message });
  }
});

// ── Static & routes ───────────────────────────────────────────
app.use(express.static(__dirname));

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/feed', (req, res) => res.sendFile(path.join(__dirname, 'feed.html')));
app.get('/chat', (req, res) => res.sendFile(path.join(__dirname, 'chat.html')));
app.get('/college', (req, res) => res.sendFile(path.join(__dirname, 'college.html')));
app.get('/sessions', (req, res) => res.sendFile(path.join(__dirname, 'sessions.html')));
app.get('/xp', (req, res) => res.sendFile(path.join(__dirname, 'xp.html')));
app.get('/post-detail', (req, res) => res.sendFile(path.join(__dirname, 'post-detail.html')));
app.get('/emotion-detector', (req, res) => res.sendFile(path.join(__dirname, 'emotion_detector.html')));

app.listen(PORT, () => {
  console.log(`✅ MindBridge server running on port ${PORT}`);
});

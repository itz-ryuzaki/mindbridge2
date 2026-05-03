require('dotenv').config();
const express = require('express');
const path = require('path');

const fetch = globalThis.fetch || ((...args) => import('node-fetch').then(({ default: f }) => f(...args)));

if (!process.env.GEMINI_API_KEY) {
  console.error("❌ GEMINI_API_KEY is missing.");
  process.exit(1);
}

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '2mb' }));

// Simple in-memory rate limiter: max 10 requests per minute per IP
const rateLimitMap = new Map();
function isRateLimited(ip) {
  const now = Date.now();
  const windowMs = 60 * 1000;
  const max = 10;
  if (!rateLimitMap.has(ip)) rateLimitMap.set(ip, []);
  const timestamps = rateLimitMap.get(ip).filter(t => now - t < windowMs);
  timestamps.push(now);
  rateLimitMap.set(ip, timestamps);
  return timestamps.length > max;
}

// Retry helper with exponential backoff
async function fetchWithRetry(url, options, retries = 2, delayMs = 1500) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(url, options);
    if (res.status !== 429 || attempt === retries) return res;
    console.log(`Rate limited by Gemini, retrying in ${delayMs}ms... (attempt ${attempt + 1})`);
    await new Promise(r => setTimeout(r, delayMs));
    delayMs *= 2;
  }
}

app.post('/api/gemini-flash', async (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';

  if (isRateLimited(ip)) {
    return res.status(429).json({ error: 'rate_limited', message: 'Too many messages. Please wait a moment.' });
  }

  try {
    const userMessage = req.body && req.body.message;
    if (!userMessage) return res.status(400).json({ error: 'No message provided' });

    const body = {
      contents: [
        {
          parts: [
            {
              text: `You are MindBridge AI, a compassionate mental wellness and academic support assistant for college students. Be warm, empathetic, concise, and helpful. Focus on mental health, stress management, academic advice, and student wellbeing. If a user seems in crisis, always recommend speaking to a professional counselor.\n\nUser message: ${userMessage}`
            }
          ]
        }
      ]
    };

    const apiRes = await fetchWithRetry(GEMINI_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (apiRes.status === 429) {
      return res.status(429).json({ error: 'rate_limited', message: 'AI is busy right now. Please wait 30 seconds and try again.' });
    }

    if (!apiRes.ok) {
      const err = await apiRes.text();
      console.error("Gemini API error:", err);
      return res.status(apiRes.status).json({ error: err });
    }

    const data = await apiRes.json();
    res.json(data);
  } catch (err) {
    console.error("FULL ERROR:", err);
    res.status(500).json({ error: 'Gemini proxy error', details: err.message });
  }
});

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

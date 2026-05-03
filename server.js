require('dotenv').config();
const express = require('express');
const path = require('path');

// Use native fetch (Node 18+) or node-fetch fallback
const fetch = globalThis.fetch || ((...args) => import('node-fetch').then(({ default: f }) => f(...args)));

if (!process.env.GEMINI_API_KEY) {
  console.error("❌ GEMINI_API_KEY is missing. Add it to your .env file or Render environment variables.");
  process.exit(1);
}

const GEMINI_API_KEY = process.env.GEMINI_API_KEY; // ✅ Fixed: was !!process.env... (boolean bug)
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '2mb' }));

// ── Gemini API proxy ──────────────────────────────────────────
app.post('/api/gemini-flash', async (req, res) => {
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

    const apiRes = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

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

// ── Static files ──────────────────────────────────────────────
app.use(express.static(__dirname));

// ── HTML routes ───────────────────────────────────────────────
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/feed', (req, res) => res.sendFile(path.join(__dirname, 'feed.html')));
app.get('/chat', (req, res) => res.sendFile(path.join(__dirname, 'chat.html')));
app.get('/college', (req, res) => res.sendFile(path.join(__dirname, 'college.html')));
app.get('/sessions', (req, res) => res.sendFile(path.join(__dirname, 'sessions.html')));
app.get('/xp', (req, res) => res.sendFile(path.join(__dirname, 'xp.html')));
app.get('/post-detail', (req, res) => res.sendFile(path.join(__dirname, 'post-detail.html')));
app.get('/emotion-detector', (req, res) => res.sendFile(path.join(__dirname, 'emotion_detector.html')));

// ── Start ─────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ MindBridge server running on port ${PORT}`);
});

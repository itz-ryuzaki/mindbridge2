require('dotenv').config();
const express = require('express');
const path = require('path');

const fetch = globalThis.fetch || ((...args) => import('node-fetch').then(({ default: f }) => f(...args)));

// ── API Key setup — set whichever you have in Render env vars ─
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GROQ_API_KEY && !GEMINI_API_KEY) {
  console.error("❌ No API key found. Set GROQ_API_KEY or GEMINI_API_KEY in environment variables.");
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.set('trust proxy', 1);

// ── Groq API call ─────────────────────────────────────────────
async function callGroq(userMessage) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'system',
          content: 'You are MindBridge AI, a compassionate mental wellness and academic support assistant for college students. Be warm, empathetic, concise, and helpful. Focus on mental health, stress management, academic advice, and student wellbeing. If a user seems in crisis, always recommend speaking to a professional counselor.'
        },
        { role: 'user', content: userMessage }
      ],
      max_tokens: 500
    })
  });
  return res;
}

// ── Gemini API call (fallback) ────────────────────────────────
async function callGemini(userMessage) {
  const models = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-flash-8b'];
  for (const model of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `You are MindBridge AI, a compassionate mental wellness and academic support assistant for college students. Be warm, empathetic, concise, and helpful. If a user seems in crisis, always recommend speaking to a professional counselor.\n\nUser: ${userMessage}`
          }]
        }]
      })
    });
    if (res.status !== 429) return { res, model, provider: 'gemini' };
    console.log(`Gemini ${model} rate limited, trying next...`);
  }
  return null;
}

// ── Main proxy endpoint ───────────────────────────────────────
app.post('/api/gemini-flash', async (req, res) => {
  console.log('POST /api/gemini-flash | body:', JSON.stringify(req.body));

  try {
    let userMessage = req.body && (req.body.message || req.body.text || req.body.content);
    if (typeof req.body === 'string') userMessage = req.body;
    if (!userMessage || !userMessage.trim()) {
      return res.status(400).json({ error: 'No message provided', received: req.body });
    }

    // ── Try Groq first (if key exists) ──
    if (GROQ_API_KEY) {
      console.log('Trying Groq...');
      const groqRes = await callGroq(userMessage);

      if (groqRes.ok) {
        const data = await groqRes.json();
        // Normalize to Gemini response shape so chat.html works unchanged
        const text = data.choices?.[0]?.message?.content || "I'm here to help. Could you tell me more?";
        return res.json({
          candidates: [{ content: { parts: [{ text }] } }]
        });
      }
      console.log(`Groq failed with status ${groqRes.status}, falling back to Gemini...`);
    }

    // ── Fallback to Gemini ──
    if (GEMINI_API_KEY) {
      console.log('Trying Gemini...');
      const result = await callGemini(userMessage);
      if (result && result.res.ok) {
        const data = await result.res.json();
        console.log(`Success with Gemini model: ${result.model}`);
        return res.json(data);
      }
    }

    // ── All providers exhausted ──
    return res.status(429).json({
      error: 'rate_limited',
      message: 'AI is busy right now. Please wait 1 minute and try again.'
    });

  } catch (err) {
    console.error('FULL ERROR:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// ── Static & HTML routes ──────────────────────────────────────
app.use(express.static(__dirname));

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/feed', (req, res) => res.sendFile(path.join(__dirname, 'feed.html')));
app.get('/chat', (req, res) => res.sendFile(path.join(__dirname, 'chat.html')));
app.get('/college', (req, res) => res.sendFile(path.join(__dirname, 'college.html')));
app.get('/sessions', (req, res) => res.sendFile(path.join(__dirname, 'sessions.html')));
app.get('/xp', (req, res) => res.sendFile(path.join(__dirname, 'xp.html')));
app.get('/sos', (req, res) => res.sendFile(path.join(__dirname, 'sos.html')));
app.get('/post-detail', (req, res) => res.sendFile(path.join(__dirname, 'post-detail.html')));
app.get('/emotion-detector', (req, res) => res.sendFile(path.join(__dirname, 'emotion_detector.html')));

app.listen(PORT, () => {
  console.log(`✅ MindBridge running on port ${PORT}`);
  console.log(`   Groq: ${GROQ_API_KEY ? '✅ enabled' : '❌ not set'}`);
  console.log(`   Gemini: ${GEMINI_API_KEY ? '✅ enabled (fallback)' : '❌ not set'}`);
});

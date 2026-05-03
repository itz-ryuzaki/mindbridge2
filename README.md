# MindBridge — Student Mental Wellness Platform

## Local Development

1. **Clone the repo**
   ```bash
   git clone <your-repo-url>
   cd mindbridge
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env and paste your Gemini API key
   ```

4. **Run the server**
   ```bash
   npm start
   # Visit http://localhost:3000
   ```

---

## Deploy to Render

1. Push this repo to GitHub (**make sure `.env` is in `.gitignore` — it is by default**)

2. Go to [render.com](https://render.com) → **New Web Service** → connect your GitHub repo

3. Configure:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Environment:** Node

4. Add your environment variable in Render dashboard:
   - Go to your service → **Environment** tab
   - Add: `GEMINI_API_KEY` = `your_actual_api_key`

5. Deploy — Render will auto-deploy on every git push.

---

## Security Notes

- `.env` is listed in `.gitignore` and will **never** be committed to Git
- Use `.env.example` as a template — it contains no real keys
- On Render, set the API key via the **Environment Variables** dashboard panel, not in code
"# mindbridge2" 

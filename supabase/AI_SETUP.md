# Callout AI analysis — setup

The app asks the `ai` Edge Function for a short, neutral reading of a coin's
market data (price, 24h range, volume, Momentum, community votes). The function
calls OpenRouter with a free model. The key stays on the server.

1. **SQL** — run `supabase/009_ai.sql` (after 006, 007 and 008).
2. **Edge Function** — Supabase → Edge Functions → Deploy a new function named
   `ai`, paste `supabase/functions/ai/index.ts`, keep "Verify JWT" on.
3. **Secrets** — Edge Functions → Secrets:
   - `OPENROUTER_API_KEY` = your OpenRouter key (create a new one; never paste it in chat, the app or git)
   - `OPENROUTER_MODEL` = optional, default `dots-studio/dots-3-note-preview:free`
   - `AI_PER_USER_DAILY` = optional, default 15 analyses per person per day
   - `AI_GLOBAL_DAILY` = optional, default 400 analyses per day for everyone

Notes
- Open to every signed-in user while testing (not Pro-only). Guests are asked to sign in.
- The same coin + language is cached for 15 minutes, so repeated taps cost nothing.
- Free models can change or disappear: if analyses start failing, change `OPENROUTER_MODEL`.
- The model is a "reasoning" model: it needs a few seconds (typically 10-30 s).

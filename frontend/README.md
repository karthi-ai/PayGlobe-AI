# PayGlobe AI Frontend

React + Vite interface for parsing receipt images and reviewing multi-currency invoice splits.

## Public demo

The default hosted experience uses the Netlify Function in `netlify/functions/api.mts`.
Use **Try sample receipt** without uploading an image, assign sample items to payers,
preview converted amounts, and simulate drafts. Images are not uploaded or analyzed,
and demo drafts are neither saved nor created in PayPal. No API credentials are needed.

Run `netlify dev --port 8889` from the repository root to emulate the hosted demo.
Run API tests from this directory with `node --experimental-strip-types --test tests/api.test.mjs`.

## Run locally

Install and start the frontend from this directory:

```powershell
npm install
npm run dev
```

In a second terminal, start the backend from the workspace root:

```powershell
.venv\Scripts\python.exe backend\api.py
```

For the real local workflow, set `VITE_DEMO_MODE=false` in `frontend/.env.local` before
starting Vite. Set `GEMINI_API_KEY` in `backend/.env` to parse receipt photos. Creating PayPal drafts
is a separate action and requires `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` in
that same file. The API uses the PayPal sandbox and is intended for local development.

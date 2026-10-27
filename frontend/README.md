# PayGlobe AI Frontend

React + Vite interface for parsing receipt images and reviewing multi-currency invoice splits.

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

Set `GEMINI_API_KEY` in `backend/.env` to parse receipt photos. Creating PayPal drafts
is a separate action and requires `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` in
that same file. The API uses the PayPal sandbox and is intended for local development.
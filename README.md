# PayGlobe AI

Multi-currency receipt splitting with Gemini receipt extraction and PayPal sandbox invoicing.

## Repository Structure

```text
payglobe-ai/
|-- backend/
|   |-- api.py
|   |-- payglobe_ai_agent.py
|   |-- receipt_parser.py
|   |-- test_live_sandbox.py
|   |-- requirements.txt
|   |-- .env.example
|   `-- README.md
`-- frontend/
    |-- src/
    |   |-- App.jsx
    |   `-- App.css
    |-- package.json
    |-- package-lock.json
    `-- README.md
```

## Setup

### 1. Get the project

```powershell
git clone https://github.com/your-username/payglobe-ai.git
cd payglobe-ai
```

Replace the clone URL with the repository's actual URL. If you already have this
project locally, open its root directory instead.

### 2. Configure and install the backend

From the repository root, create a virtual environment and install backend packages:

```powershell
py -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install -r backend\requirements.txt
Copy-Item backend\.env.example backend\.env
```

Edit `backend/.env` and set your own credentials:

```dotenv
PAYPAL_CLIENT_ID=your_sandbox_client_id
PAYPAL_CLIENT_SECRET=your_sandbox_client_secret
PAYPAL_TEST_RECIPIENT_EMAIL=your_sandbox_buyer_email
GEMINI_API_KEY=your_gemini_api_key
```

Keep `backend/.env` private. It is ignored by Git. Receipt parsing needs a Gemini
API key. Creating PayPal draft invoices additionally needs PayPal sandbox
credentials; set the recipient to a buyer account in your sandbox.

### 3. Install and start the frontend

In a new terminal at the repository root:

```powershell
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite, normally `http://127.0.0.1:5173`.

### 4. Start the backend API

In another terminal at the repository root, activate the virtual environment if
needed and run:

```powershell
.venv\Scripts\Activate.ps1
python backend\api.py
```

The API listens on `http://127.0.0.1:8000` by default. Keep this terminal running
while using the frontend.

## Deploy the frontend to Netlify

The root `netlify.toml` configures Netlify to install locked dependencies, including
Vite and other development dependencies, in `frontend` before running its Vite
build and publishing `frontend/dist`. A fallback serves `index.html`
for direct visits to application URLs.

Public hosting now includes a Netlify Function in `frontend/netlify/functions`
for `/api/receipts/parse`, `/api/invoices/preview`, and `/api/invoices/drafts`.
The public demo is enabled by default: click **Try sample receipt**, assign items
to payers, preview the split, and simulate drafts. No Gemini or PayPal credentials
are required. Optional images stay in the browser and are not analyzed. Demo
drafts are not persisted or created in PayPal. Exchange rates are illustrative.

To exercise the hosted demo locally, run `netlify dev --port 8889` from the
repository root. To use the separate Python backend for real receipt extraction
locally, set `VITE_DEMO_MODE=false` in `frontend/.env.local`, run the backend, and
start Vite with `npm run dev`. The Python backend's demo setting is independent
of the hosted demo. The hosted function always runs in demo mode; real extraction
and PayPal integration on public hosting still require a separate implementation.

If a public URL still returns an API 404, publish the latest deployment containing
the function as well as the frontend. Changing the local Python configuration
does not update a deployed site.

## Workflow

Upload a JPEG, PNG, or WEBP receipt (up to 10 MB) to extract receipt data with
Gemini. Review the parsed line items and assign items to payers, then preview
currency-converted invoice payloads. Creating drafts is a separate action and sends
requests to the PayPal sandbox; it does not send invoices to recipients.

The included currency rates are illustrative. Replace them with a trusted FX source
before relying on converted amounts.

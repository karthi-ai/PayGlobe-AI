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

The Python backend is a separate service. The Vite `/api` proxy only runs during
local development; production receipt parsing and invoicing require a deployed
backend and production API routing.

## Workflow

Upload a JPEG, PNG, or WEBP receipt (up to 10 MB) to extract receipt data with
Gemini. Review the parsed line items and assign items to payers, then preview
currency-converted invoice payloads. Creating drafts is a separate action and sends
requests to the PayPal sandbox; it does not send invoices to recipients.

The included currency rates are illustrative. Replace them with a trusted FX source
before relying on converted amounts.

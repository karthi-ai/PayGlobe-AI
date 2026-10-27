# PayGlobe AI Backend

Multi-currency receipt splitting with PayPal Invoicing API v2 client helpers.

## Setup

From this directory, install the dependency:

```powershell
python -m pip install -r requirements.txt
```

Copy `.env.example` to `.env` and set your PayPal sandbox credentials. The demo only
generates invoice payloads; it does not authenticate or create invoices. To use the
PayPal API from your own code, set `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` in
the process environment or pass them to `PayPalClient` directly.

Receipt image parsing uses the Google GenAI SDK. Set `GEMINI_API_KEY` (or
`GOOGLE_API_KEY`) in `.env` to enable it. The agent method
`process_receipt_image_and_generate_invoices(image_path, payers)` parses an image and
returns invoice payloads using the extracted receipt currency; it does not create
PayPal invoices by itself.

## Live sandbox test

Set `PAYPAL_TEST_RECIPIENT_EMAIL` to an email address belonging to a buyer in your
PayPal sandbox, then run this from the backend directory:

```powershell
python test_live_sandbox.py
```

This authenticates with PayPal and creates a draft invoice in the sandbox. It does
not send the invoice. The script never prints the access token.

## Run the demo

```powershell
python payglobe_ai_agent.py
```

The included exchange rates are illustrative and should be replaced with a trusted,
current FX data source before production use. `search_payments` currently lists
invoices; its query argument is reserved because the list endpoint does not apply
that value as a search filter.
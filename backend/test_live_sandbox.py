"""Create a draft invoice in the PayPal sandbox for an explicit test recipient."""

import json
import os
from pathlib import Path

from dotenv import load_dotenv

from payglobe_ai_agent import PayPalClient, PayGlobeAgent


def main() -> None:
    load_dotenv(Path(__file__).with_name(".env"))

    client_id = os.getenv("PAYPAL_CLIENT_ID")
    client_secret = os.getenv("PAYPAL_CLIENT_SECRET")
    recipient_email = os.getenv("PAYPAL_TEST_RECIPIENT_EMAIL")
    missing_settings = [
        name
        for name, value in (
            ("PAYPAL_CLIENT_ID", client_id),
            ("PAYPAL_CLIENT_SECRET", client_secret),
            ("PAYPAL_TEST_RECIPIENT_EMAIL", recipient_email),
        )
        if not value
    ]
    if missing_settings:
        raise ValueError(
            "Set the following values in backend/.env: " + ", ".join(missing_settings)
        )

    print("Initializing PayPal Sandbox Client...")
    paypal_client = PayPalClient(
        client_id=client_id,
        client_secret=client_secret,
        sandbox=True,
    )

    print("Authenticating with PayPal Sandbox API...")
    paypal_client.authenticate()
    print("Authentication successful. Access token acquired.\n")

    agent = PayGlobeAgent(paypal_client)
    sample_receipt = [
        {"name": "Margherita Pizza", "price": 18.00},
        {"name": "Sparkling Water", "price": 6.00},
    ]
    sample_payers = [
        {
            "email": recipient_email,
            "currency": "USD",
            "items": ["Margherita Pizza", "Sparkling Water"],
        }
    ]

    print("Generating split bill invoice payload...")
    invoices = agent.process_receipt_and_generate_invoices(
        sample_receipt,
        sample_payers,
        base_currency="USD",
    )

    for invoice in invoices:
        print(f"Creating a sandbox draft invoice for {invoice['payer']}...")
        response = paypal_client.create_invoice(invoice["payload"])
        print("PayPal API response:")
        print(json.dumps(response, indent=2))

        if not response.get("id"):
            raise RuntimeError("PayPal response did not contain an invoice id.")
        print(f"Created invoice {response['id']} with status {response.get('status', 'unknown')}.")


if __name__ == "__main__":
    main()
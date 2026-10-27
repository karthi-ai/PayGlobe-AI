"""PayGlobe AI multi-currency receipt splitter and PayPal invoicing client."""

import json
import os
from typing import Any, Dict, List

import requests
from dotenv import load_dotenv

load_dotenv()


class PayPalClient:
    def __init__(
        self,
        client_id: str = None,
        client_secret: str = None,
        sandbox: bool = True,
    ):
        self.client_id = client_id or os.getenv("PAYPAL_CLIENT_ID")
        self.client_secret = client_secret or os.getenv("PAYPAL_CLIENT_SECRET")
        self.base_url = (
            "https://api-m.sandbox.paypal.com"
            if sandbox
            else "https://api-m.paypal.com"
        )
        self.access_token = None

    def authenticate(self) -> str:
        """Obtain an OAuth2 bearer token from PayPal."""
        if not self.client_id or not self.client_secret:
            raise ValueError(
                "Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET before using the PayPal API."
            )

        response = requests.post(
            f"{self.base_url}/v1/oauth2/token",
            headers={"Accept": "application/json", "Accept-Language": "en_US"},
            data={"grant_type": "client_credentials"},
            auth=(self.client_id, self.client_secret),
            timeout=30,
        )
        response.raise_for_status()
        self.access_token = response.json()["access_token"]
        return self.access_token

    def _headers(self) -> Dict[str, str]:
        if not self.access_token:
            self.authenticate()
        return {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.access_token}",
        }

    def create_invoice(self, invoice_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a PayPal draft invoice."""
        response = requests.post(
            f"{self.base_url}/v2/invoicing/invoices",
            headers={**self._headers(), "Prefer": "return=representation"},
            json=invoice_data,
            timeout=30,
        )
        response.raise_for_status()
        return response.json()

    def send_invoice(self, invoice_id: str) -> Dict[str, Any]:
        """Send a previously created invoice to its recipient."""
        response = requests.post(
            f"{self.base_url}/v2/invoicing/invoices/{invoice_id}/send",
            headers=self._headers(),
            timeout=30,
        )
        response.raise_for_status()
        return response.json() if response.content else {}

    def search_payments(self, query: str = "") -> Dict[str, Any]:
        """List PayPal invoices; query is reserved for future filtering support."""
        response = requests.get(
            f"{self.base_url}/v2/invoicing/invoices",
            headers=self._headers(),
            params={"total_required": "true", "page_size": 10},
            timeout=30,
        )
        response.raise_for_status()
        return response.json()


class PayGlobeAgent:
    def __init__(self, paypal_client: PayPalClient):
        self.paypal = paypal_client
        # Illustrative exchange rates against USD. Replace with a live FX source for production.
        self.fx_rates = {"USD": 1.0, "EUR": 0.92, "GBP": 0.79, "INR": 83.2, "CAD": 1.36}

    def process_receipt_and_generate_invoices(
        self,
        receipt_items: List[Dict[str, Any]],
        payers: List[Dict[str, Any]],
        base_currency: str = "USD",
    ) -> List[Dict[str, Any]]:
        """Calculate payer shares and return PayPal invoice payloads."""
        base_currency = base_currency.upper()
        if base_currency not in self.fx_rates:
            raise ValueError(f"Unsupported base currency: {base_currency}")

        item_prices = {item["name"]: float(item["price"]) for item in receipt_items}
        invoices = []

        for payer in payers:
            payer_email = payer.get("email")
            if not payer_email:
                raise ValueError("Every payer must include an email address.")

            payer_currency = payer.get("currency", "USD").upper()
            if payer_currency not in self.fx_rates:
                raise ValueError(f"Unsupported payer currency: {payer_currency}")

            assigned_item_names = payer.get("items", [])
            unknown_items = set(assigned_item_names) - item_prices.keys()
            if unknown_items:
                raise ValueError(f"Unknown receipt items: {', '.join(sorted(unknown_items))}")

            subtotal = sum(item_prices[name] for name in assigned_item_names)
            fx_rate = self.fx_rates[payer_currency] / self.fx_rates[base_currency]
            converted_amount = round(subtotal * fx_rate, 2)

            invoice_payload = {
                "detail": {
                    "currency_code": payer_currency,
                    "note": (
                        "Split bill processed via PayGlobe AI Agent for "
                        f"{', '.join(assigned_item_names)}"
                    ),
                    "term": "DUE_ON_RECEIPT",
                },
                "primary_recipients": [
                    {"billing_info": {"email_address": payer_email}}
                ],
                "items": [
                    {
                        "name": f"Share of Split Bill ({', '.join(assigned_item_names)})",
                        "quantity": "1",
                        "unit_amount": {
                            "currency_code": payer_currency,
                            "value": f"{converted_amount:.2f}",
                        },
                    }
                ],
            }
            invoices.append(
                {
                    "payer": payer_email,
                    "amount": converted_amount,
                    "currency": payer_currency,
                    "payload": invoice_payload,
                }
            )

        return invoices

    def process_receipt_image_and_generate_invoices(
        self,
        image_path: str,
        payers: List[Dict[str, Any]],
        mime_type: str = "image/jpeg",
    ) -> List[Dict[str, Any]]:
        """Parse a receipt image and generate invoice payloads for its item shares."""
        from receipt_parser import parse_receipt_image

        receipt = parse_receipt_image(image_path, mime_type=mime_type)
        return self.process_receipt_and_generate_invoices(
            receipt_items=[item.model_dump() for item in receipt.items],
            payers=payers,
            base_currency=receipt.currency,
        )


def main() -> None:
    agent = PayGlobeAgent(PayPalClient())
    sample_receipt = [
        {"name": "Margherita Pizza", "price": 18.00},
        {"name": "Pasta Carbonara", "price": 22.00},
        {"name": "Sparkling Water", "price": 6.00},
    ]
    sample_payers = [
        {
            "email": "alex@example.com",
            "currency": "EUR",
            "items": ["Margherita Pizza", "Sparkling Water"],
        },
        {"email": "sam@example.com", "currency": "GBP", "items": ["Pasta Carbonara"]},
    ]

    results = agent.process_receipt_and_generate_invoices(sample_receipt, sample_payers)
    print(json.dumps(results, indent=2))


if __name__ == "__main__":
    main()
"""Local development API for the PayGlobe receipt and invoice workflow."""

import os
import tempfile
from pathlib import Path
from typing import Any, Dict, List

from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv
from werkzeug.utils import secure_filename

from payglobe_ai_agent import PayGlobeAgent, PayPalClient
from receipt_parser import parse_receipt_image

load_dotenv(Path(__file__).with_name(".env"))
DEMO_MODE = os.getenv("DEMO_MODE", "false").lower() == "true"


app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 10 * 1024 * 1024
CORS(app, origins=["http://localhost:5173", "http://127.0.0.1:5173"])

ALLOWED_IMAGE_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}


def build_invoice_results(payload: Dict[str, Any]) -> List[Dict[str, Any]]:
    receipt_items = payload.get("receipt_items")
    payers = payload.get("payers")
    base_currency = payload.get("base_currency", "USD")
    if not isinstance(receipt_items, list) or not isinstance(payers, list):
        raise ValueError("receipt_items and payers must both be arrays.")
    agent = PayGlobeAgent(PayPalClient())
    return agent.process_receipt_and_generate_invoices(
        receipt_items=receipt_items,
        payers=payers,
        base_currency=base_currency,
    )


@app.post("/api/receipts/parse")
def parse_receipt():
    image = request.files.get("file")
    if image is None or not image.filename:
        return jsonify({"error": "Choose a receipt image to upload."}), 400
    extension = ALLOWED_IMAGE_TYPES.get(image.mimetype)
    if extension is None:
        return jsonify({"error": "Use a JPEG, PNG, or WEBP receipt image."}), 415

    if DEMO_MODE:
        return jsonify(
            {
                "merchant_name": "Cafe Milano",
                "date": "2026-10-27",
                "currency": "USD",
                "items": [
                    {"name": "Margherita Pizza", "price": 18.50},
                    {"name": "Garlic Bread", "price": 6.00},
                    {"name": "Iced Tea (2)", "price": 9.00},
                ],
                "tax": 2.50,
                "tip": 5.00,
                "total": 41.00,
            }
        )

    safe_name = secure_filename(image.filename)
    temporary_path = None
    try:
        with tempfile.NamedTemporaryFile(suffix=extension, delete=False) as temporary_file:
            temporary_path = Path(temporary_file.name)
            image.save(temporary_file)
        receipt = parse_receipt_image(str(temporary_path), mime_type=image.mimetype)
        return jsonify(receipt.model_dump())
    except Exception as error:
        app.logger.exception("Receipt parsing failed for %s", safe_name)
        return jsonify({"error": str(error)}), 502
    finally:
        if temporary_path:
            temporary_path.unlink(missing_ok=True)


@app.post("/api/invoices/preview")
def preview_invoices():
    try:
        results = build_invoice_results(request.get_json(silent=True) or {})
        return jsonify(results)
    except (ValueError, KeyError, TypeError) as error:
        return jsonify({"error": str(error)}), 400


@app.post("/api/invoices/drafts")
def create_drafts():
    try:
        results = build_invoice_results(request.get_json(silent=True) or {})
        client = PayPalClient(sandbox=True)
        created = []
        for result in results:
            response = client.create_invoice(result["payload"])
            created.append(
                {
                    "payer": result["payer"],
                    "amount": result["amount"],
                    "currency": result["currency"],
                    "id": response.get("id"),
                    "status": response.get("status", "DRAFT"),
                }
            )
        return jsonify(created)
    except (ValueError, KeyError, TypeError) as error:
        return jsonify({"error": str(error)}), 400
    except Exception as error:
        app.logger.exception("PayPal draft invoice creation failed")
        return jsonify({"error": str(error)}), 502


@app.errorhandler(413)
def request_too_large(_error):
    return jsonify({"error": "Receipt images must be 10 MB or smaller."}), 413


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=int(os.getenv("PAYGLOBE_PORT", "8000")), debug=False)
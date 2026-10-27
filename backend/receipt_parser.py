"""Extract structured receipt data from an image with Gemini."""

import os
from pathlib import Path
from typing import List

from google import genai
from google.genai import types
from pydantic import BaseModel, Field
from dotenv import load_dotenv

load_dotenv(Path(__file__).with_name(".env"))

MODEL_NAME = "gemini-3.8-flash"


class ReceiptItem(BaseModel):
    name: str = Field(description="Name or description of the purchased item")
    price: float = Field(description="Numerical price of the item")


class ReceiptData(BaseModel):
    merchant_name: str = Field(description="Name of the merchant or restaurant")
    currency: str = Field(description="3-letter ISO currency code, such as USD, EUR, or GBP")
    items: List[ReceiptItem] = Field(description="Itemized list of purchases")
    total: float = Field(description="Final total amount on the receipt")


def parse_receipt_image(
    image_path: str,
    mime_type: str = "image/jpeg",
) -> ReceiptData:
    """Extract a receipt's merchant, currency, items, and total using Gemini."""
    path = Path(image_path)
    if not path.is_file():
        raise FileNotFoundError(f"Receipt image not found at: {image_path}")

    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        raise ValueError("Set GEMINI_API_KEY or GOOGLE_API_KEY to use Gemini receipt parsing.")

    image_bytes = path.read_bytes()
    client = genai.Client(api_key=api_key)
    response = client.models.generate_content(
        model=MODEL_NAME,
        contents=[
            (
                "Extract the merchant name, 3-letter ISO currency code, itemized "
                "purchases with their prices, and the final total from this receipt."
            ),
            types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
        ],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=ReceiptData,
            temperature=0.1,
        ),
    )

    if not response.text:
        raise ValueError("Gemini returned an empty response for the receipt image.")
    return ReceiptData.model_validate_json(response.text)


if __name__ == "__main__":
    sample_image = Path(__file__).with_name("sample_receipt.jpg")
    if sample_image.is_file():
        print(f"Parsing receipt image: {sample_image.name}...")
        parsed_data = parse_receipt_image(str(sample_image))
        print("Successfully extracted receipt data:")
        print(parsed_data.model_dump_json(indent=2))
    else:
        print(f"Place a receipt image named '{sample_image.name}' in this directory to test parsing.")
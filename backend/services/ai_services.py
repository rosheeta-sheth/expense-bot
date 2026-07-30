import os
import base64
import json
import re
from anthropic import Anthropic

def process_receipt_image(file_obj):
    """
    Real Service: Uses Anthropic Claude 3.5 Sonnet to perform OCR and categorize expenses.
    """
    # 1. Read and encode the image
    image_bytes = file_obj.read()
    file_obj.seek(0) # reset pointer in case it's needed later
    
    # Determine media type based on filename
    filename = getattr(file_obj, 'filename', '').lower()
    media_type = "image/jpeg"
    if filename.endswith(".png"):
        media_type = "image/png"
    elif filename.endswith(".webp"):
        media_type = "image/webp"
    
    # Check if PDF - Claude doesn't directly support PDFs in the vision API right now via standard image blocks
    # If the user uploads a PDF, we might need a different handling, but for now we assume they upload images.
    
    image_base64 = base64.b64encode(image_bytes).decode('utf-8')
    
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise ValueError("ANTHROPIC_API_KEY is not set in your .env file!")
        
    client = Anthropic(api_key=api_key)
    
    # 2. Duplicate Check (Simple mock using filename like before, to keep the UI feature intact)
    is_duplicate = False
    if 'dup' in filename:
        is_duplicate = True

    prompt = """
You are a highly accurate financial receipt OCR and categorization assistant.
Please analyze this receipt image and extract the following information into a strict JSON format.

{
  "status": "success",
  "extracted_data": {
    "merchant_name": "String (Name of the store)",
    "transaction_date": "String (ISO 8601 format: YYYY-MM-DDTHH:MM:SSZ. If time is missing, use T00:00:00Z)",
    "total_amount": Integer (The final total charged in CENTS. e.g. $84.50 = 8450),
    "tax_amount": Integer (The tax amount in CENTS),
    "payment_method": "String (e.g., Cash, Credit Card, Debit Card, Apple Pay, Unknown)",
    "line_items": [
      {
        "product_name": "String (Name of item)",
        "quantity": Integer,
        "total_price": Integer (Total price for this item line in CENTS),
        "suggested_category": "String (Pick exactly one from the Allowed Categories below)"
      }
    ]
  },
  "ai_suggestion": {
    "suggested_category": "String (Pick exactly one from the Allowed Categories below for the OVERALL receipt)",
    "confidence_score": Float (Between 0.0 and 1.0),
    "reasoning": "String (Brief 1 sentence reason for the overall category)"
  }
}

Allowed Categories:
- Groceries
- Restaurants & Dining
- Transportation
- Utilities
- Entertainment
- Shopping
- Electronics
- Healthcare & Medical
- Insurance
- Travel & Lodging
- Education
- Subscriptions
- Personal Care
- Pet Expenses
- Home & Garden
- Sports & Fitness
- Donations & Charity
- Other

Output NOTHING but the JSON object. Do not include markdown code blocks. Just the raw JSON.
"""

    response = client.messages.create(
        model="claude-sonnet-5",
        max_tokens=1024,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": media_type,
                            "data": image_base64
                        }
                    },
                    {
                        "type": "text",
                        "text": prompt
                    }
                ]
            }
        ]
    )
    
    raw_text = response.content[0].text.strip()
    
    # Strip markdown if Claude includes it despite instructions
    if raw_text.startswith("```json"):
        raw_text = raw_text[7:]
    if raw_text.endswith("```"):
        raw_text = raw_text[:-3]
        
    try:
        parsed_json = json.loads(raw_text)
        parsed_json["is_duplicate"] = is_duplicate
        # Dummy URL since we aren't uploading to GCS yet
        parsed_json["receipt_image_url"] = "https://example.com/receipt.jpg"
        return parsed_json
    except json.JSONDecodeError:
        print("Failed to parse JSON from Claude:", raw_text)
        raise ValueError("AI returned invalid JSON format.")

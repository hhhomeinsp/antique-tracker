"""AI Identifier API - Uses OpenAI Vision to identify antiques and estimate value"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import json
import base64
import httpx
from app.core.config import settings

router = APIRouter()

class IdentifyRequest(BaseModel):
    image: str  # Base64 encoded image or URL
    additional_context: Optional[str] = None  # Any notes about the item

class IdentifyResponse(BaseModel):
    item_name: str
    description: str
    category: str
    era_period: str
    estimated_value_low: float
    estimated_value_high: float
    suggested_price: float
    condition_notes: str
    selling_tips: str
    keywords: list[str]
    confidence: str

SYSTEM_PROMPT = """You are an expert antique and vintage item appraiser with decades of experience.
When shown an image of an item, you will:
1. Identify what the item is (name, type, maker if identifiable)
2. Determine its likely era/period
3. Assess its condition based on what you can see
4. Estimate its market value range (for resale in an antique store/booth)
5. Suggest a selling price (accounting for typical antique store markup of 2-3x)
6. Provide selling tips

Consider factors like:
- Rarity and demand
- Condition (chips, cracks, wear, repairs)
- Style and aesthetic appeal
- Current market trends for vintage/antique items
- Regional market (this is for a Florida antique store)

Be realistic with pricing - this is for actual resale, not insurance value.
Low-end items might be $5-20, mid-range $20-100, higher-end pieces $100+.

Respond in JSON format only, with these exact fields:
{
    "item_name": "Specific name of item",
    "description": "Detailed description including style, materials, approximate age",
    "category": "One of: furniture, art, vases, figurines, knick_knacks, jewelry, pottery, glassware, textiles, books, collectibles, vintage_decor, kitchenware, lighting, mirrors, clocks, other",
    "era_period": "Approximate era (e.g., '1950s', 'Mid-Century Modern', 'Victorian', 'Art Deco')",
    "estimated_value_low": 10.00,
    "estimated_value_high": 25.00,
    "suggested_price": 18.00,
    "condition_notes": "Notes about condition based on what's visible",
    "selling_tips": "Tips for selling this item - what buyers look for, how to display it",
    "keywords": ["keyword1", "keyword2", "keyword3"],
    "confidence": "high/medium/low"
}"""

@router.post("/identify", response_model=IdentifyResponse)
async def identify_item(request: IdentifyRequest):
    """Identify an antique item from an image and get value estimate"""
    
    if not settings.openai_api_key:
        raise HTTPException(status_code=500, detail="OpenAI API key not configured")
    
    # Prepare the image for the API
    if request.image.startswith("data:image"):
        # Already a data URL
        image_content = request.image
    elif request.image.startswith("http"):
        # URL - use as-is
        image_content = request.image
    else:
        # Assume base64, add data URL prefix
        image_content = f"data:image/jpeg;base64,{request.image}"
    
    # Build the prompt
    user_message = "Please identify this item and provide a value estimate for resale in an antique store."
    if request.additional_context:
        user_message += f"\n\nAdditional context from the seller: {request.additional_context}"
    
    # Call OpenAI Vision API
    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.openai_api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "gpt-4o",
                    "messages": [
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {
                            "role": "user",
                            "content": [
                                {"type": "text", "text": user_message},
                                {"type": "image_url", "image_url": {"url": image_content}}
                            ]
                        }
                    ],
                    "max_tokens": 1000
                }
            )
            response.raise_for_status()
            
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=500, detail=f"OpenAI API error: {str(e)}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error calling AI: {str(e)}")
    
    # Parse the response
    try:
        result = response.json()
        content = result["choices"][0]["message"]["content"]
        
        # Extract JSON from the response (handle markdown code blocks)
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0]
        elif "```" in content:
            content = content.split("```")[1].split("```")[0]
        
        data = json.loads(content.strip())
        return IdentifyResponse(**data)
        
    except (json.JSONDecodeError, KeyError, IndexError) as e:
        raise HTTPException(status_code=500, detail=f"Error parsing AI response: {str(e)}")

@router.post("/quick-value")
async def quick_value(request: IdentifyRequest):
    """Get a quick value estimate without full identification"""
    result = await identify_item(request)
    return {
        "item_name": result.item_name,
        "estimated_value_low": result.estimated_value_low,
        "estimated_value_high": result.estimated_value_high,
        "suggested_price": result.suggested_price,
        "category": result.category
    }

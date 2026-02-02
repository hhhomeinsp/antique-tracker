"""AI Identifier API - Uses OpenAI Vision + eBay market data to identify antiques and estimate value"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import json
import httpx
from app.core.config import settings
from app.services.ebay import ebay_client, EbayMarketData

router = APIRouter()


class IdentifyRequest(BaseModel):
    image: str  # Base64 encoded image or URL
    additional_context: Optional[str] = None  # Any notes about the item


class EbayComparable(BaseModel):
    title: str
    price: float
    condition: str
    url: str


class MarketDataResponse(BaseModel):
    source: str
    query: str
    total_found: int
    avg_price: float
    min_price: float
    max_price: float
    median_price: float
    comparables: list[EbayComparable]


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
    # New: Market data from eBay
    market_data: Optional[MarketDataResponse] = None


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


REFINE_PROMPT = """You previously identified this antique item as: {item_name}

I've searched eBay for recently SOLD items matching "{search_query}" and found {total_found} completed sales.

Here's the market data from actual eBay sales:
- Average sold price: ${avg_price}
- Median sold price: ${median_price}  
- Price range: ${min_price} - ${max_price}

Sample comparable sales:
{comparables}

Based on this REAL market data, please revise your price estimates. The eBay data shows what people ACTUALLY paid for similar items.

Consider:
- These are eBay prices (often lower than antique store prices due to no overhead)
- Antique store/booth markup is typically 1.5-2.5x of eBay prices
- Condition matters - adjust if this item is better/worse than comparables
- Local Florida market may differ slightly

Provide revised estimates in JSON format:
{{
    "estimated_value_low": <revised low based on eBay data>,
    "estimated_value_high": <revised high based on eBay data>,
    "suggested_price": <revised suggested price for antique store>,
    "market_analysis": "Brief analysis of how eBay data influenced your estimate"
}}"""


async def search_ebay_for_item(keywords: list[str], item_name: str) -> Optional[EbayMarketData]:
    """Search eBay for completed sales of similar items"""
    if not ebay_client.is_configured:
        return None
    
    # Build search query from keywords and item name
    # Use most specific terms first
    search_terms = [item_name] + keywords[:3]
    query = " ".join(search_terms[:4])  # Limit to avoid over-specific searches
    
    try:
        market_data = await ebay_client.find_completed_items(
            query=query,
            limit=15,
            sold_only=True
        )
        
        # If too few results, try a broader search
        if market_data.total_found < 3 and len(keywords) > 1:
            broader_query = " ".join(keywords[:2])
            market_data = await ebay_client.find_completed_items(
                query=broader_query,
                limit=15,
                sold_only=True
            )
        
        return market_data
    except Exception as e:
        # Log but don't fail - eBay data is supplementary
        print(f"eBay search error: {e}")
        return None


async def refine_estimate_with_market_data(
    ai_result: dict,
    market_data: EbayMarketData
) -> dict:
    """Use market data to refine AI's price estimate"""
    
    # Format comparables for the prompt
    comparables_text = ""
    for item in market_data.items[:5]:
        comparables_text += f"- \"{item.title}\" - ${item.price:.2f} ({item.condition})\n"
    
    if not comparables_text:
        comparables_text = "No specific comparables found"
    
    prompt = REFINE_PROMPT.format(
        item_name=ai_result["item_name"],
        search_query=market_data.query,
        total_found=market_data.total_found,
        avg_price=market_data.avg_price,
        median_price=market_data.median_price,
        min_price=market_data.min_price,
        max_price=market_data.max_price,
        comparables=comparables_text
    )
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            "https://api.openai.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {settings.openai_api_key}",
                "Content-Type": "application/json"
            },
            json={
                "model": "gpt-4o-mini",
                "messages": [
                    {"role": "system", "content": "You are an antique pricing expert. Respond only in valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                "max_tokens": 500
            }
        )
        
        if response.status_code != 200:
            return ai_result  # Fall back to original estimate
        
        result = response.json()
        content = result["choices"][0]["message"]["content"]
        
        # Parse JSON
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0]
        elif "```" in content:
            content = content.split("```")[1].split("```")[0]
        
        refined = json.loads(content.strip())
        
        # Update the original result with refined estimates
        ai_result["estimated_value_low"] = refined.get("estimated_value_low", ai_result["estimated_value_low"])
        ai_result["estimated_value_high"] = refined.get("estimated_value_high", ai_result["estimated_value_high"])
        ai_result["suggested_price"] = refined.get("suggested_price", ai_result["suggested_price"])
        
        # Add market analysis to selling tips
        if refined.get("market_analysis"):
            ai_result["selling_tips"] += f"\n\n📊 Market Analysis: {refined['market_analysis']}"
        
        return ai_result


@router.get("/status")
async def ai_status():
    """Check if AI identification and eBay integration are properly configured"""
    has_openai = bool(settings.openai_api_key)
    has_ebay = ebay_client.is_configured
    
    return {
        "openai_configured": has_openai,
        "ebay_configured": has_ebay,
        "model": "gpt-4o (vision) + gpt-4o-mini (refinement)",
        "features": {
            "image_identification": has_openai,
            "market_data": has_ebay,
            "price_refinement": has_openai and has_ebay
        }
    }


@router.post("/identify", response_model=IdentifyResponse)
async def identify_item(request: IdentifyRequest):
    """Identify an antique item from an image and get value estimate with eBay market data"""
    
    if not settings.openai_api_key:
        raise HTTPException(status_code=500, detail="OpenAI API key not configured")
    
    # Prepare the image for the API
    if request.image.startswith("data:image"):
        image_content = request.image
    elif request.image.startswith("http"):
        image_content = request.image
    else:
        image_content = f"data:image/jpeg;base64,{request.image}"
    
    # Build the prompt
    user_message = "Please identify this item and provide a value estimate for resale in an antique store."
    if request.additional_context:
        user_message += f"\n\nAdditional context from the seller: {request.additional_context}"
    
    # Step 1: Initial AI identification
    async with httpx.AsyncClient(timeout=90.0) as client:
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
                                {"type": "image_url", "image_url": {"url": image_content, "detail": "high"}}
                            ]
                        }
                    ],
                    "max_tokens": 2000
                }
            )
            
            if response.status_code != 200:
                error_body = response.text
                try:
                    error_json = response.json()
                    error_msg = error_json.get("error", {}).get("message", error_body)
                except:
                    error_msg = error_body
                raise HTTPException(status_code=response.status_code, detail=f"OpenAI API error: {error_msg}")
            
        except httpx.TimeoutException:
            raise HTTPException(status_code=504, detail="OpenAI API request timed out")
        except httpx.RequestError as e:
            raise HTTPException(status_code=500, detail=f"Network error: {str(e)}")
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")
    
    # Parse AI response
    try:
        result = response.json()
        content = result["choices"][0]["message"]["content"]
        
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0]
        elif "```" in content:
            content = content.split("```")[1].split("```")[0]
        
        ai_result = json.loads(content.strip())
        
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse AI response: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing response: {str(e)}")
    
    # Step 2: Search eBay for market data
    market_data = None
    market_response = None
    
    if ebay_client.is_configured:
        market_data = await search_ebay_for_item(
            keywords=ai_result.get("keywords", []),
            item_name=ai_result.get("item_name", "")
        )
        
        if market_data and market_data.total_found > 0:
            # Step 3: Refine estimate with market data
            ai_result = await refine_estimate_with_market_data(ai_result, market_data)
            
            # Build market data response
            market_response = MarketDataResponse(
                source="eBay Completed Sales",
                query=market_data.query,
                total_found=market_data.total_found,
                avg_price=market_data.avg_price,
                min_price=market_data.min_price,
                max_price=market_data.max_price,
                median_price=market_data.median_price,
                comparables=[
                    EbayComparable(
                        title=item.title,
                        price=item.price,
                        condition=item.condition,
                        url=item.item_url
                    )
                    for item in market_data.items[:5]
                ]
            )
    
    return IdentifyResponse(
        **ai_result,
        market_data=market_response
    )


@router.post("/quick-value")
async def quick_value(request: IdentifyRequest):
    """Get a quick value estimate without full identification"""
    result = await identify_item(request)
    return {
        "item_name": result.item_name,
        "estimated_value_low": result.estimated_value_low,
        "estimated_value_high": result.estimated_value_high,
        "suggested_price": result.suggested_price,
        "category": result.category,
        "market_data": result.market_data
    }


@router.get("/ebay-search")
async def test_ebay_search(q: str):
    """Test endpoint to search eBay directly"""
    if not ebay_client.is_configured:
        raise HTTPException(status_code=500, detail="eBay API not configured. Set EBAY_APP_ID environment variable.")
    
    try:
        market_data = await ebay_client.find_completed_items(q, limit=10)
        return {
            "query": market_data.query,
            "total_found": market_data.total_found,
            "avg_price": market_data.avg_price,
            "median_price": market_data.median_price,
            "min_price": market_data.min_price,
            "max_price": market_data.max_price,
            "items": [
                {
                    "title": item.title,
                    "price": item.price,
                    "condition": item.condition,
                    "sold_date": item.sold_date,
                    "url": item.item_url
                }
                for item in market_data.items
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

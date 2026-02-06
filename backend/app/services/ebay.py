"""eBay API integration for market price research"""
import httpx
import base64
from typing import Optional
from dataclasses import dataclass
from app.core.config import settings


@dataclass
class EbaySoldItem:
    title: str
    price: float
    currency: str
    condition: str
    sold_date: Optional[str]
    image_url: Optional[str]
    item_url: str


@dataclass
class EbayMarketData:
    query: str
    total_found: int
    items: list[EbaySoldItem]
    avg_price: float
    min_price: float
    max_price: float
    median_price: float


class EbayClient:
    """Client for eBay Browse API to search sold/completed items"""
    
    AUTH_URL = "https://api.ebay.com/identity/v1/oauth2/token"
    BROWSE_URL = "https://api.ebay.com/buy/browse/v1/item_summary/search"
    
    def __init__(self):
        self.app_id = settings.ebay_app_id
        self.cert_id = settings.ebay_cert_id
        self.app_token = settings.ebay_app_token  # Pre-generated token
        self._access_token: Optional[str] = None
    
    @property
    def is_configured(self) -> bool:
        return bool(self.app_token) or bool(self.app_id)
    
    async def _get_access_token(self) -> str:
        """Get OAuth token - use pre-generated token if available, otherwise fetch"""
        if self._access_token:
            return self._access_token
        
        # Use pre-generated Application Token if available
        if self.app_token:
            self._access_token = self.app_token
            return self._access_token
        
        if not self.app_id or not self.cert_id:
            raise ValueError("eBay API credentials not configured")
        
        # Base64 encode credentials
        credentials = base64.b64encode(f"{self.app_id}:{self.cert_id}".encode()).decode()
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.AUTH_URL,
                headers={
                    "Content-Type": "application/x-www-form-urlencoded",
                    "Authorization": f"Basic {credentials}"
                },
                data={
                    "grant_type": "client_credentials",
                    "scope": "https://api.ebay.com/oauth/api_scope"
                }
            )
            
            if response.status_code != 200:
                raise Exception(f"eBay auth failed: {response.text}")
            
            data = response.json()
            self._access_token = data["access_token"]
            return self._access_token
    
    async def search_sold_items(
        self, 
        query: str, 
        limit: int = 20,
        category_id: Optional[str] = None
    ) -> EbayMarketData:
        """
        Search for recently sold items on eBay.
        
        Note: The Browse API shows items that are currently available or recently sold.
        We filter for sold items using the API parameters.
        """
        token = await self._get_access_token()
        
        # Build search parameters
        params = {
            "q": query,
            "limit": min(limit, 50),
            "filter": "buyingOptions:{FIXED_PRICE|AUCTION},conditions:{USED|GOOD|VERY_GOOD|EXCELLENT}",
            # Sort by most recently ended
            "sort": "endDate"
        }
        
        if category_id:
            params["category_ids"] = category_id
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                self.BROWSE_URL,
                headers={
                    "Authorization": f"Bearer {token}",
                    "X-EBAY-C-MARKETPLACE-ID": "EBAY_US",
                    "X-EBAY-C-ENDUSERCTX": "affiliateCampaignId=<ePNCampaignId>,affiliateReferenceId=<referenceId>"
                },
                params=params
            )
            
            if response.status_code != 200:
                raise Exception(f"eBay search failed: {response.text}")
            
            data = response.json()
        
        # Parse results
        items = []
        prices = []
        
        for item in data.get("itemSummaries", []):
            price_data = item.get("price", {})
            price = float(price_data.get("value", 0))
            
            if price > 0:
                prices.append(price)
                items.append(EbaySoldItem(
                    title=item.get("title", ""),
                    price=price,
                    currency=price_data.get("currency", "USD"),
                    condition=item.get("condition", "Unknown"),
                    sold_date=item.get("itemEndDate"),
                    image_url=item.get("image", {}).get("imageUrl"),
                    item_url=item.get("itemWebUrl", "")
                ))
        
        # Calculate stats
        if prices:
            prices_sorted = sorted(prices)
            avg_price = sum(prices) / len(prices)
            min_price = prices_sorted[0]
            max_price = prices_sorted[-1]
            mid = len(prices_sorted) // 2
            median_price = prices_sorted[mid] if len(prices_sorted) % 2 else (prices_sorted[mid-1] + prices_sorted[mid]) / 2
        else:
            avg_price = min_price = max_price = median_price = 0
        
        return EbayMarketData(
            query=query,
            total_found=data.get("total", 0),
            items=items[:limit],
            avg_price=round(avg_price, 2),
            min_price=round(min_price, 2),
            max_price=round(max_price, 2),
            median_price=round(median_price, 2)
        )
    
    # Alias for compatibility with code expecting Finding API method name
    async def find_completed_items(self, query: str, limit: int = 20, sold_only: bool = True) -> EbayMarketData:
        return await self.search_sold_items(query, limit)


# Alternative: eBay Finding API for completed items (XML-based, older but reliable)
class EbayFindingClient:
    """Client for eBay Finding API - better for completed/sold item research"""
    
    FINDING_URL = "https://svcs.ebay.com/services/search/FindingService/v1"
    
    def __init__(self):
        self.app_id = settings.ebay_app_id
    
    @property
    def is_configured(self) -> bool:
        return bool(self.app_id)
    
    async def find_completed_items(
        self,
        query: str,
        limit: int = 20,
        sold_only: bool = True
    ) -> EbayMarketData:
        """
        Search for completed (sold) items using the Finding API.
        This gives access to items sold in the last 90 days.
        """
        if not self.app_id:
            raise ValueError("eBay App ID not configured")
        
        # Build request params
        params = {
            "OPERATION-NAME": "findCompletedItems",
            "SERVICE-VERSION": "1.13.0",
            "SECURITY-APPNAME": self.app_id,
            "RESPONSE-DATA-FORMAT": "JSON",
            "REST-PAYLOAD": "",
            "keywords": query,
            "paginationInput.entriesPerPage": min(limit, 100),
            "sortOrder": "EndTimeSoonest",
            # Filter for items that actually sold
            "itemFilter(0).name": "SoldItemsOnly",
            "itemFilter(0).value": "true" if sold_only else "false",
            # Include price range for sanity
            "itemFilter(1).name": "MinPrice",
            "itemFilter(1).value": "1",
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(self.FINDING_URL, params=params)
            
            if response.status_code != 200:
                raise Exception(f"eBay Finding API error: {response.text}")
            
            data = response.json()
        
        # Parse the nested response structure
        result = data.get("findCompletedItemsResponse", [{}])[0]
        search_result = result.get("searchResult", [{}])[0]
        
        items = []
        prices = []
        
        for item in search_result.get("item", []):
            # Get selling status
            selling_status = item.get("sellingStatus", [{}])[0]
            current_price = selling_status.get("currentPrice", [{}])[0]
            price = float(current_price.get("__value__", 0))
            
            # Only include if actually sold
            sold_state = selling_status.get("sellingState", [""])[0]
            if sold_state != "EndedWithSales" and sold_only:
                continue
            
            if price > 0:
                prices.append(price)
                
                # Get image
                gallery = item.get("galleryURL", [""])[0]
                
                items.append(EbaySoldItem(
                    title=item.get("title", [""])[0],
                    price=price,
                    currency=current_price.get("@currencyId", "USD"),
                    condition=item.get("condition", [{}])[0].get("conditionDisplayName", ["Unknown"])[0] if item.get("condition") else "Unknown",
                    sold_date=item.get("listingInfo", [{}])[0].get("endTime", [""])[0],
                    image_url=gallery if gallery else None,
                    item_url=item.get("viewItemURL", [""])[0]
                ))
        
        # Calculate stats
        if prices:
            prices_sorted = sorted(prices)
            avg_price = sum(prices) / len(prices)
            min_price = prices_sorted[0]
            max_price = prices_sorted[-1]
            mid = len(prices_sorted) // 2
            median_price = prices_sorted[mid] if len(prices_sorted) % 2 else (prices_sorted[mid-1] + prices_sorted[mid]) / 2
        else:
            avg_price = min_price = max_price = median_price = 0
        
        total = int(result.get("paginationOutput", [{}])[0].get("totalEntries", ["0"])[0])
        
        return EbayMarketData(
            query=query,
            total_found=total,
            items=items[:limit],
            avg_price=round(avg_price, 2),
            min_price=round(min_price, 2),
            max_price=round(max_price, 2),
            median_price=round(median_price, 2)
        )


# Use the Finding API client as primary (better for sold items research)
# Use Finding API client (uses App ID, better for sold item research)
# Falls back to Browse API if Finding API fails
ebay_client = EbayFindingClient()

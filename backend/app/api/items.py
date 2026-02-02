"""Items API endpoints"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from app.core.database import get_db
from app.models.item import Item, ItemCategory, ItemCondition

router = APIRouter()

# Pydantic schemas
class ItemCreate(BaseModel):
    name: str
    description: Optional[str] = None
    category: str = "other"
    condition: str = "good"
    purchase_price: float
    purchase_date: datetime
    store_id: Optional[int] = None
    suggested_price: Optional[float] = None
    listed_price: Optional[float] = None
    ai_identification: Optional[str] = None
    estimated_value_low: Optional[float] = None
    estimated_value_high: Optional[float] = None
    photo: Optional[str] = None
    notes: Optional[str] = None

class ItemUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    condition: Optional[str] = None
    purchase_price: Optional[float] = None
    purchase_date: Optional[datetime] = None
    store_id: Optional[int] = None
    suggested_price: Optional[float] = None
    listed_price: Optional[float] = None
    estimated_value_low: Optional[float] = None
    estimated_value_high: Optional[float] = None
    notes: Optional[str] = None
    photo: Optional[str] = None
    # Allow unselling an item
    is_sold: Optional[bool] = None
    sale_price: Optional[float] = None
    sale_date: Optional[datetime] = None

class ItemSale(BaseModel):
    sale_price: float
    sale_date: Optional[datetime] = None

class ItemResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    category: str
    condition: str
    purchase_price: float
    purchase_date: datetime
    store_id: Optional[int]
    is_sold: bool
    sale_price: Optional[float]
    sale_date: Optional[datetime]
    suggested_price: Optional[float]
    listed_price: Optional[float]
    ai_identification: Optional[str]
    estimated_value_low: Optional[float]
    estimated_value_high: Optional[float]
    photo: Optional[str]
    notes: Optional[str]
    created_at: datetime
    # Computed fields
    profit: Optional[float] = None
    profit_margin: Optional[float] = None
    days_to_sell: Optional[int] = None
    
    class Config:
        from_attributes = True

# Category list endpoint
@router.get("/categories")
def list_categories():
    """Get all available categories"""
    return [
        {"value": "furniture", "label": "Furniture"},
        {"value": "art", "label": "Art & Paintings"},
        {"value": "vases", "label": "Vases"},
        {"value": "figurines", "label": "Figurines"},
        {"value": "knick_knacks", "label": "Knick Knacks"},
        {"value": "jewelry", "label": "Jewelry"},
        {"value": "pottery", "label": "Pottery & Ceramics"},
        {"value": "glassware", "label": "Glassware"},
        {"value": "textiles", "label": "Textiles & Linens"},
        {"value": "books", "label": "Books"},
        {"value": "collectibles", "label": "Collectibles"},
        {"value": "vintage_decor", "label": "Vintage Decor"},
        {"value": "kitchenware", "label": "Kitchenware"},
        {"value": "lighting", "label": "Lighting & Lamps"},
        {"value": "mirrors", "label": "Mirrors"},
        {"value": "clocks", "label": "Clocks"},
        {"value": "other", "label": "Other"},
    ]

@router.get("/", response_model=List[ItemResponse])
def list_items(
    sold: Optional[bool] = None,
    category: Optional[str] = None,
    store_id: Optional[int] = None,
    limit: int = Query(default=50, le=200),
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """Get all items with optional filters"""
    query = db.query(Item)
    
    if sold is not None:
        query = query.filter(Item.is_sold == sold)
    if category:
        query = query.filter(Item.category == category)
    if store_id:
        query = query.filter(Item.store_id == store_id)
    
    items = query.order_by(desc(Item.created_at)).offset(offset).limit(limit).all()
    
    # Add computed fields
    result = []
    for item in items:
        item_dict = ItemResponse.model_validate(item).model_dump()
        if item.is_sold and item.sale_price:
            item_dict["profit"] = item.sale_price - item.purchase_price
            if item.purchase_price > 0:
                item_dict["profit_margin"] = ((item.sale_price - item.purchase_price) / item.purchase_price) * 100
            if item.sale_date and item.purchase_date:
                item_dict["days_to_sell"] = (item.sale_date - item.purchase_date).days
        result.append(item_dict)
    
    return result

@router.post("/", response_model=ItemResponse)
def create_item(item: ItemCreate, db: Session = Depends(get_db)):
    """Create a new item"""
    db_item = Item(**item.model_dump())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@router.get("/{item_id}", response_model=ItemResponse)
def get_item(item_id: int, db: Session = Depends(get_db)):
    """Get a specific item"""
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item

@router.patch("/{item_id}", response_model=ItemResponse)
def update_item(item_id: int, item_update: ItemUpdate, db: Session = Depends(get_db)):
    """Update an item"""
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    update_data = item_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(item, field, value)
    
    db.commit()
    db.refresh(item)
    return item

@router.post("/{item_id}/sell", response_model=ItemResponse)
def mark_item_sold(item_id: int, sale: ItemSale, db: Session = Depends(get_db)):
    """Mark an item as sold"""
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    item.is_sold = True
    item.sale_price = sale.sale_price
    item.sale_date = sale.sale_date or datetime.utcnow()
    
    db.commit()
    db.refresh(item)
    return item

@router.delete("/{item_id}")
def delete_item(item_id: int, db: Session = Depends(get_db)):
    """Delete an item"""
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    db.delete(item)
    db.commit()
    return {"message": "Item deleted"}

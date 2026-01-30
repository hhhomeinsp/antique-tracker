"""Analytics API - Business intelligence for antique reselling"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from typing import Optional
from datetime import datetime, timedelta
from collections import defaultdict

from app.core.database import get_db
from app.models.item import Item
from app.models.store import Store

router = APIRouter()

@router.get("/summary")
def get_summary(
    days: int = Query(default=30, description="Number of days to analyze"),
    db: Session = Depends(get_db)
):
    """Get overall business summary"""
    cutoff_date = datetime.utcnow() - timedelta(days=days)
    
    # Total inventory stats
    total_items = db.query(Item).count()
    unsold_items = db.query(Item).filter(Item.is_sold == False).count()
    sold_items = db.query(Item).filter(Item.is_sold == True).count()
    
    # Recent sales
    recent_sold = db.query(Item).filter(
        Item.is_sold == True,
        Item.sale_date >= cutoff_date
    ).all()
    
    # Recent purchases
    recent_purchased = db.query(Item).filter(
        Item.purchase_date >= cutoff_date
    ).all()
    
    # Calculate metrics
    total_invested = sum(item.purchase_price for item in db.query(Item).filter(Item.is_sold == False).all())
    total_revenue = sum(item.sale_price or 0 for item in recent_sold)
    total_cost = sum(item.purchase_price for item in recent_sold)
    total_profit = total_revenue - total_cost
    
    avg_profit_margin = 0
    if recent_sold:
        margins = []
        for item in recent_sold:
            if item.purchase_price > 0:
                margins.append(((item.sale_price - item.purchase_price) / item.purchase_price) * 100)
        if margins:
            avg_profit_margin = sum(margins) / len(margins)
    
    avg_days_to_sell = 0
    if recent_sold:
        days_list = []
        for item in recent_sold:
            if item.sale_date and item.purchase_date:
                days_list.append((item.sale_date - item.purchase_date).days)
        if days_list:
            avg_days_to_sell = sum(days_list) / len(days_list)
    
    return {
        "period_days": days,
        "total_items": total_items,
        "unsold_items": unsold_items,
        "sold_items": sold_items,
        "current_inventory_value": round(total_invested, 2),
        "recent_sales": {
            "count": len(recent_sold),
            "revenue": round(total_revenue, 2),
            "cost": round(total_cost, 2),
            "profit": round(total_profit, 2),
            "avg_profit_margin": round(avg_profit_margin, 1),
            "avg_days_to_sell": round(avg_days_to_sell, 1)
        },
        "recent_purchases": {
            "count": len(recent_purchased),
            "total_spent": round(sum(i.purchase_price for i in recent_purchased), 2)
        }
    }

@router.get("/by-store")
def get_stats_by_store(db: Session = Depends(get_db)):
    """Get performance stats grouped by store"""
    stores = db.query(Store).all()
    results = []
    
    for store in stores:
        items = db.query(Item).filter(Item.store_id == store.id).all()
        sold = [i for i in items if i.is_sold]
        unsold = [i for i in items if not i.is_sold]
        
        total_profit = sum((i.sale_price - i.purchase_price) for i in sold if i.sale_price)
        total_invested = sum(i.purchase_price for i in items)
        
        avg_margin = 0
        if sold:
            margins = [((i.sale_price - i.purchase_price) / i.purchase_price) * 100 
                      for i in sold if i.purchase_price > 0 and i.sale_price]
            if margins:
                avg_margin = sum(margins) / len(margins)
        
        results.append({
            "store_id": store.id,
            "store_name": store.name,
            "city": store.city,
            "total_items": len(items),
            "sold_items": len(sold),
            "unsold_items": len(unsold),
            "total_invested": round(total_invested, 2),
            "total_profit": round(total_profit, 2),
            "avg_profit_margin": round(avg_margin, 1),
            "sell_through_rate": round((len(sold) / len(items) * 100) if items else 0, 1)
        })
    
    # Sort by profit
    results.sort(key=lambda x: x["total_profit"], reverse=True)
    return results

@router.get("/by-category")
def get_stats_by_category(db: Session = Depends(get_db)):
    """Get performance stats grouped by category"""
    items = db.query(Item).all()
    categories = defaultdict(list)
    
    for item in items:
        categories[item.category].append(item)
    
    results = []
    for category, cat_items in categories.items():
        sold = [i for i in cat_items if i.is_sold]
        unsold = [i for i in cat_items if not i.is_sold]
        
        total_profit = sum((i.sale_price - i.purchase_price) for i in sold if i.sale_price)
        total_revenue = sum(i.sale_price or 0 for i in sold)
        
        avg_margin = 0
        if sold:
            margins = [((i.sale_price - i.purchase_price) / i.purchase_price) * 100 
                      for i in sold if i.purchase_price > 0 and i.sale_price]
            if margins:
                avg_margin = sum(margins) / len(margins)
        
        avg_days_to_sell = 0
        if sold:
            days_list = [(i.sale_date - i.purchase_date).days 
                        for i in sold if i.sale_date and i.purchase_date]
            if days_list:
                avg_days_to_sell = sum(days_list) / len(days_list)
        
        results.append({
            "category": category,
            "total_items": len(cat_items),
            "sold_items": len(sold),
            "unsold_items": len(unsold),
            "total_profit": round(total_profit, 2),
            "total_revenue": round(total_revenue, 2),
            "avg_profit_margin": round(avg_margin, 1),
            "avg_days_to_sell": round(avg_days_to_sell, 1),
            "sell_through_rate": round((len(sold) / len(cat_items) * 100) if cat_items else 0, 1)
        })
    
    # Sort by profit
    results.sort(key=lambda x: x["total_profit"], reverse=True)
    return results

@router.get("/best-shopping-days")
def get_best_shopping_days(db: Session = Depends(get_db)):
    """Analyze which days of the week yield the best finds"""
    items = db.query(Item).filter(Item.is_sold == True).all()
    
    # Group by day of week purchased
    days = defaultdict(list)
    for item in items:
        if item.purchase_date:
            day_name = item.purchase_date.strftime("%A")
            profit = (item.sale_price - item.purchase_price) if item.sale_price else 0
            days[day_name].append({
                "profit": profit,
                "margin": ((item.sale_price - item.purchase_price) / item.purchase_price * 100) if item.purchase_price > 0 and item.sale_price else 0
            })
    
    results = []
    day_order = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    
    for day in day_order:
        if day in days:
            items_list = days[day]
            total_profit = sum(i["profit"] for i in items_list)
            avg_margin = sum(i["margin"] for i in items_list) / len(items_list) if items_list else 0
            results.append({
                "day": day,
                "items_purchased": len(items_list),
                "total_profit": round(total_profit, 2),
                "avg_profit_margin": round(avg_margin, 1)
            })
        else:
            results.append({
                "day": day,
                "items_purchased": 0,
                "total_profit": 0,
                "avg_profit_margin": 0
            })
    
    return results

@router.get("/inventory-aging")
def get_inventory_aging(db: Session = Depends(get_db)):
    """Analyze how long items have been in inventory"""
    unsold = db.query(Item).filter(Item.is_sold == False).all()
    now = datetime.utcnow()
    
    aging_buckets = {
        "0-30 days": [],
        "31-60 days": [],
        "61-90 days": [],
        "91-180 days": [],
        "180+ days": []
    }
    
    for item in unsold:
        if item.purchase_date:
            days_old = (now - item.purchase_date).days
            if days_old <= 30:
                aging_buckets["0-30 days"].append(item)
            elif days_old <= 60:
                aging_buckets["31-60 days"].append(item)
            elif days_old <= 90:
                aging_buckets["61-90 days"].append(item)
            elif days_old <= 180:
                aging_buckets["91-180 days"].append(item)
            else:
                aging_buckets["180+ days"].append(item)
    
    results = []
    for bucket, items in aging_buckets.items():
        results.append({
            "bucket": bucket,
            "item_count": len(items),
            "total_value": round(sum(i.purchase_price for i in items), 2),
            "items": [{"id": i.id, "name": i.name, "price": i.purchase_price} for i in items[:5]]  # Top 5
        })
    
    return results

@router.get("/top-items")
def get_top_items(
    metric: str = Query(default="profit", description="Sort by: profit, margin, or revenue"),
    limit: int = Query(default=10, le=50),
    db: Session = Depends(get_db)
):
    """Get top performing items"""
    sold = db.query(Item).filter(Item.is_sold == True).all()
    
    items_with_metrics = []
    for item in sold:
        if item.sale_price and item.purchase_price > 0:
            profit = item.sale_price - item.purchase_price
            margin = (profit / item.purchase_price) * 100
            items_with_metrics.append({
                "id": item.id,
                "name": item.name,
                "category": item.category,
                "purchase_price": item.purchase_price,
                "sale_price": item.sale_price,
                "profit": round(profit, 2),
                "margin": round(margin, 1),
                "days_to_sell": (item.sale_date - item.purchase_date).days if item.sale_date and item.purchase_date else None
            })
    
    # Sort by metric
    if metric == "profit":
        items_with_metrics.sort(key=lambda x: x["profit"], reverse=True)
    elif metric == "margin":
        items_with_metrics.sort(key=lambda x: x["margin"], reverse=True)
    elif metric == "revenue":
        items_with_metrics.sort(key=lambda x: x["sale_price"], reverse=True)
    
    return items_with_metrics[:limit]

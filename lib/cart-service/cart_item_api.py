from fastapi import FastAPI, Response

from cart import add_item
from recs import get_recommendations
from cart_item_model import CartItem

app = FastAPI()

@app.get("/health")
def get_health():
  return {
    "healthy": True
  }

@app.post("/items")
def get_root(item: CartItem, response: Response):
  print("item", item)
  add_item(item.cart_id, item.product_code)
  recs = get_recommendations(item.product_code)
  payload = {
    "status": "ADDED",
    "related_recommendations": recs
  }
  response.headers["X-Response-Source"] = "ECS"
  return payload
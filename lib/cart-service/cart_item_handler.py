import json

from cart import add_item
from recs import get_recommendations

def handle_add_item(event, context):
  print("event", event)
  payload = json.loads(event["body"])
  cart_id = payload["cart_id"]
  product_code = payload["product_code"]
  add_item(cart_id, product_code)
  recs = get_recommendations(product_code)
  payload = {
    "status": "ADDED",
    "related_recommendations": recs
  }
  
  return {
    "isBase64Encoded": False,
    "statusDescription": "200 OK",
    "statusCode": 200,
    "body": json.dumps(payload),
    "headers": {
      "X-Response-Source": "Lambda"
    }
  }
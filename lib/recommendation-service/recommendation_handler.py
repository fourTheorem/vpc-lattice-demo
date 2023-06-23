import json
from recommender import get_recommendations

def handle_get_recommendations (event, context):
  """ Lambda handler for a Lattice recommendation endpoint event trigger """
  print(event)
  product_code = event["query_string_parameters"]["product_code"]
  recommendations = get_recommendations(product_code)
  return {
    "isBase64Encoded": False,
    "statusDescription": "200 OK",
    "statusCode": 200,
    "body": json.dumps(recommendations),
    "headers": {}
  }
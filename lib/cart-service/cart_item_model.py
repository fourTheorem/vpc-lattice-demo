from pydantic import BaseModel

class CartItem(BaseModel):
    cart_id: str
    product_code: str
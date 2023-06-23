recommendations_by_product = {
  "INFLCAT": [ # Inflatable Unicorn Horn for Cats
    { "title": "Catnip-infused Unicorn Plush Toy", "productCode": "UNICPLSH" },
    { "title": "Rainbow-Colored Cat Collar", "productCode": "CATCOLLAR" },
    { "title": "Unicorn Themed Cat Bed", "productCode": "UNICBED" },
    { "title": "Sparkling Water Fountain for Cats", "productCode": "CATFOUNT" },
    { "title": "Unicorn Horn Headband for Cat Owners", "productCode": "UNICHEAD" }
  ],
  "SELFCOF": [ # Self-Stirring Coffee Mug
    { "title": "Gourmet Coffee Sampler Pack", "productCode": "COFSAMPLER" },
    { "title": "Coffee Bean Grinder", "productCode": "COFGRINDER" },
    { "title": "Insulated Travel Mug", "productCode": "TRAVMUG" },
    { "title": "Milk Frother for Cappuccinos", "productCode": "MILKFROTHER" },
    { "title": "Funny Coffee Socks - Powered by Coffee", "productCode": "COFSOCKS" }
  ],
  "GIANTAVO": [ # Giant Avocado Pool Float
    { "title": "Inflatable Pineapple Drink Holder", "productCode": "PINEHOLDER" },
    { "title": "Watermelon Beach Towel", "productCode": "WATERMTOWEL" },
    { "title": "Portable Bluetooth Speaker for Pool Parties", "productCode": "BTSPEAKER" },
    { "title": "Avocado-themed Picnic Blanket", "productCode": "AVOBLANKET" },
    { "title": "Fruit Slice Sunglasses - Watermelon", "productCode": "SUNGLASSES" }
  ],
  "FUNSOCKS": [ # Funny Socks Collection - Pizza and Tacos
    { "title": "Pizza Slice Blanket", "productCode": "PIZZABLANKET" },
    { "title": "Taco Holder Stand", "productCode": "TACOHOLDER" },
    { "title": "Foodie T-Shirt - In Pizza We Crust", "productCode": "PIZZASHIRT" },
    { "title": "Novelty Pizza Cutter", "productCode": "PIZZACUTTER" },
    { "title": "Taco Cat Jigsaw Puzzle", "productCode": "TACOJIGSAW" }
  ]
}

def get_recommendations(product_code):
  """ Simple recommender that performs a lookup based on product code """
  return recommendations_by_product.get(product_code, [])

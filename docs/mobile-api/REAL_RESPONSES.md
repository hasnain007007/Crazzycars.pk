# Real local verify responses

Generated: 2026-10-04T21:37:40.779Z
Base: `http://127.0.0.1:3000`
DB: `crazzycars_local_verify` (tokens redacted)

JSON fixtures: `docs/mobile-api/real-fixtures/`.

## Results

| Case | Result | Detail |
|------|--------|--------|
| register | PASS | status 201 |
| login | PASS | tokens present |
| refresh_grace_new_child | PASS | grace issued different child |
| refresh_lost_child_rejected | PASS | TOKEN_INVALID |
| refresh_TOKEN_REUSED | PASS | family revoke |
| refresh_after_family_revoke | PASS |  |
| refresh_as_bearer_rejected | PASS | TOKEN_INVALID |
| mobile_access_as_cookie_rejected | PASS | status 401 |
| web_cookie_as_mobile_bearer_rejected | PASS |  |
| idempotency_same_key_same_body | PASS | ORD-2026-00001 |
| idempotency_same_key_different_body | PASS |  |
| idempotency_concurrent | PASS | ids=6ac2c723e8107da9613b561e |
| guest_order | PASS | ORD-2026-00004 |
| guest_order_reopen_header | PASS |  |
| idor_generic_404 | PASS |  |
| orders_list | PASS | 3 |
| price_tamper_ignored | PASS | charged=2749 |
| min_order_enforced | PASS | MIN_ORDER_NOT_MET |
| stock_oversell_blocked | PASS | qty=2 |
| body_kit_COD_blocked | PASS | Cash on Delivery is not available for: Honda Civic Body Kit D1. Choose advance p |
| body_kit_non_COD_ok | PASS | total=40499 |
| body_kit_bank_order | PASS | ORD-2026-00006 |
| tracking_unavailable_no_keys | PASS | 503 TRACKING_UNAVAILABLE |
| tracking_unknown_not_found | PASS | 404 NOT_FOUND |
| track_privacy_identical_errors | PASS |  |
| home_sections | PASS |  |
| config_payment_methods | PASS |  |
| fitsVehicle_list | PASS | 5 |
| fitsVehicle_detail | PASS |  |
| login_rate_limit | PASS | 429 |
| account_delete_http | PASS |  |
| account_delete_db | PASS | isActive=false tokens=0 devices=0 ordersKept≈3 |
| refresh_after_31s_TOKEN_REUSED | SKIP | SKIPPED (set VERIFY_SLOW=1) |

## Sample bodies (redacted)

### POST /auth/register

```json
{
  "customer": {
    "id": "6ac2c721e8107da9613b55ff",
    "name": "Verify Alpha",
    "firstName": "Verify",
    "lastName": "Alpha",
    "email": "verify.a+1791149856797@example.com",
    "phone": "03019856797",
    "isVerified": false,
    "createdAt": "2026-10-04T21:37:37.098Z"
  },
  "accessToken": "[REDACTED]",
  "refreshToken": "[REDACTED]",
  "expiresIn": 900,
  "tokenType": "[REDACTED]"
}
```

### POST /auth/login

```json
{
  "customer": {
    "id": "6ac2c721e8107da9613b55ff",
    "name": "Verify Alpha",
    "firstName": "Verify",
    "lastName": "Alpha",
    "email": "verify.a+1791149856797@example.com",
    "phone": "03019856797",
    "isVerified": false,
    "createdAt": "2026-10-04T21:37:37.098Z"
  },
  "accessToken": "[REDACTED]",
  "refreshToken": "[REDACTED]",
  "expiresIn": 900,
  "tokenType": "[REDACTED]"
}
```

### POST /auth/refresh (grace)

```json
{
  "accessToken": "[REDACTED]",
  "refreshToken": "[REDACTED]"
}
```

### POST /auth/refresh TOKEN_REUSED

```json
{
  "error": {
    "code": "TOKEN_REUSED",
    "message": "Refresh token already used. All sessions have been revoked for security."
  }
}
```

### GET /me

```json
{
  "customer": {
    "id": "6ac2c721e8107da9613b55ff",
    "name": "Verify Alpha",
    "firstName": "Verify",
    "lastName": "Alpha",
    "email": "verify.a+1791149856797@example.com",
    "phone": "03019856797",
    "avatar": "",
    "isVerified": false,
    "addresses": [],
    "createdAt": "2026-10-04T21:37:37.098Z"
  }
}
```

### POST /orders (idem same body 1)

```json
{
  "orderId": "6ac2c723e8107da9613b560f",
  "orderNumber": "ORD-2026-00001",
  "accessToken": "[REDACTED]",
  "total": 2749,
  "paymentStatus": "unpaid",
  "paymentMethod": "cod",
  "pricing": {
    "subtotal": 2499,
    "discount": 0,
    "shippingCost": 250,
    "shippingMethod": "Standard",
    "shippingZone": "Pakistan Default",
    "total": 2749
  },
  "paymentInstructions": {
    "paymentMethod": "cod",
    "amountDue": 250,
    "remainingOnDelivery": 2499,
    "currency": "PKR",
    "title": "Confirm Your Order",
    "message": "Pay delivery charges of Rs.250 and send screenshot on WhatsApp: 03000000000",
    "accountLines": [
      {
        "label": "Bank",
        "value": "Fake Meezan Local"
      },
      {
        "label": "Account",
        "value": "00000000000000"
      },
      {
        "label": "Title",
        "value": "LOCAL VERIFY FAKE"
      },
      {
        "label": "IBAN",
        "value": "PK00FAKE0000000000000000"
      }
    ],
    "whatsapp": {
      "number": "03000000000",
      "display": "03000000000",
      "waMeUrl": "https://wa.me/923000000000?text=Hi%20CrazzyCars%2C%20I%20paid%20for%20order%20ORD-2026-00001.%0AAmount%3A%20Rs.250.%0ASending%20payment%20screenshot%20now.",
      "prefilledMessage": "Hi CrazzyCars, I paid for order ORD-2026-00001.\nAmount: Rs.250.\nSending payment screenshot now."
    }
  }
}
```

### POST /orders IDEMPOTENCY_KEY_REUSED

```json
{
  "error": {
    "code": "IDEMPOTENCY_KEY_REUSED",
    "message": "Idempotency-Key was already used with a different request body."
  }
}
```

### POST /orders guest

```json
{
  "orderId": "6ac2c723e8107da9613b5623",
  "orderNumber": "ORD-2026-00004",
  "accessToken": "[REDACTED]",
  "total": 2749,
  "paymentStatus": "unpaid",
  "paymentMethod": "cod",
  "pricing": {
    "subtotal": 2499,
    "discount": 0,
    "shippingCost": 250,
    "shippingMethod": "Standard",
    "shippingZone": "Pakistan Default",
    "total": 2749
  },
  "paymentInstructions": {
    "paymentMethod": "cod",
    "amountDue": 250,
    "remainingOnDelivery": 2499,
    "currency": "PKR",
    "title": "Confirm Your Order",
    "message": "Pay delivery charges of Rs.250 and send screenshot on WhatsApp: 03000000000",
    "accountLines": [
      {
        "label": "Bank",
        "value": "Fake Meezan Local"
      },
      {
        "label": "Account",
        "value": "00000000000000"
      },
      {
        "label": "Title",
        "value": "LOCAL VERIFY FAKE"
      },
      {
        "label": "IBAN",
        "value": "PK00FAKE0000000000000000"
      }
    ],
    "whatsapp": {
      "number": "03000000000",
      "display": "03000000000",
      "waMeUrl": "https://wa.me/923000000000?text=Hi%20CrazzyCars%2C%20I%20paid%20for%20order%20ORD-2026-00004.%0AAmount%3A%20Rs.250.%0ASending%20payment%20screenshot%20now.",
      "prefilledMessage": "Hi CrazzyCars, I paid for order ORD-2026-00004.\nAmount: Rs.250.\nSending payment screenshot now."
    }
  }
}
```

### GET /orders/:id guest header

```json
{
  "order": {
    "id": "6ac2c723e8107da9613b5623",
    "orderNumber": "ORD-2026-00004",
    "status": "pending",
    "paymentStatus": "unpaid",
    "paymentMethod": "cod",
    "total": 2749,
    "pricing": {
      "subtotal": 2499,
      "discount": 0,
      "shippingCost": 250,
      "total": 2749
    },
    "items": [
      {
        "productId": "6ac2c71efdf15f953bf2aa76",
        "slug": "led-headlight-bulb-h4",
        "name": "LED Headlight Bulb H4",
        "quantity": 1,
        "unitPrice": 2499,
        "total": 2499,
        "image": "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg",
        "variantId": "",
        "variationLabel": ""
      }
    ],
    "timeline": [
      {
        "status": "placed",
        "title": "Order Placed",
        "description": "Order #ORD-2026-00004 received successfully",
        "timestamp": "2026-10-04T21:37:39.917Z"
      }
    ],
    "tracking": {
      "number": "",
      "url": "",
      "courier": "Postex"
    },
    "shippingCity": "Lahore",
    "shippingProvince": "Punjab",
    "createdAt": "2026-10-04T21:37:39.919Z",
    "paymentInstructions": {
      "paymentMethod": "cod",
      "amountDue": 250,
      "remainingOnDelivery": 2499,
      "currency": "PKR",
      "title": "Confirm Your Order",
      "message": "Pay delivery charges of Rs.250 and send screenshot on WhatsApp: 03000000000",
      "accountLines": [
        {
          "label": "Bank",
          "value": "Fake Meezan Local"
        },
        {
          "label": "Account",
          "value": "00000000000000"
        },
        {
          "label": "Title",
          "value": "LOCAL VERIFY FAKE"
        },
        {
          "label": "IBAN",
          "value": "PK00FAKE0000000000000000"
        }
      ],
      "whatsapp": {
        "number": "03000000000",
        "display": "03000000000",
        "waMeUrl": "https://wa.me/923000000000?text=Hi%20CrazzyCars%2C%20I%20paid%20for%20order%20ORD-2026-00004.%0AAmount%3A%20Rs.250.%0ASending%20payment%20screenshot%20now.",
        "prefilledMessage": "Hi CrazzyCars, I paid for order ORD-2026-00004.\nAmount: Rs.250.\nSending payment screenshot now."
      }
    }
  }
}
```

### GET /orders list

```json
{
  "orders": [
    {
      "id": "6ac2c723e8107da9613b561e",
      "orderNumber": "ORD-2026-00003",
      "status": "pending",
      "paymentStatus": "unpaid",
      "paymentMethod": "cod",
      "total": 2749,
      "itemCount": 1,
      "createdAt": "2026-10-04T21:37:39.859Z",
      "shippingCity": "Lahore",
      "trackingNumber": ""
    },
    {
      "id": "6ac2c723e8107da9613b5616",
      "orderNumber": "ORD-2026-00002",
      "status": "pending",
      "paymentStatus": "unpaid",
      "paymentMethod": "cod",
      "total": 2749,
      "itemCount": 1,
      "createdAt": "2026-10-04T21:37:39.799Z",
      "shippingCity": "Lahore",
      "trackingNumber": ""
    },
    {
      "id": "6ac2c723e8107da9613b560f",
      "orderNumber": "ORD-2026-00001",
      "status": "pending",
      "paymentStatus": "unpaid",
      "paymentMethod": "cod",
      "total": 2749,
      "itemCount": 1,
      "createdAt": "2026-10-04T21:37:39.737Z",
      "shippingCity": "Lahore",
      "trackingNumber": ""
    }
  ],
  "pagination": {
    "total": 3,
    "page": 1,
    "limit": 50,
    "pages": 1,
    "hasNext": false
  }
}
```

### POST /orders price tamper

```json
{
  "orderId": "6ac2c724e8107da9613b5629",
  "orderNumber": "ORD-2026-00005",
  "accessToken": "[REDACTED]",
  "total": 2749,
  "paymentStatus": "unpaid",
  "paymentMethod": "cod",
  "pricing": {
    "subtotal": 2499,
    "discount": 0,
    "shippingCost": 250,
    "shippingMethod": "Standard",
    "shippingZone": "Pakistan Default",
    "total": 2749
  },
  "paymentInstructions": {
    "paymentMethod": "cod",
    "amountDue": 250,
    "remainingOnDelivery": 2499,
    "currency": "PKR",
    "title": "Confirm Your Order",
    "message": "Pay delivery charges of Rs.250 and send screenshot on WhatsApp: 03000000000",
    "accountLines": [
      {
        "label": "Bank",
        "value": "Fake Meezan Local"
      },
      {
        "label": "Account",
        "value": "00000000000000"
      },
      {
        "label": "Title",
        "value": "LOCAL VERIFY FAKE"
      },
      {
        "label": "IBAN",
        "value": "PK00FAKE0000000000000000"
      }
    ],
    "whatsapp": {
      "number": "03000000000",
      "display": "03000000000",
      "waMeUrl": "https://wa.me/923000000000?text=Hi%20CrazzyCars%2C%20I%20paid%20for%20order%20ORD-2026-00005.%0AAmount%3A%20Rs.250.%0ASending%20payment%20screenshot%20now.",
      "prefilledMessage": "Hi CrazzyCars, I paid for order ORD-2026-00005.\nAmount: Rs.250.\nSending payment screenshot now."
    }
  }
}
```

### POST /orders MIN_ORDER

```json
{
  "error": {
    "code": "MIN_ORDER_NOT_MET",
    "message": "Minimum order amount is Rs.999999. Your cart subtotal after discounts is Rs.2499."
  }
}
```

### POST /orders oversell

```json
{
  "error": {
    "code": "OUT_OF_STOCK",
    "message": "Insufficient stock for Fog Lamp Cover Low Stock."
  }
}
```

### POST /cart/quote COD body kit

```json
{
  "error": {
    "code": "COD_NOT_AVAILABLE",
    "message": "Cash on Delivery is not available for: Honda Civic Body Kit D1. Choose advance payment instead."
  }
}
```

### POST /cart/quote bankTransfer body kit

```json
{
  "items": [
    {
      "productId": "6ac2c71efdf15f953bf2aa70",
      "name": "Honda Civic Body Kit D1",
      "slug": "honda-civic-body-kit-d1",
      "image": "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg",
      "unitPrice": 39999,
      "quantity": 1,
      "total": 39999,
      "isBulky": true
    }
  ],
  "subtotal": 39999,
  "discount": 0,
  "couponCode": "",
  "afterCoupon": 39999,
  "shippingCost": 500,
  "shippingEstimated": false,
  "total": 40499,
  "totalWeightGrams": 0,
  "hasBulky": true,
  "minOrderAmount": 0,
  "meetsMinOrder": true,
  "codAvailable": true,
  "codUnavailableMessage": null,
  "enabledPaymentMethods": [
    "cod",
    "jazzcash",
    "bankTransfer"
  ],
  "currency": "PKR"
}
```

### GET /tracking TRACKING_UNAVAILABLE

```json
{
  "error": {
    "code": "TRACKING_UNAVAILABLE",
    "message": "Tracking unavailable. Please try again later."
  }
}
```

### GET /tracking NOT_FOUND

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Tracking not found."
  }
}
```

### GET /home

```json
{
  "banners": [
    {
      "id": "6ac2c71efdf15f953bf2aa9a",
      "title": "Local Verify Banner",
      "subtitle": "Fake data only",
      "image": "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg",
      "link": "/categories/lights",
      "cta": "Shop",
      "isActive": true
    }
  ],
  "hotDeals": {
    "title": "Hot Deals",
    "subtitle": "Local verify deals",
    "products": [
      {
        "id": "6ac2c71efdf15f953bf2aa70",
        "name": "Honda Civic Body Kit D1",
        "slug": "honda-civic-body-kit-d1",
        "articleNo": "",
        "shortDescription": "",
        "image": "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg",
        "images": [
          "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg"
        ],
        "media": {
          "images": [
            {
              "url": "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg",
              "isMain": true,
              "altText": "Honda Civic Body Kit D1"
            }
          ]
        },
        "price": 39999,
        "regularPrice": 45000,
        "salePrice": 39999,
        "compareAt": 45000,
        "saleSchedule": null,
        "isOnSale": true,
        "featured": true,
        "newArrival": false,
        "brand": "CrazzyCars.pk",
        "sku": "",
        "gtin": "",
        "mpn": "",
        "codEnabled": false,
        "isBulky": false,
        "advancePercentRequired": 0,
        "createdAt": null,
        "categories": [
          {
            "id": "6ac2c71efdf15f953bf2aa68",
            "name": "Body Kits & Extensions",
            "slug": "body-kits-extensions"
          }
        ],
        "tags": [],
        "inStock": true,
        "stock": 7,
        "quantity": 7,
        "quantityAvailable": 7,
        "inventory": {
          "trackInventory": true,
          "quantity": 7,
          "allowBackorder": false,
          "sku": ""
        },
        "requiresOptions": false,
        "rating": 0,
        "averageRating": 0,
        "ratingAverage": 0,
        "reviewCount": 0,
        "totalReviews": 0,
        "numReviews": 0
      },
      {
        "id": "6ac2c71efdf15f953bf2aa76",
        "name": "LED Headlight Bulb H4",
        "slug": "led-headlight-bulb-h4",
        "articleNo": "",
        "shortDescription": "",
        "image": "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg",
        "images": [
          "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg"
        ],
        "media": {
          "images": [
            {
              "url": "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg",
              "isMain": true,
              "altText": "LED Headlight Bulb H4"
            }
          ]
        },
        "price": 2499,
        "regularPrice": 2999,
        "salePrice": 2499,
        "compareAt": 2999,
        "saleSchedule": null,
        "isOnSale": true,
        "featured": true,
        "newArrival": false,
        "brand": "CrazzyCars.pk",
        "sku": "",
        "gtin": "",
        "mpn": "",
        "codEnabled": true,
        "isBulky": false,
        "advancePercentRequired": 0,
        "createdAt": null,
        "categories": [
          {
            "id": "6ac2c71efdf15f953bf2aa65",
            "name": "Lights",
            "slug": "lights"
          }
        ],
        "tags": [],
        "inStock": true,
        "stock": 16,
        "quantity": 16,
        "quantityAvailable": 16,
        "inventory": {
          "trackInventory": true,
          "quantity": 16,
          "allowBackorder": false,
          "sku": ""
        },
        "requiresOptions": false,
        "rating": 0,
        "averageRating": 0,
        "ratingAverage": 0,
        "reviewCount": 0,
        "totalReviews": 0,
        "numReviews": 0
      },
      {
        "id": "6ac2c71efdf15f953bf2aa72",
        "name": "Trunk Lip Spoiler ABS",
        "slug": "trunk-lip-spoiler-abs",
        "articleNo": "",
        "shortDescription": "",
        "image": "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg",
        "images": [
          "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg"
        ],
        "media": {
          "images": [
            {
              "url": "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg",
              "isMain": true,
              "altText": "Trunk Lip Spoiler ABS"
            }
          ]
        },
        "price": 4499,
        "regularPrice": 5500,
        "salePrice": 4499,
        "compareAt": 5500,
        "saleSchedule": null,
        "isOnSale": true,
        "featured": false,
        "newArrival": false,
        "brand": "CrazzyCars.pk",
        "sku": "",
        "gtin": "",
        "mpn": "",
        "codEnabled": true,
        "isBulky": false,
        "advancePercentRequired": 0,
        "createdAt": null,
        "categories": [
          {
            "id": "6ac2c71efdf15f953bf2aa66",
            "name": "Exterior",
            "slug": "exterior"
          }
        ],
        "tags": [],
        "inStock": true,
        "stock": 12,
        "quantity": 12,
        "quantityAvailable": 12,
        "inventory": {
          "trackInventory": true,
          "quantity": 12,
          "allowBackorder": false,
          "sku": ""
        },
        "requiresOptions": false,
        "rating": 0,
        "averageRating": 0,
        "ratingAverage": 0,
        "reviewCount": 0,
        "totalReviews": 0,
        "numReviews": 0
      },
      {
        "id": "6ac2c71efdf15f953bf2aa73",
        "name": "Side Mirror LED Cover",
        "slug": "side-mirror-led-cover",
        "articleNo": "",
        "shortDescription": "",
        "image": "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg",
        "images": [
          "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg"
        ],
        "media": {
          "images": [
            {
              "url": "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg",
              "isMain": true,
              "altText": "Side Mirror LED Cover"
            }
          ]
        },
        "price": 2999,
        "regularPrice": 3499,
        "salePrice": 2999,
        "compareAt": 3499,
        "saleSchedule": null,
        "isOnSale": true,
        "featured": true,
        "newArrival": false,
        "brand": "CrazzyCars.pk",
        "sku": "",
        "gtin": "",
        "mpn": "",
        "codEnabled": true,
        "isBulky": false,
        "advancePercentRequired": 0,
        "createdAt": null,
        "categories": [
          {
            "id": "6ac2c71efdf15f953bf2aa6a",
            "name": "Mirrors",
            "slug": "mirrors"
          },
          {
            "id": "6ac2c71efdf15f953bf2aa66",
            "name": "Exterior",
            "slug": "exterior"
          }
        ],
        "tags": [],
        "inStock": true,
        "stock": 40,
        "quantity": 40,
        "quantityAvailable": 40,
        "inventory": {
          "trackInventory": true,
          "quantity": 40,
          "allowBackorder": false,
          "sku": ""
        },
        "requiresOptions": false,
        "rating": 0,
        "averageRating": 0,
        "ratingAverage": 0,
        "reviewCount": 0,
        "totalReviews": 0,
        "numReviews": 0
      },
      {
        "id": "6ac2c71efdf15f953bf2aa77",
        "name": "LED Tail Light Strip",
        "slug": "led-tail-light-strip",
        "articleNo": "",
        "shortDescription": "",
        "image": "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg",
        "images": [
          "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg"
        ],
        "media": {
          "images": [
            {
              "url": "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg",
              "isMain": true,
              "altText": "LED Tail Light Strip"
            }
          ]
        },
        "price": 1999,
        "regularPrice": 2499,
        "salePrice": 1999,
        "compareAt": 2499,
        "saleSchedule": null,
        "isOnSale": true,
        "featured": false,
        "newArrival": false,
        "brand": "CrazzyCars.pk",
        "sku": "",
        "gtin": "",
        "mpn": "",
        "codEnabled": true,
        "isBulky": false,
        "advancePercentRequired": 0,
        "createdAt": null,
        "categories": [
          {
            "id": "6ac2c71efdf15f953bf2aa65",
            "name": "Lights",
            "slug": "lights"
          }
        ],
        "tags": [],
        "inStock": true,
        "stock": 22,
        "quantity": 22,
        "quantityAvailable": 22,
        "inventory": {
          "trackInventory": true,
          "quantity": 22,
          "allowBackorder": false,
          "sku": ""
        },
        "requiresOptions": false,
        "rating": 0,
        "averageRating": 0,
        "ratingAverage": 0,
        "reviewCount": 0,
        "totalReviews": 0,
        "numReviews": 0
      },
      {
        "id": "6ac2c71efdf15f953bf2aa78",
        "name": "DRL Fog Lamp Set",
        "slug": "drl-fog-lamp-set",
        "articleNo": "",
        "shortDescription": "",
        "image": "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg",
        "images": [
          "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg"
        ],
        "media": {
          "images": [
            {
              "url": "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg",
              "isMain": true,
              "altText": "DRL Fog Lamp Set"
            }
          ]
        },
        "price": 3200,
        "regularPrice": 3700,
        "salePrice": 3200,
        "compareAt": 3700,
        "saleSchedule": null,
        "isOnSale": true,
        "featured": true,
        "newArrival": false,
        "brand": "CrazzyCars.pk",
        "sku": "",
        "gtin": "",
        "mpn": "",
        "codEnabled": true,
        "isBulky": false,
        "advancePercentRequired": 0,
        "createdAt": null,
        "categories": [
          {
            "id": "6ac2c71efdf15f953bf2aa65",
            "name": "Lights",
            "slug": "lights"
          }
        ],
        "tags": [],
        "inStock": true,
        "stock": 23,
        "quantity": 23,
        "quantityAvailable": 23,
        "inventory": {
          "trackInventory": true,
          "quantity": 23,
          "allowBackorder": false,
          "sku": ""
        },
        "requiresOptions": false,
        "rating": 0,
        "averageRating": 0,
        "ratingAverage": 0,
        "reviewCount": 0,
        "totalReviews": 0,
        "numReviews": 0
      },
      {
        "id": "6ac2c71efdf15f953bf2aa79",
        "name": "Carbon Steering Cover",
        "slug": "carbon-steering-cover",
        "articleNo": "",
        "shortDescription": "",
        "image": "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg",
        "images": [
          "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg"
        ],
        "media": {
          "images": [
            {
              "url": "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg",
              "isMain": true,
              "altText": "Carbon Steering Cover"
            }
          ]
        },
        "price": 2800,
        "regularPrice": 3300,
        "salePrice": 2800,
        "compareAt": 3300,
        "saleSchedule": null,
        "isOnSale": true,
        "featured": true,
        "newArrival": false,
        "brand": "CrazzyCars.pk",
        "sku": "",
        "gtin": "",
        "mpn": "",
        "codEnabled": true,
        "isBulky": false,
        "advancePercentRequired": 0,
        "createdAt": null,
        "categories": [
          {
            "id": "6ac2c71efdf15f953bf2aa67",
            "name": "Interior",
            "slug": "interior"
          }
        ],
        "tags": [],
        "inStock": true,
        "stock": 24,
        "quantity": 24,
        "quantityAvailable": 24,
        "inventory": {
          "trackInventory": true,
          "quantity": 24,
          "allowBackorder": false,
          "sku": ""
        },
        "requiresOptions": false,
        "rating": 0,
        "averageRating": 0,
        "ratingAverage": 0,
        "reviewCount": 0,
        "totalReviews": 0,
        "numReviews": 0
      },
      {
        "id": "6ac2c71efdf15f953bf2aa7a",
        "name": "Gear Knob Carbon Style",
        "slug": "gear-knob-carbon-style",
        "articleNo": "",
        "shortDescription": "",
        "image": "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg",
        "images": [
          "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg"
        ],
        "media": {
          "images": [
            {
              "url": "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg",
              "isMain": true,
              "altText": "Gear Knob Carbon Style"
            }
          ]
        },
        "price": 999,
        "regularPrice": 1499,
        "salePrice": 999,
        "compareAt": 1499,
        "saleSchedule": null,
        "isOnSale": true,
        "featured": false,
        "newArrival": false,
        "brand": "CrazzyCars.pk",
        "sku": "",
        "gtin": "",
        "mpn": "",
        "codEnabled": true,
        "isBulky": false,
        "advancePercentRequired": 0,
        "createdAt": null,
        "categories": [
          {
            "id": "6ac2c71efdf15f953bf2aa67",
            "name": "Interior",
            "slug": "interior"
          }
        ],
        "tags": [],
        "inStock": true,
        "stock": 15,
        "quantity": 15,
        "quantityAvailable": 15,
        "inventory": {
          "trackInventory": true,
          "quantity": 15,
          "allowBackorder": false,
          "sku": ""
        },
        "requiresOptions": false,
        "rating": 0,
        "averageRating": 0,
        "ratingAverage": 0,
        "reviewCount": 0,
        "totalReviews": 0,
        "numReviews": 0
      },
      {
        "id": "6ac2c71efdf15f953bf2aa7c",
        "name": "Front Grille Mesh",
        "slug": "front-grille-mesh",
        "articleNo": "",
        "shortDescription": "",
        "image": "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg",
        "images": [
          "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg"
        ],
        "media": {
          "images": [
            {
              "url": "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg",
              "isMain": true,
              "altText": "Front Grille Mesh"
            }
          ]
        },
        "price": 4500,
        "regularPrice": 5000,
        "salePrice": 4500,
        "compareAt": 5000,
        "saleSchedule": null,
        "isOnSale": true,
        "featured": true,
        "newArrival": false,
        "brand": "CrazzyCars.pk",
        "sku": "",
        "gtin": "",
        "mpn": "",
        "codEnabled": true,
        "isBulky": false,
        "advancePercentRequired": 0,
        "createdAt": null,
        "categories": [
          {
            "id": "6ac2c71efdf15f953bf2aa66",
            "name": "Exterior",
            "slug": "exterior"
          }
        ],
        "tags": [],
        "inStock": true,
        "stock": 17,
        "quantity": 17,
        "quantityAvailable": 17,
        "inventory": {
          "trackInventory": true,
          "quantity": 17,
          "allowBackorder": false,
          "sku": ""
        },
        "requiresOptions": false,
        "rating": 0,
        "averageRating": 0,
        "ratingAverage": 0,
        "reviewCount": 0,
        "totalReviews": 0,
        "numReviews": 0
      },
      {
        "id": "6ac2c71efdf15f953bf2aa81",
        "name": "Seat Cover Premium",
        "slug": "seat-cover-premium",
        "articleNo": "",
        "shortDescription": "",
        "image": "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg",
        "images": [
          "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg"
        ],
        "media": {
          "images": [
            {
              "url": "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg",
              "isMain": true,
              "altText": "Seat Cover Premium"
            }
          ]
        },
        "price": 8900,
        "regularPrice": 9400,
        "salePrice": 8900,
        "compareAt": 9400,
        "saleSchedule": null,
        "isOnSale": true,
        "featured": true,
        "newArrival": false,
        "brand": "CrazzyCars.pk",
        "sku": "",
        "gtin": "",
        "mpn": "",
        "codEnabled": true,
        "isBulky": false,
        "advancePercentRequired": 0,
        "createdAt": null,
        "categories": [
          {
            "id": "6ac2c71efdf15f953bf2aa67",
            "name": "Interior",
            "slug": "interior"
          }
        ],
        "tags": [],
        "inStock": true,
        "stock": 22,
        "quantity": 22,
        "quantityAvailable": 22,
        "inventory": {
          "trackInventory": true,
          "quantity": 22,
          "allowBackorder": false,
          "sku": ""
        },
        "requiresOptions": false,
        "rating": 0,
        "averageRating": 0,
        "ratingAverage": 0,
        "reviewCount": 0,
        "totalReviews": 0,
        "numReviews": 0
      },
      {
        "id": "6ac2c71efdf15f953bf2aa84",
        "name": "Side Skirt Extension",
        "slug": "side-skirt-extension",
        "articleNo": "",
        "shortDescription": "",
        "image": "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg",
        "images": [
          "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg"
        ],
        "media": {
          "images": [
            {
              "url": "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg",
              "isMain": true,
              "altText": "Side Skirt Extension"
            }
          ]
        },
        "price": 7200,
        "regularPrice": 7700,
        "salePrice": 7200,
        "compareAt": 7700,
        "saleSchedule": null,
        "isOnSale": true,
        "featured": true,
        "newArrival": false,
        "brand": "CrazzyCars.pk",
        "sku": "",
        "gtin": "",
        "mpn": "",
        "codEnabled": true,
        "isBulky": false,
        "advancePercentRequired": 0,
        "createdAt": null,
        "categories": [
          {
            "id": "6ac2c71efdf15f953bf2aa66",
            "name": "Exterior",
            "slug": "exterior"
          }
        ],
        "tags": [],
        "inStock": true,
        "stock": 15,
        "quantity": 15,
        "quantityAvailable": 15,
        "inventory": {
          "trackInventory": true,
          "quantity": 15,
          "allowBackorder": false,
          "sku": ""
        },
        "requiresOptions": false,
        "rating": 0,
        "averageRating": 0,
        "ratingAverage": 0,
        "reviewCount": 0,
        "totalReviews": 0,
        "numReviews": 0
      },
      {
        "id": "6ac2c71efdf15f953bf2aa95",
        "name": "Key Fob Shell Carbon",
        "slug": "key-fob-shell-carbon",
        "articleNo": "",
        "shortDescription": "",
        "image": "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg",
        "images": [
          "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg"
        ],
        "media": {
          "images": [
            {
              "url": "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg",
              "isMain": true,
              "altText": "Key Fob Shell Carbon"
            }
          ]
        },
        "price": 1200,
        "regularPrice": 1700,
        "salePrice": 1200,
        "compareAt": 1700,
        "saleSchedule": null,
        "isOnSale": true,
        "featured": true,
        "newArrival": false,
        "brand": "CrazzyCars.pk",
        "sku": "",
        "gtin": "",
        "mpn": "",
        "codEnabled": true,
        "isBulky": false,
        "advancePercentRequired": 0,
        "createdAt": null,
        "categories": [
          {
            "id": "6ac2c71efdf15f953bf2aa67",
            "name": "Interior",
            "slug": "interior"
          }
        ],
        "tags": [],
        "inStock": true,
        "stock": 22,
        "quantity": 22,
        "quantityAvailable": 22,
        "inventory": {
          "trackInventory": true,
          "quantity": 22,
          "allowBackorder": false,
          "sku": ""
        },
        "requiresOptions": false,
        "rating": 0,
        "averageRating": 0,
        "ratingAverage": 0,
        "reviewCount": 0,
        "totalReviews": 0,
        "numReviews": 0
      }
    ],
    "flashSaleEndTime": "2026-10-11T21:37:34.479Z"
  },
  "bestSellers": {
    "title": "Best Sellers",
    "products": [
      {
        "id": "6ac2c71efdf15f953bf2aa70",
        "name": "Honda Civic Body Kit D1",
        "slug": "honda-civic-body-kit-d1",
        "articleNo": "LV-BK-D1",
        "shortDescription": "Honda Civic Body Kit D1 — local verify SKU",
        "image": "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg",
        "images": [
          "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg"
        ],
        "media": {
          "images": [
            {
              "url": "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg",
              "isMain": true,
              "altText": "Honda Civic Body Kit D1"
            }
          ]
        },
        "price": 39999,
        "regularPrice": 45000,
        "salePrice": 39999,
        "compareAt": 45000,
        "saleSchedule": null,
        "isOnSale": true,
        "featured": true,
        "newArrival": false,
        "brand": "CrazzyCars.pk",
        "sku": "LV-BK-D1",
        "gtin": "",
        "mpn": "",
        "codEnabled": false,
        "isBulky": false,
        "advancePercentRequired": 0,
        "createdAt": null,
        "categories": [
          {
            "id": "6ac2c71efdf15f953bf2aa68",
            "name": "Body Kits & Extensions",
            "slug": "body-kits-extensions"
          }
        ],
        "tags": [],
        "inStock": true,
        "stock": 7,
        "quantity": 7,
        "quantityAvailable": 7,
        "inventory": {
          "trackInventory": true,
          "quantity": 7,
          "allowBackorder": false,
          "sku": "LV-BK-D1"
        },
        "requiresOptions": false,
        "rating": 0,
        "averageRating": 0,
        "ratingAverage": 0,
        "reviewCount": 0,
        "totalReviews": 0,
        "numReviews": 0
      },
      {
        "id": "6ac2c71efdf15f953bf2aa76",
        "name": "LED Headlight Bulb H4",
        "slug": "led-headlight-bulb-h4",
        "articleNo": "LV-LED-HEADLIGHT-BULB-H4",
        "shortDescription": "LED Headlight Bulb H4 — local verify SKU",
        "image": "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg",
        "images": [
          "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg"
        ],
        "media": {
          "images": [
            {
              "url": "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg",
              "isMain": true,
              "altText": "LED Headlight Bulb H4"
            }
          ]
        },
        "price": 2499,
        "regularPrice": 2999,
        "salePrice": 2499,
        "compareAt": 2999,
        "saleSchedule": null,
        "isOnSale": true,
        "featured": true,
        "newArrival": false,
        "brand": "CrazzyCars.pk",
        "sku": "LV-LED-HEADLIGHT-BULB-H4",
        "gtin": "",
        "mpn": "",
        "codEnabled": true,
        "isBulky": false,
        "advancePercentRequired": 0,
        "createdAt": null,
        "categories": [
          {
            "id": "6ac2c71efdf15f953bf2aa65",
            "name": "Lights",
            "slug": "lights"
          }
        ],
        "tags": [],
        "inStock": true,
        "stock": 16,
        "quantity": 16,
        "quantityAvailable": 16,
        "inventory": {
          "trackInventory": true,
          "quantity": 16,
          "allowBackorder": false,
          "sku": "LV-LED-HEADLIGHT-BULB-H4"
        },
        "requiresOptions": false,
        "rating": 0,
        "averageRating": 0,
        "ratingAverage": 0,
        "reviewCount": 0,
        "totalReviews": 0,
        "numReviews": 0
      },
      {
        "id": "6ac2c71efdf15f953bf2aa73",
        "name": "Side Mirror LED Cover",
        "slug": "side-mirror-led-cover",
        "articleNo": "LV-MIR-1",
        "shortDescription": "Side Mirror LED Cover — local verify SKU",
        "image": "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg",
        "images": [
          "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg"
        ],
        "media": {
          "images": [
            {
              "url": "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg",
              "isMain": true,
              "altText": "Side Mirror LED Cover"
            }
          ]
        },
        "price": 2999,
        "regularPrice": 3499,
        "salePrice": 2999,
        "compareAt": 3499,
        "saleSchedule": null,
        "isOnSale": true,
        "featured": true,
        "newArrival": false,
        "brand": "CrazzyCars.pk",
        "sku": "LV-MIR-1",
        "gtin": "",
        "mpn": "",
        "codEnabled": true,
        "isBulky": false,
        "advancePercentRequired": 0,
        "createdAt": null,
        "categories": [
          {
            "id": "6ac2c71efdf15f953bf2aa6a",
            "name": "Mirrors",
            "slug": "mirrors"
          },
          {
            "id": "6ac2c71efdf15f953bf2aa66",
            "name": "Exterior",
            "slug": "exterior"
          }
        ],
        "tags": [],
        "inStock": true,
        "stock": 40,
        "quantity": 40,
        "quantityAvailable": 40,
        "inventory": {
          "trackInventory": true,
          "quantity": 40,
          "allowBackorder": false,
          "sku": "LV-MIR-1"
        },
        "requiresOptions": false,
        "rating": 0,
        "averageRating": 0,
        "ratingAverage": 0,
        "reviewCount": 0,
        "totalReviews": 0,
        "numReviews": 0
      },
      {
        "id": "6ac2c71efdf15f953bf2aa78",
        "name": "DRL Fog Lamp Set",
        "slug": "drl-fog-lamp-set",
        "articleNo": "LV-DRL-FOG-LAMP-SET",
        "shortDescription": "DRL Fog Lamp Set — local verify SKU",
        "image": "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg",
        "images": [
          "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg"
        ],
        "media": {
          "images": [
            {
              "url": "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg",
              "isMain": true,
              "altText": "DRL Fog Lamp Set"
            }
          ]
        },
        "price": 3200,
        "regularPrice": 3700,
        "salePrice": 3200,
        "compareAt": 3700,
        "saleSchedule": null,
        "isOnSale": true,
        "featured": true,
        "newArrival": false,
        "brand": "CrazzyCars.pk",
        "sku": "LV-DRL-FOG-LAMP-SET",
        "gtin": "",
        "mpn": "",
        "codEnabled": true,
        "isBulky": false,
        "advancePercentRequired": 0,
        "createdAt": null,
        "categories": [
          {
            "id": "6ac2c71efdf15f953bf2aa65",
            "name": "Lights",
            "slug": "lights"
          }
        ],
        "tags": [],
        "inStock": true,
        "stock": 23,
        "quantity": 23,
        "quantityAvailable": 23,
        "inventory": {
          "trackInventory": true,
          "quantity": 23,
          "allowBackorder": false,
          "sku": "LV-DRL-FOG-LAMP-SET"
        },
        "requiresOptions": false,
        "rating": 0,
        "averageRating": 0,
        "ratingAverage": 0,
        "reviewCount": 0,
        "totalReviews": 0,
        "numReviews": 0
      },
      {
        "id": "6ac2c71efdf15f953bf2aa79",
        "name": "Carbon Steering Cover",
        "slug": "carbon-steering-cover",
        "articleNo": "LV-CARBON-STEERING-COVER",
        "shortDescription": "Carbon Steering Cover — local verify SKU",
        "image": "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg",
        "images": [
          "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg"
        ],
        "media": {
          "images": [
            {
              "url": "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg",
              "isMain": true,
              "altText": "Carbon Steering Cover"
            }
          ]
        },
        "price": 2800,
        "regularPrice": 3300,
        "salePrice": 2800,
        "compareAt": 3300,
        "saleSchedule": null,
        "isOnSale": true,
        "featured": true,
        "newArrival": false,
        "brand": "CrazzyCars.pk",
        "sku": "LV-CARBON-STEERING-COVER",
        "gtin": "",
        "mpn": "",
        "codEnabled": true,
        "isBulky": false,
        "advancePercentRequired": 0,
        "createdAt": null,
        "categories": [
          {
            "id": "6ac2c71efdf15f953bf2aa67",
            "name": "Interior",
            "slug": "interior"
          }
        ],
        "tags": [],
        "inStock": true,
        "stock": 24,
        "quantity": 24,
        "quantityAvailable": 24,
        "inventory": {
          "trackInventory": true,
          "quantity": 24,
          "allowBackorder": false,
          "sku": "LV-CARBON-STEERING-COVER"
        },
        "requiresOptions": false,
        "rating": 0,
        "averageRating": 0,
        "ratingAverage": 0,
        "reviewCount": 0,
        "totalReviews": 0,
        "numReviews": 0
      },
      {
        "id": "6ac2c71efdf15f953bf2aa7c",
        "name": "Front Grille Mesh",
        "slug": "front-grille-mesh",
        "articleNo": "LV-FRONT-GRILLE-MESH",
        "shortDescription": "Front Grille Mesh — local verify SKU",
        "image": "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg",
        "images": [
          "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg"
        ],
        "media": {
          "images": [
            {
              "url": "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg",
              "isMain": true,
              "altText": "Front Grille Mesh"
            }
          ]
        },
        "price": 4500,
        "regularPrice": 5000,
        "salePrice": 4500,
        "compareAt": 5000,
        "saleSchedule": null,
        "isOnSale": true,
        "featured": true,
        "newArrival": false,
        "brand": "CrazzyCars.pk",
        "sku": "LV-FRONT-GRILLE-MESH",
        "gtin": "",
        "mpn": "",
        "codEnabled": true,
        "isBulky": false,
        "advancePercentRequired": 0,
        "createdAt": null,
        "categories": [
          {
            "id": "6ac2c71efdf15f953bf2aa66",
            "name": "Exterior",
            "slug": "exterior"
          }
        ],
        "tags": [],
        "inStock": true,
        "stock": 17,
        "quantity": 17,
        "quantityAvailable": 17,
        "inventory": {
          "trackInventory": true,
          "quantity": 17,
          "allowBackorder": false,
          "sku": "LV-FRONT-GRILLE-MESH"
        },
        "requiresOptions": false,
        "rating": 0,
        "averageRating": 0,
        "ratingAverage": 0,
        "reviewCount": 0,
        "totalReviews": 0,
        "numReviews": 0
      },
      {
        "id": "6ac2c71efdf15f953bf2aa81",
        "name": "Seat Cover Premium",
        "slug": "seat-cover-premium",
        "articleNo": "LV-SEAT-COVER-PREMIUM",
        "shortDescription": "Seat Cover Premium — local verify SKU",
        "image": "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg",
        "images": [
          "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg"
        ],
        "media": {
          "images": [
            {
              "url": "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg",
              "isMain": true,
              "altText": "Seat Cover Premium"
            }
          ]
        },
        "price": 8900,
        "regularPrice": 9400,
        "salePrice": 8900,
        "compareAt": 9400,
        "saleSchedule": null,
        "isOnSale": true,
        "featured": true,
        "newArrival": false,
        "brand": "CrazzyCars.pk",
        "sku": "LV-SEAT-COVER-PREMIUM",
        "gtin": "",
        "mpn": "",
        "codEnabled": true,
        "isBulky": false,
        "advancePercentRequired": 0,
        "createdAt": null,
        "categories": [
          {
            "id": "6ac2c71efdf15f953bf2aa67",
            "name": "Interior",
            "slug": "interior"
          }
        ],
        "tags": [],
        "inStock": true,
        "stock": 22,
        "quantity": 22,
        "quantityAvailable": 22,
        "inventory": {
          "trackInventory": true,
          "quantity": 22,
          "allowBackorder": false,
          "sku": "LV-SEAT-COVER-PREMIUM"
        },
        "requiresOptions": false,
        "rating": 0,
        "averageRating": 0,
        "ratingAverage": 0,
        "reviewCount": 0,
        "totalReviews": 0,
        "numReviews": 0
      },
      {
        "id": "6ac2c71efdf15f953bf2aa84",
        "name": "Side Skirt Extension",
        "slug": "side-skirt-extension",
        "articleNo": "LV-SIDE-SKIRT-EXTENSION",
        "shortDescription": "Side Skirt Extension — local verify SKU",
        "image": "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg",
        "images": [
          "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg"
        ],
        "media": {
          "images": [
            {
              "url": "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg",
              "isMain": true,
              "altText": "Side Skirt Extension"
            }
          ]
        },
        "price": 7200,
        "regularPrice": 7700,
        "salePrice": 7200,
        "compareAt": 7700,
        "saleSchedule": null,
        "isOnSale": true,
        "featured": true,
        "newArrival": false,
        "brand": "CrazzyCars.pk",
        "sku": "LV-SIDE-SKIRT-EXTENSION",
        "gtin": "",
        "mpn": "",
        "codEnabled": true,
        "isBulky": false,
        "advancePercentRequired": 0,
        "createdAt": null,
        "categories": [
          {
            "id": "6ac2c71efdf15f953bf2aa66",
            "name": "Exterior",
            "slug": "exterior"
          }
        ],
        "tags": [],
        "inStock": true,
        "stock": 15,
        "quantity": 15,
        "quantityAvailable": 15,
        "inventory": {
          "trackInventory": true,
          "quantity": 15,
          "allowBackorder": false,
          "sku": "LV-SIDE-SKIRT-EXTENSION"
        },
        "requiresOptions": false,
        "rating": 0,
        "averageRating": 0,
        "ratingAverage": 0,
        "reviewCount": 0,
        "totalReviews": 0,
        "numReviews": 0
      },
      {
        "id": "6ac2c71efdf15f953bf2aa95",
        "name": "Key Fob Shell Carbon",
        "slug": "key-fob-shell-carbon",
        "articleNo": "LV-KEY-FOB-SHELL-CARBON",
        "shortDescription": "Key Fob Shell Carbon — local verify SKU",
        "image": "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg",
        "images": [
          "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg"
        ],
        "media": {
          "images": [
            {
              "url": "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg",
              "isMain": true,
              "altText": "Key Fob Shell Carbon"
            }
          ]
        },
        "price": 1200,
        "regularPrice": 1700,
        "salePrice": 1200,
        "compareAt": 1700,
        "saleSchedule": null,
        "isOnSale": true,
        "featured": true,
        "newArrival": false,
        "brand": "CrazzyCars.pk",
        "sku": "LV-KEY-FOB-SHELL-CARBON",
        "gtin": "",
        "mpn": "",
        "codEnabled": true,
        "isBulky": false,
        "advancePercentRequired": 0,
        "createdAt": null,
        "categories": [
          {
            "id": "6ac2c71efdf15f953bf2aa67",
            "name": "Interior",
            "slug": "interior"
          }
        ],
        "tags": [],
        "inStock": true,
        "stock": 22,
        "quantity": 22,
        "quantityAvailable": 22,
        "inventory": {
          "trackInventory": true,
          "quantity": 22,
          "allowBackorder": false,
          "sku": "LV-KEY-FOB-SHELL-CARBON"
        },
        "requiresOptions": false,
        "rating": 0,
        "averageRating": 0,
        "ratingAverage": 0,
        "reviewCount": 0,
        "totalReviews": 0,
        "numReviews": 0
      }
    ]
  },
  "brands": {
    "title": "Trusted Brands",
    "items": [
      {
        "name": "Honda",
        "slug": "honda",
        "isActive": true,
        "order": 0
      },
      {
        "name": "Toyota",
        "slug": "toyota",
        "isActive": true,
        "order": 1
      },
      {
        "name": "Suzuki",
        "slug": "suzuki",
        "isActive": true,
        "order": 2
      }
    ]
  },
  "flashSaleEndTime": "2026-10-11T21:37:34.479Z",
  "featured": [
    {
      "id": "6ac2c71efdf15f953bf2aa70",
      "name": "Honda Civic Body Kit D1",
      "slug": "honda-civic-body-kit-d1",
      "articleNo": "LV-BK-D1",
      "shortDescription": "Honda Civic Body Kit D1 — local verify SKU",
      "image": "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg",
      "images": [
        "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg"
      ],
      "media": {
        "images": [
          {
            "url": "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg",
            "isMain": true,
            "altText": "Honda Civic Body Kit D1"
          }
        ]
      },
      "price": 39999,
      "regularPrice": 45000,
      "salePrice": 39999,
      "compareAt": 45000,
      "saleSchedule": null,
      "isOnSale": true,
      "featured": true,
      "newArrival": false,
      "brand": "CrazzyCars.pk",
      "sku": "LV-BK-D1",
      "gtin": "",
      "mpn": "",
      "codEnabled": false,
      "isBulky": false,
      "advancePercentRequired": 0,
      "createdAt": null,
      "categories": [
        {
          "id": "6ac2c71efdf15f953bf2aa68",
          "name": "Body Kits & Extensions",
          "slug": "body-kits-extensions"
        }
      ],
      "tags": [],
      "inStock": true,
      "stock": 7,
      "quantity": 7,
      "quantityAvailable": 7,
      "inventory": {
        "trackInventory": true,
        "quantity": 7,
        "allowBackorder": false,
        "sku": "LV-BK-D1"
      },
      "requiresOptions": false,
      "rating": 0,
      "averageRating": 0,
      "ratingAverage": 0,
      "reviewCount": 0,
      "totalReviews": 0,
      "numReviews": 0
    },
    {
      "id": "6ac2c71efdf15f953bf2aa76",
      "name": "LED Headlight Bulb H4",
      "slug": "led-headlight-bulb-h4",
      "articleNo": "LV-LED-HEADLIGHT-BULB-H4",
      "shortDescription": "LED Headlight Bulb H4 — local verify SKU",
      "image": "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg",
      "images": [
        "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg"
      ],
      "media": {
        "images": [
          {
            "url": "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg",
            "isMain": true,
            "altText": "LED Headlight Bulb H4"
          }
        ]
      },
      "price": 2499,
      "regularPrice": 2999,
      "salePrice": 2499,
      "compareAt": 2999,
      "saleSchedule": null,
      "isOnSale": true,
      "featured": true,
      "newArrival": false,
      "brand": "CrazzyCars.pk",
      "sku": "LV-LED-HEADLIGHT-BULB-H4",
      "gtin": "",
      "mpn": "",
      "codEnabled": true,
      "isBulky": false,
      "advancePercentRequired": 0,
      "createdAt": null,
      "categories": [
        {
          "id": "6ac2c71efdf15f953bf2aa65",
          "name": "Lights",
          "slug": "lights"
        }
      ],
      "tags": [],
      "inStock": true,
      "stock": 16,
      "quantity": 16,
      "quantityAvailable": 16,
      "inventory": {
        "trackInventory": true,
        "quantity": 16,
        "allowBackorder": false,
        "sku": "LV-LED-HEADLIGHT-BULB-H4"
      },
      "requiresOptions": false,
      "rating": 0,
      "averageRating": 0,
      "ratingAverage": 0,
      "reviewCount": 0,
      "totalReviews": 0,
      "numReviews": 0
    },
    {
      "id": "6ac2c71efdf15f953bf2aa73",
      "name": "Side Mirror LED Cover",
      "slug": "side-mirror-led-cover",
      "articleNo": "LV-MIR-1",
      "shortDescription": "Side Mirror LED Cover — local verify SKU",
      "image": "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg",
      "images": [
        "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg"
      ],
      "media": {
        "images": [
          {
            "url": "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg",
            "isMain": true,
            "altText": "Side Mirror LED Cover"
          }
        ]
      },
      "price": 2999,
      "regularPrice": 3499,
      "salePrice": 2999,
      "compareAt": 3499,
      "saleSchedule": null,
      "isOnSale": true,
      "featured": true,
      "newArrival": false,
      "brand": "CrazzyCars.pk",
      "sku": "LV-MIR-1",
      "gtin": "",
      "mpn": "",
      "codEnabled": true,
      "isBulky": false,
      "advancePercentRequired": 0,
      "createdAt": null,
      "categories": [
        {
          "id": "6ac2c71efdf15f953bf2aa6a",
          "name": "Mirrors",
          "slug": "mirrors"
        },
        {
          "id": "6ac2c71efdf15f953bf2aa66",
          "name": "Exterior",
          "slug": "exterior"
        }
      ],
      "tags": [],
      "inStock": true,
      "stock": 40,
      "quantity": 40,
      "quantityAvailable": 40,
      "inventory": {
        "trackInventory": true,
        "quantity": 40,
        "allowBackorder": false,
        "sku": "LV-MIR-1"
      },
      "requiresOptions": false,
      "rating": 0,
      "averageRating": 0,
      "ratingAverage": 0,
      "reviewCount": 0,
      "totalReviews": 0,
      "numReviews": 0
    },
    {
      "id": "6ac2c71efdf15f953bf2aa78",
      "name": "DRL Fog Lamp Set",
      "slug": "drl-fog-lamp-set",
      "articleNo": "LV-DRL-FOG-LAMP-SET",
      "shortDescription": "DRL Fog Lamp Set — local verify SKU",
      "image": "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg",
      "images": [
        "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg"
      ],
      "media": {
        "images": [
          {
            "url": "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg",
            "isMain": true,
            "altText": "DRL Fog Lamp Set"
          }
        ]
      },
      "price": 3200,
      "regularPrice": 3700,
      "salePrice": 3200,
      "compareAt": 3700,
      "saleSchedule": null,
      "isOnSale": true,
      "featured": true,
      "newArrival": false,
      "brand": "CrazzyCars.pk",
      "sku": "LV-DRL-FOG-LAMP-SET",
      "gtin": "",
      "mpn": "",
      "codEnabled": true,
      "isBulky": false,
      "advancePercentRequired": 0,
      "createdAt": null,
      "categories": [
        {
          "id": "6ac2c71efdf15f953bf2aa65",
          "name": "Lights",
          "slug": "lights"
        }
      ],
      "tags": [],
      "inStock": true,
      "stock": 23,
      "quantity": 23,
      "quantityAvailable": 23,
      "inventory": {
        "trackInventory": true,
        "quantity": 23,
        "allowBackorder": false,
        "sku": "LV-DRL-FOG-LAMP-SET"
      },
      "requiresOptions": false,
      "rating": 0,
      "averageRating": 0,
      "ratingAverage": 0,
      "reviewCount": 0,
      "totalReviews": 0,
      "numReviews": 0
    },
    {
      "id": "6ac2c71efdf15f953bf2aa79",
      "name": "Carbon Steering Cover",
      "slug": "carbon-steering-cover",
      "articleNo": "LV-CARBON-STEERING-COVER",
      "shortDescription": "Carbon Steering Cover — local verify SKU",
      "image": "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg",
      "images": [
        "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg"
      ],
      "media": {
        "images": [
          {
            "url": "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg",
            "isMain": true,
            "altText": "Carbon Steering Cover"
          }
        ]
      },
      "price": 2800,
      "regularPrice": 3300,
      "salePrice": 2800,
      "compareAt": 3300,
      "saleSchedule": null,
      "isOnSale": true,
      "featured": true,
      "newArrival": false,
      "brand": "CrazzyCars.pk",
      "sku": "LV-CARBON-STEERING-COVER",
      "gtin": "",
      "mpn": "",
      "codEnabled": true,
      "isBulky": false,
      "advancePercentRequired": 0,
      "createdAt": null,
      "categories": [
        {
          "id": "6ac2c71efdf15f953bf2aa67",
          "name": "Interior",
          "slug": "interior"
        }
      ],
      "tags": [],
      "inStock": true,
      "stock": 24,
      "quantity": 24,
      "quantityAvailable": 24,
      "inventory": {
        "trackInventory": true,
        "quantity": 24,
        "allowBackorder": false,
        "sku": "LV-CARBON-STEERING-COVER"
      },
      "requiresOptions": false,
      "rating": 0,
      "averageRating": 0,
      "ratingAverage": 0,
      "reviewCount": 0,
      "totalReviews": 0,
      "numReviews": 0
    },
    {
      "id": "6ac2c71efdf15f953bf2aa7c",
      "name": "Front Grille Mesh",
      "slug": "front-grille-mesh",
      "articleNo": "LV-FRONT-GRILLE-MESH",
      "shortDescription": "Front Grille Mesh — local verify SKU",
      "image": "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg",
      "images": [
        "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg"
      ],
      "media": {
        "images": [
          {
            "url": "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg",
            "isMain": true,
            "altText": "Front Grille Mesh"
          }
        ]
      },
      "price": 4500,
      "regularPrice": 5000,
      "salePrice": 4500,
      "compareAt": 5000,
      "saleSchedule": null,
      "isOnSale": true,
      "featured": true,
      "newArrival": false,
      "brand": "CrazzyCars.pk",
      "sku": "LV-FRONT-GRILLE-MESH",
      "gtin": "",
      "mpn": "",
      "codEnabled": true,
      "isBulky": false,
      "advancePercentRequired": 0,
      "createdAt": null,
      "categories": [
        {
          "id": "6ac2c71efdf15f953bf2aa66",
          "name": "Exterior",
          "slug": "exterior"
        }
      ],
      "tags": [],
      "inStock": true,
      "stock": 17,
      "quantity": 17,
      "quantityAvailable": 17,
      "inventory": {
        "trackInventory": true,
        "quantity": 17,
        "allowBackorder": false,
        "sku": "LV-FRONT-GRILLE-MESH"
      },
      "requiresOptions": false,
      "rating": 0,
      "averageRating": 0,
      "ratingAverage": 0,
      "reviewCount": 0,
      "totalReviews": 0,
      "numReviews": 0
    },
    {
      "id": "6ac2c71efdf15f953bf2aa81",
      "name": "Seat Cover Premium",
      "slug": "seat-cover-premium",
      "articleNo": "LV-SEAT-COVER-PREMIUM",
      "shortDescription": "Seat Cover Premium — local verify SKU",
      "image": "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg",
      "images": [
        "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg"
      ],
      "media": {
        "images": [
          {
            "url": "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg",
            "isMain": true,
            "altText": "Seat Cover Premium"
          }
        ]
      },
      "price": 8900,
      "regularPrice": 9400,
      "salePrice": 8900,
      "compareAt": 9400,
      "saleSchedule": null,
      "isOnSale": true,
      "featured": true,
      "newArrival": false,
      "brand": "CrazzyCars.pk",
      "sku": "LV-SEAT-COVER-PREMIUM",
      "gtin": "",
      "mpn": "",
      "codEnabled": true,
      "isBulky": false,
      "advancePercentRequired": 0,
      "createdAt": null,
      "categories": [
        {
          "id": "6ac2c71efdf15f953bf2aa67",
          "name": "Interior",
          "slug": "interior"
        }
      ],
      "tags": [],
      "inStock": true,
      "stock": 22,
      "quantity": 22,
      "quantityAvailable": 22,
      "inventory": {
        "trackInventory": true,
        "quantity": 22,
        "allowBackorder": false,
        "sku": "LV-SEAT-COVER-PREMIUM"
      },
      "requiresOptions": false,
      "rating": 0,
      "averageRating": 0,
      "ratingAverage": 0,
      "reviewCount": 0,
      "totalReviews": 0,
      "numReviews": 0
    },
    {
      "id": "6ac2c71efdf15f953bf2aa84",
      "name": "Side Skirt Extension",
      "slug": "side-skirt-extension",
      "articleNo": "LV-SIDE-SKIRT-EXTENSION",
      "shortDescription": "Side Skirt Extension — local verify SKU",
      "image": "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg",
      "images": [
        "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg"
      ],
      "media": {
        "images": [
          {
            "url": "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg",
            "isMain": true,
            "altText": "Side Skirt Extension"
          }
        ]
      },
      "price": 7200,
      "regularPrice": 7700,
      "salePrice": 7200,
      "compareAt": 7700,
      "saleSchedule": null,
      "isOnSale": true,
      "featured": true,
      "newArrival": false,
      "brand": "CrazzyCars.pk",
      "sku": "LV-SIDE-SKIRT-EXTENSION",
      "gtin": "",
      "mpn": "",
      "codEnabled": true,
      "isBulky": false,
      "advancePercentRequired": 0,
      "createdAt": null,
      "categories": [
        {
          "id": "6ac2c71efdf15f953bf2aa66",
          "name": "Exterior",
          "slug": "exterior"
        }
      ],
      "tags": [],
      "inStock": true,
      "stock": 15,
      "quantity": 15,
      "quantityAvailable": 15,
      "inventory": {
        "trackInventory": true,
        "quantity": 15,
        "allowBackorder": false,
        "sku": "LV-SIDE-SKIRT-EXTENSION"
      },
      "requiresOptions": false,
      "rating": 0,
      "averageRating": 0,
      "ratingAverage": 0,
      "reviewCount": 0,
      "totalReviews": 0,
      "numReviews": 0
    },
    {
      "id": "6ac2c71efdf15f953bf2aa95",
      "name": "Key Fob Shell Carbon",
      "slug": "key-fob-shell-carbon",
      "articleNo": "LV-KEY-FOB-SHELL-CARBON",
      "shortDescription": "Key Fob Shell Carbon — local verify SKU",
      "image": "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg",
      "images": [
        "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg"
      ],
      "media": {
        "images": [
          {
            "url": "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg",
            "isMain": true,
            "altText": "Key Fob Shell Carbon"
          }
        ]
      },
      "price": 1200,
      "regularPrice": 1700,
      "salePrice": 1200,
      "compareAt": 1700,
      "saleSchedule": null,
      "isOnSale": true,
      "featured": true,
      "newArrival": false,
      "brand": "CrazzyCars.pk",
      "sku": "LV-KEY-FOB-SHELL-CARBON",
      "gtin": "",
      "mpn": "",
      "codEnabled": true,
      "isBulky": false,
      "advancePercentRequired": 0,
      "createdAt": null,
      "categories": [
        {
          "id": "6ac2c71efdf15f953bf2aa67",
          "name": "Interior",
          "slug": "interior"
        }
      ],
      "tags": [],
      "inStock": true,
      "stock": 22,
      "quantity": 22,
      "quantityAvailable": 22,
      "inventory": {
        "trackInventory": true,
        "quantity": 22,
        "allowBackorder": false,
        "sku": "LV-KEY-FOB-SHELL-CARBON"
      },
      "requiresOptions": false,
      "rating": 0,
      "averageRating": 0,
      "ratingAverage": 0,
      "reviewCount": 0,
      "totalReviews": 0,
      "numReviews": 0
    }
  ],
  "newArrivals": [],
  "categories": [
    {
      "id": "6ac2c71efdf15f953bf2aa65",
      "name": "Lights",
      "slug": "lights",
      "image": "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg"
    },
    {
      "id": "6ac2c71efdf15f953bf2aa66",
      "name": "Exterior",
      "slug": "exterior",
      "image": "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg"
    },
    {
      "id": "6ac2c71efdf15f953bf2aa67",
      "name": "Interior",
      "slug": "interior",
      "image": "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg"
    },
    {
      "id": "6ac2c71efdf15f953bf2aa68",
      "name": "Body Kits & Extensions",
      "slug": "body-kits-extensions",
      "image": "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg"
    },
    {
      "id": "6ac2c71efdf15f953bf2aa69",
      "name": "Floor Mats",
      "slug": "floor-mats",
      "image": "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg"
    },
    {
      "id": "6ac2c71efdf15f953bf2aa6a",
      "name": "Mirrors",
      "slug": "mirrors",
      "image": "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg"
    }
  ],
  "recentBlogs": []
}
```

### GET /config

```json
{
  "minVersionIos": "1.0.0",
  "minVersionAndroid": "1.0.0",
  "maintenanceMode": false,
  "maintenanceMessage": "App is under maintenance. Please try again later.",
  "iosStoreUrl": "",
  "androidStoreUrl": "",
  "currency": "PKR",
  "shippingFloorStandard": 250,
  "shippingFloorBulky": 500,
  "enabledPaymentMethods": [
    {
      "key": "cod",
      "label": "Cash on Delivery",
      "icon": "cod",
      "details": {},
      "accountLines": []
    },
    {
      "key": "jazzcash",
      "label": "JazzCash",
      "icon": "jazzcash",
      "details": {
        "accountNumber": "03000000000",
        "accountName": "LOCAL VERIFY FAKE"
      },
      "accountLines": [
        {
          "label": "Account number",
          "value": "03000000000"
        },
        {
          "label": "Account name",
          "value": "LOCAL VERIFY FAKE"
        }
      ]
    },
    {
      "key": "bankTransfer",
      "label": "Bank Transfer",
      "icon": "bank",
      "details": {
        "bankName": "Fake Meezan Local",
        "accountNumber": "00000000000000",
        "accountTitle": "LOCAL VERIFY FAKE",
        "iban": "PK00FAKE0000000000000000"
      },
      "accountLines": [
        {
          "label": "Bank",
          "value": "Fake Meezan Local"
        },
        {
          "label": "Account",
          "value": "00000000000000"
        },
        {
          "label": "Title",
          "value": "LOCAL VERIFY FAKE"
        },
        {
          "label": "IBAN",
          "value": "PK00FAKE0000000000000000"
        }
      ]
    }
  ],
  "defaultPaymentMethod": "cod",
  "contact": {
    "phone": "03000000000",
    "whatsapp": "03000000000",
    "email": "local-verify@example.com"
  },
  "whatsapp": {
    "number": "03000000000",
    "display": "03000000000",
    "waMeDigits": "923000000000"
  },
  "storeName": "CrazzyCars Local Verify",
  "storePhone": "03000000000",
  "delivery": {
    "feeShort": "Delivery Rs. 250 regular · Rs. 500 bulky",
    "feeStatement": "Delivery is Rs. 250 for regular items, or Rs. 500 when the order includes bulky items (splitters, side skirts, spoilers, floor mats, etc.). Shipping is paid in advance; the rest is Cash on Delivery. There is no order-value waiver for delivery.",
    "etaSummary": "Lahore: 2–3 business days (confirmed). Other cities: delivery time will be confirmed at checkout.",
    "lahore": {
      "minDays": 2,
      "maxDays": 3,
      "text": "Lahore: 2–3 business days (confirmed)"
    },
    "otherCitiesText": "Other cities: delivery time will be confirmed at checkout",
    "shipNote": "Most orders ship within 1–2 business days after payment confirmation."
  }
}
```

### GET /products?vehicle=

```json
{
  "products": [
    {
      "id": "6ac2c71efdf15f953bf2aa70",
      "name": "Honda Civic Body Kit D1",
      "slug": "honda-civic-body-kit-d1",
      "articleNo": "LV-BK-D1",
      "shortDescription": "Honda Civic Body Kit D1 — local verify SKU",
      "image": "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg",
      "images": [
        "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg"
      ],
      "media": {
        "images": [
          {
            "url": "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg",
            "isMain": true,
            "altText": "Honda Civic Body Kit D1"
          }
        ]
      },
      "price": 39999,
      "regularPrice": 45000,
      "salePrice": 39999,
      "compareAt": 45000,
      "saleSchedule": null,
      "isOnSale": true,
      "featured": true,
      "newArrival": false,
      "brand": "CrazzyCars.pk",
      "sku": "LV-BK-D1",
      "gtin": "",
      "mpn": "",
      "codEnabled": false,
      "isBulky": true,
      "advancePercentRequired": 0,
      "createdAt": null,
      "categories": [],
      "tags": [],
      "inStock": true,
      "stock": 7,
      "quantity": 7,
      "quantityAvailable": 7,
      "inventory": {
        "trackInventory": true,
        "quantity": 7,
        "allowBackorder": false,
        "sku": "LV-BK-D1"
      },
      "requiresOptions": false,
      "rating": 0,
      "averageRating": 0,
      "ratingAverage": 0,
      "reviewCount": 0,
      "totalReviews": 0,
      "numReviews": 0,
      "fitsVehicle": true
    },
    {
      "id": "6ac2c71efdf15f953bf2aa72",
      "name": "Trunk Lip Spoiler ABS",
      "slug": "trunk-lip-spoiler-abs",
      "articleNo": "LV-SP-1",
      "shortDescription": "Trunk Lip Spoiler ABS — local verify SKU",
      "image": "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg",
      "images": [
        "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg"
      ],
      "media": {
        "images": [
          {
            "url": "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg",
            "isMain": true,
            "altText": "Trunk Lip Spoiler ABS"
          }
        ]
      },
      "price": 4499,
      "regularPrice": 5500,
      "salePrice": 4499,
      "compareAt": 5500,
      "saleSchedule": null,
      "isOnSale": true,
      "featured": false,
      "newArrival": false,
      "brand": "CrazzyCars.pk",
      "sku": "LV-SP-1",
      "gtin": "",
      "mpn": "",
      "codEnabled": true,
      "isBulky": true,
      "advancePercentRequired": 0,
      "createdAt": null,
      "categories": [],
      "tags": [],
      "inStock": true,
      "stock": 12,
      "quantity": 12,
      "quantityAvailable": 12,
      "inventory": {
        "trackInventory": true,
        "quantity": 12,
        "allowBackorder": false,
        "sku": "LV-SP-1"
      },
      "requiresOptions": false,
      "rating": 0,
      "averageRating": 0,
      "ratingAverage": 0,
      "reviewCount": 0,
      "totalReviews": 0,
      "numReviews": 0,
      "fitsVehicle": true
    },
    {
      "id": "6ac2c71efdf15f953bf2aa73",
      "name": "Side Mirror LED Cover",
      "slug": "side-mirror-led-cover",
      "articleNo": "LV-MIR-1",
      "shortDescription": "Side Mirror LED Cover — local verify SKU",
      "image": "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg",
      "images": [
        "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg"
      ],
      "media": {
        "images": [
          {
            "url": "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg",
            "isMain": true,
            "altText": "Side Mirror LED Cover"
          }
        ]
      },
      "price": 2999,
      "regularPrice": 3499,
      "salePrice": 2999,
      "compareAt": 3499,
      "saleSchedule": null,
      "isOnSale": true,
      "featured": true,
      "newArrival": false,
      "brand": "CrazzyCars.pk",
      "sku": "LV-MIR-1",
      "gtin": "",
      "mpn": "",
      "codEnabled": true,
      "isBulky": false,
      "advancePercentRequired": 0,
      "createdAt": null,
      "categories": [],
      "tags": [],
      "inStock": true,
      "stock": 40,
      "quantity": 40,
      "quantityAvailable": 40,
      "inventory": {
        "trackInventory": true,
        "quantity": 40,
        "allowBackorder": false,
        "sku": "LV-MIR-1"
      },
      "requiresOptions": true,
      "rating": 0,
      "averageRating": 0,
      "ratingAverage": 0,
      "reviewCount": 0,
      "totalReviews": 0,
      "numReviews": 0,
      "fitsVehicle": true
    },
    {
      "id": "6ac2c71efdf15f953bf2aa75",
      "name": "Fog Lamp Cover Low Stock",
      "slug": "fog-lamp-cover-low-stock",
      "articleNo": "LV-LOW-1",
      "shortDescription": "Fog Lamp Cover Low Stock — local verify SKU",
      "image": "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg",
      "images": [
        "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg"
      ],
      "media": {
        "images": [
          {
            "url": "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg",
            "isMain": true,
            "altText": "Fog Lamp Cover Low Stock"
          }
        ]
      },
      "price": 1200,
      "regularPrice": 1200,
      "salePrice": 0,
      "compareAt": 1200,
      "saleSchedule": null,
      "isOnSale": false,
      "featured": false,
      "newArrival": false,
      "brand": "CrazzyCars.pk",
      "sku": "LV-LOW-1",
      "gtin": "",
      "mpn": "",
      "codEnabled": true,
      "isBulky": false,
      "advancePercentRequired": 0,
      "createdAt": null,
      "categories": [],
      "tags": [],
      "inStock": true,
      "stock": 2,
      "quantity": 2,
      "quantityAvailable": 2,
      "inventory": {
        "trackInventory": true,
        "quantity": 2,
        "allowBackorder": false,
        "sku": "LV-LOW-1"
      },
      "requiresOptions": false,
      "rating": 0,
      "averageRating": 0,
      "ratingAverage": 0,
      "reviewCount": 0,
      "totalReviews": 0,
      "numReviews": 0,
      "fitsVehicle": true
    },
    {
      "id": "6ac2c71efdf15f953bf2aa76",
      "name": "LED Headlight Bulb H4",
      "slug": "led-headlight-bulb-h4",
      "articleNo": "LV-LED-HEADLIGHT-BULB-H4",
      "shortDescription": "LED Headlight Bulb H4 — local verify SKU",
      "image": "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg",
      "images": [
        "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg"
      ],
      "media": {
        "images": [
          {
            "url": "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg",
            "isMain": true,
            "altText": "LED Headlight Bulb H4"
          }
        ]
      },
      "price": 2499,
      "regularPrice": 2999,
      "salePrice": 2499,
      "compareAt": 2999,
      "saleSchedule": null,
      "isOnSale": true,
      "featured": true,
      "newArrival": false,
      "brand": "CrazzyCars.pk",
      "sku": "LV-LED-HEADLIGHT-BULB-H4",
      "gtin": "",
      "mpn": "",
      "codEnabled": true,
      "isBulky": false,
      "advancePercentRequired": 0,
      "createdAt": null,
      "categories": [],
      "tags": [],
      "inStock": true,
      "stock": 16,
      "quantity": 16,
      "quantityAvailable": 16,
      "inventory": {
        "trackInventory": true,
        "quantity": 16,
        "allowBackorder": false,
        "sku": "LV-LED-HEADLIGHT-BULB-H4"
      },
      "requiresOptions": false,
      "rating": 0,
      "averageRating": 0,
      "ratingAverage": 0,
      "reviewCount": 0,
      "totalReviews": 0,
      "numReviews": 0,
      "fitsVehicle": true
    }
  ],
  "pagination": {
    "total": 20,
    "page": 1,
    "limit": 5,
    "pages": 4,
    "hasNext": true
  },
  "vehicle": {
    "id": "6ac2c71efdf15f953bf2aa6b",
    "slug": "honda-civic-11th-2022-2026",
    "make": "Honda",
    "model": "Civic",
    "generation": "11th Gen"
  }
}
```

### GET /products/:slug

```json
{
  "product": {
    "id": "6ac2c71efdf15f953bf2aa73",
    "name": "Side Mirror LED Cover",
    "slug": "side-mirror-led-cover",
    "articleNo": "LV-MIR-1",
    "ean": "",
    "partNumber": "",
    "condition": "new",
    "vendor": "",
    "shortDescription": "Side Mirror LED Cover — local verify SKU",
    "longDescription": "<p>Side Mirror LED Cover seeded for local mobile API verification. Fake data only.</p>",
    "descriptionHtml": "<p>Side Mirror LED Cover seeded for local mobile API verification. Fake data only.</p>",
    "price": 2999,
    "regularPrice": 3499,
    "salePrice": 2999,
    "compareAt": 3499,
    "saleSchedule": null,
    "isOnSale": true,
    "images": [
      {
        "url": "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg",
        "isMain": true,
        "altText": "Side Mirror LED Cover"
      }
    ],
    "media": {
      "images": [
        {
          "url": "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg",
          "isMain": true,
          "altText": "Side Mirror LED Cover"
        }
      ],
      "videos": []
    },
    "videos": [],
    "videoUrl": "",
    "videoType": "",
    "usesVariantMatrix": false,
    "variationTypes": [],
    "variationOptions": [],
    "variants": [],
    "simpleVariations": [
      {
        "name": "Side",
        "enabled": true,
        "tags": [
          "Left",
          "Right"
        ]
      }
    ],
    "variationCombinations": [
      {
        "_id": "6ac2c71efdf15f953bf2aa6e",
        "options": [
          {
            "name": "Side",
            "value": "Left"
          }
        ],
        "price": 2999,
        "compareAtPrice": 3499,
        "priceDelta": 0,
        "weight": 0,
        "weightDelta": 0,
        "stock": 20,
        "sku": "MIR-L",
        "image": ""
      },
      {
        "_id": "6ac2c71efdf15f953bf2aa6f",
        "options": [
          {
            "name": "Side",
            "value": "Right"
          }
        ],
        "price": 2999,
        "compareAtPrice": 3499,
        "priceDelta": 0,
        "weight": 0,
        "weightDelta": 0,
        "stock": 20,
        "sku": "MIR-R",
        "image": ""
      }
    ],
    "variations": [],
    "categories": [
      {
        "id": "6ac2c71efdf15f953bf2aa6a",
        "name": "Mirrors",
        "slug": "mirrors"
      },
      {
        "id": "6ac2c71efdf15f953bf2aa66",
        "name": "Exterior",
        "slug": "exterior"
      }
    ],
    "inStock": true,
    "quantityAvailable": 40,
    "stock": 40,
    "trackInventory": true,
    "allowBackorder": false,
    "shippingBaseWeight": 0,
    "shippingBaseWeightUnit": "kg",
    "seo": {},
    "averageRating": 0,
    "reviewCount": 0,
    "features": [],
    "specifications": [],
    "codEnabled": true,
    "isBulky": false,
    "advancePercentRequired": 0,
    "addOns": [],
    "recommendedProducts": [],
    "customSizing": {
      "enabled": false,
      "title": "Enter Your Measurements",
      "description": "Enter your measurements for a perfect fit",
      "unit": "cm",
      "fields": []
    },
    "isUniversal": false,
    "compatibleCars": [],
    "vehicleCompatibility": {
      "fitmentType": "specific",
      "universalNote": "",
      "categories": [],
      "vehicles": []
    },
    "fitsVehicle": true
  }
}
```

### GET /categories

```json
{
  "categories": [
    {
      "_id": "6ac2c71efdf15f953bf2aa65",
      "name": "Lights",
      "slug": "lights",
      "image": "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg",
      "icon": "",
      "sortOrder": 0,
      "isFeatured": false,
      "children": []
    },
    {
      "_id": "6ac2c71efdf15f953bf2aa66",
      "name": "Exterior",
      "slug": "exterior",
      "image": "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg",
      "icon": "",
      "sortOrder": 1,
      "isFeatured": false,
      "children": []
    },
    {
      "_id": "6ac2c71efdf15f953bf2aa67",
      "name": "Interior",
      "slug": "interior",
      "image": "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg",
      "icon": "",
      "sortOrder": 2,
      "isFeatured": false,
      "children": []
    },
    {
      "_id": "6ac2c71efdf15f953bf2aa68",
      "name": "Body Kits & Extensions",
      "slug": "body-kits-extensions",
      "image": "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg",
      "icon": "",
      "sortOrder": 3,
      "isFeatured": false,
      "children": []
    },
    {
      "_id": "6ac2c71efdf15f953bf2aa69",
      "name": "Floor Mats",
      "slug": "floor-mats",
      "image": "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg",
      "icon": "",
      "sortOrder": 4,
      "isFeatured": false,
      "children": []
    },
    {
      "_id": "6ac2c71efdf15f953bf2aa6a",
      "name": "Mirrors",
      "slug": "mirrors",
      "image": "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg",
      "icon": "",
      "sortOrder": 5,
      "isFeatured": false,
      "children": []
    }
  ]
}
```

### GET /vehicles

```json
{
  "vehicles": [
    {
      "id": "6ac2c71efdf15f953bf2aa6b",
      "make": "Honda",
      "model": "Civic",
      "generation": "11th Gen",
      "slug": "honda-civic-11th-2022-2026",
      "image": "",
      "yearStart": null,
      "yearEnd": null
    },
    {
      "id": "6ac2c71efdf15f953bf2aa6d",
      "make": "Suzuki",
      "model": "Swift",
      "generation": "4th Gen",
      "slug": "suzuki-swift-2022-2025",
      "image": "",
      "yearStart": null,
      "yearEnd": null
    },
    {
      "id": "6ac2c71efdf15f953bf2aa6c",
      "make": "Toyota",
      "model": "Corolla",
      "generation": "E170",
      "slug": "toyota-corolla-2014-2019",
      "image": "",
      "yearStart": null,
      "yearEnd": null
    }
  ]
}
```

### DELETE /me

```json
{
  "success": true,
  "message": "Account deleted. Your orders are retained for records."
}
```

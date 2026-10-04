# Real local verify responses

Generated: 2026-10-04T21:26:41.356Z
Base: `http://127.0.0.1:3000`
DB: `crazzycars_local_verify` (tokens redacted)

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
| idempotency_same_key_same_body | PASS | ORD-2026-00008 |
| idempotency_same_key_different_body | PASS |  |
| idempotency_concurrent | PASS | ids=6ac2c490e8107da9613b55af |
| guest_order | PASS | ORD-2026-00011 |
| guest_order_reopen_header | PASS |  |
| idor_generic_404 | PASS |  |
| orders_list | PASS | 3 |
| price_tamper_ignored | PASS | charged=2749 |
| min_order_enforced | PASS | MIN_ORDER_NOT_MET |
| stock_oversell_blocked | PASS | qty=2 |
| body_kit_COD_blocked | PASS | Cash on Delivery is not available for: Honda Civic Body Kit D1. Choose advance p |
| body_kit_non_COD_ok | PASS | total=40499 |
| body_kit_bank_order | PASS | ORD-2026-00013 |
| tracking_unavailable_or_not_found | PASS | 404 NOT_FOUND |
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
    "id": "[REDACTED]",
    "name": "Verify Alpha",
    "firstName": "Verify",
    "lastName": "Alpha",
    "email": "verify.a+1791149197512@example.com",
    "phone": "03019197512",
    "isVerified": false,
    "createdAt": "2026-10-04T21:26:37.833Z"
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
    "id": "[REDACTED]",
    "name": "Verify Alpha",
    "firstName": "Verify",
    "lastName": "Alpha",
    "email": "verify.a+1791149197512@example.com",
    "phone": "03019197512",
    "isVerified": false,
    "createdAt": "2026-10-04T21:26:37.833Z"
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

### POST /orders (idem same body 1)

```json
{
  "orderId": "[REDACTED]",
  "orderNumber": "ORD-2026-00008",
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
        "value": "[REDACTED]"
      }
    ],
    "whatsapp": {
      "number": "03000000000",
      "display": "03000000000",
      "waMeUrl": "https://wa.me/923000000000?text=Hi%20CrazzyCars%2C%20I%20paid%20for%20order%20ORD-2026-00008.%0AAmount%3A%20Rs.250.%0ASending%20payment%20screenshot%20now.",
      "prefilledMessage": "Hi CrazzyCars, I paid for order ORD-2026-00008.\nAmount: Rs.250.\nSending payment screenshot now."
    }
  }
}
```

### POST /orders IDEMPOTENCY_KEY_REUSED

```json
{
  "error": {
    "code": "[REDACTED]",
    "message": "Idempotency-Key was already used with a different request body."
  }
}
```

### POST /orders guest

```json
{
  "orderId": "[REDACTED]",
  "orderNumber": "ORD-2026-00011",
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
        "value": "[REDACTED]"
      }
    ],
    "whatsapp": {
      "number": "03000000000",
      "display": "03000000000",
      "waMeUrl": "https://wa.me/923000000000?text=Hi%20CrazzyCars%2C%20I%20paid%20for%20order%20ORD-2026-00011.%0AAmount%3A%20Rs.250.%0ASending%20payment%20screenshot%20now.",
      "prefilledMessage": "Hi CrazzyCars, I paid for order ORD-2026-00011.\nAmount: Rs.250.\nSending payment screenshot now."
    }
  }
}
```

### GET /orders/:id guest header

```json
{
  "order": {
    "id": "[REDACTED]",
    "orderNumber": "ORD-2026-00011",
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
        "productId": "[REDACTED]",
        "slug": "[REDACTED]",
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
        "description": "Order #ORD-2026-00011 received successfully",
        "timestamp": "2026-10-04T21:26:40.546Z"
      }
    ],
    "tracking": {
      "number": "",
      "url": "",
      "courier": "Postex"
    },
    "shippingCity": "Lahore",
    "shippingProvince": "Punjab",
    "createdAt": "2026-10-04T21:26:40.548Z",
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
          "value": "[REDACTED]"
        }
      ],
      "whatsapp": {
        "number": "03000000000",
        "display": "03000000000",
        "waMeUrl": "https://wa.me/923000000000?text=Hi%20CrazzyCars%2C%20I%20paid%20for%20order%20ORD-2026-00011.%0AAmount%3A%20Rs.250.%0ASending%20payment%20screenshot%20now.",
        "prefilledMessage": "Hi CrazzyCars, I paid for order ORD-2026-00011.\nAmount: Rs.250.\nSending payment screenshot now."
      }
    }
  }
}
```

### GET /orders list

```json
{
  "count": 3,
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
  "orderId": "[REDACTED]",
  "orderNumber": "ORD-2026-00012",
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
        "value": "[REDACTED]"
      }
    ],
    "whatsapp": {
      "number": "03000000000",
      "display": "03000000000",
      "waMeUrl": "https://wa.me/923000000000?text=Hi%20CrazzyCars%2C%20I%20paid%20for%20order%20ORD-2026-00012.%0AAmount%3A%20Rs.250.%0ASending%20payment%20screenshot%20now.",
      "prefilledMessage": "Hi CrazzyCars, I paid for order ORD-2026-00012.\nAmount: Rs.250.\nSending payment screenshot now."
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
      "productId": "[REDACTED]",
      "name": "Honda Civic Body Kit D1",
      "slug": "[REDACTED]",
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

### GET /tracking

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
  "hotDeals": 12,
  "bestSellers": 9,
  "brands": 3,
  "flashSaleEndTime": "2026-10-11T21:25:48.088Z"
}
```

### GET /config

```json
{
  "methods": [
    "cod",
    "jazzcash",
    "bankTransfer"
  ],
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

### DELETE /me

```json
{
  "success": true,
  "message": "Account deleted. Your orders are retained for records."
}
```

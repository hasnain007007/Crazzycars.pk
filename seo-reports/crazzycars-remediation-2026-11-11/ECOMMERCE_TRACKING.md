# ECOMMERCE_TRACKING

See also `GA4_VERIFICATION.md`.

| Event | Implemented | Notes |
| --- | --- | --- |
| view_item | Yes | PDP once-per-view |
| view_item_list | Not found | |
| select_item | Not found | |
| add_to_cart | Yes | |
| remove_from_cart | Not found | |
| view_cart | Not found | |
| begin_checkout | Yes | |
| add_shipping_info | Not found | |
| add_payment_info | Not found | |
| purchase | Yes | Deduped per order session |
| refund | Not found | |

Currency: PKR. Meta Pixel parallel path exists — keep attribution separate from organic Search Console.

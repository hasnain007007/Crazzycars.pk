/**
 * Side-effect imports so every Mongoose model is registered before populate/ref resolution.
 * In serverless bundles (e.g. Vercel), a route may import only `Product` while populating
 * `Category` — without this file, `Category` is never registered and populate throws.
 *
 * Keep this list in sync with `lib/models/*.model.js`.
 */
import "./models/ActivityLog.model";
import "./models/AiAgentVisit.model";
import "./models/Banner.model";
import "./models/BlogPost.model";
import "./models/CartSession.model";
import "./models/CarCatalog.model";
import "./models/Category.model";
import "./models/Coupon.model";
import "./models/Customer.model";
import "./models/FeaturedMedia.model";
import "./models/DailyVisitor.model";
import "./models/LivePresence.model";
import "./models/LoginAttempt.model";
import "./models/Order.model";
import "./models/Page.model";
import "./models/PostexWebhookLog.model";
import "./models/RunCourierWebhookLog.model";
import "./models/Product.model";
import "./models/ProductOption.model";
import "./models/Redirect.model";
import "./models/Receipt.model";
import "./models/Review.model";
import "./models/Shipping.model";
import "./models/Settings.model";
import "./models/StockAlert.model";
import "./models/User.model";
import "./models/Vehicle.model";
import "./models/Invoice.model";

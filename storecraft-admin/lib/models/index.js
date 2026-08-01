/**
 * Central model registry — import once (via dbConnect / registerModels)
 * so every Mongoose schema is registered before populate/ref resolution.
 */
export { default as ActivityLog } from "./ActivityLog.model";
export { default as AiAgentVisit } from "./AiAgentVisit.model";
export { default as Banner } from "./Banner.model";

export { default as BlogPost } from "./BlogPost.model";
export { default as CarCatalog } from "./CarCatalog.model";
export { default as Category } from "./Category.model";
export { default as Coupon } from "./Coupon.model";
export { default as Customer } from "./Customer.model";
export { default as FeaturedMedia } from "./FeaturedMedia.model";
export { default as Invoice } from "./Invoice.model";
export { default as DailyVisitor } from "./DailyVisitor.model";
export { default as LivePresence } from "./LivePresence.model";
export { default as LoginAttempt } from "./LoginAttempt.model";
export { default as Order } from "./Order.model";
export { default as Page } from "./Page.model";
export { default as Product } from "./Product.model";
export { default as ProductOption } from "./ProductOption.model";
export { default as Receipt } from "./Receipt.model";
export { default as Redirect } from "./Redirect.model";
export { default as Review } from "./Review.model";
export { default as Shipping } from "./Shipping.model";
export { default as ShippingZone } from "./ShippingZone.model";
export { default as Settings } from "./Settings.model";
export { default as StockAlert } from "./StockAlert.model";
export { default as User } from "./User.model";
export { default as Vehicle } from "./Vehicle.model";

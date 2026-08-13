/**
 * Cloud Functions v2 — Soccer Pika Backend
 */

export { placeOrder, getOrderStatus, updateOrderStatus } from './orders.js';
export { mercadopagoWebhook } from './payments.js';
export { calculateShipping } from './shipping.js';
export { adminCreateProduct, adminUpdateProduct, adminDeleteProduct } from './products.js';
export { setAdminRole, getCustomerOrders } from './staff.js';
export { getInstagramFeed } from './instagram.js';

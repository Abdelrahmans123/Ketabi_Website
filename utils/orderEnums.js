export const orderStatus = {
  PENDING: 'Pending',
  PROCESSING: 'Processing',
  SHIPPED: 'Shipped',
  DELIVERED: 'Delivered',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};  

export const paymentStatus = {
    PENDING: "Pending",
    COMPLETED: "Completed",
    FAILED: "Failed",
    REFUNDED: "Refunded",
};

export const paymentMethods = { 
    STRIPE: "Stripe",
    PAYPAL: "PayPal",
    COD: "Cash on Delivery",
    Paymob: "Paymob",
}

export const itemType = {
    PHYSICAL: "physical",
    EBOOK: "ebook"
};

export const deliveryStatus = {
    NOT_SHIPPED: "NotShipped",
    SHIPPED: "Shipped",
    IN_TRANSIT: "InTransit",
    DELIVERED: "Delivered",
    RETURNED: "Returned",
}
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
    EXPIRED: "Expired"
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
    PENDING: "Pending",
    PROCESSING: "Processing",
    SHIPPED: "Shipped",
    IN_TRANSIT: "InTransit",
    DELIVERED: "Delivered",
    RETURNED: "Returned",
}

export const refundStatus = {
    PENDING: "Pending",
    APPROVED: "Approved",
    REJECTED: "Rejected",
    REFUNDED: "Refunded"
}
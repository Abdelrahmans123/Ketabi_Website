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
    CREDIT_CARD: "Credit Card",
    DEBIT_CARD: "Debit Card",
    PAYPAL: "PayPal",
    COD: "Cash on Delivery",
    Paymob: "Paymob",
}

export const itemType = {
    PHYSICAL: "Physical",
    EBOOK: "Ebook"
};

export const deliveryStatus = {
    NOT_SHIPPED: "NotShipped",
    SHIPPED: "Shipped",
    IN_TRANSIT: "InTransit",
    DELIVERED: "Delivered",
    RETURNED: "Returned",
}
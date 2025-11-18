import axios from 'axios';
import crypto from 'crypto';
import 'dotenv/config';
import AppError from '../utils/AppError.js';

// Paymob Configuration
const PAYMOB_CONFIG = {
    API_KEY: process.env.PAYMOB_API_KEY,
    INTEGRATION_ID: process.env.PAYMOB_INTEGRATION_ID,
    HMAC_SECRET: process.env.PAYMOB_HMAC_SECRET,
    BASE_URL: process.env.PAYMOB_BASE_URL || 'https://accept.paymob.com/api',
    IFRAME_ID: process.env.PAYMOB_IFRAME_ID,
};

// Validate configuration
function validatePaymobConfig() {
    const requiredKeys = ['API_KEY', 'INTEGRATION_ID', 'HMAC_SECRET'];
    const missingKeys = requiredKeys.filter(key => !PAYMOB_CONFIG[key]);

    if (missingKeys.length > 0) {
        throw new Error(`Missing Paymob configuration: ${missingKeys.join(', ')}`);
    }
}

/**
 * Step 1: Authenticate with Paymob to get auth token
 * @returns {Promise<string>} Authentication token
 */
async function getPaymobAuthToken() {
    try {
        validatePaymobConfig();

        const response = await axios.post(
            `${PAYMOB_CONFIG.BASE_URL}/auth/tokens`,
            {
                api_key: PAYMOB_CONFIG.API_KEY
            },
            {
                timeout: 10000,
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );

        if (!response.data || !response.data.token) {
            throw new Error('Failed to get authentication token from Paymob');
        }

        return response.data.token;
    } catch (error) {
        console.error('Paymob Auth Error:', error.response?.data || error.message);
        throw new AppError(
            `Paymob authentication failed: ${error.response?.data?.message || error.message}`,
            502
        );
    }
}

/**
 * Step 2: Register order with Paymob
 * @param {string} authToken - Authentication token
 * @param {Object} orderData - Order details
 * @returns {Promise<number>} Paymob order ID
 */
async function registerPaymobOrder(authToken, orderData) {
    try {
        const response = await axios.post(
            `${PAYMOB_CONFIG.BASE_URL}/ecommerce/orders`,
            {
                auth_token: authToken,
                delivery_needed: orderData.delivery_needed || false,
                amount_cents: Math.round(orderData.amount * 100),
                currency: 'EGP',
                merchant_order_id: orderData.merchant_order_id,
                items: orderData.items || []
            },
            {
                timeout: 10000,
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );

        if (!response.data || !response.data.id) {
            throw new Error('Failed to register order with Paymob');
        }

        return response.data.id;
    } catch (error) {
        console.error('Paymob Order Registration Error:', error.response?.data || error.message);
        throw new AppError(
            `Failed to register order: ${error.response?.data?.message || error.message}`,
            502
        );
    }
}

/**
 * Step 3: Generate payment key for the order
 * @param {string} authToken - Authentication token
 * @param {number} paymobOrderId - Paymob order ID
 * @param {Object} paymentData - Payment details
 * @returns {Promise<string>} Payment token
 */
async function getPaymentKey(authToken, paymobOrderId, paymentData) {
    try {
        const response = await axios.post(
            `${PAYMOB_CONFIG.BASE_URL}/acceptance/payment_keys`,
            {
                auth_token: authToken,
                amount_cents: Math.round(paymentData.amount * 100),
                expiration: 3600, // 1 hour
                order_id: paymobOrderId,
                billing_data: {
                    apartment: paymentData.billing_data?.apartment || 'NA',
                    email: paymentData.billing_data?.email || 'NA',
                    floor: paymentData.billing_data?.floor || 'NA',
                    first_name: paymentData.billing_data?.first_name || 'NA',
                    street: paymentData.billing_data?.street || 'NA',
                    building: paymentData.billing_data?.building || 'NA',
                    phone_number: paymentData.billing_data?.phone_number || 'NA',
                    shipping_method: 'NA',
                    postal_code: 'NA',
                    city: paymentData.billing_data?.city || 'NA',
                    country: 'EG',
                    last_name: paymentData.billing_data?.last_name || 'NA',
                    state: paymentData.billing_data?.state || 'NA'
                },
                currency: 'EGP',
                integration_id: PAYMOB_CONFIG.INTEGRATION_ID,
                lock_order_when_paid: true
            },
            {
                timeout: 10000,
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );

        if (!response.data || !response.data.token) {
            throw new Error('Failed to get payment key from Paymob');
        }

        return response.data.token;
    } catch (error) {
        console.error('Paymob Payment Key Error:', error.response?.data || error.message);
        throw new AppError(
            `Failed to generate payment key: ${error.response?.data?.message || error.message}`,
            502
        );
    }
}

/**
 * Main function to process Paymob payment
 * Creates payment token and returns iframe URL for frontend
 * @param {Object} order - Order object from database
 * @returns {Promise<Object>} Payment details with iframe URL
 */
export async function processPaymobPayment(order) {
    try {
        // Step 1: Get authentication token
        const authToken = await getPaymobAuthToken();

        // Step 2: Prepare order items for Paymob
        const paymobItems = order.items.map(item => ({
            name: item.book?.name || 'Book',
            amount_cents: Math.round(item.price * 100),
            description: item.book?.description || 'Book purchase',
            quantity: item.quantity
        }));

        // Step 3: Register order with Paymob
        const paymobOrderId = await registerPaymobOrder(authToken, {
            amount: order.finalPrice,
            merchant_order_id: order.orderNumber,
            delivery_needed: order.items.some(item => item.type === 'physical'),
            items: paymobItems
        });

        // Step 4: Prepare billing data
        const billingData = {
            email: order.userEmail,
            first_name: order.userName?.split(' ')[0] || 'Customer',
            last_name: order.userName?.split(' ').slice(1).join(' ') || 'Name',
            phone_number: order.shippingAddress?.phoneNumber || '01000000000',
            apartment: order.shippingAddress?.apartment || 'NA',
            floor: order.shippingAddress?.floor || 'NA',
            street: order.shippingAddress?.street || 'NA',
            building: order.shippingAddress?.building || 'NA',
            city: order.shippingAddress?.city || 'Cairo',
            state: order.shippingAddress?.state || 'Cairo'
        };

        // Step 5: Get payment key
        const paymentToken = await getPaymentKey(authToken, paymobOrderId, {
            amount: order.finalPrice,
            billing_data: billingData
        });

        // Return payment details including iframe URL
        return {
            id: paymobOrderId.toString(),
            payment_token: paymentToken,
            iframe_url: `https://accept.paymob.com/api/acceptance/iframes/${PAYMOB_CONFIG.IFRAME_ID}?payment_token=${paymentToken}`,
            merchant_order_id: order.orderNumber
        };

    } catch (error) {
        console.error('Paymob Payment Processing Error:', error);
        throw new AppError(
            error.message || 'Payment processing failed. Please try again.',
            error.statusCode || 502
        );
    }
}

/**
 * Verify HMAC signature from Paymob callback/webhook
 * الـ fields لازم تكون بالترتيب اللي Paymob محددتو
 */
export function verifyPaymobHMAC(data, receivedHmac) {
    try {
        // Paymob documentation
        const hmacFields = [
            data.amount_cents,
            data.created_at,
            data.currency,
            data.error_occured,
            data.has_parent_transaction,
            data.id,
            data.integration_id,
            data.is_3d_secure,
            data.is_auth,
            data.is_capture,
            data.is_refunded,
            data.is_standalone_payment,
            data.is_voided,
            data.order?.id || '',  // order id
            data.owner,
            data.pending,
            data.source_data?.pan || '',
            data.source_data?.sub_type || '',
            data.source_data?.type || '',
            data.success
        ];

        // Create HMAC string by concatenating fields
        const hmacString = hmacFields.join('');

        // Calculate HMAC using SHA512
        const calculatedHmac = crypto
            .createHmac('sha512', process.env.PAYMOB_HMAC_SECRET)
            .update(hmacString)
            .digest('hex');

        // Direct comparison first for debugging
        const isMatch = calculatedHmac === receivedHmac;

        return isMatch;
    } catch (error) {
        console.error('❌ HMAC Verification Error:', error);
        return false;
    }
}


/**
 * Retrieve transaction details from Paymob
 * Used to verify payment status independently
 * @param {string} transactionId - Paymob transaction ID
 * @returns {Promise<Object>} Transaction details
 */
export async function getPaymobTransaction(transactionId) {
    try {
        const authToken = await getPaymobAuthToken();

        const response = await axios.get(
            `${PAYMOB_CONFIG.BASE_URL}/acceptance/transactions/${transactionId}`,
            {
                params: { token: authToken },
                timeout: 10000
            }
        );

        return response.data;
    } catch (error) {
        console.error('Paymob Transaction Retrieval Error:', error.response?.data || error.message);
        throw new AppError(
            `Failed to retrieve transaction: ${error.response?.data?.message || error.message}`,
            502
        );
    }
}

export default {
    processPaymobPayment,
    verifyPaymobHMAC,
    getPaymobTransaction
};
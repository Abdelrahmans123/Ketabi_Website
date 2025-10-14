import Stripe from 'stripe';
import express from 'express';
import {Order} from '../models/Order.js'
import { paymentStatus, orderStatus } from './orderEnums.js';

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

router.post('/webhook/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    let event;

    // Verify webhook signature and intialize the event 
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
        console.error(`Webhook signature verification failed: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    switch (event.type) {
        case 'payment_intent.succeeded':
            const paymentIntent = event.data.object;
            await Order.findOneAndUpdate({ transactionId: paymentIntent.id }, {
                paymentStatus: paymentStatus.COMPLETED,
                orderStatus: orderStatus.PROCESSING
            });
            break;

        case 'payment_intent.payment_failed':
            const failedPaymentIntent = event.data.object;
            await Order.findOneAndUpdate({ transactionId: failedPaymentIntent.id }, {
                paymentStatus: paymentStatus.FAILED,
                orderStatus: orderStatus.CANCELLED
            });
            break;
        default:
            console.log(`Unhandled event type ${event.type}`);
            break;
    }

    res.json({ received: true });
})

export default router;


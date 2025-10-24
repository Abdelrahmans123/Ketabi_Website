import Stripe from 'stripe';
import 'dotenv/config'; // Ensure dotenv is loaded if not in index.js
import AppError from '../utils/AppError.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function processPayment(order) {
   try {
    const paymentIntent = await stripe.paymentIntents.create({    
      amount: Math.round(order.finalPrice * 100),
      currency: 'egp',
      description: `${order.orderNumber}`,
      metadata: {orderNumber:order.orderNumber},
      receipt_email: order.userEmail,
      payment_method_types: ['card'],
    });
    return { id: paymentIntent.id, client_secret: paymentIntent.client_secret };
  } catch (error) {
    throw new AppError(`Payment failed: ${error.message}`, 400);
  }
} 
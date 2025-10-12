import { Stripe } from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function processPayment(order) {
   try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(order.finalPrice * 100),
      currency: order.currency,
      description: `Order ${order.orderNumber}`,
    });
    return { id: paymentIntent.id, status: 'succeeded' };
  } catch (error) {
    throw new AppError(`Payment failed: ${error.message}`, 400);
  }
}
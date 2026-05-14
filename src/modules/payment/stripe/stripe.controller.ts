 import { Controller, Post, Req, Headers, UseGuards } from '@nestjs/common';
import { StripeService } from './stripe.service';
import { Request } from 'express';
import { TransactionRepository } from '../../../common/repository/transaction/transaction.repository';
import { PrismaService } from '../../../prisma/prisma.service';
import { Stripe } from 'stripe';

@Controller('payment/stripe')
export class StripeController {
  constructor(
    private readonly stripeService: StripeService,
    private transactionRepository: TransactionRepository,
    private readonly prisma: PrismaService,
  ) {}

  private async finalizeDepositTransaction({
    transactionId,
    referenceNumber,
    paidAmount,
    rawStatus,
  }: {
    transactionId?: string;
    referenceNumber?: string;
    paidAmount?: number;
    rawStatus?: string;
  }) {
    if (!transactionId) return;

    const transaction = await this.prisma.paymentTransaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction || transaction.status !== 'pending') return;

    await this.prisma.paymentTransaction.update({
      where: { id: transactionId },
      data: {
        status: 'succeeded',
        raw_status: rawStatus,
        reference_number: referenceNumber ?? transaction.reference_number,
      },
    });

    if (transaction.user_id) {
      await this.prisma.user.update({
        where: { id: transaction.user_id },
        data: {
          balance: {
            increment: paidAmount ?? Number(transaction.amount ?? 0),
          },
        },
      });
    }
  }


  @Post('webhook')
  async handleWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() req: Request,
  ) {
    try {

      const payload = req.rawBody.toString();
      const event = await this.stripeService.handleWebhook(payload, signature);

      if (!event.data || !event.data.object) return { received: true };
     
      // Handle events
      switch (event.type) {
        case 'customer.created':
          break;
        case 'payment_intent.created':
          break;
        case 'payment_intent.succeeded': {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          const meta = paymentIntent.metadata || {};

          if (meta.type === 'deposit') {
            await this.finalizeDepositTransaction({
              transactionId: meta.transaction_id,
              referenceNumber: paymentIntent.id,
              paidAmount: paymentIntent.amount_received ? paymentIntent.amount_received / 100 : undefined,
              rawStatus: event.type,
            });
          }

          break; 
        }
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          const meta = session.metadata || {};

          if (meta.type === 'deposit') {
            await this.finalizeDepositTransaction({
              transactionId: meta.transaction_id,
              referenceNumber: session.id,
              paidAmount: session.amount_total ? session.amount_total / 100 : undefined,
              rawStatus: event.type,
            });
          }

          break;
        }
        case 'payment_intent.canceled':
          
          break;
        case 'payment_intent.requires_action':
         
          break;
        case 'payout.paid':
         
          break;
        case 'payout.failed':
          
          break;
        default:
          break;
      }

      return { received: true };
    } catch (error) {
      console.error('Webhook error', error);
      return { received: false };
    }
  }
}

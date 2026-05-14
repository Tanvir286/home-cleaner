import { BadRequestException, Injectable } from '@nestjs/common';

import { PrismaService } from 'src/prisma/prisma.service';
import { CreateDepositDto } from './dto/create-deposite.dto';
import { StripePayment } from 'src/common/lib/Payment/stripe/StripePayment';

@Injectable()
export class DepositeService {
 
 constructor(
     private readonly prisma: PrismaService
   ) {}

    // get my balance
    async getBalance(userId: string) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { 
          balance: true,
          stripe_connect_id: true,
        },
      });

      if(!user) {
        throw new BadRequestException('User not found');
      }
      
      return {
        success: true,
        message: 'Balance retrieved successfully',
        data: {
          balance: user.balance,
          has_payout_account: !!user.stripe_connect_id,
          stripe_connect_id: user.stripe_connect_id,
        }
      };
    }


    // add deposite
    async create(
      createDepositDto: CreateDepositDto,
      userId: string
    ) {

      const { amount, currency = 'usd' } = createDepositDto;

      if(!userId) {
        throw new BadRequestException('Invalid user id for deposit');
      }

      if(!Number.isFinite(amount)) {
        throw new BadRequestException('Deposit amount must be a valid number');
      }

      if(amount <= 0) {
        throw new BadRequestException('Deposit amount must be greater than zero');
      }

      const user = await this.prisma.user.findUnique({where: { id: userId }});

      if(!user) throw new BadRequestException('User not found');

      try {

        let customerId = user.billing_id;
        if(!customerId) {
          const customer = await StripePayment.createCustomer({
            user_id: userId,
            name: user.name,
            email: user.email,
          });
          customerId = customer.id;
        }

        const paymentTransaction = await this.prisma.paymentTransaction.create({
          data: {
            user_id: userId,
            type: 'deposit',
            provider: 'stripe',
            reference_number: null,
            status: 'pending',
            amount: amount,
            currency: currency,
          }
        });

        const session = await StripePayment.createCheckoutSessionForAmount({
          customer: customerId,
          amount: amount,
          currency: currency,
          metadata: {
            userId: userId,
            type: 'deposit',
            transaction_id: paymentTransaction.id,
          },
        });

        await this.prisma.paymentTransaction.update({
          where: { id: paymentTransaction.id },
          data: {
            reference_number: session.id,
          },
        });

        return {
          success: true,
          message: 'Checkout session created successfully',
          data: {
            session_id: session.id,
            checkout_url: (session as any).url,
            transaction_id: paymentTransaction.id,
            amount: amount,
            currency: currency,
          }
        };
      } catch (error: any) {
        throw new BadRequestException(`Failed to create deposit intent: ${error?.message ?? 'Unknown error'}`);
      }
    }

   
    

}

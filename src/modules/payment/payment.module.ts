import { Module } from '@nestjs/common';
import { StripeModule } from './stripe/stripe.module';
import { DepositeModule } from './deposite/deposite.module';
import { WithdrawModule } from './withdraw/withdraw.module';
import { TransectionModule } from './transection/transection.module';

@Module({
  imports: [StripeModule,DepositeModule, WithdrawModule, TransectionModule],
})
export class PaymentModule {}



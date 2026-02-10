import { Module } from '@nestjs/common';
import { ContactModule } from './contact/contact.module';
import { FaqModule } from './faq/faq.module';
import { NotificationModule } from './notification/notification.module';
import { ProfileModule } from './profile/profile.module';
import { BookingModule } from './booking/booking.module';
import { ServiceModule } from './service/service.module';

@Module({
  imports: [
    NotificationModule,
    ContactModule,
    FaqModule,
    ProfileModule,
    BookingModule,
    ServiceModule,
  ],
})
export class ApplicationModule {}

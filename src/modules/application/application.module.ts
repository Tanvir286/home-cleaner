import { Module } from '@nestjs/common';
import { ContactModule } from './contact/contact.module';
import { FaqModule } from './faq/faq.module';
import { NotificationModule } from './notification/notification.module';
import { ProfileModule } from './profile/profile.module';

@Module({
  imports: [
    NotificationModule,
    ContactModule,
    FaqModule,
    ProfileModule,
  ],
})
export class ApplicationModule {}

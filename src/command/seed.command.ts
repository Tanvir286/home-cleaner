import { Command, CommandRunner, Option } from 'nest-commander';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

interface SeedCommandOptions {
  usersOnly?: boolean;
  packagesOnly?: boolean;
  commissionOnly?: boolean;
}


/*********************** USAGE INSTRUCTIONS ***********************
Seed everything together	npm run seed 
Seed only users	npm run seed -- --users-only
Seed only packages	npm run seed -- --packages-only
Seed only commission	npm run seed -- --commission-only
`******************************************************************/



@Command({
  name: 'seed',
  description: 'Seed database with initial data',
})
export class SeedCommand extends CommandRunner {
  private readonly prisma = new PrismaClient();

  async run(_: string[], options?: SeedCommandOptions) {
    const usersOnly = options?.usersOnly ?? false;
    const packagesOnly = options?.packagesOnly ?? false;
    const commissionOnly = options?.commissionOnly ?? false;

    // Check if multiple options are selected
    const selectedOptions = [usersOnly, packagesOnly, commissionOnly].filter(
      Boolean,
    ).length;

    if (selectedOptions > 1) {
      throw new Error(
        'You can only use one option: --users-only or --packages-only or --commission-only',
      );
    }

    await this.main({ usersOnly, packagesOnly, commissionOnly });
  }

  @Option({
    flags: '--users-only',
    description: 'Seed only users and skip packages & commission',
  })
  parseUsersOnly(): boolean {
    return true;
  }

  @Option({
    flags: '--packages-only',
    description: 'Seed only cleaning packages and skip users & commission',
  })
  parsePackagesOnly(): boolean {
    return true;
  }

  @Option({
    flags: '--commission-only',
    description: 'Seed only commission and skip users & packages',
  })
  parseCommissionOnly(): boolean {
    return true;
  }

  private async main({
    usersOnly = false,
    packagesOnly = false,
    commissionOnly = false,
  }: SeedCommandOptions) {
    const password = await bcrypt.hash('123456', 10);

    /* ================= 1. USERS SEEDING ================= */
    if (!packagesOnly && !commissionOnly) {
      console.log('👤 Users seeding started...');

      // ADMIN
      await this.prisma.user.upsert({
        where: { email: 'admin@gmail.com' },
        update: {},
        create: {
          name: 'Admin User',
          email: 'admin@gmail.com',
          password,
          type: 'ADMIN',
          location: 'Dhaka',
          bio: 'System administrator',
          email_verified_at: new Date(),
        },
      });

      // MAID
      await this.prisma.user.upsert({
        where: { email: 'maid@gmail.com' },
        update: {},
        create: {
          name: 'Professional Maid',
          email: 'maid@gmail.com',
          password,
          type: 'MAID',
          location: 'Dhaka',
          bio: 'Experienced cleaning professional',
          email_verified_at: new Date(),
        },
      });

      // HOMEOWNER
      await this.prisma.user.upsert({
        where: { email: 'homeowner@gmail.com' },
        update: {},
        create: {
          name: 'Home Owner',
          email: 'homeowner@gmail.com',
          password,
          type: 'HOMEOWNER',
          location: 'Dhaka',
          bio: 'Looking for home cleaning services',
          email_verified_at: new Date(),
        },
      });

      console.log('✅ Users seeding completed');
    }

    if (usersOnly) {
      console.log('🎉 Seed completed: Users only');
      await this.prisma.$disconnect();
      return;
    }

    /* ================= 2. COMMISSION SEEDING ================= */
    if (!usersOnly && !packagesOnly) {
      console.log('💰 Commission seeding started...');

      await this.prisma.commission.deleteMany({});

      await this.prisma.commission.create({
        data: {
          percentage: 5,
          fixed_fee: 10,
        },
      });

      console.log('✅ Commission seeding completed');
    }

    if (commissionOnly) {
      console.log('🎉 Seed completed: Commission only');
      await this.prisma.$disconnect();
      return;
    }

    /* ================= 3. PACKAGES SEEDING ================= */
    if (!usersOnly && !commissionOnly) {
      console.log('📦 Packages seeding started...');

      // GENERAL CLEANING PACKAGES
      await this.prisma.generalCleaningPackage.createMany({
        skipDuplicates: true,
        data: [
          {
            title: 'Eco Spark',
            packageType: 'ECO_SPARK',
            price: 79,
          },
          {
            title: 'Spark',
            packageType: 'SPARK',
            price: 99,
          },
          {
            title: 'Green Flow',
            packageType: 'GREENFLOW',
            price: 129,
          },
          {
            title: 'Glide',
            packageType: 'GLIDE',
            price: 229,
          },
        ],
      });

      // RESIDENTIAL CLEANING PACKAGES
      await this.prisma.residentialCleaningPackage.createMany({
        skipDuplicates: true,
        data: [
          {
            title: 'Eco Refresh',
            serviceType: 'RESIDENTIAL_CLEANING',
            packageType: 'GENERAL',
            price: 149,
            description:
              'Kitchen: Countertops, sink, cabinet exteriors, appliance exteriors. Bathrooms: Toilet, sink, shower/tub, mirrors. Living Areas: Dusting, vacuuming, sweeping, mopping, trash removal. Bedrooms: Dusting, vacuuming, trash removal.',
            duration: '2-3 hours',
          },
          {
            title: 'Eco Restore',
            serviceType: 'RESIDENTIAL_CLEANING',
            packageType: 'MOST_POPULAR',
            price: 229,
            description:
              'Everything in Eco Refresh. Microwave interior cleaning. Detailed appliance wipe down. Windowsill cleaning. Light blind dusting. Baseboard spot cleaning. Additional bathroom detailing.',
            duration: '3-5 hours',
          },
          {
            title: 'EcoElite Clean',
            serviceType: 'RESIDENTIAL_CLEANING',
            packageType: 'DEEP_CLEANING',
            price: 399,
            description:
              'Everything in Eco Restore. Cabinet exterior detail cleaning. Backsplash cleaning. Detailed grout attention. Detailed shower cleaning. Fixture polishing. Baseboard cleaning. Door cleaning. Light switch cleaning. Interior window cleaning. High-touch disinfection',
            duration: '5-8 hours',
          },
          {
            title: 'Eco Revival',
            serviceType: 'RESIDENTIAL_CLEANING',
            packageType: 'PREMIUM',
            price: 549,
            description:
              'Everything in Eco Elite Deep Clean. Interior cabinet wipe down. Interior refrigerator cleaning. Interior oven cleaning. Wall spot cleaning. Trim cleaning. Heavy dust removal. Final property presentation cleaning.',
            duration: '6-10 hours',
          },
        ],
      });

      // DEEP CLEANING PACKAGES
      await this.prisma.deepCleaningPackage.createMany({
        skipDuplicates: true,
        data: [
          {
            title: 'Eco Spark',
            packageType: 'ECO_SPARK',
            price: 89,
          },
          {
            title: 'Green Flow',
            packageType: 'GREENFLOW',
            price: 129,
          },
          {
            title: 'Glide',
            packageType: 'GLIDE',
            price: 229,
          },
        ],
      });

      console.log('✅ Packages seeding completed');
    }

    // Final report
    if (packagesOnly) {
      console.log('🎉 Seed completed: Cleaning Packages only');
    } else if (usersOnly) {
      console.log('🎉 Seed completed: Users only');
    } else if (commissionOnly) {
      console.log('🎉 Seed completed: Commission only');
    } else {
      console.log('🎉 Seed completed: Users + Commission + Cleaning Packages');
    }

    await this.prisma.$disconnect();
  }
}

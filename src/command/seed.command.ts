import { Command, CommandRunner, Option } from 'nest-commander';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

interface SeedCommandOptions {
  usersOnly?: boolean;
  packagesOnly?: boolean;
  commissionOnly?: boolean;
  reset?: boolean;
}

/*********************** USAGE INSTRUCTIONS ***********************
Seed everything together   npm run seed 
Seed only users            npm run seed -- --users-only
Seed only packages         npm run seed -- --packages-only
Seed only commission       npm run seed -- --commission-only
Reset and seed             npm run seed:reset
******************************************************************/

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
    const reset = options?.reset ?? false;

    // Check if multiple options are selected
    const selectedOptions = [usersOnly, packagesOnly, commissionOnly].filter(
      Boolean,
    ).length;

    if (selectedOptions > 1) {
      throw new Error(
        'You can only use one option: --users-only or --packages-only or --commission-only',
      );
    }

    await this.main({ usersOnly, packagesOnly, commissionOnly, reset });
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

  @Option({
    flags: '--reset',
    description: 'Reset existing seeded data before re-seeding',
  })
  parseReset(): boolean {
    return true;
  }

  private async main({
    usersOnly = false,
    packagesOnly = false,
    commissionOnly = false,
    reset = false,
  }: SeedCommandOptions) {
    const password = await bcrypt.hash('123456', 10);

    /* ================= 1. USERS SEEDING ================= */
    if (!packagesOnly && !commissionOnly) {
      console.log('👤 Users seeding started...');

      if (reset) {
        await this.prisma.user.deleteMany({
          where: {
            email: {
              in: ['admin@gmail.com', 'maid@gmail.com', 'homeowner@gmail.com'],
            },
          },
        });
      }

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

      if (reset) {
        await this.prisma.commission.deleteMany({});
      }

      const existingCommission = await this.prisma.commission.findFirst();

      if (existingCommission) {
        await this.prisma.commission.update({
          where: { id: existingCommission.id },
          data: {
            percentage: 5,
            fixed_fee: 10,
          },
        });
      } else {
        await this.prisma.commission.create({
          data: {
            percentage: 5,
            fixed_fee: 10,
          },
        });
      }

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

      if (reset) {
        await this.prisma.residentialCleaningPackage.deleteMany({
          where: {
            serviceType: 'RESIDENTIAL_CLEANING',
          },
        });
      }

      // ONLY RESIDENTIAL CLEANING PACKAGES
      await this.prisma.residentialCleaningPackage.createMany({
        skipDuplicates: true,
        data: [
          {
            title: 'EcoRefresh Clean',
            serviceType: 'RESIDENTIAL_CLEANING',
            price: 149,
            description:
              'Weekly or bi-weekly maintenance cleaning.Apartments.Small homes.Homes already in good condition.Wipe countertops.Clean exterior of appliances.Clean sink and faucet.Spot clean cabinet exteriors.Sweep and mop floors.Clean and sanitize toilet.Clean sink and vanity.Clean mirrors.Clean shower/tub surfaces.Sweep and mop floors.Dust accessible surfaces.Make beds (if linens are provided).Vacuum carpets/rugs.Sweep and mop hard floors.Empty trash bins.Eco-friendly cleaning products.General dusting.Floor cleaning.Trash removal. ',
            duration: '2-3 Hours',
          },
          {
            title:'EcoRestore Deep Clean',
            serviceType: 'RESIDENTIAL_CLEANING',
            price: 229,
            description:
              '  First-time customers. Seasonal cleaning. Homes needing extra attention. Includes Everything in EcoRefresh Clean. Detailed appliance exterior cleanings. Clean microwave interior. Detailed backsplash cleaning. Cabinet front detailing. Deep scrub shower/tub. Detailed tile cleaning. Detailed fixture cleaning. Detailed dusting of baseboards. Window sill cleaning. Door frame spot cleaning. Light switch and doorknob sanitizing. Baseboard cleaning. Ceiling fan dusting. Window sill cleaning. Extra attention to high-touch surfaces.',
            duration: '3-5 Hours',
          },
          {
            title: 'EcoElite Premium Clean',
            serviceType: 'RESIDENTIAL_CLEANING',
            price: 399,
            description:
              'Luxury homes. Special occasions. Annual deep cleaning, Homes requiring top-tier service, Includes Everything in EcoRestore Deep Clean, Interior refrigerator cleaning, Interior oven cleaning, Interior cabinet wipe-down (accessible areas), Detailed grout attention, Premium fixture detailing, Detailed baseboard cleaning, Detailed door and trim cleaning, Interior window cleaning (reachable areas), Wall spot cleaning, High-detail dusting throughout, Comprehensive home refresh, Priority scheduling, Enhanced quality-control inspection',
            duration: '5-7 Hours',
          },
        ],
      });

      console.log('✅ Packages seeding completed');
    }

    // Final report
    if (packagesOnly) {
      console.log('🎉 Seed completed: Residential Cleaning Packages only');
    } else if (usersOnly) {
      console.log('🎉 Seed completed: Users only');
    } else if (commissionOnly) {
      console.log('🎉 Seed completed: Commission only');
    } else {
      console.log('🎉 Seed completed: Users + Commission + Residential Cleaning Packages');
    }

    await this.prisma.$disconnect();
  }
}
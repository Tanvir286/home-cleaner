import { Command, CommandRunner } from 'nest-commander';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Command({
  name: 'seed',
  description: 'Seed database with initial data',
})
export class SeedCommand extends CommandRunner {
  
  private readonly prisma = new PrismaClient();

  async run() {
    await this.main();
  }

  private async main() {
    const password = await bcrypt.hash('123456', 10);

    /* ================= USERS ================= */

    // ---------- ADMIN ----------
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

    // ---------- MAID ----------
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

    // ---------- HOMEOWNER ----------
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

    /* ================= GENERAL CLEANING PACKAGES ================= */

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

    /* ================= DEEP CLEANING PACKAGES ================= */

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

    console.log('✅ Seed completed: Users + Cleaning Packages created');
  }
}

import { Command, CommandRunner } from 'nest-commander';
import { PrismaClient, UserType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Command({
  name: 'seed',
  description: 'Seed database with initial data'
})
export class SeedCommand extends CommandRunner {
 
  private readonly prisma = new PrismaClient();

  async run() {
    await this.main();
  }

  private async main() {
  
    const password = await bcrypt.hash('123456', 10);

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

  // ---------- HOMEOWNER (CLIENT) ----------
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

  console.log('Seed users created: ADMIN, MAID, HOMEOWNER');
  }
}

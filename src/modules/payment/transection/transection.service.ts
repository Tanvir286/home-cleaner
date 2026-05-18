import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class TransectionService {

  constructor(
    private readonly prisma: PrismaService
  ) {}

  // transection list
  async findAll(
    userId: string
  ) {
  
    const transactions = await this.prisma.paymentTransaction.findMany({
      where: {
        user_id: userId,
        type: 'deposit',
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    const formattedTransection = transactions.map((t) => ({
      id: t.id,
      amount: t.amount,
      type: t.type,
      status: t.status,
      createdAt: t.created_at,
    }));

    return {
      success: true,
      message: 'Transection list retrieved successfully',
      data: formattedTransection,
    };
  }

   


  
}

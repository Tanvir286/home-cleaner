import { Injectable } from '@nestjs/common';
import { CreateTransectionDto } from './dto/create-transection.dto';
import { UpdateTransectionDto } from './dto/update-transection.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class TransectionService {

  constructor(
    private readonly prisma: PrismaService
  ) {}

  // transection list
 
  async findDepositList() {
  const deposits = await this.prisma.transection.findMany({
    where: {
      type: 'deposit',
      deleted_at: null,
    },
    orderBy: {
      created_at: 'desc',
    },
  });

  return {
    message: 'Deposit transaction list fetched successfully',
    data: deposits,
  };
}

  
  
}

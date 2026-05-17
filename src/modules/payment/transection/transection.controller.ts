import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { TransectionService } from './transection.service';
import { CreateTransectionDto } from './dto/create-transection.dto';
import { UpdateTransectionDto } from './dto/update-transection.dto';

@Controller('transection')
export class TransectionController {
 
  constructor(private readonly transectionService: TransectionService) {}

  
  // transection list 
  @Get()
  findAll() {
    return this.transectionService.findDepositList();
  }

  // explicit deposit list endpoint
  @Get('deposit')
  findDeposit() {
    return this.transectionService.findDepositList();
  }



}

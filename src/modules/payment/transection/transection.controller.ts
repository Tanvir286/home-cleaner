import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { TransectionService } from './transection.service';
import { CreateTransectionDto } from './dto/create-transection.dto';
import { UpdateTransectionDto } from './dto/update-transection.dto';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';

@Controller('transection')
export class TransectionController {
 
  constructor(private readonly transectionService: TransectionService) {}

  
  // transection list
  @UseGuards(JwtAuthGuard)
  @Get('all-list')
  async findAll(
    @Req() req: any
  ) {
    const userId = req.user.userId;
    return await this.transectionService.findAll(userId);
  }   
   
  
  
   


  

 



}

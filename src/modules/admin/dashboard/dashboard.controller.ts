import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { CreateDashboardDto } from './dto/create-dashboard.dto';
import { UpdateDashboardDto } from './dto/update-dashboard.dto';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guard/role/roles.guard';
import { Role } from 'src/common/guard/role/role.enum';
import { Roles } from 'src/common/guard/role/roles.decorator';


@UseGuards(JwtAuthGuard, RolesGuard) 
@Roles(Role.ADMIN)
@Controller('dashboard')
export class DashboardController {


  constructor(private readonly dashboardService: DashboardService) {}

  
  // dashborad Overview
  @Get('overview')
  async getOverview() {
    return this.dashboardService.getOverview();
  }

  // recent activities
  // only activity (mane j j jabe tar vitor notification moto takbe)



  /*--------------------------------------------
            HOMEOWNER LIST WITH DETAILS
  --------------------------------------------*/

  // get all homeowners with details
  @Get('homeowners/details')
  async getAllHomeowners() {
    return this.dashboardService.getAllHomeowners();
  }
  
          
   

  
}

import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';
import { Role } from './role.enum';
import { UserRepository } from '../../../common/repository/user/user.repository';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private userRepository: UserRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    console.log('Request user:', user);
    console.log('User ID:', user?.userId);

    const userDetails = await this.userRepository.getUserDetails(user.userId);

    if (!userDetails) {
      console.log('User not found for userId:', user.userId);
      return false;
    }

    console.log('User details from DB:', userDetails);
    console.log('User type:', userDetails.type);
    console.log('Required roles:', requiredRoles);

    const userType = userDetails.type;
    
    if (requiredRoles.some((role) => userType === role)) {
      console.log('Access granted - role matched');
      return true;
    } else {
      console.log('Access denied - role mismatch');
      throw new HttpException(
        'You do not have permission to access this resource',
        HttpStatus.FORBIDDEN,
      );
    }
  }
}

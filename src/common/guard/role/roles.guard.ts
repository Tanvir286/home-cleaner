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
import { IS_PUBLIC_KEY } from 'src/common/decorator/public.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private userRepository: UserRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);


    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    const userDetails = await this.userRepository.getUserDetails(user.userId);

    if (!userDetails) {
      console.log('User not found for userId:', user.userId);
      return false;
    }

    const userType = userDetails.type;
    
    if (requiredRoles.some((role) => userType === role)) {
      return true;
    } else {
      throw new HttpException(
        'You do not have permission to access this resource',
        HttpStatus.FORBIDDEN,
      );
    }
  }
}

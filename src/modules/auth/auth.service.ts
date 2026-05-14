import * as admin from 'firebase-admin';
// external imports
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import Redis from 'ioredis';

//internal imports
import { DateHelper } from '../../common/helper/date.helper';
import { StringHelper } from '../../common/helper/string.helper';
import { TanvirStorage } from '../../common/lib/Disk/TanvirStorage';
import { StripePayment } from '../../common/lib/Payment/stripe/StripePayment';
import { NotificationRepository } from '../../common/repository/notification/notification.repository';
import { UcodeRepository } from '../../common/repository/ucode/ucode.repository';
import { UserRepository } from '../../common/repository/user/user.repository';
import appConfig from '../../config/app.config';
import { MailService } from '../../mail/mail.service';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from '../admin/user/entities/user.entity';
import { sendAdminNotification } from 'src/common/utils/notification.util';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
    private mailService: MailService,
    private userRepository: UserRepository,
    private ucodeRepository: UcodeRepository,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  // done
  async me(userId: string) {
    try {
      const user = await this.prisma.user.findFirst({
        where: {
          id: userId,
        },
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
          address: true,
          type: true,
        },
      });

      if (!user) {
        return {
          success: false,
          message: 'User not found',
        };
      }

      if (user.avatar) {
        user['avatar_url'] = TanvirStorage.url(
          appConfig().storageUrl.avatar + '/' + user.avatar,
        );
      }

      if (user) {
        return {
          success: true,
          data: user,
        };
      } else {
        return {
          success: false,
          message: 'User not found',
        };
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
  // done
  async register({
    first_name,
    last_name,
    name,
    address,
    email,
    password,
    type,
  }: {
    first_name: string;
    last_name: string;
    name: string;
    address: string;
    email: string;
    password: string;
    type?: string;
  }) {
    try {
      // Check if email already exist
      const userEmailExist = await this.userRepository.exist({
        field: 'email',
        value: String(email),
      });

      if (userEmailExist) {
        return {
          statusCode: 401,
          message: 'Email already exist',
        };
      }

      const user = await this.userRepository.createUser({
        name: name,
        email: email,
        password: password,
        first_name: first_name,
        last_name: last_name,
        address: address,
        type: type,
      });

      if (user == null && user.success == false) {
        return {
          success: false,
          message: 'Failed to create account',
        };
      }

      // create stripe customer account
      const stripeCustomer = await StripePayment.createCustomer({
        user_id: user.data.id,
        email: email,
        name: name,
      });

      if (stripeCustomer) {
        await this.prisma.user.update({
          where: {
            id: user.data.id,
          },
          data: {
            billing_id: stripeCustomer.id,
          },
        });
      }

      // ----------------------------------------------------
      // create otp code
      const token = await this.ucodeRepository.createToken({
        userId: user.data.id,
        isOtp: true,
        time: 2,
      });

      // send otp code to email
      await this.mailService.sendOtpCodeToEmail({
        email: email,
        name: name,
        otp: token,
      });

      await sendAdminNotification({
        sender_id: user.data.id,
        text: `${name} has registered a new account`,
        type: 'new_user_registration',
        entity_id: user.data.id,
      });

      return {
        success: true,
        message: 'We have sent an OTP code to your email',
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
  // done
  async login({ email, userId, fcm_token, device_type }) {
    try {
      const user = await this.userRepository.getUserDetails(userId);

      const payload = { email: email, sub: userId, type: user?.type };

      if (fcm_token) {
        await this.prisma.user.update({
          where: { id: userId },
          data: {
            fcm_token: fcm_token,
            device_type: device_type ?? null,
          },
        });
      }

      const accessToken = this.jwtService.sign(payload, { expiresIn: '1h' });
      const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

      // store refreshToken
      await this.redis.set(
        `refresh_token:${user.id}`,
        refreshToken,
        'EX',
        60 * 60 * 24 * 7, // 7 days in seconds
      );

      return {
        success: true,
        message: 'Logged in successfully',
        authorization: {
          type: 'bearer',
          access_token: accessToken,
          refresh_token: refreshToken,
        },
        type: user.type,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async saveFcmToken({
    user_id,
    fcm_token,
    device_type,
  }: {
    user_id: string;
    fcm_token: string;
    device_type?: string;
  }) {
    try {
      const user = await this.userRepository.getUserDetails(user_id);

      if (!user) {
        return {
          success: false,
          message: 'User not found',
        };
      }

      await this.prisma.user.update({
        where: { id: user_id },
        data: {
          fcm_token: fcm_token,
          device_type: device_type ?? null,
        },
      });

      return {
        success: true,
        message: 'FCM token saved successfully',
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
  // update user
  async updateUser(
    userId: string,
    updateUserDto: UpdateUserDto,
    image?: Express.Multer.File,
  ) {
    try {
      const data: any = {};

      if (updateUserDto.name) data.name = updateUserDto.name;

      if (updateUserDto.first_name) data.first_name = updateUserDto.first_name;

      if (updateUserDto.last_name) data.last_name = updateUserDto.last_name;

      if (updateUserDto.address) data.address = updateUserDto.address;

      if (image) {
        // delete old image from storage
        const oldImage = await this.prisma.user.findFirst({
          where: { id: userId },
          select: { avatar: true },
        });
        if (oldImage.avatar) {
          await TanvirStorage.delete(
            appConfig().storageUrl.avatar + '/' + oldImage.avatar,
          );
        }

        // upload file
        const fileName = `${StringHelper.randomString()}_${image.originalname}`;
        await TanvirStorage.put(
          appConfig().storageUrl.avatar + '/' + fileName,
          image.buffer,
        );

        data.avatar = fileName;
      }

      const user = await this.userRepository.getUserDetails(userId);
      if (user) {
        await this.prisma.user.update({
          where: { id: userId },
          data: {
            ...data,
          },
        });
        
        return {
          success: true,
          message: 'User updated successfully',
        };
      } else {
        return {
          success: false,
          message: 'User not found',
        };
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
  // done
  async forgotPassword(email) {
    try {
      const user = await this.userRepository.exist({
        field: 'email',
        value: email,
      });

      if (user) {
        const token = await this.ucodeRepository.createToken({
          userId: user.id,
          isOtp: true,
        });

        await this.mailService.sendOtpCodeToEmail({
          email: email,
          name: user.name,
          otp: token,
        });

        return {
          success: true,
          message: 'We have sent an OTP code to your email',
        };
      } else {
        return {
          success: false,
          message: 'Email not found',
        };
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
  // done
  async resendToken(email: string) {
    try {
      const user = await this.userRepository.getUserByEmail(email);

      if (user) {
        // create otp code
        const token = await this.ucodeRepository.createToken({
          userId: user.id,
          isOtp: true,
          time: 2,
        });

        // send otp code to email
        await this.mailService.sendOtpCodeToEmail({
          email: email,
          name: user.name,
          otp: token,
        });

        return {
          success: true,
          message: 'We have sent a token code to your email',
        };
      } else {
        return {
          success: false,
          message: 'Email not found',
        };
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
  // done
  async verifyToken({ email, token }) {
    try {
      const user = await this.userRepository.exist({
        field: 'email',
        value: email,
      });

      if (user) {
        const result = await this.ucodeRepository.verifyToken({
          email: email,
          token: token,
        });

        // Check the actual success property, not just if object exists
        if (result && result.success) {
          return {
            success: true,
            message: result.message || 'Token verified successfully',
          };
        } else {
          return {
            success: false,
            message: result?.message || 'Invalid token',
          };
        }
      } else {
        return {
          success: false,
          message: 'Email not found',
        };
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
  //done
  async verifyEmail({ email, token }) {
    try {
      const user = await this.userRepository.exist({
        field: 'email',
        value: email,
      });

      if (user) {
        const existToken = await this.ucodeRepository.validateToken({
          email: email,
          token: token,
        });

        if (existToken) {
          await this.prisma.user.update({
            where: {
              id: user.id,
            },
            data: {
              email_verified_at: new Date(Date.now()),
            },
          });

          return {
            success: true,
            message: 'Email verified successfully',
          };
        } else {
          return {
            success: false,
            message: 'Invalid token',
          };
        }
      } else {
        return {
          success: false,
          message: 'Email not found',
        };
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
  // done
  async resendVerificationEmail(email: string) {
    try {
      const user = await this.userRepository.getUserByEmail(email);

      if (user) {
        // create otp code
        const token = await this.ucodeRepository.createToken({
          userId: user.id,
          isOtp: true,
        });

        // send otp code to email
        await this.mailService.sendOtpCodeToEmail({
          email: email,
          name: user.name,
          otp: token,
        });

        return {
          success: true,
          message: 'We have sent a verification code to your email',
        };
      } else {
        return {
          success: false,
          message: 'Email not found',
        };
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
  //
  async resetPassword({ email, token, password }) {
    try {
      const user = await this.userRepository.exist({
        field: 'email',
        value: email,
      });

      if (user) {
        const existToken = await this.ucodeRepository.verifycheckToken({
          email: email,
          token: token,
        });

        if (existToken) {
          await this.userRepository.changePassword({
            email: email,
            password: password,
          });

          // delete otp code
          await this.ucodeRepository.deleteToken({
            email: email,
            token: token,
          });

          return {
            success: true,
            message: 'Password updated successfully',
          };
        } else {
          return {
            success: false,
            message: 'Invalid token',
          };
        }
      } else {
        return {
          success: false,
          message: 'Email not found',
        };
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async changePassword({ user_id, oldPassword, newPassword }) {
    try {
      const user = await this.userRepository.getUserDetails(user_id);

      if (user) {
        const _isValidPassword = await this.userRepository.validatePassword({
          email: user.email,
          password: oldPassword,
        });
        if (_isValidPassword) {
          await this.userRepository.changePassword({
            email: user.email,
            password: newPassword,
          });

          return {
            success: true,
            message: 'Password updated successfully',
          };
        } else {
          return {
            success: false,
            message: 'Invalid password',
          };
        }
      } else {
        return {
          success: false,
          message: 'Email not found',
        };
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /*----------------------------------------------
  // topic: maid Verification Part Start ---------->
  -----------------------------------------------*/
  // submit verification
  async submitVerification(
    userId: string,
    front_page?: Express.Multer.File,
    back_page?: Express.Multer.File,
  ) {
    try {
      const data: any = {};

      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, type: true },
      });

      if (!user) {
        return {
          success: false,
          message: 'User not found',
        };
      }

      if (user.type !== 'MAID') {
        return {
          success: false,
          message: 'Only maid can submit verification',
        };
      }

      if (!front_page || !back_page) {
        return {
          success: false,
          message: 'front_page and back_page are required',
        };
      }

      const existingVerification = await this.prisma.maidVerification.findFirst(
        {
          where: { user_id: userId },
          orderBy: { created_at: 'desc' },
        },
      );

      if (existingVerification && existingVerification.status === 'PENDING') {
        return {
          success: false,
          message:
            'You already have a pending verification. Please wait for it to be reviewed before submitting a new one.',
          data: {
            id: existingVerification.id,
            status: existingVerification.status,
          },
        };
      }

      if (front_page && back_page) {
        // upload front page
        const frontFileName = `${StringHelper.randomString()}_${front_page.originalname}`;
        await TanvirStorage.put(
          appConfig().storageUrl.maidverification + '/' + frontFileName,
          front_page.buffer,
        );
        data.id_card_front = frontFileName;

        // upload back page
        const backFileName = `${StringHelper.randomString()}_${back_page.originalname}`;
        await TanvirStorage.put(
          appConfig().storageUrl.maidverification + '/' + backFileName,
          back_page.buffer,
        );
        data.id_card_back = backFileName;
      }

      await this.prisma.maidVerification.create({
        data: {
          user_id: userId,
          id_card_front: data.id_card_front,
          id_card_back: data.id_card_back,
          status: 'PENDING',
        },
      });

      return {
        success: true,
        message: 'Verification submitted successfully',
        data: {
          front_page_url: TanvirStorage.url(
            appConfig().storageUrl.maidverification + '/' + data.id_card_front,
          ),
          back_page_url: TanvirStorage.url(
            appConfig().storageUrl.maidverification + '/' + data.id_card_back,
          ),
        },
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
  
  // get verification status
  async getVerificationStatus(userId: string) {
    try {
      const verification = await this.prisma.maidVerification.findFirst({
        where: { user_id: userId },
        orderBy: { created_at: 'desc' },
      });

      if (!verification) {
        return {
          success: true,
          message: 'No verification submission found',
          data: null,
        };
      }

      let title = 'Under Review';
      let short_status = 'UNDER_REVIEW';
      

      if (verification.status === 'VERIFIED') {
        title = 'Approved By Admin';
        short_status = 'APPROVED';
      }

      if (verification.status === 'REJECTED') {
        title = 'Rejected';
        short_status = 'REJECTED';
      }

      return {
        success: true,
        data: {
          id: verification.id,
          status: verification.status,
          short_status,
          title,
          submission_date: verification.created_at,
          approval_date: verification.verified_at,
          verification_documents: {
            id_card_front_url: verification.id_card_front
              ? TanvirStorage.url(
                  appConfig().storageUrl.maidverification +
                    '/' +
                    verification.id_card_front,
                )
              : null,
            id_card_back_url: verification.id_card_back
              ? TanvirStorage.url(
                  appConfig().storageUrl.maidverification +
                    '/' +
                    verification.id_card_back,
                )
              : null,
          },
        },
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /*----------------------------------------------
  // topic: maid Verification Part End ---------->
  -----------------------------------------------*/

  // ---------------------------------(end)---------------------------------------

  async refreshToken(user_id: string, refreshToken: string) {
    try {
      const storedToken = await this.redis.get(`refresh_token:${user_id}`);

      if (!storedToken || storedToken != refreshToken) {
        return {
          success: false,
          message: 'Refresh token is required',
        };
      }

      if (!user_id) {
        return {
          success: false,
          message: 'User not found',
        };
      }

      const userDetails = await this.userRepository.getUserDetails(user_id);
      if (!userDetails) {
        return {
          success: false,
          message: 'User not found',
        };
      }

      const payload = {
        email: userDetails.email,
        sub: userDetails.id,
        type: userDetails.type,
      };
      const accessToken = this.jwtService.sign(payload, { expiresIn: '1h' });

      return {
        success: true,
        authorization: {
          type: 'bearer',
          access_token: accessToken,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async revokeRefreshToken(user_id: string) {
    try {
      const storedToken = await this.redis.get(`refresh_token:${user_id}`);
      if (!storedToken) {
        return {
          success: false,
          message: 'Refresh token not found',
        };
      }

      await this.redis.del(`refresh_token:${user_id}`);

      return {
        success: true,
        message: 'Refresh token revoked successfully',
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async requestEmailChange(user_id: string, email: string) {
    try {
      const user = await this.userRepository.getUserDetails(user_id);
      if (user) {
        const token = await this.ucodeRepository.createToken({
          userId: user.id,
          isOtp: true,
          email: email,
        });

        await this.mailService.sendOtpCodeToEmail({
          email: email,
          name: email,
          otp: token,
        });

        return {
          success: true,
          message: 'We have sent an OTP code to your email',
        };
      } else {
        return {
          success: false,
          message: 'User not found',
        };
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async changeEmail({
    user_id,
    new_email,
    token,
  }: {
    user_id: string;
    new_email: string;
    token: string;
  }) {
    try {
      const user = await this.userRepository.getUserDetails(user_id);

      if (user) {
        const existToken = await this.ucodeRepository.validateToken({
          email: new_email,
          token: token,
          forEmailChange: true,
        });

        if (existToken) {
          await this.userRepository.changeEmail({
            user_id: user.id,
            new_email: new_email,
          });

          // delete otp code
          await this.ucodeRepository.deleteToken({
            email: new_email,
            token: token,
          });

          return {
            success: true,
            message: 'Email updated successfully',
          };
        } else {
          return {
            success: false,
            message: 'Invalid token',
          };
        }
      } else {
        return {
          success: false,
          message: 'User not found',
        };
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async validateUser(
    email: string,
    pass: string,
    token?: string,
  ): Promise<any> {
    const _password = pass;
    const user = await this.prisma.user.findFirst({
      where: {
        email: email,
      },
    });

    if (user) {
      const _isValidPassword = await this.userRepository.validatePassword({
        email: email,
        password: _password,
      });
      if (_isValidPassword) {
        // Check if email is verified
        if (!user.email_verified_at) {
          throw new UnauthorizedException(
            'Please verify your email before logging in',
          );
        }
        const { password, ...result } = user;
        if (user.is_two_factor_enabled) {
          if (token) {
            const isValid = await this.userRepository.verify2FA(user.id, token);
            if (!isValid) {
              throw new UnauthorizedException('Invalid token');
              // return {
              //   success: false,
              //   message: 'Invalid token',
              // };
            }
          } else {
            throw new UnauthorizedException('Token is required');
            // return {
            //   success: false,
            //   message: 'Token is required',
            // };
          }
        }
        return result;
      } else {
        throw new UnauthorizedException('Password not matched');
        // return {
        //   success: false,
        //   message: 'Password not matched',
        // };
      }
    } else {
      throw new UnauthorizedException('Email not found');
      // return {
      //   success: false,
      //   message: 'Email not found',
      // };
    }
  }

  // --------- 2FA ---------
  async generate2FASecret(user_id: string) {
    try {
      return await this.userRepository.generate2FASecret(user_id);
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async verify2FA(user_id: string, token: string) {
    try {
      const isValid = await this.userRepository.verify2FA(user_id, token);
      if (!isValid) {
        return {
          success: false,
          message: 'Invalid token',
        };
      }
      return {
        success: true,
        message: '2FA verified successfully',
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async enable2FA(user_id: string) {
    try {
      const user = await this.userRepository.getUserDetails(user_id);
      if (user) {
        await this.userRepository.enable2FA(user_id);
        return {
          success: true,
          message: '2FA enabled successfully',
        };
      } else {
        return {
          success: false,
          message: 'User not found',
        };
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async disable2FA(user_id: string) {
    try {
      const user = await this.userRepository.getUserDetails(user_id);
      if (user) {
        await this.userRepository.disable2FA(user_id);
        return {
          success: true,
          message: '2FA disabled successfully',
        };
      } else {
        return {
          success: false,
          message: 'User not found',
        };
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
  // --------- end 2FA ---------


  // Firebase Google Authentication
  async firebaseGoogleAuth(idToken: string, fcm_token?: string) {
    try {
      // Verify the Firebase ID token
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const { uid, email, name, picture } = decodedToken;

      if (!email) {
        throw new UnauthorizedException("Email not found in Firebase token");
      }

      // Check if user already exists
      let user = await this.prisma.user.findUnique({
        where: { email: email },
      });

      // If user doesn't exist, create a new user
      if (!user) {
        const nameParts = name ? name.split(" ") : ["", ""];
        const firstName = nameParts[0] || "";
        const lastName = nameParts.slice(1).join(" ") || "";

        user = await this.prisma.user.create({
          data: {
            email: email,
            first_name: firstName,
            last_name: lastName,
            avatar: picture || null,
            googleId: uid,
            email_verified_at: new Date(),
            status: 1,
            type: 'MAID',
          },
        });

        // Create Stripe customer
        const stripeCustomer = await StripePayment.createCustomer({
          user_id: user.id,
          name: name || email,
          email: email,
        });

        if (stripeCustomer) {
          await this.prisma.user.update({
            where: { id: user.id },
            data: { billing_id: stripeCustomer.id },
          });
        }
      } else if (!user.googleId) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: {
            googleId: uid,
            avatar: user.avatar || picture || null,
          },
        });
      }

      // Update FCM token if provided
      if (fcm_token) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { fcm_token: fcm_token },
        });
      }

      // Generate JWT tokens
      const payload = { email: user.email, sub: user.id };
      const accessToken = this.jwtService.sign(payload, { expiresIn: "1h" });
      const refreshToken = this.jwtService.sign(payload, { expiresIn: "7d" });

      // Store refresh token in Redis
      await this.redis.set(
        `refresh_token:${user.id}`,
        refreshToken,
        "EX",
        60 * 60 * 24 * 7, // 7 days
      );

      const avatarUrl = user.avatar
        ? TanvirStorage.url(appConfig().storageUrl.avatar + '/' + user.avatar)
        : null;

      return {
        success: true,
        message: "Logged in successfully via Firebase",
        authorization: {
          type: "bearer",
          access_token: accessToken,
          refresh_token: refreshToken,
        },
        user: {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          avatar_url: avatarUrl,
          type: user.type,
        },
      };
    } catch (error: any) {
      throw new UnauthorizedException(
        `Firebase authentication failed: ${error.message}`,
      );
    }
  }

  // Firebase Apple Authentication
  async firebaseAppleAuth(idToken: string, fcm_token?: string) {
    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const { uid, email, name, picture } = decodedToken;

      if (!email) {
        throw new UnauthorizedException("Email not found in Firebase token");
      }

      let user = await this.prisma.user.findUnique({ where: { email } });

      if (!user) {
        const nameParts = name ? name.split(" ") : ["", ""];
        const firstName = nameParts[0] || "";
        const lastName = nameParts.slice(1).join(" ") || "";

        user = await this.prisma.user.create({
          data: {
            email,
            first_name: firstName,
            last_name: lastName,
            avatar: picture || null,
            apple_id: uid,
            email_verified_at: new Date(),
            status: 1,
            type: 'MAID',
          },
        });

        const stripeCustomer = await StripePayment.createCustomer({
          user_id: user.id,
          name: name || email,
          email,
        });

        if (stripeCustomer) {
          await this.prisma.user.update({
            where: { id: user.id },
            data: { billing_id: stripeCustomer.id },
          });
        }
      } else if (!user.apple_id) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: {
            apple_id: uid,
            avatar: user.avatar || picture || null,
          },
        });
      }

      if (fcm_token) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { fcm_token },
        });
      }

      const payload = { email: user.email, sub: user.id };
      const accessToken = this.jwtService.sign(payload, { expiresIn: "1h" });
      const refreshToken = this.jwtService.sign(payload, { expiresIn: "7d" });

      await this.redis.set(
        `refresh_token:${user.id}`,
        refreshToken,
        "EX",
        60 * 60 * 24 * 7,
      );

      const avatarUrl = user.avatar
        ? TanvirStorage.url(appConfig().storageUrl.avatar + '/' + user.avatar)
        : null;

      return {
        success: true,
        message: "Logged in successfully via Firebase (Apple)",
        authorization: {
          type: "bearer",
          access_token: accessToken,
          refresh_token: refreshToken,
        },
        user: {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          avatar_url: avatarUrl,
          type: user.type,
        },
      };
    } catch (error: any) {
      throw new UnauthorizedException(
        `Firebase authentication failed: ${error.message}`,
      );
    }
  }

}

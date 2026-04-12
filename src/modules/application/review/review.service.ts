import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { PrismaService } from 'src/prisma/prisma.service';

import { TanvirStorage } from 'src/common/lib/Disk/TanvirStorage';
import appConfig from 'src/config/app.config';

@Injectable()
export class ReviewService {
  
  constructor(private readonly prisma: PrismaService) {}

  // Create a review for a booking
  async create(
    homeownerId: string, 
    createReviewDto: CreateReviewDto
  ) {
   
   const booking = await this.prisma.booking.findUnique({
      where: { id: createReviewDto.booking_id },
      select: {
        id: true,
        maid_id: true,
        user_id: true,
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.user_id !== homeownerId) {
      throw new ForbiddenException(
        'You are not allowed to review this booking',
      );
    }

    const existingReview = await this.prisma.review.findFirst({
      where: {
        booking_id: booking.id,
        homeowner_id: homeownerId,
      },
      select: { id: true },
    });

    if (existingReview) {
      throw new ConflictException(
        'You have already submitted a review for this booking',
      );
    }

    const review = await this.prisma.review.create({
      data: {
        booking_id: booking.id,
        homeowner_id: homeownerId,
        maid_id: booking.maid_id,
        rating: createReviewDto.rating,
        comment: createReviewDto.comment,
      },
    });

    return {
      success: true,
      message: 'Review created successfully',
      data: review,
    };
  }

  // Update a review by ID
  async update(
    id: string,
    homeownerId: string,
    updateReviewDto: UpdateReviewDto,
  ) {
    const existingReview = await this.prisma.review.findUnique({
      where: { id },
      select: {
        id: true,
        homeowner_id: true,
      },
    });

    if (!existingReview) {
      throw new NotFoundException('Review not found');
    }

    if (existingReview.homeowner_id !== homeownerId) {
      throw new ForbiddenException('You are not allowed to update this review');
    }

    const review = await this.prisma.review.update({
      where: { id },
      data: {
        rating: updateReviewDto.rating,
        comment: updateReviewDto.comment,
      }
    });

    return {
      success: true,
      message: 'Review updated successfully',
      data: review,
    };
  }

  // Delete a review  
  async remove(id: string, homeownerId: string) {
    
    const existingReview = await this.prisma.review.findUnique({
      where: { id },
      select: {
        id: true,
        homeowner_id: true,
      },
    });

    if (!existingReview) {
      throw new NotFoundException('Review not found');
    }

    if (existingReview.homeowner_id !== homeownerId) {
      throw new ForbiddenException('You are not allowed to delete this review');
    }

    const deletedReview = await this.prisma.review.delete({
      where: { id },
    });

    return {
      success: true,
      message: 'Review deleted successfully',
      data: deletedReview,
    };
  }

  // get reviews for a maid
  async getReviewsForMaid(maidId: string) {
    const reviews = await this.prisma.review.findMany({
      where: {
        maid_id: maidId,
      },
      include: {
        homeowner: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        booking: {
          include: {
            general_cleaning_package: {
              select: {
                title: true,
              },
            },
            deep_cleaning_package: {
              select: {
                title: true,
              },
            },
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    const data = reviews.map((review) => {
      const serviceTitle =
        review.booking.general_cleaning_package?.title ||
        review.booking.deep_cleaning_package?.title ||
        'Cleaning Service';

      return {
        id: review.id,
        reviewer_name: review.homeowner?.name,
        reviewer_avatar_url: review.homeowner?.avatar
          ? TanvirStorage.url(
              appConfig().storageUrl.avatar + '/' + review.homeowner.avatar,
            )
          : null,
        service_title: serviceTitle,
        review_date: review.created_at,
        rating: review.rating ?? 0,
        comment: review.comment,
      };
    });

    return {
      success: true,
      message: 'Reviews retrieved successfully',
      data,
    };
  }

  

}

import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class ReviewService {
  constructor(private readonly prisma: PrismaService) {}

  async create(homeownerId: string, createReviewDto: CreateReviewDto) {
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
      throw new ForbiddenException('You are not allowed to review this booking');
    }

    try {
      const review = await this.prisma.review.create({
        data: {
          booking_id: booking.id,
          homeowner_id: homeownerId,
          maid_id: booking.maid_id,
          rating: createReviewDto.rating,
          comment: createReviewDto.comment,
        },
        include: {
          booking: true,
          homeowner: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
          maid: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
        },
      });

      return {
        success: true,
        message: 'Review created successfully',
        data: review,
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Review already exists for this booking');
      }

      throw error;
    }
  }

  async findAll() {
    const reviews = await this.prisma.review.findMany({
      include: {
        booking: true,
        homeowner: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        maid: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    return {
      success: true,
      message: 'Reviews retrieved successfully',
      data: reviews,
    };
  }

  async findOne(id: string) {
    const review = await this.prisma.review.findUnique({
      where: { id },
      include: {
        booking: true,
        homeowner: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        maid: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    return {
      success: true,
      message: 'Review retrieved successfully',
      data: review,
    };
  }

  async update(id: string, homeownerId: string, updateReviewDto: UpdateReviewDto) {
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
      },
      include: {
        booking: true,
        homeowner: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        maid: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    return {
      success: true,
      message: 'Review updated successfully',
      data: review,
    };
  }

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
}

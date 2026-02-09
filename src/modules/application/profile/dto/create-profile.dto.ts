import { IsEnum, IsOptional, IsString } from "class-validator";

export class CreateProfileDto {

    @IsString()
    @IsOptional()
    location?: string;

    @IsString()
    @IsOptional()
    bio?: string;

    @IsString()
    @IsOptional()
    @IsEnum(['GENERAL_CLEANING', 'DEEP_CLEANING'])
    service_type?: string;
}

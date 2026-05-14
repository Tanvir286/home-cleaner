import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class FirebaseAuthDto {
  @IsString()
  @IsNotEmpty()
  idToken: string;

  @IsOptional()
  @IsString()
  fcm_token?: string;
}

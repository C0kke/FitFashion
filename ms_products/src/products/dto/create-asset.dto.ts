import { IsString, IsEnum, IsNumber, IsOptional } from 'class-validator';
import { ViewType } from '../entities/builder-asset.entity';

export class CreateAssetDto {
  @IsEnum(ViewType)
  viewType: ViewType; // 'front', 'back', o 'flat'
}
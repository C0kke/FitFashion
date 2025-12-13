import { IsString, IsNumber, IsArray, ValidateNested, IsOptional, Min, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateAssetDto } from './create-asset.dto'; 

export class CreateProductDto {
  @IsString()
  name: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsInt({ message: "El stock debe ser un número entero" })
  @Min(0, { message: "El stock no puede ser negativo" })
  stock: number;

  @IsString()
  description: string;

  @IsArray()
  @IsString({ each: true })
  categories: string[];

  @IsArray()
  @IsString({ each: true })
  styles: string[];

  @IsNumber()
  @IsOptional()
  layerIndex?: number;

  @IsArray()
  @IsString({ each: true })
  galleryImages: string[];

  @IsArray()
  @ValidateNested({ each: true }) 
  @Type(() => CreateAssetDto)
  builderAssets: CreateAssetDto[];
}
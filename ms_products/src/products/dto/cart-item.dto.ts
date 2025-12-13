import { IsUUID, IsInt, Min, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CartItemDto {
  @IsUUID()
  productId: string;

  @IsInt()
  @Min(1) 
  quantity: number;
}
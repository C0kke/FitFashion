import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { CloudinaryModule } from '../cloudinary/cloudinary.module'; 

@Module({
  imports: [
    TypeOrmModule.forFeature([Product]),
    CloudinaryModule, 
  ],
  controllers: [ProductsController],
  providers: [ProductsService],
})
export class ProductsModule {}
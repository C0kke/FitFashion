import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { BuilderAsset } from './entities/builder-asset.entity';
import { CloudinaryModule } from '../cloudinary/cloudinary.module'; // <--- IMPORTANTE

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, BuilderAsset]),
    CloudinaryModule, 
  ],
  controllers: [ProductsController],
  providers: [ProductsService],
})
export class ProductsModule {}
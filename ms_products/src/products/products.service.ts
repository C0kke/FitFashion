import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Product } from './entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { BuilderAsset } from './entities/builder-asset.entity';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async createWithImages(createProductDto: CreateProductDto, files: { galleryImages?: Express.Multer.File[], assetImage?: Express.Multer.File[] }) {
    const { galleryImages, assetImage } = files || {};
    
    // 1. Subir Galería
    const galleryUrls: string[] = [];
    if (galleryImages && galleryImages.length > 0) {
      const uploadPromises = galleryImages.map(file => this.cloudinaryService.uploadImage(file));
      const results = await Promise.all(uploadPromises);
      results.forEach(res => galleryUrls.push(res.secure_url));
    }

    // 2. Subir Assets/Outfit
    const finalBuilderAssets: Partial<BuilderAsset>[] = [];

    if (assetImage && assetImage.length > 0) {

      // Recorremos cada archivo de asset que llegó
      for (let i = 0; i < assetImage.length; i++) {
        const file = assetImage[i];
        //Subir a Cloudinary
        const result = await this.cloudinaryService.uploadImage(file);
        
        // Buscar la info asociada
        const assetInfo = createProductDto.builderAssets && createProductDto.builderAssets[i] ? createProductDto.builderAssets[i] : null;

        if (assetInfo) {
          finalBuilderAssets.push({imageUrl: result.secure_url, viewType: assetInfo.viewType,});
        }
      }
    }

    // 3. Crear el Producto
    const productData = {...createProductDto, galleryImages: galleryUrls, builderAssets: finalBuilderAssets};
    const product = this.productRepo.create(productData);
    return await this.productRepo.save(product);
  }

  async findAll() { return await this.productRepo.find(); }
  
  async findOne(id: string) {
    const product = await this.productRepo.findOneBy({ id });
    if (!product) throw new NotFoundException(`Producto ${id} no encontrado`);
    return product;
  }

  async calculateOutfitPrice(productIds: string[]) {
    if (!productIds || productIds.length === 0) return { totalPrice: 0 };
    const products = await this.productRepo.findBy({ id: In(productIds) });
    const total = products.reduce((sum, item) => sum + Number(item.price), 0);
    return { totalPrice: total, items: products };
  }

  async decreaseStock(id: string, quantity: number) {
    const product = await this.productRepo.findOneBy({ id });

    if (!product) {
      throw new NotFoundException(`Producto con ID ${id} no encontrado`);
    }
    if (product.stock < quantity) {
      throw new BadRequestException(`No hay suficiente stock. Solicitado: ${quantity}, Disponible: ${product.stock}`);
    }
    product.stock -= quantity;
    
    return await this.productRepo.save(product);
  } 

  async update(id: string, updateProductDto: UpdateProductDto) {

    const product = await this.productRepo.preload({id: id, ...updateProductDto,});
    if (!product) {throw new NotFoundException(`Producto con ID ${id} no encontrado`);}
    return await this.productRepo.save(product);
    
  }

  async validateStock(items: { productId: string; quantity: number }[]) {

    const productIds = items.map((item) => item.productId);
    const products = await this.productRepo.findBy({id: In(productIds),});

    for (const item of items) {
      const product = products.find((p) => p.id === item.productId);

      if (!product) {
        return { valid: false, message: `Producto ${item.productId} no encontrado` };
      }

      if (product.stock < item.quantity) {
        return { valid: false, message: `Stock insuficiente para ${product.name}. Solicitado: ${item.quantity}, Disponible: ${product.stock}` };
      }
    }

    return { valid: true, message: 'Stock disponible' };
  }

  async calculateCartDetails(items: { productId: string; quantity: number }[]) {
    const productIds = items.map((item) => item.productId);

    if (productIds.length === 0) return { totalPrice: 0, items: [] };

    const products = await this.productRepo.findBy({ id: In(productIds) });
    let total = 0;
    const details: { productId: string; nameSnapshot: string; unitPrice: number; quantity: number; subtotal: number }[] = [];

    for (const item of items) {
      const product = products.find((p) => p.id === item.productId);
      
      if (!product) continue; 
      
      const subtotal = product.price * item.quantity;
      total += subtotal;

      details.push({
        productId: product.id,
        nameSnapshot: product.name,
        unitPrice: product.price,
        quantity: item.quantity,
        subtotal: subtotal
      });
    }

    return {totalPrice: total,items: details};
  }

  async decreaseStockBatch(items: { productId: string; quantity: number }[]) {
    const productIds = items.map((item) => item.productId);
    const products = await this.productRepo.findBy({ id: In(productIds) });

    for (const item of items) {
      const product = products.find((p) => p.id === item.productId);
      if (!product) throw new NotFoundException(`Producto ${item.productId} no encontrado`);
      if (product.stock < item.quantity) throw new BadRequestException(`Stock insuficiente para el producto ${item.productId}`);
    }

    const savePromises = items.map(async (item) => {
      const product = products.find((p) => p.id === item.productId);
      if (!product) return; 

      product.stock -= item.quantity;
      return this.productRepo.save(product);
    });

    await Promise.all(savePromises);
    return { success: true, message: 'Stock actualizado correctamente' };
  }

}
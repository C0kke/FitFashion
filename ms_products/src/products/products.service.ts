import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Product } from './entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { UpdateProductDto } from './dto/update-product.dto';
import { FilterProductDto } from './dto/filter-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async create(createProductDto: CreateProductDto) {
    const product = this.productRepo.create(createProductDto);
    return await this.productRepo.save(product);
  }

  async createWithImages(createProductDto: CreateProductDto, files: { galleryImages?: Express.Multer.File[], assetImage?: Express.Multer.File[] }) {
    const { galleryImages, assetImage } = files || {};
    
    if (!assetImage || assetImage.length === 0) {
        throw new BadRequestException('La imagen para el maniquí es obligatoria');
    }

    // 2. Subir Galería
    const galleryUrls: string[] = [];
    if (galleryImages && galleryImages.length > 0) {
      const uploadPromises = galleryImages.map(file => this.cloudinaryService.uploadImage(file));
      const results = await Promise.all(uploadPromises);
      results.forEach(res => galleryUrls.push(res.secure_url));
    }

    // 3. Subir Asset del Maniquí
    const builderResult = await this.cloudinaryService.uploadImage(assetImage[0]);
    const builderImageUrl = builderResult.secure_url; 

    // 4. Crear el Producto
    const productData = {
        ...createProductDto, 
        galleryImages: galleryUrls, 
        builderImage: builderImageUrl 
    };

    const product = this.productRepo.create(productData);
    return await this.productRepo.save(product);
  }

  async findAll(filters: FilterProductDto = {}) {
    const query = this.productRepo.createQueryBuilder('product');

    if (filters.category) {
      query.where(':category = ANY(product.categories)', { category: filters.category });
    }

    return await query.getMany();
  }
  
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
    console.log('   🔍 [Service] Iniciando validación. Cantidad de items:', items?.length);

    if (!items || items.length === 0) {
        console.log('   ⚠️ [Service] Lista vacía. Retornando false.');
        return { valid: false, message: 'La lista de items está vacía' };
    }

    try {
      const productIds = items.map((item) => item.productId);
      console.log('   📡 [Service] Buscando en DB IDs:', productIds);
      
      // LOG CRÍTICO 1: Antes de la DB
      const products = await this.productRepo.findBy({
        id: In(productIds),
      });
      // LOG CRÍTICO 2: Después de la DB
      console.log(`   📦 [Service] DB respondió. Productos encontrados: ${products.length}`);

      for (const item of items) {
        const product = products.find((p) => p.id === item.productId);

        if (!product) {
          console.log(`   ❌ [Service] Producto no encontrado: ${item.productId}`);
          return { valid: false, message: `Producto ${item.productId} no encontrado` };
        }

        console.log(`   ⚖️ [Service] Revisando ${product.name}. Stock: ${product.stock}, Pedido: ${item.quantity}`);

        if (product.stock < item.quantity) {
          console.log('   ⛔ [Service] Stock insuficiente.');
          return { 
            valid: false, 
            message: `Stock insuficiente para ${product.name}. Solicitado: ${item.quantity}, Disponible: ${product.stock}` 
          };
        }
      }

      console.log('   ✅ [Service] Todo OK. Stock disponible.');
      return { valid: true, message: 'Stock disponible' };

    } catch (error) {
      console.error("   💥 [Service] ERROR FATAL en DB o Lógica:", error);
      throw new Error("Error consultando base de datos de productos");
    }
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
    const productsToSave: Product[] = [];

    for (const item of items) {
      const product = products.find((p) => p.id === item.productId);

      if (!product) throw new NotFoundException(`Producto ${item.productId} no encontrado`);

      if (product.stock < item.quantity) {
          throw new BadRequestException(
            `Stock insuficiente para ${product.name}. Solicitado: ${item.quantity}, Disponible: ${product.stock}`
          );
      }

      product.stock -= item.quantity;
      productsToSave.push(product);
    }

    await this.productRepo.save(productsToSave);
    return { success: true, message: 'Stock actualizado correctamente' };
  }

}
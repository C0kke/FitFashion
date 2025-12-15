import { Controller, Get, Post, Body, Param, UploadedFiles, UseInterceptors, BadRequestException, Patch, ParseUUIDPipe } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { UpdateProductDto } from './dto/update-product.dto';
import { ParseArrayPipe } from '@nestjs/common';
import { CartItemDto } from './dto/cart-item.dto';
import { FilterProductDto } from './dto/filter-product.dto';
import { MessagePattern, Payload, RpcException } from '@nestjs/microservices';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @UseInterceptors(FileFieldsInterceptor([{ name: 'galleryImages', maxCount: 5 }, { name: 'assetImage', maxCount: 1 },]))
  async create(@UploadedFiles() files: { galleryImages?: Express.Multer.File[], assetImage?: Express.Multer.File[] }, @Body('data') dataString: string,) {
    
    if (!dataString) throw new BadRequestException('El campo "data"  es requerido');
    
    let createProductDto: CreateProductDto;
    try {
      createProductDto = JSON.parse(dataString);
    } catch (error) {
      throw new BadRequestException('Formato JSON inválido en el campo "data"');
    }

    return this.productsService.createWithImages(createProductDto, files);
  }

  @Get()
  findAll() {
    return this.productsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Post('outfit-price')
  getOutfitPrice(@Body('ids') productIds: string[]) {
    return this.productsService.calculateOutfitPrice(productIds);
  }

  @Patch(':id/decrease-stock')
  async decreaseStock(@Param('id') id: string, @Body('quantity') quantity: number,) {
    if (!quantity || quantity <= 0) {
      throw new BadRequestException('La cantidad debe ser mayor a 0');
    }
    return this.productsService.decreaseStock(id, quantity);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() updateProductDto: UpdateProductDto) {
    return this.productsService.update(id, updateProductDto);
  }

  @Post('validate-availability')
  async validateStockForCart(@Body(new ParseArrayPipe({ items: CartItemDto })) items: CartItemDto[]) {
    return this.productsService.validateStock(items);
  }

  @Post('calculate-cart')
  async calculateCart(@Body(new ParseArrayPipe({ items: CartItemDto })) items: CartItemDto[]) {
    return this.productsService.calculateCartDetails(items);
  }

  @Post('confirm-purchase')
  async confirmPurchase(@Body(new ParseArrayPipe({ items: CartItemDto })) items: CartItemDto[]) {
    return this.productsService.decreaseStockBatch(items);
  }

  // ======================================================
  //  ESCUCHA DE RABBITMQ
  // ======================================================

  // Validación de stock
  @MessagePattern('validate_stock')
  async handleValidateStock(@Payload() data: CartItemDto[]) {
    console.log('RabbitMQ: Validando stock', data);
    return this.productsService.validateStock(data);
  }

  // Cálculo de carrito
  @MessagePattern('calculate_cart')
  async handleCalculateCart(@Payload() data: CartItemDto[]) {
    console.log('RabbitMQ: Calculando carrito', data);
    return this.productsService.calculateCartDetails(data);
  }

  // Confirmación de compra - Restar stock
  @MessagePattern('decrease_stock')
  async handleDecreaseStock(@Payload() data: CartItemDto[]) {
    console.log('RabbitMQ: Compra confirmada, restando stock', data);
    return this.productsService.decreaseStockBatch(data);
  }

  // Para calcular precio del outfit de maniqui (recibe lista de ids)
  @MessagePattern('calculate_outfit_price')
  async handleCalculateOutfit(@Payload() data: string[]) {
    console.log('RabbitMQ: Calculando outfit:', data);
     return this.productsService.calculateOutfitPrice(data);
  }

  // Obtener productos (Con opción de filtrar por categoría)
  @MessagePattern('find_all_products')
  async handleFindAll(@Payload() filters: FilterProductDto) {
    console.log('RabbitMQ: Buscando productos con filtro:', filters.category);
    return this.productsService.findAll(filters); 
  }

  // Obtener UN producto (Para el Modal de Detalle)
  @MessagePattern('find_one_product')
  async handleFindOne(@Payload() id: string) {
    console.log('RabbitMQ: Buscando detalle del ID:', id);
    const product = await this.productsService.findOne(id);
    if (!product) throw new RpcException({ status: 404, message: 'Producto no encontrado' });
  
    return product;
  }


}
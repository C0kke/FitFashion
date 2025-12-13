import { Controller, Get, Post, Body, Param, UploadedFiles, UseInterceptors, BadRequestException, Patch, ParseUUIDPipe } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { UpdateProductDto } from './dto/update-product.dto';
import { ParseArrayPipe } from '@nestjs/common';
import { CartItemDto } from './dto/cart-item.dto';
import { MessagePattern, Payload } from '@nestjs/microservices';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @UseInterceptors(FileFieldsInterceptor([{ name: 'galleryImages', maxCount: 5 }, { name: 'assetImage', maxCount: 3 },]))
  async create(@UploadedFiles() files: { galleryImages?: Express.Multer.File[], assetImage?: Express.Multer.File[] }, @Body('data') dataString: string,) {
    if (!dataString) {
      throw new BadRequestException('El campo "data"  es requerido');
    }

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
  //  ESCUCHA DE RABBITMQ (Para el MS_CART en Go)
  // ======================================================

  // 1. Escuchar solicitud de validación de stock
  // Pattern: "validate_stock"
  @MessagePattern('validate_stock')
  async handleValidateStock(@Payload() data: any) {
    // data llega como el array de productos
    console.log('RabbitMQ: Validando stock', data);
    return this.productsService.validateStock(data);
  }

  // 2. Escuchar solicitud de cálculo de carrito
  // Pattern: "calculate_cart"
  @MessagePattern('calculate_cart')
  async handleCalculateCart(@Payload() data: any) {
    console.log('RabbitMQ: Calculando carrito', data);
    return this.productsService.calculateCartDetails(data);
  }

  // 3. Escuchar confirmación de compra (Restar Stock)
  // Pattern: "decrease_stock"
  @MessagePattern('decrease_stock')
  async handleDecreaseStock(@Payload() data: any) {
    console.log('RabbitMQ: Compra confirmada, restando stock', data);
    return this.productsService.decreaseStockBatch(data);
  }
}
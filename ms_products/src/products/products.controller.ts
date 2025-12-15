import { Controller, Get, Post, Body, Param, UploadedFiles, UseInterceptors, BadRequestException, Patch, ParseUUIDPipe } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { UpdateProductDto } from './dto/update-product.dto';
import { ParseArrayPipe } from '@nestjs/common';
import { CartItemDto } from './dto/cart-item.dto';
import { FilterProductDto } from './dto/filter-product.dto';
import { MessagePattern, Payload, Ctx, RmqContext } from '@nestjs/microservices'; 

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // --- Endpoints HTTP (Sin cambios) ---
  @Post()
  @UseInterceptors(FileFieldsInterceptor([{ name: 'galleryImages', maxCount: 5 }, { name: 'assetImage', maxCount: 1 },]))
  async create(@UploadedFiles() files: { galleryImages?: Express.Multer.File[], assetImage?: Express.Multer.File[] }, @Body('data') dataString: string,) {
    if (!dataString) throw new BadRequestException('El campo "data" es requerido');
    let createProductDto: CreateProductDto;
    try { createProductDto = JSON.parse(dataString); } catch (error) { throw new BadRequestException('Formato JSON inválido'); }
    return this.productsService.createWithImages(createProductDto, files);
  }

  @Get()
  findAll() { return this.productsService.findAll(); }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.productsService.findOne(id); }

  @Post('outfit-price')
  getOutfitPrice(@Body('ids') productIds: string[]) { return this.productsService.calculateOutfitPrice(productIds); }

  @Patch(':id/decrease-stock')
  async decreaseStock(@Param('id') id: string, @Body('quantity') quantity: number,) {
    if (!quantity || quantity <= 0) throw new BadRequestException('Cantidad debe ser > 0');
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
  //  ESCUCHA DE RABBITMQ (MODO MANUAL - SIN EMOJIS)
  // ======================================================

  // 1. Obtener TODOS los productos
  @MessagePattern('find_all_products')
  async handleFindAll(@Payload() filters: FilterProductDto, @Ctx() context: RmqContext) {
    await this.replyManual(context, async () => {
      console.log('[RabbitMQ] Buscando productos...');
      return await this.productsService.findAll(filters);
    });
  }

  // 2. Obtener UN producto
  @MessagePattern('find_one_product')
  async handleFindOne(@Payload() id: string, @Ctx() context: RmqContext) {
    await this.replyManual(context, async () => {
      console.log(`[RabbitMQ] Buscando detalle ID: ${id}`);
      return await this.productsService.findOne(id);
    });
  }

  // 3. Validar Stock (Refactorizado y Limpio)
  @MessagePattern('validate_stock')
  async handleValidateStock(@Payload() data: CartItemDto[], @Ctx() context: RmqContext) {
    await this.replyManual(context, async () => {
      console.log('➡️ [Controller] Validando Stock:', JSON.stringify(data));
      // El servicio ya retorna { valid: boolean, message: string }
      // No hace falta envolverlo más, así es compatible con tu Gateway actual
      return await this.productsService.validateStock(data);
    });
  }

  // 4. Calcular Carrito
  @MessagePattern('calculate_cart')
  async handleCalculateCart(@Payload() data: CartItemDto[], @Ctx() context: RmqContext) {
    await this.replyManual(context, async () => {
      console.log('[RabbitMQ] Calculando carrito...');
      return await this.productsService.calculateCartDetails(data);
    });
  }

  // 5. Restar Stock (Compra)
  @MessagePattern('decrease_stock')
  async handleDecreaseStock(@Payload() data: CartItemDto[], @Ctx() context: RmqContext) {
    await this.replyManual(context, async () => {
      console.log('[RabbitMQ] Restando stock...');
      return await this.productsService.decreaseStockBatch(data);
    });
  }

  // 6. Calcular Outfit Maniquí
  @MessagePattern('calculate_outfit_price')
  async handleCalculateOutfit(@Payload() data: string[], @Ctx() context: RmqContext) {
    await this.replyManual(context, async () => {
      console.log('[RabbitMQ] Calculando outfit...');
      return await this.productsService.calculateOutfitPrice(data);
    });
  }

  // ============================================================
  // 🔥 EL MOTOR MÁGICO (Mejorado con ACKs)
  // ============================================================
  private async replyManual(context: RmqContext, action: () => Promise<any>) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();
    const { replyTo, correlationId } = originalMsg.properties;

    try {
      // 1. Ejecutar la lógica del servicio
      const result = await action();
      
      // 2. Si hay quien espera respuesta (RPC pattern), respondemos
      if (replyTo && correlationId) {
        console.log(`📤 [RabbitMQ] Respondiendo a ${replyTo}`);
        channel.sendToQueue(
          replyTo, 
          Buffer.from(JSON.stringify(result)), 
          { correlationId }
        );
      }

      // 3. IMPORTANTE: Confirmar a RabbitMQ que procesamos el mensaje
      channel.ack(originalMsg);

    } catch (error) {
      console.error("❌ [RabbitMQ] Error procesando:", error.message);
      
      // Si falla, enviamos el error al cliente para que no se quede esperando timeout
      if (replyTo && correlationId) {
        const errorResponse = { 
            status: 'error', 
            message: error.message || 'Internal Server Error' 
        };
        
        channel.sendToQueue(
          replyTo, 
          Buffer.from(JSON.stringify(errorResponse)), 
          { correlationId }
        );
      }
      
      // Aún con error, damos ACK para sacar el mensaje de la cola (ya se intentó y falló)
      channel.ack(originalMsg);
    }
  
  }
}
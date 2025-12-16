import { Test, TestingModule } from '@nestjs/testing';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { BadRequestException } from '@nestjs/common';
import { RmqContext } from '@nestjs/microservices';

describe('ProductsController', () => {
  let controller: ProductsController;
  let service: ProductsService;

  // 1. MOCK DEL SERVICIO (Simulamos que todo sale bien)
  const mockProductsService = {
    createWithImages: jest.fn().mockResolvedValue({ id: '1', name: 'Test' }),
    create: jest.fn().mockResolvedValue({ id: '1', name: 'RabbitProduct' }),
    findAll: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue({ id: '1' }),
    calculateOutfitPrice: jest.fn().mockResolvedValue({ totalPrice: 1000 }),
    decreaseStock: jest.fn().mockResolvedValue({ id: '1', stock: 10 }),
    update: jest.fn().mockResolvedValue({ id: '1', updated: true }),
    validateStock: jest.fn().mockResolvedValue({ valid: true }),
    calculateCartDetails: jest.fn().mockResolvedValue({ totalPrice: 100 }),
    decreaseStockBatch: jest.fn().mockResolvedValue({ success: true }),
  };

  // 2. MOCK DEL CONTEXTO DE RABBITMQ (Para probar replyManual)
  const mockRmqContext = {
    getChannelRef: jest.fn().mockReturnValue({
      sendToQueue: jest.fn(),
      ack: jest.fn(),
    }),
    getMessage: jest.fn().mockReturnValue({
      properties: { replyTo: 'reply-queue', correlationId: '123' },
      content: {},
    }),
  } as unknown as RmqContext;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        {
          provide: ProductsService,
          useValue: mockProductsService,
        },
      ],
    }).compile();

    controller = module.get<ProductsController>(ProductsController);
    service = module.get<ProductsService>(ProductsService);
  });

  // --- TESTS DE ENDPOINTS HTTP ---
  describe('Endpoints HTTP', () => {
    it('create (HTTP) debería llamar a createWithImages', async () => {
      const files: any = { galleryImages: [], assetImage: [] };
      const body = JSON.stringify({ name: 'Test' });
      await controller.create(files, body);
      expect(service.createWithImages).toHaveBeenCalled();
    });

    it('create (HTTP) debería fallar con JSON inválido', async () => {
      await expect(controller.create({}, 'invalid-json'))
        .rejects.toThrow(BadRequestException);
    });

    it('findAll debería llamar al servicio', async () => {
      await controller.findAll();
      expect(service.findAll).toHaveBeenCalled();
    });

    it('findOne debería llamar al servicio', async () => {
      await controller.findOne('1');
      expect(service.findOne).toHaveBeenCalledWith('1');
    });

    it('decreaseStock debería llamar al servicio', async () => {
      await controller.decreaseStock('1', 5);
      expect(service.decreaseStock).toHaveBeenCalledWith('1', 5);
    });

    it('update debería llamar al servicio', async () => {
      await controller.update('1', {});
      expect(service.update).toHaveBeenCalled();
    });
  });

  // --- TESTS DE RABBITMQ (Para cubrir replyManual y handlers) ---
  describe('RabbitMQ Handlers', () => {
    it('handleCreateProduct debería procesar y hacer ACK', async () => {
      await controller.handleCreateProduct({ name: 'Rabbit' } as any, mockRmqContext);
      expect(service.create).toHaveBeenCalled();
      // Verificamos que se llamó al ACK del canal
      expect(mockRmqContext.getChannelRef().ack).toHaveBeenCalled();
    });

    it('handleFindAll debería procesar', async () => {
      await controller.handleFindAll({}, mockRmqContext);
      expect(service.findAll).toHaveBeenCalled();
    });

    it('handleFindOne debería procesar', async () => {
      await controller.handleFindOne('1', mockRmqContext);
      expect(service.findOne).toHaveBeenCalled();
    });

    it('handleValidateStock debería procesar', async () => {
      await controller.handleValidateStock([], mockRmqContext);
      expect(service.validateStock).toHaveBeenCalled();
    });

    it('handleCalculateCart debería procesar', async () => {
      await controller.handleCalculateCart([], mockRmqContext);
      expect(service.calculateCartDetails).toHaveBeenCalled();
    });

    it('handleDecreaseStock debería procesar', async () => {
      await controller.handleDecreaseStock([], mockRmqContext);
      expect(service.decreaseStockBatch).toHaveBeenCalled();
    });
  });
});
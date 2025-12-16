import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from './products.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('ProductsService', () => {
  let service: ProductsService;
  let productRepo;
  let cloudinaryService;

  // MOCK DEL REPOSITORIO DE TYPEORM
  const mockProductRepository = {
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest.fn().mockImplementation((product) => {
        // Simula que si recibe un array, devuelve un array
        if (Array.isArray(product)) return Promise.resolve(product);
        return Promise.resolve({ id: 'uuid-123', ...product });
    }),
    findOneBy: jest.fn(),
    findBy: jest.fn(),
    // IMPORTANTE: Mockear preload para el update
    preload: jest.fn().mockImplementation((item) => Promise.resolve({ ...item })), 
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    })),
  };

  const mockCloudinaryService = {
    uploadImage: jest.fn().mockResolvedValue({ secure_url: 'https://fake.com/img.png' }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: getRepositoryToken(Product),
          useValue: mockProductRepository,
        },
        {
          provide: CloudinaryService,
          useValue: mockCloudinaryService,
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    productRepo = module.get(getRepositoryToken(Product));
    cloudinaryService = module.get(CloudinaryService);
  });

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });

  // --- 1. FIND ONE ---
  describe('findOne', () => {
    it('debería retornar un producto si existe', async () => {
      mockProductRepository.findOneBy.mockResolvedValue({ id: '1', name: 'Test' });
      const result = await service.findOne('1');
      expect(result).toEqual({ id: '1', name: 'Test' });
    });

    it('debería lanzar NotFoundException si no existe', async () => {
      mockProductRepository.findOneBy.mockResolvedValue(null);
      await expect(service.findOne('999')).rejects.toThrow(NotFoundException);
    });
  });

  // --- 2. CREATE ---
  describe('create', () => {
    it('debería crear un producto', async () => {
      const dto = { name: 'P', price: 10, stock: 5, description: 'D', categories: [], styles: [], galleryImages: [], builderImage: 'u' };
      const result = await service.create(dto);
      expect(result).toBeDefined();
    });
  });

  // --- 3. VALIDATE STOCK ---
  describe('validateStock', () => {
    it('debería validar true si hay stock', async () => {
      productRepo.findBy.mockResolvedValue([{ id: '1', stock: 10 }]);
      const result = await service.validateStock([{ productId: '1', quantity: 5 }]);
      expect(result.valid).toBe(true);
    });

    it('debería validar false si no hay stock', async () => {
      productRepo.findBy.mockResolvedValue([{ id: '1', stock: 1 }]);
      const result = await service.validateStock([{ productId: '1', quantity: 5 }]);
      expect(result.valid).toBe(false);
    });

    it('debería validar false si lista vacía', async () => {
        const result = await service.validateStock([]);
        expect(result.valid).toBe(false);
    });
  });

  // --- 4. UPDATE ---
  describe('update', () => {
    it('debería actualizar un producto', async () => {
       const result = await service.update('1', { name: 'Nuevo Nombre' });
       expect(productRepo.preload).toHaveBeenCalled();
       expect(productRepo.save).toHaveBeenCalled();
       expect(result.name).toBe('Nuevo Nombre');
    });

    it('debería fallar si no encuentra el producto al hacer preload', async () => {
        mockProductRepository.preload.mockResolvedValue(null);
        await expect(service.update('999', {})).rejects.toThrow(NotFoundException);
    });
  });

  // --- 5. DECREASE STOCK (SINGLE) ---
  describe('decreaseStock (Single)', () => {
      it('debería restar stock correctamente', async () => {
          mockProductRepository.findOneBy.mockResolvedValue({ id: '1', stock: 10 });
          await service.decreaseStock('1', 2);
          expect(productRepo.save).toHaveBeenCalledWith(expect.objectContaining({ stock: 8 }));
      });

      it('debería fallar si stock insuficiente', async () => {
        mockProductRepository.findOneBy.mockResolvedValue({ id: '1', stock: 1 });
        await expect(service.decreaseStock('1', 5)).rejects.toThrow(BadRequestException);
      });
  });

  // --- 6. CALCULATE CART DETAILS (Cubre muchas líneas) ---
  describe('calculateCartDetails', () => {
    it('debería calcular totales y subtotales correctamente', async () => {
        mockProductRepository.findBy.mockResolvedValue([
            { id: '1', name: 'A', price: 100 },
            { id: '2', name: 'B', price: 50 }
        ]);

        const items = [
            { productId: '1', quantity: 2 }, // 200
            { productId: '2', quantity: 1 }  // 50
        ];

        const result = await service.calculateCartDetails(items);
        
        expect(result.totalPrice).toBe(250);
        expect(result.items).toHaveLength(2);
        expect(result.items[0].subtotal).toBe(200);
    });

    it('debería retornar 0 si carrito vacío', async () => {
        const result = await service.calculateCartDetails([]);
        expect(result.totalPrice).toBe(0);
    });
  });

  // --- 7. DECREASE STOCK BATCH (Cubre el checkout) ---
  describe('decreaseStockBatch', () => {
    it('debería restar stock de múltiples productos', async () => {
        mockProductRepository.findBy.mockResolvedValue([
            { id: '1', name: 'A', stock: 10 },
            { id: '2', name: 'B', stock: 10 }
        ]);

        const items = [
            { productId: '1', quantity: 5 },
            { productId: '2', quantity: 5 }
        ];

        const result = await service.decreaseStockBatch(items);

        expect(result.success).toBe(true);
        // Verificamos que save se llamó con los stocks actualizados
        expect(productRepo.save).toHaveBeenCalledWith(expect.arrayContaining([
            expect.objectContaining({ id: '1', stock: 5 }),
            expect.objectContaining({ id: '2', stock: 5 })
        ]));
    });

    it('debería fallar si alguno no tiene stock en el lote', async () => {
        mockProductRepository.findBy.mockResolvedValue([
            { id: '1', name: 'A', stock: 1 } // Solo 1 disponible
        ]);

        const items = [{ productId: '1', quantity: 5 }]; // Pido 5

        await expect(service.decreaseStockBatch(items)).rejects.toThrow(BadRequestException);
    });
  });

  // --- 8. IMAGENES ---
  describe('createWithImages', () => {
      it('debería funcionar con imágenes', async () => {
          const dto: any = { name: 'X' };
          const files: any = { assetImage: [{}], galleryImages: [{}] };
          await service.createWithImages(dto, files);
          expect(cloudinaryService.uploadImage).toHaveBeenCalled();
          expect(productRepo.save).toHaveBeenCalled();
      });
  });
  
  // --- 9. OUTFIT PRICE ---
  describe('calculateOutfitPrice', () => {
    it('calcula precio outfit', async () => {
        mockProductRepository.findBy.mockResolvedValue([{ price: 10 }, { price: 20 }]);
        const res = await service.calculateOutfitPrice(['1', '2']);
        expect(res.totalPrice).toBe(30);
    });
    it('retorna 0 si array vacio', async () => {
        const res = await service.calculateOutfitPrice([]);
        expect(res.totalPrice).toBe(0);
    });
  });
});
import { Test } from '@nestjs/testing';
import { ProductsModule } from './products.module';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

describe('ProductsModule', () => {
  it('debería compilarse correctamente y cargar controlador y servicio', async () => {
    const module = await Test.createTestingModule({
      imports: [ProductsModule], // Importamos el módulo real
    })
      // ⚠️ TRUCO: Sobrescribimos las dependencias externas (DB y Cloudinary)
      // para que el test no intente conectarse a internet o base de datos real.
      .overrideProvider(getRepositoryToken(Product))
      .useValue({}) 
      .overrideProvider(CloudinaryService)
      .useValue({})
      .compile();

    // Verificaciones
    expect(module).toBeDefined();
    expect(module.get(ProductsController)).toBeDefined();
    expect(module.get(ProductsService)).toBeDefined();
  });
});
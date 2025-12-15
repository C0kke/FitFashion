//global['crypto'] = require('crypto');
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
  app.enableCors(); 

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672'],
      queue: process.env.RABBITMQ_QUEUE || 'products_queue',
      queueOptions: {
        durable: true 
      },
      noAck: false,
    },
  });

  await app.startAllMicroservices();
  await app.listen(3002);

  console.log(`Application is running on: 3002`);
  console.log(`Microservice is listening on queue: ${process.env.RABBITMQ_QUEUE || 'products_queue'}`);

  console.log("🔌 CONECTANDO A DB:", process.env.DB_DATABASE);
}
bootstrap();
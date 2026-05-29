import * as dotenv from 'dotenv';
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableCors();

  // Servir archivos estáticos desde la carpeta 'uploads'
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads',
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Proyecto EEQ API')
    .setDescription('API documentation for the EEQ project')
    .setVersion('1.0')
    .addTag('EEQ')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  // Configuración de RabbitMQ Microservices
  const rmqUrl = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
  console.log(`[RMQ] Conectando microservicios a la dirección: ${rmqUrl}`);

  // 1. Cola de órdenes (escucha confirmaciones de pago y cancelaciones por stock/pago)
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [rmqUrl],
      queue: 'orders_queue',
      queueOptions: { durable: true },
    },
  });

  // 2. Cola de inventario (escucha creación de órdenes y liberaciones de stock)
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [rmqUrl],
      queue: 'inventory_queue',
      queueOptions: { durable: true },
    },
  });

  // 3. Cola de pagos (escucha procesamiento de pagos)
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [rmqUrl],
      queue: 'payments_queue',
      queueOptions: { durable: true },
    },
  });

  // 4. Cola de Google Drive (escucha sincronización pesada en background)
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [rmqUrl],
      queue: 'drive_queue',
      queueOptions: { durable: true },
    },
  });

  await app.startAllMicroservices();
  console.log('[RMQ] Todos los microservicios de RabbitMQ han sido conectados y arrancados.');

  await app.listen(3000, '0.0.0.0');
  console.log(`Application is running on: ${await app.getUrl()}`);
  console.log(`Swagger documentation available at: ${await app.getUrl()}/api`);
}
void bootstrap();
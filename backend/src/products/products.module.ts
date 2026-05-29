import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ProductsService } from './product.service';
import { ProductsController } from './products.controller';
import { ProductsEventController } from './products-event.controller';
import { Product } from './product.entity';
import { Category } from '../categories/category.entity';
import { ProductsGateway } from './products.gateway';
import { DriveModule } from '../drive/drive.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, Category]),
    DriveModule,
    ClientsModule.register([
      {
        name: 'ORDERS_SERVICE',
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RABBITMQ_URL || 'amqp://localhost:5672'],
          queue: 'orders_queue',
          queueOptions: {
            durable: true,
          },
        },
      },
    ]),
  ],
  controllers: [ProductsController, ProductsEventController],
  providers: [ProductsService, ProductsGateway],
  exports: [ProductsService, TypeOrmModule],
})
export class ProductsModule {}
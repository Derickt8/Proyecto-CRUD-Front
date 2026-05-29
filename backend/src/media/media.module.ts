import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { Media } from './entities/media.entity';
import { ResourceType } from './entities/resource-type.entity';
import { Product } from '../products/product.entity';
import { Category } from '../categories/category.entity';
import { MediaService } from './media.service';
import { MediaController } from './media.controller';
import { MediaGateway } from './media.gateway';
import { MediaEventController } from './media-event.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Media, ResourceType, Product, Category]),
    ClientsModule.register([
      {
        name: 'DRIVE_SERVICE',
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RABBITMQ_URL || 'amqp://localhost:5672'],
          queue: 'drive_queue',
          queueOptions: {
            durable: true,
          },
        },
      },
    ]),
  ],
  controllers: [MediaController, MediaEventController],
  providers: [MediaService, MediaGateway],
  exports: [MediaService, MediaGateway],
})
export class MediaModule {}

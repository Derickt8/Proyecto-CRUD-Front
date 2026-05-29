import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ProductsModule } from './products/products.module';
import { Product } from './products/product.entity';
import { OrdersModule } from './orders/orders.module';
import { Order } from './orders/entities/order.entity';
import { OrderDetail } from './orders/entities/order-detail.entity';
import { Category } from './categories/category.entity';
import { CategoriesModule } from './categories/categories.module';
import { Media } from './media/entities/media.entity';
import { ResourceType } from './media/entities/resource-type.entity';
import { MediaModule } from './media/media.module';
import { PaymentsModule } from './payments/payments.module';
import { DriveModule } from './drive/drive.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '', 10) || 5433,
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || '12345',
      database: process.env.DB_DATABASE || 'nest_crud_demo',
      entities: [Product, Order, OrderDetail, Category, Media, ResourceType],
      synchronize: true,
      logging: true,
    }),
    ProductsModule,
    OrdersModule,
    CategoriesModule,
    MediaModule,
    PaymentsModule,
    DriveModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsService } from './product.service';
import { ProductsController } from './products.controller';
import { Product } from './product.entity'; 
import { ProductsGateway } from './products.gateway';

@Module({
  imports: [TypeOrmModule.forFeature([Product])], 
  controllers: [ProductsController],
  providers: [ProductsService, ProductsGateway],
})
export class ProductsModule {}
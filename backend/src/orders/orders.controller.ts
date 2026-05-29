import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderStatus } from '../common/enums/order-status.enum';

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true }))
  create(@Body() dto: CreateOrderDto) {
    return this.ordersService.createOrder(dto);
  }

  @Get()
  findAll() {
    return this.ordersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @Get(':id/estado')
  getStatus(@Param('id') id: string) {
    return this.ordersService.getStatus(id);
  }

  @Patch(':id/estado')
  updateStatus(@Param('id') id: string, @Body('estado') estado: OrderStatus) {
    return this.ordersService.updateStatus(id, estado);
  }

  @Patch(':id/confirmar')
  confirm(@Param('id') id: string) {
    return this.ordersService.confirmOrder(id);
  }

  @Patch(':id/cancelar')
  cancel(@Param('id') id: string) {
    return this.ordersService.cancelOrder(id);
  }
}

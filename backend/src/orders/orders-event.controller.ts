import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { OrdersService } from './orders.service';

@Controller()
export class OrdersEventController {
  constructor(private readonly ordersService: OrdersService) {}

  @EventPattern('stock.reserved')
  async handleStockReserved(@Payload() data: { orderId: string }) {
    console.log(`[OrdersEventController] Evento recibido: stock.reserved para la orden ${data.orderId}. Iniciando proceso de pago...`);
    await this.ordersService.initiatePayment(data.orderId);
  }

  @EventPattern('stock.failed')
  async handleStockFailed(@Payload() data: { orderId: string }) {
    console.log(`[OrdersEventController] Evento recibido: stock.failed para la orden ${data.orderId}. Cancelando orden...`);
    await this.ordersService.cancelOrder(data.orderId);
  }

  @EventPattern('payment.success')
  async handlePaymentSuccess(@Payload() data: { orderId: string }) {
    console.log(`[OrdersEventController] Evento recibido: payment.success para la orden ${data.orderId}. Confirmando orden...`);
    await this.ordersService.confirmOrder(data.orderId);
  }

  @EventPattern('payment.declined')
  async handlePaymentDeclined(@Payload() data: { orderId: string }) {
    console.log(`[OrdersEventController] Evento recibido: payment.declined para la orden ${data.orderId}. Cancelando orden...`);
    await this.ordersService.cancelOrder(data.orderId);
  }
}

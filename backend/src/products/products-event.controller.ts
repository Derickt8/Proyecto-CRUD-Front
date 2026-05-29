import { Controller, Inject } from '@nestjs/common';
import { EventPattern, Payload, ClientProxy } from '@nestjs/microservices';
import { ProductsService } from './product.service';

@Controller()
export class ProductsEventController {
  constructor(
    private readonly productsService: ProductsService,
    @Inject('ORDERS_SERVICE') private readonly ordersClient: ClientProxy,
  ) {}

  @EventPattern('order.created')
  async handleOrderCreated(@Payload() data: { orderId: string; items: { productId: string; quantity: number }[] }) {
    console.log(`[ProductsEventController] Recibido evento order.created para la orden ${data.orderId}. Validando e intentando reservar stock...`);
    try {
      await this.productsService.reserveStock(data.items);
      console.log(`[ProductsEventController] Stock reservado exitosamente. Emitiendo stock.reserved para orden ${data.orderId}`);
      this.ordersClient.emit('stock.reserved', { orderId: data.orderId });
    } catch (error: any) {
      console.error(`[ProductsEventController] Error al reservar stock para la orden ${data.orderId}: ${error.message}`);
      this.ordersClient.emit('stock.failed', { orderId: data.orderId });
    }
  }

  @EventPattern('stock.release')
  async handleStockRelease(@Payload() data: { orderId: string; items: { productId: string; quantity: number }[] }) {
    console.log(`[ProductsEventController] Recibido evento stock.release para la orden ${data.orderId}. Devolviendo stock al inventario...`);
    try {
      await this.productsService.releaseStock(data.items);
      console.log(`[ProductsEventController] Stock liberado exitosamente para la orden ${data.orderId}`);
    } catch (error: any) {
      console.error(`[ProductsEventController] Error al liberar stock para la orden ${data.orderId}: ${error.message}`);
    }
  }
}

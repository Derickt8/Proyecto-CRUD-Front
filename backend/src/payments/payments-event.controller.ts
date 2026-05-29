import { Controller, Inject } from '@nestjs/common';
import { EventPattern, Payload, ClientProxy } from '@nestjs/microservices';
import { PaymentsService } from './payments.service';

@Controller()
export class PaymentsEventController {
  constructor(
    private readonly paymentsService: PaymentsService,
    @Inject('ORDERS_SERVICE') private readonly ordersClient: ClientProxy,
  ) {}

  @EventPattern('payment.process')
  async handlePaymentProcess(
    @Payload()
    data: {
      orderId: string;
      amount: number;
      currency?: string;
      paymentMethodId?: string;
    },
  ) {
    console.log(`[PaymentsEventController] Recibido evento payment.process para la orden ${data.orderId} de monto $${data.amount}...`);
    try {
      const paymentResult = await this.paymentsService.createPaymentIntent(
        data.amount,
        data.currency || 'usd',
        data.paymentMethodId,
      );

      if (paymentResult.status === 'succeeded') {
        console.log(`[PaymentsEventController] Pago aprobado con éxito para la orden ${data.orderId}. Emitiendo 'payment.success'`);
        this.ordersClient.emit('payment.success', { orderId: data.orderId });
      } else {
        console.log(`[PaymentsEventController] El pago no finalizó con éxito (${paymentResult.status}) para la orden ${data.orderId}. Emitiendo 'payment.declined'`);
        this.ordersClient.emit('payment.declined', { orderId: data.orderId });
      }
    } catch (error: any) {
      console.error(`[PaymentsEventController] Fallo al procesar pago de la orden ${data.orderId}: ${error.message}. Emitiendo 'payment.declined'`);
      this.ordersClient.emit('payment.declined', { orderId: data.orderId });
    }
  }
}

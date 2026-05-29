import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create-payment-intent')
  async createPaymentIntent(
    @Body()
    body: {
      amount: number;
      currency?: string;
      paymentMethodId?: string;
    },
  ) {
    if (!body || body.amount === undefined || body.amount <= 0) {
      throw new BadRequestException('Monto inválido para el intento de pago.');
    }

    try {
      return await this.paymentsService.createPaymentIntent(
        body.amount,
        body.currency || 'usd',
        body.paymentMethodId,
      );
    } catch (error: any) {
      throw new BadRequestException(
        error.message || 'Error al procesar el pago con Stripe',
      );
    }
  }
}

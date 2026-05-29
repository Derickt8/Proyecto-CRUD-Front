/* eslint-disable */
import { Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';

@Injectable()
export class PaymentsService {
  private stripe: InstanceType<typeof Stripe> | null = null;
  private readonly logger = new Logger(PaymentsService.name);
  constructor() {
    const apiKey = process.env.STRIPE_SECRET_KEY;
    if (apiKey) {
      if (apiKey.startsWith('sk_test_')) {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
        this.logger.warn(
          'Stripe está configurado con clave de prueba (sk_test_). Deshabilitando temporalmente la validación estricta de TLS en desarrollo.',
        );
      }
      this.stripe = new Stripe(apiKey, {
        apiVersion: '2025-01-27.acacia' as any,
      });
      this.logger.log(
        'Stripe SDK inicializado correctamente con versión 2025-01-27.acacia.',
      );
    } else {
      this.logger.error(
        'STRIPE_SECRET_KEY no encontrada en las variables de entorno. Los pagos con tarjeta no funcionarán.',
      );
    }
  }

  async createPaymentIntent(
    amount: number,
    currency: string = 'usd',
    paymentMethodId?: string,
  ) {
    if (!this.stripe) {
      throw new Error(
        'El servicio de Stripe no está configurado (STRIPE_SECRET_KEY faltante en el backend).',
      );
    }

    const amountInCents = Math.round(amount * 100);
    this.logger.log(
      `Intentando crear PaymentIntent de Stripe. Monto recibido: ${amount} ${currency.toUpperCase()} -> Convertido a centavos: ${amountInCents}`,
    );

    try {
      const paymentMethod = paymentMethodId || 'pm_card_visa';
      this.logger.log(`Usando PaymentMethod: ${paymentMethod}`);

      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: amountInCents,
        currency: currency.toLowerCase(),
        payment_method: paymentMethod,
        confirm: true,
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: 'never',
        },
      });

      this.logger.log(
        `PaymentIntent procesado con éxito: ID=${paymentIntent.id}, Status=${paymentIntent.status}`,
      );

      return {
        clientSecret: paymentIntent.client_secret,
        id: paymentIntent.id,
        status: paymentIntent.status,
        isMock: false,
      };
    } catch (error: any) {
      this.logger.error(
        `Error al crear/confirmar PaymentIntent: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}

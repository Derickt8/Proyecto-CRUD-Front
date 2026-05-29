import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { DataSource, Repository, In } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ClientProxy } from '@nestjs/microservices';
import { Order } from './entities/order.entity';
import { OrderDetail } from './entities/order-detail.entity';
import { Product } from '../products/product.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderStatus } from '../common/enums/order-status.enum';
import { ProductStatus } from '../common/enums/product-status.enum';
import { Category } from '../categories/category.entity';
import * as crypto from 'crypto';

@Injectable()
export class OrdersService {
  constructor(
    private dataSource: DataSource,
    @InjectRepository(Order) private ordersRepo: Repository<Order>,
    @InjectRepository(OrderDetail) private detailsRepo: Repository<OrderDetail>,
    @InjectRepository(Product) private productsRepo: Repository<Product>,
    @Inject('INVENTORY_SERVICE') private readonly inventoryClient: ClientProxy,
    @Inject('PAYMENTS_SERVICE') private readonly paymentsClient: ClientProxy,
  ) {}

  private getDeterministicUuid(fakeId: string): string {
    const hash = crypto.createHash('sha1').update(fakeId).digest('hex');
    return `${hash.substring(0, 8)}-${hash.substring(8, 12)}-4${hash.substring(12, 15)}-8${hash.substring(15, 19)}-${hash.substring(19, 31)}`;
  }

  async createOrder(dto: CreateOrderDto) {
    return await this.dataSource.transaction(async (manager) => {
      // Pre-procesar items para resolver productos de la Fake Store API
      for (const item of dto.items) {
        if (item.productId.startsWith('fake_')) {
          const fakeId = item.productId;
          const numericId = fakeId.replace('fake_', '');
          const fakeCodigo = `FAKE-${numericId}`;

          // Verificar si ya existe en la base de datos por su CÓDIGO único
          let product = await manager.findOne(Product, {
            where: { codigo: fakeCodigo },
          });
          if (!product) {
            try {
              process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
              const response = await fetch(
                `https://fakestoreapi.com/products/${numericId}`,
              );
              if (response.ok) {
                interface FakeStoreProduct {
                  title: string;
                  description: string;
                  price: number;
                  image: string;
                }
                const apiProduct = (await response.json()) as FakeStoreProduct;

                // Buscar o crear la categoría para 'Electrónicos'
                let category = await manager.findOne(Category, {
                  where: { nombre: 'Monitor' },
                });
                if (!category) {
                  const categories = await manager.find(Category);
                  if (categories.length > 0) {
                    category = categories[0];
                  }
                }

                product = manager.create(Product, {
                  nombre: apiProduct.title,
                  descripcion: apiProduct.description || 'Sin descripción',
                  codigo: fakeCodigo,
                  precio: Number(apiProduct.price || 0.0).toFixed(2),
                  stock: 100, // Stock alto inicial
                  imagen: apiProduct.image,
                  category: category,
                  estado: ProductStatus.ACTIVO,
                });
                product = await manager.save(Product, product);
              } else {
                throw new Error(
                  `Fake Store API retornó código ${response.status}`,
                );
              }
            } catch (error) {
              console.error(
                'Error al importar producto de Fake Store API:',
                error,
              );
              const message =
                error instanceof Error ? error.message : String(error);
              throw new BadRequestException(
                `Fallo al descargar de Fake Store API: ${message}`,
              );
            }
          }

          if (product) {
            item.productId = product.id;
          } else {
            throw new NotFoundException(
              `No se pudo resolver el producto externo ${fakeId}`,
            );
          }
        }
      }

      const productIds = dto.items.map((i) => i.productId);
      const products = await manager.find(Product, {
        where: { id: In(productIds) },
      });

      const productMap = new Map(products.map((p) => [p.id, p]));

      let total = 0;
      for (const item of dto.items) {
        const p = productMap.get(item.productId);
        if (!p)
          throw new NotFoundException(
            `Producto ${item.productId} no encontrado`,
          );
        if (p.estado !== ProductStatus.ACTIVO)
          throw new BadRequestException(`Producto ${p.nombre} está inactivo`);
        
        // El stock se validará y restará de forma asíncrona en el modulo de productos
        total += Number(p.precio) * item.quantity;
      }

      const order = manager.create(Order, {
        customerName: dto.customerName,
        customerEmail: dto.customerEmail || null,
        direccion: dto.direccion || null,
        metodoPago: dto.metodoPago || null,
        total: total.toFixed(2),
        status: OrderStatus.PENDIENTE,
      });

      const savedOrder = await manager.save(order);

      for (const item of dto.items) {
        const p = productMap.get(item.productId)!;
        const detail = manager.create(OrderDetail, {
          order: savedOrder,
          product: p,
          quantity: item.quantity,
          price: p.precio,
          subtotal: (Number(p.precio) * item.quantity).toFixed(2),
        });
        await manager.save(detail);
      }

      const fullOrder = await manager.findOne(Order, {
        where: { id: savedOrder.id },
        relations: ['details', 'details.product'],
      });

      // Publicar el mensaje 'order.created' en RabbitMQ
      console.log(`[OrdersService] Orden guardada como PENDIENTE. Publicando 'order.created' para la orden: ${savedOrder.id}`);
      this.inventoryClient.emit('order.created', {
        orderId: savedOrder.id,
        items: dto.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
      });

      return fullOrder;
    });
  }

  async findAll() {
    return this.ordersRepo.find({
      relations: ['details', 'details.product'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string) {
    const order = await this.ordersRepo.findOne({
      where: { id },
      relations: ['details', 'details.product'],
    });
    if (!order) {
      throw new NotFoundException(`Orden con ID ${id} no encontrada`);
    }
    return order;
  }

  async getStatus(id: string) {
    const order = await this.ordersRepo.findOne({
      where: { id },
      select: ['status'],
    });
    if (!order) throw new NotFoundException('Orden no encontrada');
    return { estado: order.status };
  }

  async initiatePayment(orderId: string) {
    const order = await this.findOne(orderId);
    console.log(`[OrdersService] Enviando mensaje 'payment.process' para la orden: ${orderId}`);
    this.paymentsClient.emit('payment.process', {
      orderId: order.id,
      amount: Number(order.total),
      currency: 'usd',
      paymentMethodId: order.metodoPago || 'pm_card_visa',
    });
  }

  async confirmOrder(id: string) {
    const order = await this.findOne(id);
    order.status = OrderStatus.CONFIRMADA;
    console.log(`[OrdersService] Confirmando orden: ${id}`);
    return this.ordersRepo.save(order);
  }

  async cancelOrder(id: string) {
    const order = await this.findOne(id);
    order.status = OrderStatus.CANCELADA;
    console.log(`[OrdersService] Cancelando orden: ${id}. Liberando stock...`);

    // Emitir compensating transaction to release reserved stock
    this.inventoryClient.emit('stock.release', {
      orderId: order.id,
      items: order.details.map((detail) => ({
        productId: detail.product.id,
        quantity: detail.quantity,
      })),
    });

    return this.ordersRepo.save(order);
  }

  async updateStatus(id: string, status: OrderStatus) {
    const order = await this.findOne(id);
    if (order.status === status) return order;

    if (status === OrderStatus.CONFIRMADA) {
      return this.confirmOrder(id);
    }
    if (status === OrderStatus.CANCELADA) {
      return this.cancelOrder(id);
    }

    order.status = status;
    return this.ordersRepo.save(order);
  }
}

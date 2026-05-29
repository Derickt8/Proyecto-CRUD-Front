import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { OrderDetail } from './order-detail.entity';
import { OrderStatus } from '../../common/enums/order-status.enum';

@Entity({ name: 'orders' })
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'customer_name', length: 100, default: 'Cliente Anónimo' })
  customerName: string;

  @Column({
    name: 'customer_email',
    type: 'varchar',
    length: 200,
    nullable: true,
  })
  customerEmail: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  direccion: string | null;

  @Column({ name: 'metodo_pago', type: 'varchar', length: 150, nullable: true })
  metodoPago: string | null;

  @Column('decimal', { precision: 12, scale: 2 })
  total: string;

  @Column({
    type: 'varchar',
    length: 50,
    default: OrderStatus.PENDIENTE,
  })
  status: OrderStatus;

  @OneToMany(() => OrderDetail, (detail) => detail.order, { cascade: true })
  details: OrderDetail[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

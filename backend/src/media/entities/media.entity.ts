import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Product } from '../../products/product.entity';
import { ResourceType } from './resource-type.entity';

@Entity({ name: 'media' })
export class Media {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true, nullable: true })
  driveId: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  fileName: string | null;

  @Column({ type: 'text', nullable: true })
  webContentLink: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  folderCategory: string | null;

  @Column({ name: 'product_id', type: 'uuid', nullable: true, default: null })
  productId: string | null;

  @Column({ name: 'resource_type_id', type: 'uuid', nullable: true })
  resourceTypeId: string | null;

  @ManyToOne(() => Product, (product) => product.media, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'product_id' })
  product: Product | null;

  @ManyToOne(() => ResourceType, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'resource_type_id' })
  resourceType: ResourceType | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

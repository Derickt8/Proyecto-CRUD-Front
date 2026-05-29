import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Check,
  ManyToOne,
  OneToMany,
  JoinColumn,
  AfterLoad,
} from 'typeorm';
import { ProductStatus } from '../common/enums/product-status.enum';
import { Category } from '../categories/category.entity';
import { Media } from '../media/entities/media.entity';

@Entity({ name: 'products' })
@Check('price_non_negative', 'precio >= 0')
@Check('stock_non_negative', 'stock >= 0')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  nombre: string;

  @Column({ type: 'text' })
  descripcion: string;

  @Column({ length: 100, unique: true })
  codigo: string;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  precio: string;

  @Column('int', { default: 0 })
  stock: number;

  @Column({ type: 'varchar', nullable: true })
  imagen: string | null;

  @ManyToOne(() => Category, (category) => category.products, {
    onDelete: 'SET NULL',
    nullable: true,
    eager: true,
  })
  @JoinColumn({ name: 'category_id' })
  category: Category | null;

  @OneToMany(() => Media, (media) => media.product, {
    cascade: true,
    eager: true,
  })
  media: Media[];

  @Column({
    type: 'enum',
    enum: ProductStatus,
    default: ProductStatus.BORRADOR,
  })
  estado: ProductStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Campos virtuales para mantener compatibilidad con el frontend y apps móviles
  categoria: string | null;
  imagenes: string[] | null;

  @AfterLoad()
  populateVirtualCategoria() {
    if (this.category && typeof this.category.nombre === 'string') {
      const name = this.category.nombre.toLowerCase();
      if (name.includes('grafica') || name.includes('gráfica')) {
        this.categoria = 'tarjeta_grafica';
      } else if (name.includes('gabinete')) {
        this.categoria = 'gabinetes';
      } else if (name.includes('monitor')) {
        this.categoria = 'monitores';
      } else if (name.includes('cpu') || name.includes('procesador')) {
        this.categoria = 'procesador';
      } else if (name.includes('mouse')) {
        this.categoria = 'mouse';
      } else if (name.includes('teclado')) {
        this.categoria = 'teclado';
      } else {
        this.categoria = name.replace(/\s+/g, '_');
      }
    } else {
      this.categoria = null;
    }

    if (this.media) {
      this.imagenes = this.media
        .map((m) => {
          if (!m.webContentLink) return null;
          const hash = m.fileName ? `#${m.fileName}` : '';
          return `${m.webContentLink}${hash}`;
        })
        .filter((link): link is string => !!link);
    } else {
      this.imagenes = [];
    }
  }
}
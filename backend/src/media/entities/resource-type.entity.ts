import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity({ name: 'resource_type' })
export class ResourceType {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  descripcion: string;

  @Column({ type: 'varchar', length: 10 })
  extension: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

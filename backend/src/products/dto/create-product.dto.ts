import {
  IsString,
  IsNumber,
  IsOptional,
  IsNotEmpty,
  IsIn,
  Min,
  MaxLength,
  IsUUID,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ProductStatus } from '../../common/enums/product-status.enum';

const VALID_CATEGORIES = [
  'gabinetes',
  'monitores',
  'mouse',
  'procesador',
  'teclado',
  'tarjeta_grafica',
];

export class CreateProductDto {
  @IsString()
  @MaxLength(255)
  nombre: string;

  @IsNotEmpty({ message: 'La descripción es obligatoria' })
  @IsString()
  descripcion: string;

  @IsString()
  codigo: string;

  @IsNumber()
  @Min(0.01)
  precio: number;

  @IsNumber()
  @Min(0)
  stock: number;

  @IsString()
  @IsOptional()
  imagen?: string;

  @IsString({ each: true })
  @IsOptional()
  imagenes?: string[];

  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsIn(VALID_CATEGORIES, {
    message:
      'La categoría debe ser una de: ' +
      'gabinetes, monitores, mouse, procesador, teclado, tarjeta_grafica',
  })
  @IsOptional()
  categoria?: string;

  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsUUID('4', { message: 'El ID de la categoría debe ser un UUID válido' })
  @IsOptional()
  categoryId?: string;

  @IsOptional()
  @IsIn([ProductStatus.ACTIVO, ProductStatus.INACTIVO, ProductStatus.BORRADOR])
  estado?: ProductStatus;
}
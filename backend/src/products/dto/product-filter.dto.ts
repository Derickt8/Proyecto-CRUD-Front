import {
  IsOptional,
  IsString,
  IsIn,
  IsBoolean,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ProductStatus } from '../../common/enums/product-status.enum';

export class ProductFilterDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn([
    ProductStatus.ACTIVO,
    ProductStatus.INACTIVO,
    ProductStatus.BORRADOR,
    'ALL',
  ])
  estado?: string;

  @IsOptional()
  @Type(() => IsBoolean)
  @IsBoolean()
  stock?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  limit?: number;
}

import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  Query,
  UsePipes,
  ValidationPipe,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ProductsService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductFilterDto } from './dto/product-filter.dto';

export interface ProductFiles {
  imagenPrincipal?: Express.Multer.File[];
  galeria?: Express.Multer.File[];
}

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true }))
  create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }

  @Post('upload-to-drive')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'imagenPrincipal', maxCount: 1 },
      { name: 'galeria', maxCount: 10 },
    ]),
  )
  async uploadToDrive(
    @UploadedFiles() files: ProductFiles,
  ) {
    const mainImage = files?.imagenPrincipal ? files.imagenPrincipal[0] : null;
    const galleryImages = files?.galeria || [];

    return this.productsService.uploadFilesToDrive(mainImage, galleryImages);
  }

  @Get()
  findAll(@Query() query: ProductFilterDto) {
    return this.productsService.findAll(query);
  }

  @Get('external')
  getExternalProducts() {
    return [];
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Put(':id')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    return this.productsService.update(id, updateProductDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  softDelete(@Param('id') id: string) {
    return this.productsService.softDelete(id);
  }
}
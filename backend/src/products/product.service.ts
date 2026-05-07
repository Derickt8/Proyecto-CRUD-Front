import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsGateway } from './products.gateway';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private productsRepository: Repository<Product>,
    private productsGateway: ProductsGateway,
  ) { }

  // Crear un producto
  async create(createProductDto: CreateProductDto): Promise<Product> {
    const product = this.productsRepository.create(createProductDto);
    const savedProduct = await this.productsRepository.save(product);
    this.productsGateway.emitProductCreated(savedProduct);
    return savedProduct;
  }

  // Obtener todos los productos
  async findAll(): Promise<Product[]> {
    return await this.productsRepository.find();
  }

  // Obtener un producto por ID
  async findOne(id: number): Promise<Product> {
    const product = await this.productsRepository.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException(`Producto con ID ${id} no encontrado`);
    }
    return product;
  }

  // Actualizar un producto
  async update(id: number, updateProductDto: UpdateProductDto): Promise<Product> {
    const product = await this.findOne(id); // Reutilizamos el método findOne
    Object.assign(product, updateProductDto);
    const updatedProduct = await this.productsRepository.save(product);
    this.productsGateway.emitProductUpdated(updatedProduct);
    return updatedProduct;
  }

  // Eliminar un producto
  async remove(id: number): Promise<void> {
    const result = await this.productsRepository.delete(id);
    if (result?.affected === 0) {
      throw new NotFoundException(`Producto con ID ${id} no encontrado`);
    }
    this.productsGateway.emitProductDeleted(id);
  }
}
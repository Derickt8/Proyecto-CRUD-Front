/* eslint-disable */
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { Product } from './product.entity';
import { Category } from '../categories/category.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductFilterDto } from './dto/product-filter.dto';
import { ProductsGateway } from './products.gateway';
import { ProductStatus } from '../common/enums/product-status.enum';
import { DriveService } from '../drive/drive.service';

@Injectable()
export class ProductsService implements OnModuleInit {
  constructor(
    @InjectRepository(Product)
    private productsRepository: Repository<Product>,
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    private productsGateway: ProductsGateway,
    private driveService: DriveService,
  ) {}

  async onModuleInit() {
    await this.migrateLegacyImagenes();
  }

  // Métodos de reserva y liberación de inventario asíncrono
  async reserveStock(items: { productId: string; quantity: number }[]) {
    return await this.productsRepository.manager.transaction(async (manager) => {
      for (const item of items) {
        const product = await manager.findOne(Product, {
          where: { id: item.productId },
        });
        if (!product) {
          throw new NotFoundException(`Producto con ID ${item.productId} no encontrado en el inventario.`);
        }
        if (product.stock < item.quantity) {
          throw new BadRequestException(
            `Stock insuficiente para el producto ${product.nombre}. Solicitado: ${item.quantity}, Disponible: ${product.stock}`
          );
        }
        product.stock -= item.quantity;
        await manager.save(product);
        console.log(`[ProductsService] Stock descontado para ${product.nombre}: -${item.quantity}. Nuevo stock: ${product.stock}`);
      }
    });
  }

  async releaseStock(items: { productId: string; quantity: number }[]) {
    return await this.productsRepository.manager.transaction(async (manager) => {
      for (const item of items) {
        const product = await manager.findOne(Product, {
          where: { id: item.productId },
        });
        if (!product) {
          console.warn(`[ProductsService] Intento de liberar stock para producto inexistente: ${item.productId}`);
          continue;
        }
        product.stock += item.quantity;
        await manager.save(product);
        console.log(`[ProductsService] Stock liberado para ${product.nombre}: +${item.quantity}. Nuevo stock: ${product.stock}`);
      }
    });
  }

  private async migrateLegacyImagenes() {
    const manager = this.productsRepository.manager;
    try {
      const checkColumn = await manager.query<Array<{ column_name: string }>>(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'imagenes'
      `);

      if (checkColumn.length > 0) {
        console.log(
          '--- Iniciando migración de datos de la columna imagenes a la tabla media ---',
        );

        const legacyProducts = await manager.query<
          Array<{ id: string; imagenes: string }>
        >(`
          SELECT id, imagenes FROM products WHERE imagenes IS NOT NULL AND imagenes != ''
        `);

        const defaultResourceType = await manager.query<Array<{ id: string }>>(`
          SELECT id FROM resource_type WHERE extension = 'jpg' OR descripcion = 'image/jpeg' LIMIT 1
        `);
        let resourceTypeId =
          defaultResourceType.length > 0 ? defaultResourceType[0].id : null;

        if (!resourceTypeId) {
          const rtInsert = await manager.query<Array<{ id: string }>>(`
            INSERT INTO resource_type (id, descripcion, extension) 
            VALUES (gen_random_uuid(), 'image/jpeg', 'jpg') 
            RETURNING id
          `);
          resourceTypeId = rtInsert[0].id;
        }

        let migratedCount = 0;

        for (const row of legacyProducts) {
          const productId = row.id;
          const imagenesStr = row.imagenes;
          const urls = imagenesStr
            .split(',')
            .map((url) => url.trim())
            .filter(Boolean);

          for (const url of urls) {
            const exists = await manager.query<Array<{ id: string }>>(
              `
              SELECT id FROM media WHERE "product_id" = $1 AND "webContentLink" = $2
            `,
              [productId, url],
            );

            if (exists.length === 0) {
              const fileName =
                url.substring(url.lastIndexOf('/') + 1) || 'image.jpg';
              await manager.query(
                `
                INSERT INTO media (id, "driveId", "fileName", "webContentLink", "folderCategory", "product_id", "resource_type_id", "created_at", "updated_at")
                VALUES (gen_random_uuid(), NULL, $1, $2, 'migrated', $3, $4, NOW(), NOW())
              `,
                [fileName, url, productId, resourceTypeId],
              );
              migratedCount++;
            }
          }
        }

        console.log(
          `--- Migración exitosa: ${migratedCount} enlaces migrados a la tabla media ---`,
        );

        console.log(
          '--- Eliminando la columna imagenes de la tabla products ---',
        );
        await manager.query(`
          ALTER TABLE products DROP COLUMN imagenes
        `);
        console.log(
          '--- Columna imagenes eliminada correctamente. Esquema normalizado. ---',
        );
      }
    } catch (err) {
      console.error('Error durante la migración de la columna imagenes:', err);
    }
  }

  private async associateMedia(productId: string, urls: string[]) {
    const manager = this.productsRepository.manager;

    const currentMedia = await manager.query<
      Array<{ id: string; driveId: string | null; webContentLink: string }>
    >(
      `
      SELECT id, "driveId", "webContentLink" FROM media WHERE "product_id" = $1
    `,
      [productId],
    );

    for (const item of currentMedia) {
      if (!urls.includes(item.webContentLink)) {
        if (item.driveId === null) {
          await manager.query(`DELETE FROM media WHERE id = $1`, [item.id]);
        } else {
          await manager.query(
            `UPDATE media SET "product_id" = NULL WHERE id = $1`,
            [item.id],
          );
        }
      }
    }

    const defaultResourceType = await manager.query<Array<{ id: string }>>(`
      SELECT id FROM resource_type WHERE extension = 'jpg' OR descripcion = 'image/jpeg' LIMIT 1
    `);
    let resourceTypeId =
      defaultResourceType.length > 0 ? defaultResourceType[0].id : null;
    if (!resourceTypeId) {
      const rtInsert = await manager.query<Array<{ id: string }>>(`
        INSERT INTO resource_type (id, descripcion, extension) 
        VALUES (gen_random_uuid(), 'image/jpeg', 'jpg') 
        RETURNING id
      `);
      resourceTypeId = rtInsert[0].id;
    }

    for (const url of urls) {
      const exists = await manager.query<
        Array<{ id: string; product_id: string | null }>
      >(
        `
        SELECT id, "product_id" FROM media WHERE "webContentLink" = $1 LIMIT 1
      `,
        [url],
      );

      if (exists.length > 0) {
        if (exists[0].product_id !== productId) {
          await manager.query(
            `
            UPDATE media SET "product_id" = $1 WHERE id = $2
          `,
            [productId, exists[0].id],
          );
        }
      } else {
        const fileName = url.substring(url.lastIndexOf('/') + 1) || 'image.jpg';
        await manager.query(
          `
          INSERT INTO media (id, "driveId", "fileName", "webContentLink", "folderCategory", "product_id", "resource_type_id", "created_at", "updated_at")
          VALUES (gen_random_uuid(), NULL, $1, $2, 'manual', $3, $4, NOW(), NOW())
        `,
          [fileName, url, productId, resourceTypeId],
        );
      }
    }
  }

  private async resolveCategory(
    categoria?: string,
    categoryId?: string,
  ): Promise<Category | null> {
    if (categoryId) {
      const category = await this.categoryRepository.findOne({
        where: { id: categoryId },
      });
      if (category) return category;
    }
    if (categoria) {
      const slugToNameMap: Record<string, string> = {
        gabinetes: 'Gabinete',
        monitores: 'Monitor',
        mouse: 'Mouse',
        procesador: 'CPU',
        teclado: 'Teclado',
        tarjeta_grafica: 'Tarjeta Gráfica',
      };
      const targetName = slugToNameMap[categoria.toLowerCase()] || categoria;

      const category = await this.categoryRepository
        .createQueryBuilder('category')
        .where('LOWER(category.nombre) = LOWER(:name)', { name: targetName })
        .getOne();
      if (category) return category;
    }
    return null;
  }

  async create(createProductDto: CreateProductDto): Promise<Product> {
    const { categoria, categoryId, imagenes, ...rest } = createProductDto;
    const category = await this.resolveCategory(categoria, categoryId);

    const product = this.productsRepository.create({
      nombre: rest.nombre,
      descripcion: rest.descripcion,
      codigo: rest.codigo,
      precio: rest.precio.toString(),
      stock: rest.stock,
      imagen: rest.imagen || null,
      category,
      estado: rest.estado || ProductStatus.ACTIVO,
    });

    try {
      const savedProduct = await this.productsRepository.save(product);

      if (imagenes && imagenes.length > 0) {
        await this.associateMedia(savedProduct.id, imagenes);
      }

      const finalProduct = await this.findOne(savedProduct.id);

      this.productsGateway.emitProductCreated(finalProduct);
      return finalProduct;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new BadRequestException('Error al crear producto: ' + message);
    }
  }

  async findAll(
    query: ProductFilterDto,
  ): Promise<{ items: Product[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(500, Number(query.limit) || 100);
    const skip = (page - 1) * limit;

    const qb = this.productsRepository
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.category', 'category')
      .leftJoinAndSelect('p.media', 'media')
      .orderBy('p.createdAt', 'DESC');

    if (!query.estado) {
      qb.where('p.estado = :estado', { estado: ProductStatus.ACTIVO });
    } else if (query.estado !== 'ALL') {
      qb.where('p.estado = :estado', { estado: query.estado });
    }

    if (query.search) {
      qb.andWhere('(p.nombre ILIKE :search OR p.codigo ILIKE :search)', {
        search: `%${query.search}%`,
      });
    }

    if (query.stock !== undefined) {
      if (query.stock === true || String(query.stock) === 'true') {
        qb.andWhere('p.stock > 0');
      }
    }

    const [items, total] = await qb.skip(skip).take(limit).getManyAndCount();

    items.forEach((item) => {
      if (item && typeof item.populateVirtualCategoria === 'function') {
        item.populateVirtualCategoria();
      }
    });

    return { items, total, page, limit };
  }

  async findOne(id: string): Promise<Product> {
    const product = await this.productsRepository.findOne({
      where: { id },
      relations: ['category', 'media'],
    });
    if (!product) {
      throw new NotFoundException(`Producto con ID ${id} no encontrado`);
    }

    if (product && typeof product.populateVirtualCategoria === 'function') {
      product.populateVirtualCategoria();
    }

    return product;
  }

  async update(
    id: string,
    updateProductDto: UpdateProductDto,
  ): Promise<Product> {
    const product = await this.findOne(id);
    const { categoria, categoryId, imagenes, ...rest } = updateProductDto;

    if (categoria !== undefined || categoryId !== undefined) {
      product.category = await this.resolveCategory(categoria, categoryId);
    }

    if (rest.nombre !== undefined) product.nombre = rest.nombre;
    if (rest.descripcion !== undefined) product.descripcion = rest.descripcion;
    if (rest.codigo !== undefined) product.codigo = rest.codigo;
    if (rest.precio !== undefined) product.precio = rest.precio.toString();
    if (rest.stock !== undefined) product.stock = rest.stock;
    if (rest.imagen !== undefined) product.imagen = rest.imagen || null;
    if (rest.estado !== undefined) product.estado = rest.estado;

    const updatedProduct = await this.productsRepository.save(product);

    if (imagenes !== undefined) {
      await this.associateMedia(updatedProduct.id, imagenes);
    }

    const finalProduct = await this.findOne(updatedProduct.id);

    this.productsGateway.emitProductUpdated(finalProduct);
    return finalProduct;
  }

  async softDelete(id: string): Promise<void> {
    const product = await this.findOne(id);
    product.estado = ProductStatus.INACTIVO;
    await this.productsRepository.save(product);
    this.productsGateway.emitProductDeleted(id);
  }

  private async saveFileLocally(file: Express.Multer.File): Promise<string> {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const extension = path.extname(file.originalname);
    const filename = `${file.fieldname}-${uniqueSuffix}${extension}`;
    const uploadsDir = path.join(process.cwd(), 'uploads');

    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filePath = path.join(uploadsDir, filename);
    await fs.promises.writeFile(filePath, file.buffer);

    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    return `${baseUrl}/uploads/${filename}`;
  }

  private async registerMediaInDatabase(
    driveId: string,
    fileName: string,
    webContentLink: string,
    mimeType: string,
  ): Promise<void> {
    const manager = this.productsRepository.manager;
    const folderCategory = 'Electrónicos';

    try {
      let resourceTypeId: string | null = null;
      const resTypes = await manager.query<Array<{ id: string }>>(
        `SELECT id FROM resource_type WHERE descripcion = $1 LIMIT 1`,
        [mimeType],
      );

      if (resTypes.length > 0) {
        resourceTypeId = resTypes[0].id;
      } else {
        const ext = fileName.substring(fileName.lastIndexOf('.') + 1) || 'bin';
        const rtInsert = await manager.query<Array<{ id: string }>>(
          `INSERT INTO resource_type (id, descripcion, extension, created_at) 
           VALUES (gen_random_uuid(), $1, $2, NOW()) 
           RETURNING id`,
          [mimeType, ext],
        );
        resourceTypeId = rtInsert[0].id;
      }

      const exists = await manager.query<Array<{ id: string }>>(
        `SELECT id FROM media WHERE "driveId" = $1 LIMIT 1`,
        [driveId],
      );

      if (exists.length === 0) {
        await manager.query(
          `INSERT INTO media (id, "driveId", "fileName", "webContentLink", "folderCategory", "product_id", "resource_type_id", "created_at", "updated_at")
           VALUES (gen_random_uuid(), $1, $2, $3, $4, NULL, $5, NOW(), NOW())`,
          [driveId, fileName, webContentLink, folderCategory, resourceTypeId],
        );
        console.log(`[ProductsService] Registrado nuevo archivo subido en la BD: ${fileName} (Drive ID: ${driveId})`);
      }
    } catch (dbError) {
      console.error(`Error al registrar media ${fileName} (${driveId}) en base de datos:`, dbError);
    }
  }

  async uploadFilesToDrive(
    mainImage: Express.Multer.File | null,
    galleryImages: Express.Multer.File[],
  ): Promise<{ imagenPrincipal: string | null; galeria: string[] }> {
    try {
      const folderId = await this.driveService.getOrCreateDailyFolder();

      let mainImageUrl: string | null = null;
      if (mainImage) {
        const result = await this.driveService.uploadAndShareFile(mainImage, folderId);
        mainImageUrl = `${result.webContentLink}#${mainImage.originalname}`;

        await this.registerMediaInDatabase(
          result.driveId,
          mainImage.originalname,
          result.webContentLink,
          mainImage.mimetype,
        );
      }

      const galleryUrls: string[] = [];
      for (const file of galleryImages) {
        const result = await this.driveService.uploadAndShareFile(file, folderId);
        galleryUrls.push(`${result.webContentLink}#${file.originalname}`);

        await this.registerMediaInDatabase(
          result.driveId,
          file.originalname,
          result.webContentLink,
          file.mimetype,
        );
      }

      return {
        imagenPrincipal: mainImageUrl,
        galeria: galleryUrls,
      };

    } catch (error: any) {
      const errMsg = error?.response?.data?.error?.message || error?.message || 'Error desconocido';
      console.warn('Fallo de subida a Google Drive. Usando almacenamiento local alternativo:', errMsg);

      let mainImageUrl: string | null = null;
      if (mainImage) {
        const localUrl = await this.saveFileLocally(mainImage);
        mainImageUrl = `${localUrl}#${mainImage.originalname}`;
      }

      const galleryUrls: string[] = [];
      for (const file of galleryImages) {
        const localUrl = await this.saveFileLocally(file);
        galleryUrls.push(`${localUrl}#${file.originalname}`);
      }

      return {
        imagenPrincipal: mainImageUrl,
        galeria: galleryUrls,
      };
    }
  }
}
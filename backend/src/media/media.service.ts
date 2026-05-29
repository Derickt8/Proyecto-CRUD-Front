/* eslint-disable */
import {
  Injectable,
  OnModuleInit,
  InternalServerErrorException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, IsNull } from 'typeorm';
import { google } from 'googleapis';
import { Media } from './entities/media.entity';
import { ResourceType } from './entities/resource-type.entity';
import { Product } from '../products/product.entity';
import { Category } from '../categories/category.entity';
import { ProductStatus } from '../common/enums/product-status.enum';

@Injectable()
export class MediaService implements OnModuleInit {
  private drive: any;
  private envValidationErrors: string[] = [];
  private clientEmail?: string;
  private privateKey?: string;
  private rootFolderId?: string;

  constructor(
    @InjectRepository(Media)
    private readonly mediaRepository: Repository<Media>,

    @InjectRepository(ResourceType)
    private readonly resourceTypeRepository: Repository<ResourceType>,

    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,

    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  /**
   * Método de inicialización del módulo.
   * Valida las variables de entorno y ejecuta el seed inicial de ResourceType.
   */
  async onModuleInit() {
    this.rootFolderId = process.env.DRIVE_ROOT_FOLDER_ID;

    // 1. Semilla (Seed) por defecto para ResourceType
    const seedData = [
      { descripcion: 'image/jpeg', extension: 'jpg' },
      { descripcion: 'image/png', extension: 'png' },
      { descripcion: 'image/webp', extension: 'webp' },
      { descripcion: 'video/mp4', extension: 'mp4' },
    ];

    try {
      for (const seed of seedData) {
        const exists = await this.resourceTypeRepository.findOne({
          where: { descripcion: seed.descripcion },
        });
        if (!exists) {
          const rt = this.resourceTypeRepository.create(seed);
          await this.resourceTypeRepository.save(rt);
        }
      }
    } catch (dbError) {
      console.error(
        'Error al sembrar ResourceType en la base de datos:',
        dbError,
      );
    }

    // 2. Intentar obtener credenciales de OAuth2
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

    if (clientId && clientSecret && refreshToken) {
      try {
        const oauth2Client = new google.auth.OAuth2(
          clientId,
          clientSecret,
          'https://developers.google.com/oauthplayground'
        );
        oauth2Client.setCredentials({
          refresh_token: refreshToken,
        });
        this.drive = google.drive({ version: 'v3', auth: oauth2Client });
        console.log('[MediaService] Inicializado usando Google OAuth2 (Cuenta Personal)');
        return;
      } catch (error) {
        console.error('Error al inicializar cliente de Google Drive en MediaService con OAuth2:', error);
      }
    }

    // 3. Fallback original para Cuenta de Servicio
    let clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
    let privateKey = process.env.GOOGLE_PRIVATE_KEY;

    const googleCredentialsJson =
      process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    if (googleCredentialsJson) {
      try {
        const keyData = JSON.parse(googleCredentialsJson);
        if (!clientEmail) clientEmail = keyData.client_email;
        if (!privateKey) privateKey = keyData.private_key;
      } catch (err) {
        console.error(
          'Error al parsear GOOGLE_APPLICATION_CREDENTIALS_JSON:',
          err,
        );
      }
    }

    this.clientEmail = clientEmail;
    this.privateKey = privateKey;

    if (!this.rootFolderId) this.envValidationErrors.push('DRIVE_ROOT_FOLDER_ID');
    if (!this.clientEmail) this.envValidationErrors.push('GOOGLE_CLIENT_EMAIL');
    if (!this.privateKey) this.envValidationErrors.push('GOOGLE_PRIVATE_KEY');

    if (this.envValidationErrors.length > 0) {
      console.error(
        `[ADVERTENCIA] Faltan variables de entorno para Google Drive: ${this.envValidationErrors.join(', ')}. ` +
          `El backend iniciará correctamente para permitir el desarrollo local, pero la sincronización de Drive fallará si se llama.`,
      );
      return;
    }

    try {
      const formattedKey = this.privateKey!.replace(/\\n/g, '\n');
      const auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: this.clientEmail,
          private_key: formattedKey,
        },
        scopes: ['https://www.googleapis.com/auth/drive.readonly'],
      });
      this.drive = google.drive({ version: 'v3', auth });
    } catch (error) {
      console.error('Error al inicializar cliente de Google Drive con Cuenta de Servicio:', error);
    }
  }

  /**
   * Helper para obtener todas las subcarpetas de una carpeta específica de forma paginada.
   */
  private async getSubfolders(parentFolderId: string): Promise<any[]> {
    const folders: any[] = [];
    let pageToken: string | undefined = undefined;

    do {
      const response: any = await this.drive.files.list({
        q: `'${parentFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
        fields: 'nextPageToken, files(id, name)',
        pageToken: pageToken,
        pageSize: 100,
      });

      if (response.data.files) {
        folders.push(...response.data.files);
      }
      pageToken = response.data.nextPageToken || undefined;
    } while (pageToken);

    return folders;
  }

  /**
   * Helper para obtener todos los archivos de una carpeta de forma paginada.
   */
  private async getFilesFromFolder(folderId: string): Promise<any[]> {
    const files: any[] = [];
    let pageToken: string | undefined = undefined;

    do {
      const response: any = await this.drive.files.list({
        q: `'${folderId}' in parents and trashed = false`,
        fields:
          'nextPageToken, files(id, name, mimeType, size, webContentLink, webViewLink)',
        pageToken: pageToken,
        pageSize: 100,
      });

      if (response.data.files) {
        files.push(...response.data.files);
      }
      pageToken = response.data.nextPageToken || undefined;
    } while (pageToken);

    return files;
  }

  private mapFolderToCategory(folderName: string): string {
    const lower = folderName.toLowerCase().trim();
    if (/^\d+$/.test(lower)) {
      return 'Electrónicos';
    }

    const mapping: Record<string, string> = {
      cpu: 'CPU',
      cpu_parts: 'CPU',
      procesador: 'CPU',
      procesadores: 'CPU',
      gpu: 'Tarjeta Gráfica',
      gpus: 'Tarjeta Gráfica',
      videos: 'Tarjeta Gráfica',
      tarjeta_grafica: 'Tarjeta Gráfica',
      tarjetas_graficas: 'Tarjeta Gráfica',
      case: 'Gabinete',
      cases: 'Gabinete',
      gabinete: 'Gabinete',
      gabinetes: 'Gabinete',
      chasis: 'Gabinete',
      mouse: 'Mouse',
      mouses: 'Mouse',
      keyboard: 'Teclado',
      keyboards: 'Teclado',
      teclado: 'Teclado',
      teclados: 'Teclado',
      monitor: 'Monitor',
      monitores: 'Monitor',
      pantalla: 'Monitor',
      pantallas: 'Monitor',
      motherboard: 'Electrónicos',
      motherboards: 'Electrónicos',
      ram: 'Electrónicos',
      rams: 'Electrónicos',
      memorias: 'Electrónicos',
      hdd: 'Electrónicos',
      hdds: 'Electrónicos',
      ssd: 'Electrónicos',
      ssds: 'Electrónicos',
      headset: 'Electrónicos',
      headsets: 'Electrónicos',
      auriculares: 'Electrónicos',
      speaker: 'Electrónicos',
      speakers: 'Electrónicos',
      parlantes: 'Electrónicos',
      root: 'Electrónicos',
      migrated: 'Electrónicos',
      manual: 'Electrónicos',
    };

    return mapping[lower] || 'Electrónicos';
  }

  /**
   * Mapea el folderCategory a un prefijo singular y capitalizado para nombrar productos.
   */
  private getNameBase(folderCategory: string): string {
    const lower = folderCategory.toLowerCase();
    const map: Record<string, string> = {
      cpu: 'CPU',
      'tarjeta gráfica': 'Tarjeta-Grafica',
      gabinete: 'Gabinete',
      mouse: 'Mouse',
      teclado: 'Teclado',
      monitor: 'Monitor',
      'electrónicos': 'Electronicos',
    };

    if (map[lower]) {
      return map[lower];
    }

    return folderCategory.charAt(0).toUpperCase() + folderCategory.slice(1).toLowerCase();
  }

  /**
   * Determina la extensión sugerida a partir del tipo MIME.
   */
  private getExtensionFromMime(mimeType: string): string {
    const parts = mimeType.split('/');
    const type = parts[1] || 'bin';
    if (type === 'jpeg') return 'jpg';
    return type;
  }

  /**
   * Helper recursivo para obtener todos los archivos de todas las subcarpetas.
   */
  private async getFilesRecursive(
    folderId: string,
    categoryName: string = 'root',
  ): Promise<{ file: any; folderCategory: string }[]> {
    const filesToProcess: { file: any; folderCategory: string }[] = [];
    const allItems = await this.getFilesFromFolder(folderId);

    for (const item of allItems) {
      if (item.mimeType === 'application/vnd.google-apps.folder') {
        const nextCategoryName =
          item.name.toLowerCase() === 'pc_parts' ? categoryName : item.name;
        const subFiles = await this.getFilesRecursive(
          item.id,
          nextCategoryName,
        );
        filesToProcess.push(...subFiles);
      } else {
        filesToProcess.push({ file: item, folderCategory: categoryName });
      }
    }
    return filesToProcess;
  }

  /**
   * Sincroniza metadatos desde Google Drive a PostgreSQL.
   */
  async syncFromDrive(): Promise<{
    synced: number;
    skipped: number;
    total: number;
  }> {
    if (this.envValidationErrors.length > 0) {
      throw new BadRequestException(
        `No se puede sincronizar con Google Drive. Faltan variables de entorno: ${this.envValidationErrors.join(', ')}`,
      );
    }
    const rootFolderId = this.rootFolderId!;
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'video/mp4',
    ];

    let synced = 0;
    let skipped = 0;

    try {
      const filesToProcess = await this.getFilesRecursive(rootFolderId);
      const total = filesToProcess.length;

      for (const item of filesToProcess) {
        const { file, folderCategory: rawFolderCategory } = item;

        if (!allowedMimeTypes.includes(file.mimeType)) {
          skipped++;
          continue;
        }

        const folderCategory = this.mapFolderToCategory(rawFolderCategory);

        try {
          let category = await this.categoryRepository
            .createQueryBuilder('c')
            .where('LOWER(c.nombre) = LOWER(:nombre)', {
              nombre: folderCategory,
            })
            .getOne();

          if (!category) {
            category = this.categoryRepository.create({
              nombre: folderCategory,
              descripcion: '',
            });
            category = await this.categoryRepository.save(category);
          }

          const webContentLink = file.mimeType.startsWith('image/')
            ? `https://drive.google.com/thumbnail?id=${file.id}&sz=w1000`
            : file.webContentLink ||
              file.webViewLink ||
              `https://docs.google.com/uc?export=view&id=${file.id}`;

          const productCode = `DRV-${file.id}`;
          let product = await this.productRepository.findOne({
            where: { codigo: productCode },
          });

          if (!product) {
            const count = await this.productRepository.count({
              where: { category: { id: category.id } },
            });
            const nameBase = this.getNameBase(folderCategory);
            const sequenceStr = String(count + 1).padStart(3, '0');
            const productName = `${nameBase}-${sequenceStr}`;

            product = this.productRepository.create({
              nombre: productName,
              precio: '0.00',
              stock: 0,
              descripcion: '',
              estado: ProductStatus.BORRADOR,
              category: category,
              imagen: webContentLink,
              codigo: productCode,
            });
            product = await this.productRepository.save(product);
          } else {
            product.imagen = webContentLink;
            await this.productRepository.save(product);
          }

          let resourceType = await this.resourceTypeRepository.findOne({
            where: { descripcion: file.mimeType },
          });

          if (!resourceType) {
            const ext = this.getExtensionFromMime(file.mimeType);
            resourceType = this.resourceTypeRepository.create({
              descripcion: file.mimeType,
              extension: ext,
            });
            resourceType = await this.resourceTypeRepository.save(resourceType);
          }

          let media = await this.mediaRepository.findOne({
            where: { driveId: file.id },
          });

          if (!media) {
            media = this.mediaRepository.create({
              driveId: file.id,
              fileName: file.name,
              webContentLink: webContentLink,
              folderCategory: folderCategory,
              product: product,
              productId: product.id,
              resourceType: resourceType,
              resourceTypeId: resourceType.id,
            });
          } else {
            media.fileName = file.name;
            media.webContentLink = webContentLink;
            media.folderCategory = folderCategory;
            media.product = product;
            media.productId = product.id;
            media.resourceType = resourceType;
            media.resourceTypeId = resourceType.id;
          }

          await this.mediaRepository.save(media);
          synced++;
        } catch (fileError) {
          console.error(
            `Error al sincronizar archivo individual ${file.name} (ID: ${file.id}):`,
            fileError,
          );
          skipped++;
        }
      }

      return { synced, skipped, total };
    } catch (error: any) {
      console.error(
        'Error general en la sincronización de Google Drive:',
        error,
      );
      throw new InternalServerErrorException(
        'Fallo general al sincronizar con Google Drive: ' +
          (error?.message || String(error)),
      );
    }
  }

  async findAll(): Promise<Media[]> {
    return this.mediaRepository.find({
      where: {
        driveId: Not(IsNull()),
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async getFileStream(
    driveId: string,
    rangeHeader?: string,
  ): Promise<{ stream: any; mimeType: string; size?: number; contentRange?: string; status?: number }> {
    if (!this.drive) {
      throw new InternalServerErrorException('Google Drive client no está inicializado.');
    }

    try {
      const metadata = await this.drive.files.get({
        fileId: driveId,
        fields: 'mimeType, size',
      });

      const mimeType = metadata.data.mimeType || 'image/jpeg';
      const sizeStr = metadata.data.size;
      const size = sizeStr ? parseInt(sizeStr, 10) : 0;

      if (rangeHeader && size > 0) {
        const parts = rangeHeader.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : size - 1;

        if (start >= 0 && end < size && start <= end) {
          const chunksize = (end - start) + 1;
          const response = await this.drive.files.get(
            { fileId: driveId, alt: 'media' },
            {
              responseType: 'stream',
              headers: {
                Range: `bytes=${start}-${end}`,
              },
            },
          );

          return {
            stream: response.data,
            mimeType,
            size: chunksize,
            contentRange: `bytes ${start}-${end}/${size}`,
            status: 206,
          };
        }
      }

      const response = await this.drive.files.get(
        { fileId: driveId, alt: 'media' },
        { responseType: 'stream' },
      );

      return {
        stream: response.data,
        mimeType,
        size: size > 0 ? size : undefined,
        status: 200,
      };
    } catch (error: any) {
      console.error(`Error al obtener stream del archivo ${driveId}:`, error);
      throw new NotFoundException(`No se pudo obtener el archivo de Google Drive: ${error.message}`);
    }
  }
}

import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './category.entity';

@Injectable()
export class CategoriesService implements OnModuleInit {
  constructor(
    @InjectRepository(Category)
    private readonly categoriesRepository: Repository<Category>,
  ) {}

  async onModuleInit() {
    await this.seedCategories();
    await this.cleanUpMessyCategories();
  }

  async seedCategories() {
    const defaultCategories = [
      {
        nombre: 'Tarjeta Gráfica',
        descripcion:
          'Componentes de procesamiento gráfico de alto rendimiento.',
      },
      {
        nombre: 'Monitor',
        descripcion:
          'Pantallas de visualización de alta resolución y tasas de refresco.',
      },
      {
        nombre: 'CPU',
        descripcion: 'Procesadores principales de última generación.',
      },
      {
        nombre: 'Gabinete',
        descripcion: 'Chasis y gabinetes para armar computadoras.',
      },
      {
        nombre: 'Mouse',
        descripcion: 'Dispositivos apuntadores ergonómicos y gamer.',
      },
      { nombre: 'Teclado', descripcion: 'Teclados mecánicos y de membrana.' },
      {
        nombre: 'Electrónicos',
        descripcion: 'Componentes y dispositivos electrónicos diversos.',
      },
    ];

    for (const cat of defaultCategories) {
      const exists = await this.categoriesRepository.findOne({
        where: { nombre: cat.nombre },
      });
      if (!exists) {
        console.log(`[CategoriesService] Sembrando categoría por defecto: ${cat.nombre}`);
        const category = this.categoriesRepository.create(cat);
        await this.categoriesRepository.save(category);
      }
    }
  }

  async cleanUpMessyCategories() {
    const manager = this.categoriesRepository.manager;
    console.log('[CategoriesService] Iniciando limpieza de categorías duplicadas/desordenadas...');

    // 1. Obtener los IDs de las categorías oficiales
    const categoryMap: Record<string, string> = {};
    const officialNames = ['Tarjeta Gráfica', 'Monitor', 'CPU', 'Gabinete', 'Mouse', 'Teclado', 'Electrónicos'];
    for (const name of officialNames) {
      const dbCat = await this.categoriesRepository.findOne({ where: { nombre: name } });
      if (dbCat) {
        categoryMap[name.toLowerCase()] = dbCat.id;
      }
    }

    // 2. Mapear nombres sucios a nombres limpios
    const dirtyToCleanMap: Record<string, string> = {
      '27': 'Electrónicos',
      'case': 'Gabinete',
      'cases': 'Gabinete',
      'gpu': 'Tarjeta Gráfica',
      'gpus': 'Tarjeta Gráfica',
      'hdd': 'Electrónicos',
      'hdds': 'Electrónicos',
      'headset': 'Electrónicos',
      'headsets': 'Electrónicos',
      'keyboard': 'Teclado',
      'keyboards': 'Teclado',
      'motherboard': 'Electrónicos',
      'motherboards': 'Electrónicos',
      'ram': 'Electrónicos',
      'rams': 'Electrónicos',
      'speakers': 'Electrónicos',
      'videos': 'Tarjeta Gráfica',
      'cpu': 'CPU',
      'mouse': 'Mouse',
      'monitor': 'Monitor',
      'monitores': 'Monitor',
      'teclado': 'Teclado',
      'gabinete': 'Gabinete',
      'tarjeta gráfica': 'Tarjeta Gráfica',
    };

    // 3. Obtener todas las categorías y migrar productos
    const dbCategories = await this.categoriesRepository.find();
    for (const dbCat of dbCategories) {
      const nameClean = dbCat.nombre.trim();
      const nameLower = nameClean.toLowerCase();
      
      // Si está en la lista de nombres sucios o está escrita de forma no coincidente exacta
      if (dirtyToCleanMap[nameLower]) {
        const cleanName = dirtyToCleanMap[nameLower];
        const cleanId = categoryMap[cleanName.toLowerCase()];
        
        if (cleanId && cleanId !== dbCat.id) {
          console.log(`[CategoriesService] Fusionando categoría "${dbCat.nombre}" en "${cleanName}"...`);
          
          // Mover productos asociados
          await manager.query(
            `UPDATE products SET category_id = $1 WHERE category_id = $2`,
            [cleanId, dbCat.id]
          );
          
          // Eliminar la categoría redundante
          await manager.query(
            `DELETE FROM categories WHERE id = $1`,
            [dbCat.id]
          );
        }
      }
    }

    // 4. Mapear y normalizar folderCategory en la tabla media
    console.log('[CategoriesService] Normalizando folderCategory en la tabla de multimedia...');
    for (const key of Object.keys(dirtyToCleanMap)) {
      const cleanName = dirtyToCleanMap[key];
      await manager.query(
        `UPDATE media SET "folderCategory" = $1 WHERE LOWER("folderCategory") = $2`,
        [cleanName, key]
      );
    }

    // Asegurarse de que cualquier otra fecha numérica en folderCategory se asigne a Electrónicos
    await manager.query(
      `UPDATE media SET "folderCategory" = 'Electrónicos' WHERE "folderCategory" ~ '^[0-9]+$'`
    );

    console.log('[CategoriesService] Limpieza de categorías completada con éxito.');
  }

  async findAll(): Promise<Category[]> {
    return this.categoriesRepository.find({ order: { nombre: 'ASC' } });
  }

  async findOne(id: string): Promise<Category | null> {
    return this.categoriesRepository.findOne({ where: { id } });
  }

  async findByName(nombre: string): Promise<Category | null> {
    return this.categoriesRepository.findOne({ where: { nombre } });
  }
}

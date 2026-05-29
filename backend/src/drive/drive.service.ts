import { Injectable, InternalServerErrorException, OnModuleInit } from '@nestjs/common';
import { google, drive_v3 } from 'googleapis';
import { Readable } from 'stream';

@Injectable()
export class DriveService implements OnModuleInit {
  private drive: drive_v3.Drive;

  onModuleInit() {
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
        console.log('[DriveService] Inicializado usando Google OAuth2 (Cuenta Personal)');
        return;
      } catch (error) {
        console.error('Error al inicializar cliente de Google Drive en DriveService con OAuth2:', error);
      }
    }

    // Fallback para Cuenta de Servicio
    let clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
    let privateKey = process.env.GOOGLE_PRIVATE_KEY;
    
    const googleCredentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    if (googleCredentialsJson) {
      try {
        const keyData = JSON.parse(googleCredentialsJson);
        if (!clientEmail) clientEmail = keyData.client_email;
        if (!privateKey) privateKey = keyData.private_key;
      } catch (err) {
        console.error('Error al parsear GOOGLE_APPLICATION_CREDENTIALS_JSON:', err);
      }
    }

    if (!clientEmail || !privateKey) {
      console.warn('[DriveService] Faltan credenciales de Google Drive (OAuth2 o Cuenta de Servicio). Las subidas fallarán.');
      return;
    }

    try {
      const formattedKey = privateKey.replace(/\\n/g, '\n');
      const auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: clientEmail,
          private_key: formattedKey,
        },
        // Scope completo para crear carpetas y subir archivos en cualquier carpeta compartida
        scopes: ['https://www.googleapis.com/auth/drive'],
      });
      this.drive = google.drive({ version: 'v3', auth });
    } catch (error) {
      console.error('Error al inicializar cliente de Google Drive en DriveService:', error);
    }
  }

  /**
   * Crea la estructura de carpetas: imagenes > YYYY > MM > DD
   * y retorna el ID de la carpeta del día actual.
   */
  public async getOrCreateDailyFolder(): Promise<string> {
    if (!this.drive) throw new InternalServerErrorException('Google Drive client no está inicializado.');

    const today = new Date();
    const year = today.getFullYear().toString();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');

    // Usamos el root global definido en el .env si existe, o 'root' por defecto
    const globalRootId = process.env.DRIVE_ROOT_FOLDER_ID || 'root';

    const rootImagesFolderId = await this.findOrCreateFolder('imagenes', globalRootId);
    const yearFolderId = await this.findOrCreateFolder(year, rootImagesFolderId);
    const monthFolderId = await this.findOrCreateFolder(month, yearFolderId);
    const dayFolderId = await this.findOrCreateFolder(day, monthFolderId);

    return dayFolderId;
  }

  /**
   * Función privada reutilizable para buscar o crear una carpeta en Google Drive.
   */
  private async findOrCreateFolder(folderName: string, parentId: string): Promise<string> {
    const query = `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and '${parentId}' in parents and trashed=false`;

    const response = await this.drive.files.list({
      q: query,
      fields: 'files(id, name)',
      spaces: 'drive',
    });

    const files = response.data.files;

    if (files && files.length > 0 && files[0].id) {
      return files[0].id as string;
    }

    const fileMetadata = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    };

    const createdFolder = await this.drive.files.create({
      requestBody: fileMetadata,
      fields: 'id',
    });

    return createdFolder.data.id as string;
  }

  /**
   * Transforma un buffer de Multer en Stream, lo sube a Drive y le otorga permisos de lectura pública.
   * Retorna un objeto con el driveId y el webContentLink.
   */
  public async uploadAndShareFile(file: Express.Multer.File, parentFolderId: string): Promise<{ driveId: string, webContentLink: string }> {
    if (!this.drive) throw new InternalServerErrorException('Google Drive client no está inicializado.');

    const bufferStream = new Readable();
    bufferStream.push(file.buffer);
    bufferStream.push(null);

    const fileMetadata = {
      name: file.originalname,
      parents: [parentFolderId],
    };

    const media = {
      mimeType: file.mimetype,
      body: bufferStream,
    };

    const uploadedFile = await this.drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, webContentLink',
    });

    const fileId = uploadedFile.data.id as string;
    let webContentLink = uploadedFile.data.webContentLink as string;

    await this.drive.permissions.create({
      fileId: fileId,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });

    // Construir enlace amigable para imágenes si es posible
    if (file.mimetype.startsWith('image/')) {
        webContentLink = `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
    }

    return { driveId: fileId, webContentLink };
  }
}

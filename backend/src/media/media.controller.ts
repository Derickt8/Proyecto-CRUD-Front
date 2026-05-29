import { Controller, Get, Post, HttpCode, HttpStatus, Param, Res, Inject, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import type { Response } from 'express';
import { MediaService } from './media.service';
import { ClientProxy } from '@nestjs/microservices';

@ApiTags('media')
@Controller('media')
export class MediaController {
  constructor(
    private readonly mediaService: MediaService,
    @Inject('DRIVE_SERVICE') private readonly driveClient: ClientProxy,
  ) {}

  @Get('sync')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary:
      'Sincronizar metadatos de archivos desde Google Drive a PostgreSQL (GET - Asíncrono)',
  })
  async syncFromDriveGet() {
    console.log('[MediaController] Solicitud GET sync. Emitiendo evento drive.sync.requested...');
    this.driveClient.emit('drive.sync.requested', {});
    return {
      statusCode: HttpStatus.ACCEPTED,
      message: 'Sincronización de Google Drive solicitada y procesándose en segundo plano.',
    };
  }

  @Post('sync')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary:
      'Sincronizar metadatos de archivos desde Google Drive a PostgreSQL (POST - Asíncrono)',
  })
  async syncFromDrivePost() {
    console.log('[MediaController] Solicitud POST sync. Emitiendo evento drive.sync.requested...');
    this.driveClient.emit('drive.sync.requested', {});
    return {
      statusCode: HttpStatus.ACCEPTED,
      message: 'Sincronización de Google Drive solicitada y procesándose en segundo plano.',
    };
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Obtener toda la multimedia sincronizada' })
  async findAll() {
    return this.mediaService.findAll();
  }

  @Get('file/:driveId')
  @ApiOperation({ summary: 'Obtener archivo/imagen de Google Drive' })
  async getFile(
    @Param('driveId') driveId: string,
    @Headers('range') range: string,
    @Res() res: Response,
  ) {
    const { stream, mimeType, size, contentRange, status } =
      await this.mediaService.getFileStream(driveId, range);

    const headers: any = {
      'Content-Type': mimeType,
      'Cache-Control': 'public, max-age=3600',
      'Accept-Ranges': 'bytes',
    };

    if (contentRange) {
      headers['Content-Range'] = contentRange;
    }
    if (size !== undefined) {
      headers['Content-Length'] = size;
    }

    res.status(status || 200);
    res.set(headers);
    stream.pipe(res);
  }
}

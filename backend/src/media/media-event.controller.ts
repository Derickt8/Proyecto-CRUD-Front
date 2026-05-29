import { Controller, Inject } from '@nestjs/common';
import { EventPattern, ClientProxy } from '@nestjs/microservices';
import { MediaService } from './media.service';
import { MediaGateway } from './media.gateway';

@Controller()
export class MediaEventController {
  constructor(
    private readonly mediaService: MediaService,
    private readonly mediaGateway: MediaGateway,
    @Inject('DRIVE_SERVICE') private readonly driveClient: ClientProxy,
  ) {}

  @EventPattern('drive.sync.requested')
  async handleDriveSyncRequested() {
    console.log('[MediaEventController] Consumiendo evento drive.sync.requested...');
    try {
      const result = await this.mediaService.syncFromDrive();
      console.log('[MediaEventController] Sincronización finalizada con éxito. Emitiendo drive.sync.completed...');
      // Publicamos el evento indicando que ha finalizado con el resultado del reporte
      this.driveClient.emit('drive.sync.completed', result);
    } catch (error) {
      console.error('[MediaEventController] Error durante la sincronización de Drive en background:', error);
    }
  }

  @EventPattern('drive.sync.completed')
  async handleDriveSyncCompleted(result: any) {
    console.log('[MediaEventController] Consumiendo evento drive.sync.completed. Notificando clientes vía Gateway...');
    this.mediaGateway.emitMediaSyncCompleted(result);
  }
}

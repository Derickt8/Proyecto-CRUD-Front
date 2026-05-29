import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class MediaGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  private logger: Logger = new Logger('MediaGateway');

  afterInit() {
    this.logger.log('Media WebSocket Gateway Initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Media Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Media Client disconnected: ${client.id}`);
  }

  emitMediaCreated(media: any) {
    this.server.emit('mediaCreated', media);
  }

  emitMediaDeleted(id: string) {
    this.server.emit('mediaDeleted', { id });
  }

  emitMediaSyncCompleted(result: any) {
    this.logger.log('Broadcasting mediaSyncCompleted via WebSockets', result);
    this.server.emit('mediaSyncCompleted', result);
  }
}

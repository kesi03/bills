import Transport from 'winston-transport';
import WebSocket from 'ws';

export class WebSocketTransport extends Transport {
  constructor(private clients: Set<WebSocket>) {
    super();
  }

  log(info: any, callback: () => void): void {
    setImmediate(() => this.emit('logged', info));
    const message = JSON.stringify({
      level: info.level,
      message: info.message,
      timestamp: info.timestamp,
    });

    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    }

    callback();
  }
}
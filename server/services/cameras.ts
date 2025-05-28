import { rejects } from 'assert';
import dgram from 'dgram';

export interface CameraConfig {
  ip: string;
}

class CameraClient {
  readonly id: number;
  private readonly config: CameraConfig;
  private readonly queue: { data: Buffer, resolve: (data: Buffer) => void, reject: (err: Error) => void }[] = [];

  private client = dgram.createSocket('udp4');
  private timeout;

  constructor(id: number, config: CameraConfig) {
    this.id = id;
    this.config = config;
    this.client.on('message', this.handleMessage.bind(this));
  }

  async queryPower() {
    try {
      const result = await this.send(Buffer.from([0x81, 0x09, 0x04, 0x00, 0xff]));
      return result[2] === 0x02;
    } catch (err) {
      return false;
    }
  }

  async setPower(on: boolean) {
    try {
      const result = await this.send(Buffer.from([0x81, 0x01, 0x04, 0x00, on ? 0x02 : 0x03, 0xff]));
      console.log('camera response: ', result);
      return true;
    } catch (err) {
      return false;
    }
  }

  async requestZoom(speed: number) {
    let data = 0;
    if (speed) {
      data = ((speed > 0) ? 0x20 : 0x30) + (Math.ceil(Math.abs(speed) * 7));
    }
    const result = await this.send(Buffer.from([0x81, 0x01, 0x04, 0x07, data, 0xFF]));
    return true;
  }

  private send(data: Buffer) {
    return new Promise<Buffer>((resolve, reject) => {
      const queueItem = { data, resolve, reject };
      this.queue.push(queueItem);
      this.checkSend();
    })
  }

  private handleMessage(buf: Buffer) {
    if (!this.timeout) {
      console.log('Unexpected packet when we werent waiting', buf);
      return;
    }
    clearTimeout(this.timeout);
    this.timeout = undefined;

    const queueItem = this.queue.shift();
    if (!queueItem) {
      console.log('Unexpected packet from ', this.config.ip, buf);
      return;
    }

    console.log('resolving id', this.id, queueItem.data);
    queueItem.resolve(buf);
    this.checkSend();
  }

  private checkSend() {
    const queueItem = this.queue[0];
    console.log('data for? ', this.id);
    if (queueItem) {
      console.log('to camera', this.id, queueItem.data);
      this.timeout = setTimeout(() => {
        queueItem.reject(new Error('timed out'));
        this.queue.shift();
      }, 1000);
      this.client.send(queueItem.data, 1259, this.config.ip, err => {
        if (err) {
          queueItem.reject(err);
        }
      });
    }
  }
}



export class CamerasService {
  readonly clients: CameraClient[];
  readonly idxs: number[];

  constructor(configs: CameraConfig[]) {
    this.clients = configs.map((c, i) => new CameraClient(i, c));
    this.idxs = configs.map((_c, i) => i);
  }

  async getStatus() {
    const [powers] = await Promise.all([
      Promise.all(this.clients.map(c => c.queryPower())),
    ]);
    console.log('finished getting updates');
    return this.idxs.map(i => ({
      name: `${i + 1}`,
      on: powers[i]
    }));
    //return await this.clients[0].queryPower();
  }

  setPower(on: boolean) {
    return Promise.all(this.clients.map(c => c.setPower(on)));
  }

  requestZoom(id: number, speed: number) {
    return this.clients[id - 1]?.requestZoom(speed);
  }
  // private async queryPower(id: number) {
  //   const result = await this.send(id, Buffer.from([0x81, 0x09, 0x04, 0x00, 0xFF]));
  //   return result[2] === 0x02;
  // }

  // private send(id: number, data: Buffer): Promise<Buffer> {
  //   const client = dgram.createSocket('udp4');
  //   return new Promise((resolve, reject)=> {
  //     const timeoutHolder: any = { id: undefined };
  //     client.on('message', msg => {
  //       console.log('message');
  //       resolve(msg);
  //     });
  //     client.send(data, 1259, this.configs[id].ip, err => {
  //       console.log('callback', err);
  //       if (err) {
  //         reject(err);
  //       }
  //     });
  //     console.log('after');
  //   })
  // }
}
import { rejects } from 'assert';
import dgram from 'dgram';

export interface CameraConfig {
  ip: string;
}

const DIRECTION_COMMAND_BYTES = [
  [0x02, 0x03],  // 0° to 45° - Right
  [0x02, 0x01],  // 45° to 90° - UpRight
  [0x03, 0x01],  // 90° to 135° - Up
  [0x01, 0x01],  // 135° to 180° - UpLeft
  [0x01, 0x03],  // 180° to 225° - Left
  [0x01, 0x02],  // 225° to 270° - DownLeft
  [0x03, 0x02],  // 270° to 315° - Down
  [0x02, 0x02],  // 315° to 360° - DownRight
];

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

  async requestPanTilt(speedX: number, speedY: number) {
    const buffer = Buffer.from([0x81, 0x01, 0x06, 0x01, 0x00, 0x00, 0x03, 0x03, 0xFF]);
    if (speedX !== 0 || speedY !== 0) {
      // Calculate the angle in radians from the positive X-axis
      const angle = Math.atan2(speedY, speedX);
      let degrees = angle * (180 / Math.PI);
      if (degrees < 0) degrees += 360;

      const index = Math.round(degrees / 45) % 8;
      const updateBytes = DIRECTION_COMMAND_BYTES[index];

      buffer[4] = Math.ceil(Math.abs(speedX) * 0x08);
      buffer[5] = Math.ceil(Math.abs(speedY) * 0x08);
      buffer[6] = updateBytes[0];
      buffer[7] = updateBytes[1];
    }
    await this.send(buffer);
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
  }

  setPower(on: boolean) {
    return Promise.all(this.clients.map(c => c.setPower(on)));
  }

  requestZoom(id: number, speed: number) {
    return this.clients[id - 1]?.requestZoom(speed);
  }

  requestPanTilt(id: number, speedX: number, speedY: number) {
    return this.clients[id - 1]?.requestPanTilt(speedX, speedY);
  }
}
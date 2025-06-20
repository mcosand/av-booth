import dgram from 'dgram';
import { asyncOnMap } from './util';
import { ApiDeviceStatus } from '../../common/api-models';

export interface CameraConfig {
  ip: string;
  name: string;
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
  readonly id: string;
  private readonly config: CameraConfig;
  private readonly queue: { data: Buffer, resolve: (data: Buffer) => void, reject: (err: Error) => void }[] = [];

  private client = dgram.createSocket('udp4');
  private timeout;

  constructor(id: string, config: CameraConfig) {
    this.id = id;
    this.config = config;
    this.client.on('message', this.handleMessage.bind(this));
  }

  async queryPower() {
    try {
      const result = await this.send(Buffer.from([0x81, 0x09, 0x04, 0x00, 0xff]));
      return { id: this.id, power: result[2] === 0x02 ? 'on' : 'off' };
    } catch (err) {
      return { id: this.id, power: 'unknown' };
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
    try {
      const result = await this.send(Buffer.from([0x81, 0x01, 0x04, 0x07, data, 0xFF]));
    } catch (err) {
      console.log('camera error', this.id, err);
      return false;
    }
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
    try {
      await this.send(buffer);
    } catch (err) {
      console.log('camera error', this.id, err);
      return false;
    }
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
  readonly clients: Record<string, CameraClient> = {};
  readonly configs: Record<string, CameraConfig> = {};

  static getIdFromIndex(idx: number, configs: CameraConfig[]) {
    if (idx < configs.length) {
      return `cam-${idx + 1}`;
    }
    return undefined;
  }

  constructor(configs: CameraConfig[]) {
    for (let i = 0; i < configs.length; i++) {
      const id = CamerasService.getIdFromIndex(i, configs)!;
      this.clients[id] = new CameraClient(id, configs[i]);
      this.configs[id] = configs[i]
    }
  }

  async getAllStatus(): Promise<Record<string, ApiDeviceStatus>> {
    return asyncOnMap(
      this.configs,
      (_config, id) => this.clients[id].queryPower(),
      (_id, prev, update) => ({ ...prev, power: update.power } as ApiDeviceStatus)
    );
  }

  setPower(id: string, on: boolean) {
    return this.clients[id].setPower(on);
  }

  requestZoom(id: string, speed: number) {
    return this.clients[id]?.requestZoom(speed);
  }

  requestPanTilt(id: string, speedX: number, speedY: number) {
    return this.clients[id]?.requestPanTilt(speedX, speedY);
  }
}
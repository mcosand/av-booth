import net from 'net';
import { ApiDeviceStatus } from '../../common/api-models';
import { asyncOnMap } from './util';

export interface ProjectorConfig {
  ip: string;
  name: string;
}

const POWER_LOOKUP = {
  '0': 'off',
  '1': 'on',
};

export class OptomaProjectorsService {
  readonly configs: Record<string, ProjectorConfig> = {};

  constructor(config: ProjectorConfig[]) {
    for (let i = 0; i < config.length; i++) {
      const id = 'proj-' + (i + 1);
      this.configs[id] = config[i]
    }
  }

  async getStatus(id: string): Promise<ApiDeviceStatus> {
    const result: ApiDeviceStatus = {
      power: 'unknown',
    };

    try {
      const response = (await this.tolerantHttpRequest(this.configs[id].ip, 'QueryControl'));
      const powerTest = /pw:"([0|1])"/.exec(response.body);
      if (powerTest) {
        result.power = POWER_LOOKUP[powerTest[1]];
      }
    } catch (err) {
      console.log('Cant get projector status ' + err);
    }
    return result;
  }

  async getAllStatus(): Promise<Record<string, ApiDeviceStatus>> {
    return asyncOnMap(
      this.configs,
      (_config, id) => this.getStatus(id),
      (_id, prev, update) => ({ ...prev, power: update.power } as ApiDeviceStatus)
    );
  }

  async setPower(id: string, on: boolean) {
    const result = await this.tolerantHttpRequest(this.configs[id].ip, on
      ? 'btn_powon=Power On'
      : 'btn_powoff=Power Off'
    );
    console.log('optoma power result', result);
  }

  private async tolerantHttpRequest(ip: string, body: string): Promise<{ status: number, body: string }> {
    return new Promise((resolve, reject) => {
      const client = net.createConnection({ host: ip, port: 80, family: 4 }, () => {
        client.write(`POST /form/control_cgi HTTP/1.1\r\n` +
          `Host: ${ip}\r\n` +
          `Content-Type: text/plain\r\n` +
          `Content-Length: ${Buffer.byteLength(body)}\r\n` +
          `\r\n` +
          body);
      });

      let response = '';

      client.on('data', (chunk) => {
        response += chunk.toString();
      });

      client.on('end', () => {
        const status = Number(/^HTTP[^ ]+ (\d+) /.exec(response)?.[1] ?? -1);

        response = response.substring(response.indexOf('\n\n') + 2);
        if (response.startsWith('<html>\n')) {
          response = response.substring(7);
        }
        resolve({
          status,
          body: response,
        });
      });

      client.on('error', reject);
    });
  }
}
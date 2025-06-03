export interface ApiResult<T> {
  result: T;
}

export interface ApiDeviceConfig {
  id: string;
  name: string;
}

export interface ApiCameraConfig extends ApiDeviceConfig {
  ip: string;
}

export interface ApiConfigResult {
  cameras: ApiCameraConfig[];
  projectors: ApiDeviceConfig[];
}

export interface ApiDeviceStatus {
  power: 'on' | 'off' | 'unknown';
}
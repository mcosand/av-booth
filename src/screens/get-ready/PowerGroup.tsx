import { type ReactIcon } from '@/components/Icons';
import { computed, makeObservable, observable, runInAction } from "mobx";
import { observer } from "mobx-react-lite";
import type { ApiDeviceConfig, ApiDeviceStatus, ApiResult } from "@common/api-models";

type Power = 'on' | 'off';

export const PowerButton = ({ power, value, size, onClick }: { power: Power, value: Power | 'unknown', size?: 'lg' | 'md', onClick: (power: Power) => void }) => (
  <button className={`btn btn-${size ?? 'sm'} ${power === 'on' ? 'btn-success' : 'btn-error'} ${value === power ? '' : 'btn-soft'}`} onClick={() => { if (power !== value) onClick(power); }}>{power.toUpperCase()}</button>
)

/**
 * 
 */
export class PowerGroupUiStore {
  readonly title: string;
  readonly type: string;
  readonly targets: ApiDeviceConfig[];
  @observable accessor status: Record<string, ApiDeviceStatus> = {};

  constructor(title: string, targets: ApiDeviceConfig[]) {
    makeObservable(this);
    this.title = title;
    this.type = title.toLowerCase();
    this.targets = targets;
    this.status = targets.reduce((a, c) => ({ ...a, [c.id]: c }), {});
  }

  @computed get allOn() {
    return !Object.values(this.status).find(f => f.power !== 'on');
  }

  @computed get allOff() {
    return !Object.values(this.status).find(f => f.power !== 'off');
  }

  async update() {
    const response = await fetch(`/api/${this.type}/status`);
    const result = (await response.json() as ApiResult<Record<string, ApiDeviceStatus>>).result;

    const newStatus = Object.entries(result).reduce((a, [k, v]) => ({ ...a, [k]: { ...this.status[k], power: v.power } }), {});
    runInAction(() => this.status = newStatus);
  }

  async setPower(id: string, on: boolean) {
    const response = await fetch(`/api/${this.type}/${id}/power/${on ? 'on' : 'off'}`, { method: 'POST' });
    (await response.json() as ApiResult<ApiDeviceStatus>).result;
  }

  setGroupPower(power: 'on' | 'off') {
    // Request a power change for all devices that aren't already in the desired state
    return Promise.all(
      Object.entries(this.status)
        .filter(([_id, status]) => status.power != power)
        .map(([id]) => this.setPower(id, power === 'on'))
    );
  }
}

/**
 * 
 */
export const PowerGroup = observer(({ store, Icon }: { store: PowerGroupUiStore, Icon: ReactIcon }) => {
  return (
    <div>
      <h2 className="flex items-center gap-4">
        <PowerButton power="off" size="md" value={store.allOff ? 'off' : 'unknown'} onClick={() => store.setGroupPower('off')} />
        <PowerButton power="on" size="md" value={store.allOn ? 'on' : 'unknown'} onClick={() => store.setGroupPower('on')} />
        All {store.type}
      </h2>
      {store.targets.map(f => {
        const power = store.status[f.id]?.power ?? 'unknown';
        return (
          <div key={f.id} className="flex items-center gap-3 p-2">
            <PowerButton power="off" value={power} onClick={() => store.setPower(f.id, false)} />
            <PowerButton power="on" value={power} onClick={() => store.setPower(f.id, true)} />
            <Icon style={{ width: 64, height: 64, fill: power === 'on' ? 'green' : 'gray' }} />
            <span>{f.name}</span>
          </div>
        )
      })}
    </div>
  )
});
import * as React from "react";
import { ConfigContext } from "@/App";
import { CameraIcon, ProjectorIcon, type ReactIcon } from '@/components/Icons';
import { computed, makeObservable, observable } from "mobx";
import { PowerButton, PowerGroup, PowerGroupUiStore } from "./PowerGroup";
import { observer } from "mobx-react-lite";

/**
 * 
 */
class PowerGroupsUiStore {
  @observable accessor groups: PowerGroupUiStore[] = [];
  constructor() {
    makeObservable(this);
  }

  @computed get allOn() {
    return !(this.groups.some(g => !g.allOn));
  }

  @computed get allOff() {
    return !(this.groups.some(g => !g.allOff));
  }

  async update() {
    return Promise.all(this.groups.map(g => g.update()));
  }

  setPower(on: boolean) {
    return Promise.all(this.groups.map(g => g.setGroupPower(on ? 'on' : 'off')));
  }
}

const DEVICE_ICON_BY_TYPE: Record<string, ReactIcon> = {
  'cameras': CameraIcon,
  'projectors': ProjectorIcon,
};


const GetReadyContent = observer(({ store }: { store: PowerGroupsUiStore }) => (
  <div className="flex flex-col">
    <div className="flex items-center justify-center gap-5 p-2 border-b-gray-600 border-b-1">
      <h2 className="">Master Switch:</h2>
      <PowerButton power="off" size="lg" value={store.allOff ? 'off' : 'unknown'} onClick={() => store.setPower(false)} />
      <PowerButton power="on" size="lg" value={store.allOn ? 'on' : 'unknown'} onClick={() => store.setPower(true)} />
    </div>
    <div className="flex flex-col overflow-y-auto gap-8 p-5">
      {store.groups.map(g => <PowerGroup key={g.type} Icon={DEVICE_ICON_BY_TYPE[g.type]} store={g} />)}
    </div>
  </div>
));

export default function GetReadyScreen() {
  const config = React.useContext(ConfigContext);
  const uiStore = React.useMemo(() => {
    const store = new PowerGroupsUiStore();
    store.groups.push(new PowerGroupUiStore('Cameras', config.cameras));
    store.groups.push(new PowerGroupUiStore('Projectors', config.projectors));
    return store;
  }, [config]);

  React.useEffect(() => {
    uiStore.update();
    const interval = setInterval(() => uiStore.update(), 1500);
    return () => {
      clearInterval(interval);
    };
  });

  return (<GetReadyContent store={uiStore} />);
}

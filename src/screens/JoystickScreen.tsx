import * as React from "react";
import { Joystick, JoystickShape } from 'react-joystick-component';
import type { IJoystickUpdateEvent } from "react-joystick-component/build/lib/Joystick";
import { ConfigContext } from "../App";
import { useSocket } from "../SocketContext";
import type { TallyMessage } from "../../common/socket-models";

export default function JoystickScreen() {
  const config = React.useContext(ConfigContext);
  const socket = useSocket();
  const [selectedCam, setSelectedCam] = React.useState<string>(config.cameras[0]?.id);
  const [tally, setTally] = React.useState<TallyMessage>();

  const onPanTiltEvent = React.useCallback(function onPanTileEvent(e: IJoystickUpdateEvent) {
    if (e.type === 'stop') {
      socket?.emit('pantilt', { id: selectedCam, speedX: 0, speedY: 0 });
    } else if (e.type === 'move') {
      if (!e.x) e.x = 0;
      if (!e.y) e.y = 0;
      socket?.emit('pantilt', { id: selectedCam, speedX: e.x * Math.abs(e.x), speedY: e.y * Math.abs(e.y) });
    }
  }, [socket, selectedCam]);

  const onZoomEvent = React.useCallback(function onZoomEvent(e: IJoystickUpdateEvent) {
    if (e.type === 'stop') {
      socket?.emit('zoom', { id: selectedCam, speed: 0 });
    } else if (e.type === 'move') {
      socket?.emit('zoom', { id: selectedCam, speed: e.y ?? 0 });
    }
  }, [socket, selectedCam]);

  React.useEffect(() => {
    socket?.on('tally', setTally);
    socket?.emit('get-tally');
    return () => {
      socket?.off('tally', setTally);
    }
  }, [socket]);

  React.useEffect(() => {
    if (config && config.cameras.length && !selectedCam) setSelectedCam(config.cameras[0]?.id);
  }, [config])

  return (
    <div className="flex flex-wrap w-screen h-screen">
      <div className="flex w-1/3 items-center justify-center">
        <Joystick
          size={150}
          throttle={100}
          start={onPanTiltEvent}
          move={onPanTiltEvent}
          stop={onPanTiltEvent} />
      </div>
      <div className="flex flex-col justify-evenly w-1/3">
        {config.cameras.map(c => (
          <button key={c.id} className={`btn btn-lg ${selectedCam === c.id ? '' : 'btn-soft'} btn-primary`} onClick={() => setSelectedCam(c.id)}>
            {c.name}
            {(tally?.program === c.id) && <div className="badge badge-error"></div>}
          </button>
        ))}
      </div>
      <div className="flex w-1/3 items-center justify-center">
        <Joystick
          size={150}
          controlPlaneShape={JoystickShape.AxisY}
          throttle={100}
          start={onZoomEvent}
          move={onZoomEvent}
          stop={onZoomEvent}
        />
      </div>
    </div>
  );
}

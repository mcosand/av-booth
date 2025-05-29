import * as React from "react";
import { Joystick, JoystickShape } from 'react-joystick-component';
import type { IJoystickUpdateEvent } from "react-joystick-component/build/lib/Joystick";
import { ConfigContext } from "../App";
import { useSocket } from "../SocketContext";
import type { TallyMessage } from "../../common/socket-models";

export default function JoystickScreen() {
  const config = React.useContext(ConfigContext);
  const socket = useSocket();
  const [selectedCam, setSelectedCam] = React.useState<number>(1);
  const [tally, setTally] = React.useState<TallyMessage>();

  const onPanTiltEvent = React.useCallback(function onPanTileEvent(e: IJoystickUpdateEvent) {
    console.log('tilt event', e);
    if (e.type === 'stop') {
      socket?.emit('pantilt', { id: selectedCam, speedX: 0, speedY: 0 });
    } else if (e.type === 'move') {
      if (!e.x) e.x = 0;
      if (!e.y) e.y = 0;
      socket?.emit('pantilt', { id: selectedCam, speedX: e.x * Math.abs(e.x), speedY: e.y * Math.abs(e.y) });
    }
  }, [socket, selectedCam]);

  const onZoomEvent = React.useCallback(function onZoomEvent(e: IJoystickUpdateEvent) {
    console.log('zoom event', e);
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
        {config.cameras.map((c, i) => (
          <button key={c.ip} className={`btn btn-lg ${selectedCam === i + 1 ? '' : 'btn-soft'} btn-primary`} onClick={() => setSelectedCam(i + 1)}>
            Camera {i + 1}
            {(tally?.program === (i + 1)) && <div className="badge badge-error"></div>}
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

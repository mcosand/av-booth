import * as React from "react";
import { ConfigContext } from "../App";
import { CameraView } from "../components/CameraView";

export default function ViewScreen() {
  const config = React.useContext(ConfigContext);

  return (
    <div className="flex p-4 gap-4 flex-col">
      {config.cameras.map((c) => (
        <CameraView ip={c.ip} style={{ width: 480, height: 270 }} />
      ))}
    </div>
  );
}

import * as React from "react";
import { ConfigContext } from "../App";

export default function GetReadyScreen() {
  console.log("rendering GetReadyScreen");
  const config = React.useContext(ConfigContext);
  return <div>Get ready {JSON.stringify(config)}</div>;
}

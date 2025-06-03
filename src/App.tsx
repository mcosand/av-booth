import { useState, useEffect, createContext } from "react";
import { createBrowserRouter, RouterProvider } from "react-router";
import { RootScreen } from "./screens/RootScreen";
import GetReadyScreen from "./screens/get-ready/GetReadyScreen";
import JoystickScreen from "./screens/JoystickScreen";
import { SocketProvider } from "./SocketContext";
import ViewScreen from "./screens/ViewScreen";
import type { ApiResult, ApiConfigResult } from "@common/api-models";

const router = createBrowserRouter([
  {
    path: "/",
    children: [
      { index: true, Component: RootScreen },
      { path: "preview", Component: ViewScreen },
      { path: "get-ready", Component: GetReadyScreen },
      { path: "ptz", Component: JoystickScreen },
      { path: "*", element: <div>page not found</div> },
    ],
  },
]);

export const ConfigContext = createContext<ApiConfigResult>({ cameras: [], projectors: [] });

function App() {
  const [config, setConfig] = useState<ApiConfigResult>({ cameras: [], projectors: [] });

  useEffect(() => {
    fetch("/api/config")
      .then<ApiResult<ApiConfigResult>>((r) => r.json())
      .then(r => r.result)
      .then(setConfig);
  }, []);

  return (
    <ConfigContext value={config}>
      <SocketProvider>
        <RouterProvider router={router} />
      </SocketProvider>
    </ConfigContext>
  );
}

export default App;

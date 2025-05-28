import { useState, useEffect, createContext } from "react";
import { createBrowserRouter, RouterProvider } from "react-router";
import { RootScreen } from "./screens/RootScreen";
import GetReadyScreen from "./screens/GetReadyScreen";
import JoystickScreen from "./screens/JoystickScreen";
import { SocketProvider } from "./SocketContext";
import ViewScreen from "./screens/ViewScreen";

interface Config {
  cameras: { ip: string }[];
}

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

export const ConfigContext = createContext<Config>({ cameras: [] });

function App() {
  const [config, setConfig] = useState<Config>({ cameras: [] });

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
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

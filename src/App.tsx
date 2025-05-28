import { useState, useEffect, createContext } from "react";
import { createBrowserRouter, RouterProvider } from "react-router";
import { RootScreen } from "./screens/RootScreen";
import GetReadyScreen from "./screens/GetReadyScreen";

interface Config {
  cameras: { ip: string }[];
}

const router = createBrowserRouter([
  {
    path: "/",
    children: [
      { index: true, Component: RootScreen },
      { path: "get-ready", Component: GetReadyScreen },
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
      <RouterProvider router={router} />
    </ConfigContext>
  );
}

export default App;

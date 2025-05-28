import { NavLink } from "react-router";

export function RootScreen() {
  return (
    <div>Root <NavLink to="/get-ready" className="link link-primary">Get Ready</NavLink></div>
  );
}

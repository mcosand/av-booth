import * as React from "react";
import { NavLink } from "react-router";

export function RootScreen() {
  return (
    <div>Root <NavLink to="/get-ready">Get Ready</NavLink></div>
  );
}

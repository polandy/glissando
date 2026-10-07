import { mount } from "svelte";
import "./styles/tokens.css";
import "./styles/base.css";
import App from "./app/App.svelte";
import { consumeFirstLaunch, createStorageFirstLaunchStore } from "./app/start/first-launch";

const target = document.getElementById("app");
if (!target) {
  throw new Error("Mount point #app is missing from index.html");
}
const playStartAnimation = consumeFirstLaunch(createStorageFirstLaunchStore(window.localStorage));
mount(App, { target, props: { playStartAnimation } });

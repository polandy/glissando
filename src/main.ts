import { mount } from "svelte";
import "./styles/tokens.css";
import "./styles/base.css";
import App from "./app/App.svelte";

const target = document.getElementById("app");
if (!target) {
  throw new Error("Mount point #app is missing from index.html");
}
mount(App, { target });

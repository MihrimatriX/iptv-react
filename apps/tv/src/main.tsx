import "./polyfills";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { initPlatform, platform } from "./platform";
import { fitRootFontSize } from "./layout";
import "./styles.css";

document.documentElement.dataset.platform = platform;
fitRootFontSize();

initPlatform()
  .catch((error) => console.warn("[platform] init failed", error))
  .then(() => {
    createRoot(document.getElementById("root")!).render(<App />);
  });

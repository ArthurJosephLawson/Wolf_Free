import "../dev/mockInvoke";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Companion } from "../features/wolf/Companion";
import { useSettingsStore } from "../features/settings/settingsStore";
import "../styles/globals.css";

document.documentElement.dataset.window = "companion";
document.body.dataset.window = "companion";

const container = document.getElementById("root");
if (!container) throw new Error("Wolf could not find its root element.");

void useSettingsStore.getState().load();

createRoot(container).render(
  <StrictMode>
    <Companion />
  </StrictMode>,
);

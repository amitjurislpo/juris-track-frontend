import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./standalone/App";
import "@fontsource/noto-sans-devanagari/400.css";
import "@fontsource/noto-sans-devanagari/500.css";
import "@fontsource/noto-sans-devanagari/600.css";
import "@fontsource/noto-sans-devanagari/700.css";
import "./globals.css";

// the theme is remembered in a cookie (set by the theme toggle); apply it before the first paint
try {
  document.documentElement.dataset.theme = /(?:^|; )jt_theme=light/.test(document.cookie) ? "light" : "dark";
} catch {
  /* no cookies: stay dark (the default) */
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

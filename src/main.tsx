import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./standalone/App";
import "@fontsource/geist/400.css";
import "@fontsource/geist/500.css";
import "@fontsource/geist/600.css";
import "@fontsource/geist/700.css";
import "@fontsource/geist-mono/400.css";
import "@fontsource/geist-mono/500.css";
import "@fontsource/geist-mono/600.css";
import "@fontsource/bodoni-moda/400.css";
import "@fontsource/bodoni-moda/500.css";
import "@fontsource/noto-sans-devanagari/400.css";
import "@fontsource/noto-sans-devanagari/500.css";
import "@fontsource/noto-sans-devanagari/600.css";
import "@fontsource/noto-sans-devanagari/700.css";
import "./globals.css";

// the theme is remembered in a cookie (set by the theme toggle); apply it before the first paint
try {
  document.documentElement.dataset.theme = /(?:^|; )jt_theme=dark/.test(document.cookie) ? "dark" : "light";
} catch {
  /* no cookies: stay light */
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "dist-e2e*", "node_modules"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    plugins: { "react-hooks": reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
  {
    // The embeddable layer: src/track must not import the standalone app (or anything else of this repo outside src/track),
    // and must not hard-code API addresses (they come from the TrackContext's API base path).
    files: ["src/track/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [
          { group: ["@/*", "!@/track", "!@/track/**"], message: "src/track must not import from outside src/track (the standalone app depends on it, never the other way round)." },
          { group: ["**/standalone", "**/standalone/**"], message: "src/track must not import from src/standalone." },
          { group: ["../../*", "../../../*", "../../../../*"], message: "src/track must not reach outside its own folder with relative imports." },
        ],
      }],
      "no-restricted-syntax": ["error",
        { selector: "Literal[value=/^.api([^a-z]|$)/i]", message: "No hard-coded /api addresses in src/track: use paths relative to the TrackContext's apiBasePath." },
        { selector: "TemplateElement[value.raw=/^.api([^a-z]|$)/i]", message: "No hard-coded /api addresses in src/track: use paths relative to the TrackContext's apiBasePath." },
      ],
    },
  },
);

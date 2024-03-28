import topLevelAwait from "vite-plugin-top-level-await";
import tsConfigPaths from "vite-tsconfig-paths";

import { defineConfig } from "vite";

export default defineConfig({
  plugins: [topLevelAwait(), tsConfigPaths()],
  build: {
    outDir: "build"
  }
});

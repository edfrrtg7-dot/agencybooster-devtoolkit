import * as esbuild from "esbuild";

const shared = {
  bundle: true,
  format: "esm",
  target: "es2020",
  sourcemap: true,
  logLevel: "info",
};

await Promise.all([
  esbuild.build({ ...shared, entryPoints: ["src/background.ts"], outfile: "dist/background.js", platform: "browser" }),
  esbuild.build({ ...shared, entryPoints: ["src/content.ts"], outfile: "dist/content.js", platform: "browser" }),
  esbuild.build({ ...shared, entryPoints: ["src/popup.ts"], outfile: "dist/popup.js", platform: "browser" }),
]);

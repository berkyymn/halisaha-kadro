import { execSync } from "node:child_process";
import type { NextConfig } from "next";

/** Sentry'de hataları sürüme bağlamak için: paket sürümü + git commit. */
function releaseName(): string {
  try {
    const sha = execSync("git rev-parse --short HEAD").toString().trim();
    return `halisaha-kadro@${process.env.npm_package_version ?? "0"}+${sha}`;
  } catch {
    return `halisaha-kadro@${process.env.npm_package_version ?? "0"}`;
  }
}

const nextConfig: NextConfig = {
  transpilePackages: ["@imgly/background-removal", "onnxruntime-web"],
  output: "export",
  distDir: "dist",
  env: {
    NEXT_PUBLIC_RELEASE: releaseName(),
  },
};

export default nextConfig;

import { execSync } from "node:child_process";
import { networkInterfaces } from "node:os";
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

/** Yalnızca geliştirme: telefondan ev ağı üzerinden (npm run dev:lan) erişim. */
function lanAddresses(): string[] {
  return Object.values(networkInterfaces())
    .flat()
    .filter((net) => net && net.family === "IPv4" && !net.internal)
    .map((net) => net!.address);
}

const nextConfig: NextConfig = {
  allowedDevOrigins: lanAddresses(),
  transpilePackages: ["@imgly/background-removal", "onnxruntime-web"],
  output: "export",
  distDir: "dist",
  env: {
    NEXT_PUBLIC_RELEASE: releaseName(),
  },
};

export default nextConfig;

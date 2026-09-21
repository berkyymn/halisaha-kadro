import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@imgly/background-removal", "onnxruntime-web"],
  output: "export",
  distDir: "dist",
};

export default nextConfig;

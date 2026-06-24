import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@imgly/background-removal", "onnxruntime-web"],
};

export default nextConfig;

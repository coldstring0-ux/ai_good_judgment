import type { NextConfig } from "next";
import fs from "fs";
import path from "path";

// 根据 APP_ENV 加载对应的 .env.{dev,test,prod} 文件
const appEnv = process.env.APP_ENV || "dev";
const envPath = path.resolve(process.cwd(), `.env.${appEnv}`);
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let value = trimmed.slice(eqIdx + 1).trim();
    // Strip surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key && !process.env[key]) {
      process.env[key] = value;
    }
  }
}

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;

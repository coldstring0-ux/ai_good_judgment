"use client";

import { signIn } from "next-auth/react";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted">
      <div className="max-w-sm w-full space-y-6 p-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">判断力训练</h1>
          <p className="text-muted-foreground text-sm">
            基于校准方法论，用 AI 辅助提升你的判断精度
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={async () => {
              await signIn("anonymous", { redirectTo: "/" });
            }}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 rounded-md font-medium cursor-pointer"
          >
            以游客身份继续
          </button>
          <p className="text-xs text-center text-muted-foreground">
            无需注册，数据保存在本地浏览器
          </p>
        </div>
      </div>
    </div>
  );
}

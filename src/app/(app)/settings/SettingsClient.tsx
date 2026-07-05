"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, CheckCircle2, Loader2, Moon, Sun } from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "@/components/shared/ThemeProvider";

interface SettingsClientProps {
  userId: string;
}

export function SettingsClient({ userId }: SettingsClientProps) {
  const { theme, toggleTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDeepseek, setShowDeepseek] = useState(false);
  const [showOpenai, setShowOpenai] = useState(false);

  const [deepseekKey, setDeepseekKey] = useState("");
  const [openaiKey, setOpenaiKey] = useState("");
  const [aiProvider, setAiProvider] = useState("deepseek");

  useEffect(() => {
    fetch(`/api/settings?userId=${userId}`)
      .then(r => r.json())
      .then(data => {
        if (data) setAiProvider(data.aiProvider ?? "deepseek");
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          deepseekKey: deepseekKey || undefined,
          openaiKey: openaiKey || undefined,
          aiProvider,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast.success("设置已保存");
      setDeepseekKey("");
      setOpenaiKey("");
    } catch (err) {
      toast.error("保存失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">设置</h1>
        <p className="text-muted-foreground mt-1">管理你的训练偏好和 API 配置</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>AI 配置</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>AI Provider</Label>
            <div className="flex gap-2">
              {["deepseek", "openai"].map(p => (
                <button
                  key={p}
                  onClick={() => setAiProvider(p)}
                  className={`px-4 py-2 text-sm rounded-md border transition-colors ${
                    aiProvider === p
                      ? "bg-primary text-primary-foreground border-primary"
                      : "hover:bg-accent"
                  }`}
                >
                  {p === "deepseek" ? "DeepSeek" : "OpenAI"}
                </button>
              ))}
            </div>
          </div>

          {aiProvider === "deepseek" && (
            <div className="space-y-2">
              <Label>DeepSeek API Key</Label>
              <div className="relative">
                <Input
                  type={showDeepseek ? "text" : "password"}
                  placeholder="sk-..."
                  value={deepseekKey}
                  onChange={(e) => setDeepseekKey(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowDeepseek(!showDeepseek)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showDeepseek ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                在 <a href="https://platform.deepseek.com/api_keys" target="_blank" rel="noreferrer" className="underline">platform.deepseek.com</a> 获取
              </p>
            </div>
          )}

          {aiProvider === "openai" && (
            <div className="space-y-2">
              <Label>OpenAI API Key</Label>
              <div className="relative">
                <Input
                  type={showOpenai ? "text" : "password"}
                  placeholder="sk-..."
                  value={openaiKey}
                  onChange={(e) => setOpenaiKey(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowOpenai(!showOpenai)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showOpenai ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                在 <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer" className="underline">platform.openai.com</a> 获取
              </p>
            </div>
          )}

          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
            保存
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>外观</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">主题模式</p>
              <p className="text-xs text-muted-foreground mt-0.5">切换深色/浅色主题</p>
            </div>
            <Button variant="outline" size="sm" onClick={toggleTheme}>
              {theme === "dark" ? <Sun className="h-4 w-4 mr-1" /> : <Moon className="h-4 w-4 mr-1" />}
              {theme === "dark" ? "浅色模式" : "深色模式"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>关于</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>善断计划 · 判断力训练系统 v0.1</p>
          <p>基于校准方法论，参照善断计划 / Metaculus 训练框架</p>
          <p>技术栈：Next.js + SQLite + DeepSeek/OpenAI</p>
        </CardContent>
      </Card>
    </div>
  );
}

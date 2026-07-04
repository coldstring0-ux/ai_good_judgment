"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Brain, Flame, Target, TrendingUp, Loader2 } from "lucide-react";

interface DashboardClientProps {
  userId: string;
  userName: string;
  phase: number;
}

const phaseLabels = ["基础校准期", "工具内化期", "实战闭环期"];
const phaseDescs = [
  "改掉模糊化惯性，建立概率化表达",
  "四步预测流程固化为思考习惯",
  "多领域预测实战，迁移到真实决策",
];
const phaseColors = ["bg-blue-500", "bg-green-500", "bg-purple-500"];

export function DashboardClient({ userId, userName, phase }: DashboardClientProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/analytics?userId=${userId}`)
      .then(r => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const stats = {
    streak: 0,
    todayDrills: 0,
    completedDrills: data?.drillStats?.completed ?? 0,
    totalDrills: data?.drillStats?.total ?? 0,
    avgScore: data?.drillStats?.avgScore ?? 0,
    totalResolved: data?.totalResolved ?? 0,
    avgBrier: data?.avgBrier,
  };

  const completionRate = stats.totalDrills > 0
    ? Math.round((stats.completedDrills / stats.totalDrills) * 100)
    : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">你好，{userName}</h1>
        <p className="text-muted-foreground mt-1">
          {phaseLabels[phase - 1]} · {phaseDescs[phase - 1]}
        </p>
      </div>

      {/* Phase Card */}
      <Card className="relative overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            当前阶段 · 第 {phase} 阶段
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold mb-1">{phaseLabels[phase - 1]}</div>
          <p className="text-sm text-muted-foreground mb-4">{phaseDescs[phase - 1]}</p>
          <div className="flex gap-1">
            {phaseLabels.map((_, i) => (
              <div
                key={i}
                className={`h-2 flex-1 rounded-full ${
                  i < phase ? phaseColors[i] : "bg-muted"
                } ${i === phase - 1 ? "ring-2 ring-offset-1 ring-primary" : ""}`}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">连续打卡</CardTitle>
            <Flame className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.streak} 天</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">累计练习</CardTitle>
            <Brain className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedDrills}</div>
            <p className="text-xs text-muted-foreground">共 {stats.totalDrills} 次</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">完成率</CardTitle>
            <Target className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completionRate}%</div>
            <Progress value={completionRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">预测解决</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalResolved}</div>
            <p className="text-xs text-muted-foreground">
              {stats.avgBrier !== null ? `Brier: ${stats.avgBrier.toFixed(3)}` : "暂无 Brier"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>快速开始</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {phase === 1
              ? "完成 1 道量化练习 + 1 次偏差自查，建立概率化思维习惯"
              : phase === 2
              ? "新建一道预测题，走完四步流程，跟踪你的判断精度"
              : "更新你的预测跟踪，记录真实决策并复盘"}
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href="/drills"
              className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90"
            >
              开始练习
            </a>
            <a
              href="/predictions"
              className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
            >
              查看预测
            </a>
            <a
              href="/journal"
              className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
            >
              记录决策
            </a>
            <a
              href="/analytics"
              className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
            >
              查看分析
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Empty state guidance */}
      {stats.completedDrills === 0 && stats.totalResolved === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <TrendingUp className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-1">开始你的判断力训练</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              完成每日练习 → 跟踪预测题 → 记录决策日志，6 个月建立概率化思维方式
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

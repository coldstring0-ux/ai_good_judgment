"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, LineChart, PieChart, TrendingDown, Target, Brain, Loader2 } from "lucide-react";
import {
  LineChart as RechartLine, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ComposedChart, Bar, Legend,
} from "recharts";

interface AnalyticsClientProps {
  userId: string;
}

export function AnalyticsClient({ userId }: AnalyticsClientProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/analytics?userId=${userId}`);
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [userId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return <div className="text-center text-muted-foreground py-12">加载失败</div>;
  }

  const hasPredictionData = data.brierHistory?.length > 0;
  const hasDrillData = data.drillStats?.completed > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">分析面板</h1>
        <p className="text-muted-foreground mt-1">量化你的进步轨迹</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <Brain className="h-4 w-4" /> 练习完成
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.drillStats?.completed ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <Target className="h-4 w-4" /> 预测已解决
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalResolved ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <TrendingDown className="h-4 w-4" /> 平均 Brier
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.avgBrier !== null ? data.avgBrier.toFixed(3) : "—"}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <BarChart3 className="h-4 w-4" /> 练习均分
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.drillStats?.avgScore ?? "—"}</div>
          </CardContent>
        </Card>
      </div>

      {/* Brier score chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LineChart className="h-5 w-5" />
            Brier 分数趋势
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!hasPredictionData ? (
            <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
              解决预测题后，Brier 分数趋势将在此展示
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RechartLine data={data.brierHistory}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 1]} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
                </RechartLine>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Calibration curve */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            校准曲线
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!hasPredictionData ? (
            <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
              解决预测题后，校准曲线将在此展示
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data.calibrationPoints}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="bin" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 1]} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="observed" fill="hsl(var(--primary))" name="实际频率" />
                  <Line type="monotone" dataKey="predicted" stroke="hsl(var(--chart-2))" strokeWidth={2} name="预测概率" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Drill type distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5" />
            练习分布
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!hasDrillData ? (
            <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
              完成练习后，分布数据将在此展示
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {Object.entries(data.drillStats?.typeDistribution ?? {}).map(([type, count]) => (
                <div key={type} className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">{count as number}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {type === "quantification" ? "量化" : type === "bias_check" ? "偏差" : "置信区间"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

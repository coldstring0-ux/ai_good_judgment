"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Brain, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface DrillData {
  id: string;
  type: "quantification" | "bias_check" | "confidence_interval";
  phase: number;
  question: string;
  metadata: any;
  userResponse?: any;
  score?: number | null;
  completedAt?: string;
}

interface DrillsClientProps {
  initialDrills: DrillData[];
  userId: string;
  phase: number;
}

const drillConfig = {
  quantification: { title: "量化练习", desc: "将模糊观点转化为具体概率", icon: Brain },
  bias_check: { title: "偏差自查", desc: "识别决策中的认知偏差", icon: Brain },
  confidence_interval: { title: "置信区间", desc: "校准你的置信度评估", icon: Brain },
};

const biasOptions = [
  { value: "confirmation_bias", label: "确认偏误" },
  { value: "availability_bias", label: "可得性偏差" },
  { value: "overconfidence", label: "过度自信" },
  { value: "anchoring", label: "锚定效应" },
  { value: "hindsight_bias", label: "后见之明" },
  { value: "sunk_cost", label: "沉没成本谬误" },
];

export function DrillsClient({ initialDrills, userId, phase }: DrillsClientProps) {
  const [activeType, setActiveType] = useState<"quantification" | "bias_check" | "confidence_interval">("quantification");
  const [drill, setDrill] = useState<DrillData | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ score: number; feedback: string; explanation: string; aiFeedback?: string } | null>(null);
  const [history, setHistory] = useState(initialDrills);

  // Form state
  const [probability, setProbability] = useState("");
  const [selectedBias, setSelectedBias] = useState("");
  const [reflection, setReflection] = useState("");
  const [lowerBound, setLowerBound] = useState("");
  const [upperBound, setUpperBound] = useState("");

  const generateDrill = useCallback(async (type: string) => {
    setLoading(true);
    setFeedback(null);
    setProbability("");
    setSelectedBias("");
    setReflection("");
    setLowerBound("");
    setUpperBound("");

    try {
      const res = await fetch("/api/drills/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, phase, userId }),
      });
      const data = await res.json();

      const newDrill: DrillData = {
        id: data.id,
        type: type as any,
        phase: 1,
        question: data.question,
        metadata: data.metadata || {},
      };
      setDrill(newDrill);
    } catch (err) {
      toast.error("生成题目失败，请重试");
    } finally {
      setLoading(false);
    }
  }, []);

  const submitDrill = async () => {
    if (!drill) return;
    setSubmitting(true);

    let response: any = {};
    if (drill.type === "quantification") {
      response = { probability: Number(probability) };
    } else if (drill.type === "bias_check") {
      response = { selectedBias, reflection };
    } else if (drill.type === "confidence_interval") {
      response = { lowerBound: Number(lowerBound), upperBound: Number(upperBound) };
    }

    try {
      const res = await fetch("/api/drills/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ drillId: drill.id, userId, response }),
      });
      const data = await res.json();
      setFeedback(data);

      // Update history
      setHistory(prev => [{
        ...drill,
        userResponse: response,
        score: data.score,
        completedAt: new Date().toISOString(),
      }, ...prev]);

      toast.success("练习完成！");
    } catch (err) {
      toast.error("提交失败，请重试");
    } finally {
      setSubmitting(false);
    }
  };

  const completedCount = history.filter(d => d.completedAt).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">每日练习</h1>
        <p className="text-muted-foreground mt-1">
          坚持每日训练，建立概率化思维习惯
        </p>
      </div>

      {/* Drill type selector */}
      <div className="flex flex-wrap gap-2">
        {(Object.entries(drillConfig) as Array<[keyof typeof drillConfig, typeof drillConfig[keyof typeof drillConfig]]>).map(([key, val]) => {
          const Icon = val.icon;
          return (
            <Button
              key={key}
              variant={activeType === key ? "default" : "outline"}
              onClick={() => { setActiveType(key); setDrill(null); setFeedback(null); }}
              size="sm"
            >
              <Icon className="h-4 w-4 mr-1" />
              {val.title}
            </Button>
          );
        })}
      </div>

      {/* Generate / Show drill */}
      {!drill && !loading && (
        <Card>
          <CardContent className="flex flex-col items-center py-12 text-center">
            <Sparkles className="h-10 w-10 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-1">
              {drillConfig[activeType].title}
            </h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-sm">
              {drillConfig[activeType].desc}
            </p>
            <Button onClick={() => generateDrill(activeType)}>
              <Sparkles className="h-4 w-4 mr-1" />
              AI 生成题目
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Loading */}
      {loading && (
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">AI 正在生成题目...</p>
          </CardContent>
        </Card>
      )}

      {/* Active drill */}
      {drill && !loading && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              {drillConfig[drill.type]?.title ?? "练习"}
              {drill.metadata?.difficulty && (
                <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded">
                  {drill.metadata.difficulty === "easy" ? "简单" : drill.metadata.difficulty === "medium" ? "中等" : "困难"}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border rounded-lg p-4 bg-muted/30">
              <p className="text-sm leading-relaxed">{drill.question}</p>
            </div>

            {drill.type === "quantification" && (
              <div className="flex items-end gap-2">
                <div className="space-y-1">
                  <Label>你的概率估计（0-100%）</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    placeholder="例如：70"
                    className="w-28"
                    value={probability}
                    onChange={(e) => setProbability(e.target.value)}
                  />
                </div>
                <Button
                  onClick={submitDrill}
                  disabled={!probability || submitting}
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                  提交
                </Button>
              </div>
            )}

            {drill.type === "bias_check" && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>最可能涉及的认知偏差</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={selectedBias}
                    onChange={(e) => setSelectedBias(e.target.value)}
                  >
                    <option value="">请选择...</option>
                    {biasOptions.map(b => (
                      <option key={b.value} value={b.value}>{b.label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>你的反思</Label>
                  <textarea
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="写下你的思考..."
                    value={reflection}
                    onChange={(e) => setReflection(e.target.value)}
                  />
                </div>
                <Button
                  onClick={submitDrill}
                  disabled={!selectedBias || submitting}
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                  提交
                </Button>
              </div>
            )}

            {drill.type === "confidence_interval" && (
              <div className="space-y-3">
                <div className="flex items-end gap-2">
                  <div className="space-y-1">
                    <Label>下限</Label>
                    <Input
                      type="number"
                      placeholder="最小值"
                      className="w-28"
                      value={lowerBound}
                      onChange={(e) => setLowerBound(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>上限</Label>
                    <Input
                      type="number"
                      placeholder="最大值"
                      className="w-28"
                      value={upperBound}
                      onChange={(e) => setUpperBound(e.target.value)}
                    />
                  </div>
                  <Button
                    onClick={submitDrill}
                    disabled={!lowerBound || !upperBound || submitting}
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                    提交
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  给出一个你 90% 确信包含正确答案的区间
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Feedback */}
      {feedback && (
        <Card className="border-green-200 dark:border-green-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-5 w-5" />
              反馈
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold">{Math.round(feedback.score * 100)}</span>
              <span className="text-sm text-muted-foreground">/ 100 分</span>
            </div>
            <p className="text-sm">{feedback.feedback}</p>
            {feedback.explanation && (
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs font-medium text-muted-foreground mb-1">解析</p>
                <p className="text-sm">{feedback.explanation}</p>
              </div>
            )}
            {feedback.aiFeedback && (
              <div className="bg-primary/5 rounded-lg p-3">
                <p className="text-xs font-medium text-muted-foreground mb-1">AI 教练反馈</p>
                <p className="text-sm whitespace-pre-wrap">{feedback.aiFeedback}</p>
              </div>
            )}
            <Button variant="outline" onClick={() => { setDrill(null); setFeedback(null); }}>
              再做一题
            </Button>
          </CardContent>
        </Card>
      )}

      {/* History */}
      <Card>
        <CardHeader>
          <CardTitle>练习记录</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <CheckCircle2 className="h-8 w-8 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">还没有练习记录，AI 生成一题开始吧</p>
            </div>
          ) : (
            <div className="space-y-2">
              {history.map((d) => (
                <div key={d.id} className="flex justify-between items-center py-2 border-b last:border-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm truncate">{drillConfig[d.type]?.title ?? d.type}</p>
                    <p className="text-xs text-muted-foreground">
                      {d.completedAt ? new Date(d.completedAt).toLocaleDateString("zh-CN") : "未完成"}
                    </p>
                  </div>
                  <span className={`text-sm font-medium ml-3 ${d.score !== undefined && d.score !== null ? "text-primary" : "text-muted-foreground"}`}>
                    {d.score !== undefined && d.score !== null ? `${Math.round(d.score * 100)}分` : "待评分"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BookOpen, Plus, CheckCircle2, XCircle, MinusCircle, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

interface JournalEntry {
  id: string;
  date: string;
  situation: string;
  decision: string;
  predictedOutcome: string | null;
  confidence: number | null;
  stopLoss: string | null;
  actualOutcome: string | null;
  outcomeRating: string;
  lessons: string | null;
}

interface JournalClientProps {
  userId: string;
  initialEntries: JournalEntry[];
}

export function JournalClient({ userId, initialEntries }: JournalClientProps) {
  const [entries, setEntries] = useState(initialEntries);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [situation, setSituation] = useState("");
  const [decision, setDecision] = useState("");
  const [predictedOutcome, setPredictedOutcome] = useState("");
  const [confidence, setConfidence] = useState<number | "">("");
  const [stopLoss, setStopLoss] = useState("");

  // Review state
  const [reviewEntryId, setReviewEntryId] = useState<string | null>(null);
  const [actualOutcome, setActualOutcome] = useState("");
  const [outcomeRating, setOutcomeRating] = useState<"correct" | "partially" | "wrong">("correct");
  const [lessons, setLessons] = useState("");

  const resetForm = () => {
    setSituation("");
    setDecision("");
    setPredictedOutcome("");
    setConfidence("");
    setStopLoss("");
    setShowForm(false);
  };

  const handleCreate = async () => {
    if (!situation || !decision) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/journal/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          date: new Date().toISOString().slice(0, 10),
          situation,
          decision,
          predictedOutcome: predictedOutcome || null,
          confidence: confidence !== "" ? Number(confidence) / 100 : null,
          stopLoss: stopLoss || null,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setEntries(prev => [{
        id: "temp-" + Date.now(),
        date: new Date().toISOString().slice(0, 10),
        situation,
        decision,
        predictedOutcome: predictedOutcome || null,
        confidence: confidence !== "" ? Number(confidence) / 100 : null,
        stopLoss: stopLoss || null,
        actualOutcome: null,
        outcomeRating: "pending",
        lessons: null,
      }, ...prev]);

      toast.success("决策已记录！");
      resetForm();
    } catch (err) {
      toast.error("保存失败");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReview = async () => {
    if (!reviewEntryId) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/journal/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: reviewEntryId,
          actualOutcome,
          outcomeRating,
          lessons,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setEntries(prev => prev.map(e =>
        e.id === reviewEntryId
          ? { ...e, actualOutcome, outcomeRating, lessons }
          : e
      ));

      toast.success("复盘已保存！");
      setReviewEntryId(null);
      setActualOutcome("");
      setLessons("");
    } catch (err) {
      toast.error("保存失败");
    } finally {
      setSubmitting(false);
    }
  };

  const ratingIcon = (r: string) => {
    switch (r) {
      case "correct": return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "wrong": return <XCircle className="h-4 w-4 text-red-500" />;
      case "partially": return <MinusCircle className="h-4 w-4 text-yellow-500" />;
      default: return null;
    }
  };

  const ratingLabel = (r: string) => {
    switch (r) {
      case "correct": return "正确";
      case "wrong": return "错误";
      case "partially": return "部分正确";
      default: return "待复盘";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">决策日志</h1>
          <p className="text-muted-foreground mt-1">
            记录真实决策，事后复盘偏差，持续提升决策质量
          </p>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-1" />
            记录决策
          </Button>
        )}
      </div>

      {/* New entry form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>记录新决策</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label>决策事项 *</Label>
              <Input
                placeholder="例如：健康数据项目用 SQLite 部署到服务器"
                value={situation}
                onChange={(e) => setSituation(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>当时掌握的信息</Label>
              <Textarea
                placeholder="例如：数据量小、单进程写入、并发需求低"
                value={decision}
                onChange={(e) => setDecision(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>预期结果</Label>
              <Input
                placeholder="例如：80% 概率稳定运行半年不出问题"
                value={predictedOutcome}
                onChange={(e) => setPredictedOutcome(e.target.value)}
              />
            </div>
            <div className="flex gap-4">
              <div className="space-y-1">
                <Label>置信度（0-100%）</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  placeholder="80"
                  className="w-24"
                  value={confidence}
                  onChange={(e) => setConfidence(e.target.value ? Number(e.target.value) : "")}
                />
              </div>
              <div className="space-y-1 flex-1">
                <Label>止损线（可选）</Label>
                <Input
                  placeholder="例如：出现 2 次以上写入锁死就换 MySQL"
                  value={stopLoss}
                  onChange={(e) => setStopLoss(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={resetForm}>取消</Button>
              <Button onClick={handleCreate} disabled={!situation || submitting}>
                {submitting ? "保存中..." : "保存"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Entry list */}
      {entries.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-1">还没有决策记录</h3>
            <p className="text-sm text-muted-foreground">记录你的第一个真实决策，事后回来复盘</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {entries.map(entry => (
            <Card key={entry.id}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between cursor-pointer" onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{entry.date}</span>
                      <span className="flex items-center gap-1 text-xs">
                        {ratingIcon(entry.outcomeRating)}
                        {ratingLabel(entry.outcomeRating)}
                      </span>
                    </div>
                    <p className="font-medium mt-1">{entry.situation}</p>
                  </div>
                  {expandedId === entry.id ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </div>

                {expandedId === entry.id && (
                  <div className="mt-3 pt-3 border-t space-y-3">
                    <div className="text-sm">
                      <span className="text-muted-foreground">信息：</span>
                      <span>{entry.decision}</span>
                    </div>
                    {entry.predictedOutcome && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">预期：</span>
                        <span>{entry.predictedOutcome}</span>
                      </div>
                    )}
                    {entry.confidence !== null && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">置信度：</span>
                        <span>{Math.round(entry.confidence * 100)}%</span>
                      </div>
                    )}
                    {entry.stopLoss && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">止损线：</span>
                        <span>{entry.stopLoss}</span>
                      </div>
                    )}

                    {/* Review section */}
                    {reviewEntryId === entry.id ? (
                      <div className="space-y-2 bg-muted/30 rounded-lg p-3">
                        <p className="text-sm font-medium">复盘</p>
                        <div className="space-y-1">
                          <Label className="text-xs">实际结果</Label>
                          <Textarea
                            placeholder="实际发生了什么？"
                            value={actualOutcome}
                            onChange={(e) => setActualOutcome(e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">判断评级</Label>
                          <div className="flex gap-2">
                            {(["correct", "partially", "wrong"] as const).map(r => (
                              <button
                                key={r}
                                onClick={() => setOutcomeRating(r)}
                                className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                                  outcomeRating === r ? "bg-primary text-primary-foreground" : "hover:bg-accent"
                                }`}
                              >
                                {ratingLabel(r)}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">经验教训</Label>
                          <Textarea
                            placeholder="有哪些可以改进的地方？"
                            value={lessons}
                            onChange={(e) => setLessons(e.target.value)}
                          />
                        </div>
                        <div className="flex gap-2 justify-end">
                          <Button size="sm" variant="outline" onClick={() => setReviewEntryId(null)}>取消</Button>
                          <Button size="sm" onClick={handleReview} disabled={submitting}>保存复盘</Button>
                        </div>
                      </div>
                    ) : entry.outcomeRating === "pending" ? (
                      <Button size="sm" variant="outline" onClick={() => setReviewEntryId(entry.id)}>
                        去复盘
                      </Button>
                    ) : entry.lessons ? (
                      <div className="text-sm bg-muted/30 rounded-lg p-3">
                        <span className="text-muted-foreground">经验：</span>
                        <span>{entry.lessons}</span>
                      </div>
                    ) : null}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Plus, LineChart, ArrowLeft, ArrowRight, Loader2, CheckCircle2, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface QuestionItem {
  id: string;
  questionText: string;
  domain: string;
  createdAt: string;
  latestPrediction: {
    probability: number;
    reasoning: string | null;
    baselineRate: number | null;
    version: number;
    createdAt: string;
  } | null;
}

interface PredictionsClientProps {
  userId: string;
  initialQuestions: QuestionItem[];
}

const STEPS = [
  { title: "问题", desc: "定义预测问题" },
  { title: "基线", desc: "找到基准概率" },
  { title: "信源", desc: "评估信息质量" },
  { title: "预测", desc: "最终概率与偏差自查" },
];

export function PredictionsClient({ userId, initialQuestions }: PredictionsClientProps) {
  const [questions, setQuestions] = useState(initialQuestions);
  const [showForm, setShowForm] = useState(false);
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [questionText, setQuestionText] = useState("");
  const [domain, setDomain] = useState("");
  const [resolutionCriteria, setResolutionCriteria] = useState("");
  const [baselineRate, setBaselineRate] = useState<number | "">("");
  const [baselineNotes, setBaselineNotes] = useState("");
  const [sources, setSources] = useState<Array<{ url: string; title: string; grade: string }>>([]);
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceTitle, setSourceTitle] = useState("");
  const [biasNotes, setBiasNotes] = useState("");
  const [probability, setProbability] = useState<number | "">("");

  // Active question detail
  const [activeQuestion, setActiveQuestion] = useState<QuestionItem | null>(null);
  const [newEvidence, setNewEvidence] = useState("");
  const [newEvidenceStrength, setNewEvidenceStrength] = useState<"strong" | "medium" | "weak">("medium");
  const [newEvidenceDir, setNewEvidenceDir] = useState<"supports" | "opposes" | "neutral">("supports");
  const [bayesianResult, setBayesianResult] = useState<{ posteriorProbability: number; stepByStep: string } | null>(null);
  const [updatingProb, setUpdatingProb] = useState(false);
  const [resolveOutcome, setResolveOutcome] = useState<boolean | null>(null);
  const [resolving, setResolving] = useState(false);

  const resetForm = () => {
    setQuestionText("");
    setDomain("");
    setResolutionCriteria("");
    setBaselineRate("");
    setBaselineNotes("");
    setSources([]);
    setSourceUrl("");
    setSourceTitle("");
    setBiasNotes("");
    setProbability("");
    setStep(0);
    setShowForm(false);
  };

  const handleCreate = async () => {
    if (!questionText || probability === "") return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/predictions/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          questionText,
          domain: domain || "general",
          resolutionCriteria: resolutionCriteria || null,
          probability: Number(probability) / 100,
          reasoning: baselineNotes,
          baselineRate: baselineRate !== "" ? Number(baselineRate) / 100 : null,
          sourceGrades: sources.length > 0 ? sources : null,
          biasNotes,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setQuestions(prev => [{
        id: data.questionId,
        questionText,
        domain: domain || "general",
        createdAt: new Date().toISOString(),
        latestPrediction: {
          probability: Number(probability) / 100,
          reasoning: baselineNotes,
          baselineRate: baselineRate !== "" ? Number(baselineRate) / 100 : null,
          version: 1,
          createdAt: new Date().toISOString(),
        },
      }, ...prev]);

      toast.success("预测已创建！");
      resetForm();
    } catch (err) {
      toast.error("创建失败，请重试");
    } finally {
      setSubmitting(false);
    }
  };

  const handleBayesianUpdate = async () => {
    if (!activeQuestion?.latestPrediction) return;
    setUpdatingProb(true);

    try {
      const res = await fetch("/api/predictions/update-with-evidence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: activeQuestion.id,
          userId,
          evidenceSummary: newEvidence,
          evidenceStrength: newEvidenceStrength,
          evidenceDirection: newEvidenceDir,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setBayesianResult(data);

      // Update the local question state with the new version
      setQuestions(prev => prev.map(q =>
        q.id === activeQuestion.id
          ? {
              ...q,
              latestPrediction: q.latestPrediction
                ? {
                    ...q.latestPrediction,
                    probability: data.posteriorProbability,
                    version: data.version,
                    createdAt: new Date().toISOString(),
                  }
                : null,
            }
          : q
      ));

      setActiveQuestion(prev => prev ? {
        ...prev,
        latestPrediction: prev.latestPrediction
          ? { ...prev.latestPrediction, probability: data.posteriorProbability, version: data.version, createdAt: new Date().toISOString() }
          : null,
      } : null);

      setNewEvidence("");
      toast.success("证据已保存，概率已更新！");
    } catch (err) {
      toast.error("更新失败");
    } finally {
      setUpdatingProb(false);
    }
  };

  const handleResolve = async (outcome: boolean) => {
    if (!activeQuestion) return;
    setResolving(true);

    try {
      const res = await fetch("/api/predictions/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: activeQuestion.id, userId, outcome }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setQuestions(prev => prev.filter(q => q.id !== activeQuestion.id));
      setActiveQuestion(null);
      toast.success(`已解决！Brier 分数: ${data.brierScore.toFixed(4)}`);
    } catch (err) {
      toast.error("解决失败");
    } finally {
      setResolving(false);
    }
  };

  const addSource = async () => {
    if (!sourceUrl) return;
    try {
      const res = await fetch("/api/sources/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: sourceUrl, title: sourceTitle || undefined }),
      });
      const data = await res.json();
      setSources(prev => [...prev, { url: sourceUrl, title: sourceTitle || sourceUrl, grade: data.grade }]);
    } catch {
      setSources(prev => [...prev, { url: sourceUrl, title: sourceTitle || sourceUrl, grade: "C" }]);
    }
    setSourceUrl("");
    setSourceTitle("");
  };

  const domainOptions = ["科技", "商业", "社会", "政治", "经济", "体育", "个人", "其他"];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">预测跟踪</h1>
          <p className="text-muted-foreground mt-1">
            用四步流程跟踪预测，量化你的判断精度
          </p>
        </div>
        {!showForm && !activeQuestion && (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-1" />
            新建预测
          </Button>
        )}
      </div>

      {!showForm && !activeQuestion && questions.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <LineChart className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-1">暂无预测题</h3>
            <p className="text-sm text-muted-foreground max-w-sm mb-4">
              AI 将引导你完成基线评估、信源分级、偏差自查和贝叶斯更新
            </p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-1" />
              创建你的第一道预测题
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Question list */}
      {!showForm && !activeQuestion && questions.length > 0 && (
        <div className="grid gap-3">
          {questions.map(q => (
            <Card key={q.id} className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setActiveQuestion(q)}>
              <CardContent className="flex items-center justify-between py-4">
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{q.questionText}</p>
                  <div className="flex gap-2 mt-1">
                    <span className="text-xs bg-muted px-2 py-0.5 rounded">{q.domain}</span>
                    {q.latestPrediction && (
                      <span className="text-xs text-muted-foreground">
                        概率: {Math.round(q.latestPrediction.probability * 100)}% · v{q.latestPrediction.version}
                      </span>
                    )}
                  </div>
                </div>
                <LineChart className="h-5 w-5 text-muted-foreground ml-3" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* New prediction form (4-step wizard) */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>新建预测 · {STEPS[step].title}</span>
              <span className="text-sm font-normal text-muted-foreground">{step + 1} / 4</span>
            </CardTitle>
            <Progress value={(step + 1) * 25} />
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Step 1: Question */}
            {step === 0 && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>预测问题 *</Label>
                  <Textarea
                    placeholder="例如：2026年底前纯血鸿蒙第三方应用数量会突破10万款吗？"
                    value={questionText}
                    onChange={(e) => setQuestionText(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>领域</Label>
                  <div className="flex flex-wrap gap-2">
                    {domainOptions.map(d => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setDomain(d)}
                        className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                          domain === d ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>解决标准（可选）</Label>
                  <Textarea
                    placeholder="如何判断这个预测是否成真？写下明确的标准..."
                    value={resolutionCriteria}
                    onChange={(e) => setResolutionCriteria(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Step 2: Baseline */}
            {step === 1 && (
              <div className="space-y-3">
                <div className="border rounded-lg p-3 bg-muted/30 text-sm">
                  <p className="font-medium mb-1">为什么要找基线概率？</p>
                  <p className="text-muted-foreground">基线概率是同类事件的基准发生率。先看大类概率，再根据具体细节调整，可以避免被锚定效应带偏。</p>
                </div>
                <div className="space-y-1">
                  <Label>基线概率（0-100%）</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    placeholder="例如：30"
                    value={baselineRate}
                    onChange={(e) => setBaselineRate(e.target.value ? Number(e.target.value) : "")}
                    className="w-28"
                  />
                  <p className="text-xs text-muted-foreground">同类事件在历史上的平均发生概率</p>
                </div>
                <div className="space-y-1">
                  <Label>基线分析</Label>
                  <Textarea
                    placeholder="你找到的基线数据是什么？从哪里获得的？"
                    value={baselineNotes}
                    onChange={(e) => setBaselineNotes(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Step 3: Sources */}
            {step === 2 && (
              <div className="space-y-3">
                <div className="border rounded-lg p-3 bg-muted/30 text-sm">
                  <p className="font-medium mb-1">信源分级</p>
                  <p className="text-muted-foreground">A级：官方数据/同行评审 | B级：权威媒体/行业报告 | C级：博客/二手分析 | D级：观点/未验证 | F级：不可靠</p>
                </div>
                <div className="flex gap-2 items-end">
                  <div className="space-y-1 flex-1">
                    <Label>添加信源</Label>
                    <Input placeholder="URL 或标题" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} />
                  </div>
                  <Button variant="outline" size="sm" onClick={addSource}>添加</Button>
                </div>
                {sources.length > 0 && (
                  <div className="space-y-1">
                    {sources.map((s, i) => (
                      <div key={i} className="flex items-center justify-between py-1 text-sm border-b last:border-0">
                        <span className="truncate flex-1">{s.title || s.url}</span>
                        <span className="text-xs font-medium ml-2 px-2 py-0.5 rounded bg-muted">等级 {s.grade}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Step 4: Final probability */}
            {step === 3 && (
              <div className="space-y-3">
                <div className="border rounded-lg p-3 bg-muted/30 text-sm">
                  <p className="font-medium mb-1">偏差自查</p>
                  <p className="text-muted-foreground">提交前问自己三个问题：1) 我是否只找了支持自己的证据？2) 我是否因为最近印象深就高估了概率？3) 我是否过于自信？</p>
                </div>
                <div className="space-y-1">
                  <Label>偏差反思</Label>
                  <Textarea
                    placeholder="写下你识别到的潜在偏差..."
                    value={biasNotes}
                    onChange={(e) => setBiasNotes(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>最终概率（0-100%） *</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    placeholder="例如：65"
                    value={probability}
                    onChange={(e) => setProbability(e.target.value ? Number(e.target.value) : "")}
                    className="w-28"
                  />
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => step === 0 ? resetForm() : setStep(s => s - 1)}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                {step === 0 ? "取消" : "上一步"}
              </Button>
              {step < 3 ? (
                <Button onClick={() => setStep(s => s + 1)} disabled={step === 0 && !questionText}>
                  下一步
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button onClick={handleCreate} disabled={!questionText || probability === "" || submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Sparkles className="h-4 w-4 mr-1" />}
                  提交预测
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active question detail */}
      {activeQuestion && (
        <div className="space-y-4">
          <Button variant="ghost" onClick={() => { setActiveQuestion(null); setBayesianResult(null); setResolveOutcome(null); }}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            返回列表
          </Button>

          <Card>
            <CardHeader>
              <CardTitle>{activeQuestion.questionText}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <span className="text-xs bg-muted px-2 py-0.5 rounded">{activeQuestion.domain}</span>
                {activeQuestion.latestPrediction && (
                  <>
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded font-medium">
                      概率: {Math.round(activeQuestion.latestPrediction.probability * 100)}%
                    </span>
                    <span className="text-xs text-muted-foreground">v{activeQuestion.latestPrediction.version}</span>
                  </>
                )}
              </div>
              {activeQuestion.latestPrediction?.reasoning && (
                <p className="text-sm text-muted-foreground">{activeQuestion.latestPrediction.reasoning}</p>
              )}
            </CardContent>
          </Card>

          {/* Bayesian update */}
          <Card>
            <CardHeader>
              <CardTitle>添加新证据 · 贝叶斯更新</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label>证据内容</Label>
                <Textarea
                  placeholder="描述你获得的新信息..."
                  value={newEvidence}
                  onChange={(e) => setNewEvidence(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <div className="space-y-1">
                  <Label>证据强度</Label>
                  <select
                    className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={newEvidenceStrength}
                    onChange={(e) => setNewEvidenceStrength(e.target.value as any)}
                  >
                    <option value="strong">强</option>
                    <option value="medium">中</option>
                    <option value="weak">弱</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>方向</Label>
                  <select
                    className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={newEvidenceDir}
                    onChange={(e) => setNewEvidenceDir(e.target.value as any)}
                  >
                    <option value="supports">支持</option>
                    <option value="opposes">反对</option>
                    <option value="neutral">中性</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <Button onClick={handleBayesianUpdate} disabled={!newEvidence || updatingProb}>
                    {updatingProb ? <Loader2 className="h-4 w-4 animate-spin" /> : "计算"}
                  </Button>
                </div>
              </div>

              {bayesianResult && (
                <div className="border rounded-lg p-3 bg-muted/30 space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="text-sm">更新建议：</span>
                    <span className="text-lg font-bold text-primary">
                      {Math.round(bayesianResult.posteriorProbability * 100)}%
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{bayesianResult.stepByStep}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Resolve */}
          <Card>
            <CardHeader>
              <CardTitle>解决预测</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                当预测揭晓时，标记实际结果。系统将自动计算 Brier 分数。
              </p>
              <div className="flex gap-2">
                <Button
                  variant={resolveOutcome === true ? "default" : "outline"}
                  onClick={() => setResolveOutcome(true)}
                >
                  已成真
                </Button>
                <Button
                  variant={resolveOutcome === false ? "default" : "outline"}
                  onClick={() => setResolveOutcome(false)}
                >
                  未成真
                </Button>
                {resolveOutcome !== null && (
                  <Button
                    onClick={() => handleResolve(resolveOutcome)}
                    disabled={resolving}
                  >
                    {resolving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
                    确认解决
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

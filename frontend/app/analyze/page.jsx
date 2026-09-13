"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MarketingHeader } from "@/components/MarketingHeader";
import { MarketingFooter } from "@/components/MarketingFooter";
import { AppShell } from "@/components/AppShell";
import { authFetch } from "@/lib/auth";
import {
  Sparkles,
  Github,
  Globe,
  AlertCircle,
  CheckCircle,
  Clock,
  Users,
  User,
  Plus,
  X,
  ArrowRight,
  Loader2,
  FileText,
  BarChart3,
  Target,
  TrendingUp,
  ShieldCheck,
  Calculator,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "https://project-estimation-backend-fp5x.onrender.com";
export default function AnalyzePage() {
  const router = useRouter();
  
  // Form state
  const [description, setDescription] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [deployedUrl, setDeployedUrl] = useState("");
  
  // Analysis state
  const [analysis, setAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState("");
  
  const validateInput = () => {
    if (!description.trim() && !githubUrl.trim() && !deployedUrl.trim()) {
      setError("Please provide at least one project detail — description, GitHub repository, or deployed URL.");
      return false;
    }
    setError("");
    return true;
  };
  
  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!validateInput()) return;
    
    setIsAnalyzing(true);
    setError("");
    
    try {
      const response = await authFetch(`${API}/api/project-analysis/analyze`, {
        method: "POST",
        body: JSON.stringify({
          description,
          github_url: githubUrl,
          deployed_url: deployedUrl,
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Analysis failed");
      }
      
      const result = await response.json();
      setAnalysis(result);
      try {
        localStorage.setItem("costlyai_latest_analysis", JSON.stringify(result));
      } catch {}
    } catch (err) {
      setError(err.message || "Failed to analyze project. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  const getModuleStatusIcon = (status) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="size-4 text-emerald-500" />;
      case "in_progress":
        return <Clock className="size-4 text-amber-500" />;
      default:
        return <AlertCircle className="size-4 text-red-500" />;
    }
  };
  
  const getModuleStatusColor = (status) => {
    switch (status) {
      case "completed":
        return "bg-emerald-500/10 border-emerald-500/30 text-emerald-500";
      case "in_progress":
        return "bg-amber-500/10 border-amber-500/30 text-amber-500";
      default:
        return "bg-red-500/10 border-red-500/30 text-red-500";
    }
  };
  
  return (
    <div className="min-h-screen">
      <MarketingHeader />
      
      <AppShell
        title="AI-Powered Project Analysis"
        action={
          <button
            onClick={() => router.push("/estimate")}
            className="flex items-center gap-1.5 rounded-md border border-line bg-surface px-3 py-1.5 font-mono text-xs uppercase tracking-[0.08em] text-foreground transition-colors hover:border-foreground/30"
          >
            <Calculator className="size-3.5" />
            Cost Estimator
          </button>
        }
      >
        <div className="mt-6 space-y-6">
          {/* Input Form */}
          {!analysis && (
            <>
            <div className="rounded-xl border border-line bg-surface p-5 shadow-card sm:p-6">
              <div className="mb-5 flex items-center justify-between border-b border-line pb-3">
                <div>
                  <h2 className="font-display text-xl font-semibold text-foreground">
                    Analyze Your Project
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Provide project details using any combination of description, GitHub repository, or deployed URL
                  </p>
                </div>
                <Sparkles className="size-5 shrink-0 text-muted-foreground" />
              </div>
              
              <form onSubmit={handleAnalyze} className="space-y-5">
                {error && (
                  <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3.5 py-3 text-sm text-destructive" role="alert">
                    {error}
                  </div>
                )}
                
                <div>
                  <label htmlFor="description" className="label-mono block">
                    Project Description
                  </label>
                  <textarea
                    id="description"
                    rows={4}
                    placeholder="Describe your project requirements, features, and goals..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="mt-1.5 w-full rounded-md border border-line bg-background p-3.5 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none"
                  />
                </div>
                
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="githubUrl" className="label-mono flex items-center gap-1.5">
                      <Github className="size-3.5 text-muted-foreground" />
                      GitHub Repository URL
                    </label>
                    <input
                      id="githubUrl"
                      type="url"
                      placeholder="https://github.com/user/project"
                      value={githubUrl}
                      onChange={(e) => setGithubUrl(e.target.value)}
                      className="mt-1.5 w-full rounded-md border border-line bg-background px-3.5 py-2.5 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="deployedUrl" className="label-mono flex items-center gap-1.5">
                      <Globe className="size-3.5 text-muted-foreground" />
                      Deployed Project URL
                    </label>
                    <input
                      id="deployedUrl"
                      type="url"
                      placeholder="https://myproject.com"
                      value={deployedUrl}
                      onChange={(e) => setDeployedUrl(e.target.value)}
                      className="mt-1.5 w-full rounded-md border border-line bg-background px-3.5 py-2.5 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none"
                    />
                  </div>
                </div>
                
                <button
                  type="submit"
                  disabled={isAnalyzing}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-6 py-3.5 font-mono text-sm font-semibold uppercase tracking-[0.08em] text-accent-foreground shadow-card transition-all hover:bg-accent-ink active:scale-[0.99] disabled:opacity-75"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Analyzing Project...
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-4" />
                      Analyze Project
                      <ArrowRight className="size-4" />
                    </>
                  )}
                </button>
                <p className="text-center text-xs text-muted-foreground">
                  After analysis, choose <span className="font-medium text-foreground">Solo</span> or <span className="font-medium text-foreground">Team</span> to generate a task plan and workload distribution.
                </p>
              </form>
            </div>
            <div className="rounded-xl border border-dashed border-line bg-surface/50 p-5 text-center sm:p-6">
              <h2 className="font-display text-lg font-semibold text-foreground">Want Workload Planning & Task Distribution?</h2>
              <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
                Analyze your repository here to extract completion metrics, or jump directly to the{" "}
                <Link href="/task-distribution" className="font-semibold text-accent underline hover:text-accent-ink">
                  Task Distribution Page
                </Link>{" "}
                to assign tasks and balance team workloads.
              </p>
            </div>
            </>
          )}
          
          {/* Analysis Results */}
          {analysis && (
            <>
              <div className="rounded-xl border border-line bg-surface p-5 shadow-card sm:p-6">
                <div className="mb-5 flex items-center justify-between border-b border-line pb-3">
                  <div>
                    <h2 className="font-display text-xl font-semibold text-foreground">
                      Project Analysis Results
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Based on: <span className="font-medium text-foreground">{analysis.analysis_source}</span>
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setAnalysis(null);
                      setTaskPlan(null);
                    }}
                    className="flex items-center gap-1.5 rounded-md border border-line bg-surface px-3 py-1.5 font-mono text-xs uppercase tracking-[0.08em] text-foreground transition-colors hover:border-foreground/30"
                  >
                    <FileText className="size-3.5" />
                    New Analysis
                  </button>
                </div>
                
                {/* Overall Completion */}
                <div className="mb-6 rounded-xl border border-line bg-background/50 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="size-5 text-accent" />
                      <span className="font-display text-lg font-semibold text-foreground">
                        Overall Completion
                      </span>
                    </div>
                    <span className="font-display text-3xl font-bold text-foreground">
                      {analysis.overall_completion}%
                    </span>
                  </div>
                  <div className="h-3 bg-line rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-accent to-accent/70 transition-all duration-1000"
                      style={{ width: `${analysis.overall_completion}%` }}
                    />
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    Project Type: <span className="font-medium text-foreground">{analysis.project_type}</span>
                  </div>
                </div>
                
                {/* Module Status */}
                <div className="mb-6">
                  <h3 className="font-display text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Target className="size-5 text-accent" />
                    Module Status
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {analysis.modules.map((module, index) => (
                      <div
                        key={index}
                        className={`rounded-lg border p-4 ${getModuleStatusColor(module.status)}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-foreground">{module.name}</span>
                          {getModuleStatusIcon(module.status)}
                        </div>
                        <div className="h-2 bg-background/50 rounded-full overflow-hidden mb-2">
                          <div
                            className="h-full bg-current transition-all duration-1000"
                            style={{ width: `${module.completion_percentage}%` }}
                          />
                        </div>
                        <span className="text-xs font-mono">{module.completion_percentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Features */}
                <div className="grid gap-4 sm:grid-cols-3 mb-6">
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle className="size-4 text-emerald-500" />
                      <span className="font-semibold text-foreground">Completed</span>
                    </div>
                    <ul className="space-y-2 text-sm">
                      {analysis.completed_features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-2 text-foreground">
                          <span className="text-emerald-500 mt-0.5">✓</span>
                          <span>{feature}</span>
                        </li>
                      ))}
                      {analysis.completed_features.length === 0 && (
                        <li className="text-muted-foreground text-xs">None identified</li>
                      )}
                    </ul>
                  </div>
                  
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Clock className="size-4 text-amber-500" />
                      <span className="font-semibold text-foreground">In Progress</span>
                    </div>
                    <ul className="space-y-2 text-sm">
                      {analysis.in_progress_features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-2 text-foreground">
                          <span className="text-amber-500 mt-0.5">◐</span>
                          <span>{feature}</span>
                        </li>
                      ))}
                      {analysis.in_progress_features.length === 0 && (
                        <li className="text-muted-foreground text-xs">None identified</li>
                      )}
                    </ul>
                  </div>
                  
                  <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertCircle className="size-4 text-red-500" />
                      <span className="font-semibold text-foreground">Remaining</span>
                    </div>
                    <ul className="space-y-2 text-sm">
                      {analysis.remaining_features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-2 text-foreground">
                          <span className="text-red-500 mt-0.5">○</span>
                          <span>{feature}</span>
                        </li>
                      ))}
                      {analysis.remaining_features.length === 0 && (
                        <li className="text-muted-foreground text-xs">None identified</li>
                      )}
                    </ul>
                  </div>
                </div>
                
                {/* Recommended Next Steps */}
                <div className="mb-6 rounded-xl border border-line bg-background/50 p-4">
                  <h3 className="font-display text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                    <TrendingUp className="size-5 text-accent" />
                    Recommended Next Steps
                  </h3>
                  <ol className="space-y-2">
                    {analysis.recommended_next_steps.map((step, index) => (
                      <li key={index} className="flex items-start gap-3 text-sm text-foreground">
                        <span className="flex size-6 items-center justify-center rounded-full bg-accent/10 text-accent-ink font-mono text-xs font-bold shrink-0">
                          {index + 1}
                        </span>
                        <span className="leading-relaxed">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
                
                {/* Evidence Notes */}
                {analysis.evidence_notes && analysis.evidence_notes.length > 0 && (
                  <div className="rounded-xl border border-line bg-background/50 p-4">
                    <h3 className="font-display text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                      <ShieldCheck className="size-4 text-muted-foreground" />
                      Evidence Notes
                    </h3>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      {analysis.evidence_notes.map((note, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="text-accent">•</span>
                          <span>{note}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              
              {/* Dedicated Task Distribution Callout Banner */}
              <div className="rounded-xl border border-accent/40 bg-gradient-to-r from-accent/10 via-surface to-surface p-6 shadow-card">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-accent-ink">
                      <Users className="size-4" />
                      Next Step: Dedicated Workload & Task Distribution
                    </div>
                    <h3 className="font-display text-xl font-bold text-foreground">
                      Distribute Tasks Across Your Team
                    </h3>
                    <p className="text-xs text-muted-foreground max-w-xl">
                      Assign the {analysis.remaining_features?.length || 0} remaining features to team members based on their specific skills, or build an ordered solo dependency plan on the separate Task Distribution workspace.
                    </p>
                  </div>
                  <Link
                    href="/task-distribution"
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-5 py-3 font-mono text-xs font-bold uppercase tracking-wider text-accent-foreground shadow-md transition hover:bg-accent-ink shrink-0"
                  >
                    Open Task Distribution Page
                    <ArrowRight className="size-4" />
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>
      </AppShell>
      
      <MarketingFooter />
    </div>
  );
}

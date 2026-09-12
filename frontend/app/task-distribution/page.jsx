"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { MarketingHeader } from "@/components/MarketingHeader";
import { MarketingFooter } from "@/components/MarketingFooter";
import { AppShell } from "@/components/AppShell";
import { authFetch } from "@/lib/auth";
import {
  Users,
  Target,
  ArrowRight,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  X,
  Copy,
  Check,
  Sparkles,
  Clock,
  Layers,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  Search,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://https://project-estimation-backend-fp5x.onrender.com";

const DEFAULT_TEAM_SIZE = 3;
const TEAM_SIZE_OPTIONS = Array.from({ length: 10 }, (_, i) => i + 1);

const makeMember = (index) => ({ name: `Member ${index + 1}`, role: "Team member", skills: [] });
const makeTeam = (count) => Array.from({ length: count }, (_, i) => makeMember(i));

const SAMPLE_PROJECTS = [
  {
    title: "SaaS Analytics & Billing Platform",
    project_type: "Fullstack SaaS Application",
    overall_completion: 45,
    estimated_remaining_hours: 64,
    analysis_source: "Sample Architecture Template",
    modules: [
      { name: "User Auth & RBAC", completion_percentage: 100, status: "completed" },
      { name: "Usage Tracking Dashboard", completion_percentage: 60, status: "in_progress" },
      { name: "Stripe / Razorpay Billing", completion_percentage: 20, status: "in_progress" },
      { name: "Automated Reporting & Export", completion_percentage: 0, status: "not_started" },
    ],
    completed_features: ["JWT authentication", "Role-based route protection", "Basic profile settings"],
    in_progress_features: ["Live usage metric calculation", "Invoice generation & payment gateway"],
    remaining_features: ["PDF report generation", "Webhook dispatch for failed payments", "Team invitations"],
    recommended_next_steps: ["Complete payment webhooks", "Finalize data aggregation queries", "Add end-to-end integration tests"],
    evidence_notes: ["Auth service is functional with test suites", "Payment endpoints need webhook signature validation"],
  },
  {
    title: "E-Commerce Mobile & Web Store",
    project_type: "E-Commerce Platform",
    overall_completion: 60,
    estimated_remaining_hours: 48,
    analysis_source: "Sample Architecture Template",
    modules: [
      { name: "Product Catalog & Search", completion_percentage: 90, status: "completed" },
      { name: "Cart & Checkout Flow", completion_percentage: 75, status: "in_progress" },
      { name: "Order Management & Tracking", completion_percentage: 40, status: "in_progress" },
      { name: "Customer Review System", completion_percentage: 0, status: "not_started" },
    ],
    completed_features: ["Elastic product search", "Inventory cache", "Multi-currency cart"],
    in_progress_features: ["Checkout address validation", "Order status tracker"],
    remaining_features: ["Verified review badge", "Notification SMS/email triggers"],
    recommended_next_steps: ["Finalize payment callback handler", "Build admin order fulfillment view"],
    evidence_notes: ["Catalog endpoints tested", "Checkout state needs persistent storage"],
  },
];

const PRIORITY_STYLES = {
  high: "bg-red-500/10 text-red-600",
  medium: "bg-amber-500/10 text-amber-600",
  low: "bg-emerald-500/10 text-emerald-600",
};

function PriorityBadge({ priority }) {
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${PRIORITY_STYLES[priority] || "bg-line/60 text-muted-foreground"
        }`}
    >
      {priority}
    </span>
  );
}

function TaskRow({ task, index }) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-line/70 bg-background/40 p-3.5 transition hover:border-line sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-line/60 text-[11px] font-semibold text-muted-foreground">
          {task.recommended_order || index + 1}
        </span>
        <div className="min-w-0 space-y-1">
          <h4 className="text-sm font-medium text-foreground">{task.name}</h4>
          <p className="text-sm leading-relaxed text-muted-foreground">{task.description}</p>
          {task.dependencies && task.dependencies.length > 0 && (
            <p className="pt-0.5 text-xs text-muted-foreground">
              Depends on <span className="text-foreground">{task.dependencies.join(", ")}</span>
            </p>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2 pl-9 sm:flex-col sm:items-end sm:gap-1.5 sm:pl-0">
        <span className="font-mono text-xs font-medium text-foreground">{task.estimated_hours}h</span>
        <PriorityBadge priority={task.priority} />
      </div>
    </div>
  );
}

export default function TaskDistributionPage() {
  // Project Analysis State
  const [analysis, setAnalysis] = useState(null);
  const [savedAnalyses, setSavedAnalyses] = useState([]);
  const [isLoadingSaved, setIsLoadingSaved] = useState(false);
  const [showProjectPicker, setShowProjectPicker] = useState(false);

  // Planning Configuration
  const [workType, setWorkType] = useState("team");
  const [teamMembers, setTeamMembers] = useState(() => makeTeam(DEFAULT_TEAM_SIZE));
  const [showTeamDropdown, setShowTeamDropdown] = useState(false);

  // Task Plan Result
  const [taskPlan, setTaskPlan] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");

  // Load latest analysis on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("costlyai_latest_analysis");
      if (stored) {
        setAnalysis(JSON.parse(stored));
      } else {
        setAnalysis(SAMPLE_PROJECTS[0]);
      }
    } catch {
      setAnalysis(SAMPLE_PROJECTS[0]);
    }

    const fetchSaved = async () => {
      try {
        setIsLoadingSaved(true);
        const res = await authFetch(`${API}/api/project-analysis/analyses`);
        if (res.ok) {
          const list = await res.json();
          if (Array.isArray(list) && list.length > 0) {
            setSavedAnalyses(list);
          }
        }
      } catch {
        // Ignore silent fetch errors
      } finally {
        setIsLoadingSaved(false);
      }
    };
    fetchSaved();
  }, []);

  // Resize the roster to the chosen headcount, keeping any names/roles
  // already typed in and filling new slots with generic placeholders.
  const resizeTeam = (count) => {
    setTeamMembers((prev) => Array.from({ length: count }, (_, i) => prev[i] || makeMember(i)));
  };

  const removeTeamMember = (index) => {
    setTeamMembers((prev) => prev.filter((_, i) => i !== index));
  };

  const updateTeamMember = (index, field, value) => {
    setTeamMembers((prev) => prev.map((m, i) => (i === index ? { ...m, [field]: value } : m)));
  };

  const selectProject = (proj) => {
    setAnalysis(proj);
    setTaskPlan(null);
    setShowProjectPicker(false);
    localStorage.setItem("costlyai_latest_analysis", JSON.stringify(proj));
  };

  const handleGenerateTaskPlan = async () => {
    if (!analysis) {
      setError("Please choose or analyze a project first.");
      return;
    }

    if (workType === "team" && teamMembers.length === 0) {
      setError("Please add at least one team member to distribute tasks.");
      return;
    }

    setIsGenerating(true);
    setError("");

    try {
      const payload = {
        analysis: {
          overall_completion: analysis.overall_completion || 0,
          project_type: analysis.project_type || "Web Application",
          modules: analysis.modules || [],
          completed_features: analysis.completed_features || [],
          in_progress_features: analysis.in_progress_features || [],
          remaining_features: analysis.remaining_features || [],
          recommended_next_steps: analysis.recommended_next_steps || [],
          estimated_remaining_hours: analysis.estimated_remaining_hours || 40,
          analysis_source: analysis.analysis_source || "Project Analysis",
          evidence_notes: analysis.evidence_notes || [],
        },
        work_type: workType,
        team_members:
          workType === "team"
            ? teamMembers.map((m) => ({
              name: m.name,
              role: m.role,
              skills: m.skills,
            }))
            : undefined,
      };

      const response = await authFetch(`${API}/api/project-analysis/task-plan`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Task plan generation failed");
      }

      const result = await response.json();
      setTaskPlan(result);
    } catch (err) {
      setError(err.message || "Failed to generate task distribution. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyMarkdown = () => {
    if (!taskPlan) return;
    let md = `# Task Distribution Plan — ${analysis?.project_type || "Project"}\n`;
    md += `Mode: ${workType === "team" ? "Team Distribution" : "Solo Sequential Plan"}\n`;
    if (taskPlan.workload_balance) {
      md += `Workload Balance: ${taskPlan.workload_balance}\n`;
    }
    md += `\n---\n\n`;

    if (workType === "solo" && taskPlan.tasks) {
      taskPlan.tasks.forEach((t) => {
        md += `### ${t.recommended_order}. ${t.name} (${t.estimated_hours}h - Priority: ${t.priority})\n`;
        md += `${t.description}\n`;
        if (t.dependencies && t.dependencies.length > 0) {
          md += `*Dependencies: ${t.dependencies.join(", ")}*\n`;
        }
        md += `\n`;
      });
    } else if (workType === "team" && taskPlan.assignments) {
      taskPlan.assignments.forEach((a) => {
        md += `## ${a.member_name} — Total: ${a.total_hours}h\n\n`;
        a.tasks.forEach((t) => {
          md += `- [ ] **${t.name}** (${t.estimated_hours}h | ${t.priority})\n  ${t.description}\n`;
        });
        md += `\n`;
      });
    }

    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const filteredSoloTasks =
    taskPlan?.tasks?.filter((t) => {
      const matchSearch =
        !searchQuery ||
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchPriority = priorityFilter === "all" || t.priority.toLowerCase() === priorityFilter.toLowerCase();
      return matchSearch && matchPriority;
    }) || [];

  const maxAssignmentHours = useMemo(() => {
    if (!taskPlan?.assignments?.length) return 1;
    return Math.max(...taskPlan.assignments.map((a) => a.total_hours || 1));
  }, [taskPlan]);

  const completionPct = analysis?.overall_completion ?? 0;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <MarketingHeader />

      <AppShell title="Task Distribution & Workload Planning">
        <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
          {/* Header */}
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-xl">
              <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Task distribution
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Turn a project analysis into a dependency-aware plan — sequenced for one person, or balanced across a team by skill.
              </p>
            </div>

            {/* Project selector */}
            <div className="relative shrink-0 sm:w-72">
              <button
                onClick={() => setShowProjectPicker(!showProjectPicker)}
                className="flex w-full items-center justify-between gap-3 rounded-lg border border-line bg-surface px-4 py-3 text-left transition hover:border-foreground/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-foreground">
                    {analysis?.title || analysis?.project_type || "Select a project"}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {analysis ? `${completionPct}% complete` : "No project selected"}
                  </span>
                </span>
                <ChevronDown
                  className={`size-4 shrink-0 text-muted-foreground transition-transform ${showProjectPicker ? "rotate-180" : ""}`}
                />
              </button>

              {showProjectPicker && (
                <div className="absolute right-0 z-20 mt-2 w-full overflow-hidden rounded-lg border border-line bg-surface shadow-lift">
                  {isLoadingSaved && (
                    <div className="flex items-center gap-2 px-4 py-3 text-xs text-muted-foreground">
                      <Loader2 className="size-3.5 animate-spin" />
                      Loading your saved analyses…
                    </div>
                  )}

                  {savedAnalyses.length > 0 && (
                    <div className="border-b border-line p-1.5">
                      <p className="px-2.5 py-1.5 text-xs text-muted-foreground">Your analyses</p>
                      {savedAnalyses.map((s, idx) => (
                        <button
                          key={idx}
                          onClick={() => selectProject(s)}
                          className="flex w-full items-center justify-between gap-3 rounded-md px-2.5 py-2 text-left transition hover:bg-background"
                        >
                          <span className="min-w-0 truncate text-sm text-foreground">{s.project_type || "Analyzed Project"}</span>
                          <span className="shrink-0 text-xs text-muted-foreground">{s.overall_completion}%</span>
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="p-1.5">
                    <p className="px-2.5 py-1.5 text-xs text-muted-foreground">Template projects</p>
                    {SAMPLE_PROJECTS.map((p, idx) => (
                      <button
                        key={idx}
                        onClick={() => selectProject(p)}
                        className="flex w-full items-center justify-between gap-3 rounded-md px-2.5 py-2 text-left transition hover:bg-background"
                      >
                        <span className="min-w-0 truncate text-sm text-foreground">{p.title}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">{p.overall_completion}%</span>
                      </button>
                    ))}
                  </div>

                  <Link
                    href="/analyze"
                    className="flex items-center justify-center gap-1.5 border-t border-line px-4 py-2.5 text-xs text-muted-foreground transition hover:bg-background hover:text-foreground"
                  >
                    Analyze another repo
                    <ExternalLink className="size-3" />
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Project summary strip */}
          {analysis && (
            <div className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Layers className="size-4 text-accent" />
                  {analysis.modules?.length || 0} modules
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="size-4 text-accent" />
                  {analysis.estimated_remaining_hours || 0}h remaining
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="size-4 text-emerald-500" />
                  {analysis.completed_features?.length || 0} features done
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-1.5 w-28 overflow-hidden rounded-full bg-line sm:w-32">
                  <div
                    className="h-full rounded-full bg-accent transition-all duration-500"
                    style={{ width: `${Math.max(4, completionPct)}%` }}
                  />
                </div>
                <span className="text-sm font-semibold text-foreground">{completionPct}%</span>
              </div>
            </div>
          )}

          {/* Configuration toolbar */}
          <div className="space-y-5 rounded-xl border border-line bg-surface p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="inline-flex rounded-lg border border-line p-1">
                  <button
                    type="button"
                    onClick={() => setWorkType("solo")}
                    aria-pressed={workType === "solo"}
                    className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition ${workType === "solo" ? "bg-ink text-ink-foreground" : "text-muted-foreground hover:text-foreground"
                      }`}
                  >
                    Solo
                  </button>
                  <button
                    type="button"
                    onClick={() => setWorkType("team")}
                    aria-pressed={workType === "team"}
                    className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition ${workType === "team" ? "bg-ink text-ink-foreground" : "text-muted-foreground hover:text-foreground"
                      }`}
                  >
                    Team
                  </button>
                </div>
                <p className="hidden text-sm text-muted-foreground sm:block">
                  {workType === "solo"
                    ? "Sequenced chronologically with dependencies mapped."
                    : "Balanced across your roster by skill and capacity."}
                </p>
              </div>
            </div>

            {workType === "team" && (
              <div className="border-t border-line pt-5">
                <div className="relative sm:w-80">
                  <button
                    onClick={() => setShowTeamDropdown(!showTeamDropdown)}
                    className="flex w-full items-center justify-between gap-3 rounded-lg border border-line bg-background px-4 py-3 text-left transition hover:border-foreground/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-foreground">Team size</span>
                      <span className="block text-xs text-muted-foreground">
                        {teamMembers.length} member{teamMembers.length === 1 ? "" : "s"}
                      </span>
                    </span>
                    <ChevronDown
                      className={`size-4 shrink-0 text-muted-foreground transition-transform ${showTeamDropdown ? "rotate-180" : ""}`}
                    />
                  </button>

                  {showTeamDropdown && (
                    <div className="absolute left-0 right-0 z-20 mt-2 rounded-lg border border-line bg-surface shadow-lift sm:right-auto sm:w-96">
                      <div className="p-3">
                        <p className="mb-2 text-xs text-muted-foreground">How many people are on the team?</p>
                        <div className="flex flex-wrap gap-1.5">
                          {TEAM_SIZE_OPTIONS.map((n) => (
                            <button
                              key={n}
                              type="button"
                              onClick={() => resizeTeam(n)}
                              aria-pressed={teamMembers.length === n}
                              className={`flex size-9 items-center justify-center rounded-md border text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${teamMembers.length === n
                                  ? "border-ink bg-ink text-ink-foreground"
                                  : "border-line text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                                }`}
                            >
                              {n}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="max-h-64 space-y-0.5 overflow-y-auto border-t border-line p-1.5">
                        {teamMembers.map((member, idx) => (
                          <div key={idx} className="flex items-center gap-2 rounded-md px-1.5 py-1.5">
                            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent/10 text-xs font-semibold text-accent-ink">
                              {idx + 1}
                            </span>
                            <input
                              type="text"
                              value={member.name}
                              onChange={(e) => updateTeamMember(idx, "name", e.target.value)}
                              placeholder={`Member ${idx + 1}`}
                              className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-2 py-1 text-sm text-foreground transition hover:border-line focus:border-accent focus:bg-background focus:outline-none"
                            />
                            <input
                              type="text"
                              value={member.role}
                              onChange={(e) => updateTeamMember(idx, "role", e.target.value)}
                              placeholder="Role"
                              className="w-24 min-w-0 shrink-0 rounded-md border border-transparent bg-transparent px-2 py-1 text-xs text-muted-foreground transition hover:border-line focus:border-accent focus:bg-background focus:outline-none"
                            />
                            <button
                              onClick={() => removeTeamMember(idx)}
                              aria-label={`Remove member ${idx + 1}`}
                              className="shrink-0 p-1 text-muted-foreground transition hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                            >
                              <X className="size-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
              {error ? (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertTriangle className="size-4 shrink-0" />
                  {error}
                </div>
              ) : (
                <span />
              )}
              <button
                type="button"
                onClick={handleGenerateTaskPlan}
                disabled={isGenerating}
                className="flex items-center justify-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground shadow-sm transition hover:bg-accent-ink disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 sm:w-auto"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Generating…
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4" />
                    {taskPlan ? "Regenerate plan" : "Generate task distribution"}
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Results */}
          {!taskPlan ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line px-6 py-16 text-center">
              <div className="grid size-12 place-items-center rounded-full bg-accent/10 text-accent">
                <Target className="size-6" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-foreground">No plan generated yet</h3>
              <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">
                Choose solo or team mode above, then generate a plan for {analysis?.title || analysis?.project_type || "your project"}.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Results header */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2.5">
                  <h2 className="text-base font-semibold text-foreground">
                    {workType === "team" ? "Team distribution" : "Solo sequence"}
                  </h2>
                  <span className="rounded-full bg-line/60 px-2.5 py-0.5 text-xs text-muted-foreground">
                    {workType === "team"
                      ? `${taskPlan.assignments?.length || 0} members`
                      : `${taskPlan.tasks?.length || 0} tasks`}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={copyMarkdown}
                    className="flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                    {copied ? "Copied" : "Copy markdown"}
                  </button>
                  <button
                    onClick={handleGenerateTaskPlan}
                    disabled={isGenerating}
                    className="flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <RefreshCw className={`size-3.5 ${isGenerating ? "animate-spin" : ""}`} />
                    Regenerate
                  </button>
                </div>
              </div>

              {taskPlan.overloaded_members && taskPlan.overloaded_members.length > 0 && (
                <div className="flex items-start gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" />
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">{taskPlan.overloaded_members.join(", ")}</span> may be
                    overloaded — consider rebalancing or adding another team member.
                  </p>
                </div>
              )}

              {taskPlan.workload_balance && (
                <div className="flex items-center justify-between rounded-lg border border-line bg-surface/60 px-4 py-3">
                  <span className="text-sm text-muted-foreground">Workload assessment</span>
                  <span className="text-sm font-medium text-foreground">{taskPlan.workload_balance}</span>
                </div>
              )}

              {/* TEAM VIEW */}
              {workType === "team" && taskPlan.assignments && (
                <div className="space-y-4">
                  {taskPlan.assignments.map((assignment, aIdx) => {
                    const pct = Math.round(((assignment.total_hours || 0) / maxAssignmentHours) * 100);
                    return (
                      <div key={aIdx} className="rounded-xl border border-line bg-surface p-5">
                        <div className="flex flex-col gap-3 border-b border-line pb-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent/10 text-sm font-semibold text-accent-ink">
                              {assignment.member_name.charAt(0)}
                            </span>
                            <div className="min-w-0">
                              <h4 className="truncate text-sm font-semibold text-foreground">{assignment.member_name}</h4>
                              <span className="text-xs text-muted-foreground">{assignment.tasks?.length || 0} tasks assigned</span>
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-3">
                            <span className="font-mono text-sm font-medium text-foreground">{assignment.total_hours}h</span>
                            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-line">
                              <div className="h-full rounded-full bg-accent transition-all duration-500" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 space-y-2.5">
                          {assignment.tasks
                            ?.slice()
                            .sort((a, b) => (a.recommended_order || 0) - (b.recommended_order || 0))
                            .map((task, tIdx) => (
                              <TaskRow key={tIdx} task={task} index={tIdx} />
                            ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* SOLO VIEW */}
              {workType === "solo" && taskPlan.tasks && (
                <div className="space-y-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="relative flex-1">
                      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Search tasks…"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full rounded-lg border border-line bg-surface py-2.5 pl-9 pr-3 text-sm text-foreground focus:border-accent focus:outline-none"
                      />
                    </div>
                    <div className="inline-flex shrink-0 rounded-lg border border-line p-1">
                      {["all", "high", "medium", "low"].map((p) => (
                        <button
                          key={p}
                          onClick={() => setPriorityFilter(p)}
                          aria-pressed={priorityFilter === p}
                          className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${priorityFilter === p ? "bg-ink text-ink-foreground" : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  {filteredSoloTasks.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-line p-10 text-center text-sm text-muted-foreground">
                      No tasks match your search or filter.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {filteredSoloTasks.map((task, idx) => (
                        <TaskRow key={idx} task={task} index={idx} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </AppShell>

      <MarketingFooter />
    </div>
  );
}
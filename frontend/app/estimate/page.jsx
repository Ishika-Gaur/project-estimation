"use client";

import { useState, useEffect } from "react";
import { MarketingHeader } from "@/components/MarketingHeader";
import { MarketingFooter } from "@/components/MarketingFooter";
import { AppShell } from "@/components/AppShell";
import { EstimateReport } from "@/components/EstimateReport";
import {
  PLATFORMS,
  POPULAR_TECHS,
  SUGGESTED_FEATURES,
  generateEstimate,
  listEstimates,
} from "@/lib/estimates";
import {
  Sparkles,
  RotateCcw,
  Plus,
  X,
  History,
  Calculator,
  ArrowRight,
  Code2,
  SlidersHorizontal,
  ChevronDown,
  Pencil,
} from "lucide-react";

// Meaningful, self-answerable options — no market knowledge required.
const BUYER_TYPES = [
  { value: "freelancer", label: "Freelancer / Solo project" },
  { value: "startup", label: "Startup" },
  { value: "small-business", label: "Small Business" },
  { value: "agency-enterprise", label: "Agency / Enterprise" },
];

const AUDIENCE_TYPES = [
  { value: "internal", label: "Just me / my team" },
  { value: "customers", label: "My existing customers" },
  { value: "public", label: "General public" },
];

export default function EstimatePage() {
  const [activeTab, setActiveTab] = useState("calculator"); // 'calculator' | 'history'

  // Form state
  const [projectName, setProjectName] = useState("");
  const [buyerType, setBuyerType] = useState("freelancer");
  const [audience, setAudience] = useState("internal");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState(["Next.js", "Authentication"]);
  const [customTagInput, setCustomTagInput] = useState("");
  const [platforms, setPlatforms] = useState(["Web"]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [formOpen, setFormOpen] = useState(true); // collapses once an estimate exists

  const [currentEstimate, setCurrentEstimate] = useState(null);
  const [pastEstimates, setPastEstimates] = useState([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    listEstimates()
      .then(setPastEstimates)
      .catch(() => setPastEstimates([]));
  }, []);

  const addTag = (tagToAdd) => {
    const trimmed = tagToAdd.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags((prev) => [...prev, trimmed]);
    }
    setCustomTagInput("");
  };

  const removeTag = (tagToRemove) => {
    setTags((prev) => prev.filter((t) => t !== tagToRemove));
  };

  const togglePlatform = (p) => {
    setPlatforms((prev) => {
      if (prev.includes(p)) {
        if (prev.length === 1) return prev;
        return prev.filter((item) => item !== p);
      }
      return [...prev, p];
    });
  };

  const handleCalculate = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setIsCalculating(true);

    try {
      const input = {
        projectName: projectName.trim() || "Untitled Project",
        buyerType, // drives pricing tier/multiplier
        audience, // drives scale/infra assumptions
        description,
        features: tags,
        platforms,
      };

      const est = await generateEstimate(input);
      setCurrentEstimate(est);
      setPastEstimates(await listEstimates());
      setFormOpen(false); // collapse the "duplicate-looking" form after a result exists
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setErrorMessage(error.message || "Unable to generate an estimate. Please try again.");
    } finally {
      setIsCalculating(false);
    }
  };

  const handleReset = () => {
    setProjectName("");
    setBuyerType("freelancer");
    setAudience("internal");
    setDescription("");
    setTags(["Next.js", "Authentication"]);
    setPlatforms(["Web"]);
    setCurrentEstimate(null);
    setErrorMessage("");
    setFormOpen(true);
  };

  return (
    <div className="min-h-screen">
      <MarketingHeader />

      <AppShell
        title="Project Cost & Timeline Estimator"
        action={
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg border border-line bg-surface p-1">
              <button
                type="button"
                onClick={() => setActiveTab("calculator")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-mono text-xs font-semibold uppercase tracking-[0.08em] transition-all ${
                  activeTab === "calculator"
                    ? "bg-ink text-ink-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Calculator className="size-3.5" />
                Calculator
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("history")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-mono text-xs font-semibold uppercase tracking-[0.08em] transition-all ${
                  activeTab === "history"
                    ? "bg-ink text-ink-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <History className="size-3.5" />
                History ({pastEstimates.length})
              </button>
            </div>

            {currentEstimate && activeTab === "calculator" && (
              <button
                onClick={handleReset}
                className="hidden items-center gap-1.5 rounded-md border border-line bg-surface px-3 py-1.5 font-mono text-xs uppercase tracking-[0.08em] text-foreground transition-colors hover:border-foreground/30 sm:flex"
              >
                <RotateCcw className="size-3.5" />
                New
              </button>
            )}
          </div>
        }
      >
        {activeTab === "history" ? (
          <div className="mt-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-xl font-semibold text-foreground">
                  Saved Project Estimates
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  View and compare previously generated estimates.
                </p>
              </div>
              <button
                onClick={() => setActiveTab("calculator")}
                className="rounded-md bg-accent px-4 py-2 font-mono text-xs font-semibold uppercase tracking-[0.08em] text-accent-foreground transition-colors hover:bg-accent-ink"
              >
                + New Estimate
              </button>
            </div>

            {pastEstimates.length === 0 ? (
              <div className="rounded-xl border border-line bg-surface p-12 text-center">
                <p className="font-mono text-sm text-muted-foreground">No saved estimates yet.</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {pastEstimates.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      setCurrentEstimate(item);
                      setActiveTab("calculator");
                      setFormOpen(false);
                    }}
                    className="cursor-pointer rounded-xl border border-line bg-surface p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-accent hover:shadow-card"
                  >
                    <div className="flex items-center justify-between">
                      <span className="shrink-0 rounded bg-accent/10 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase text-accent-ink">
                        {item.complexity}
                      </span>
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <h3 className="mt-3 truncate font-display text-lg font-semibold text-foreground">
                      {item.input.projectName}
                    </h3>
                    <p className="mt-1 font-mono text-xs text-muted-foreground">
                      {item.input.platforms.join(", ")}
                    </p>

                    <div className="mt-4 border-t border-line pt-3">
                      <div className="font-mono text-lg font-semibold text-foreground">
                        ₹{(item.costMin / 1000).toFixed(0)}k – ₹{(item.costMax / 1000).toFixed(0)}k
                      </div>
                      <div className="mt-0.5 font-mono text-xs text-muted-foreground">
                        Timeline: {item.weeksMin}–{item.weeksMax} weeks
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            {currentEstimate && (
              <div className="rounded-xl border border-line bg-surface/80 p-5 shadow-card sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
                  <div>
                    <span className="label-mono">Estimate Result</span>
                    <h2 className="font-display text-2xl font-semibold text-foreground">
                      {currentEstimate.input.projectName}
                    </h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setFormOpen((v) => !v)}
                      className="flex items-center gap-1.5 rounded-md border border-line bg-surface px-3 py-1.5 font-mono text-xs uppercase tracking-[0.08em] text-foreground transition-colors hover:border-foreground/30"
                    >
                      <Pencil className="size-3.5" />
                      {formOpen ? "Hide Inputs" : "Edit & Recalculate"}
                    </button>
                    <button
                      onClick={handleReset}
                      className="flex items-center gap-1.5 rounded-md border border-line bg-surface px-3 py-1.5 font-mono text-xs uppercase tracking-[0.08em] text-foreground transition-colors hover:border-foreground/30"
                    >
                      <RotateCcw className="size-3.5" />
                      New Estimate
                    </button>
                  </div>
                </div>

                <EstimateReport estimate={currentEstimate} />
              </div>
            )}

            {/* Input form — collapsed automatically once a result exists */}
            {formOpen && (
              <div className="rounded-xl border border-line bg-surface p-5 shadow-card sm:p-6">
                <div className="mb-5 flex items-center justify-between border-b border-line pb-3">
                  <div>
                    <h2 className="font-display text-xl font-semibold text-foreground">
                      {currentEstimate ? "Tweak & Recalculate" : "Enter Project Requirements"}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      No market knowledge needed — just answer about yourself and your idea.
                    </p>
                  </div>
                  <SlidersHorizontal className="size-5 shrink-0 text-muted-foreground" />
                </div>

                <form onSubmit={handleCalculate} className="space-y-5">
                  {errorMessage && (
                    <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3.5 py-3 text-sm text-destructive" role="alert">
                      {errorMessage}
                    </div>
                  )}
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <label htmlFor="projectName" className="label-mono block">
                        Project Title
                      </label>
                      <input
                        id="projectName"
                        type="text"
                        placeholder="e.g. AI-Powered CRM"
                        value={projectName}
                        onChange={(e) => setProjectName(e.target.value)}
                        className="mt-1.5 w-full rounded-md border border-line bg-background px-3.5 py-2.5 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none"
                      />
                    </div>

                    <div>
                      <label htmlFor="buyerType" className="label-mono block">
                        Who's this for?
                      </label>
                      <select
                        id="buyerType"
                        value={buyerType}
                        onChange={(e) => setBuyerType(e.target.value)}
                        className="mt-1.5 w-full rounded-md border border-line bg-background px-3.5 py-2.5 font-mono text-sm text-foreground focus:border-accent focus:outline-none"
                      >
                        {BUYER_TYPES.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="audience" className="label-mono block">
                        Who will use it?
                      </label>
                      <select
                        id="audience"
                        value={audience}
                        onChange={(e) => setAudience(e.target.value)}
                        className="mt-1.5 w-full rounded-md border border-line bg-background px-3.5 py-2.5 font-mono text-sm text-foreground focus:border-accent focus:outline-none"
                      >
                        {AUDIENCE_TYPES.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="label-mono block">Platforms Needed</label>
                    <div className="mt-1.5 flex flex-wrap gap-2">
                      {PLATFORMS.map((platform) => {
                        const active = platforms.includes(platform);
                        return (
                          <button
                            key={platform}
                            type="button"
                            onClick={() => togglePlatform(platform)}
                            className={`rounded-md border px-3.5 py-1.5 font-mono text-xs font-semibold uppercase tracking-[0.08em] transition-all ${
                              active
                                ? "border-ink bg-ink text-ink-foreground shadow-sm"
                                : "border-line bg-background text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {platform}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <label htmlFor="description" className="label-mono block">
                        Describe your idea
                      </label>
                      <span className="font-mono text-[11px] text-muted-foreground">
                        AI figures out the category & complexity from this
                      </span>
                    </div>
                    <textarea
                      id="description"
                      rows={3}
                      placeholder="What does the app do, who uses it, any integrations? e.g. 'Users book fitness coaches, pay via UPI, chat in real-time, get AI workout plans using Python and OpenAI'"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="mt-1.5 w-full rounded-md border border-line bg-background p-3.5 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none"
                    />
                  </div>

                  <div className="rounded-xl border border-line bg-background/50 p-4">
                    <label className="label-mono flex items-center gap-1.5">
                      <Code2 className="size-3.5 text-accent-ink" />
                      Technologies & Features
                    </label>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1.5 rounded-md border border-ink/20 bg-surface px-3 py-1 font-mono text-xs font-medium text-foreground shadow-sm"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => removeTag(tag)}
                            className="text-muted-foreground hover:text-destructive"
                            aria-label={`Remove ${tag}`}
                          >
                            <X className="size-3" />
                          </button>
                        </span>
                      ))}

                      <div className="inline-flex items-center gap-1">
                        <input
                          type="text"
                          placeholder="Add anything — your own tech or feature..."
                          value={customTagInput}
                          onChange={(e) => setCustomTagInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addTag(customTagInput);
                            }
                          }}
                          className="w-56 rounded-md border border-line bg-surface px-3 py-1 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none"
                        />
                        {customTagInput.trim() && (
                          <button
                            type="button"
                            onClick={() => addTag(customTagInput)}
                            className="rounded-md bg-ink px-2 py-1 font-mono text-xs font-semibold text-ink-foreground"
                          >
                            <Plus className="size-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowSuggestions((v) => !v)}
                      className="mt-3 flex items-center gap-1 font-mono text-[11px] text-muted-foreground hover:text-foreground"
                    >
                      <ChevronDown
                        className={`size-3.5 transition-transform ${showSuggestions ? "rotate-180" : ""}`}
                      />
                      {showSuggestions ? "Hide suggestions" : "Need ideas? Show suggestions"}
                    </button>

                    {showSuggestions && (
                      <div className="mt-3 space-y-2 border-t border-line/60 pt-3">
                        <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px]">
                          <span className="mr-1 text-muted-foreground">Tech:</span>
                          {POPULAR_TECHS.map((tech) => {
                            const isAdded = tags.includes(tech);
                            return (
                              <button
                                key={tech}
                                type="button"
                                onClick={() => (isAdded ? removeTag(tech) : addTag(tech))}
                                className={`rounded px-2 py-0.5 transition-colors ${
                                  isAdded
                                    ? "bg-accent/15 font-semibold text-accent-ink"
                                    : "border border-line bg-surface text-muted-foreground hover:text-foreground"
                                }`}
                              >
                                {isAdded ? "✓ " : "+ "}
                                {tech}
                              </button>
                            );
                          })}
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px]">
                          <span className="mr-1 text-muted-foreground">Features:</span>
                          {SUGGESTED_FEATURES.map((feat) => {
                            const isAdded = tags.includes(feat);
                            return (
                              <button
                                key={feat}
                                type="button"
                                onClick={() => (isAdded ? removeTag(feat) : addTag(feat))}
                                className={`rounded px-2 py-0.5 transition-colors ${
                                  isAdded
                                    ? "bg-ink/10 font-semibold text-foreground"
                                    : "border border-line bg-surface text-muted-foreground hover:text-foreground"
                                }`}
                              >
                                {isAdded ? "✓ " : "+ "}
                                {feat}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isCalculating}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-6 py-3.5 font-mono text-sm font-semibold uppercase tracking-[0.08em] text-accent-foreground shadow-card transition-all hover:bg-accent-ink active:scale-[0.99] disabled:opacity-75"
                  >
                    {isCalculating ? (
                      <>
                        <div className="size-4 animate-spin rounded-full border-2 border-accent-foreground border-t-transparent" />
                        Analyzing Requirements & Costing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="size-4" />
                        Calculate Project Estimate
                        <ArrowRight className="size-4" />
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>
        )}
      </AppShell>

      <MarketingFooter />
    </div>
  );
}
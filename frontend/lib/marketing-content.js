import {
  BarChart3,
  Clock,
  IndianRupee,
  LayoutList,
  Sparkles,
  Wrench,
  Github,
  Users,
  Target,
  TrendingUp,
  FileCheck2,
  ShieldCheck,
} from "lucide-react";

export const STEPS = [
  {
    marker: "(a)",
    title: "Describe or Connect Repo",
    body: "Enter your project requirements in plain Hindi/English or provide a public GitHub repo link.",
  },
  {
    marker: "(b)",
    title: "Live Market-Calibrated Pricing",
    body: "AI analyzes scope, stack, and quotes realistic INR ranges based on live Indian market rates.",
  },
  {
    marker: "(c)",
    title: "Codebase Completion Audit",
    body: "Scan your repository to measure exact completion percentage, module status, and evidence notes.",
  },
  {
    marker: "(d)",
    title: "Distribute Tasks to Team",
    body: "Automatically assign pending features to team members based on roles or generate a solo dependency plan.",
  },
];

export const FEATURES = [
  {
    index: "01",
    short: "AI Scope & Pricing",
    tag: "Requirement parsing",
    title: "AI Requirement Analysis",
    body: "Your brief is parsed into discrete, priceable building blocks with automated architecture scoping — no spreadsheets needed.",
    icon: Sparkles,
  },
  {
    index: "02",
    short: "Live Market Rates",
    tag: "Weekly domestic rates",
    title: "India Market-Calibrated Pricing",
    body: "Estimates are grounded in real Indian developer rates aggregated from multiple verified sources and adjusted for buyer scale.",
    icon: TrendingUp,
  },
  {
    index: "03",
    short: "Codebase Analyzer",
    tag: "GitHub & Deployed URL",
    title: "Project & Codebase Health Audit",
    body: "Inspect real GitHub repositories to calculate exact completion percentages, verify modules, and identify unfinished features.",
    icon: Github,
  },
  {
    index: "04",
    short: "Workload Balancing",
    tag: "Skill-based allocation",
    title: "Team Task Distribution",
    body: "Distribute remaining work across team members by specific skillsets, balancing hour loads and alerting on bottlenecks.",
    icon: Users,
  },
  {
    index: "05",
    short: "Solo Sprint Plan",
    tag: "Critical path ordering",
    title: "Dependency-Aware Solo Planning",
    body: "For solo developers, tasks are ordered sequentially by pre-requisites to prevent roadblocks during the build.",
    icon: Target,
  },
  {
    index: "06",
    short: "Timeline Forecast",
    tag: "Weeks-to-ship",
    title: "Development Time Estimate",
    body: "A realistic delivery window for small teams or solo builders, accounting for integrations, testing, and deployment.",
    icon: Clock,
  },
  {
    index: "07",
    short: "Complexity Score",
    tag: "Simple / Med / Complex",
    title: "Complexity & Risk Assessment",
    body: "Understand architectural risks, data model density, and integration difficulty before writing code.",
    icon: BarChart3,
  },
  {
    index: "08",
    short: "Tech Stack",
    tag: "Modern & practical",
    title: "Technology Recommendations",
    body: "Get stack recommendations (frontend, backend, database, cloud) tailored for your specific scale and constraints.",
    icon: Wrench,
  },
  {
    index: "09",
    short: "Sprint Export",
    tag: "Markdown & Jira",
    title: "One-Click Task Plan Export",
    body: "Instantly copy formatted task plans as Markdown for pasting into GitHub Issues, Jira boards, Trello, or Slack.",
    icon: FileCheck2,
  },
];


import {
  BarChart3,
  Clock,
  IndianRupee,
  LayoutList,
  Sparkles,
  Wrench,
} from "lucide-react";

export const STEPS = [
  {
    marker: "(a)",
    title: "Describe Your Project",
    body: "Enter your project requirements in simple, plain language.",
  },
  {
    marker: "(b)",
    title: "AI Analyzes Requirements",
    body: "AI identifies features, complexity, technologies and development effort.",
  },
  {
    marker: "(c)",
    title: "Get Your Estimate",
    body: "Receive estimated cost, timeline and a detailed breakdown.",
  },
];

export const FEATURES = [
  {
    index: "01",
    short: "AI Analysis",
    tag: "Requirement parsing",
    title: "AI Requirement Analysis",
    body: "Your brief is parsed into discrete, priceable building blocks — no spreadsheets needed.",
    icon: Sparkles,
  },
  {
    index: "02",
    short: "Cost Estimation",
    tag: "₹ range pricing",
    title: "Cost Estimation",
    body: "A calibrated rupee range grounded in real build effort rather than a single guess.",
    icon: IndianRupee,
  },
  {
    index: "03",
    short: "Time Estimate",
    tag: "Weeks-to-ship",
    title: "Development Time Estimate",
    body: "A realistic week range for a small delivery team, including QA and deployment.",
    icon: Clock,
  },
  {
    index: "04",
    short: "Complexity",
    tag: "Low / Med / High",
    title: "Complexity Analysis",
    body: "Low, medium or high — with the reasoning behind the call spelled out.",
    icon: BarChart3,
  },
  {
    index: "05",
    short: "Tech Stack",
    tag: "Recommended",
    title: "Technology Recommendations",
    body: "A stack suggested for what you actually need to ship, not what is trending.",
    icon: Wrench,
  },
  {
    index: "06",
    short: "Breakdown",
    tag: "Feature level",
    title: "Feature Breakdown",
    body: "Every detected feature listed and mapped into the overall cost split.",
    icon: LayoutList,
  },
];

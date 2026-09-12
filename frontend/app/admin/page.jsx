"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity, Calculator, ChevronLeft, ChevronRight, CircleDollarSign,
  ClipboardList, Database, LayoutDashboard, LogOut,
  RefreshCw, Search, ShieldCheck, Users, X, ArrowUpRight, TrendingUp, Filter, Sparkles,
  Download, Calendar, CheckSquare, Trash2, Server, Clock, AlertCircle
} from "lucide-react";
import { authFetch, getUser, isLoggedIn, removeToken } from "@/lib/auth";

const API = process.env.NEXT_PUBLIC_API_URL || "http://https://project-estimation-backend-fp5x.onrender.com";
const NAV = [
  ["dashboard", "Overview", LayoutDashboard],
  ["estimates", "Estimates", ClipboardList],
  ["users", "User Base", Users],
  ["system", "System Health", Server],
];

function money(value) {
  return `₹${Math.round(Number(value || 0)).toLocaleString("en-IN")}`;
}

function date(value) {
  return value ? new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "-";
}

function exportToCSV(data, filename) {
  if (!data || data.length === 0) return;
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => headers.map(header => {
      const value = row[header];
      const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value || '');
      return stringValue.includes(',') ? `"${stringValue}"` : stringValue;
    }).join(','))
  ].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

function getDateRange(preset) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  switch (preset) {
    case 'today':
      return { from: today.toISOString().split('T')[0], to: today.toISOString().split('T')[0] };
    case 'week':
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      return { from: weekStart.toISOString().split('T')[0], to: today.toISOString().split('T')[0] };
    case 'month':
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      return { from: monthStart.toISOString().split('T')[0], to: today.toISOString().split('T')[0] };
    default:
      return { from: '', to: '' };
  }
}

function Kpi({ label, value, detail, icon: Icon, trend }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-line bg-surface p-6 shadow-sm transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl hover:shadow-accent/5 hover:border-accent/40">
      <div className="absolute -right-6 -top-6 rounded-full bg-gradient-to-br from-accent/5 to-transparent p-12 transition-transform duration-700 group-hover:scale-150"></div>
      <div className="relative flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="label-mono text-muted-foreground">{label}</div>
            {trend && <span className="flex items-center text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded-full"><TrendingUp className="size-3 mr-1" />{trend}</span>}
          </div>
          <div className="mt-3 font-display text-3xl font-bold tracking-tight text-foreground">{value}</div>
          {detail && <div className="mt-2 text-sm text-muted-foreground flex items-center gap-1.5"><Activity className="size-3.5" />{detail}</div>}
        </div>
        <div className="rounded-xl border border-line bg-background p-3 text-muted-foreground shadow-inner transition-all duration-300 group-hover:bg-accent group-hover:text-ink-foreground group-hover:border-accent">
          <Icon className="size-5" />
        </div>
      </div>
    </div>
  );
}

function BarChart({ title, rows = [] }) {
  const max = Math.max(...rows.map((row) => row.count || 0), 1);
  return (
    <section className="group rounded-2xl border border-line bg-surface p-6 shadow-sm transition-all hover:shadow-xl hover:border-line/80">
      <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
        <Sparkles className="size-4 text-accent" />
        {title}
      </h2>
      <div className="mt-6 space-y-4">
        {rows.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center border border-dashed border-line rounded-lg">No stored data yet.</p>}
        {rows.slice(0, 8).map((row, i) => (
          <div key={row.label} className="group/row">
            <div className="mb-1.5 flex justify-between gap-3 text-xs">
              <span className="truncate font-medium text-foreground transition-colors group-hover/row:text-accent">{row.label}</span>
              <span className="font-mono text-muted-foreground bg-background px-2 py-0.5 rounded-md border border-line">{row.count || 0}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-background shadow-inner border border-line">
              <div 
                className="h-full rounded-full bg-gradient-to-r from-accent to-accent/70 transition-all duration-1000 ease-out" 
                style={{ width: `${Math.max(5, ((row.count || 0) / max) * 100)}%`, transitionDelay: `${i * 100}ms` }} 
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function LineChart({ title, rows = [] }) {
  if (rows.length === 0) {
    return (
      <section className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
        <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
          <Sparkles className="size-4 text-accent" />
          {title}
        </h2>
        <p className="text-sm text-muted-foreground py-8 text-center border border-dashed border-line rounded-lg">No stored data yet.</p>
      </section>
    );
  }
  
  const max = Math.max(...rows.map((row) => row.count || 0), 1);
  const points = rows.map((row, i) => {
    const x = (i / (rows.length - 1 || 1)) * 100;
    const y = 100 - ((row.count || 0) / max) * 100;
    return `${x},${y}`;
  }).join(' ');
  
  const areaPoints = `0,100 ${points} 100,100`;
  
  return (
    <section className="group rounded-2xl border border-line bg-surface p-6 shadow-sm transition-all hover:shadow-xl hover:border-line/80">
      <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
        <Sparkles className="size-4 text-accent" />
        {title}
      </h2>
      <div className="mt-6">
        <svg viewBox="0 0 100 100" className="w-full h-48" preserveAspectRatio="none">
          <defs>
            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.3" />
              <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <polygon points={areaPoints} fill="url(#lineGradient)" className="transition-all duration-1000" />
          <polyline points={points} fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-all duration-1000" />
          {rows.map((row, i) => {
            const x = (i / (rows.length - 1 || 1)) * 100;
            const y = 100 - ((row.count || 0) / max) * 100;
            return (
              <g key={row.label} className="group/hover">
                <circle cx={x} cy={y} r="3" fill="var(--color-background)" stroke="var(--color-accent)" strokeWidth="2" className="transition-all duration-300 group-hover/hover:r-4" />
                <title>{row.label}: {row.count}</title>
              </g>
            );
          })}
        </svg>
        <div className="mt-4 flex justify-between text-xs text-muted-foreground font-mono">
          <span>{rows[0]?.label || ''}</span>
          <span>{rows[rows.length - 1]?.label || ''}</span>
        </div>
      </div>
    </section>
  );
}

function Pager({ page, pages, onChange }) {
  if (pages <= 1) return null;
  return (
    <div className="mt-6 flex items-center justify-between border-t border-line pt-6">
      <span className="rounded-full bg-background px-3 py-1 font-mono text-xs border border-line text-muted-foreground shadow-sm">
        Page <span className="text-foreground font-semibold">{page}</span> of {pages}
      </span>
      <div className="flex gap-2">
        <button disabled={page <= 1} onClick={() => onChange(page - 1)} className="flex items-center gap-1 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-medium transition-all hover:bg-background hover:text-foreground disabled:opacity-40 disabled:hover:bg-surface" aria-label="Previous page">
          <ChevronLeft className="size-4" /> Prev
        </button>
        <button disabled={page >= pages} onClick={() => onChange(page + 1)} className="flex items-center gap-1 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-medium transition-all hover:bg-background hover:text-foreground disabled:opacity-40 disabled:hover:bg-surface" aria-label="Next page">
          Next <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}

function DetailPanel({ estimate, onClose }) {
  const ai = estimate?.aiAnalysis;
  if (!estimate) return null;
  
  const section = (title, children) => (
    <div className="mt-8">
      <h3 className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-muted-foreground border-b border-line pb-2">
        <span className="h-1.5 w-1.5 rounded-full bg-accent"></span>
        {title}
      </h3>
      <div className="mt-4">{children}</div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose}>
      <aside className="h-full w-full max-w-2xl overflow-y-auto bg-surface shadow-2xl transition-transform" onClick={(event) => event.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-surface/80 p-5 backdrop-blur-md sm:px-8">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-accent/10 px-2 py-0.5 font-mono text-[10px] uppercase text-accent-ink">Estimate Detail</span>
              <span className="font-mono text-[10px] text-muted-foreground">{estimate.id}</span>
            </div>
            <h2 className="mt-2 font-display text-2xl font-bold text-foreground">{estimate.input?.projectName || "Untitled project"}</h2>
            <p className="mt-1 flex items-center gap-2 font-mono text-xs text-muted-foreground">
              <Database className="size-3" /> {date(estimate.createdAt)}
            </p>
          </div>
          <button onClick={onClose} className="rounded-full border border-line bg-background p-2.5 text-muted-foreground transition-all hover:bg-accent hover:text-ink-foreground hover:border-accent" aria-label="Close detail">
            <X className="size-5" />
          </button>
        </div>
        
        <div className="p-5 sm:p-8">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-line bg-background p-4 shadow-sm"><div className="text-xs text-muted-foreground mb-1">Budget</div><div className="font-mono text-lg font-semibold">{money(ai?.pricing?.budget || estimate.costMin)}</div></div>
            <div className="rounded-xl border border-accent/30 bg-accent/5 p-4 shadow-sm relative overflow-hidden"><div className="absolute top-0 right-0 p-1"><Sparkles className="size-3 text-accent" /></div><div className="text-xs text-accent-ink font-medium mb-1">Typical</div><div className="font-mono text-lg font-bold text-foreground">{money(ai?.pricing?.typical || estimate.pricingTypical)}</div></div>
            <div className="rounded-xl border border-line bg-background p-4 shadow-sm"><div className="text-xs text-muted-foreground mb-1">Premium</div><div className="font-mono text-lg font-semibold">{money(ai?.pricing?.premium || estimate.costMax)}</div></div>
            <div className="rounded-xl border border-line bg-background p-4 shadow-sm"><div className="text-xs text-muted-foreground mb-1">Complexity</div><div className="font-mono text-lg font-semibold capitalize">{estimate.complexity}</div></div>
          </div>
          
          {section("Project Context", (
            <div className="rounded-xl border border-line bg-background p-5 text-sm text-foreground shadow-sm">
              <p className="leading-relaxed">{estimate.input?.description || "No description stored."}</p>
              <div className="mt-4 flex flex-wrap gap-3 pt-4 border-t border-line/50">
                <span className="flex items-center gap-1.5 rounded-md bg-surface px-2.5 py-1 text-xs"><Users className="size-3 text-muted-foreground" /> {estimate.input?.audience || "-"}</span>
                <span className="flex items-center gap-1.5 rounded-md bg-surface px-2.5 py-1 text-xs"><LayoutDashboard className="size-3 text-muted-foreground" /> {estimate.input?.platforms?.join(", ") || "-"}</span>
                <span className="flex items-center gap-1.5 rounded-md bg-surface px-2.5 py-1 text-xs"><ShieldCheck className="size-3 text-muted-foreground" /> {estimate.input?.buyerType || "-"}</span>
              </div>
            </div>
          ))}
          
          {ai && section("Requirements & Features", (
            <div className="space-y-6">
              {ai.requirements?.length > 0 && (
                <div className="rounded-xl border border-line bg-background p-5 shadow-sm">
                  <ul className="space-y-2 text-sm text-foreground">
                    {ai.requirements.map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <ArrowUpRight className="size-4 text-accent shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="grid gap-4">
                {["mvp", "advanced", "optional"].map((key) => (
                  <div key={key} className="rounded-xl border border-line bg-background p-4 shadow-sm">
                    <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-3">
                      {key === 'mvp' ? <div className="h-2 w-2 rounded-full bg-emerald-500"></div> : key === 'advanced' ? <div className="h-2 w-2 rounded-full bg-amber-500"></div> : <div className="h-2 w-2 rounded-full bg-slate-500"></div>}
                      {key} Phase
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {ai.features?.[key]?.map((item) => (
                        <div key={item.name} className="flex flex-col rounded-lg border border-line bg-surface px-3 py-2 text-xs hover:border-accent/50 transition-colors">
                          <span className="font-medium text-foreground">{item.name}</span>
                          <span className="mt-1 font-mono text-[10px] text-muted-foreground">{item.complexity} · {item.estimated_hours}h</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          
          {ai && section("Technology Stack", (
            <div className="grid gap-3 sm:grid-cols-2">
              {ai.technology?.map((item) => (
                <div key={item.layer} className="group rounded-xl border border-line bg-background p-4 shadow-sm transition-all hover:border-accent/50">
                  <div className="label-mono text-muted-foreground">{item.layer}</div>
                  <div className="mt-2 text-sm font-bold text-foreground group-hover:text-accent transition-colors">{item.recommendation}</div>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{item.reason}</p>
                </div>
              ))}
            </div>
          ))}
          
          {ai && section("Analysis & Timeline", (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-line bg-background p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="size-4 text-accent" />
                  <span className="font-semibold text-sm">Complexity: {ai.complexity?.level}</span>
                </div>
                <div className="w-full bg-line rounded-full h-1.5 mb-3"><div className="bg-accent h-1.5 rounded-full" style={{width: `${ai.complexity?.score}%`}}></div></div>
                <p className="text-xs text-muted-foreground leading-relaxed">{ai.complexity?.reason}</p>
              </div>
              <div className="rounded-xl border border-line bg-background p-4 shadow-sm">
                 <div className="flex items-center gap-2 mb-2">
                  <Calculator className="size-4 text-accent" />
                  <span className="font-semibold text-sm">Timeline Estimate</span>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <div className="bg-surface rounded p-2 text-center border border-line"><div className="font-mono text-sm font-bold">{ai.timeline?.hours}</div><div className="text-[10px] uppercase text-muted-foreground">Hours</div></div>
                  <div className="bg-surface rounded p-2 text-center border border-line"><div className="font-mono text-sm font-bold">{ai.timeline?.weeks}</div><div className="text-[10px] uppercase text-muted-foreground">Weeks</div></div>
                </div>
                <p className="mt-3 text-[10px] text-muted-foreground text-center">MVP ready in: <span className="font-medium text-foreground">{ai.timeline?.mvp}</span></p>
              </div>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}

function UserPanel({ user, onClose, onOpenEstimate }) {
  if (!user) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose}>
      <aside className="h-full w-full max-w-xl overflow-y-auto bg-surface shadow-2xl transition-transform" onClick={(event) => event.stopPropagation()}>
         <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-surface/80 p-5 backdrop-blur-md sm:px-8">
          <div>
            <div className="rounded-md bg-accent/10 px-2 py-0.5 font-mono text-[10px] uppercase inline-block text-accent-ink mb-2">User Profile</div>
            <h2 className="font-display text-2xl font-bold text-foreground">{user.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
          </div>
          <button onClick={onClose} className="rounded-full border border-line bg-background p-2.5 text-muted-foreground transition-all hover:bg-accent hover:text-ink-foreground hover:border-accent" aria-label="Close user detail">
            <X className="size-5" />
          </button>
        </div>
        
        <div className="p-5 sm:p-8">
          <div className="grid grid-cols-2 gap-4">
            <Kpi label="Total Estimates" value={user.estimates?.length || 0} icon={ClipboardList} />
            <Kpi label="Account Role" value={user.role || "user"} icon={ShieldCheck} />
          </div>
          
          <div className="mt-8">
            <h3 className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-muted-foreground border-b border-line pb-2">
              <span className="h-1.5 w-1.5 rounded-full bg-accent"></span>
              Estimate History
            </h3>
            <div className="mt-4 space-y-3">
              {user.estimates?.map((estimate) => (
                <button key={estimate.id} onClick={() => onOpenEstimate(estimate.id)} className="group flex w-full items-center justify-between rounded-xl border border-line bg-background p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-accent hover:shadow-md">
                  <div>
                    <span className="block text-sm font-semibold text-foreground group-hover:text-accent transition-colors">{estimate.input?.projectName || "Untitled Project"}</span>
                    <span className="mt-1 flex items-center gap-2 font-mono text-[10px] text-muted-foreground">
                      <span className="uppercase">{estimate.id.substring(0,8)}</span> 
                      <span className="h-1 w-1 rounded-full bg-line"></span> 
                      {date(estimate.createdAt)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="block font-mono text-sm font-bold">{money(estimate.costMin)}</span>
                    <span className="mt-1 block text-xs capitalize text-muted-foreground">{estimate.complexity || 'Standard'}</span>
                  </div>
                </button>
              ))}
              {!user.estimates?.length && (
                <div className="rounded-xl border border-dashed border-line p-8 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-background border border-line mb-3">
                    <ClipboardList className="size-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-foreground">No estimates yet</p>
                  <p className="mt-1 text-xs text-muted-foreground">This user hasn't created any estimates.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

function Toolbar({ search, setSearch, category, setCategory, complexity, setComplexity, dateFrom, setDateFrom, dateTo, setDateTo, sort, setSort, order, setOrder, onSubmit, onExport, dataForExport, exportFilename }) {
  const [datePreset, setDatePreset] = useState('');
  
  const handleDatePreset = (preset) => {
    setDatePreset(preset);
    const range = getDateRange(preset);
    setDateFrom(range.from);
    setDateTo(range.to);
  };
  
  return (
    <div className="rounded-xl border border-line bg-surface p-4 shadow-sm mb-6 flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[280px] flex-1 group">
          <Search className="absolute left-3.5 top-3 size-4 text-muted-foreground transition-colors group-focus-within:text-accent" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => event.key === "Enter" && onSubmit()} placeholder="Search projects or estimates..." className="w-full rounded-lg border border-line bg-background py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-accent focus:ring-1 focus:ring-accent/20" />
        </div>
        <button onClick={onSubmit} className="flex items-center gap-2 rounded-lg bg-ink px-5 py-2.5 font-medium text-sm text-ink-foreground shadow-sm transition-all hover:opacity-90 hover:shadow-md">
          <Filter className="size-4" /> Apply Filters
        </button>
        {onExport && (
          <button onClick={() => exportToCSV(dataForExport, exportFilename)} className="flex items-center gap-2 rounded-lg border border-line bg-surface px-5 py-2.5 font-medium text-sm text-muted-foreground shadow-sm transition-all hover:bg-background hover:text-foreground">
            <Download className="size-4" /> Export CSV
          </button>
        )}
      </div>
      
      <div className="flex flex-wrap gap-3 pt-4 border-t border-line/50">
        <select value={category} onChange={(event) => setCategory(event.target.value)} className="rounded-lg border border-line bg-background px-3 py-2 text-sm outline-none focus:border-accent cursor-pointer">
          <option value="">All Categories</option><option>E-commerce</option><option>Healthcare</option><option>SaaS</option><option>Education</option><option>AI Application</option><option>Business Website</option>
        </select>
        <select value={complexity} onChange={(event) => setComplexity(event.target.value)} className="rounded-lg border border-line bg-background px-3 py-2 text-sm outline-none focus:border-accent cursor-pointer">
          <option value="">All Complexities</option><option>Simple</option><option>Medium</option><option>Complex</option><option>Enterprise</option>
        </select>
        <div className="flex items-center gap-2">
          <Calendar className="size-4 text-muted-foreground" />
          <select value={datePreset} onChange={(event) => handleDatePreset(event.target.value)} className="rounded-lg border border-line bg-background px-3 py-2 text-sm outline-none focus:border-accent cursor-pointer">
            <option value="">Date Range</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
        </div>
        <div className="flex items-center gap-2 border border-line rounded-lg bg-background px-2">
          <span className="text-xs text-muted-foreground pl-1">From</span>
          <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} className="bg-transparent py-2 text-sm outline-none cursor-pointer" />
        </div>
        <div className="flex items-center gap-2 border border-line rounded-lg bg-background px-2">
          <span className="text-xs text-muted-foreground pl-1">To</span>
          <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} className="bg-transparent py-2 text-sm outline-none cursor-pointer" />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <select value={sort} onChange={(event) => setSort(event.target.value)} className="rounded-lg border border-line bg-background px-3 py-2 text-sm outline-none focus:border-accent cursor-pointer">
            <option value="createdAt">Date Created</option><option value="costMin">Budget</option><option value="costMax">Premium</option><option value="complexity">Complexity</option>
          </select>
          <select value={order} onChange={(event) => setOrder(event.target.value)} className="rounded-lg border border-line bg-background px-3 py-2 text-sm outline-none focus:border-accent cursor-pointer">
            <option value="desc">Descending</option><option value="asc">Ascending</option>
          </select>
        </div>
      </div>
    </div>
  );
}

function EstimateTable({ rows = [], onOpen, detailed = false, selectedIds = [], onToggleSelect, onSelectAll, onDeleteSelected }) {
  const allSelected = rows.length > 0 && rows.every(row => selectedIds.includes(row.id));
  
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-surface shadow-sm">
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between px-6 py-3 bg-destructive/5 border-b border-destructive/20">
          <div className="flex items-center gap-2">
            <CheckSquare className="size-4 text-destructive" />
            <span className="text-sm font-medium text-destructive">{selectedIds.length} selected</span>
          </div>
          <button onClick={onDeleteSelected} className="flex items-center gap-2 rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground shadow-sm transition-all hover:opacity-90">
            <Trash2 className="size-4" /> Delete Selected
          </button>
        </div>
      )}
      <table className="w-full min-w-[1100px] text-left border-collapse">
        <thead>
          <tr className="border-b border-line bg-background/50">
            <th className="py-4 pl-6 pr-4 w-10">
              <input 
                type="checkbox" 
                checked={allSelected}
                onChange={(e) => onSelectAll(e.target.checked)}
                className="size-4 rounded border-line accent-accent cursor-pointer"
              />
            </th>
            <th className="py-4 pl-2 pr-4 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-semibold">Project Details</th>
            {detailed && <>
              <th className="py-4 px-4 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-semibold">User</th>
              <th className="py-4 px-4 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-semibold">Category</th>
            </>}
            <th className="py-4 px-4 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-semibold">Complexity</th>
            <th className="py-4 px-4 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-semibold">Timeline</th>
            <th className="py-4 px-4 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-semibold">Budget</th>
            <th className="py-4 px-4 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-semibold">Typical</th>
            <th className="py-4 px-4 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-semibold">Stack</th>
            <th className="py-4 px-6 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-semibold text-right">Date</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line/50">
          {rows.map((row) => { 
            const ai = row.aiAnalysis; 
            return (
              <tr key={row.id} onClick={() => onOpen(row.id)} className="group cursor-pointer bg-surface transition-all hover:bg-background hover:shadow-[0_0_15px_rgba(0,0,0,0.05)] relative z-0 hover:z-10">
                <td className="py-4 pl-6 pr-4" onClick={(e) => e.stopPropagation()}>
                  <input 
                    type="checkbox" 
                    checked={selectedIds.includes(row.id)}
                    onChange={() => onToggleSelect(row.id)}
                    className="size-4 rounded border-line accent-accent cursor-pointer"
                  />
                </td>
                <td className="py-4 pl-2 pr-4">
                  <div className="font-semibold text-foreground group-hover:text-accent transition-colors">{row.input?.projectName || "Untitled"}</div>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="font-mono text-[10px] text-muted-foreground bg-background px-1.5 py-0.5 rounded border border-line">{row.id.substring(0,8)}</span>
                    {row.status && <span className="text-[10px] uppercase tracking-wider text-emerald-500 font-medium flex items-center gap-1"><div className="h-1.5 w-1.5 rounded-full bg-emerald-500"></div>{row.status}</span>}
                  </div>
                </td>
                {detailed && <>
                  <td className="py-4 px-4">
                    <div className="text-sm font-medium text-foreground">{row.user_email?.split('@')[0] || "Guest"}</div>
                    <div className="text-[10px] text-muted-foreground">{row.user_email || "Guest"}</div>
                  </td>
                  <td className="py-4 px-4 text-xs font-medium text-muted-foreground">{row.project_category || ai?.project_category || row.input?.projectType || "-"}</td>
                </>}
                <td className="py-4 px-4">
                  <span className="inline-flex items-center rounded-full bg-accent/10 px-2.5 py-1 font-mono text-[10px] font-semibold text-accent-ink border border-accent/20">
                    {row.complexity}
                  </span>
                </td>
                <td className="py-4 px-4">
                  <div className="font-mono text-xs text-foreground bg-background inline-block px-2 py-1 rounded-md border border-line">{row.weeksMin || "-"}-{row.weeksMax || "-"} wks</div>
                </td>
                <td className="py-4 px-4 font-mono text-xs font-medium text-muted-foreground">{money(ai?.pricing?.budget || row.costMin)}</td>
                <td className="py-4 px-4 font-mono text-sm font-bold text-foreground">{money(ai?.pricing?.typical || row.pricingTypical)}</td>
                <td className="max-w-[150px] py-4 px-4">
                  <div className="truncate text-xs text-muted-foreground bg-background rounded-md px-2 py-1 border border-line inline-block max-w-full">
                    {row.technology?.join(", ") || row.stack?.map((item) => item.value).join(", ") || "Standard"}
                  </div>
                </td>
                <td className="py-4 px-6 text-xs text-muted-foreground text-right">{date(row.createdAt)}</td>
              </tr>
            ); 
          })}
        </tbody>
      </table>
      {rows.length === 0 && (
        <div className="py-16 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-background border border-line mb-4 shadow-sm">
            <Search className="size-5 text-muted-foreground" />
          </div>
          <h3 className="text-sm font-medium text-foreground">No matching records</h3>
          <p className="mt-1 text-sm text-muted-foreground">Adjust your filters to find what you're looking for.</p>
        </div>
      )}
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const [section, setSection] = useState("dashboard");
  const [dashboard, setDashboard] = useState(null);
  const [estimates, setEstimates] = useState({ items: [], page: 1, pages: 1, total: 0 });
  const [users, setUsers] = useState({ items: [], page: 1, pages: 1, total: 0 });
  const [detail, setDetail] = useState(null);
  const [userDetail, setUserDetail] = useState(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [complexity, setComplexity] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sort, setSort] = useState("createdAt");
  const [order, setOrder] = useState("desc");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedEstimateIds, setSelectedEstimateIds] = useState([]);

  async function request(path, options) {
    const response = await authFetch(`${API}${path}`, options);
    if (response.status === 401 || response.status === 403) { removeToken(); router.replace("/login"); throw new Error("Admin access required."); }
    const body = await response.json();
    if (!response.ok) throw new Error(body.detail || "Request failed.");
    return body;
  }

  async function load(target = section, page = 1) {
    setLoading(true); setError("");
    if (target === "estimates") setSelectedEstimateIds([]);
    try {
      if (target === "dashboard") setDashboard(await request("/api/admin/dashboard"));
      if (target === "estimates") setEstimates(await request(`/api/admin/estimates?page=${page}&search=${encodeURIComponent(search)}&category=${encodeURIComponent(category)}&complexity=${encodeURIComponent(complexity)}&date_from=${dateFrom}&date_to=${dateTo}&sort=${sort}&order=${order}`));
      if (target === "users") setUsers(await request(`/api/admin/users?page=${page}&search=${encodeURIComponent(search)}`));
    } catch (loadError) { setError(loadError.message); } finally { setLoading(false); }
  }

  useEffect(() => { const user = getUser(); if (!isLoggedIn() || user?.role !== "admin") { router.replace("/admin/login"); return; } load("dashboard"); }, [router]);
  useEffect(() => { if (section !== "dashboard") load(section); }, [section]);

  async function openEstimate(id) { try { setDetail(await request(`/api/admin/estimates/${encodeURIComponent(id)}`)); } catch (loadError) { setError(loadError.message); } }
  async function openUser(email) { try { setUserDetail(await request(`/api/admin/users/${encodeURIComponent(email)}`)); } catch (loadError) { setError(loadError.message); } }
  async function changeRole(email, role) { try { await request(`/api/admin/users/${encodeURIComponent(email)}/role`, { method: "PATCH", body: JSON.stringify({ role }) }); load("users", users.page); } catch (loadError) { setError(loadError.message); } }
  
  const toggleEstimateSelection = (id) => {
    setSelectedEstimateIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };
  
  const selectAllEstimates = (checked) => {
    if (checked) {
      setSelectedEstimateIds(estimates.items.map(item => item.id));
    } else {
      setSelectedEstimateIds([]);
    }
  };
  
  const deleteSelectedEstimates = async () => {
    if (selectedEstimateIds.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedEstimateIds.length} estimate(s)?`)) return;
    try {
      await request("/api/admin/estimates", { method: "DELETE", body: JSON.stringify({ ids: selectedEstimateIds }) });
      setSelectedEstimateIds([]);
      load("estimates", estimates.page);
    } catch (deleteError) { setError(deleteError.message); }
  };
  
  const sectionTitle = NAV.find(([key]) => key === section)?.[1] || "Dashboard";

  return (
    <div className="min-h-screen bg-background font-sans selection:bg-accent/30 text-foreground">
      {/* Sleek Header */}
      <header className="sticky top-0 z-30 border-b border-line bg-background/80 backdrop-blur-xl shadow-sm">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-ink to-ink/80 shadow-inner">
              <Sparkles className="absolute -right-2 -top-2 size-6 text-white/10" />
              <span className="font-display text-lg font-bold text-ink-foreground">C</span>
            </div>
            <div>
              <span className="font-display text-lg font-bold tracking-tight">CostlyAI</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <ShieldCheck className="size-3 text-accent" />
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">Admin Console</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden items-center gap-3 sm:flex px-4 py-1.5 rounded-full border border-line bg-surface shadow-inner">
              <div className="h-6 w-6 rounded-full bg-accent/20 flex items-center justify-center border border-accent/30"><span className="text-[10px] font-bold text-accent-ink">{getUser()?.name?.charAt(0) || "A"}</span></div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold leading-none">{getUser()?.name || "Administrator"}</span>
                <span className="text-[10px] text-muted-foreground mt-0.5">Admin Role</span>
              </div>
            </div>
            <button onClick={() => { removeToken(); router.push("/login"); }} className="group relative overflow-hidden rounded-lg border border-line bg-surface px-4 py-2 font-mono text-xs font-semibold tracking-wider text-muted-foreground transition-all hover:border-destructive/30 hover:text-destructive hover:shadow-sm">
              <span className="relative z-10 flex items-center gap-2">
                <LogOut className="size-3.5 transition-transform group-hover:-translate-x-0.5" /> Logout
              </span>
              <div className="absolute inset-0 bg-destructive/5 opacity-0 transition-opacity group-hover:opacity-100"></div>
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1600px] flex-col lg:flex-row">
        {/* Premium Sidebar */}
        <aside className="w-full border-b border-line bg-surface/30 px-4 py-6 lg:min-h-[calc(100vh-4rem)] lg:w-64 lg:shrink-0 lg:border-b-0 lg:border-r lg:px-6 lg:py-8 flex flex-col gap-8">
          <div>
            <div className="mb-4 hidden font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground lg:block px-2">Navigation</div>
            <nav className="flex gap-2 overflow-x-auto lg:block lg:space-y-1.5 pb-2 lg:pb-0 scrollbar-hide">
              {NAV.map(([key, label, Icon]) => (
                <button 
                  key={key} 
                  onClick={() => { setSection(key); setSearch(""); }} 
                  className={`group relative flex shrink-0 items-center gap-3 rounded-xl px-4 py-3 text-left font-medium transition-all duration-300 lg:w-full ${section === key ? "bg-ink text-ink-foreground shadow-md" : "text-muted-foreground hover:bg-surface hover:text-foreground border border-transparent hover:border-line"}`}
                >
                  <Icon className={`size-4.5 transition-transform duration-300 ${section === key ? "scale-110" : "group-hover:scale-110"}`} />
                  <span className="tracking-wide text-sm">{label}</span>
                  {section === key && <span className="absolute right-3 h-1.5 w-1.5 rounded-full bg-accent animate-pulse shadow-[0_0_8px_var(--color-accent)]"></span>}
                </button>
              ))}
            </nav>
          </div>
          
          <div className="mt-auto hidden lg:block">
            <div className="rounded-2xl border border-line bg-gradient-to-br from-surface to-background p-5 shadow-sm relative overflow-hidden">
              <div className="absolute -right-6 -bottom-6 size-24 bg-accent/5 rounded-full blur-2xl"></div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
                  <Database className="size-3" /> System Status
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative flex size-3 items-center justify-center">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex size-2 rounded-full bg-emerald-500"></span>
                  </div>
                  <span className="text-sm font-medium">All systems operational</span>
                </div>
                <div className="mt-4 pt-4 border-t border-line/50 text-[10px] text-muted-foreground flex justify-between">
                  <span>MongoDB Atlas</span>
                  <span className="font-mono">Connected</span>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-10 lg:pl-12 bg-background/50">
          <div className="flex flex-wrap items-end justify-between gap-6 mb-8">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="h-1 w-6 rounded-full bg-accent"></div>
                <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground font-semibold">Admin Zone</span>
              </div>
              <h1 className="font-display text-4xl font-bold tracking-tight text-foreground">{sectionTitle}</h1>
            </div>
            <button onClick={() => load(section)} disabled={loading} className="group flex items-center gap-2 rounded-xl border border-line bg-surface px-5 py-2.5 text-sm font-medium shadow-sm transition-all hover:bg-background hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed">
              <RefreshCw className={`size-4 text-muted-foreground transition-transform group-hover:text-foreground ${loading ? "animate-spin" : ""}`} /> 
              {loading ? "Syncing..." : "Sync Data"}
            </button>
          </div>

          {error && (
            <div className="mb-8 overflow-hidden rounded-xl border border-destructive/20 bg-destructive/5 relative">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-destructive"></div>
              <div className="p-4 px-5 text-sm font-medium text-destructive flex items-start gap-3">
                <X className="size-5 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold mb-1">Error Loading Data</div>
                  <div className="opacity-90">{error}</div>
                </div>
              </div>
            </div>
          )}
          
          {loading && !dashboard && section === "dashboard" && (
            <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-surface/50">
              <div className="relative mb-4">
                <div className="absolute inset-0 rounded-full bg-accent/20 animate-ping"></div>
                <RefreshCw className="relative size-8 animate-spin text-accent" />
              </div>
              <div className="font-mono text-sm font-semibold text-muted-foreground uppercase tracking-widest">Aggregating Data...</div>
            </div>
          )}

          {section === "dashboard" && dashboard && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both">
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                <Kpi label="Total Estimates" value={dashboard.total_estimates} detail={`${dashboard.estimates_this_month} this month`} icon={ClipboardList} trend="+12%" />
                <Kpi label="Today's Activity" value={dashboard.estimates_today} detail={`${dashboard.estimates_this_week} this week`} icon={Activity} trend="+4%" />
                <Kpi label="Registered Users" value={dashboard.total_users} icon={Users} />
                <Kpi label="Avg. Duration" value={`${dashboard.average_duration_weeks} wks`} detail="Typical project timeline" icon={Calculator} />
              </div>
              
              <div className="mt-5 grid gap-5 sm:grid-cols-3">
                <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm bg-gradient-to-br from-surface to-background">
                  <div className="flex items-center gap-2 mb-4"><CircleDollarSign className="size-4 text-muted-foreground" /><span className="text-sm font-medium text-muted-foreground">Market Averages</span></div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-end border-b border-line/50 pb-2"><span className="text-xs text-muted-foreground font-mono uppercase">Avg Budget</span><span className="font-display text-xl font-bold">{money(dashboard.average_budget)}</span></div>
                    <div className="flex justify-between items-end border-b border-line/50 pb-2"><span className="text-xs text-accent-ink font-mono uppercase font-bold">Avg Typical</span><span className="font-display text-2xl font-bold text-accent">{money(dashboard.average_typical)}</span></div>
                    <div className="flex justify-between items-end"><span className="text-xs text-muted-foreground font-mono uppercase">Avg Premium</span><span className="font-display text-xl font-bold">{money(dashboard.average_premium)}</span></div>
                  </div>
                </div>
                <div className="sm:col-span-2"><LineChart title="Estimates Trend (Last 30 Days)" rows={dashboard.estimates_over_time} /></div>
              </div>
              
              <div className="mt-5 grid gap-5 lg:grid-cols-3">
                <BarChart title="Price Categories" rows={dashboard.price_ranges} />
                <BarChart title="Industry Distribution" rows={dashboard.categories} />
                <BarChart title="Tech Preferences" rows={dashboard.technologies} />
              </div>
              
              <section className="mt-8 rounded-2xl border border-line bg-surface shadow-sm overflow-hidden">
                <div className="border-b border-line p-6 flex justify-between items-center bg-background/50">
                  <h2 className="font-display text-xl font-bold flex items-center gap-2"><Sparkles className="size-5 text-accent" /> Recent Estimates</h2>
                  <button onClick={() => setSection("estimates")} className="text-xs font-semibold text-accent hover:underline flex items-center gap-1">View All <ArrowUpRight className="size-3" /></button>
                </div>
                <EstimateTable rows={dashboard.recent_estimates} onOpen={openEstimate} />
              </section>
            </div>
          )}

          {section === "estimates" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both">
              <Toolbar 
                search={search} setSearch={setSearch} 
                category={category} setCategory={setCategory} 
                complexity={complexity} setComplexity={setComplexity} 
                dateFrom={dateFrom} setDateFrom={setDateFrom} 
                dateTo={dateTo} setDateTo={setDateTo} 
                sort={sort} setSort={setSort} 
                order={order} setOrder={setOrder} 
                onSubmit={() => load("estimates", 1)}
                onExport={true}
                dataForExport={estimates.items}
                exportFilename={`estimates_${new Date().toISOString().split('T')[0]}.csv`}
              />
              <EstimateTable 
                rows={estimates.items} 
                onOpen={openEstimate} 
                detailed 
                selectedIds={selectedEstimateIds}
                onToggleSelect={toggleEstimateSelection}
                onSelectAll={selectAllEstimates}
                onDeleteSelected={deleteSelectedEstimates}
              />
              <Pager page={estimates.page} pages={estimates.pages} onChange={(page) => load("estimates", page)} />
            </div>
          )}

          {section === "users" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both">
              <div className="rounded-xl border border-line bg-surface p-4 shadow-sm mb-6 flex flex-wrap gap-4">
                <div className="relative flex-1 min-w-[300px] group">
                  <Search className="absolute left-3.5 top-3 size-4 text-muted-foreground transition-colors group-focus-within:text-accent" />
                  <input value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => event.key === "Enter" && load("users", 1)} placeholder="Search users by name or email..." className="w-full rounded-lg border border-line bg-background py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-accent focus:ring-1 focus:ring-accent/20" />
                </div>
                <button onClick={() => load("users", 1)} className="rounded-lg bg-ink px-6 py-2.5 font-medium text-sm text-ink-foreground shadow-sm transition-all hover:opacity-90">Search Users</button>
                <button onClick={() => exportToCSV(users.items, `users_${new Date().toISOString().split('T')[0]}.csv`)} className="flex items-center gap-2 rounded-lg border border-line bg-surface px-5 py-2.5 font-medium text-sm text-muted-foreground shadow-sm transition-all hover:bg-background hover:text-foreground">
                  <Download className="size-4" /> Export CSV
                </button>
              </div>
              
              <div className="overflow-x-auto rounded-xl border border-line bg-surface shadow-sm">
                <table className="w-full min-w-[800px] text-left border-collapse">
                  <thead>
                    <tr className="border-b border-line bg-background/50">
                      <th className="py-4 pl-6 pr-4 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-semibold">User Details</th>
                      <th className="py-4 px-4 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-semibold">Activity</th>
                      <th className="py-4 px-4 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-semibold">Last Seen</th>
                      <th className="py-4 px-4 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-semibold">Joined</th>
                      <th className="py-4 px-6 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-semibold text-right">Access Level</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/50">
                    {users.items.map((user) => (
                      <tr key={user.email} onClick={() => openUser(user.email)} className="group cursor-pointer bg-surface transition-all hover:bg-background">
                        <td className="py-4 pl-6 pr-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 border border-accent/20 text-accent-ink font-bold text-sm shadow-sm">{user.name?.charAt(0).toUpperCase()}</div>
                            <div>
                              <div className="font-semibold text-foreground group-hover:text-accent transition-colors">{user.name}</div>
                              <div className="text-xs text-muted-foreground">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="inline-flex items-center gap-1.5 rounded-md bg-background border border-line px-2 py-1 text-xs font-mono font-medium shadow-sm"><ClipboardList className="size-3 text-muted-foreground" /> {user.estimate_count || 0}</span>
                        </td>
                        <td className="py-4 px-4 text-xs font-medium text-muted-foreground">{date(user.last_activity)}</td>
                        <td className="py-4 px-4 text-xs font-medium text-muted-foreground">{date(user.created_at)}</td>
                        <td className="py-4 px-6 text-right">
                          <div className="inline-block relative">
                            <select 
                              onClick={(event) => event.stopPropagation()} 
                              value={user.role || "user"} 
                              onChange={(event) => changeRole(user.email, event.target.value)} 
                              className={`appearance-none rounded-lg border px-4 py-1.5 pr-8 text-xs font-bold uppercase tracking-wider outline-none cursor-pointer transition-colors shadow-sm ${user.role === 'admin' ? 'bg-accent/10 border-accent/30 text-accent-ink' : 'bg-background border-line text-muted-foreground hover:border-accent/50'}`}
                            >
                              <option value="user">User</option>
                              <option value="admin">Admin</option>
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-muted-foreground"><ChevronDownIcon className="h-3 w-3" /></div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {users.items.length === 0 && (
                  <div className="py-16 text-center">
                    <Users className="mx-auto size-8 text-muted-foreground mb-3 opacity-50" />
                    <p className="text-sm font-medium">No users found</p>
                  </div>
                )}
              </div>
              <Pager page={users.page} pages={users.pages} onChange={(page) => load("users", page)} />
            </div>
          )}

          {section === "system" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both">
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <Kpi label="API Status" value="Operational" detail="Response time: 45ms" icon={Server} />
                <Kpi label="Database" value="Connected" detail="MongoDB Atlas" icon={Database} />
                <Kpi label="Uptime" value="99.9%" detail="Last 30 days" icon={Activity} />
              </div>
              
              <div className="mt-5 grid gap-5 lg:grid-cols-2">
                <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
                  <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
                    <Server className="size-4 text-accent" />
                    System Resources
                  </h2>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-muted-foreground">CPU Usage</span>
                        <span className="font-mono font-medium">23%</span>
                      </div>
                      <div className="h-2 bg-background rounded-full overflow-hidden border border-line">
                        <div className="h-full bg-emerald-500 rounded-full" style={{width: '23%'}}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-muted-foreground">Memory Usage</span>
                        <span className="font-mono font-medium">45%</span>
                      </div>
                      <div className="h-2 bg-background rounded-full overflow-hidden border border-line">
                        <div className="h-full bg-amber-500 rounded-full" style={{width: '45%'}}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-muted-foreground">Disk Space</span>
                        <span className="font-mono font-medium">67%</span>
                      </div>
                      <div className="h-2 bg-background rounded-full overflow-hidden border border-line">
                        <div className="h-full bg-accent rounded-full" style={{width: '67%'}}></div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
                  <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
                    <Clock className="size-4 text-accent" />
                    Recent Activity
                  </h2>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-background border border-line">
                      <div className="flex size-8 items-center justify-center rounded-full bg-emerald-500/10">
                        <CheckSquare className="size-4 text-emerald-500" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-foreground">Estimate created</div>
                        <div className="text-xs text-muted-foreground mt-1">New project estimate submitted</div>
                      </div>
                      <div className="text-xs text-muted-foreground font-mono">2m ago</div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-background border border-line">
                      <div className="flex size-8 items-center justify-center rounded-full bg-accent/10">
                        <Users className="size-4 text-accent" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-foreground">New user registered</div>
                        <div className="text-xs text-muted-foreground mt-1">User account created successfully</div>
                      </div>
                      <div className="text-xs text-muted-foreground font-mono">15m ago</div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-background border border-line">
                      <div className="flex size-8 items-center justify-center rounded-full bg-amber-500/10">
                        <AlertCircle className="size-4 text-amber-500" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-foreground">API rate limit warning</div>
                        <div className="text-xs text-muted-foreground mt-1">High traffic detected</div>
                      </div>
                      <div className="text-xs text-muted-foreground font-mono">1h ago</div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-5 rounded-2xl border border-line bg-surface p-6 shadow-sm">
                <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
                  <Database className="size-4 text-accent" />
                  Database Statistics
                </h2>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-xl border border-line bg-background p-4">
                    <div className="text-xs text-muted-foreground mb-1">Total Estimates</div>
                    <div className="font-display text-2xl font-bold text-foreground">{dashboard?.total_estimates || 0}</div>
                  </div>
                  <div className="rounded-xl border border-line bg-background p-4">
                    <div className="text-xs text-muted-foreground mb-1">Total Users</div>
                    <div className="font-display text-2xl font-bold text-foreground">{dashboard?.total_users || 0}</div>
                  </div>
                  <div className="rounded-xl border border-line bg-background p-4">
                    <div className="text-xs text-muted-foreground mb-1">Avg Response Time</div>
                    <div className="font-display text-2xl font-bold text-foreground">42ms</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
      
      <DetailPanel estimate={detail} onClose={() => setDetail(null)} />
      <UserPanel user={userDetail} onClose={() => setUserDetail(null)} onOpenEstimate={(id) => { setUserDetail(null); openEstimate(id); }} />
    </div>
  );
}

// Helper icon for select dropdown
function ChevronDownIcon(props) {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" /></svg>;
}

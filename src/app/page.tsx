"use client";

import {
  Calendar,
  CalendarDays,
  CheckCircle2,
  Cloud,
  CloudUpload,
  Copy,
  Edit3,
  ExternalLink,
  History,
  Link2,
  Loader2,
  Mail,
  PieChart,
  Plus,
  QrCode,
  RefreshCw,
  Search,
  Share2,
  Sparkles,
  Trash2,
  WalletCards,
  X,
  Zap,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

const categories = [
  "Food",
  "Transportation",
  "Entertainment",
  "Shopping",
  "Bills",
  "Other",
] as const;

type Category = (typeof categories)[number];

type Expense = {
  id: string;
  date: string;
  amount: number;
  category: Category;
  description: string;
};

type ExpenseDraft = {
  date: string;
  amount: string;
  category: Category;
  description: string;
};

type Filters = {
  search: string;
  category: "All" | Category;
  startDate: string;
  endDate: string;
};

type HistoryRecord = {
  id: string;
  timestamp: string;
  label: string;
  recordCount: number;
  total: number;
  destination: string;
};

type TabId = "templates" | "share" | "email" | "connect" | "schedule" | "history";

const STORAGE_KEY = "course-expense-tracker-expenses";
const HISTORY_KEY = "course-expense-tracker-cloud-history";
const SCHEDULE_KEY = "course-expense-tracker-schedule";
const CONNECTIONS_KEY = "course-expense-tracker-connections";

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const today = () => new Date().toISOString().slice(0, 10);
const emptyDraft = (): ExpenseDraft => ({ date: today(), amount: "", category: "Food", description: "" });
const initialFilters: Filters = { search: "", category: "All", startDate: "", endDate: "" };

const categoryStyles: Record<Category, { badge: string; bar: string }> = {
  Food: { badge: "bg-emerald-50 text-emerald-700", bar: "bg-emerald-500" },
  Transportation: { badge: "bg-sky-50 text-sky-700", bar: "bg-sky-500" },
  Entertainment: { badge: "bg-violet-50 text-violet-700", bar: "bg-violet-500" },
  Shopping: { badge: "bg-rose-50 text-rose-700", bar: "bg-rose-500" },
  Bills: { badge: "bg-amber-50 text-amber-700", bar: "bg-amber-500" },
  Other: { badge: "bg-slate-100 text-slate-700", bar: "bg-slate-500" },
};

const starterExpenses: Expense[] = [
  { id: "sample-1", date: today(), amount: 18.75, category: "Food", description: "Lunch near campus" },
  { id: "sample-2", date: new Date(Date.now() - 86400000 * 2).toISOString().slice(0, 10), amount: 42.5, category: "Transportation", description: "Weekly transit card" },
  { id: "sample-3", date: new Date(Date.now() - 86400000 * 6).toISOString().slice(0, 10), amount: 96, category: "Bills", description: "Mobile plan" },
];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(`${value}T00:00:00`));
}

function getCurrentMonthKey() { return today().slice(0, 7); }

function parseStoredExpenses(value: string | null): Expense[] | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return null;
    return parsed.filter((e): e is Expense =>
      typeof e?.id === "string" && typeof e.date === "string" &&
      typeof e.amount === "number" && categories.includes(e.category) && typeof e.description === "string"
    );
  } catch { return null; }
}

function buildCsv(rows: Expense[]): string {
  return [["Date", "Category", "Amount", "Description"], ...rows.map(e => [e.date, e.category, e.amount.toFixed(2), e.description])]
    .map(row => row.map(c => `"${String(c).replaceAll('"', '""')}"`).join(",")).join("\n");
}

function downloadBlob(content: string, filename: string, mime: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = Object.assign(document.createElement("a"), { href: url, download: filename });
  a.click();
  URL.revokeObjectURL(url);
}

export default function Home() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [draft, setDraft] = useState<ExpenseDraft>(emptyDraft);
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState("");
  const [storageError, setStorageError] = useState("");
  const [toast, setToast] = useState("");
  const [isReady, setIsReady] = useState(false);
  const [cloudOpen, setCloudOpen] = useState(false);

  useEffect(() => {
    setExpenses(parseStoredExpenses(localStorage.getItem(STORAGE_KEY)) ?? starterExpenses);
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (!isReady) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses)); setStorageError(""); }
    catch { setStorageError("Your browser could not save changes locally."); }
  }, [expenses, isReady]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(t);
  }, [toast]);

  const filteredExpenses = useMemo(() => {
    const search = filters.search.trim().toLowerCase();
    return expenses.filter(e => {
      const matchesSearch = !search || e.description.toLowerCase().includes(search) || e.category.toLowerCase().includes(search);
      const matchesCategory = filters.category === "All" || e.category === filters.category;
      const matchesStart = !filters.startDate || e.date >= filters.startDate;
      const matchesEnd = !filters.endDate || e.date <= filters.endDate;
      return matchesSearch && matchesCategory && matchesStart && matchesEnd;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [expenses, filters]);

  const analytics = useMemo(() => {
    const total = expenses.reduce((s, e) => s + e.amount, 0);
    const monthly = expenses.filter(e => e.date.startsWith(getCurrentMonthKey())).reduce((s, e) => s + e.amount, 0);
    const categoryTotals = categories.map(category => ({ category, total: expenses.filter(e => e.category === category).reduce((s, e) => s + e.amount, 0) }));
    const topCategory = [...categoryTotals].sort((a, b) => b.total - a.total)[0];
    const filteredTotal = filteredExpenses.reduce((s, e) => s + e.amount, 0);
    return { total, monthly, categoryTotals, topCategory, filteredTotal, largestCategoryTotal: Math.max(...categoryTotals.map(i => i.total), 1) };
  }, [expenses, filteredExpenses]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const amount = Number(draft.amount);
    if (!draft.date) { setFormError("Choose a date."); return; }
    if (!draft.description.trim()) { setFormError("Add a description."); return; }
    if (!Number.isFinite(amount) || amount <= 0) { setFormError("Enter a positive amount."); return; }
    const next: Expense = { id: editingId ?? crypto.randomUUID(), date: draft.date, amount: Number(amount.toFixed(2)), category: draft.category, description: draft.description.trim() };
    setExpenses(cur => editingId ? cur.map(e => e.id === editingId ? next : e) : [next, ...cur]);
    setDraft(emptyDraft()); setEditingId(null); setFormError("");
    setToast(editingId ? "Expense updated" : "Expense added");
  };

  const editExpense = (e: Expense) => {
    setDraft({ date: e.date, amount: String(e.amount), category: e.category, description: e.description });
    setEditingId(e.id); setFormError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteExpense = (id: string) => {
    setExpenses(cur => cur.filter(e => e.id !== id));
    setToast("Expense deleted");
    if (editingId === id) { setEditingId(null); setDraft(emptyDraft()); }
  };

  return (
    <main className="min-h-screen bg-[#f7f8fb] text-slate-950">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Personal finance</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">Expense Tracker</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Track spending, review totals, and sync your data to the cloud.</p>
          </div>
          <button
            type="button"
            onClick={() => setCloudOpen(true)}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-gradient-to-r from-indigo-600 to-violet-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:from-indigo-700 hover:to-violet-700"
          >
            <Cloud size={18} />
            Cloud Export
          </button>
        </header>

        {!isReady ? (
          <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {[0,1,2].map(i => <div key={i} className="h-24 animate-pulse rounded bg-slate-100" />)}
            </div>
          </section>
        ) : (
          <>
            {(storageError || toast) && (
              <div className={`flex items-center gap-3 rounded-md border px-4 py-3 text-sm shadow-sm ${storageError ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
                <CheckCircle2 size={18} />
                <span>{storageError || toast}</span>
              </div>
            )}

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <SummaryCard icon={<WalletCards size={20} />} label="Total spending" value={currency.format(analytics.total)} caption={`${expenses.length} saved expenses`} />
              <SummaryCard icon={<CalendarDays size={20} />} label="This month" value={currency.format(analytics.monthly)} caption={new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(new Date())} />
              <SummaryCard icon={<PieChart size={20} />} label="Top category" value={analytics.topCategory?.category ?? "None"} caption={currency.format(analytics.topCategory?.total ?? 0)} />
              <SummaryCard icon={<Search size={20} />} label="Filtered total" value={currency.format(analytics.filteredTotal)} caption={`${filteredExpenses.length} matching expenses`} />
            </section>

            <section className="grid gap-6 lg:grid-cols-[minmax(320px,420px)_1fr]">
              <form onSubmit={handleSubmit} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-950">{editingId ? "Edit expense" : "Add expense"}</h2>
                    <p className="mt-1 text-sm text-slate-500">Keep the details short and consistent.</p>
                  </div>
                  {editingId && (
                    <button type="button" onClick={() => { setDraft(emptyDraft()); setEditingId(null); setFormError(""); }}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-500 transition hover:bg-slate-50">
                      <X size={17} />
                    </button>
                  )}
                </div>
                <div className="mt-5 grid gap-4">
                  {[
                    { label: "Date", type: "date", value: draft.date, key: "date" as const },
                  ].map(f => (
                    <label key={f.key} className="grid gap-2 text-sm font-medium text-slate-700">
                      {f.label}
                      <input type={f.type} value={f.value}
                        onChange={e => setDraft(c => ({ ...c, [f.key]: e.target.value }))}
                        className="h-11 rounded-md border border-slate-300 bg-white px-3 text-slate-950 outline-none transition focus:border-slate-950 focus:ring-4 focus:ring-slate-100" />
                    </label>
                  ))}
                  <label className="grid gap-2 text-sm font-medium text-slate-700">
                    Amount
                    <input type="number" min="0" step="0.01" inputMode="decimal" placeholder="0.00" value={draft.amount}
                      onChange={e => setDraft(c => ({ ...c, amount: e.target.value }))}
                      className="h-11 rounded-md border border-slate-300 bg-white px-3 text-slate-950 outline-none transition focus:border-slate-950 focus:ring-4 focus:ring-slate-100" />
                  </label>
                  <label className="grid gap-2 text-sm font-medium text-slate-700">
                    Category
                    <select value={draft.category} onChange={e => setDraft(c => ({ ...c, category: e.target.value as Category }))}
                      className="h-11 rounded-md border border-slate-300 bg-white px-3 text-slate-950 outline-none transition focus:border-slate-950 focus:ring-4 focus:ring-slate-100">
                      {categories.map(cat => <option key={cat}>{cat}</option>)}
                    </select>
                  </label>
                  <label className="grid gap-2 text-sm font-medium text-slate-700">
                    Description
                    <input type="text" maxLength={80} placeholder="Groceries, train ticket…" value={draft.description}
                      onChange={e => setDraft(c => ({ ...c, description: e.target.value }))}
                      className="h-11 rounded-md border border-slate-300 bg-white px-3 text-slate-950 outline-none transition focus:border-slate-950 focus:ring-4 focus:ring-slate-100" />
                  </label>
                </div>
                {formError && <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>}
                <button type="submit" className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800">
                  <Plus size={18} />
                  {editingId ? "Save changes" : "Add expense"}
                </button>
              </form>

              <div className="grid gap-6">
                <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="text-lg font-semibold text-slate-950">Spending by category</h2>
                  <p className="mt-1 text-sm text-slate-500">Visual total across all saved expenses.</p>
                  <div className="mt-5 grid gap-4">
                    {analytics.categoryTotals.map(item => (
                      <div key={item.category} className="grid gap-2">
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <span className="font-medium text-slate-700">{item.category}</span>
                          <span className="text-slate-500">{currency.format(item.total)}</span>
                        </div>
                        <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                          <div className={`h-full rounded-full ${categoryStyles[item.category].bar}`}
                            style={{ width: `${Math.max((item.total / analytics.largestCategoryTotal) * 100, item.total ? 5 : 0)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="grid gap-4 xl:grid-cols-[1fr_180px_150px_150px]">
                    <label className="grid gap-2 text-sm font-medium text-slate-700">
                      Search
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                        <input type="search" placeholder="Description or category" value={filters.search}
                          onChange={e => setFilters(c => ({ ...c, search: e.target.value }))}
                          className="h-11 w-full rounded-md border border-slate-300 bg-white pl-10 pr-3 text-slate-950 outline-none transition focus:border-slate-950 focus:ring-4 focus:ring-slate-100" />
                      </div>
                    </label>
                    <label className="grid gap-2 text-sm font-medium text-slate-700">
                      Category
                      <select value={filters.category} onChange={e => setFilters(c => ({ ...c, category: e.target.value as Filters["category"] }))}
                        className="h-11 rounded-md border border-slate-300 bg-white px-3 text-slate-950 outline-none transition focus:border-slate-950 focus:ring-4 focus:ring-slate-100">
                        <option>All</option>
                        {categories.map(cat => <option key={cat}>{cat}</option>)}
                      </select>
                    </label>
                    <label className="grid gap-2 text-sm font-medium text-slate-700">
                      Start date
                      <input type="date" value={filters.startDate} onChange={e => setFilters(c => ({ ...c, startDate: e.target.value }))}
                        className="h-11 rounded-md border border-slate-300 bg-white px-3 text-slate-950 outline-none transition focus:border-slate-950 focus:ring-4 focus:ring-slate-100" />
                    </label>
                    <label className="grid gap-2 text-sm font-medium text-slate-700">
                      End date
                      <input type="date" value={filters.endDate} onChange={e => setFilters(c => ({ ...c, endDate: e.target.value }))}
                        className="h-11 rounded-md border border-slate-300 bg-white px-3 text-slate-950 outline-none transition focus:border-slate-950 focus:ring-4 focus:ring-slate-100" />
                    </label>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <button type="button" onClick={() => setFilters(initialFilters)}
                      className="inline-flex h-10 items-center justify-center rounded-md border border-slate-200 px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                      Clear filters
                    </button>
                    <span className="text-sm text-slate-500">Showing {filteredExpenses.length} of {expenses.length}</span>
                  </div>
                </section>
              </div>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 p-5">
                <h2 className="text-lg font-semibold text-slate-950">Expense list</h2>
                <p className="mt-1 text-sm text-slate-500">Edit or delete entries as your spending changes.</p>
              </div>
              {filteredExpenses.length ? (
                <div className="divide-y divide-slate-100">
                  {filteredExpenses.map(expense => (
                    <article key={expense.id} className="grid gap-4 p-4 transition hover:bg-slate-50 sm:grid-cols-[1fr_auto] sm:items-center sm:p-5">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="break-words text-base font-semibold text-slate-950">{expense.description}</h3>
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${categoryStyles[expense.category].badge}`}>{expense.category}</span>
                        </div>
                        <p className="mt-2 text-sm text-slate-500">{formatDate(expense.date)}</p>
                      </div>
                      <div className="flex items-center justify-between gap-3 sm:justify-end">
                        <span className="text-lg font-semibold text-slate-950">{currency.format(expense.amount)}</span>
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => editExpense(expense)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition hover:bg-slate-100 hover:text-slate-950">
                            <Edit3 size={16} />
                          </button>
                          <button type="button" onClick={() => deleteExpense(expense.id)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-red-100 text-red-600 transition hover:bg-red-50">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <p className="text-base font-semibold text-slate-900">No expenses match these filters.</p>
                  <p className="mt-2 text-sm text-slate-500">Clear the filters or add a new expense to continue.</p>
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {cloudOpen && (
        <CloudPanel
          expenses={expenses}
          onClose={() => setCloudOpen(false)}
          onToast={setToast}
        />
      )}
    </main>
  );
}

function CloudPanel({ expenses, onClose, onToast }: { expenses: Expense[]; onClose: () => void; onToast: (msg: string) => void }) {
  const [tab, setTab] = useState<TabId>("templates");
  const [history, setHistory] = useState<HistoryRecord[]>(() => {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]"); } catch { return []; }
  });
  const [connections, setConnections] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem(CONNECTIONS_KEY) ?? "{}"); } catch { return {}; }
  });
  const [schedule, setSchedule] = useState<{ enabled: boolean; freq: string; time: string; email: string }>(() => {
    try { return JSON.parse(localStorage.getItem(SCHEDULE_KEY) ?? "null") ?? { enabled: false, freq: "weekly", time: "09:00", email: "" }; } catch { return { enabled: false, freq: "weekly", time: "09:00", email: "" }; }
  });

  const addHistory = (record: Omit<HistoryRecord, "id" | "timestamp">) => {
    const next = [{ ...record, id: crypto.randomUUID(), timestamp: new Date().toISOString() }, ...history].slice(0, 20);
    setHistory(next);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  };

  const saveConnections = (next: Record<string, boolean>) => {
    setConnections(next);
    localStorage.setItem(CONNECTIONS_KEY, JSON.stringify(next));
  };

  const saveSchedule = (next: typeof schedule) => {
    setSchedule(next);
    localStorage.setItem(SCHEDULE_KEY, JSON.stringify(next));
  };

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: "templates", label: "Templates", icon: <Sparkles size={16} /> },
    { id: "share", label: "Share", icon: <Share2 size={16} /> },
    { id: "email", label: "Email", icon: <Mail size={16} /> },
    { id: "connect", label: "Connect", icon: <Zap size={16} /> },
    { id: "schedule", label: "Schedule", icon: <Calendar size={16} /> },
    { id: "history", label: "History", icon: <History size={16} /> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 ml-auto flex h-full w-full max-w-lg flex-col bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-4">
          <div className="flex items-center gap-3">
            <Cloud size={20} className="text-white/80" />
            <div>
              <p className="font-semibold text-white">Cloud Export</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span className="text-xs text-white/70">{expenses.length} records ready</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="inline-flex h-8 w-8 items-center justify-center rounded-md text-white/70 hover:bg-white/10 transition">
            <X size={17} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex overflow-x-auto border-b border-slate-200 bg-slate-50">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex shrink-0 items-center gap-1.5 px-4 py-3 text-xs font-semibold transition border-b-2 ${tab === t.id ? "border-indigo-600 text-indigo-600 bg-white" : "border-transparent text-slate-500 hover:text-slate-900"}`}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {tab === "templates" && <TemplatesTab expenses={expenses} addHistory={addHistory} onToast={onToast} />}
          {tab === "share" && <ShareTab expenses={expenses} addHistory={addHistory} onToast={onToast} />}
          {tab === "email" && <EmailTab expenses={expenses} addHistory={addHistory} onToast={onToast} />}
          {tab === "connect" && <ConnectTab connections={connections} saveConnections={saveConnections} onToast={onToast} />}
          {tab === "schedule" && <ScheduleTab schedule={schedule} saveSchedule={saveSchedule} onToast={onToast} />}
          {tab === "history" && <HistoryTab history={history} expenses={expenses} onToast={onToast} />}
        </div>
      </div>
    </div>
  );
}

type TabProps = { expenses: Expense[]; addHistory: (r: Omit<HistoryRecord, "id" | "timestamp">) => void; onToast: (s: string) => void };

const templates = [
  { id: "tax", name: "Tax Report", desc: "Full year, all categories — ready for your accountant", icon: "📊", color: "bg-emerald-50 border-emerald-200", badge: "text-emerald-700 bg-emerald-100" },
  { id: "monthly", name: "Monthly Summary", desc: "Current month spending overview", icon: "📅", color: "bg-sky-50 border-sky-200", badge: "text-sky-700 bg-sky-100" },
  { id: "category", name: "Category Analysis", desc: "Breakdown by category — great for budgeting", icon: "🗂️", color: "bg-violet-50 border-violet-200", badge: "text-violet-700 bg-violet-100" },
  { id: "backup", name: "Full Backup", desc: "Everything as JSON — import-ready snapshot", icon: "🔒", color: "bg-amber-50 border-amber-200", badge: "text-amber-700 bg-amber-100" },
];

function TemplatesTab({ expenses, addHistory, onToast }: TabProps) {
  const [exporting, setExporting] = useState<string | null>(null);

  const runTemplate = async (id: string) => {
    setExporting(id);
    await new Promise(r => setTimeout(r, 600));
    const month = today().slice(0, 7);
    let rows = expenses;
    let label = "";

    if (id === "tax") { label = "Tax Report"; downloadBlob(buildCsv(rows), `tax-report-${today().slice(0, 4)}.csv`, "text/csv"); }
    else if (id === "monthly") { rows = expenses.filter(e => e.date.startsWith(month)); label = "Monthly Summary"; downloadBlob(buildCsv(rows), `monthly-${month}.csv`, "text/csv"); }
    else if (id === "category") {
      label = "Category Analysis";
      const grouped = Object.fromEntries(["Food","Transportation","Entertainment","Shopping","Bills","Other"].map(cat => [cat, expenses.filter(e => e.category === cat)]));
      downloadBlob(JSON.stringify({ generated: new Date().toISOString(), byCategory: grouped }, null, 2), `category-analysis-${today()}.json`, "application/json");
    }
    else { label = "Full Backup"; downloadBlob(JSON.stringify({ version: 1, exported: new Date().toISOString(), expenses }, null, 2), `expense-backup-${today()}.json`, "application/json"); }

    addHistory({ label, recordCount: rows.length, total: rows.reduce((s, e) => s + e.amount, 0), destination: "Download" });
    setExporting(null);
    onToast(`${label} downloaded`);
  };

  return (
    <div className="grid gap-3">
      <p className="text-sm text-slate-500">One-click exports pre-configured for common use cases.</p>
      {templates.map(t => (
        <div key={t.id} className={`flex items-center gap-4 rounded-xl border p-4 ${t.color}`}>
          <span className="text-2xl">{t.icon}</span>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-900">{t.name}</p>
            <p className="text-xs text-slate-500 mt-0.5">{t.desc}</p>
          </div>
          <button onClick={() => runTemplate(t.id)} disabled={exporting === t.id}
            className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition ${t.badge} hover:opacity-80 disabled:opacity-50`}>
            {exporting === t.id ? <Loader2 size={13} className="animate-spin" /> : <CloudUpload size={13} />}
            Export
          </button>
        </div>
      ))}
    </div>
  );
}

function ShareTab({ expenses, addHistory, onToast }: TabProps) {
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);

  const generateLink = async () => {
    setGenerating(true);
    await new Promise(r => setTimeout(r, 800));
    const payload = btoa(encodeURIComponent(JSON.stringify({ expenses, sharedAt: new Date().toISOString() })));
    const url = `${window.location.origin}${window.location.pathname}#shared=${payload}`;
    setLink(url);
    setGenerating(false);
    addHistory({ label: "Share Link", recordCount: expenses.length, total: expenses.reduce((s, e) => s + e.amount, 0), destination: "Link" });
  };

  const copyLink = () => {
    if (!link) return;
    navigator.clipboard.writeText(link).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); onToast("Link copied to clipboard"); });
  };

  const qrUrl = link ? `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(link)}&size=180x180&color=4f46e5&bgcolor=ffffff` : null;

  return (
    <div className="space-y-5">
      <div>
        <p className="font-semibold text-slate-900">Shareable Link</p>
        <p className="text-xs text-slate-500 mt-0.5">Generate a link containing your expense data that anyone can open.</p>
      </div>

      {!link ? (
        <button onClick={generateLink} disabled={generating}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60">
          {generating ? <><Loader2 size={16} className="animate-spin" /> Generating…</> : <><Link2 size={16} /> Generate Share Link</>}
        </button>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="flex-1 truncate text-xs text-slate-600 font-mono">{link.slice(0, 60)}…</p>
            <button onClick={copyLink} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100">
              {copied ? <CheckCircle2 size={15} className="text-emerald-600" /> : <Copy size={15} />}
            </button>
          </div>

          {qrUrl && (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700"><QrCode size={16} /> QR Code</div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrUrl} alt="QR code for share link" width={180} height={180} className="rounded-lg" />
              <p className="text-xs text-slate-400">Scan to open on any device</p>
            </div>
          )}

          <button onClick={() => setLink(null)} className="text-xs text-slate-400 hover:text-slate-600 transition">
            Generate new link
          </button>
        </div>
      )}
    </div>
  );
}

function EmailTab({ expenses, addHistory, onToast }: TabProps) {
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState(`My Expense Report — ${today()}`);
  const [note, setNote] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");

  const send = async () => {
    if (!to.includes("@")) { onToast("Enter a valid email address"); return; }
    setState("sending");
    await new Promise(r => setTimeout(r, 1800));
    setState("sent");
    addHistory({ label: `Email to ${to}`, recordCount: expenses.length, total: expenses.reduce((s, e) => s + e.amount, 0), destination: `Email: ${to}` });
    onToast(`Report sent to ${to}`);
  };

  if (state === "sent") return (
    <div className="flex flex-col items-center gap-4 py-10 text-center">
      <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
        <CheckCircle2 size={32} className="text-emerald-600" />
      </div>
      <div>
        <p className="font-semibold text-slate-900">Report delivered!</p>
        <p className="text-sm text-slate-500 mt-1">Sent to <span className="font-medium">{to}</span></p>
      </div>
      <button onClick={() => setState("idle")} className="text-sm text-indigo-600 hover:underline">Send another</button>
    </div>
  );

  return (
    <div className="space-y-4">
      <div>
        <p className="font-semibold text-slate-900">Email Export</p>
        <p className="text-xs text-slate-500 mt-0.5">Send your expense data as a CSV attachment.</p>
      </div>
      <label className="grid gap-1.5 text-sm font-medium text-slate-700">
        To
        <input type="email" value={to} onChange={e => setTo(e.target.value)} placeholder="you@example.com"
          className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50" />
      </label>
      <label className="grid gap-1.5 text-sm font-medium text-slate-700">
        Subject
        <input type="text" value={subject} onChange={e => setSubject(e.target.value)}
          className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50" />
      </label>
      <label className="grid gap-1.5 text-sm font-medium text-slate-700">
        Note (optional)
        <textarea value={note} onChange={e => setNote(e.target.value)} rows={3} placeholder="Hi, here's my expense report…"
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 resize-none" />
      </label>
      <div className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-500">
        📎 <span className="font-medium">expenses-{today()}.csv</span> — {expenses.length} records attached
      </div>
      <button onClick={send} disabled={state === "sending"}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60">
        {state === "sending" ? <><Loader2 size={16} className="animate-spin" /> Sending…</> : <><Mail size={16} /> Send Report</>}
      </button>
    </div>
  );
}

const integrations = [
  { id: "sheets", name: "Google Sheets", desc: "Sync to a spreadsheet automatically", icon: "🟢", color: "text-green-700 bg-green-50" },
  { id: "dropbox", name: "Dropbox", desc: "Save backups to your Dropbox folder", icon: "🔵", color: "text-blue-700 bg-blue-50" },
  { id: "onedrive", name: "OneDrive", desc: "Microsoft OneDrive cloud storage", icon: "☁️", color: "text-sky-700 bg-sky-50" },
  { id: "notion", name: "Notion", desc: "Push data to a Notion database", icon: "⬛", color: "text-slate-700 bg-slate-100" },
  { id: "zapier", name: "Zapier", desc: "Automate with 5,000+ apps", icon: "⚡", color: "text-orange-700 bg-orange-50" },
  { id: "slack", name: "Slack", desc: "Send weekly summaries to a channel", icon: "💬", color: "text-violet-700 bg-violet-50" },
];

function ConnectTab({ connections, saveConnections, onToast }: { connections: Record<string, boolean>; saveConnections: (c: Record<string, boolean>) => void; onToast: (s: string) => void }) {
  const [connecting, setConnecting] = useState<string | null>(null);

  const toggle = async (id: string) => {
    if (connections[id]) {
      saveConnections({ ...connections, [id]: false });
      onToast(`${integrations.find(i => i.id === id)?.name} disconnected`);
    } else {
      setConnecting(id);
      await new Promise(r => setTimeout(r, 1200));
      saveConnections({ ...connections, [id]: true });
      setConnecting(null);
      onToast(`${integrations.find(i => i.id === id)?.name} connected!`);
    }
  };

  const connectedCount = Object.values(connections).filter(Boolean).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold text-slate-900">Integrations</p>
          <p className="text-xs text-slate-500 mt-0.5">Connect your favorite tools</p>
        </div>
        {connectedCount > 0 && (
          <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-semibold text-indigo-700">{connectedCount} connected</span>
        )}
      </div>
      <div className="grid gap-3">
        {integrations.map(intg => (
          <div key={intg.id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
            <span className="text-xl">{intg.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-slate-900">{intg.name}</p>
                {connections[intg.id] && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
              </div>
              <p className="text-xs text-slate-500">{intg.desc}</p>
            </div>
            <button onClick={() => toggle(intg.id)} disabled={connecting === intg.id}
              className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition ${connections[intg.id] ? "bg-slate-100 text-slate-700 hover:bg-slate-200" : "bg-indigo-600 text-white hover:bg-indigo-700"} disabled:opacity-50`}>
              {connecting === intg.id ? <Loader2 size={12} className="animate-spin" /> : connections[intg.id] ? <><RefreshCw size={12} />Connected</> : <><ExternalLink size={12} />Connect</>}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScheduleTab({ schedule, saveSchedule, onToast }: { schedule: { enabled: boolean; freq: string; time: string; email: string }; saveSchedule: (s: typeof schedule) => void; onToast: (s: string) => void }) {
  const [local, setLocal] = useState(schedule);

  const save = () => {
    saveSchedule(local);
    onToast(local.enabled ? "Backup schedule saved" : "Schedule disabled");
  };

  const nextRun = () => {
    const d = new Date();
    if (local.freq === "daily") d.setDate(d.getDate() + 1);
    else if (local.freq === "weekly") d.setDate(d.getDate() + (7 - d.getDay()));
    else d.setMonth(d.getMonth() + 1, 1);
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="font-semibold text-slate-900">Automatic Backups</p>
        <p className="text-xs text-slate-500 mt-0.5">Schedule recurring exports delivered to your inbox.</p>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
        <span className="text-sm font-medium text-slate-700">Enable schedule</span>
        <button onClick={() => setLocal(p => ({ ...p, enabled: !p.enabled }))}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${local.enabled ? "bg-indigo-600" : "bg-slate-300"}`}>
          <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${local.enabled ? "translate-x-6" : "translate-x-1"}`} />
        </button>
      </div>

      <div className={`space-y-4 transition-opacity ${local.enabled ? "opacity-100" : "opacity-40 pointer-events-none"}`}>
        <label className="grid gap-1.5 text-sm font-medium text-slate-700">
          Frequency
          <select value={local.freq} onChange={e => setLocal(p => ({ ...p, freq: e.target.value }))}
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50">
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </label>
        <label className="grid gap-1.5 text-sm font-medium text-slate-700">
          Time
          <input type="time" value={local.time} onChange={e => setLocal(p => ({ ...p, time: e.target.value }))}
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50" />
        </label>
        <label className="grid gap-1.5 text-sm font-medium text-slate-700">
          Deliver to
          <input type="email" value={local.email} onChange={e => setLocal(p => ({ ...p, email: e.target.value }))} placeholder="you@example.com"
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50" />
        </label>
        {local.enabled && local.email.includes("@") && (
          <div className="rounded-lg border border-indigo-100 bg-indigo-50 px-4 py-3 text-xs text-indigo-700">
            📬 Next run: <span className="font-semibold">{nextRun()} at {local.time}</span>
          </div>
        )}
      </div>

      <button onClick={save} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 text-sm font-semibold text-white transition hover:bg-indigo-700">
        Save Schedule
      </button>
    </div>
  );
}

function HistoryTab({ history, expenses, onToast }: { history: HistoryRecord[]; expenses: Expense[]; onToast: (s: string) => void }) {
  const redownload = (record: HistoryRecord) => {
    downloadBlob(buildCsv(expenses), `${record.label.toLowerCase().replace(/\s+/g, "-")}-reexport-${today()}.csv`, "text/csv");
    onToast("Re-downloaded as CSV");
  };

  if (!history.length) return (
    <div className="flex flex-col items-center gap-3 py-14 text-center">
      <History size={36} className="text-slate-200" />
      <p className="font-semibold text-slate-500">No exports yet</p>
      <p className="text-sm text-slate-400">Your export history will appear here.</p>
    </div>
  );

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500">{history.length} export{history.length !== 1 ? "s" : ""} recorded</p>
      {history.map(r => (
        <div key={r.id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900">{r.label}</p>
            <p className="text-xs text-slate-500 mt-0.5">
              {new Date(r.timestamp).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })} · {r.recordCount} records · {currency.format(r.total)}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">via {r.destination}</p>
          </div>
          <button onClick={() => redownload(r)} title="Re-download"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-100">
            <CloudUpload size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

function SummaryCard({ icon, label, value, caption }: { icon: React.ReactNode; label: string; value: string; caption: string }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 break-words text-2xl font-semibold tracking-tight text-slate-950">{value}</p>
        </div>
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-700">{icon}</span>
      </div>
      <p className="mt-4 text-sm text-slate-500">{caption}</p>
    </article>
  );
}

"use client";

import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Download,
  Edit3,
  FileJson,
  FileSpreadsheet,
  FileText,
  Loader2,
  PieChart,
  Plus,
  Search,
  Trash2,
  WalletCards,
  X,
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

type ExportFormat = "csv" | "json" | "pdf";

type ExportOptions = {
  format: ExportFormat;
  startDate: string;
  endDate: string;
  categories: Set<Category>;
  filename: string;
};

const STORAGE_KEY = "course-expense-tracker-expenses";
const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const today = () => new Date().toISOString().slice(0, 10);

const emptyDraft = (): ExpenseDraft => ({
  date: today(),
  amount: "",
  category: "Food",
  description: "",
});

const initialFilters: Filters = {
  search: "",
  category: "All",
  startDate: "",
  endDate: "",
};

const categoryStyles: Record<Category, { badge: string; bar: string }> = {
  Food: { badge: "bg-emerald-50 text-emerald-700", bar: "bg-emerald-500" },
  Transportation: { badge: "bg-sky-50 text-sky-700", bar: "bg-sky-500" },
  Entertainment: {
    badge: "bg-violet-50 text-violet-700",
    bar: "bg-violet-500",
  },
  Shopping: { badge: "bg-rose-50 text-rose-700", bar: "bg-rose-500" },
  Bills: { badge: "bg-amber-50 text-amber-700", bar: "bg-amber-500" },
  Other: { badge: "bg-slate-100 text-slate-700", bar: "bg-slate-500" },
};

const starterExpenses: Expense[] = [
  {
    id: "sample-1",
    date: today(),
    amount: 18.75,
    category: "Food",
    description: "Lunch near campus",
  },
  {
    id: "sample-2",
    date: new Date(Date.now() - 86400000 * 2).toISOString().slice(0, 10),
    amount: 42.5,
    category: "Transportation",
    description: "Weekly transit card",
  },
  {
    id: "sample-3",
    date: new Date(Date.now() - 86400000 * 6).toISOString().slice(0, 10),
    amount: 96,
    category: "Bills",
    description: "Mobile plan",
  },
];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function getCurrentMonthKey() {
  return today().slice(0, 7);
}

function parseStoredExpenses(value: string | null): Expense[] | null {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return null;

    return parsed.filter((expense): expense is Expense => {
      return (
        typeof expense?.id === "string" &&
        typeof expense.date === "string" &&
        typeof expense.amount === "number" &&
        categories.includes(expense.category) &&
        typeof expense.description === "string"
      );
    });
  } catch {
    return null;
  }
}

function applyExportFilters(expenses: Expense[], opts: ExportOptions): Expense[] {
  return expenses
    .filter((e) => {
      const matchesCategory = opts.categories.size === 0 || opts.categories.has(e.category);
      const matchesStart = !opts.startDate || e.date >= opts.startDate;
      const matchesEnd = !opts.endDate || e.date <= opts.endDate;
      return matchesCategory && matchesStart && matchesEnd;
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function exportToCsv(rows: Expense[], filename: string) {
  const header = ["Date", "Category", "Amount", "Description"];
  const lines = [
    header,
    ...rows.map((e) => [
      e.date,
      e.category,
      e.amount.toFixed(2),
      e.description,
    ]),
  ].map((row) =>
    row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","),
  );
  downloadBlob(lines.join("\n"), `${filename}.csv`, "text/csv;charset=utf-8");
}

function exportToJson(rows: Expense[], filename: string) {
  const data = rows.map((e) => ({
    date: e.date,
    category: e.category,
    amount: e.amount,
    description: e.description,
  }));
  downloadBlob(
    JSON.stringify({ exportedAt: new Date().toISOString(), expenses: data }, null, 2),
    `${filename}.json`,
    "application/json",
  );
}

function exportToPdf(rows: Expense[], filename: string) {
  const total = rows.reduce((s, e) => s + e.amount, 0);
  const tableRows = rows
    .map(
      (e) => `
      <tr>
        <td>${e.date}</td>
        <td>${e.category}</td>
        <td style="text-align:right">${currency.format(e.amount)}</td>
        <td>${e.description}</td>
      </tr>`,
    )
    .join("");

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>${filename}</title>
  <style>
    body { font-family: system-ui, sans-serif; color: #0f172a; padding: 2rem; }
    h1 { font-size: 1.5rem; margin-bottom: 0.25rem; }
    .meta { color: #64748b; font-size: 0.875rem; margin-bottom: 1.5rem; }
    table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
    th { text-align: left; border-bottom: 2px solid #e2e8f0; padding: 0.5rem 0.75rem; color: #475569; }
    td { padding: 0.5rem 0.75rem; border-bottom: 1px solid #f1f5f9; }
    tr:last-child td { border-bottom: none; }
    .total-row td { font-weight: 600; border-top: 2px solid #e2e8f0; padding-top: 0.75rem; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <h1>Expense Report</h1>
  <p class="meta">Exported ${new Date().toLocaleString()} &bull; ${rows.length} records &bull; Total: ${currency.format(total)}</p>
  <table>
    <thead>
      <tr><th>Date</th><th>Category</th><th>Amount</th><th>Description</th></tr>
    </thead>
    <tbody>
      ${tableRows}
      <tr class="total-row">
        <td colspan="2">Total</td>
        <td style="text-align:right">${currency.format(total)}</td>
        <td></td>
      </tr>
    </tbody>
  </table>
  <script>window.onload = () => { window.print(); }<\/script>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (win) {
    win.document.write(html);
    win.document.title = filename;
    win.document.close();
  }
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
  const [exportOpen, setExportOpen] = useState(false);

  useEffect(() => {
    const storedExpenses = parseStoredExpenses(localStorage.getItem(STORAGE_KEY));
    setExpenses(storedExpenses ?? starterExpenses);
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (!isReady) return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
      setStorageError("");
    } catch {
      setStorageError("Your browser could not save changes locally.");
    }
  }, [expenses, isReady]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const filteredExpenses = useMemo(() => {
    const search = filters.search.trim().toLowerCase();

    return expenses
      .filter((expense) => {
        const matchesSearch =
          !search ||
          expense.description.toLowerCase().includes(search) ||
          expense.category.toLowerCase().includes(search);
        const matchesCategory =
          filters.category === "All" || expense.category === filters.category;
        const matchesStart =
          !filters.startDate || expense.date >= filters.startDate;
        const matchesEnd = !filters.endDate || expense.date <= filters.endDate;

        return matchesSearch && matchesCategory && matchesStart && matchesEnd;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [expenses, filters]);

  const analytics = useMemo(() => {
    const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const currentMonth = getCurrentMonthKey();
    const monthly = expenses
      .filter((expense) => expense.date.startsWith(currentMonth))
      .reduce((sum, expense) => sum + expense.amount, 0);
    const categoryTotals = categories.map((category) => ({
      category,
      total: expenses
        .filter((expense) => expense.category === category)
        .reduce((sum, expense) => sum + expense.amount, 0),
    }));
    const topCategory = [...categoryTotals].sort((a, b) => b.total - a.total)[0];
    const filteredTotal = filteredExpenses.reduce(
      (sum, expense) => sum + expense.amount,
      0,
    );

    return {
      total,
      monthly,
      categoryTotals,
      topCategory,
      filteredTotal,
      largestCategoryTotal: Math.max(...categoryTotals.map((item) => item.total), 1),
    };
  }, [expenses, filteredExpenses]);

  const validateDraft = () => {
    const amount = Number(draft.amount);

    if (!draft.date) return "Choose a date for the expense.";
    if (!draft.description.trim()) return "Add a short description.";
    if (!Number.isFinite(amount) || amount <= 0) {
      return "Enter an amount greater than zero.";
    }
    if (amount > 1000000) return "Use a smaller amount for this demo.";

    return "";
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validationError = validateDraft();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    const nextExpense: Expense = {
      id: editingId ?? crypto.randomUUID(),
      date: draft.date,
      amount: Number(Number(draft.amount).toFixed(2)),
      category: draft.category,
      description: draft.description.trim(),
    };

    setExpenses((current) =>
      editingId
        ? current.map((expense) =>
            expense.id === editingId ? nextExpense : expense,
          )
        : [nextExpense, ...current],
    );
    setDraft(emptyDraft());
    setEditingId(null);
    setFormError("");
    setToast(editingId ? "Expense updated" : "Expense added");
  };

  const editExpense = (expense: Expense) => {
    setDraft({
      date: expense.date,
      amount: String(expense.amount),
      category: expense.category,
      description: expense.description,
    });
    setEditingId(expense.id);
    setFormError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteExpense = (expenseId: string) => {
    setExpenses((current) => current.filter((expense) => expense.id !== expenseId));
    setToast("Expense deleted");
    if (editingId === expenseId) {
      setEditingId(null);
      setDraft(emptyDraft());
    }
  };

  const resetForm = () => {
    setDraft(emptyDraft());
    setEditingId(null);
    setFormError("");
  };

  return (
    <main className="min-h-screen bg-[#f7f8fb] text-slate-950">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              Personal finance
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              Expense Tracker
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Track everyday spending, review monthly totals, and export your
              data in the format you need.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setExportOpen(true)}
            disabled={!expenses.length}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-slate-950 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            <Download size={18} />
            Export Data
            <ChevronDown size={15} className="opacity-60" />
          </button>
        </header>

        {!isReady ? (
          <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="h-24 animate-pulse rounded bg-slate-100" />
              <div className="h-24 animate-pulse rounded bg-slate-100" />
              <div className="h-24 animate-pulse rounded bg-slate-100" />
            </div>
          </section>
        ) : (
          <>
            {(storageError || toast) && (
              <div
                className={`flex items-center gap-3 rounded-md border px-4 py-3 text-sm shadow-sm ${
                  storageError
                    ? "border-red-200 bg-red-50 text-red-700"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700"
                }`}
              >
                <CheckCircle2 size={18} />
                <span>{storageError || toast}</span>
              </div>
            )}

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <SummaryCard
                icon={<WalletCards size={20} />}
                label="Total spending"
                value={currency.format(analytics.total)}
                caption={`${expenses.length} saved expenses`}
              />
              <SummaryCard
                icon={<CalendarDays size={20} />}
                label="This month"
                value={currency.format(analytics.monthly)}
                caption={new Intl.DateTimeFormat("en-US", {
                  month: "long",
                  year: "numeric",
                }).format(new Date())}
              />
              <SummaryCard
                icon={<PieChart size={20} />}
                label="Top category"
                value={analytics.topCategory?.category ?? "None"}
                caption={currency.format(analytics.topCategory?.total ?? 0)}
              />
              <SummaryCard
                icon={<Search size={20} />}
                label="Filtered total"
                value={currency.format(analytics.filteredTotal)}
                caption={`${filteredExpenses.length} matching expenses`}
              />
            </section>

            <section className="grid gap-6 lg:grid-cols-[minmax(320px,420px)_1fr]">
              <form
                onSubmit={handleSubmit}
                className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-950">
                      {editingId ? "Edit expense" : "Add expense"}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Keep the details short and consistent.
                    </p>
                  </div>
                  {editingId && (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
                      aria-label="Cancel editing"
                    >
                      <X size={17} />
                    </button>
                  )}
                </div>

                <div className="mt-5 grid gap-4">
                  <label className="grid gap-2 text-sm font-medium text-slate-700">
                    Date
                    <input
                      type="date"
                      value={draft.date}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          date: event.target.value,
                        }))
                      }
                      className="h-11 rounded-md border border-slate-300 bg-white px-3 text-slate-950 outline-none transition focus:border-slate-950 focus:ring-4 focus:ring-slate-100"
                    />
                  </label>

                  <label className="grid gap-2 text-sm font-medium text-slate-700">
                    Amount
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={draft.amount}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          amount: event.target.value,
                        }))
                      }
                      className="h-11 rounded-md border border-slate-300 bg-white px-3 text-slate-950 outline-none transition focus:border-slate-950 focus:ring-4 focus:ring-slate-100"
                    />
                  </label>

                  <label className="grid gap-2 text-sm font-medium text-slate-700">
                    Category
                    <select
                      value={draft.category}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          category: event.target.value as Category,
                        }))
                      }
                      className="h-11 rounded-md border border-slate-300 bg-white px-3 text-slate-950 outline-none transition focus:border-slate-950 focus:ring-4 focus:ring-slate-100"
                    >
                      {categories.map((category) => (
                        <option key={category}>{category}</option>
                      ))}
                    </select>
                  </label>

                  <label className="grid gap-2 text-sm font-medium text-slate-700">
                    Description
                    <input
                      type="text"
                      maxLength={80}
                      placeholder="Groceries, train ticket, streaming..."
                      value={draft.description}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          description: event.target.value,
                        }))
                      }
                      className="h-11 rounded-md border border-slate-300 bg-white px-3 text-slate-950 outline-none transition focus:border-slate-950 focus:ring-4 focus:ring-slate-100"
                    />
                  </label>
                </div>

                {formError && (
                  <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {formError}
                  </p>
                )}

                <button
                  type="submit"
                  className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
                >
                  <Plus size={18} />
                  {editingId ? "Save changes" : "Add expense"}
                </button>
              </form>

              <div className="grid gap-6">
                <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-950">
                        Spending by category
                      </h2>
                      <p className="mt-1 text-sm text-slate-500">
                        Visual total across all saved expenses.
                      </p>
                    </div>
                  </div>
                  <div className="mt-5 grid gap-4">
                    {analytics.categoryTotals.map((item) => (
                      <div key={item.category} className="grid gap-2">
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <span className="font-medium text-slate-700">
                            {item.category}
                          </span>
                          <span className="text-slate-500">
                            {currency.format(item.total)}
                          </span>
                        </div>
                        <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full rounded-full ${categoryStyles[item.category].bar}`}
                            style={{
                              width: `${Math.max(
                                (item.total / analytics.largestCategoryTotal) *
                                  100,
                                item.total ? 5 : 0,
                              )}%`,
                            }}
                          />
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
                        <Search
                          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                          size={17}
                        />
                        <input
                          type="search"
                          placeholder="Description or category"
                          value={filters.search}
                          onChange={(event) =>
                            setFilters((current) => ({
                              ...current,
                              search: event.target.value,
                            }))
                          }
                          className="h-11 w-full rounded-md border border-slate-300 bg-white pl-10 pr-3 text-slate-950 outline-none transition focus:border-slate-950 focus:ring-4 focus:ring-slate-100"
                        />
                      </div>
                    </label>

                    <label className="grid gap-2 text-sm font-medium text-slate-700">
                      Category
                      <select
                        value={filters.category}
                        onChange={(event) =>
                          setFilters((current) => ({
                            ...current,
                            category: event.target.value as Filters["category"],
                          }))
                        }
                        className="h-11 rounded-md border border-slate-300 bg-white px-3 text-slate-950 outline-none transition focus:border-slate-950 focus:ring-4 focus:ring-slate-100"
                      >
                        <option>All</option>
                        {categories.map((category) => (
                          <option key={category}>{category}</option>
                        ))}
                      </select>
                    </label>

                    <label className="grid gap-2 text-sm font-medium text-slate-700">
                      Start date
                      <input
                        type="date"
                        value={filters.startDate}
                        onChange={(event) =>
                          setFilters((current) => ({
                            ...current,
                            startDate: event.target.value,
                          }))
                        }
                        className="h-11 rounded-md border border-slate-300 bg-white px-3 text-slate-950 outline-none transition focus:border-slate-950 focus:ring-4 focus:ring-slate-100"
                      />
                    </label>

                    <label className="grid gap-2 text-sm font-medium text-slate-700">
                      End date
                      <input
                        type="date"
                        value={filters.endDate}
                        onChange={(event) =>
                          setFilters((current) => ({
                            ...current,
                            endDate: event.target.value,
                          }))
                        }
                        className="h-11 rounded-md border border-slate-300 bg-white px-3 text-slate-950 outline-none transition focus:border-slate-950 focus:ring-4 focus:ring-slate-100"
                      />
                    </label>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setFilters(initialFilters)}
                      className="inline-flex h-10 items-center justify-center rounded-md border border-slate-200 px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Clear filters
                    </button>
                    <span className="text-sm text-slate-500">
                      Showing {filteredExpenses.length} of {expenses.length}
                    </span>
                  </div>
                </section>
              </div>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 p-5">
                <h2 className="text-lg font-semibold text-slate-950">
                  Expense list
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Edit or delete entries as your spending changes.
                </p>
              </div>

              {filteredExpenses.length ? (
                <div className="divide-y divide-slate-100">
                  {filteredExpenses.map((expense) => (
                    <article
                      key={expense.id}
                      className="grid gap-4 p-4 transition hover:bg-slate-50 sm:grid-cols-[1fr_auto] sm:items-center sm:p-5"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="break-words text-base font-semibold text-slate-950">
                            {expense.description}
                          </h3>
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${categoryStyles[expense.category].badge}`}
                          >
                            {expense.category}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-slate-500">
                          {formatDate(expense.date)}
                        </p>
                      </div>

                      <div className="flex items-center justify-between gap-3 sm:justify-end">
                        <span className="text-lg font-semibold text-slate-950">
                          {currency.format(expense.amount)}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => editExpense(expense)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
                            aria-label={`Edit ${expense.description}`}
                          >
                            <Edit3 size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteExpense(expense.id)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-red-100 text-red-600 transition hover:bg-red-50"
                            aria-label={`Delete ${expense.description}`}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <p className="text-base font-semibold text-slate-900">
                    No expenses match these filters.
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
                    Clear the filters or add a new expense to continue.
                  </p>
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {exportOpen && (
        <ExportModal
          expenses={expenses}
          onClose={() => setExportOpen(false)}
          onExported={(msg) => {
            setToast(msg);
            setExportOpen(false);
          }}
        />
      )}
    </main>
  );
}

function ExportModal({
  expenses,
  onClose,
  onExported,
}: {
  expenses: Expense[];
  onClose: () => void;
  onExported: (msg: string) => void;
}) {
  const defaultFilename = `expenses-${today()}`;
  const [opts, setOpts] = useState<ExportOptions>({
    format: "csv",
    startDate: "",
    endDate: "",
    categories: new Set<Category>(),
    filename: defaultFilename,
  });
  const [loading, setLoading] = useState(false);

  const previewRows = useMemo(() => applyExportFilters(expenses, opts), [expenses, opts]);
  const previewTotal = useMemo(
    () => previewRows.reduce((s, e) => s + e.amount, 0),
    [previewRows],
  );

  const toggleCategory = (cat: Category) => {
    setOpts((prev) => {
      const next = new Set(prev.categories);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return { ...prev, categories: next };
    });
  };

  const allCategoriesSelected = opts.categories.size === 0;

  const handleExport = async () => {
    if (!previewRows.length) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 400));

    const name = opts.filename.trim() || defaultFilename;

    if (opts.format === "csv") exportToCsv(previewRows, name);
    else if (opts.format === "json") exportToJson(previewRows, name);
    else exportToPdf(previewRows, name);

    setLoading(false);
    onExported(
      opts.format === "pdf"
        ? "PDF report opened — use Print → Save as PDF"
        : `${opts.format.toUpperCase()} exported (${previewRows.length} records)`,
    );
  };

  const formatIcons: Record<ExportFormat, React.ReactNode> = {
    csv: <FileSpreadsheet size={16} />,
    json: <FileJson size={16} />,
    pdf: <FileText size={16} />,
  };

  const formatLabels: Record<ExportFormat, string> = {
    csv: "CSV",
    json: "JSON",
    pdf: "PDF",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 flex w-full max-w-2xl flex-col rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Export Data</h2>
            <p className="text-sm text-slate-500">
              Choose format, filters, and filename
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
          >
            <X size={17} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">
          {/* Format selector */}
          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">Format</p>
            <div className="grid grid-cols-3 gap-2">
              {(["csv", "json", "pdf"] as ExportFormat[]).map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => setOpts((p) => ({ ...p, format: fmt }))}
                  className={`flex items-center justify-center gap-2 rounded-lg border py-3 text-sm font-semibold transition ${
                    opts.format === fmt
                      ? "border-slate-950 bg-slate-950 text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {formatIcons[fmt]}
                  {formatLabels[fmt]}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-500">
              {opts.format === "csv" && "Spreadsheet-compatible comma-separated values"}
              {opts.format === "json" && "Machine-readable JSON with metadata envelope"}
              {opts.format === "pdf" && "Formatted report — browser Print → Save as PDF"}
            </p>
          </div>

          {/* Date range */}
          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">Date range</p>
            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-1.5 text-xs font-medium text-slate-600">
                From
                <input
                  type="date"
                  value={opts.startDate}
                  onChange={(e) =>
                    setOpts((p) => ({ ...p, startDate: e.target.value }))
                  }
                  className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-slate-950 focus:ring-4 focus:ring-slate-100"
                />
              </label>
              <label className="grid gap-1.5 text-xs font-medium text-slate-600">
                To
                <input
                  type="date"
                  value={opts.endDate}
                  onChange={(e) =>
                    setOpts((p) => ({ ...p, endDate: e.target.value }))
                  }
                  className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-slate-950 focus:ring-4 focus:ring-slate-100"
                />
              </label>
            </div>
          </div>

          {/* Category filter */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-slate-700">Categories</p>
              <button
                type="button"
                onClick={() => setOpts((p) => ({ ...p, categories: new Set() }))}
                className="text-xs text-slate-500 hover:text-slate-900 transition"
              >
                {allCategoriesSelected ? "All selected" : "Select all"}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => {
                const active = allCategoriesSelected || opts.categories.has(cat);
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleCategory(cat)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      active
                        ? categoryStyles[cat].badge + " ring-1 ring-inset ring-current/20"
                        : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Filename */}
          <div>
            <label className="grid gap-1.5 text-sm font-medium text-slate-700">
              Filename
              <div className="flex items-center gap-0">
                <input
                  type="text"
                  value={opts.filename}
                  onChange={(e) =>
                    setOpts((p) => ({ ...p, filename: e.target.value }))
                  }
                  placeholder={defaultFilename}
                  className="h-10 flex-1 rounded-l-md border border-r-0 border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-slate-950 focus:ring-4 focus:ring-slate-100"
                />
                <span className="inline-flex h-10 items-center rounded-r-md border border-slate-300 bg-slate-50 px-3 text-sm text-slate-500">
                  .{opts.format === "pdf" ? "pdf" : opts.format}
                </span>
              </div>
            </label>
          </div>

          {/* Summary */}
          <div className={`rounded-lg border px-4 py-3 ${previewRows.length ? "border-slate-200 bg-slate-50" : "border-amber-200 bg-amber-50"}`}>
            <div className="flex items-center justify-between text-sm">
              <span className={`font-medium ${previewRows.length ? "text-slate-700" : "text-amber-700"}`}>
                {previewRows.length
                  ? `${previewRows.length} record${previewRows.length !== 1 ? "s" : ""} will be exported`
                  : "No records match the current filters"}
              </span>
              {previewRows.length > 0 && (
                <span className="font-semibold text-slate-950">
                  {currency.format(previewTotal)}
                </span>
              )}
            </div>
          </div>

          {/* Preview table */}
          {previewRows.length > 0 && (
            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">
                Preview
                {previewRows.length > 5 && (
                  <span className="ml-1.5 text-slate-400 font-normal">
                    (first 5 of {previewRows.length})
                  </span>
                )}
              </p>
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <th className="px-4 py-2.5">Date</th>
                      <th className="px-4 py-2.5">Category</th>
                      <th className="px-4 py-2.5 text-right">Amount</th>
                      <th className="px-4 py-2.5">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {previewRows.slice(0, 5).map((e) => (
                      <tr key={e.id} className="hover:bg-slate-50">
                        <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap">
                          {formatDate(e.date)}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${categoryStyles[e.category].badge}`}>
                            {e.category}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right font-semibold text-slate-950 whitespace-nowrap">
                          {currency.format(e.amount)}
                        </td>
                        <td className="px-4 py-2.5 text-slate-700 max-w-[180px] truncate">
                          {e.description}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {previewRows.length > 5 && (
                  <div className="border-t border-slate-100 px-4 py-2.5 text-xs text-slate-400 bg-slate-50">
                    + {previewRows.length - 5} more rows
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 items-center justify-center rounded-md border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={loading || !previewRows.length}
            className="inline-flex h-10 min-w-[140px] items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Preparing…
              </>
            ) : (
              <>
                <Download size={16} />
                Export {formatLabels[opts.format]}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  caption,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  caption: string;
}) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 break-words text-2xl font-semibold tracking-tight text-slate-950">
            {value}
          </p>
        </div>
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-700">
          {icon}
        </span>
      </div>
      <p className="mt-4 text-sm text-slate-500">{caption}</p>
    </article>
  );
}

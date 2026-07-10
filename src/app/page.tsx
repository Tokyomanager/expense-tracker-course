"use client";

import {
  ArrowDownToLine,
  CalendarDays,
  CheckCircle2,
  Edit3,
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
  Entertainment: { badge: "bg-violet-50 text-violet-700", bar: "bg-violet-500" },
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

export default function Home() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [draft, setDraft] = useState<ExpenseDraft>(emptyDraft);
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState("");
  const [storageError, setStorageError] = useState("");
  const [toast, setToast] = useState("");
  const [isReady, setIsReady] = useState(false);

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

  const exportCsv = () => {
    const rows = [
      ["Date", "Category", "Amount", "Description"],
      ...expenses.map((expense) => [
        expense.date,
        expense.category,
        expense.amount.toFixed(2),
        expense.description,
      ]),
    ];
    const csv = rows
      .map((row) =>
        row
          .map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
          .join(","),
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "expenses.csv";
    link.click();
    URL.revokeObjectURL(url);
    setToast("CSV export ready");
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
              Track everyday spending, review monthly totals, and export a clean
              CSV from the same dashboard.
            </p>
          </div>
          <button
            type="button"
            onClick={exportCsv}
            disabled={!filteredExpenses.length}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            <ArrowDownToLine size={18} />
            Export CSV
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
    </main>
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

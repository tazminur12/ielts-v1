"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  Fragment,
} from "react";
import {
  Loader2,
  Search,
  Calendar,
  DollarSign,
  User,
  Package,
  Ban,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Download,
  Copy,
  ChevronDown,
  ChevronRight,
  CreditCard,
  Repeat,
  Mail,
} from "lucide-react";
import Swal from "sweetalert2";

interface Subscription {
  _id: string;
  userId: {
    _id: string;
    name: string;
    email: string;
  };
  planId: {
    _id: string;
    name: string;
    slug: string;
    price: {
      monthly: number;
      yearly: number;
    };
  };
  status: string;
  startDate: string;
  endDate: string;
  paymentMethod?: string;
  transactionId?: string;
  billingCycle?: string;
  autoRenew?: boolean;
  createdAt: string;
}

type SortKey = "createdAt" | "endDate" | "status" | "amount" | "user";
type SortDir = "asc" | "desc";

function getSubAmount(sub: Subscription): number {
  if (!sub.planId?.price) return 0;
  const yearly = sub.billingCycle === "yearly";
  return yearly
    ? Number(sub.planId.price.yearly) || 0
    : Number(sub.planId.price.monthly) || 0;
}

function formatRelativeEnd(iso: string): string {
  const end = new Date(iso).getTime();
  const now = Date.now();
  const diff = end - now;
  const day = 86400000;
  if (Math.abs(diff) < day) {
    const h = Math.round(diff / 3600000);
    if (Math.abs(h) < 1) return diff >= 0 ? "Soon" : "Just ended";
    return diff >= 0 ? `in ${h}h` : `${Math.abs(h)}h ago`;
  }
  const d = Math.round(diff / day);
  if (d === 0) return "Ends today";
  if (d > 0) return `in ${d}d`;
  return `${Math.abs(d)}d ago`;
}

function paymentLabel(method?: string): string {
  if (!method) return "—";
  const map: Record<string, string> = {
    card: "Card",
    bkash: "bKash",
    nagad: "Nagad",
    rocket: "Rocket",
    bank_transfer: "Bank",
  };
  return map[method] || method;
}

function escapeCsvCell(v: string): string {
  if (/[",\n\r]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

export default function OrdersPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterBilling, setFilterBilling] = useState<"all" | "monthly" | "yearly">(
    "all"
  );
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchSubscriptions = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const response = await fetch("/api/admin/subscriptions");
      const data = await response.json();
      if (data.success) {
        setSubscriptions(data.data);
      }
    } catch (error) {
      console.error("Error fetching subscriptions:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscriptions(false);
  }, [fetchSubscriptions]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, filterStatus, filterBilling, sortKey, sortDir, pageSize]);

  const handleCancelSubscription = async (subscriptionId: string) => {
    const result = await Swal.fire({
      title: "Cancel Subscription?",
      text: "Are you sure you want to cancel this subscription?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, cancel it",
      cancelButtonText: "No, keep it",
    });

    if (result.isConfirmed) {
      try {
        const response = await fetch(
          `/api/admin/subscriptions/${subscriptionId}`,
          {
            method: "DELETE",
          }
        );

        const data = await response.json();

        if (data.success) {
          Swal.fire({
            icon: "success",
            title: "Cancelled!",
            text: "Subscription has been cancelled.",
            timer: 2000,
          });
          fetchSubscriptions(true);
        } else {
          throw new Error(data.error);
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error";
        Swal.fire({
          icon: "error",
          title: "Error",
          text: message || "Failed to cancel subscription",
        });
      }
    }
  };

  const copyText = async (label: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      void Swal.fire({
        icon: "success",
        title: "Copied",
        text: `${label} copied to clipboard.`,
        timer: 1500,
        showConfirmButton: false,
      });
    } catch {
      Swal.fire({ icon: "error", title: "Copy failed" });
    }
  };

  const exportCsv = () => {
    if (filteredSorted.length === 0) {
      void Swal.fire({
        icon: "info",
        title: "Nothing to export",
        text: "No rows match the current filters.",
      });
      return;
    }
    const rows = filteredSorted.map((sub) => ({
      user: sub.userId?.name ?? "",
      email: sub.userId?.email ?? "",
      plan: sub.planId?.name ?? "",
      status: sub.status,
      billing: sub.billingCycle ?? "",
      amount: String(getSubAmount(sub)),
      payment: sub.paymentMethod ?? "",
      start: sub.startDate ? new Date(sub.startDate).toISOString() : "",
      end: sub.endDate ? new Date(sub.endDate).toISOString() : "",
      transactionId: sub.transactionId ?? "",
      autoRenew: String(sub.autoRenew ?? ""),
      createdAt: sub.createdAt ? new Date(sub.createdAt).toISOString() : "",
    }));
    const header = Object.keys(rows[0] ?? {}).join(",");
    const body = rows
      .map((r) =>
        Object.values(r)
          .map((c) => escapeCsvCell(String(c)))
          .join(",")
      )
      .join("\r\n");
    const csv = rows.length ? `${header}\r\n${body}` : header;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `subscriptions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />;
      case "trial":
        return <Clock className="w-5 h-5 text-blue-500 shrink-0" />;
      case "cancelled":
        return <XCircle className="w-5 h-5 text-red-500 shrink-0" />;
      case "expired":
        return <Ban className="w-5 h-5 text-gray-500 shrink-0" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500 shrink-0" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-600/15",
      trial: "bg-sky-50 text-sky-800 ring-1 ring-sky-600/15",
      cancelled: "bg-rose-50 text-rose-800 ring-1 ring-rose-600/15",
      expired: "bg-slate-100 text-slate-700 ring-1 ring-slate-400/20",
    };

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold ${
          styles[status] || styles.expired
        }`}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const filteredSorted = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = subscriptions.filter((sub) => {
      const name = sub.userId?.name?.toLowerCase() ?? "";
      const email = sub.userId?.email?.toLowerCase() ?? "";
      const plan = sub.planId?.name?.toLowerCase() ?? "";
      const txn = (sub.transactionId ?? "").toLowerCase();
      const matchesSearch =
        !q ||
        name.includes(q) ||
        email.includes(q) ||
        plan.includes(q) ||
        txn.includes(q);

      const matchesFilter =
        filterStatus === "all" || sub.status === filterStatus;

      const bc = sub.billingCycle ?? "";
      const matchesBilling =
        filterBilling === "all" ||
        (filterBilling === "monthly" &&
          (bc === "monthly" || bc === "")) ||
        (filterBilling === "yearly" && bc === "yearly");

      return matchesSearch && matchesFilter && matchesBilling;
    });

    list = [...list].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "createdAt":
          cmp =
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case "endDate":
          cmp = new Date(a.endDate).getTime() - new Date(b.endDate).getTime();
          break;
        case "status":
          cmp = a.status.localeCompare(b.status);
          break;
        case "amount":
          cmp = getSubAmount(a) - getSubAmount(b);
          break;
        case "user":
          cmp = (a.userId?.name || "").localeCompare(b.userId?.name || "");
          break;
        default:
          cmp = 0;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return list;
  }, [
    subscriptions,
    searchQuery,
    filterStatus,
    filterBilling,
    sortKey,
    sortDir,
  ]);

  const pageCount = Math.max(1, Math.ceil(filteredSorted.length / pageSize));
  const pageSafe = Math.min(page, pageCount);

  useEffect(() => {
    setPage((p) => Math.min(p, pageCount));
  }, [pageCount]);

  const pagedRows = useMemo(() => {
    const start = (pageSafe - 1) * pageSize;
    return filteredSorted.slice(start, start + pageSize);
  }, [filteredSorted, pageSafe, pageSize]);

  const stats = useMemo(() => {
    const total = subscriptions.length;
    const active = subscriptions.filter((s) => s.status === "active").length;
    const trial = subscriptions.filter((s) => s.status === "trial").length;
    const cancelled = subscriptions.filter((s) => s.status === "cancelled").length;
    const expired = subscriptions.filter((s) => s.status === "expired").length;
    const totalRevenue = subscriptions.reduce((sum, sub) => {
      if (sub.status === "active" || sub.status === "trial") {
        return sum + getSubAmount(sub);
      }
      return sum;
    }, 0);
    const mrr = subscriptions
      .filter((s) => s.status === "active" && s.billingCycle === "monthly")
      .reduce((sum, sub) => sum + (sub.planId?.price?.monthly || 0), 0);
    return {
      total,
      active,
      trial,
      cancelled,
      expired,
      totalRevenue,
      mrr,
    };
  }, [subscriptions]);

  const toggleSortDir = () =>
    setSortDir((d) => (d === "asc" ? "desc" : "asc"));

  if (loading) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[40vh] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-sm text-slate-500">Loading subscriptions…</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6 w-full max-w-[1600px] mx-auto overflow-x-hidden box-border">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
            Subscriptions & Orders
          </h1>
          <p className="text-sm md:text-base text-slate-600 mt-1">
            Manage subscriptions, revenue view, and quick exports
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => fetchSubscriptions(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw
              className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 md:gap-4">
        <div className="col-span-2 lg:col-span-2 bg-linear-to-br from-emerald-500 to-emerald-700 rounded-xl p-4 md:p-5 shadow-md text-white">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-emerald-100 text-xs font-medium uppercase tracking-wide">
                Est. recurring (active)
              </p>
              <p className="text-2xl md:text-3xl font-bold tabular-nums mt-1">
                ${stats.totalRevenue.toFixed(2)}
              </p>
              <p className="text-emerald-100/90 text-xs mt-1">
                Active + trial at plan price
              </p>
            </div>
            <div className="w-11 h-11 bg-white/15 rounded-lg flex items-center justify-center shrink-0">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200/80">
          <p className="text-xs text-slate-500 font-medium">Total</p>
          <p className="text-xl font-bold text-slate-900 tabular-nums mt-0.5">
            {stats.total}
          </p>
          <Package className="w-4 h-4 text-slate-300 mt-2" />
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200/80">
          <p className="text-xs text-slate-500 font-medium">Active</p>
          <p className="text-xl font-bold text-emerald-600 tabular-nums mt-0.5">
            {stats.active}
          </p>
          <CheckCircle className="w-4 h-4 text-emerald-200 mt-2" />
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200/80">
          <p className="text-xs text-slate-500 font-medium">Trial</p>
          <p className="text-xl font-bold text-sky-600 tabular-nums mt-0.5">
            {stats.trial}
          </p>
          <Clock className="w-4 h-4 text-sky-200 mt-2" />
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200/80">
          <p className="text-xs text-slate-500 font-medium">Expired</p>
          <p className="text-xl font-bold text-slate-600 tabular-nums mt-0.5">
            {stats.expired}
          </p>
          <Ban className="w-4 h-4 text-slate-200 mt-2" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200/80">
          <p className="text-xs text-slate-500 font-medium">Cancelled</p>
          <p className="text-xl font-bold text-rose-600 tabular-nums mt-0.5">
            {stats.cancelled}
          </p>
        </div>
        <div className="bg-linear-to-br from-sky-500 to-indigo-600 rounded-xl p-4 md:p-5 shadow-md text-white col-span-1 sm:col-span-2 lg:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sky-100 text-xs font-medium uppercase tracking-wide">
                MRR (monthly plans)
              </p>
              <p className="text-2xl font-bold tabular-nums mt-1">
                ${stats.mrr.toFixed(2)}
              </p>
              <p className="text-sky-100/90 text-xs mt-1">
                Sum of active subscriptions on monthly billing
              </p>
            </div>
            <Repeat className="w-10 h-10 text-white/30 shrink-0" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 md:p-5 shadow-sm border border-slate-200/80 space-y-3">
        <div className="flex flex-col xl:flex-row gap-3 xl:items-end">
          <div className="flex-1 relative min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="search"
              placeholder="Search name, email, plan, transaction ID…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              aria-label="Filter by subscription status"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white min-w-[130px]"
            >
              <option value="all">All status</option>
              <option value="active">Active</option>
              <option value="trial">Trial</option>
              <option value="cancelled">Cancelled</option>
              <option value="expired">Expired</option>
            </select>
            <select
              aria-label="Filter by billing cycle"
              value={filterBilling}
              onChange={(e) =>
                setFilterBilling(e.target.value as "all" | "monthly" | "yearly")
              }
              className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white min-w-[140px]"
            >
              <option value="all">All billing</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
            <select
              aria-label="Sort subscriptions by"
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white min-w-[150px]"
            >
              <option value="createdAt">Sort: Created</option>
              <option value="endDate">Sort: End date</option>
              <option value="status">Sort: Status</option>
              <option value="amount">Sort: Amount</option>
              <option value="user">Sort: User</option>
            </select>
            <button
              type="button"
              onClick={toggleSortDir}
              className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white font-medium text-slate-700 hover:bg-slate-50"
            >
              {sortDir === "asc" ? "Asc ↑" : "Desc ↓"}
            </button>
            <select
              aria-label="Rows per page"
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white"
            >
              <option value={10}>10 / page</option>
              <option value={25}>25 / page</option>
              <option value={50}>50 / page</option>
              <option value={100}>100 / page</option>
            </select>
          </div>
        </div>
        <p className="text-xs text-slate-500">
          Showing{" "}
          <span className="font-semibold text-slate-700 tabular-nums">
            {filteredSorted.length === 0
              ? 0
              : (pageSafe - 1) * pageSize + 1}
            –
            {Math.min(pageSafe * pageSize, filteredSorted.length)}
          </span>{" "}
          of{" "}
          <span className="font-semibold text-slate-700 tabular-nums">
            {filteredSorted.length}
          </span>{" "}
          (filtered)
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full min-w-[960px]">
            <thead className="bg-slate-50/90 border-b border-slate-200 sticky top-0 z-10 backdrop-blur-sm">
              <tr>
                <th className="w-10 px-3 py-3" aria-hidden />
                <th className="px-3 md:px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  User
                </th>
                <th className="px-3 md:px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Plan
                </th>
                <th className="px-3 md:px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-3 md:px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Billing
                </th>
                <th className="px-3 md:px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Payment
                </th>
                <th className="px-3 md:px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-3 md:px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  End
                </th>
                <th className="px-3 md:px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pagedRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-14 text-center">
                    <Package className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                    <p className="text-slate-600 font-medium">
                      No subscriptions match
                    </p>
                    <p className="text-sm text-slate-400 mt-1">
                      Change search or filters, or refresh data
                    </p>
                  </td>
                </tr>
              ) : (
                pagedRows.map((sub) => {
                  const open = expandedId === sub._id;
                  const amount = getSubAmount(sub);
                  const txn = sub.transactionId ?? "";
                  return (
                    <Fragment key={sub._id}>
                      <tr className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-2 py-3 align-middle">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedId(open ? null : sub._id)
                            }
                            className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                            aria-label={open ? "Collapse row details" : "Expand row details"}
                          >
                            {open ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </button>
                        </td>
                        <td className="px-3 md:px-4 py-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                              <User className="w-4 h-4 text-blue-600" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-slate-900 text-sm truncate">
                                {sub.userId?.name ?? "—"}
                              </p>
                              <p className="text-xs text-slate-500 truncate">
                                {sub.userId?.email ?? ""}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 md:px-4 py-3">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Package className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="font-medium text-slate-800 text-sm truncate">
                              {sub.planId?.name ?? "—"}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 md:px-4 py-3 whitespace-nowrap">
                          <span className="text-sm font-semibold text-slate-900 tabular-nums">
                            ${amount.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-3 md:px-4 py-3 whitespace-nowrap">
                          <span
                            className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-md ${
                              sub.billingCycle === "yearly"
                                ? "bg-violet-50 text-violet-800"
                                : "bg-amber-50 text-amber-800"
                            }`}
                          >
                            {sub.billingCycle === "yearly"
                              ? "Yearly"
                              : sub.billingCycle === "monthly"
                                ? "Monthly"
                                : "—"}
                          </span>
                        </td>
                        <td className="px-3 md:px-4 py-3 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 text-xs text-slate-600">
                            <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                            {paymentLabel(sub.paymentMethod)}
                          </span>
                        </td>
                        <td className="px-3 md:px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(sub.status)}
                            {getStatusBadge(sub.status)}
                          </div>
                        </td>
                        <td className="px-3 md:px-4 py-3">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs text-slate-600 flex items-center gap-1">
                              <Calendar className="w-3 h-3 shrink-0" />
                              {new Date(sub.endDate).toLocaleDateString()}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {formatRelativeEnd(sub.endDate)}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 md:px-4 py-3 text-right">
                          <div className="flex flex-wrap items-center justify-end gap-1">
                            {sub.userId?.email ? (
                              <button
                                type="button"
                                onClick={() =>
                                  copyText(
                                    "Email",
                                    sub.userId.email
                                  )
                                }
                                className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                                title="Copy email"
                              >
                                <Mail className="w-4 h-4" />
                              </button>
                            ) : null}
                            {txn ? (
                              <button
                                type="button"
                                onClick={() =>
                                  copyText("Transaction ID", txn)
                                }
                                className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                                title="Copy transaction ID"
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                            ) : null}
                            {sub.status === "active" ||
                            sub.status === "trial" ? (
                              <button
                                type="button"
                                onClick={() =>
                                  handleCancelSubscription(sub._id)
                                }
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 text-rose-700 rounded-lg hover:bg-rose-100 text-xs font-medium"
                              >
                                <Ban className="w-3.5 h-3.5" />
                                Cancel
                              </button>
                            ) : (
                              <span className="text-xs text-slate-300">—</span>
                            )}
                          </div>
                        </td>
                      </tr>
                      {open ? (
                        <tr className="bg-slate-50/60">
                          <td colSpan={9} className="px-4 py-3 text-sm">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pl-8">
                              <div>
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                  Transaction ID
                                </p>
                                <p className="font-mono text-xs text-slate-800 break-all mt-1">
                                  {txn || "—"}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                  Start → Created
                                </p>
                                <p className="text-xs text-slate-700 mt-1">
                                  {new Date(
                                    sub.startDate
                                  ).toLocaleString()}{" "}
                                  ·{" "}
                                  {new Date(
                                    sub.createdAt
                                  ).toLocaleString()}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                  Auto-renew
                                </p>
                                <p className="text-xs text-slate-700 mt-1">
                                  {sub.autoRenew === false
                                    ? "Off"
                                    : sub.autoRenew === true
                                      ? "On"
                                      : "—"}
                                </p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {filteredSorted.length > 0 ? (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 bg-slate-50/50">
            <p className="text-xs text-slate-500">
              Page{" "}
              <span className="font-semibold text-slate-700">{pageSafe}</span>{" "}
              of {pageCount}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={pageSafe <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-white disabled:opacity-40 hover:bg-slate-50"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={pageSafe >= pageCount}
                onClick={() =>
                  setPage((p) => Math.min(pageCount, p + 1))
                }
                className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-white disabled:opacity-40 hover:bg-slate-50"
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

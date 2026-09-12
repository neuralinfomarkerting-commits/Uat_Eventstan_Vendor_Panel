"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BadgePercent,
  CheckCircle2,
  Edit3,
  Eye,
  Loader2,
  Megaphone,
  Package as PackageIcon,
  Search,
  Sparkles,
  X,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Layers,
  Filter,
  CalendarDays,
} from "lucide-react";
import { vendorApi } from "@/api/vendorApi";
import { showError, showSuccess } from "@/lib/toast";
import Pagination from "@/components/vendor/Pagination";

interface PackageService {
  id: string;
  title: string;
}

interface ApiPackage {
  id: string;
  title: string;
  description?: string;
  amount?: number;
  currency?: string;
  price?: number;
  money?: { amount: number; currency: string };
  status: string;
  items?: Array<{ serviceId: string; service?: PackageService }>;
  serviceId?: string;
  itemIds?: string[];
  isPromotional?: boolean;
  is_promotional?: boolean;
  promotionDiscountType?: "FLAT" | "PERCENTAGE" | null;
  promotion_discount_type?: "FLAT" | "PERCENTAGE" | null;
  promotionDiscountValue?: number | null;
  promotion_discount_value?: number | null;
  promotionStartDate?: string | null;
  promotion_start_date?: string | null;
  promotionEndDate?: string | null;
  promotion_end_date?: string | null;
  maxGuests?: number | null;
  max_guests?: number | null;
  durationHours?: number | null;
  duration_hours?: number | null;
  slug?: string;
  originalPrice?: number | null;
  original_price?: number | null;
  exactPrice?: number | null;
  exact_price?: number | null;
}

type SortKey = "title" | "price" | "discount" | "status";
type SortDir = "asc" | "desc";
type FilterType = "all" | "promotional" | "standard";

const ITEMS_PER_PAGE = 10;

function packageAmount(pkg: ApiPackage) {
  return pkg.money?.amount ?? pkg.amount ?? pkg.price ?? 0;
}

// The true, undiscounted catalogue price. This is what a promotion discount
// should always be calculated against — never against packageAmount(), which
// may already reflect a previously-applied promotional price.
function packageBasePrice(pkg: ApiPackage) {
  return (
    pkg.originalPrice ??
    pkg.original_price ??
    pkg.exactPrice ??
    pkg.exact_price ??
    packageAmount(pkg)
  );
}

function packageCurrency(pkg: ApiPackage) {
  return pkg.money?.currency ?? pkg.currency ?? "AED";
}

function packageMaxGuests(pkg: ApiPackage) {
  return pkg.maxGuests ?? pkg.max_guests ?? null;
}

function packageDurationHours(pkg: ApiPackage) {
  return pkg.durationHours ?? pkg.duration_hours ?? null;
}

function packageServiceName(pkg: ApiPackage) {
  return (
    pkg.items?.[0]?.service?.title ||
    pkg.serviceId ||
    pkg.itemIds?.[0] ||
    "Service not linked"
  );
}

function promotionalMeta(pkg: ApiPackage) {
  const isPromotional = Boolean(pkg.isPromotional || pkg.is_promotional);
  const discountType =
    pkg.promotionDiscountType || pkg.promotion_discount_type || null;
  const discountValue =
    pkg.promotionDiscountValue ?? pkg.promotion_discount_value ?? 0;
  const startDate = pkg.promotionStartDate || pkg.promotion_start_date || null;
  const endDate = pkg.promotionEndDate || pkg.promotion_end_date || null;
  const baseAmount = packageBasePrice(pkg);

  if (!isPromotional || !discountType || !discountValue) {
    return {
      isPromotional: false,
      discountType,
      discountValue,
      startDate,
      endDate,
      baseAmount,
      finalAmount: baseAmount,
      hasDiscount: false,
    };
  }

  const finalAmount =
    discountType === "FLAT"
      ? Math.max(0, baseAmount - discountValue)
      : Math.max(
          0,
          baseAmount - Math.round((baseAmount * discountValue) / 100),
        );

  return {
    isPromotional: true,
    discountType,
    discountValue,
    startDate,
    endDate,
    baseAmount,
    finalAmount,
    hasDiscount: finalAmount < baseAmount,
  };
}

function SortIcon({
  col,
  sortKey,
  sortDir,
}: {
  col: SortKey;
  sortKey: SortKey;
  sortDir: SortDir;
}) {
  if (col !== sortKey)
    return <ChevronsUpDown size={13} className="text-gray-300 ml-1 inline" />;
  return sortDir === "asc" ? (
    <ChevronUp size={13} className="text-orange-500 ml-1 inline" />
  ) : (
    <ChevronDown size={13} className="text-orange-500 ml-1 inline" />
  );
}

function toDateInputValue(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function PromotionModal({
  pkg,
  open,
  onClose,
  onSaved,
}: {
  pkg: ApiPackage | null;
  open: boolean;
  onClose: () => void;
  onSaved: (pkg: ApiPackage) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, _setError] = useState("");
  // Wrapping the raw setter means every existing setError(...) call in this
  // modal also pops an error toast that holds until the user closes it.
  const setError = (msg: string) => {
    _setError(msg);
    if (msg) showError(msg);
  };
  const [enabled, setEnabled] = useState(false);
  const [discountType, setDiscountType] = useState<"FLAT" | "PERCENTAGE">(
    "PERCENTAGE",
  );
  const [discountValue, setDiscountValue] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [maxGuests, setMaxGuests] = useState("");
  const [durationHours, setDurationHours] = useState("");

  useEffect(() => {
    if (!pkg) return;
    setEnabled(Boolean(pkg.isPromotional || pkg.is_promotional));
    setDiscountType(
      (pkg.promotionDiscountType ||
        pkg.promotion_discount_type ||
        "PERCENTAGE") as "FLAT" | "PERCENTAGE",
    );
    setDiscountValue(
      String(pkg.promotionDiscountValue ?? pkg.promotion_discount_value ?? ""),
    );
    setStartDate(
      toDateInputValue(pkg.promotionStartDate ?? pkg.promotion_start_date),
    );
    setEndDate(
      toDateInputValue(pkg.promotionEndDate ?? pkg.promotion_end_date),
    );
    setMaxGuests(String(packageMaxGuests(pkg) ?? ""));
    setDurationHours(String(packageDurationHours(pkg) ?? ""));
    setError("");
    setSaving(false);
  }, [pkg]);

  if (!open || !pkg) return null;

  // Always discount off the true base/original price, never off an
  // already-discounted cached amount.
  const baseAmount = packageBasePrice(pkg);
  const previewAmount =
    enabled && discountValue
      ? discountType === "FLAT"
        ? Math.max(0, baseAmount - Number(discountValue))
        : Math.max(
            0,
            baseAmount - Math.round((baseAmount * Number(discountValue)) / 100),
          )
      : baseAmount;

  const handleSave = async () => {
    if (enabled && (!discountValue || Number(discountValue) <= 0)) {
      setError("Enter a valid discount value.");
      return;
    }

    if (
      enabled &&
      startDate &&
      endDate &&
      new Date(endDate) < new Date(startDate)
    ) {
      setError("End date cannot be before start date.");
      return;
    }

    if (maxGuests && Number(maxGuests) <= 0) {
      setError("Max guests must be greater than 0.");
      return;
    }

    if (durationHours && Number(durationHours) <= 0) {
      setError("Duration must be greater than 0.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const updated = await vendorApi.packages.update<ApiPackage>(pkg.id, {
        isPromotional: enabled,
        promotionDiscountType: enabled ? discountType : undefined,
        promotionDiscountValue: enabled ? Number(discountValue) : undefined,
        promotionStartDate: enabled && startDate ? startDate : undefined,
        promotionEndDate: enabled && endDate ? endDate : undefined,
        maxGuests: maxGuests ? Number(maxGuests) : undefined,
        durationHours: durationHours ? Number(durationHours) : undefined,
      });
      onSaved(updated);
      onClose();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Failed to save promotional settings.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <button
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close"
      />
      <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
        >
          <X size={18} />
        </button>

        <div className="mb-5 flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-500">
            <Megaphone size={22} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              Promotional Package
            </h2>
            <p className="text-sm text-gray-500">{pkg.title}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-orange-100 bg-orange-50/70 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  Enable promotion
                </p>
                <p className="text-xs text-gray-500">
                  Show this package on the customer promotions page with
                  discounted pricing.
                </p>
              </div>
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-400"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-600">
                Max guests
              </label>
              <input
                type="number"
                min="0"
                value={maxGuests}
                onChange={(e) => setMaxGuests(e.target.value)}
                placeholder="e.g. 10"
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-600">
                Duration (hrs)
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={durationHours}
                onChange={(e) => setDurationHours(e.target.value)}
                placeholder="e.g. 2"
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              />
            </div>
          </div>

          {enabled && (
            <>
              <div className="grid gap-4 sm:grid-cols-[160px_minmax(0,1fr)]">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-600">
                    Discount type
                  </label>
                  <select
                    value={discountType}
                    onChange={(e) =>
                      setDiscountType(e.target.value as "FLAT" | "PERCENTAGE")
                    }
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  >
                    <option value="PERCENTAGE">Percentage</option>
                    <option value="FLAT">Flat</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-600">
                    {discountType === "FLAT"
                      ? "Flat discount"
                      : "Discount percentage"}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    placeholder={discountType === "FLAT" ? "150" : "20"}
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-600">
                    <CalendarDays size={13} /> Start date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  />
                </div>
                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-600">
                    <CalendarDays size={13} /> End date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    min={startDate || undefined}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-400 -mt-2">
                Leave dates empty for a promotion with no fixed schedule.
              </p>
            </>
          )}

          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Price preview
            </p>
            <div className="mt-2 flex flex-wrap items-end gap-3">
              <div>
                <p className="text-xs text-gray-500">Base price</p>
                <p className="text-lg font-semibold text-gray-700">
                  {baseAmount.toLocaleString()} {packageCurrency(pkg)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Promotion price</p>
                <p className="text-2xl font-bold text-orange-500">
                  {previewAmount.toLocaleString()} {packageCurrency(pkg)}
                </p>
              </div>
            </div>
            {enabled && (startDate || endDate) && (
              <p className="mt-3 text-xs text-gray-500">
                Active {startDate ? `from ${startDate}` : ""}{" "}
                {endDate ? `to ${endDate}` : ""}
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-2xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 rounded-2xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:opacity-60"
          >
            <span className="flex items-center justify-center gap-2">
              {saving ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <CheckCircle2 size={16} />
              )}
              {saving ? "Saving..." : "Save Promotion"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PromotionalPackagesPage() {
  const [packages, setPackages] = useState<ApiPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ApiPackage | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("title");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [filterType, setFilterType] = useState<FilterType>("promotional"); // Changed from "all" to "promotional"

  const fetchPackages = async () => {
    try {
      setLoading(true);
      setPackages(await vendorApi.packages.list<ApiPackage[]>());
    } catch (cause) {
      showError(
        cause instanceof Error ? cause.message : "Failed to load packages.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchPackages();
  }, []);

  // Reset to page 1 when search, sort, or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, sortKey, sortDir, filterType]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return packages
      .filter((pkg) => {
        // Search filter
        if (
          q &&
          !(
            pkg.title.toLowerCase().includes(q) ||
            (pkg.description || "").toLowerCase().includes(q) ||
            packageServiceName(pkg).toLowerCase().includes(q)
          )
        ) {
          return false;
        }

        // Type filter
        const isPromo = promotionalMeta(pkg).isPromotional;
        if (filterType === "promotional" && !isPromo) return false;
        if (filterType === "standard" && isPromo) return false;

        return true;
      })
      .sort((a, b) => {
        let cmp = 0;
        const promoA = promotionalMeta(a);
        const promoB = promotionalMeta(b);
        if (sortKey === "title") cmp = a.title.localeCompare(b.title);
        if (sortKey === "price") cmp = packageAmount(a) - packageAmount(b);
        if (sortKey === "discount")
          cmp = (promoA.discountValue || 0) - (promoB.discountValue || 0);
        if (sortKey === "status") cmp = a.status.localeCompare(b.status);
        return sortDir === "asc" ? cmp : -cmp;
      });
  }, [packages, search, sortKey, sortDir, filterType]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const promotionalCount = packages.filter(
    (pkg) => promotionalMeta(pkg).isPromotional,
  ).length;
  const standardCount = packages.length - promotionalCount;

  const th = (key: SortKey, label: string) => (
    <th
      onClick={() => toggleSort(key)}
      className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase cursor-pointer select-none hover:text-orange-600 whitespace-nowrap"
    >
      {label}
      <SortIcon col={key} sortKey={sortKey} sortDir={sortDir} />
    </th>
  );

  // Filter click handlers
  const handleFilterClick = (type: FilterType) => {
    setFilterType(type);
  };
  function formatDateForDisplay(dateString?: string | null) {
    if (!dateString) return "—";
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return "—";

    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();

    return `${day}-${month}-${year}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Promotional Packages
          </h1>
          <p className="text-sm text-gray-500">
            Pick any sellable package and turn it into a flat or
            percentage-based promotion.
          </p>
        </div>
        <Link
          href="/vendor/packages"
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:border-orange-300 hover:text-orange-500"
        >
          <PackageIcon size={16} /> Open All Packages
        </Link>
      </div>

      {/* Stats Cards with Click Filters */}
      <div className="grid gap-4 sm:grid-cols-3">
        <button
          onClick={() => handleFilterClick("all")}
          className={`rounded-3xl border p-5 shadow-sm transition-all text-left w-full ${
            filterType === "all"
              ? "border-orange-400 bg-orange-50 ring-2 ring-orange-200"
              : "border-gray-100 bg-white hover:border-orange-200 hover:bg-orange-50/30"
          }`}
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Total packages
          </p>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {packages.length}
          </p>
        </button>
        <button
          onClick={() => handleFilterClick("promotional")}
          className={`rounded-3xl border p-5 shadow-sm transition-all text-left w-full ${
            filterType === "promotional"
              ? "border-orange-400 bg-orange-50 ring-2 ring-orange-200"
              : "border-orange-100 bg-orange-50/70 hover:border-orange-300 hover:bg-orange-50"
          }`}
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-orange-500">
            Live promotions
          </p>
          <p className="mt-2 text-3xl font-bold text-orange-600">
            {promotionalCount}
          </p>
        </button>
        <button
          onClick={() => handleFilterClick("standard")}
          className={`rounded-3xl border p-5 shadow-sm transition-all text-left w-full ${
            filterType === "standard"
              ? "border-orange-400 bg-orange-50 ring-2 ring-orange-200"
              : "border-gray-100 bg-white hover:border-orange-200 hover:bg-orange-50/30"
          }`}
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Normal packages
          </p>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {standardCount}
          </p>
        </button>
      </div>

      <div className="relative">
        <Search
          size={16}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search package or linked service..."
          className="w-full rounded-2xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm text-gray-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
        />
      </div>

      {loading ? (
        <div className="flex min-h-[320px] items-center justify-center rounded-3xl border border-gray-100 bg-white">
          <div className="text-center">
            <Loader2
              size={40}
              className="mx-auto mb-4 animate-spin text-orange-500"
            />
            <p className="text-gray-500">Loading packages...</p>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gray-200 bg-white py-16 text-center">
          <Layers size={42} className="mx-auto mb-4 text-gray-300" />
          <p className="font-medium text-gray-500">
            No packages match this search.
          </p>
          <p className="text-sm text-gray-400 mt-1">
            {search
              ? "Try clearing search."
              : "Create a package to make it promotional."}
          </p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px]">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">
                      Sr No.
                    </th>
                    {th("title", "Package")}
                    {th("price", "Price")}
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">
                      Guests / Duration
                    </th>
                    {th("discount", "Discount")}
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">
                      Schedule
                    </th>
                    {th("status", "Status")}
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {paginated.map((pkg, index) => {
                    const promo = promotionalMeta(pkg);
                    const serialNumber =
                      (currentPage - 1) * ITEMS_PER_PAGE + index + 1;
                    return (
                      <tr
                        key={pkg.id}
                        className="hover:bg-orange-50/30 transition-colors"
                      >
                        <td className="px-4 py-4">
                          <span className="text-sm font-medium text-gray-400">
                            {serialNumber}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-gray-900">
                                {pkg.title}
                              </p>
                              {promo.isPromotional ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-600">
                                  <BadgePercent size={11} /> Promo
                                </span>
                              ) : (
                                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-500">
                                  Standard
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {packageServiceName(pkg)}
                            </p>
                            {pkg.description && (
                              <p className="text-xs text-gray-400 mt-1 line-clamp-1">
                                {pkg.description}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div>
                            {promo.isPromotional ? (
                              <>
                                <p className="text-sm font-bold text-orange-600">
                                  {promo.finalAmount.toLocaleString()}{" "}
                                  {packageCurrency(pkg)}
                                </p>
                                <p className="text-xs text-gray-400 line-through">
                                  {promo.baseAmount.toLocaleString()}{" "}
                                  {packageCurrency(pkg)}
                                </p>
                              </>
                            ) : (
                              <p className="text-sm font-semibold text-gray-900">
                                {packageBasePrice(pkg).toLocaleString()}{" "}
                                {packageCurrency(pkg)}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-xs text-gray-600 space-y-0.5">
                            <p>
                              {packageMaxGuests(pkg) != null
                                ? `${packageMaxGuests(pkg)} guests`
                                : "—"}
                            </p>
                            <p className="text-gray-400">
                              {packageDurationHours(pkg) != null
                                ? `${packageDurationHours(pkg)} hrs`
                                : "—"}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          {promo.isPromotional ? (
                            <span className="inline-flex items-center gap-1 text-sm font-semibold text-green-600">
                              {promo.discountValue}{" "}
                              {promo.discountType === "FLAT"
                                ? packageCurrency(pkg)
                                : "%"}
                              <span className="text-xs text-gray-400 font-normal">
                                off
                              </span>
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          {promo.isPromotional &&
                          (promo.startDate || promo.endDate) ? (
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <CalendarDays
                                size={12}
                                className="text-gray-400"
                              />
                              <span>
                                {promo.startDate
                                  ? formatDateForDisplay(promo.startDate)
                                  : "—"}{" "}
                                –{" "}
                                {promo.endDate
                                  ? formatDateForDisplay(promo.endDate)
                                  : "—"}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full ${
                              pkg.status === "ACTIVE"
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-500"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                pkg.status === "ACTIVE"
                                  ? "bg-green-500"
                                  : "bg-gray-400"
                              }`}
                            />
                            {pkg.status === "ACTIVE" ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-center gap-1">
                            <Link
                              href={`/vendor/packages/view/${pkg.slug || pkg.id}`}
                              title="View Details"
                              className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            >
                              <Eye size={15} />
                            </Link>
                            <button
                              onClick={() => setSelected(pkg)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-orange-600 hover:bg-orange-50 transition-colors"
                              title={
                                promo.isPromotional
                                  ? "Edit Promotion"
                                  : "Make Promotional"
                              }
                            >
                              <Edit3 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filtered.length}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={(page) => setCurrentPage(page)}
          />
        </>
      )}

      <PromotionModal
        pkg={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
        onSaved={(updated) => {
          setPackages((current) =>
            current.map((item) => (item.id === updated.id ? updated : item)),
          );
          showSuccess(`"${updated.title}" promotional settings saved.`);
        }}
      />
    </div>
  );
}

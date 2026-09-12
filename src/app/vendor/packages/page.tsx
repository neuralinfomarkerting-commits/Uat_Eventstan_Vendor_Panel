"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Edit3,
  Eye,
  Layers,
  Loader2,
  Package as PackageIcon,
  Plus,
  ToggleLeft,
  ToggleRight,
  Trash2,
  X,
  RotateCcw,
  Filter,
  Search,
} from "lucide-react";
import { vendorApi } from "@/api/vendorApi";
import { showError, showSuccess } from "@/lib/toast";
import Pagination from "@/components/vendor/Pagination";

type SortKey = "title" | "price" | "status" | "services";
type SortDir = "asc" | "desc";

const ITEMS_PER_PAGE = 10;

interface PackageService {
  id: string;
  title: string;
  category?: { id?: string; name: string };
  imageUrl?: string | null;
}

interface ApiPackageItem {
  id?: string;
  serviceId: string;
  service?: PackageService;
}

interface ApiPackage {
  id: string;
  vendorId: string;
  title: string;
  name?: string;
  description?: string;
  amount?: number;
  currency?: string;
  price?: number;
  money?: { amount: number; currency: string };
  price_unit?: string;
  priceUnit?: string;
  status: string;
  itemIds?: string[];
  items?: ApiPackageItem[];
  inclusions?: string[];
  includedItems?: string[];
  features?: string[];
  max_guests?: number;
  maxGuests?: number;
  duration_hours?: number;
  durationHours?: number;
  is_popular?: boolean;
  created_at?: string;
  categoryId?: string;
  category_id?: string;
  serviceId?: string;
  service_id?: string;
  exactPrice?: number;
  exact_price?: number;
  vendorPhone?: string;
  vendor_phone?: string;
  imageUrl?: string;
  image_url?: string;
  showOnHomepage?: boolean;
  show_on_homepage?: boolean;
  isPromotional?: boolean;
  is_promotional?: boolean;
  promotionDiscountType?: string;
  promotion_discount_type?: string;
  promotionDiscountValue?: number;
  promotion_discount_value?: number;
  promotionStartDate?: string;
  promotion_start_date?: string;
  promotionEndDate?: string;
  promotion_end_date?: string;
  isRental?: boolean;
  is_rental?: boolean;
  rentalLocation?: string;
  rental_location?: string;
  rentalLocationId?: string;
  rental_location_id?: string;
  serviceArea?: string;
  service_area?: string;
  deliveryRadius?: number;
  delivery_radius?: number;
  deliveryFeeType?: string;
  delivery_fee_type?: string;
  deliveryFee?: number;
  delivery_fee?: number;
  pickupAvailable?: boolean;
  pickup_available?: boolean;
  deliveryAvailable?: boolean;
  delivery_available?: boolean;
  requiresDeposit?: boolean;
  requires_deposit?: boolean;
  depositAmount?: number;
  deposit_amount?: number;
  minHours?: number;
  min_hours?: number;
  maxHours?: number;
  max_hours?: number;
  minPersons?: number;
  min_persons?: number;
  maxPersons?: number;
  max_persons?: number;
  minPieces?: number;
  min_pieces?: number;
  maxPieces?: number;
  max_pieces?: number;
  category?: { id?: string; name?: string; slug?: string } | null;
  category_name?: string;
  category_slug?: string;
  originalPrice?: number;
  original_price?: number;
  promotionalPrice?: number;
  promotional_price?: number;
  showOnPromotionalPage?: boolean;
  show_on_promotional_page?: boolean;
  updatedAt?: string;
  updated_at?: string;
}

// ── Searchable Select Component ──
function SearchableSelectField({
  value,
  onChange,
  options,
  placeholder = "All Categories",
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selected = options.find((o) => o.value === value);
  const filtered = query
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  return (
    <div className="flex-1 min-w-[200px]">
      {label && (
        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">
          {label}
        </label>
      )}
      <div className="relative" ref={ref}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="relative w-full flex items-center gap-2 px-4 py-2 pr-9 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400 bg-white text-left hover:border-orange-300 transition-colors"
        >
          <span className={`truncate ${selected ? "text-gray-700" : "text-gray-400"}`}>
            {selected ? selected.label : placeholder}
          </span>
          <ChevronDown
            size={13}
            className={`absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>

        {open && (
          <div className="absolute z-30 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
            <div className="p-2 border-b border-gray-100">
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search..."
                className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400"
              />
            </div>
            <div className="max-h-56 overflow-y-auto py-1">
              {filtered.length === 0 && (
                <p className="px-3 py-2 text-xs text-gray-400">No options found</p>
              )}
              {filtered.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                      setQuery("");
                    }}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-left hover:bg-orange-50 transition-colors
                      ${isSelected ? "text-orange-600 font-medium bg-orange-50/60" : "text-gray-700"}`}
                  >
                    <span className="truncate">{opt.label}</span>
                    {isSelected && <CheckCircle2 size={14} className="text-orange-500 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function packageAmount(pkg: ApiPackage) {
  return pkg.money?.amount ?? pkg.amount ?? pkg.price ?? 0;
}

// Currency is always shown as AED regardless of what's stored on the
// package record (some older records may have USD or other values saved).
function packageCurrency(_pkg: ApiPackage) {
  return "AED";
}

function packageOriginalPrice(pkg: ApiPackage) {
  return pkg.originalPrice ?? pkg.original_price ?? pkg.exactPrice ?? pkg.exact_price;
}

function packageCategoryName(pkg: ApiPackage) {
  return pkg.category?.name ?? pkg.category_name ?? "";
}

function packageCategoryId(pkg: ApiPackage) {
  return pkg.category?.id ?? pkg.categoryId ?? pkg.category_id ?? "";
}

function packageIsPromotional(pkg: ApiPackage) {
  return pkg.isPromotional ?? pkg.is_promotional ?? false;
}

function packageServices(pkg: ApiPackage): ApiPackageItem[] {
  if (pkg.items?.length) return pkg.items;
  return (pkg.itemIds ?? []).map((serviceId) => ({ serviceId }));
}

function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  confirmClass = "bg-red-500 hover:bg-red-600",
  icon,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  confirmClass?: string;
  icon?: React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <button
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onCancel}
        aria-label="Close"
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col items-center gap-4">
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          aria-label="Close modal"
        >
          <X size={18} />
        </button>
        {icon && (
          <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
            {icon}
          </div>
        )}
        <div className="text-center">
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          <p className="text-sm text-gray-500 mt-1">{message}</p>
        </div>
        <div className="flex gap-3 w-full mt-1">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-2.5 rounded-xl text-white text-sm font-semibold transition ${confirmClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function PackageDetailModal({
  pkg,
  open,
  onClose,
}: {
  pkg: ApiPackage | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!open || !pkg) return null;
  const services = packageServices(pkg);
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <button
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close"
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[82vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              {pkg.title || pkg.name}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-400 uppercase mb-2">
                Status
              </p>
              <span
                className={`inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-full ${pkg.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}
              >
                {pkg.status === "ACTIVE" ? (
                  <ToggleRight size={14} />
                ) : (
                  <ToggleLeft size={14} />
                )}
                {pkg.status === "ACTIVE" ? "Active" : "Inactive"}
              </span>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-400 uppercase mb-1">
                Price
              </p>
              <p className="text-xl font-bold text-gray-900 flex items-center gap-2">
                {packageAmount(pkg).toLocaleString()} {packageCurrency(pkg)}
                {packageIsPromotional(pkg) &&
                  packageOriginalPrice(pkg) != null &&
                  packageOriginalPrice(pkg) !== packageAmount(pkg) && (
                    <span className="text-sm font-medium text-gray-400 line-through">
                      {packageOriginalPrice(pkg)!.toLocaleString()}{" "}
                      {packageCurrency(pkg)}
                    </span>
                  )}
              </p>
              <p className="text-xs text-gray-400">
                {pkg.price_unit || pkg.priceUnit || "package"}
              </p>
            </div>
          </div>
          {pkg.description && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase mb-2">
                Description
              </p>
              <p className="text-sm text-gray-700 leading-relaxed">
                {pkg.description}
              </p>
            </div>
          )}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase mb-3">
              Included Services ({services.length})
            </p>
            <div className="space-y-2">
              {services.map((item) => (
                <div
                  key={item.serviceId}
                  className="flex items-center gap-3 p-3 bg-orange-50 border border-orange-100 rounded-xl"
                >
                  <div className="w-9 h-9 rounded-lg bg-white overflow-hidden shrink-0 flex items-center justify-center">
                    {item.service?.imageUrl ? (
                      <img
                        src={item.service.imageUrl}
                        alt={item.service.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <PackageIcon size={14} className="text-orange-300" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {item.service?.title || item.serviceId}
                    </p>
                    <p className="text-xs text-gray-400">
                      {item.service?.category?.name || "Service"}
                    </p>
                  </div>
                </div>
              ))}
              {services.length === 0 && (
                <p className="text-sm text-gray-400">No services linked.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
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

export default function PackagesPage() {
  const [packages, setPackages] = useState<ApiPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("title");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<ApiPackage | null>(null);
  const [toggleTarget, setToggleTarget] = useState<ApiPackage | null>(null);
  const [viewTarget, setViewTarget] = useState<ApiPackage | null>(null);

  // Filter states
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [serviceFilter, setServiceFilter] = useState<string>("all");
  const [allCategories, setAllCategories] = useState<
    Array<{ id: string; name: string; image?: string | null }>
  >([]);

  // All categories (not just ones already used by a package), for the filter dropdown.
  // Filtering by id (not name) avoids mismatches between master-data category
  // names and the category names embedded in services/packages.
  const categories = useMemo(() => {
    if (allCategories.length) {
      const seen = new Map<string, string>();
      allCategories.forEach((c) => seen.set(c.id, c.name));
      return Array.from(seen.entries())
        .map(([id, name]) => ({ id, name }))
        .sort((a, b) => a.name.localeCompare(b.name));
    }
    // Fallback: derive from packages if master data hasn't loaded yet
    const cats = new Map<string, string>();
    packages.forEach(pkg => {
      const services = packageServices(pkg);
      services.forEach(item => {
        const id = item.service?.category?.id;
        const name = item.service?.category?.name;
        if (id && name) cats.set(id, name);
      });
      const pkgCatId = packageCategoryId(pkg);
      const pkgCatName = packageCategoryName(pkg);
      if (pkgCatId && pkgCatName) cats.set(pkgCatId, pkgCatName);
    });
    return Array.from(cats.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [packages, allCategories]);

  // Convert categories to options format for SearchableSelectField
  const categoryOptions = useMemo(
    () => [
      { value: "all", label: "All Categories" },
      ...categories.map((cat) => ({ value: cat.id, label: cat.name })),
    ],
    [categories]
  );

  // Extract unique services based on selected category
  const services = useMemo(() => {
    const svcs = new Set<string>();
    packages.forEach(pkg => {
      const pkgServices = packageServices(pkg);
      const pkgCatId = packageCategoryId(pkg);
      pkgServices.forEach(item => {
        // If category filter is selected, only show services from that category
        const itemCatId = item.service?.category?.id;
        const matchesCategory =
          categoryFilter === "all" ||
          itemCatId === categoryFilter ||
          pkgCatId === categoryFilter;
        if (matchesCategory && item.service?.title) {
          svcs.add(item.service.title);
        }
      });
    });
    return Array.from(svcs).sort();
  }, [packages, categoryFilter]);

  // Convert services to options format for SearchableSelectField
  const serviceOptions = useMemo(
    () => [
      { value: "all", label: "All Services" },
      ...services.map((svc) => ({ value: svc, label: svc })),
    ],
    [services]
  );

  // Reset service filter when category changes
  useEffect(() => {
    setServiceFilter("all");
  }, [categoryFilter]);

  const fetchPackages = async () => {
    try {
      setLoading(true);
      setPackages(await vendorApi.packages.list<ApiPackage[]>());
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to load packages");
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const rows = await vendorApi.masterData.categories<
        Array<{ id: string; name: string; image?: string | null }>
      >();
      setAllCategories(rows);
    } catch (err) {
      console.error("Failed to load categories:", err);
    }
  };

  useEffect(() => {
    void fetchPackages();
    void fetchCategories();
  }, []);

  // Reset to page 1 when filters or sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [categoryFilter, serviceFilter, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  // Reset all filters
  const handleResetFilters = () => {
    setCategoryFilter("all");
    setServiceFilter("all");
    setCurrentPage(1);
  };

  const filtered = useMemo(() => {
    return [...packages]
      .filter((pkg) => {
        const pkgServices = packageServices(pkg);

        // Filter by category
        if (categoryFilter !== "all") {
          const hasCategory =
            pkgServices.some(
              item => item.service?.category?.id === categoryFilter
            ) || packageCategoryId(pkg) === categoryFilter;
          if (!hasCategory) return false;
        }

        // Filter by service
        if (serviceFilter !== "all") {
          const hasService = pkgServices.some(
            item => item.service?.title === serviceFilter
          );
          if (!hasService) return false;
        }

        return true;
      })
      .sort((a, b) => {
        let cmp = 0;
        if (sortKey === "title") cmp = a.title.localeCompare(b.title);
        if (sortKey === "price") cmp = packageAmount(a) - packageAmount(b);
        if (sortKey === "status") cmp = a.status.localeCompare(b.status);
        if (sortKey === "services")
          cmp = packageServices(a).length - packageServices(b).length;
        return sortDir === "asc" ? cmp : -cmp;
      });
  }, [packages, categoryFilter, serviceFilter, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const resolvePackageImage = (pkg: ApiPackage): string | null => {
    if (pkg.imageUrl || pkg.image_url) return pkg.imageUrl || pkg.image_url || null;
    const catId = packageCategoryId(pkg);
    const catName = packageCategoryName(pkg);
    const matched =
      allCategories.find((c) => c.id === catId) ||
      allCategories.find(
        (c) => c.name.toLowerCase() === catName.toLowerCase(),
      );
    return matched?.image || null;
  };

  const th = (key: SortKey, label: string) => (
    <th
      onClick={() => toggleSort(key)}
      className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase cursor-pointer select-none hover:text-orange-600 whitespace-nowrap"
    >
      {label}
      <SortIcon col={key} sortKey={sortKey} sortDir={sortDir} />
    </th>
  );

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await vendorApi.packages.delete(deleteTarget.id);
      setPackages((cur) => cur.filter((pkg) => pkg.id !== deleteTarget.id));
      showSuccess(`"${deleteTarget.title}" deleted`);
      setDeleteTarget(null);
    } catch {
      showError("Failed to delete package.");
    }
  };

  const handleToggle = async () => {
    if (!toggleTarget) return;
    const pkg = toggleTarget;
    const newStatus = pkg.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";

    // The backend validates the FULL package payload even on a partial PATCH
    // (e.g. it still requires minHours > 0 for hourly packages). So instead
    // of sending just { status }, we resend the package's existing data via
    // the same PUT endpoint the Edit page uses, only flipping status.
    const services = packageServices(pkg);
    const serviceId = pkg.serviceId || pkg.service_id || services[0]?.serviceId || "";
    const minHours = pkg.minHours ?? pkg.min_hours;
    const maxHours = pkg.maxHours ?? pkg.max_hours;
    const minPersons = pkg.minPersons ?? pkg.min_persons;
    const maxPersons = pkg.maxPersons ?? pkg.max_persons;
    const minPieces = pkg.minPieces ?? pkg.min_pieces;
    const maxPieces = pkg.maxPieces ?? pkg.max_pieces;
    const isRental = pkg.isRental ?? pkg.is_rental ?? false;

    const payload: Record<string, unknown> = {
      vendorId: pkg.vendorId,
      title: pkg.title || pkg.name,
      description: pkg.description || "",
      categoryId: pkg.categoryId || pkg.category_id || undefined,
      serviceId,
      exactPrice: pkg.exactPrice ?? pkg.exact_price ?? packageAmount(pkg),
      currency: packageCurrency(pkg),
      priceUnit: pkg.priceUnit || pkg.price_unit || "package",
      status: newStatus,
      maxGuests: pkg.maxGuests ?? pkg.max_guests ?? undefined,
      durationHours: pkg.durationHours ?? pkg.duration_hours ?? undefined,
      includedItems: pkg.includedItems || pkg.inclusions || [],
      features: pkg.features || [],
      vendorPhone: pkg.vendorPhone || pkg.vendor_phone || undefined,
      imageUrl: pkg.imageUrl || pkg.image_url || undefined,
      showOnPromotionalPage: pkg.showOnPromotionalPage ?? pkg.show_on_promotional_page ?? false,
      isPromotional: pkg.isPromotional ?? pkg.is_promotional ?? false,
      promotionDiscountType: pkg.promotionDiscountType || pkg.promotion_discount_type || undefined,
      promotionDiscountValue: pkg.promotionDiscountValue ?? pkg.promotion_discount_value ?? undefined,
      promotionStartDate: pkg.promotionStartDate || pkg.promotion_start_date || undefined,
      promotionEndDate: pkg.promotionEndDate || pkg.promotion_end_date || undefined,
    };

    if (isRental) {
      payload.isRental = true;
      payload.rentalLocation = pkg.rentalLocation || pkg.rental_location || "";
      payload.rentalLocationId = pkg.rentalLocationId || pkg.rental_location_id || "";
      payload.serviceArea = pkg.serviceArea || pkg.service_area || undefined;
      payload.deliveryRadius = pkg.deliveryRadius ?? pkg.delivery_radius ?? undefined;
      payload.deliveryFeeType = pkg.deliveryFeeType || pkg.delivery_fee_type || undefined;
      payload.deliveryFee = pkg.deliveryFee ?? pkg.delivery_fee ?? undefined;
      payload.pickupAvailable = pkg.pickupAvailable ?? pkg.pickup_available ?? true;
      payload.deliveryAvailable = pkg.deliveryAvailable ?? pkg.delivery_available ?? true;
      payload.requiresDeposit = pkg.requiresDeposit ?? pkg.requires_deposit ?? false;
      payload.depositAmount = pkg.depositAmount ?? pkg.deposit_amount ?? undefined;
    }

    if (minHours != null || maxHours != null) {
      payload.minHours = minHours;
      payload.maxHours = maxHours;
    } else if (minPersons != null || maxPersons != null) {
      payload.minPersons = minPersons;
      payload.maxPersons = maxPersons;
    } else if (minPieces != null || maxPieces != null) {
      payload.minPieces = minPieces;
      payload.maxPieces = maxPieces;
    }

    try {
      await vendorApi.packages.update(pkg.id, payload);
      const fresh = await vendorApi.packages.list<ApiPackage[]>();
      setPackages(fresh);
      showSuccess(
        `"${pkg.title}" ${newStatus === "ACTIVE" ? "activated" : "deactivated"}`,
      );
      setToggleTarget(null);
    } catch (err) {
      console.error("Failed to update package status:", err);
      showError(
        err instanceof Error
          ? `Failed to update package status: ${err.message}`
          : "Failed to update package status.",
      );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2
            size={40}
            className="animate-spin text-orange-500 mx-auto mb-4"
          />
          <p className="text-gray-500">Loading packages...</p>
        </div>
      </div>
    );
  }

  const hasActiveFilters = categoryFilter !== "all" || serviceFilter !== "all";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Packages</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {packages.length} service bundles
          </p>
        </div>
        <Link
          href="/vendor/packages/add"
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-colors shadow-sm"
        >
          <Plus size={16} /> Create Package
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 text-center">
          <p className="text-2xl font-bold text-gray-900">{packages.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">Total</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 text-center">
          <p className="text-2xl font-bold text-green-600">
            {packages.filter((p) => p.status === "ACTIVE").length}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">Active</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 text-center">
          <p className="text-2xl font-bold text-gray-500">
            {packages.filter((p) => p.status !== "ACTIVE").length}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">Inactive</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-4">
        <SearchableSelectField
          value={categoryFilter}
          onChange={setCategoryFilter}
          options={categoryOptions}
          placeholder="All Categories"
          label="Category"
        />

        <SearchableSelectField
          value={serviceFilter}
          onChange={setServiceFilter}
          options={serviceOptions}
          placeholder="All Services"
          label="Service"
        />

        <button
          onClick={handleResetFilters}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:text-gray-900 transition-colors shrink-0"
          title="Reset all filters"
        >
          <RotateCcw size={15} />
          Reset
        </button>
      </div>

      {/* Active filters indicator */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500">Active filters:</span>
          {categoryFilter !== "all" && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-orange-50 text-orange-700 text-xs rounded-full">
              <Filter size={12} />
              {categories.find(c => c.id === categoryFilter)?.name || categoryFilter}
              <button
                onClick={() => setCategoryFilter("all")}
                className="text-orange-400 hover:text-orange-600"
              >
                <X size={12} />
              </button>
            </span>
          )}
          {serviceFilter !== "all" && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-orange-50 text-orange-700 text-xs rounded-full">
              <Search size={12} />
              {serviceFilter}
              <button
                onClick={() => setServiceFilter("all")}
                className="text-orange-400 hover:text-orange-600"
              >
                <X size={12} />
              </button>
            </span>
          )}
          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="text-xs text-gray-400 hover:text-gray-600 underline-offset-2 hover:underline"
            >
              Clear all
            </button>
          )}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Layers size={36} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">No packages found</p>
            <p className="text-sm mt-1">
              {hasActiveFilters
                ? "Try clearing your filters."
                : "Create your first package."}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px]">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {th("title", "Package")}
                    {th("services", "Services")}
                    {th("price", "Price")}
                    {th("status", "Status")}
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {paginated.map((pkg) => {
                    const services = packageServices(pkg);
                    const rowImage = resolvePackageImage(pkg);
                    return (
                      <tr
                        key={pkg.id}
                        className="hover:bg-orange-50/30 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center shrink-0 overflow-hidden">
                              {rowImage ? (
                                <img
                                  src={rowImage}
                                  alt={pkg.title || pkg.name || "Package"}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <PackageIcon
                                  size={16}
                                  className="text-orange-500"
                                />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-900 truncate max-w-[280px]">
                                {pkg.title || pkg.name}
                              </p>
                              {pkg.description && (
                                <p className="text-xs text-gray-500 mt-1 max-w-[340px] truncate">
                                  {pkg.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1 max-w-[240px]">
                            {services.slice(0, 2).map((item) => (
                              <span
                                key={item.serviceId}
                                className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full whitespace-nowrap"
                              >
                                {item.service?.title ||
                                  item.serviceId.slice(0, 10)}
                              </span>
                            ))}
                            {services.length > 2 && (
                              <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">
                                +{services.length - 2} more
                              </span>
                            )}
                            {services.length === 0 && (
                              <span className="text-xs text-gray-400">
                                No services
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm font-semibold text-gray-800 whitespace-nowrap flex items-center gap-1.5">
                            {packageAmount(pkg).toLocaleString()}{" "}
                            {packageCurrency(pkg)}
                            {packageIsPromotional(pkg) &&
                              packageOriginalPrice(pkg) != null &&
                              packageOriginalPrice(pkg) !== packageAmount(pkg) && (
                                <span className="text-xs font-medium text-gray-400 line-through">
                                  {packageOriginalPrice(pkg)!.toLocaleString()}{" "}
                                  {packageCurrency(pkg)}
                                </span>
                              )}
                          </div>
                          <div className="text-xs text-gray-400">
                            {pkg.price_unit || pkg.priceUnit || "package"}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setToggleTarget(pkg)}
                            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full transition-all ${
                              pkg.status === "ACTIVE"
                                ? "bg-green-100 text-green-700 hover:bg-green-200"
                                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                            }`}
                          >
                            {pkg.status === "ACTIVE" ? (
                              <ToggleRight
                                size={14}
                                className="text-green-500"
                              />
                            ) : (
                              <ToggleLeft size={14} />
                            )}
                            {pkg.status === "ACTIVE" ? "Active" : "Inactive"}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <Link
                              href={`/vendor/packages/view/${pkg.id}`}
                              title="View Details"
                              className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors"
                            >
                              <Eye size={15} />
                            </Link>
                            <Link
                              href={`/vendor/packages/edit/${pkg.id}`}
                              title="Edit"
                              className="p-1.5 rounded-lg text-gray-400 hover:text-orange-500 hover:bg-orange-50 transition-colors"
                            >
                              <Edit3 size={15} />
                            </Link>
                            <button
                              onClick={() => setDeleteTarget(pkg)}
                              title="Delete"
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ── Pagination ── */}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filtered.length}
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={(page) => setCurrentPage(page)}
            />
          </>
        )}
      </div>

      {/* Modals */}
      <PackageDetailModal
        pkg={viewTarget}
        open={!!viewTarget}
        onClose={() => setViewTarget(null)}
      />
      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Package?"
        message={`"${deleteTarget?.title}" will be permanently deleted.`}
        confirmLabel="Delete"
        confirmClass="bg-red-500 hover:bg-red-600"
        icon={<Trash2 size={24} className="text-red-500" />}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
      <ConfirmModal
        open={!!toggleTarget}
        title={
          toggleTarget?.status === "ACTIVE"
            ? "Deactivate Package?"
            : "Activate Package?"
        }
        message={
          toggleTarget?.status === "ACTIVE"
            ? `"${toggleTarget?.title}" will be hidden from customers.`
            : `"${toggleTarget?.title}" will become visible to customers.`
        }
        confirmLabel={
          toggleTarget?.status === "ACTIVE" ? "Deactivate" : "Activate"
        }
        confirmClass={
          toggleTarget?.status === "ACTIVE"
            ? "bg-gray-600 hover:bg-gray-700"
            : "bg-green-500 hover:bg-green-600"
        }
        icon={
          toggleTarget?.status === "ACTIVE" ? (
            <ToggleLeft size={24} className="text-gray-500" />
          ) : (
            <ToggleRight size={24} className="text-green-500" />
          )
        }
        onConfirm={handleToggle}
        onCancel={() => setToggleTarget(null)}
      />
    </div>
  );
}
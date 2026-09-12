"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Edit3,
  MapPin,
  Package as PackageIcon,
  Phone,
  Tag,
  Truck,
  Users,
  X,
  Loader2,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Building2,
  Sparkles,
  Info,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { vendorApi } from "@/api/vendorApi";
import { showError, showSuccess } from "@/lib/toast";

interface PackageService {
  id: string;
  title: string;
  category?: { name: string };
  imageUrl?: string | null;
  description?: string;
}

interface ApiPackageItem {
  id?: string;
  serviceId: string;
  service?: PackageService;
}

interface Vendor {
  id: string;
  name?: string;
  businessName?: string;
  companyName?: string;
  vendorName?: string;
  phone?: string;
  email?: string;
  address?: string;
}

interface ApiPackage {
  id: string;
  vendorId: string;
  vendor?: Vendor;
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
  isPopular?: boolean;
  is_promotional?: boolean;
  isPromotional?: boolean;
  promotion_discount_type?: string | null;
  promotionDiscountType?: string | null;
  promotion_discount_value?: number | null;
  promotionDiscountValue?: number | null;
  promotionStartDate?: string;
  promotion_start_date?: string;
  promotionEndDate?: string;
  promotion_end_date?: string;
  createdAt?: string;
  updatedAt?: string;
  created_at?: string;
  showOnHomepage?: boolean;
  show_on_homepage?: boolean;
  showOnPromotionalPage?: boolean;
  show_on_promotional_page?: boolean;
  exactPrice?: number;
  exact_price?: number;
  vendorPhone?: string;
  vendorEmail?: string;
  imageUrl?: string;
  image_url?: string;
  minGuests?: number;
  min_order?: number;
  original_price?: number;
  promotional_price?: number;
  promotionalPrice?: number;
  service_id?: string;
  categoryId?: string;
  category?: { id: string; name: string; image?: string | null } | null;
  minHours?: number;
  maxHours?: number;
  minPersons?: number;
  maxPersons?: number;
  minPieces?: number;
  maxPieces?: number;
  minDays?: number;
  maxDays?: number;
  isRental?: boolean;
  is_rental?: boolean;
  rentalLocation?: string;
  rental_location?: string;
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
}

function packageAmount(pkg: ApiPackage) {
  return pkg.money?.amount ?? pkg.amount ?? pkg.price ?? pkg.exactPrice ?? pkg.exact_price ?? 0;
}

function packageCurrency(pkg: ApiPackage) {
  return pkg.money?.currency ?? pkg.currency ?? "AED";
}

function formatDateDDMMYYYY(dateStr?: string | null) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

export default function PackageViewPage() {
  const params = useParams();
  const router = useRouter();
  const [pkg, setPkg] = useState<ApiPackage | null>(null);
  const [categories, setCategories] = useState<
    Array<{ id: string; name: string; image?: string | null }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [toggleConfirm, setToggleConfirm] = useState(false);
  const [showAllInclusions, setShowAllInclusions] = useState(false);

  const packageId = params.id as string;
  
  const hasFetched = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchPackage = useCallback(async () => {
    if (hasFetched.current) return;
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    
    try {
      setLoading(true);
      
      const [data, categoryRows] = await Promise.all([
        vendorApi.packages.get<ApiPackage>(packageId),
        vendorApi.masterData
          .categories<Array<{ id: string; name: string; image?: string | null }>>()
          .catch(() => []),
      ]);

      if (!abortController.signal.aborted) {
        setPkg(data);
        setCategories(categoryRows);
        hasFetched.current = true;
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      if (!abortController.signal.aborted) {
        showError(err instanceof Error ? err.message : "Failed to load package details");
        setError(err instanceof Error ? err.message : "Failed to load package details");
      }
    } finally {
      if (!abortController.signal.aborted) {
        setLoading(false);
      }
    }
  }, [packageId]);

  useEffect(() => {
    hasFetched.current = false;
    
    if (packageId) {
      fetchPackage();
    }
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [packageId, fetchPackage]);

  const handleToggle = async () => {
    if (!pkg) return;
    const newStatus = pkg.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      await vendorApi.packages.updateStatus(pkg.id, newStatus);
      setPkg({ ...pkg, status: newStatus });
      showSuccess(`Package ${newStatus === "ACTIVE" ? "activated" : "deactivated"} successfully`);
      setToggleConfirm(false);
    } catch {
      showError("Failed to update package status.");
    }
  };

  const handleDelete = async () => {
    if (!pkg) return;
    try {
      await vendorApi.packages.delete(pkg.id);
      showSuccess("Package deleted successfully.");
      router.push("/vendor/packages");
    } catch {
      showError("Failed to delete package.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 border-4 border-orange-200 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-orange-500 rounded-full border-t-transparent animate-spin"></div>
          </div>
          <p className="text-gray-500 font-medium">Loading package details...</p>
        </div>
      </div>
    );
  }

  if (error || !pkg) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mb-4">
          <AlertTriangle size={40} className="text-red-500" />
        </div>
        <h3 className="text-xl font-bold text-gray-900">Package Not Found</h3>
        <p className="text-gray-500 mt-2">{error || "The package you're looking for doesn't exist."}</p>
        <Link 
          href="/vendor/packages" 
          className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-colors"
        >
          <ArrowLeft size={18} /> Back to Packages
        </Link>
      </div>
    );
  }

  const amount = packageAmount(pkg);
  const currency = packageCurrency(pkg);
  const packageName = pkg.title || pkg.name || "Package";
  
  const includedItems = pkg.inclusions || pkg.includedItems || [];
  const features = pkg.features || [];
  
  const maxGuests = pkg.maxGuests ?? pkg.max_guests ?? null;
  const duration = pkg.durationHours ?? pkg.duration_hours ?? null;
  const priceUnit = pkg.priceUnit || pkg.price_unit || "per event";
  
  const isPopular = pkg.isPopular ?? pkg.is_popular ?? false;
  const isPromotional = pkg.isPromotional ?? pkg.is_promotional ?? false;
  const showOnHomepage =
    pkg.showOnPromotionalPage ??
    pkg.show_on_promotional_page ??
    pkg.showOnHomepage ??
    pkg.show_on_homepage ??
    false;
  
  const packageImage = pkg.imageUrl || pkg.image_url || null;
  const globalDefaultImage = `https://eventstancom.vercel.app/images/featured-services/featured-services-1.jpg`;

  const isRental = pkg.isRental ?? pkg.is_rental ?? false;
  const rentalLocation = pkg.rentalLocation || pkg.rental_location || "";
  const serviceArea = pkg.serviceArea || pkg.service_area || "";
  const deliveryRadius = pkg.deliveryRadius ?? pkg.delivery_radius ?? null;
  const deliveryFeeType = pkg.deliveryFeeType || pkg.delivery_fee_type || "";
  const deliveryFee = pkg.deliveryFee ?? pkg.delivery_fee ?? null;
  const pickupAvailable = pkg.pickupAvailable ?? pkg.pickup_available ?? false;
  const deliveryAvailable = pkg.deliveryAvailable ?? pkg.delivery_available ?? false;
  const requiresDeposit = pkg.requiresDeposit ?? pkg.requires_deposit ?? false;
  const depositAmount = pkg.depositAmount ?? pkg.deposit_amount ?? null;
  const vendorPhone = pkg.vendorPhone || "";
  
  const minHours = pkg.minHours ?? null;
  const maxHours = pkg.maxHours ?? null;
  const minPersons = pkg.minPersons ?? null;
  const maxPersons = pkg.maxPersons ?? null;
  const minPieces = pkg.minPieces ?? null;
  const maxPieces = pkg.maxPieces ?? null;
  const minDays = pkg.minDays ?? null;
  const maxDays = pkg.maxDays ?? null;
  
  const categoryName = pkg.category?.name || "";

  const getPromotionalPrice = () => {
    if (!isPromotional) return null;
    
    if (pkg.promotional_price) return pkg.promotional_price;
    if (pkg.promotionalPrice) return pkg.promotionalPrice;
    
    const discountType = pkg.promotionDiscountType || pkg.promotion_discount_type;
    const discountValue = pkg.promotionDiscountValue ?? pkg.promotion_discount_value;
    const basePrice = pkg.exactPrice ?? pkg.exact_price ?? amount;
    
    if (discountType === "PERCENTAGE" && discountValue) {
      return basePrice - (basePrice * discountValue / 100);
    }
    if (discountType === "FLAT" && discountValue) {
      return basePrice - discountValue;
    }
    return null;
  };

  const promotionalPrice = getPromotionalPrice();
  const discountType = pkg.promotionDiscountType || pkg.promotion_discount_type;
  const discountValue = pkg.promotionDiscountValue ?? pkg.promotion_discount_value;
  const originalPrice = pkg.exactPrice ?? pkg.exact_price ?? amount;
  const discountAmount =
    isPromotional && promotionalPrice != null
      ? originalPrice - promotionalPrice
      : null;
  const discountPercent =
    isPromotional && discountAmount != null && originalPrice > 0
      ? discountType === "PERCENTAGE" && discountValue
        ? discountValue
        : Math.round((discountAmount / originalPrice) * 100)
      : null;
  const promotionStart = pkg.promotionStartDate || pkg.promotion_start_date;
  const promotionEnd = pkg.promotionEndDate || pkg.promotion_end_date;
  const services = pkg.items || [];
  const resolvedCategoryName = categoryName || services[0]?.service?.category?.name || "";
  const resolvedCategoryId = pkg.category?.id || pkg.categoryId || "";
  const matchedCategory =
    categories.find((cat) => cat.id === resolvedCategoryId) ||
    categories.find(
      (cat) => cat.name.toLowerCase() === resolvedCategoryName.toLowerCase(),
    );
  const categoryImage = matchedCategory?.image || null;
  const defaultImage = categoryImage || globalDefaultImage;

  const displayInclusions = showAllInclusions ? includedItems : includedItems.slice(0, 4);
  const hasMoreInclusions = includedItems.length > 4;

  const serviceNames = services.map(item => item.service?.title || item.serviceId).filter(Boolean);

  const hasMinMaxFields = !!(minHours || maxHours || minPersons || maxPersons || minPieces || maxPieces || minDays || maxDays);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <Link 
          href="/vendor/packages"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-orange-500 transition-colors"
        >
          <ArrowLeft size={16} /> Back to Packages
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href={`/vendor/packages/edit/${pkg.id}`}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors shadow-sm"
          >
            <Edit3 size={16} /> Edit
          </Link>
          <button
            onClick={() => setToggleConfirm(true)}
            className={`flex items-center gap-2 border px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              pkg.status === "ACTIVE"
                ? "border-gray-300 text-gray-700 hover:bg-gray-50"
                : "border-green-200 text-green-700 hover:bg-green-50"
            }`}
          >
            {pkg.status === "ACTIVE" ? <ToggleLeft size={16} /> : <ToggleRight size={16} />}
            {pkg.status === "ACTIVE" ? "Deactivate" : "Activate"}
          </button>
          <button
            onClick={() => setDeleteConfirm(true)}
            className="flex items-center gap-2 border border-red-200 text-red-600 hover:bg-red-50 font-semibold px-4 py-2 rounded-xl text-sm transition-colors"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        
        <div className="relative w-full h-56 md:h-72 bg-gradient-to-r from-orange-100 to-orange-200 overflow-hidden">
          <img
            src={packageImage || defaultImage}
            alt={packageName}
            className="w-full h-full object-cover"
            onError={(e) => {
              const img = e.target as HTMLImageElement;
              if (img.src !== globalDefaultImage) {
                img.src = globalDefaultImage;
              }
            }}
          />
          <div className="absolute top-4 left-4 flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
              pkg.status === "ACTIVE" 
                ? "bg-green-100 text-green-700" 
                : "bg-gray-100 text-gray-500"
            }`}>
              {pkg.status === "ACTIVE" ? "● Active" : "● Inactive"}
            </span>
            {isPopular && (
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-yellow-100 text-yellow-700">
                ★ Popular
              </span>
            )}
            {isPromotional && (
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-red-100 text-red-700">
                🔥 Promotional
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 md:p-5 bg-orange-50/50 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
              <PackageIcon size={16} className="text-orange-600" />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider">Price</p>
              <p className="text-sm font-bold text-gray-900">
                {promotionalPrice ? (
                  <span className="flex items-center gap-1 flex-wrap">
                    <span className="text-green-600">{promotionalPrice.toLocaleString()} {currency}</span>
                    <span className="text-xs text-gray-400 line-through">{originalPrice.toLocaleString()} {currency}</span>
                    {discountPercent != null && (
                      <span className="text-[10px] font-bold text-red-500">{discountPercent}%</span>
                    )}
                  </span>
                ) : (
                  <span>{amount.toLocaleString()} {currency}</span>
                )}
                <span className="text-[10px] text-gray-400 font-normal ml-1">/ {priceUnit}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
              <Users size={16} className="text-blue-600" />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider">Capacity</p>
              <p className="text-sm font-bold text-gray-900">{maxGuests || "—"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
              <Clock size={16} className="text-purple-600" />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider">Duration</p>
              <p className="text-sm font-bold text-gray-900">{duration || "—"}h</p>
            </div>
          </div>
          <div className="flex items-center gap-3 col-span-2 md:col-span-1">
            <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
              <PackageIcon size={16} className="text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-gray-400 uppercase tracking-wider">Services</p>
              <p className="text-sm font-medium text-gray-900 break-words">
                {serviceNames.length > 0 ? serviceNames.join(", ") : "—"}
              </p>
            </div>
          </div>
        </div>

        <div className="p-5 md:p-6 border-b border-gray-100">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl md:text-2xl font-bold text-gray-900">
                  {packageName}
                </h1>
              </div>
              {resolvedCategoryName && (
                <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                  <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs font-medium">
                    {resolvedCategoryName}
                  </span>
                  {showOnHomepage && (
                    <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-xs font-medium">
                      Shown on Promotional Page
                    </span>
                  )}
                </p>
              )}
              {!resolvedCategoryName && showOnHomepage && (
                <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                  <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-xs font-medium">
                    Shown on Promotional Page
                  </span>
                </p>
              )}
            </div>
            <div className="text-right shrink-0">
              {promotionalPrice ? (
                <>
                  <div className="flex flex-col items-end">
                    <div className="flex items-baseline gap-2 flex-wrap justify-end">
                      <span className="text-2xl font-bold text-green-600">
                        {promotionalPrice.toLocaleString()} {currency}
                      </span>
                      <span className="text-sm text-gray-400 line-through">
                        {originalPrice.toLocaleString()} {currency}
                      </span>
                      {discountPercent != null && (
                        <span className="text-sm font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">
                          {discountPercent}%
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 capitalize mt-0.5">
                      / {priceUnit}
                    </span>
                  </div>
                  {discountAmount != null && (
                    <p className="text-xs font-medium text-green-600 mt-0.5">
                      You save {discountAmount.toLocaleString()} {currency}
                    </p>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-end">
                  <div className="flex items-baseline gap-1.5 justify-end flex-wrap">
                    <span className="text-2xl font-bold text-gray-900">
                      {amount.toLocaleString()} {currency}
                    </span>
                    <span className="text-xs text-gray-400 capitalize">
                      / {priceUnit}
                    </span>
                  </div>
                </div>
              )}
              {maxGuests && (
                <p className="text-xs text-gray-400 mt-0.5">
                  min 1 – max {maxGuests} guests
                </p>
              )}
            </div>
          </div>
          {isPromotional && (promotionStart || promotionEnd) && (
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-red-50 border border-red-100 px-3 py-2 text-xs text-red-700">
              <Calendar size={14} className="shrink-0" />
              <span>
                Promotion valid
                {promotionStart &&
                  ` from ${formatDateDDMMYYYY(promotionStart)}`}
                {promotionEnd &&
                  ` to ${formatDateDDMMYYYY(promotionEnd)}`}
              </span>
            </div>
          )}
        </div>

        {pkg.description && (
          <div className="p-5 md:p-6 border-b border-gray-100">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center shrink-0 mt-0.5">
                <Info size={14} className="text-blue-500" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-gray-700 mb-1.5">Description</h2>
                <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">{pkg.description}</p>
              </div>
            </div>
          </div>
        )}

        <div className="p-5 md:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <CheckCircle2 size={16} className="text-green-500" />
                What's Included {includedItems.length > 0 && `(${includedItems.length})`}
              </h2>
              {includedItems.length > 0 ? (
                <div className="space-y-1.5">
                  {displayInclusions.map((item, idx) => (
                    <div 
                      key={idx}
                      className="flex items-start gap-2.5 p-2 bg-gray-50 rounded-lg hover:bg-orange-50 transition-colors"
                    >
                      <CheckCircle2 size={14} className="text-green-500 mt-0.5 shrink-0" />
                      <span className="text-gray-700 text-sm">{item}</span>
                    </div>
                  ))}
                  {hasMoreInclusions && (
                    <button
                      onClick={() => setShowAllInclusions(!showAllInclusions)}
                      className="flex items-center gap-1.5 text-xs font-medium text-orange-500 hover:text-orange-600 mt-2 transition-colors"
                    >
                      {showAllInclusions ? (
                        <>Show Less <ChevronUp size={14} /></>
                      ) : (
                        <>View More ({includedItems.length - 4} more) <ChevronDown size={14} /></>
                      )}
                    </button>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-400">No items listed</p>
              )}
            </div>

            <div>
              <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Sparkles size={16} className="text-purple-500" />
                Features {features.length > 0 && `(${features.length})`}
              </h2>
              {features.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {features.map((feature, idx) => (
                    <span 
                      key={idx}
                      className="px-3 py-1.5 bg-purple-50 text-purple-700 rounded-full text-xs font-medium border border-purple-100"
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">No features listed</p>
              )}
            </div>
          </div>
        </div>

        {(vendorPhone || isRental || hasMinMaxFields) && (
          <div className="p-5 md:p-6 border-t border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Info size={16} className="text-orange-500" />
              Additional Details
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              {minHours != null && maxHours != null && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Clock size={14} className="text-gray-400 shrink-0" />
                  <span>Hours: {minHours}h – {maxHours}h</span>
                </div>
              )}
              {minHours != null && maxHours == null && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Clock size={14} className="text-gray-400 shrink-0" />
                  <span>Min Hours: {minHours}h</span>
                </div>
              )}
              {minHours == null && maxHours != null && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Clock size={14} className="text-gray-400 shrink-0" />
                  <span>Max Hours: {maxHours}h</span>
                </div>
              )}
              {minPersons != null && maxPersons != null && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Users size={14} className="text-gray-400 shrink-0" />
                  <span>Persons: {minPersons} – {maxPersons}</span>
                </div>
              )}
              {minPersons != null && maxPersons == null && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Users size={14} className="text-gray-400 shrink-0" />
                  <span>Min Persons: {minPersons}</span>
                </div>
              )}
              {minPersons == null && maxPersons != null && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Users size={14} className="text-gray-400 shrink-0" />
                  <span>Max Persons: {maxPersons}</span>
                </div>
              )}
              {minPieces != null && maxPieces != null && (
                <div className="flex items-center gap-2 text-gray-600">
                  <PackageIcon size={14} className="text-gray-400 shrink-0" />
                  <span>Pieces: {minPieces} – {maxPieces}</span>
                </div>
              )}
              {minPieces != null && maxPieces == null && (
                <div className="flex items-center gap-2 text-gray-600">
                  <PackageIcon size={14} className="text-gray-400 shrink-0" />
                  <span>Min Pieces: {minPieces}</span>
                </div>
              )}
              {minPieces == null && maxPieces != null && (
                <div className="flex items-center gap-2 text-gray-600">
                  <PackageIcon size={14} className="text-gray-400 shrink-0" />
                  <span>Max Pieces: {maxPieces}</span>
                </div>
              )}
              {minDays != null && maxDays != null && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar size={14} className="text-gray-400 shrink-0" />
                  <span>Days: {minDays} – {maxDays}</span>
                </div>
              )}
              {minDays != null && maxDays == null && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar size={14} className="text-gray-400 shrink-0" />
                  <span>Min Days: {minDays}</span>
                </div>
              )}
              {minDays == null && maxDays != null && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar size={14} className="text-gray-400 shrink-0" />
                  <span>Max Days: {maxDays}</span>
                </div>
              )}
              {isRental && rentalLocation && (
                <div className="flex items-center gap-2 text-gray-600">
                  <MapPin size={14} className="text-gray-400 shrink-0" />
                  <span>{rentalLocation}</span>
                </div>
              )}
              {isRental && serviceArea && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Building2 size={14} className="text-gray-400 shrink-0" />
                  <span>Service area: {serviceArea}</span>
                </div>
              )}
              {isRental && deliveryRadius != null && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Truck size={14} className="text-gray-400 shrink-0" />
                  <span>Delivery radius: {deliveryRadius} km</span>
                </div>
              )}
              {isRental && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Truck size={14} className="text-gray-400 shrink-0" />
                  <span>
                    {deliveryFeeType === "free"
                      ? "Free delivery"
                      : deliveryFee != null
                        ? `Delivery fee: ${deliveryFee} ${currency}`
                        : "Delivery fee not set"}
                  </span>
                </div>
              )}
              {isRental && (
                <div className="flex items-center gap-2 text-gray-600">
                  <CheckCircle2 size={14} className="text-gray-400 shrink-0" />
                  <span>
                    {pickupAvailable ? "Pickup available" : "No pickup"} · {deliveryAvailable ? "Delivery available" : "No delivery"}
                  </span>
                </div>
              )}
              {isRental && requiresDeposit && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Tag size={14} className="text-gray-400 shrink-0" />
                  <span>Deposit required: {depositAmount ?? "—"} {currency}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {deleteConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <button className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteConfirm(false)} aria-label="Close" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 flex flex-col items-center gap-4 animate-in zoom-in-95 duration-200">
            <button onClick={() => setDeleteConfirm(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <X size={18} />
            </button>
            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
              <Trash2 size={28} className="text-red-500" />
            </div>
            <div className="text-center">
              <h2 className="text-xl font-bold text-gray-900">Delete Package?</h2>
              <p className="text-sm text-gray-500 mt-2">"{packageName}" will be permanently deleted.</p>
              <p className="text-xs text-red-500 mt-1">This action cannot be undone.</p>
            </div>
            <div className="flex gap-3 w-full mt-2">
              <button onClick={() => setDeleteConfirm(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
                Cancel
              </button>
              <button onClick={handleDelete} className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition">
                Delete Package
              </button>
            </div>
          </div>
        </div>
      )}

      {toggleConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <button className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setToggleConfirm(false)} aria-label="Close" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 flex flex-col items-center gap-4 animate-in zoom-in-95 duration-200">
            <button onClick={() => setToggleConfirm(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <X size={18} />
            </button>
            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
              pkg.status === "ACTIVE" ? "bg-gray-50" : "bg-green-50"
            }`}>
              {pkg.status === "ACTIVE" 
                ? <ToggleLeft size={28} className="text-gray-500" /> 
                : <ToggleRight size={28} className="text-green-500" />
              }
            </div>
            <div className="text-center">
              <h2 className="text-xl font-bold text-gray-900">
                {pkg.status === "ACTIVE" ? "Deactivate" : "Activate"} Package?
              </h2>
              <p className="text-sm text-gray-500 mt-2">
                {pkg.status === "ACTIVE"
                  ? `"${packageName}" will be hidden from customers.`
                  : `"${packageName}" will become visible to customers.`}
              </p>
            </div>
            <div className="flex gap-3 w-full mt-2">
              <button onClick={() => setToggleConfirm(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
                Cancel
              </button>
              <button
                onClick={handleToggle}
                className={`flex-1 py-2.5 rounded-xl text-white text-sm font-semibold transition ${
                  pkg.status === "ACTIVE" ? "bg-gray-600 hover:bg-gray-700" : "bg-green-500 hover:bg-green-600"
                }`}
              >
                {pkg.status === "ACTIVE" ? "Deactivate" : "Activate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
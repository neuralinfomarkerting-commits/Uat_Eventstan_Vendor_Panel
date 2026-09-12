'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Edit2,
  Tag,
  ToggleLeft,
  ToggleRight,
  MapPin,
  Package,
  Loader2,
  AlertTriangle,
  DollarSign,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  X,
  Eye,
  Plus,
  Users,
  Clock,
} from 'lucide-react';
import { vendorApi } from '@/api/vendorApi';
import { showError } from '@/lib/toast';

interface Service {
  id: string;
  vendorId: string;
  categoryId: string;
  category?: string;
  title: string;
  description: string;
  city: string;
  location?: string;
  price: {
    amount: number;
    currency: string;
  };
  price_min?: number;
  price_max?: number;
  price_unit?: string;
  status: string;
  vendor_name?: string;
  vendor_email?: string;
  vendor_phone?: string;
  tags?: string[];
  gallery?: string[];
  features?: string[];
  image_url?: string;
  rating?: number;
  review_count?: number;
  created_at?: string;
}
type ApiService = Service;

interface PackageItem {
  serviceId: string;
}

interface VendorPackage {
  id: string;
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
  items?: PackageItem[];
  max_guests?: number;
  duration_hours?: number;
  imageUrl?: string;
  isPromotional?: boolean;
  is_promotional?: boolean;
  promotionDiscountType?: 'FLAT' | 'PERCENTAGE' | null;
  promotion_discount_type?: 'FLAT' | 'PERCENTAGE' | null;
  promotionDiscountValue?: number | null;
  promotion_discount_value?: number | null;
}

function packageBaseAmount(pkg: VendorPackage) {
  return pkg.money?.amount ?? pkg.amount ?? pkg.price ?? 0;
}

function packageCurrency(pkg: VendorPackage) {
  return pkg.money?.currency ?? pkg.currency ?? 'AED';
}

function promotionalMeta(pkg: VendorPackage) {
  const isPromotional = Boolean(pkg.isPromotional || pkg.is_promotional);
  const discountType = pkg.promotionDiscountType || pkg.promotion_discount_type || null;
  const discountValue = pkg.promotionDiscountValue ?? pkg.promotion_discount_value ?? 0;
  const amount = packageBaseAmount(pkg);

  if (!isPromotional || !discountType || !discountValue) {
    return { isPromotional: false, discountType, discountValue, finalAmount: amount };
  }

  const finalAmount =
    discountType === 'FLAT'
      ? Math.max(0, amount - discountValue)
      : Math.max(0, amount - Math.round((amount * discountValue) / 100));

  return { isPromotional: true, discountType, discountValue, finalAmount };
}

function packagePrice(pkg: VendorPackage) {
  const amount = pkg.money?.amount ?? pkg.amount ?? pkg.price ?? 0;
  const currency = pkg.money?.currency ?? pkg.currency ?? 'AED';
  return `${amount.toLocaleString()} ${currency}`;
}

function packageServiceIds(pkg: VendorPackage): string[] {
  if (pkg.items?.length) return pkg.items.map((i) => i.serviceId);
  return pkg.itemIds ?? [];
}

const CATEGORY_COLORS: Record<string, string> = {
  cat_wedding: 'bg-pink-50 text-pink-700 border-pink-200',
  cat_corporate: 'bg-blue-50 text-blue-700 border-blue-200',
  cat_birthday: 'bg-purple-50 text-purple-700 border-purple-200',
  cat_concert: 'bg-red-50 text-red-700 border-red-200',
  default: 'bg-gray-100 text-gray-600 border-gray-200',
};

const formatCategory = (categoryId: string) => {
  if (categoryId.startsWith('cat_')) {
    const label = categoryId.replace('cat_', '');
    return label.charAt(0).toUpperCase() + label.slice(1);
  }
  return categoryId.charAt(0).toUpperCase() + categoryId.slice(1);
};

export default function ServiceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [mainImageError, setMainImageError] = useState(false);
  const [relatedPackages, setRelatedPackages] = useState<VendorPackage[]>([]);
  const [packagesLoading, setPackagesLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (!id) return;

    const fetchService = async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await vendorApi.services.get<ApiService>(id);

        const transformedService: Service = {
          ...data,
        };

        setService(transformedService);
      } catch (err: unknown) {
        console.error('Error fetching service:', err);
        const msg = err instanceof Error ? err.message : 'Failed to load service';
        setError(msg);
        showError(msg);
      } finally {
        setLoading(false);
      }
    };

    fetchService();
  }, [id]);

  useEffect(() => {
    if (!id) return;

    const fetchPackages = async () => {
      try {
        setPackagesLoading(true);
        const data = await vendorApi.packages.list<VendorPackage[]>();
        setRelatedPackages(
          (data || []).filter(
            (pkg) =>
              packageServiceIds(pkg).includes(id) &&
              promotionalMeta(pkg).isPromotional
          )
        );
      } catch (err) {
        console.error('Error fetching packages:', err);
      } finally {
        setPackagesLoading(false);
      }
    };

    fetchPackages();
  }, [id]);

  // Get all images for gallery
  const getAllImages = (): string[] => {
    const images: string[] = [];
    if (service?.image_url && !mainImageError) {
      images.push(service.image_url);
    }
    if (service?.gallery && service.gallery.length > 0) {
      images.push(...service.gallery);
    }
    return images;
  };

  const images = getAllImages();
  const hasImages = images.length > 0;

  const openLightbox = (index: number) => {
    setSelectedImageIndex(index);
  };

  const closeLightbox = () => {
    setSelectedImageIndex(null);
  };

  const nextImage = () => {
    if (selectedImageIndex !== null && selectedImageIndex < images.length - 1) {
      setSelectedImageIndex(selectedImageIndex + 1);
    }
  };

  const prevImage = () => {
    if (selectedImageIndex !== null && selectedImageIndex > 0) {
      setSelectedImageIndex(selectedImageIndex - 1);
    }
  };

  // Handle keyboard navigation for lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedImageIndex !== null) {
        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowRight') nextImage();
        if (e.key === 'ArrowLeft') prevImage();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedImageIndex]);

  // Auto-slide the main gallery image
  useEffect(() => {
    if (images.length <= 1 || isPaused || selectedImageIndex !== null) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % images.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [images.length, isPaused, selectedImageIndex]);

  // Keep currentSlide in range if images list shrinks/changes
  useEffect(() => {
    if (currentSlide >= images.length) {
      setCurrentSlide(0);
    }
  }, [images.length, currentSlide]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 size={48} className="animate-spin text-orange-500 mb-4" />
        <p className="text-gray-500">Loading service details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-4">
          <AlertTriangle size={40} className="text-red-500 mx-auto mb-3" />
          <p className="text-gray-800 font-medium mb-2">Error Loading Service</p>
          <p className="text-sm text-gray-600">{error}</p>
        </div>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm hover:bg-orange-600"
          >
            Retry
          </button>
          <button
            onClick={() => router.push('/vendor/services')}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50"
          >
            Back to Services
          </button>
        </div>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
          <p className="text-gray-800 font-medium">Service not found</p>
          <button
            onClick={() => router.push('/vendor/services')}
            className="mt-4 text-orange-500 text-sm font-medium hover:text-orange-600 underline"
          >
            Back to Services
          </button>
        </div>
      </div>
    );
  }

  const displayCategory = service.category || formatCategory(service.categoryId);
  const displayCity = service.location || service.city;
  const minAmount = service.price_min ?? service.price?.amount ?? 0;
  const maxAmount = service.price_max ?? minAmount;
  const currency = service.price?.currency || 'AED';
  const priceRange = `${minAmount.toLocaleString()} - ${maxAmount.toLocaleString()} ${currency}`;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{service.title}</h1>
            <p className="text-xs text-gray-400 mt-0.5">
             • {service.vendor_name ? `Vendor: ${service.vendor_name}` : `Vendor ID: ${service.vendorId}`}
            </p>
          </div>
        </div>
        <Link
          href={`/vendor/services/edit/${service.id}`}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-colors"
        >
          <Edit2 size={15} />
          Edit Service
        </Link>
      </div>

      {/* Image Gallery Section */}
      {hasImages ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <ImageIcon size={18} className="text-orange-500" />
            <p className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Gallery</p>
            <span className="text-xs text-gray-400">({images.length} images)</span>
          </div>

          {/* Main Image - Auto Slider */}
          <div
            className="relative aspect-video bg-gray-100 rounded-xl overflow-hidden cursor-pointer mb-4"
            onClick={() => openLightbox(currentSlide)}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            {images.map((image, index) => (
              <img
                key={index}
                src={image}
                alt={`${service.title} - ${index + 1}`}
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ease-in-out ${
                  index === currentSlide ? 'opacity-100' : 'opacity-0'
                }`}
                onError={(e) => {
                  if (image === service.image_url) {
                    setMainImageError(true);
                  }
                }}
              />
            ))}

            {/* Prev / Next arrows */}
            {images.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentSlide((prev) => (prev - 1 + images.length) % images.length);
                  }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1.5 transition-colors"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentSlide((prev) => (prev + 1) % images.length);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1.5 transition-colors"
                >
                  <ChevronRight size={20} />
                </button>

                {/* Dots */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {images.map((_, index) => (
                    <button
                      key={index}
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentSlide(index);
                      }}
                      className={`h-1.5 rounded-full transition-all ${
                        index === currentSlide ? 'w-5 bg-white' : 'w-1.5 bg-white/50'
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Thumbnail Grid */}
          {images.length > 1 && (
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
              {images.slice(1, 9).map((image, index) => (
                <div
                  key={index}
                  className={`aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity ${
                    index + 1 === currentSlide ? 'ring-2 ring-orange-500' : ''
                  }`}
                  onClick={() => {
                    setCurrentSlide(index + 1);
                    openLightbox(index + 1);
                  }}
                >
                  <img
                    src={image}
                    alt={`${service.title} - ${index + 2}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
              {images.length > 9 && (
                <div
                  className="aspect-square bg-gray-200 rounded-lg flex items-center justify-center cursor-pointer hover:bg-gray-300 transition-colors"
                  onClick={() => openLightbox(9)}
                >
                  <span className="text-sm font-medium text-gray-600">+{images.length - 9}</span>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 text-center">
          <ImageIcon size={32} className="text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No images available</p>
        </div>
      )}

      {/* Lightbox Modal */}
      {selectedImageIndex !== null && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center"
          onClick={closeLightbox}
        >
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors z-10"
          >
            <X size={32} />
          </button>

          {images.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  prevImage();
                }}
                className="absolute left-4 text-white hover:text-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={selectedImageIndex === 0}
              >
                <ChevronLeft size={40} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  nextImage();
                }}
                className="absolute right-4 text-white hover:text-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={selectedImageIndex === images.length - 1}
              >
                <ChevronRight size={40} />
              </button>
            </>
          )}

          <div
            className="max-w-[90vw] max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={images[selectedImageIndex]}
              alt={`${service.title} - ${selectedImageIndex + 1}`}
              className="max-w-full max-h-[90vh] object-contain"
            />
            <div className="absolute bottom-4 left-0 right-0 text-center text-white text-sm">
              {selectedImageIndex + 1} / {images.length}
            </div>
          </div>
        </div>
      )}

      {/* Details Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Status</p>
          <span
            className={`inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-full ${
              service.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
            }`}
          >
            {service.status === 'ACTIVE'
              ? <ToggleRight size={16} className="text-green-500" />
              : <ToggleLeft size={16} />
            }
            {service.status === 'ACTIVE' ? 'Active' : 'Inactive'}
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Category</p>
          <span
            className={`inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-full border ${
              CATEGORY_COLORS[service.categoryId] ?? CATEGORY_COLORS.default
            }`}
          >
            <Tag size={13} />
            {displayCategory}
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Service Price Range</p>
          <div className="flex items-center gap-2">
            <DollarSign size={16} className="text-orange-400" />
            <span className="text-xl font-bold text-gray-900">
              {priceRange}
            </span>
          </div>
          {service.price_unit && (
            <p className="text-xs text-gray-400 mt-0.5">{service.price_unit}</p>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Location</p>
          <div className="flex items-center gap-2">
            <MapPin size={16} className="text-gray-400" />
            <span className="text-sm font-medium text-gray-700">{displayCity}</span>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Description</p>
        <p className="text-sm text-gray-700 leading-relaxed">{service.description}</p>
      </div>

      {/* Rating */}
      {service.rating !== undefined && service.rating > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Rating</p>
          <div className="flex items-center gap-2">
            <div className="flex items-center">
              <span className="text-yellow-500 text-lg">★</span>
              <span className="font-bold text-gray-900 ml-1">{service.rating}</span>
            </div>
            {service.review_count !== undefined && (
              <span className="text-sm text-gray-500">({service.review_count} reviews)</span>
            )}
          </div>
        </div>
      )}

      {/* Tags */}
      {service.tags && service.tags.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Tags</p>
          <div className="flex flex-wrap gap-2">
            {service.tags.map((tag, index) => (
              <span key={index} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* What's Included */}
      {service.features && service.features.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">What's Included</p>
          <div className="flex flex-wrap gap-2">
            {service.features.map((feature, index) => (
              <span key={index} className="px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded-full">
                {feature}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Related Packages */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-xl font-bold text-gray-900">Available Packages</h2>
          {!packagesLoading && relatedPackages.length > 0 && (
            <Link
              href={`/vendor/packages/add`}
              className="inline-flex items-center gap-1 text-xs font-semibold text-orange-500 hover:text-orange-600"
            >
              <Plus size={13} />
              Add Package
            </Link>
          )}
        </div>
        <p className="text-sm text-gray-500 mb-5">
          Packages created from this service — fixed price, no surprises
        </p>

        {packagesLoading ? (
          <div className="flex items-center gap-2 text-sm text-gray-400 py-4">
            <Loader2 size={16} className="animate-spin" />
            Loading packages...
          </div>
        ) : relatedPackages.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {relatedPackages.map((pkg) => (
              <div
                key={pkg.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col"
              >
                {/* Image */}
                <div className="relative h-48 flex-shrink-0 bg-gray-100">
                  {pkg.imageUrl || service?.image_url ? (
                    <img
                      src={pkg.imageUrl || service?.image_url}
                      alt={pkg.title || pkg.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon size={32} className="text-gray-300" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                  <span className="absolute top-3 left-3 bg-white/20 backdrop-blur-sm text-white text-xs font-semibold px-2.5 py-1 rounded-full border border-white/30">
                    {displayCategory}
                  </span>
                  <span
                    className={`absolute top-3 right-3 text-xs font-semibold px-2.5 py-1 rounded-full ${
                      pkg.status === 'ACTIVE'
                        ? 'bg-green-500/90 text-white'
                        : 'bg-gray-500/80 text-white'
                    }`}
                  >
                    {pkg.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                  </span>
                  {promotionalMeta(pkg).isPromotional && (
                    <span className="absolute top-3 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow">
                      {promotionalMeta(pkg).discountType === 'FLAT'
                        ? `${promotionalMeta(pkg).discountValue} ${packageCurrency(pkg)} OFF`
                        : `${promotionalMeta(pkg).discountValue}% OFF`}
                    </span>
                  )}
                  <div className="absolute bottom-3 left-3 right-3">
                    <p className="text-white/70 text-xs">{service.vendor_name}</p>
                  </div>
                </div>

                {/* Body */}
                <div className="p-4 flex flex-col flex-1">
                  {promotionalMeta(pkg).isPromotional && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-600 uppercase tracking-wide mb-1.5 w-fit">
                      <Tag size={11} />
                      Promotional Package
                    </span>
                  )}
                  <p className="font-bold text-gray-900 text-base leading-tight mb-2">
                    {pkg.title || pkg.name}
                  </p>
                  {pkg.description && (
                    <p className="text-gray-500 text-sm mb-3 leading-relaxed line-clamp-2">
                      {pkg.description}
                    </p>
                  )}

                  {/* Meta chips */}
                  {(pkg.max_guests || pkg.duration_hours) && (
                    <div className="flex flex-wrap gap-3 mb-3 text-xs text-gray-500">
                      {pkg.max_guests && (
                        <span className="flex items-center gap-1">
                          <Users size={14} />
                          Up to {pkg.max_guests} guests
                        </span>
                      )}
                      {pkg.duration_hours && (
                        <span className="flex items-center gap-1">
                          <Clock size={14} />
                          {pkg.duration_hours}h
                        </span>
                      )}
                    </div>
                  )}

                  {/* Price */}
                  <div className="mt-auto pt-1">
                    {promotionalMeta(pkg).isPromotional ? (
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-2xl font-bold text-orange-600">
                          {promotionalMeta(pkg).finalAmount.toLocaleString()} {packageCurrency(pkg)}
                        </span>
                        <span className="text-sm text-gray-400 line-through">
                          {packageBaseAmount(pkg).toLocaleString()} {packageCurrency(pkg)}
                        </span>
                        <span className="text-xs font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                          {promotionalMeta(pkg).discountType === 'FLAT'
                            ? `${promotionalMeta(pkg).discountValue} ${packageCurrency(pkg)} off`
                            : `${promotionalMeta(pkg).discountValue}% off`}
                        </span>
                      </div>
                    ) : (
                      <span className="text-2xl font-bold text-gray-900">
                        {packagePrice(pkg)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Package size={32} className="text-gray-300 mx-auto" />
            <p className="text-sm text-gray-500 mb-2 mt-3">No Package created yet.</p>
            <Link
              href={`/vendor/packages/add`}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-orange-500 hover:text-orange-600"
            >
              <Plus size={14} />
              Create Package
            </Link>
          </div>
        )}
      </div>

      {/* Vendor Info */}
      {/* {(service.vendor_name || service.vendor_email || service.vendor_phone) && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Vendor Information</p>
          <div className="space-y-2 text-sm">
            {service.vendor_name && <p><span className="font-medium text-gray-600">Name:</span> {service.vendor_name}</p>}
            {service.vendor_email && <p><span className="font-medium text-gray-600">Email:</span> {service.vendor_email}</p>}
            {service.vendor_phone && <p><span className="font-medium text-gray-600">Phone:</span> {service.vendor_phone}</p>}
          </div>
        </div>
      )} */}

      {/* Back Link */}
      <div className="pb-4">
        <Link
          href="/vendor/services"
          className="text-sm text-orange-500 hover:text-orange-600 flex items-center gap-1"
        >
          <ArrowLeft size={14} />
          Back to All Services
        </Link>
      </div>
    </div>
  );
}
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ImagePlus,
  Loader2,
  Save,
  Tag,
  Upload,
  X,
} from "lucide-react";
import { vendorApi } from "@/api/vendorApi";
import { getUser } from "@/lib/auth";
import { findPriceUnit, PriceUnitMaster } from "@/lib/priceUnits";
import SearchableSelectField from "@/components/vendor/SearchableSelectField";
import { showError, showSuccess } from "@/lib/toast";

interface ApiCity {
  id: string;
  name: string;
  status: string;
}

interface ApiCountry {
  id: number;
  code: string;
  defaultCurrency: string;
}

const STATUS_OPTIONS = [
  { id: "ACTIVE", name: "Active" },
  { id: "INACTIVE", name: "Inactive" },
  { id: "DRAFT", name: "Draft" },
] as const;

const emptyForm = {
  title: "",
  slug: "",
  description: "",
  city: "",
  amount: "",
  currency: "AED",
  priceMax: "",
  priceUnit: "per event",
  minPieces: "",
  maxPieces: "",
  tags: [] as string[],
  features: [] as string[],
  imageUrl: "",
  categoryId: "",
  status: "ACTIVE",
};

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function getVendorId(): string {
  return getUser()?.vendorId ?? "";
}

export default function AddServicePage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [categories, setCategories] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [priceUnits, setPriceUnits] = useState<PriceUnitMaster[]>([]);
  const [cities, setCities] = useState<ApiCity[]>([]);
  const [mainImage, setMainImage] = useState<{
    file: File | null;
    preview: string;
  }>({ file: null, preview: "" });
  const [galleryImages, setGalleryImages] = useState<
    { file: File; preview: string }[]
  >([]);
  const [tagsInput, setTagsInput] = useState("");
  const [featuresInput, setFeaturesInput] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [slugStatus, setSlugStatus] = useState<
    "idle" | "checking" | "available" | "taken"
  >("idle");

  useEffect(() => {
    const id = getVendorId();
    if (!id) {
      queueMicrotask(() => {
        const msg =
          "Vendor information not found. Please ensure you are logged in as a vendor.";
        setError(msg);
        showError(msg);
      });
    } else {
      queueMicrotask(() => setVendorId(id));
    }

    const fetchMasterData = async () => {
      let uaeCountryId: number | undefined;
      try {
        const [countryRows, categoryRows, fetchedPriceUnits] =
          await Promise.all([
            vendorApi.masterData.countries<ApiCountry[]>(),
            vendorApi.masterData.categories<
              Array<{ id: string; name: string }>
            >(),
            vendorApi.masterData.priceUnits<PriceUnitMaster[]>(),
          ]);
        const uae = countryRows.find((country) => country.code === "AE");
        uaeCountryId = uae?.id;
        const activePriceUnits = fetchedPriceUnits.filter((unit) => unit.isActive);
        setCategories(categoryRows);
        setPriceUnits(activePriceUnits);
        setForm((current) => ({
          ...current,
          currency: uae?.defaultCurrency ?? current.currency,
          categoryId: current.categoryId,
          priceUnit: current.priceUnit || activePriceUnits[0]?.code || "per event",
        }));
      } catch (err) {
        console.error("Error fetching master data:", err);
      }

      // Fetch cities independently — if this fails (e.g. endpoint missing),
      // it should not block category / price unit / currency from loading.
      // Pass the UAE countryId (when known) so we only fetch UAE cities
      // instead of the entire global city list.
      try {
        const cityRows = await vendorApi.masterData.cities<ApiCity[]>(uaeCountryId);
        setCities(
          Array.isArray(cityRows)
            ? cityRows.filter((c) => c.status === "Active")
            : [],
        );
      } catch (err) {
        console.error("Error fetching cities:", err);
        setCities([]);
      }
    };

    void fetchMasterData();
  }, []);

  useEffect(() => {
    return () => {
      if (mainImage.preview.startsWith("blob:")) {
        URL.revokeObjectURL(mainImage.preview);
      }
      galleryImages.forEach((img) => {
        if (img.preview.startsWith("blob:")) {
          URL.revokeObjectURL(img.preview);
        }
      });
    };
  }, [galleryImages, mainImage.preview]);

  const setFormField = <K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
    setError("");
  };

  useEffect(() => {
    if (slugEdited) return;
    setForm((current) => ({ ...current, slug: slugify(current.title) }));
  }, [form.title, slugEdited]);

  useEffect(() => {
    const candidate = slugify(form.slug);
    if (!candidate) {
      setSlugStatus("idle");
      return;
    }

    setSlugStatus("checking");
    const timer = window.setTimeout(async () => {
      try {
        const result = await vendorApi.services.checkSlug<{
          slug: string;
          available: boolean;
        }>(
          candidate,
        );
        setForm((current) => ({ ...current, slug: result.slug }));
        setSlugStatus(result.available ? "available" : "taken");
      } catch {
        setSlugStatus("idle");
      }
    }, 400);

    return () => window.clearTimeout(timer);
  }, [form.slug]);

  const handleMainImageUpload = async (file?: File) => {
    if (!file) return;
    try {
      setUploading(true);
      if (mainImage.preview.startsWith("blob:")) {
        URL.revokeObjectURL(mainImage.preview);
      }
      const preview = URL.createObjectURL(file);
      setMainImage({ file, preview });
      const result = await vendorApi.uploads.image(file, "services");
      setFormField("imageUrl", result.url);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Image upload failed";
      setError(msg);
      showError(msg);
    } finally {
      setUploading(false);
    }
  };

  const handleGalleryUpload = (files: FileList | null) => {
    if (!files) return;
    const newImages = Array.from(files).map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setGalleryImages((prev) => [...prev, ...newImages]);
  };

  const removeGalleryImage = (index: number) => {
    const image = galleryImages[index];
    if (image?.preview.startsWith("blob:")) {
      URL.revokeObjectURL(image.preview);
    }
    setGalleryImages((prev) =>
      prev.filter((_, currentIndex) => currentIndex !== index),
    );
  };

  const addTag = () => {
    const value = tagsInput.trim();
    if (!value || form.tags.includes(value)) return;
    setFormField("tags", [...form.tags, value]);
    setTagsInput("");
  };

  const removeTag = (tag: string) => {
    setFormField(
      "tags",
      form.tags.filter((current) => current !== tag),
    );
  };

  const addFeature = () => {
    const value = featuresInput.trim();
    if (!value || form.features.includes(value)) return;
    setFormField("features", [...form.features, value]);
    setFeaturesInput("");
  };

  const removeFeature = (feature: string) => {
    setFormField(
      "features",
      form.features.filter((current) => current !== feature),
    );
  };

  const uploadGalleryImages = async (): Promise<string[]> => {
    const galleryUrls: string[] = [];
    for (const image of galleryImages) {
      const result = await vendorApi.uploads.image(image.file, "services");
      galleryUrls.push(result.url);
    }
    return galleryUrls;
  };

  const validate = () => {
    if (!form.categoryId) return "Category is required.";
    if (!form.title.trim()) return "Service title is required.";
    if (!slugify(form.slug)) return "Service slug is required.";
    if (slugStatus === "taken") return "Service slug is already in use.";
    if (!form.imageUrl) return "Main image is required.";
    if (!form.description.trim()) return "Description is required.";
    if (!form.city.trim()) return "City is required.";
    if (!form.status) return "Status is required.";
    if (!form.amount || Number(form.amount) <= 0)
      return "Valid starting price is required.";
    if (form.priceMax && Number(form.priceMax) < Number(form.amount))
      return "Max price cannot be less than starting price.";

    const selectedPriceUnit = findPriceUnit(priceUnits, form.priceUnit);

    if (selectedPriceUnit?.requiresPieceRange) {
      if (!form.minPieces || Number(form.minPieces) <= 0)
        return "Minimum pieces is required and must be greater than 0.";
      if (!form.maxPieces || Number(form.maxPieces) <= 0)
        return "Maximum pieces is required and must be greater than 0.";
      if (Number(form.minPieces) > Number(form.maxPieces))
        return "Minimum pieces cannot be greater than maximum pieces.";
    }

    return "";
  };

  const save = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      showError(validationError);
      return;
    }

    if (!vendorId) {
      const msg = "Vendor information not found. Please logout and login again.";
      setError(msg);
      showError(msg);
      return;
    }

    try {
      setSaving(true);
      setError("");

      const galleryUrls = await uploadGalleryImages();
      const selectedPriceUnit = findPriceUnit(priceUnits, form.priceUnit);

      const servicePayload: Record<string, unknown> = {
        vendorId,
        categoryId: form.categoryId,
        status: form.status,
        title: form.title.trim(),
        slug: slugify(form.slug),
        description: form.description.trim(),
        city: form.city.trim(),
        priceMin: Number(form.amount),
        currency: form.currency,
        priceMax: form.priceMax ? Number(form.priceMax) : Number(form.amount),
        priceUnit: form.priceUnit,
        imageUrl: form.imageUrl || undefined,
        tags: form.tags.length > 0 ? form.tags : undefined,
        gallery: galleryUrls.length > 0 ? galleryUrls : undefined,
        features: form.features.length > 0 ? form.features : undefined,
      };

      if (selectedPriceUnit?.requiresPieceRange) {
        servicePayload.minPieces = Number(form.minPieces);
        servicePayload.maxPieces = Number(form.maxPieces);
      }

      await vendorApi.services.create(servicePayload);

      showSuccess("Service created successfully!");
      router.push("/vendor/services");
    } catch (err) {
      console.error("Save error:", err);
      const msg = err instanceof Error ? err.message : "Failed to create service";
      setError(msg);
      showError(msg);
    } finally {
      setSaving(false);
    }
  };

  const selectedPriceUnit = findPriceUnit(priceUnits, form.priceUnit);
  const showPieceFields = Boolean(selectedPriceUnit?.requiresPieceRange);

  return (
    <div className="max-w-5xl mx-auto space-y-4 pb-3">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="flex h-10 w-10 items-center justify-center rounded-2xl border border-gray-200 bg-white text-gray-600 shadow-sm transition hover:-translate-y-0.5 hover:bg-gray-50"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-gray-950">
            Add New Service
          </h1>
          <p className="text-sm text-gray-500">
            Create a service page that vendors can attach packages to later.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-white rounded-[22px] border border-gray-100 p-5 shadow-sm space-y-4">
          <h2 className="font-semibold text-gray-800 text-sm uppercase tracking-wide">
            Basic Information
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-4">
            <div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-1.5 block">
                    Category *
                  </label>
                  <SearchableSelectField
                    value={form.categoryId}
                    onChange={(v) => setFormField("categoryId", v)}
                    options={categories.map((category) => ({
                      value: category.id,
                      label: category.name,
                    }))}
                    placeholder="Select category"
                    searchPlaceholder="Search categories..."
                    emptyLabel="No categories found"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-1.5 block">
                    Service Title *
                  </label>
                  <input
                    value={form.title}
                    onChange={(e) => setFormField("title", e.target.value)}
                    className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400"
                    placeholder="e.g., Wedding Decor"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-1.5 block">
                    Service Slug *
                  </label>
                  <input
                    value={form.slug}
                    readOnly
                    className="w-full px-4 py-2.5 text-sm border border-gray-100 bg-gray-50 text-gray-400 rounded-xl focus:outline-none cursor-not-allowed"
                    placeholder="wedding-decor"
                  />
                  <p
                    className={`mt-1 text-xs ${slugStatus === "taken" ? "text-red-500" : slugStatus === "available" ? "text-emerald-600" : "text-gray-400"}`}
                  >
                    {slugStatus === "checking" &&
                      "Checking slug availability..."}
                    {slugStatus === "available" && "Slug is available"}
                    {slugStatus === "taken" && "Slug is already taken"}
                    {slugStatus === "idle" &&
                      "This slug will be used in the customer service URL."}
                  </p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-1.5 block">
                    Status *
                  </label>
                  <SearchableSelectField
                    value={form.status}
                    onChange={(v) => setFormField("status", v)}
                    options={STATUS_OPTIONS.map((statusOption) => ({
                      value: statusOption.id,
                      label: statusOption.name,
                    }))}
                    placeholder="Select status"
                    searchPlaceholder="Search status..."
                  />
                </div>

              </div>
            </div>

            <div>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-700 mb-1.5 block">
                      City *
                    </label>
                    <SearchableSelectField
                      value={form.city}
                      onChange={(v) => setFormField("city", v)}
                      options={cities.map((city) => ({
                        value: city.name,
                        label: city.name,
                      }))}
                      placeholder="Select city"
                      searchPlaceholder="Search cities..."
                      emptyLabel="No cities found"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-700 mb-1.5 block">
                      Price Unit *
                    </label>
                    <SearchableSelectField
                      value={form.priceUnit}
                      onChange={(v) => setFormField("priceUnit", v)}
                      options={priceUnits.map((unit) => ({
                        value: unit.code,
                        label: unit.label,
                      }))}
                      placeholder="Select price unit"
                      searchPlaceholder="Search price units..."
                      emptyLabel="No price units found"
                    />
                  </div>
                </div>

                {showPieceFields && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-gray-700 mb-1.5 block">
                        Min Pieces *
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={form.minPieces}
                        onChange={(e) => setFormField("minPieces", e.target.value)}
                        className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400"
                        placeholder="1"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-700 mb-1.5 block">
                        Max Pieces *
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={form.maxPieces}
                        onChange={(e) => setFormField("maxPieces", e.target.value)}
                        className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400"
                        placeholder="10"
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-700 mb-1.5 block">
                      Starting Price *
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={form.amount}
                      onChange={(e) => setFormField("amount", e.target.value)}
                      className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400"
                      placeholder="800"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-700 mb-1.5 block">
                      Max Price
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={form.priceMax}
                      onChange={(e) => setFormField("priceMax", e.target.value)}
                      className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400"
                      placeholder="5000"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-700 mb-1.5 block">
                      Currency *
                    </label>
                    <input
                      value={form.currency}
                      readOnly
                      onChange={(e) =>
                        setFormField("currency", e.target.value.toUpperCase())
                      }
                      className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400"
                      placeholder="AED"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-700 mb-1.5 block">
              Description *
            </label>
            <textarea
              value={form.description}
              onChange={(e) =>
                setFormField("description", e.target.value.slice(0, 500))
              }
              rows={4}
              maxLength={500}
              className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400 resize-none"
              placeholder="Describe the service. Customers will book packages under this service."
            />
            <p className="mt-1 text-xs text-gray-400 text-right">
              {form.description.length} / 500 used &middot;{" "}
              {500 - form.description.length} remaining
            </p>
          </div>
        </div>

        <div className="bg-white rounded-[22px] border border-gray-100 p-5 shadow-sm space-y-4">
          <h2 className="font-semibold text-gray-800 text-sm uppercase tracking-wide">
            Images
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-700 mb-2 block">
                Main Image <span className="text-red-500">*</span>
              </label>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) =>
                  void handleMainImageUpload(e.target.files?.[0])
                }
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full border border-dashed border-gray-300 rounded-2xl px-5 py-6 text-center hover:border-orange-300 hover:bg-orange-50/40 transition-colors"
              >
                {mainImage.preview ? (
                  <img
                    src={mainImage.preview}
                    alt="Main preview"
                    className="w-full max-h-56 object-cover rounded-xl"
                  />
                ) : (
                  <div className="space-y-2 text-gray-500">
                    {uploading ? (
                      <Loader2
                        size={24}
                        className="animate-spin mx-auto text-orange-500"
                      />
                    ) : (
                      <ImagePlus
                        size={24}
                        className="mx-auto text-orange-400"
                      />
                    )}
                    <p className="text-sm font-medium">Upload main image</p>
                  </div>
                )}
              </button>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 mb-2 block">
                Gallery Images
              </label>
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleGalleryUpload(e.target.files)}
              />
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                className="w-full border border-dashed border-gray-300 rounded-2xl px-5 py-6 text-center hover:border-orange-300 hover:bg-orange-50/40 transition-colors"
              >
                <Upload size={22} className="mx-auto text-orange-400 mb-2" />
                <p className="text-sm font-medium text-gray-700">
                  Add gallery images
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  These support the service page. Booking still happens through
                  packages.
                </p>
              </button>

              {galleryImages.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
                  {galleryImages.map((image, index) => (
                    <div
                      key={`${image.file.name}-${index}`}
                      className="relative rounded-xl overflow-hidden border border-gray-100 bg-gray-50"
                    >
                      <img
                        src={image.preview}
                        alt={`Gallery ${index + 1}`}
                        className="w-full h-24 object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeGalleryImage(index)}
                        className="absolute top-2 right-2 p-1 rounded-full bg-white/90 text-gray-600 hover:text-red-500"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-[22px] border border-gray-100 p-5 shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="space-y-4">
              <h2 className="font-semibold text-gray-800 text-sm uppercase tracking-wide">
                Tags
              </h2>
              <div className="flex gap-2">
                <input
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                  className="flex-1 px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400"
                  placeholder="Add tags like Wedding, Luxury, Indoor"
                />
                <button
                  type="button"
                  onClick={addTag}
                  className="px-4 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600"
                >
                  <Tag size={16} />
                </button>
              </div>
              {form.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {form.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-orange-50 text-orange-700 text-xs font-medium"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="text-orange-500 hover:text-orange-700"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <h2 className="font-semibold text-gray-800 text-sm uppercase tracking-wide">
                What's Included
              </h2>
              <p className="text-xs text-gray-500">
                Add multiple included items, one by one.
              </p>
              <div className="flex gap-2">
                <input
                  value={featuresInput}
                  onChange={(e) => setFeaturesInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addFeature();
                    }
                  }}
                  className="flex-1 px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400"
                  placeholder="Add included items like Custom floral arrangements"
                />
                <button
                  type="button"
                  onClick={addFeature}
                  className="px-4 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600"
                >
                  <CheckCircle2 size={16} />
                </button>
              </div>
              {form.features.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {form.features.map((feature) => (
                    <span
                      key={feature}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 text-xs font-medium"
                    >
                      {feature}
                      <button
                        type="button"
                        onClick={() => removeFeature(feature)}
                        className="text-blue-500 hover:text-blue-700"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pb-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 disabled:opacity-60"
        >
          {saving ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Save size={16} />
          )}
          Save Service
        </button>
      </div>
    </div>
  );
}

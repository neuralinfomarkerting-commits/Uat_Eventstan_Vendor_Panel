"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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

interface ApiService {
  id: string;
  slug?: string;
  vendorId: string;
  categoryId: string;
  category?: string;
  status: string;
  title: string;
  description?: string;
  city?: string;
  price?: { amount: number; currency: string };
  price_max?: number;
  price_unit?: string;
  minHours?: number;
  maxHours?: number;
  minPersons?: number;
  maxPersons?: number;
  minPieces?: number;
  maxPieces?: number;
  image_url?: string;
  tags?: string[];
  gallery?: string[];
  features?: string[];
}

type SlugCheckResult = { slug: string; available: boolean };

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
  status: "ACTIVE",
  tags: [] as string[],
  features: [] as string[],
  imageUrl: "",
  categoryId: "",
};

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export default function EditServicePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const fileRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [service, setService] = useState<ApiService | null>(null);
  const [priceUnits, setPriceUnits] = useState<PriceUnitMaster[]>([]);
  const [categories, setCategories] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [cities, setCities] = useState<ApiCity[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [mainImage, setMainImage] = useState<{
    file: File | null;
    preview: string;
  }>({ file: null, preview: "" });
  const [galleryImages, setGalleryImages] = useState<
    { file: File; preview: string }[]
  >([]);
  const [existingGallery, setExistingGallery] = useState<string[]>([]);
  const [tagsInput, setTagsInput] = useState("");
  const [featuresInput, setFeaturesInput] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [slugStatus, setSlugStatus] = useState<
    "idle" | "checking" | "available" | "taken"
  >("idle");

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      try {
        setLoading(true);
        setError("");
        const [data, fetchedPriceUnits, categoryRows, countryRows] =
          await Promise.all([
            vendorApi.services.get<ApiService>(id),
            vendorApi.masterData.priceUnits<PriceUnitMaster[]>(),
            vendorApi.masterData.categories<
              Array<{ id: string; name: string }>
            >(),
            vendorApi.masterData.countries<ApiCountry[]>(),
          ]);
        setService(data);
        const activePriceUnits = fetchedPriceUnits.filter((unit) => unit.isActive);
        setPriceUnits(activePriceUnits);
        setCategories(categoryRows);
        setForm({
          title: data.title || "",
          slug: data.slug || slugify(data.title || ""),
          description: data.description || "",
          city: data.city || "",
          amount: String(data.price?.amount ?? ""),
          currency: "AED",
          priceMax: String(data.price_max ?? ""),
          priceUnit:
            findPriceUnit(activePriceUnits, data.price_unit)?.code ||
            activePriceUnits[0]?.code ||
            "per event",
          minPieces: String(data.minPieces ?? ""),
          maxPieces: String(data.maxPieces ?? ""),
          status: data.status || "ACTIVE",
          tags: data.tags || [],
          features: data.features || [],
          imageUrl: data.image_url || "",
          categoryId: data.categoryId || "",
        });
        if (data.image_url) {
          setMainImage({ file: null, preview: data.image_url });
        }
        if (data.gallery?.length) {
          setExistingGallery(data.gallery);
        }

        // Fetch cities independently so a failure here never blocks the
        // rest of the form (service data, price units, categories) from loading.
        try {
          const uae = countryRows.find((country) => country.code === "AE");
          const cityRows = await vendorApi.masterData.cities<ApiCity[]>(uae?.id);
          setCities(
            Array.isArray(cityRows)
              ? cityRows.filter((c) => c.status === "Active")
              : [],
          );
        } catch (cityErr) {
          console.error("Error fetching cities:", cityErr);
          setCities([]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load service");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [id]);

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
        const result = await vendorApi.services.checkSlug<SlugCheckResult>(
          candidate,
          id,
        );
        setForm((current) => ({ ...current, slug: result.slug }));
        setSlugStatus(result.available ? "available" : "taken");
      } catch {
        setSlugStatus("idle");
      }
    }, 400);

    return () => window.clearTimeout(timer);
  }, [form.slug, id]);

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

  const handleGalleryUpload = async (files: FileList | null) => {
    if (!files) return;
    const selectedFiles = Array.from(files);
    const previews = selectedFiles.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setGalleryImages((prev) => [...prev, ...previews]);

    for (const file of selectedFiles) {
      const result = await vendorApi.uploads.image(file, "services");
      setExistingGallery((prev) => [...prev, result.url]);
    }
  };

  const removeGalleryImage = (
    index: number,
    isExisting: boolean,
    existingIndex?: number,
  ) => {
    if (isExisting && existingIndex !== undefined) {
      setExistingGallery((prev) =>
        prev.filter((_, currentIndex) => currentIndex !== existingIndex),
      );
      return;
    }

    const newIndex = index - existingGallery.length;
    const image = galleryImages[newIndex];
    if (image?.preview.startsWith("blob:")) {
      URL.revokeObjectURL(image.preview);
    }
    setGalleryImages((prev) =>
      prev.filter((_, currentIndex) => currentIndex !== newIndex),
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
    if (!id) return;
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      showError(validationError);
      return;
    }

    try {
      setSaving(true);
      setError("");

      const newGalleryUrls: string[] = [];
      for (const image of galleryImages) {
        const result = await vendorApi.uploads.image(image.file, "services");
        newGalleryUrls.push(result.url);
      }

      const selectedPriceUnit = findPriceUnit(priceUnits, form.priceUnit);

      const servicePayload: Record<string, unknown> = {
        categoryId: form.categoryId,
        title: form.title.trim(),
        slug: slugify(form.slug),
        description: form.description.trim(),
        city: form.city.trim(),
        priceMin: Number(form.amount),
        currency: form.currency,
        priceMax: form.priceMax ? Number(form.priceMax) : Number(form.amount),
        priceUnit: form.priceUnit,
        imageUrl: form.imageUrl || undefined,
        status: form.status,
        tags: form.tags,
        gallery: [...existingGallery, ...newGalleryUrls],
        features: form.features,
      };

      if (selectedPriceUnit?.requiresPieceRange) {
        servicePayload.minPieces = Number(form.minPieces);
        servicePayload.maxPieces = Number(form.maxPieces);
      }

      await vendorApi.services.update(id, servicePayload);

      showSuccess("Service updated successfully!");
      router.push("/vendor/services");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to update service";
      setError(msg);
      showError(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <Loader2 size={24} className="animate-spin text-orange-400 mx-auto" />
        <p className="text-gray-400 text-sm mt-3">Loading service...</p>
      </div>
    );
  }

  if (!service && error) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
          <AlertTriangle size={32} className="text-red-500 mx-auto mb-3" />
          <p className="text-gray-800 font-semibold">Service not found</p>
          <button
            onClick={() => router.push("/vendor/services")}
            className="mt-4 text-orange-500 text-sm underline"
          >
            Back to Services
          </button>
        </div>
      </div>
    );
  }

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
            Edit Service
          </h1>
          <p className="text-sm text-gray-500">
            Update the service page. Packages remain the sellable item under
            this service.
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

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                    />
                  </div>

                  {/* <div>
                    <label className="text-xs font-semibold text-gray-700 mb-1.5 block">
                      Currency *
                    </label>
                    <input
                      value={form.currency}
                      readOnly
                      className="w-full px-4 py-2.5 text-sm border border-gray-100 bg-gray-50 text-gray-400 rounded-xl focus:outline-none cursor-not-allowed"
                    />
                  </div> */}

                  <div>
                    <label className="text-xs font-semibold text-gray-700 mb-1.5 block">
                      Status *
                    </label>
                    <SearchableSelectField
                      value={form.status}
                      onChange={(v) => setFormField("status", v)}
                      options={[
                        { value: "ACTIVE", label: "Active" },
                        { value: "INACTIVE", label: "Inactive" },
                      ]}
                      placeholder="Select status"
                      searchPlaceholder="Search status..."
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
                onChange={(e) => void handleGalleryUpload(e.target.files)}
              />
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                className="w-full border border-dashed border-gray-300 rounded-2xl px-5 py-6 text-center hover:border-orange-300 hover:bg-orange-50/40 transition-colors"
              >
                <Upload size={22} className="mx-auto text-orange-400 mb-2" />
                <p className="text-sm font-medium text-gray-700">
                  Update gallery images
                </p>
              </button>

              {(existingGallery.length > 0 || galleryImages.length > 0) && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
                  {existingGallery.map((image, index) => (
                    <div
                      key={`${image}-${index}`}
                      className="relative rounded-xl overflow-hidden border border-gray-100 bg-gray-50"
                    >
                      <img
                        src={image}
                        alt={`Existing gallery ${index + 1}`}
                        className="w-full h-24 object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeGalleryImage(index, true, index)}
                        className="absolute top-2 right-2 p-1 rounded-full bg-white/90 text-gray-600 hover:text-red-500"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  {galleryImages.map((image, index) => (
                    <div
                      key={`${image.file.name}-${index}`}
                      className="relative rounded-xl overflow-hidden border border-gray-100 bg-gray-50"
                    >
                      <img
                        src={image.preview}
                        alt={`New gallery ${index + 1}`}
                        className="w-full h-24 object-cover"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          removeGalleryImage(
                            existingGallery.length + index,
                            false,
                          )
                        }
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
                  placeholder="Add tags"
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
                  placeholder="Add included items like Lighting design"
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
          Save Changes
        </button>
      </div>
    </div>
  );
}
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  MapPin,
  Ruler,
  BedDouble,
  Bath,
  ArrowLeft,
  Loader2,
  ShieldCheck,
  BadgeCheck,
  CalendarClock,
  ClipboardList,
  Mail,
  Phone,
} from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../lib/AuthContext";
import Seo from "../components/Seo";
import MessageButton from "../components/MessageButton";
import ImageGallery from "../components/ImageGallery";
import SpecTable from "../components/SpecTable";
import StarRating from "../components/StarRating";
import ReviewSection from "../components/ReviewSection";
import PropertyInquiryModal from "../components/PropertyInquiryModal";

function badgeLabel(type) {
  if (type === "land") return "Land";
  if (type === "commercial") return "Commercial";
  return "For Sale";
}

export default function PropertyDetail() {
  const { id } = useParams();
  const { token } = useAuth();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [similar, setSimilar] = useState([]);
  const [inquiryMode, setInquiryMode] = useState(null); // "tour" | "details" | null

  useEffect(() => {
    setLoading(true);
    setError(null);
    api
      .getProperty(id, token)
      .then(setProperty)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id, token]);

  // Similar properties: same type + city first; if that's too thin, widen
  // to just the same type so the section still has something useful.
  useEffect(() => {
    if (!property) return;
    let cancelled = false;

    async function loadSimilar() {
      try {
        let results = await api.getProperties({ type: property.property_type, city: property.city });
        results = results.filter((p) => p.id !== property.id);
        if (results.length < 3) {
          const broader = await api.getProperties({ type: property.property_type });
          const seen = new Set(results.map((p) => p.id));
          for (const p of broader) {
            if (p.id !== property.id && !seen.has(p.id)) {
              results.push(p);
              seen.add(p.id);
            }
          }
        }
        if (!cancelled) setSimilar(results.slice(0, 3));
      } catch {
        // Non-fatal - the detail page still works without recommendations.
      }
    }

    loadSimilar();
    return () => {
      cancelled = true;
    };
  }, [property]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-24 text-center">
        <h1 className="text-2xl font-bold text-ink-900">Property not found</h1>
        <p className="mt-2 text-slate-500">{error || "This listing may have been removed."}</p>
        <Link to="/marketplace" className="mt-6 inline-block font-semibold text-brand-500 hover:underline">
          ← Back to Marketplace
        </Link>
      </div>
    );
  }

  const acres = property.property_type === "land" && property.size_sqm ? (Number(property.size_sqm) / 4046.86).toFixed(2) : null;
  const referenceCode = `PR-${property.id.slice(0, 6).toUpperCase()}`;

  return (
    <>
      <Seo
        title={property.title}
        description={property.description || `${property.title} in ${property.city}, Rwanda.`}
        path={`/marketplace/${property.id}`}
      />

      {/* Immersive full-width hero - sits flush against the navbar with no
          dead space above it. The back-control floats transparently over
          the photo itself (top-left) instead of taking its own row, and
          the thumbnail rail overlays the right edge of the canvas rather
          than sitting below it - the canvas also ambient-slideshows
          through every photo, pausing on hover. */}
      <div className="relative w-full px-4 sm:px-6">
        <Link
          to="/marketplace"
          className="absolute left-4 top-4 z-30 inline-flex items-center gap-2 rounded-full bg-black/30 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm transition-colors duration-200 ease-[cubic-bezier(.22,.61,.36,1)] hover:bg-black/45 sm:left-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Marketplace
        </Link>
        <ImageGallery
          images={property.images?.length ? property.images : property.image_url ? [property.image_url] : []}
          alt={property.title}
          layout="hero"
          badge={
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink-900 via-ink-900/70 to-transparent px-6 pb-6 pt-24 pr-28 sm:px-10 sm:pb-8 sm:pr-32">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold text-white">
                  ID: {referenceCode}
                </span>
                <span className="rounded-full bg-gold-400 px-2.5 py-1 text-xs font-bold text-ink-900">
                  {badgeLabel(property.property_type)}
                </span>
                <span className="rounded-full bg-emerald-400/20 px-2.5 py-1 text-xs font-semibold capitalize text-emerald-300">
                  {property.status}
                </span>
              </div>
              <h1 className="mt-3 max-w-2xl text-2xl font-extrabold text-white sm:text-4xl">{property.title}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-white/80">
                {(property.city || property.district) && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" />
                    {property.city}
                    {property.district ? `, ${property.district}` : ""}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <StarRating value={property.rating} />
                  {property.review_count > 0
                    ? `${property.rating} (${property.review_count} review${property.review_count === 1 ? "" : "s"})`
                    : "No reviews yet"}
                </span>
              </div>
            </div>
          }
        />
      </div>

      <div className="mx-auto max-w-6xl px-6">
        {/* Split-column info container, pushed cleanly below the hero+
            thumbnail block - no overlap with it. */}
        <div className="mt-8 grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-start">
          {/* Primary column */}
          <div>
            <div className="flex flex-wrap gap-6 border-y border-slate-200 py-5 text-sm text-slate-600">
              {property.bedrooms ? (
                <span className="flex items-center gap-2">
                  <BedDouble className="h-4 w-4 text-brand-500" /> {property.bedrooms} Beds
                </span>
              ) : null}
              {property.bathrooms ? (
                <span className="flex items-center gap-2">
                  <Bath className="h-4 w-4 text-brand-500" /> {property.bathrooms} Baths
                </span>
              ) : null}
              {property.size_sqm ? (
                <span className="flex items-center gap-2">
                  <Ruler className="h-4 w-4 text-brand-500" />
                  {acres ? `${acres} acres` : `${Number(property.size_sqm).toLocaleString()} sqm`}
                </span>
              ) : null}
            </div>

            <h2 className="mt-6 text-lg font-bold text-ink-900">Description</h2>
            <p className="mt-2 whitespace-pre-line text-slate-600">
              {property.description || "No additional description provided."}
            </p>

            <h2 className="mt-8 text-lg font-bold text-ink-900">Specifications</h2>
            <div className="mt-3">
              <SpecTable
                rows={[
                  { label: "Property Type", value: property.property_type },
                  { label: "Status", value: property.status },
                  { label: "Bedrooms", value: property.bedrooms },
                  { label: "Bathrooms", value: property.bathrooms },
                  { label: "Size", value: acres ? `${acres} acres` : property.size_sqm ? `${Number(property.size_sqm).toLocaleString()} sqm` : null },
                  { label: "City", value: property.city },
                  { label: "District", value: property.district },
                ]}
              />
            </div>

            <h2 className="mt-8 text-lg font-bold text-ink-900">Contact Us</h2>
            <div className="mt-3 rounded-2xl border border-slate-200 p-5">
              <p className="text-sm text-slate-500">
                Have a general question about listings on CivilBridge? Reach our team directly.
              </p>
              <div className="mt-4 space-y-2 text-sm">
                <a href="mailto:hello@civil-bridge.com" className="flex items-center gap-2 font-semibold text-ink-900 hover:text-brand-500">
                  <Mail className="h-4 w-4 text-brand-500" /> hello@civil-bridge.com
                </a>
                <a href="https://wa.me/25078995646" className="flex items-center gap-2 font-semibold text-ink-900 hover:text-brand-500">
                  <Phone className="h-4 w-4 text-brand-500" /> +250 789 956 46
                </a>
                <p className="flex items-center gap-2 text-slate-500">
                  <MapPin className="h-4 w-4 text-brand-500" /> Kigali, Rwanda
                </p>
              </div>
            </div>

            <h2 className="mt-8 text-lg font-bold text-ink-900">Reviews</h2>
            <div className="mt-3">
              <ReviewSection
                id={property.id}
                getReviews={api.getPropertyReviews}
                submitReview={api.submitPropertyReview}
                excludeUserId={property.owner?.id}
                onSubmitted={() => api.getProperty(id, token).then(setProperty).catch(() => {})}
              />
            </div>
          </div>

          {/* Sidebar - sticky action panel, sitting entirely below the hero
              grid line (no negative margins pulling it up into the photo). */}
          <div className="space-y-5 lg:sticky lg:top-24">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase text-slate-400">Price</p>
              <p className="mt-1 text-2xl font-extrabold text-brand-500">
                {property.currency} {Number(property.price).toLocaleString()}
              </p>
              <p className="mt-1 text-sm capitalize text-slate-400">{property.property_type} · {property.status}</p>

              {property.owner ? (
                <div className="mt-5 border-t border-slate-100 pt-4">
                  <p className="text-xs font-semibold uppercase text-slate-400">Listed by</p>
                  <p className="mt-1 font-semibold text-ink-900">{property.owner.full_name}</p>
                  <div className="mt-3">
                    <MessageButton userId={property.owner.id} label="Contact Owner" />
                  </div>
                </div>
              ) : (
                <Link
                  to="/experts"
                  className="mt-5 block rounded-lg bg-brand-500 py-2.5 text-center text-sm font-semibold text-white transition-[background-color,transform,box-shadow] duration-200 ease-[cubic-bezier(.22,.61,.36,1)] hover:-translate-y-0.5 hover:bg-brand-600 hover:shadow-md active:translate-y-0"
                >
                  Talk to an Expert
                </Link>
              )}

              <div className="mt-3 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setInquiryMode("tour")}
                  className="flex flex-col items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-50 py-3 text-center text-xs font-semibold text-ink-900 transition-colors duration-200 ease-[cubic-bezier(.22,.61,.36,1)] hover:bg-slate-100"
                >
                  <CalendarClock className="h-4 w-4 text-brand-500" /> Schedule a Tour
                </button>
                <button
                  type="button"
                  onClick={() => setInquiryMode("details")}
                  className="flex flex-col items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-50 py-3 text-center text-xs font-semibold text-ink-900 transition-colors duration-200 ease-[cubic-bezier(.22,.61,.36,1)] hover:bg-slate-100"
                >
                  <ClipboardList className="h-4 w-4 text-brand-500" /> Enter Details
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-5">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-500">
                  <ShieldCheck className="h-4.5 w-4.5" />
                </span>
                <div>
                  <p className="flex items-center gap-1 text-sm font-bold text-ink-900">
                    {property.is_approved ? "Verified Listing" : "Pending Review"} <BadgeCheck className="h-3.5 w-3.5 text-brand-500" />
                  </p>
                  <p className="text-xs text-slate-500">Reviewed by the CivilBridge team</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {similar.length > 0 && (
          <div className="mt-14">
            <h2 className="text-xl font-bold text-ink-900">You Might Also Like</h2>
            <div className="mt-5 grid gap-5 sm:grid-cols-3">
              {similar.map((p) => (
                <Link
                  key={p.id}
                  to={`/marketplace/${p.id}`}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white transition-[transform,box-shadow] duration-300 ease-[cubic-bezier(.22,.61,.36,1)] hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="relative" style={{ aspectRatio: "4 / 3" }}>
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.title} loading="lazy" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-brand-50 text-brand-300">
                        <MapPin className="h-8 w-8" />
                      </div>
                    )}
                    <span className="absolute right-3 top-3 rounded-full bg-brand-500 px-3 py-1 text-xs font-semibold text-white">
                      {badgeLabel(p.property_type)}
                    </span>
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-ink-900">{p.title}</h3>
                    {p.city && (
                      <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
                        <MapPin className="h-3.5 w-3.5" /> {p.city}
                      </p>
                    )}
                    <p className="mt-2 font-bold text-brand-500">
                      {p.currency} {Number(p.price).toLocaleString()}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {inquiryMode && (
        <PropertyInquiryModal property={property} mode={inquiryMode} onClose={() => setInquiryMode(null)} />
      )}
    </>
  );
}

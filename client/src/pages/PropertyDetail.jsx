import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { MapPin, Ruler, BedDouble, Bath, ArrowLeft, Loader2 } from "lucide-react";
import { api } from "../lib/api";
import Seo from "../components/Seo";
import MessageButton from "../components/MessageButton";

function badgeLabel(type) {
  if (type === "land") return "Land";
  if (type === "commercial") return "Commercial";
  return "For Sale";
}

export default function PropertyDetail() {
  const { id } = useParams();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [similar, setSimilar] = useState([]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api
      .getProperty(id)
      .then(setProperty)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

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

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <Seo
        title={property.title}
        description={property.description || `${property.title} in ${property.city}, Rwanda.`}
        path={`/marketplace/${property.id}`}
      />

      <Link to="/marketplace" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-ink-900">
        <ArrowLeft className="h-4 w-4" />
        Back to Marketplace
      </Link>

      <div className="mt-6 grid gap-10 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <div className="relative overflow-hidden rounded-2xl" style={{ aspectRatio: "16 / 10" }}>
            {property.image_url ? (
              <img src={property.image_url} alt={property.title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-brand-50 text-brand-300">
                <MapPin className="h-12 w-12" />
              </div>
            )}
            <span className="absolute right-4 top-4 rounded-full bg-brand-500 px-3 py-1 text-xs font-semibold text-white">
              {badgeLabel(property.property_type)}
            </span>
          </div>

          <h1 className="mt-6 text-3xl font-extrabold text-ink-900">{property.title}</h1>
          {(property.city || property.district) && (
            <p className="mt-2 flex items-center gap-1.5 text-slate-500">
              <MapPin className="h-4 w-4" />
              {property.city}
              {property.district ? `, ${property.district}` : ""}
            </p>
          )}

          <div className="mt-6 flex flex-wrap gap-6 border-y border-slate-200 py-5 text-sm text-slate-600">
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

          <div className="mt-6">
            <h2 className="text-lg font-bold text-ink-900">Description</h2>
            <p className="mt-2 whitespace-pre-line text-slate-600">
              {property.description || "No additional description provided."}
            </p>
          </div>
        </div>

        <div className="h-fit rounded-2xl border border-slate-200 p-6">
          <p className="text-2xl font-extrabold text-brand-500">
            {property.currency} {Number(property.price).toLocaleString()}
          </p>
          <p className="mt-1 text-sm capitalize text-slate-400">{property.property_type} · {property.status}</p>

          {property.owner ? (
            <div className="mt-6 border-t border-slate-100 pt-4">
              <p className="text-xs font-semibold uppercase text-slate-400">Listed by</p>
              <p className="mt-1 font-semibold text-ink-900">{property.owner.full_name}</p>
              <div className="mt-3">
                <MessageButton userId={property.owner.id} label="Contact Owner" />
              </div>
            </div>
          ) : (
            <Link
              to="/experts"
              className="mt-6 block rounded-lg bg-brand-500 py-2.5 text-center text-sm font-semibold text-white transition-[background-color,transform,box-shadow] duration-200 ease-[cubic-bezier(.22,.61,.36,1)] hover:-translate-y-0.5 hover:bg-brand-600 hover:shadow-md active:translate-y-0"
            >
              Talk to an Expert
            </Link>
          )}
        </div>
      </div>

      {similar.length > 0 && (
        <div className="mt-14">
          <h2 className="text-xl font-bold text-ink-900">Similar Properties</h2>
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
  );
}

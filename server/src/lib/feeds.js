import { Property, Plan } from "../models/index.js";
import { formatLocation } from "./locations.js";

/**
 * Public RSS feed of what's for sale / available, for Pinterest's auto-publish
 * (and any other RSS reader). Only things that are already public go in:
 *   - properties that are approved and still available (never pending/sold),
 *   - plans, using only their FIRST image - the free preview. Paid drawings,
 *     the deliverable ZIP and the licence-only documents are never included.
 * No owner names, emails or phone numbers appear anywhere in it.
 */

const MAX_ITEMS = 200;

const siteOrigin = () => (process.env.CLIENT_URL || "http://localhost:5173").replace(/\/+$/, "");

const IMAGE_TYPES = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", gif: "image/gif" };

// Strip characters XML can't carry, then escape the five that need it.
function xml(value) {
  return String(value ?? "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

const clip = (text, max) => {
  const t = String(text ?? "").replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
};

const money = (currency, amount) => `${currency || "RWF"} ${Number(amount).toLocaleString("en-US")}`;

/**
 * An image link Pinterest can actually fetch: absolute, https, and on the
 * public site. Images uploaded before the server knew it sat behind a proxy
 * were saved as http://<our host>/uploads/...; those are upgraded. Anything
 * pointing at localhost is dropped when the site itself isn't local.
 */
function publicImageUrl(raw) {
  if (!raw || typeof raw !== "string") return null;
  let url;
  try {
    url = new URL(raw.startsWith("/") ? `${siteOrigin()}${raw}` : raw);
  } catch {
    return null;
  }
  if (!["http:", "https:"].includes(url.protocol)) return null;

  const site = new URL(siteOrigin());
  const siteIsLocal = ["localhost", "127.0.0.1"].includes(site.hostname);
  if (!siteIsLocal && ["localhost", "127.0.0.1"].includes(url.hostname)) return null;
  if (url.hostname === site.hostname && url.protocol === "http:" && site.protocol === "https:") url.protocol = "https:";
  return url.toString();
}

const imageType = (url) => IMAGE_TYPES[url.split(/[?#]/)[0].split(".").pop().toLowerCase()] || "image/jpeg";

function withUtm(path, campaign) {
  return `${siteOrigin()}${path}?utm_source=pinterest&utm_medium=social&utm_campaign=${campaign}`;
}

function propertyItem(p) {
  const image = publicImageUrl(p.image_url || p.images?.[0]);
  if (!image) return null;

  const place = formatLocation(p);
  const facts = [
    p.bedrooms ? `${p.bedrooms} bed` : null,
    p.bathrooms ? `${p.bathrooms} bath` : null,
    p.size_sqm ? `${Number(p.size_sqm).toLocaleString("en-US")} sqm` : null,
  ].filter(Boolean);
  const type = { house: "House", apartment: "Apartment", land: "Land plot", commercial: "Commercial property" }[p.property_type] || "Property";

  return {
    id: `property-${p.id}`,
    title: clip(`${p.title}${place ? ` - ${place}` : ""}`, 100),
    link: withUtm(`/marketplace/${p.id}`, "listings"),
    description: clip(
      [`${type} for sale in ${place || "Rwanda"}.`, money(p.currency, p.price) + ".", facts.join(" · "), p.description].filter(Boolean).join(" "),
      480
    ),
    category: type,
    image,
    date: p.created_at,
  };
}

function planItem(p) {
  const image = publicImageUrl(p.image_url || p.images?.[0]);
  if (!image) return null;

  const place = formatLocation(p);
  const facts = [
    p.bedrooms ? `${p.bedrooms} bed` : null,
    p.bathrooms ? `${p.bathrooms} bath` : null,
    p.size_sqm ? `${Number(p.size_sqm).toLocaleString("en-US")} sqm` : null,
  ].filter(Boolean);

  return {
    id: `plan-${p.id}`,
    title: clip(`${p.title} - building plan`, 100),
    link: withUtm(`/plans/${p.id}`, "plans"),
    description: clip(
      ["Ready-made building plan with a full drawing pack.", facts.join(" · "), place && `Suited to ${place}.`, `Estimated build cost ${money(p.currency, p.price)}.`, p.description]
        .filter(Boolean)
        .join(" "),
      480
    ),
    category: "Building plans",
    image,
    date: p.created_at,
  };
}

/** @param {"properties" | "plans" | "all"} type */
export async function buildFeed(type = "all") {
  const wantProperties = type === "all" || type === "properties";
  const wantPlans = type === "all" || type === "plans";

  const [properties, plans] = await Promise.all([
    wantProperties
      ? Property.findAll({
          where: { is_approved: true, status: "available" },
          attributes: ["id", "title", "description", "property_type", "price", "currency", "district", "sector", "city", "size_sqm", "bedrooms", "bathrooms", "image_url", "images", "created_at"],
          order: [["created_at", "DESC"]],
          limit: MAX_ITEMS,
        })
      : [],
    wantPlans
      ? Plan.findAll({
          // The free preview image only - never the deliverable or its documents.
          attributes: ["id", "title", "description", "price", "currency", "district", "sector", "city", "size_sqm", "bedrooms", "bathrooms", "image_url", "images", "created_at"],
          order: [["created_at", "DESC"]],
          limit: MAX_ITEMS,
        })
      : [],
  ]);

  const items = [...properties.map(propertyItem), ...plans.map(planItem)]
    .filter(Boolean)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, MAX_ITEMS);

  const site = siteOrigin();
  const self = `${site}/api/feeds/pinterest.xml${type === "all" ? "" : `?type=${type}`}`;
  const heading = { all: "Properties, land and building plans", properties: "Properties and land plots", plans: "Building plans" }[type];
  const built = new Date().toUTCString();

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${xml(`CivilBridge - ${heading}`)}</title>
    <link>${xml(site)}</link>
    <description>${xml("Real estate, land plots and ready-made building plans in Rwanda, from CivilBridge.")}</description>
    <language>en</language>
    <lastBuildDate>${built}</lastBuildDate>
    <atom:link href="${xml(self)}" rel="self" type="application/rss+xml" />
${items
  .map(
    (i) => `    <item>
      <title>${xml(i.title)}</title>
      <link>${xml(i.link)}</link>
      <guid isPermaLink="false">${xml(i.id)}</guid>
      <pubDate>${new Date(i.date).toUTCString()}</pubDate>
      <category>${xml(i.category)}</category>
      <description>${xml(i.description)}</description>
      <enclosure url="${xml(i.image)}" length="0" type="${imageType(i.image)}" />
      <media:content url="${xml(i.image)}" medium="image" type="${imageType(i.image)}" />
    </item>`
  )
  .join("\n")}
  </channel>
</rss>
`;
}

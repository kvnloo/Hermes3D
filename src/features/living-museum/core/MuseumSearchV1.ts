import { MUSEUM_EXHIBIT_SLUGS, type MuseumExhibitSlug, type MuseumExhibitV1 } from "./MuseumExhibitV1";

export const MUSEUM_SEARCH_TYPES = ["exhibit", "product", "project", "command"] as const;
export type MuseumSearchType = (typeof MUSEUM_SEARCH_TYPES)[number];
export const MUSEUM_SEARCH_FILTERS = ["exhibit", "game", "collection", "private-placeholder", "product", "project", "command"] as const;
export type MuseumSearchFilter = (typeof MUSEUM_SEARCH_FILTERS)[number];

export type MuseumSearchRecordV1 = {
  id: string;
  type: MuseumSearchType;
  title: string;
  summary: string;
  keywords: readonly string[];
  filters: readonly MuseumSearchFilter[];
  href: string;
  exhibitSlug?: MuseumExhibitSlug;
  destinationAnchor?: "approach";
};

const SEARCH_KEYS = ["id", "type", "title", "summary", "keywords", "filters", "href", "exhibitSlug", "destinationAnchor"] as const;
const PRIVATE_KEY = /(secret|token|password|credential|session|task|kanban|log|database|vault|path|hostname|provider|model)/i;
const CONTROL = /[\u0000-\u001f\u007f]/;

const safeText = (value: unknown, label: string, max = 280): string => {
  if (typeof value !== "string" || !value.trim() || value.length > max || CONTROL.test(value) || /<\/?(?:script|iframe|object|embed)\b/i.test(value)) {
    throw new Error(`${label} is not public-safe text`);
  }
  return value.trim();
};

export function parseMuseumSearchRecordV1(value: unknown): MuseumSearchRecordV1 {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Search record must be an object");
  const record = value as Record<string, unknown>;
  const unknown = Object.keys(record).filter((key) => !SEARCH_KEYS.includes(key as (typeof SEARCH_KEYS)[number]));
  if (unknown.length) throw new Error(`Search record contains unknown fields: ${unknown.join(", ")}`);
  for (const key of ["id", "type", "title", "summary", "keywords", "filters", "href"]) if (!(key in record)) throw new Error(`Search record is missing ${key}`);
  if (Object.keys(record).some((key) => PRIVATE_KEY.test(key))) throw new Error("Search record contains a private key");

  const id = safeText(record.id, "id", 120);
  const title = safeText(record.title, "title", 120);
  const summary = safeText(record.summary, "summary");
  if (!MUSEUM_SEARCH_TYPES.includes(record.type as MuseumSearchType)) throw new Error("Search type is not allowlisted");
  if (!Array.isArray(record.keywords) || !record.keywords.every((item) => typeof item === "string" && item.length <= 80 && !CONTROL.test(item))) throw new Error("Search keywords are invalid");
  if (!Array.isArray(record.filters) || !record.filters.every((item) => MUSEUM_SEARCH_FILTERS.includes(item as MuseumSearchFilter))) throw new Error("Search filters are invalid");

  const href = safeText(record.href, "href", 500);
  const isSameOrigin = href.startsWith("/") && !href.startsWith("//");
  let isPublicHttps = false;
  try {
    const url = new URL(href);
    isPublicHttps = url.protocol === "https:" && !url.username && !url.password && !url.hash && !/^(localhost|\d{1,3}(?:\.\d{1,3}){3}|\[.*\])$/i.test(url.hostname);
  } catch { /* same-origin path is handled above */ }
  if (!isSameOrigin && !isPublicHttps) throw new Error("Search href is not allowlisted");

  const exhibitSlug = record.exhibitSlug as MuseumExhibitSlug | undefined;
  if (exhibitSlug !== undefined && !MUSEUM_EXHIBIT_SLUGS.includes(exhibitSlug)) throw new Error("Search exhibitSlug is invalid");
  if (record.destinationAnchor !== undefined && record.destinationAnchor !== "approach") throw new Error("Search destinationAnchor is invalid");
  if ((exhibitSlug === undefined) !== (record.destinationAnchor === undefined)) throw new Error("Exhibit destination fields must be paired");
  if (exhibitSlug && href !== `/museum?exhibit=${exhibitSlug}&anchor=approach`) throw new Error("Exhibit href must target its authored approach anchor");

  return { id, type: record.type as MuseumSearchType, title, summary, keywords: [...record.keywords] as string[], filters: [...record.filters] as MuseumSearchFilter[], href, ...(exhibitSlug ? { exhibitSlug, destinationAnchor: "approach" as const } : {}) };
}

export const exhibitToSearchRecord = (exhibit: MuseumExhibitV1): MuseumSearchRecordV1 => parseMuseumSearchRecordV1({
  id: exhibit.id,
  type: "exhibit",
  title: exhibit.search.title,
  summary: exhibit.search.summary,
  keywords: exhibit.search.keywords,
  filters: exhibit.search.filters,
  href: `/museum?exhibit=${exhibit.slug}&anchor=approach`,
  exhibitSlug: exhibit.slug,
  destinationAnchor: "approach",
});

export function normalizeMuseumQuery(query: string): string {
  const normalized = query.normalize("NFKC").toLocaleLowerCase("en-US").replace(/\s+/g, " ").trim();
  if ([...normalized].length > 120 || CONTROL.test(normalized)) throw new Error("Search query is invalid");
  return normalized;
}

const editDistance = (a: string, b: string, limit = 2): number => {
  if (Math.abs(a.length - b.length) > limit) return limit + 1;
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j += 1) {
      current[j] = Math.min(current[j - 1] + 1, previous[j] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      rowMin = Math.min(rowMin, current[j]);
    }
    if (rowMin > limit) return limit + 1;
    previous = current;
  }
  return previous[b.length];
};

const score = (record: MuseumSearchRecordV1, query: string): number => {
  if (!query) return 10;
  const title = normalizeMuseumQuery(record.title);
  if (title === query) return 100;
  if (title.startsWith(query)) return 90;
  const tokens = `${title} ${normalizeMuseumQuery(record.summary)}`.split(" ");
  if (tokens.some((token) => token.startsWith(query))) return 80;
  if (record.keywords.some((keyword) => normalizeMuseumQuery(keyword).includes(query))) return 70;
  return tokens.some((token) => editDistance(token, query) <= 2) ? 60 : -1;
};

export function searchMuseum(records: readonly MuseumSearchRecordV1[], rawQuery: string, filters: readonly MuseumSearchFilter[] = []): MuseumSearchRecordV1[] {
  const query = normalizeMuseumQuery(rawQuery);
  const selected = new Set(filters);
  return records.map(parseMuseumSearchRecordV1)
    .filter((record) => !selected.size || [...selected].every((filter) => record.filters.includes(filter)))
    .map((record) => ({ record, rank: score(record, query), title: normalizeMuseumQuery(record.title) }))
    .filter(({ rank }) => rank >= 0)
    .sort((a, b) => b.rank - a.rank || a.title.localeCompare(b.title) || a.record.id.localeCompare(b.record.id))
    .map(({ record }) => record);
}

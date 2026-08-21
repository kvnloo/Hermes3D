import { exhibitToSearchRecord, parseMuseumSearchRecordV1, type MuseumSearchRecordV1 } from "../core/MuseumSearchV1";
import { validateMuseumExhibitV1 } from "../core/MuseumExhibitV1";
import { museumExhibits } from "./generated";

const commands: readonly MuseumSearchRecordV1[] = [
  { id: "command:arrival", type: "command", title: "Museum arrival", summary: "Return to the opening view and curatorial thesis.", keywords: ["home", "entrance", "orientation"], filters: ["command"], href: "/museum" },
];

const ids = new Set<string>();
const slugs = new Set<string>();
export const validatedMuseumExhibits = museumExhibits.map((entry) => {
  const manifest = validateMuseumExhibitV1(entry.manifest);
  if (ids.has(manifest.id) || slugs.has(manifest.slug)) throw new Error(`Duplicate museum exhibit: ${manifest.id}`);
  ids.add(manifest.id);
  slugs.add(manifest.slug);
  return { ...entry, manifest };
});

export const museumSearchCorpus: readonly MuseumSearchRecordV1[] = [
  ...validatedMuseumExhibits.map(({ manifest }) => exhibitToSearchRecord(manifest)),
  ...commands.map(parseMuseumSearchRecordV1),
];

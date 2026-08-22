import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MUSEUM_EXHIBIT_SLUGS, type MuseumExhibitSlug } from "@/features/living-museum/core/MuseumExhibitV1";
import { museumOfficeHref } from "@/features/living-museum/core/MuseumRuntimeV1";

export const metadata: Metadata = {
  title: "Living Museum | Hermes3D",
  description: "A spatial archive of original worlds, process and verified evolution.",
};

export default async function MuseumPage({ searchParams }: { searchParams: Promise<{ exhibit?: string }> }) {
  const { exhibit } = await searchParams;
  const slug = MUSEUM_EXHIBIT_SLUGS.includes(exhibit as MuseumExhibitSlug) ? exhibit as MuseumExhibitSlug : null;
  redirect(museumOfficeHref(slug));
}

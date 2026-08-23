import type { Metadata, Viewport } from "next";
import { PokemonCardsPreview } from "./PokemonCardsPreview";
import "./exhibit.css";

export const metadata: Metadata = { title: "The Cabinet of Impossible Editions" };
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

export default async function PokemonCardsExhibitPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view } = await searchParams;
  return <PokemonCardsPreview initialView={view === "macro" || view === "side" ? view : "gallery"} />;
}

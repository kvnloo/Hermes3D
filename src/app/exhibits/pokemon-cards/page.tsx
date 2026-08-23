import type { Metadata } from "next";
import { PokemonCardsPreview } from "./PokemonCardsPreview";
import "./exhibit.css";

export const metadata: Metadata = { title: "The Cabinet of Impossible Editions" };

export default async function PokemonCardsExhibitPage({ searchParams }: { searchParams: Promise<{ view?: string; card?: string }> }) {
  const { view, card } = await searchParams;
  return <PokemonCardsPreview initialView={view === "macro" || view === "side" ? view : "gallery"} initialCardId={card} />;
}

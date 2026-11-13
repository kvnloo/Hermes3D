import { notFound } from "next/navigation";

import { CollectionShell, CatalogError } from "@/features/cardtwin/CollectionShell";
import { ContextBack } from "@/features/cardtwin/ContextBack";
import { tcgdexProvider } from "@/features/cardtwin/providers/tcgdex";
import { findExactCardTwin } from "@/features/cardtwin/cardTwinIdentity";
import { PokemonCardsPreview } from "@/app/exhibits/pokemon-cards/PokemonCardsPreview";
import { cardTwinAssetsAvailable } from "@/features/cardtwin/cardTwinAssetAvailability";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import "@/app/exhibits/pokemon-cards/exhibit.css";

export default async function CardDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const id = decodeURIComponent((await params).id);
  if (!/^[a-zA-Z0-9.-]+$/.test(id)) notFound();
  let result;
  try { result = await tcgdexProvider.get(id); } catch { return <CollectionShell active="cards"><CatalogError title="Card detail unavailable" /></CollectionShell>; }
  if (!result) notFound();
  const { record, provenance } = result;
  const matchedTwin = findExactCardTwin({ sourceId: record.id, setName: record.set.name, number: record.number });
  const twin = matchedTwin && cardTwinAssetsAvailable(matchedTwin, (path) => existsSync(resolve(process.cwd(), path))) ? matchedTwin : null;
  return <CollectionShell active="cards"><ContextBack fallback="/cards" />
    <article className="ct-card-detail">
      <section className="ct-card-image">{record.imageUrl ? <>{/* eslint-disable-next-line @next/next/no-img-element -- exact TCGdex source image. */}<img src={record.imageUrl} alt={`${record.name}, ${record.set.name} ${record.number}`} width="490" height="684" /></> : <div className="ct-image-missing">Canonical image unavailable</div>}</section>
      <section className="ct-detail-copy"><span>Exact source ID · {record.id}</span><h1>{record.name}</h1><dl className="ct-meta"><div><dt>Set</dt><dd>{record.set.name}</dd></div><div><dt>Number</dt><dd>{record.number}</dd></div><div><dt>Rarity</dt><dd>{record.rarity ?? "Not listed"}</dd></div><div><dt>Source</dt><dd>TCGdex</dd></div></dl>
      {twin ? <div className="ct-depth-ready"><strong>CardTwin depth available</strong><p>Exact printing matched to the processed local catalog.</p></div> : <div className="ct-depth-empty"><strong>CardTwin depth not available</strong><p>{matchedTwin ? "The approved reconstruction assets are not installed on this deployment." : "This exact printing has no approved semantic-layer reconstruction."}</p></div>}</section>
    </article>{twin && <section data-testid="cardtwin-detail-embed" className="ct-cardtwin-embed" aria-label={`${record.name} CardTwin depth viewer`}><PokemonCardsPreview initialView="macro" initialCardId={twin.id} /></section>}<footer className="ct-attribution">{provenance.attribution} <a href={record.sourceUrl}>Exact record</a></footer>
  </CollectionShell>;
}

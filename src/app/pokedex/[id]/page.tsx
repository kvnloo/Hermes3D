import { notFound } from "next/navigation";
import { CollectionShell, CatalogError } from "@/features/cardtwin/CollectionShell";
import { ContextBack } from "@/features/cardtwin/ContextBack";
import { pokeApiProvider } from "@/features/cardtwin/providers/pokeApi";
import { resolvePokemonModel } from "@/features/cardtwin/pokemon3dCatalog";
import { LivingEncounter } from "@/features/cardtwin/LivingEncounter";

export default async function PokemonDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id < 1 || id > 1025) notFound();
  let result;
  try { result = await pokeApiProvider.get(id); } catch { return <CollectionShell active="pokedex"><CatalogError title="Pokémon detail unavailable" /></CollectionShell>; }
  if (!result) notFound();
  const { record, provenance } = result;
  const model = resolvePokemonModel(record.id);
  return <CollectionShell active="pokedex"><div className="ct-encounter-back"><ContextBack fallback="/pokedex" /></div>
    <LivingEncounter pokemon={record} model={model} />
    <article className="ct-encounter-data">
      <section className="ct-detail-copy"><span>{record.region} · Generation {record.generation}</span><h2>Field notes</h2><div className="ct-type-row">{record.types.map((type) => <b key={type}>{type}</b>)}</div><h3>Abilities</h3><p>{record.abilities.join(", ") || "Not listed by source"}</p><h3>Base stats</h3><dl className="ct-stats">{record.stats.map((stat) => <div key={stat.name}><dt>{stat.name}</dt><dd>{stat.value}</dd></div>)}</dl><h3>Evolution</h3>{record.evolution.length ? <ol className="ct-evolution">{record.evolution.map((entry) => <li key={entry.id}><a href={`/pokedex/${entry.id}`}>#{entry.id} {entry.name}</a></li>)}</ol> : <p>No evolution chain listed by source.</p>}</section>
      <section className="ct-model-panel"><div><span>Pokemon3DAssetCatalog v2</span><h2>Presentation source</h2><p>{model ? `${model.attribution}. ${model.license}` : "3D model unavailable"}</p></div><div className="ct-model-empty">{model ? "Approved derivative loaded in the encounter." : "No candidate has passed promotion. Verified animated sprite or official artwork fallback is active."}</div></section>
    </article>
    <footer className="ct-attribution">{provenance.attribution} <a href={provenance.sourceUrl}>Source</a></footer>
  </CollectionShell>;
}

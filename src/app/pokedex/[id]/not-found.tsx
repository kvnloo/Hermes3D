import Link from "next/link";
import { CollectionShell } from "@/features/cardtwin/CollectionShell";

export default function PokemonNotFound() {
  return <CollectionShell active="pokedex"><section className="ct-state"><h1>Pokémon not found</h1><p>No verified species matches this National Dex ID.</p><Link href="/pokedex">Return to Pokédex</Link></section></CollectionShell>;
}

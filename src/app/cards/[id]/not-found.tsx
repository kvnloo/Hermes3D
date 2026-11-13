import Link from "next/link";
import { CollectionShell } from "@/features/cardtwin/CollectionShell";

export default function CardNotFound() {
  return <CollectionShell active="cards"><section className="ct-state"><h1>Card not found</h1><p>No verified printing matches this exact card ID.</p><Link href="/cards">Return to cards</Link></section></CollectionShell>;
}

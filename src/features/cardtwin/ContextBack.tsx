"use client";
import { useRouter } from "next/navigation";

export function ContextBack({ fallback }: { fallback: string }) {
  const router = useRouter();
  return <button className="ct-back" type="button" onClick={() => window.history.length > 1 ? router.back() : router.push(fallback)} aria-label="Back to previous view">← Back</button>;
}

import type { MuseumCameraAnchorV1, MuseumExhibitSlug, MuseumExhibitV1 } from "./MuseumExhibitV1";

export type MuseumAnchorName = keyof MuseumExhibitV1["cameraAnchors"];
export type MuseumNavigation = { exhibitSlug: MuseumExhibitSlug | null; anchor: MuseumAnchorName; requestId: number };
export type MuseumActivation = { activeSlug: MuseumExhibitSlug | null; suppressedSpectacle: boolean };

export const MUSEUM_ARRIVAL_ANCHOR: MuseumCameraAnchorV1 = {
  position: [0, 4.8, 15], target: [0, 1.8, 0], fov: 48, minDwellMs: 900,
};

export function museumRendererProfile(active: boolean): { exposure: number; renderOfficePostFx: boolean } {
  return active
    ? { exposure: 2, renderOfficePostFx: false }
    : { exposure: 1, renderOfficePostFx: true };
}

export function museumOfficeHref(slug: MuseumExhibitSlug | null): string {
  return slug ? `/office?room=museum&exhibit=${encodeURIComponent(slug)}` : "/office?room=museum";
}

export function resolveMuseumDeepLink(params: Pick<URLSearchParams, "get">, exhibits: readonly MuseumExhibitV1[]): MuseumNavigation {
  const slug = params.get("exhibit");
  const exhibit = exhibits.find((item) => item.slug === slug);
  if (!exhibit) return { exhibitSlug: null, anchor: "establishing", requestId: 0 };
  return { exhibitSlug: exhibit.slug, anchor: "approach", requestId: 1 };
}

export function nextMuseumActivation(state: MuseumActivation, requestedSlug: MuseumExhibitSlug | null): MuseumActivation {
  if (state.activeSlug === requestedSlug) return state;
  return { activeSlug: requestedSlug, suppressedSpectacle: state.suppressedSpectacle };
}

export function exhibitRuntimeState(slug: MuseumExhibitSlug, activation: MuseumActivation, visible: boolean): "active" | "far" | "sleep" {
  if (activation.activeSlug === slug) return "active";
  return visible ? "far" : "sleep";
}

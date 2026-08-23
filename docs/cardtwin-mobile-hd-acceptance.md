# CardTwin mobile motion and HD acceptance

## Canonical source facts

The canonical sources remain immutable and authoritative. No SR output replaces them.

| Card | Dimensions | SHA-256 |
| --- | --- | --- |
| Arcanine SM1 22 | 734 × 1024 RGBA | `763abeb960a5c5e362bf49b6e4e1210b8b3d6a483384a85de372d19ea848ed1c` |
| Umbreon VMAX SWSH7 215 | 734 × 1024 RGBA | `0588afac1c3dee4c8a039d5ff9d0cff2ec4abfbcadedbb62b573750b8f772d92` |
| Leafeon ex SV8PT5 144 | 733 × 1024 RGBA | `f00547340035daf54ba086ee1f4c6d907476ae2772030517b68605a9ebd9842f` |

All semantic RGBA planes have the same dimensions as their canonical source. The display is normally below source resolution. The first fidelity correction therefore uses the renderer rather than invented pixels: sRGB upload, full device-supported anisotropy, trilinear minification, linear magnification, mip generation, explicit texture refresh, and Canvas DPR capped at 2.

## SR bakeoff status

Classical Lanczos and RealESRGAN were discovered as the bounded comparison candidates. The existing local ComfyUI tree is `/mnt/zer0models/comfyui`, and `models/upscale_models/RealESRGAN_x4plus.pth` is present. The existing server was not running. Launching that exact installation with the available Python failed closed at startup with `ModuleNotFoundError: sqlalchemy`; no duplicate environment was installed and no derived image was promoted. The matched OCR/edge/registration and literal review gate therefore remains pending. Canonical assets were not modified.

## Real-phone acceptance checklist

This gate is **pending real S25 Ultra/iPhone execution**; browser emulation is not represented as device evidence.

1. Open the exact HTTPS Tailscale preview in portrait Chrome/Safari.
2. Confirm the footer says pointer **or phone orientation**, never accelerometer.
3. Tap **Enable motion**. On iOS, accept the native motion/orientation permission prompt. On Android, confirm the control changes to `Hold steady · calibrating` without a prompt where the API does not require one.
4. Hold the phone neutral until the badge reads `Orientation · calibrated`.
5. Tilt left/right and forward/back. Verify the outer frame travels farther than the hero and far background, while all offsets remain bounded and text stays attached to the exact printing.
6. Rotate to landscape in both directions. Verify physical left/right tilt remains visually left/right rather than swapping axes or inverting unexpectedly.
7. Return to neutral, reload, enable motion again, and verify the new held pose becomes neutral.
8. Background the tab for ten seconds while moving the phone. Return and verify there is no jump from hidden-tab samples.
9. Deny permission on iOS and verify `Motion denied · pointer active`; drag the pointer and verify depth-relative fallback remains active.
10. Disable device orientation/site permission or use an unsupported browser and verify `Motion unavailable · pointer active`.
11. Enable OS reduced motion, reload, and verify no motion-control request is shown and the exact assembled front remains readable.
12. Inspect browser privacy/network tools: no sensor values are logged, persisted, recorded, or transmitted.

## Implemented motion contract

- Explicit user-gesture enablement and iOS `requestPermission` handling.
- Orientation-only terminology and a privacy-safe source/calibration badge.
- First valid sample calibrates neutral beta/gamma.
- Portrait, 90°, 180°, and 270° screen mappings.
- Normalized/clamped input, bounded low-pass filtering, hidden-document sample rejection, listener cleanup, pointer fallback, and reduced-motion suppression.
- Semantic depth separation increased only along Z; canonical visible RGBA planes and hidden-fill disclosure are unchanged.

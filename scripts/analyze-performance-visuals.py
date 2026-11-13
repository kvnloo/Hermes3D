from PIL import Image, ImageChops, ImageStat
import json
from pathlib import Path
root = Path("output/performance-certification")
a = Image.open(root / "visual-baseline-static.png").convert("RGB")
b = Image.open(root / "visual-candidate-static.png").convert("RGB")
diff = ImageChops.difference(a, b)
stat = ImageStat.Stat(diff)
pixels = a.width * a.height
changed = sum(1 for pixel in diff.getdata() if pixel != (0, 0, 0))
metrics = {
    "width": a.width,
    "height": a.height,
    "mean_absolute_channel_error": sum(stat.mean) / 3,
    "rms_channel_error": sum(stat.rms) / 3,
    "changed_pixel_count": changed,
    "changed_pixel_percent": changed / pixels * 100,
    "max_channel_difference": max(max(pixel) for pixel in diff.getdata()),
}
(root / "visual-equivalence.json").write_text(json.dumps(metrics, indent=2) + "\n")
diff.save(root / "visual-diff.png")
print(json.dumps(metrics))

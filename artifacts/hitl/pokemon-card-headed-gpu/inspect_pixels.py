from pathlib import Path
from PIL import Image, ImageStat
import json

root = Path(__file__).parent
frames = sorted((root / "passing-motion-frames").glob("*.png"))
images = [Image.open(frame).convert("RGB") for frame in frames]
metrics = []
for frame, image in zip(frames, images):
    width, height = image.size
    left = ImageStat.Stat(image.crop((0, 0, width // 2, height)))
    right = ImageStat.Stat(image.crop((width // 2, 0, width, height)))
    metrics.append({
        "frame": frame.name,
        "left_mean": round(sum(left.mean) / 3, 2),
        "right_mean": round(sum(right.mean) / 3, 2),
        "left_stddev": round(sum(left.stddev) / 3, 2),
        "right_stddev": round(sum(right.stddev) / 3, 2),
    })
sheet = Image.new("RGB", (1280, ((len(images) + 1) // 2) * 360))
for index, image in enumerate(images):
    sheet.paste(image, ((index % 2) * 640, (index // 2) * 360))
sheet.save(root / "passing-motion-contact-sheet.png")
(root / "pixel-inspection.json").write_text(json.dumps(metrics, indent=2) + "\n")
print(json.dumps(metrics, indent=2))

from PIL import Image, ImageChops, ImageStat
from pathlib import Path
import hashlib, json, subprocess
root=Path('/tmp/hermes3d-nightly-preview/recapture-v2')
frames=[root/'samples'/f'frame-{t}.png' for t in ('0','5','10','15','20','24.9')]
rows=[]
first=Image.open(frames[0]).convert('RGB')
for p in frames:
    im=Image.open(p).convert('RGB')
    diff=ImageChops.difference(first,im)
    stat=ImageStat.Stat(diff)
    rms=(sum(v*v for v in stat.rms)/3)**0.5
    histogram=diff.convert('L').histogram()
    changed=sum(histogram[9:])
    ocr=subprocess.run(['tesseract',str(p),'stdout'],capture_output=True,text=True).stdout
    rows.append({'file':p.name,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'bytes':p.stat().st_size,'rmsVsFrame0':rms,'changedPixelsThreshold8VsFrame0':changed,'ocrHasOnboarding':any(s in ocr.lower() for s in ['welcome to hermes3d','1 / 6','skip onboarding']),'ocrHasBoplog':('Boplog' in ocr or 'PUBLIC PROJECTS' in ocr),'ocrHasDemo':('DEMO' in ocr),'ocrExcerpt':ocr[:500]})
(root/'frame-analysis.json').write_text(json.dumps(rows,indent=2))
print(json.dumps(rows,indent=2))

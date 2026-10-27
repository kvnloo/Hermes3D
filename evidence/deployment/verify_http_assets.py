#!/usr/bin/env python3
import concurrent.futures, json, mimetypes, pathlib, urllib.request

root = pathlib.Path('/workspace/zer0/deployments/cardtwin-8462')
base = 'http://127.0.0.1:8462'
checks = []
for path in (root / '.next/static').rglob('*'):
    if path.is_file():
        checks.append(('static', '/_next/static/' + path.relative_to(root / '.next/static').as_posix(), path.stat().st_size))
for path in (root / 'public/exhibits/pokemon-cards').rglob('*'):
    if path.is_file() and path.suffix.lower() in {'.png','.jpg','.jpeg','.webp','.avif','.svg'}:
        checks.append(('texture', '/' + path.relative_to(root / 'public').as_posix(), path.stat().st_size))
checks.extend([('html','/exhibits/pokemon-cards?evidence=1&view=macro',None),('health','/api/health',None)])

def check(item):
    kind, url, expected_size = item
    req = urllib.request.Request(base + url, headers={'Accept-Encoding':'identity'})
    with urllib.request.urlopen(req, timeout=60) as r:
        body = r.read()
        mime = r.headers.get_content_type()
        expected_mime = mimetypes.guess_type(url.split('?')[0])[0]
        js_mimes = {'text/javascript','application/javascript'}
        ok_mime = kind in {'html','health'} or expected_mime is None or mime == expected_mime or ({mime, expected_mime} <= js_mimes) or (url.endswith('.ico') and mime in {'image/x-icon','image/vnd.microsoft.icon'})
        return {'kind':kind,'url':url,'status':r.status,'mime':mime,'bytes':len(body),'sourceBytes':expected_size,'ok':r.status == 200 and ok_mime and (expected_size is None or len(body) == expected_size)}

with concurrent.futures.ThreadPoolExecutor(max_workers=12) as pool:
    results = list(pool.map(check, checks))
summary = {
    'baseURL': base,
    'total': len(results),
    'static': sum(r['kind']=='static' for r in results),
    'textures': sum(r['kind']=='texture' for r in results),
    'failures': [r for r in results if not r['ok']],
    'largestTextures': sorted((r for r in results if r['kind']=='texture'), key=lambda r:r['bytes'], reverse=True)[:10],
    'results': results,
}
out = root / 'evidence/deployment/http-assets.json'
out.write_text(json.dumps(summary, indent=2))
print(json.dumps({k:v for k,v in summary.items() if k != 'results'}, indent=2))
if summary['failures']:
    raise SystemExit(1)

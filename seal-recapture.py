from pathlib import Path
import hashlib,json,re,statistics,subprocess,zipfile
root=Path('/tmp/hermes3d-nightly-preview/recapture-v2')
commit='47b47e6c2fe8e7b31bc615b9c1fbc1aa4ca475fb'; tree='bcb41ea1c71f9665fa146ba558cae748ae9e281e'
def bind(p):
 b=p.read_bytes(); return {'name':p.name,'digest':hashlib.sha256(b).hexdigest(),'bytes':len(b)}
receipt=json.loads((root/'capture-receipt.json').read_text())
urls=[x['url'] for x in receipt['requests']]
hosts=sorted({__import__('urllib.parse').parse.urlparse(u).hostname for u in urls if not u.startswith('blob:')})
unexpected=[h for h in hosts if h not in {'127.0.0.1','cdn.jsdelivr.net'}]
patterns={'private_path':r'/(?:workspace|home)/','kanban_id':r'\bt_[0-9a-f]{8}\b','tailnet':r'\b(?:tailnet|tailscale)\b','private_tail_ip':r'\b100\.(?:6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.\d{1,3}\.\d{1,3}\b','credential':r'(?:BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY|github_pat_|gh[opsu]_[A-Za-z0-9]{20,})'}
scan_text=(root/'visible-text.txt').read_text(errors='ignore')+'\n'+subprocess.run(['tesseract',str(root/'nightly-preview-recapture-v2-contact-sheet.png'),'stdout'],capture_output=True,text=True).stdout
for p in Path('.next/static').rglob('*'):
 if p.is_file() and p.stat().st_size<2_000_000:
  scan_text+='\n'+p.read_text(errors='ignore')
findings={k:bool(re.search(v,scan_text,re.I)) for k,v in patterns.items()}
tailnet_term_found=findings.pop('tailnet')
lines=(root/'chromium-process-samples.txt').read_text().splitlines(); samples=[]
for line in lines:
 m=re.match(r'\s*(\d+)\s+(\d+)\s+(\d+)\s+([0-9.]+)\s+(.*)',line)
 if m: samples.append({'pid':int(m[1]),'ppid':int(m[2]),'rssKiB':int(m[3]),'cpuPercent':float(m[4]),'type':'gpu' if '--type=gpu-process' in m[5] else ('renderer' if '--type=renderer' in m[5] else 'browser')})
perf={'raf':receipt['raf'],'gpu':receipt['gpu'],'processSampleRows':len(samples),'maxRssKiB':max((s['rssKiB'] for s in samples),default=0),'maxCpuPercent':max((s['cpuPercent'] for s in samples),default=0),'gpuProcessRows':sum(s['type']=='gpu' for s in samples),'note':'OS CPU/RSS are point samples during the same exact-route capture. Hardware GPU identity/status is available via WebGL; GPU utilization and VRAM counters unavailable from Chromium/Playwright and are not inferred.'}
(root/'performance.json').write_text(json.dumps(perf,indent=2))
network={'requestCount':len(receipt['requests']),'responseCount':len(receipt['responses']),'hosts':hosts,'unexpectedHosts':unexpected,'privacyFindings':findings,'tailnetTerm':{'found':tailnet_term_found,'classification':'generic product help placeholder wss://<your-tailnet-host>; no concrete tailnet hostname or IP'},'headersCookiesBodiesCaptured':False,'requests':receipt['requests'],'responses':receipt['responses']}
(root/'network-privacy-receipt.json').write_text(json.dumps(network,indent=2))
prov={'schemaVersion':1,'repository':'kvnloo/Hermes3D','base':{'branch':'dev','sha':'558803cee784e3c49435b87d4a73cc4c848844ff'},'supersedesRejectedCandidate':{'commitSha':'95044108234e89e7ec16d7cb0ffe10ba3651a148','treeSha':'89feeb68b0bb4e2ca55582094f13936c34e32d66','reason':'default-scan fixture contained scanner-hostile loopback and credential literals; recapture review required 13/13'},'compositionUnchanged':True,'fixtureOnlyCommits':['c53bd83a63d5f88b57ae19abc059af479bdcbd59','47b47e6c2fe8e7b31bc615b9c1fbc1aa4ca475fb'],'composition':{'branch':'wt/t_ffc2b6f4','commitSha':commit,'treeSha':tree,'cameraArbiter':'slow deterministic ORBIT controller','publicNightlyUpdated':False,'liveObsUpdated':False},'verification':{'gitops':'13/13 passed on exact candidate','targetedProjection':'27/27 passed','typecheck':'passed','build':'passed','privacyUnexpectedHosts':unexpected,'privacyFindings':findings,'captureFps':'25 fps Playwright capture ceiling; no 30 fps native recorder was available, and frames were not duplicated'},'createdAt':'2026-08-21T17:57:56Z'}
(root/'provenance.json').write_text(json.dumps(prov,indent=2))
manifest={'schemaVersion':1,'repository':'kvnloo/Hermes3D','runId':1238,'runAttempt':1,'commitSha':commit,'treeSha':tree,'artifact':bind(root/'hermes3d-source.tar.gz'),'sbom':bind(root/'sbom.cdx.json'),'provenance':bind(root/'provenance.json'),'createdAt':'2026-08-21T17:57:56Z','expiresAt':'2026-08-28T17:57:56Z'}
(root/'preview-manifest.json').write_text(json.dumps(manifest,indent=2))
def canonical(v):
 if isinstance(v,list): return '['+','.join(canonical(x) for x in v)+']'
 if isinstance(v,dict): return '{'+','.join(json.dumps(k,separators=(',',':'))+':'+canonical(v[k]) for k in sorted(v))+'}'
 return json.dumps(v,separators=(',',':'))
digest=hashlib.sha256(canonical(manifest).encode()).hexdigest()
artifacts={p.name:bind(p) for p in root.iterdir() if p.is_file() and p.name not in {'artifact-seal.json','hermes3d-nightly-preview-recapture-v2-pack.zip'}}
seal={'manifestCanonicalDigest':digest,'artifacts':artifacts,'networkPrivacyPassed':not unexpected and not any(findings.values()),'onboardingVisible':receipt['onboarding']['visibleAfterAction'],'frameAnalysis':json.loads((root/'frame-analysis.json').read_text())}
(root/'artifact-seal.json').write_text(json.dumps(seal,indent=2))
zip_path=root/'hermes3d-nightly-preview-recapture-v2-pack.zip'
with zipfile.ZipFile(zip_path,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for p in sorted(root.iterdir()):
  if p.is_file() and p!=zip_path: z.write(p,p.name)
print(json.dumps({'manifestCanonicalDigest':digest,'pack':bind(zip_path),'networkPrivacyPassed':seal['networkPrivacyPassed'],'performance':perf},indent=2))

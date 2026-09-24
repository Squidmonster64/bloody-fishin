"""Generate Floot items from tested source. Never hand-edit generated engine files."""
from pathlib import Path
import re,json,hashlib
root=Path(__file__).resolve().parent.parent
out=root/'floot-transfer'
out.mkdir(exist_ok=True)
entry=root/'client/src/pages/Home.tsx'
seen={}
pattern=re.compile(r'(?:from\s*|import\s*)[\"\']([^\"\']+)[\"\']')
def resolve(src,spec):
 if spec.startswith('@/'): p=root/'client/src'/spec[2:]
 elif spec.startswith('@shared/'): p=root/'shared'/spec[8:]
 elif spec.startswith('.'): p=src.parent/spec
 else: return None
 for ext in ['', '.ts','.tsx']:
  f=Path(str(p)+ext)
  if f.is_file(): return f.resolve()
 raise ValueError((src,spec))
def mapped(p):
 if p==entry:return 'pages/_index.tsx'
 kind='components' if '/components/' in str(p) else 'helpers'
 return f'{kind}/BF_{p.stem}.tsx'
def visit(p):
 if p in seen:return
 text=p.read_text();seen[p]=text
 for spec in pattern.findall(text):
  dep=resolve(p,spec)
  if dep:visit(dep)
visit(entry)
files={};manifest={};deps=set()
for p,source in seen.items():
 def sub(m):
  spec=m.group(1);dep=resolve(p,spec)
  if dep:return m.group(0).replace(spec,'../'+mapped(dep).removesuffix('.tsx'))
  deps.add(spec);return m.group(0)
 text=pattern.sub(sub,source)
 if p.name=='forecastTransport.ts': text=text.replace('import.meta.env.VITE_FORECAST_API_BASE as string | undefined','"https://weather.bloodydaves.com/"')
 if p==entry:
  text='import { BF_Styles } from "../components/BF_Styles";\n'+text
  text=text.replace('      <Header />','      <BF_Styles />\n      <Header />')
 dest=mapped(p);files[dest]=text
 manifest[dest]={'source':str(p.relative_to(root)),'sha256':hashlib.sha256(source.encode()).hexdigest()}
css=next((root/'dist/public/assets').glob('*.css')).read_text()
files['components/BF_Styles.tsx']='// Generated compiled styles preserve the tested Vite interface.\nexport function BF_Styles() { return <style>{'+json.dumps(css)+'}</style>; }\n'
files['pages/_index.pageLayout.tsx']='export default [];\n'
files['static/__dev/source-manifest.json']=json.dumps(manifest,indent=2)
# Re-run identical deterministic source fixtures on Floot's Jasmine runner.
for src,name in [('shared/scoring.test.ts','BF_scoring'),('shared/daylight.test.ts','BF_daylight'),('client/src/lib/decisionBrief.test.ts','BF_decisionBrief')]:
 text=(root/src).read_text().replace('import { describe, expect, it } from "vitest";\n','')
 text=text.replace('"@shared/scoring"','"./BF_scoring"').replace('"./scoring"','"./BF_scoring"').replace('"@shared/http"','"./BF_http"').replace('"@/lib/fishingEngine"','"./BF_fishingEngine"').replace('"@/lib/decisionBrief"','"./BF_decisionBrief"').replace('.toThrow(/times/)', '.toThrowError(/times/)')
 files['helpers/'+name+'.spec.tsx']=text
(out/'files.json').write_text(json.dumps(files))
(out/'manifest.json').write_text(json.dumps(manifest,indent=2))
print(json.dumps({'files':len(files),'sourceBytes':sum(map(len,files.values())),'dependencies':sorted(deps)}))

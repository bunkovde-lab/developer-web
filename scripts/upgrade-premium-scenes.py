"""Refine native vector parcel scenes and physical pawn artwork; ring tiles untouched."""
from pathlib import Path
import json,re,math
R=Path(__file__).resolve().parents[1];mp=R/'assets/svg/manifest.json';m=json.loads(mp.read_text())
for i,color in enumerate(['#efbb55','#55c7aa','#e87599','#68a6ee','#b48be2','#f17b59'],1):
 body=f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 112" role="img" aria-label="Фишка компании {i}"><title>Фишка компании {i}</title><defs><linearGradient id="metal" x2="1" y2="1"><stop stop-color="#fff5d1"/><stop offset=".25" stop-color="#d3af62"/><stop offset=".5" stop-color="#fff0ae"/><stop offset="1" stop-color="#806027"/></linearGradient><linearGradient id="enamel" x2=".85" y2=".6"><stop stop-color="#fff9e2"/><stop offset=".25" stop-color="{color}"/><stop offset=".68" stop-color="{color}"/><stop offset="1" stop-color="#1d3445"/></linearGradient></defs><ellipse cx="51" cy="103" rx="43" ry="8" fill="#020b12" opacity=".5"/><ellipse cx="50" cy="93" rx="39" ry="13" fill="url(#metal)" stroke="#142b37" stroke-width="2"/><path d="M18 89Q28 77 36 52H64Q72 77 82 89Q70 104 50 103Q29 102 18 89Z" fill="url(#enamel)" stroke="url(#metal)" stroke-width="4"/><ellipse cx="50" cy="91" rx="28" ry="7" fill="none" stroke="#f7e1a4" stroke-width="2"/><path d="M35 47h30l4 12H31z" fill="url(#metal)" stroke="#51452e"/><circle cx="50" cy="29" r="23" fill="url(#enamel)" stroke="url(#metal)" stroke-width="4"/><ellipse cx="43" cy="20" rx="10" ry="7" fill="#fff8db" opacity=".55"/><path d="M37 67L31 85" stroke="#fff1c2" stroke-width="4" stroke-linecap="round" opacity=".7"/></svg>'''
 path=f'assets/svg/premium/pawn-{i}.svg';(R/path).write_text(body);m['assets'][f'premium.pawn.{i}']=path
# Enrich build scenes without repainting category/owner values into assets.
for key,path in list(m['assets'].items()):
 if not key.startswith(('lot.','zone.','stage.','building.','premium.stage.')):continue
 p=R/path;s=p.read_text();stage=4 if key.startswith('building.') else int(key.split('.')[-1]) if key.startswith(('stage.','premium.stage.')) else 0
 terrain='''<linearGradient id="soil" x2=".8" y2="1"><stop stop-color="#9aab70"/><stop offset=".5" stop-color="#73885c"/><stop offset="1" stop-color="#465b42"/></linearGradient><linearGradient id="concrete" x2="1" y2="1"><stop stop-color="#e3decb"/><stop offset="1" stop-color="#8d9b98"/></linearGradient><pattern id="pavers" width="12" height="8" patternUnits="userSpaceOnUse"><rect width="12" height="8" fill="#a8aca0"/><path d="M0 0h12M0 8h12M6 0v8" stroke="#d3d0b9" stroke-width=".65"/></pattern>'''
 s=s.replace('</defs>',terrain+'</defs>').replace('fill="#657452"','fill="url(#soil)"')
 # Architectural grounds: plot surround, paved approach, hedges and fine cast shadows.
 layer='''<path d="M40 76H343V226H40Z" fill="none" stroke="#c1bca3" stroke-width="2"/><path d="M43 229H341V253H43Z" fill="url(#pavers)"/><path d="M49 76h277" stroke="#263c30" stroke-width="6"/><path d="M49 73h277" stroke="#708a4d" stroke-width="5"/>'''
 if stage==0:
  layer+='''<path d="M98 111l118-29 86 47-120 52z" fill="#4d6549" opacity=".35"/><path d="M99 113l117-29 86 46-121 51z" fill="none" stroke="#d8d6b3" stroke-width="1.3" stroke-dasharray="7 5"/><path d="M98 111v13m118-42v12m86 35v13m-120 39v13" stroke="#d9ccb0" stroke-width="3"/>'''
 elif stage==1:
  layer+='''<path d="M90 132l106 52 102-51v49l-102 51-106-50z" fill="#164757" opacity=".45"/><path d="M105 138l90 44 88-43m-178 14l90 44 88-43m-178 14l90 44 88-43m-148-47v48m31-33v48m31-33v48m31-62v47m31-63v47" stroke="#a5d9d8" stroke-width="1"/>'''
 elif stage==2:
  layer+='''<path d="M88 200l106 48 106-51-105-48z" fill="url(#concrete)" stroke="#e3d5b3" stroke-width="2"/><path d="M110 193l86 39 83-40m-148-8l65 30 63-30m-130-15v48m28-35v48m67-65v48m27-62v48" stroke="#586b68" stroke-width="2"/>'''
 elif stage==3:
  layer+='''<path d="M88 225v-91l109 54 110-54v90M88 164l109 53 110-53M88 196l109 53 110-53M120 151v89m34-72v88m43-68v62m38-82v72m38-91v75" fill="none" stroke="#c6cbd1" stroke-width="2"/><path d="M100 209h44v18h-44zM250 219h43v14h-43z" fill="#ba885a" stroke="#e1b579"/><path d="M100 215h44m-32-6v18m15-18v18m123-2h43m-30-6v14" stroke="#76543d" stroke-width="1"/>'''
 if stage==4:
  layer+='''<ellipse cx="207" cy="226" rx="99" ry="14" fill="#19322e" opacity=".23"/><path d="M91 225H286" stroke="#e5deba" stroke-width="2"/>'''
 # Ground details must sit beneath existing buildings/tree layers.
 s=s.replace('<path d="M14 56H369',layer+'<path d="M14 56H369',1)
 if stage==3:
  # Put physical scaffolding in front of the frame, still inside safe bands.
  overlay=layer[layer.index('<path d="M88 225'):]
  s=s.replace('<rect x="13" y="272"',overlay+'<rect x="13" y="272"',1)
 p.write_text(s)
mp.write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n')
print('Updated parcel scenes; six physical pawn assets; ring artwork unchanged')

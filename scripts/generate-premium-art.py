"""Reproducible original vector artwork. No game constants or financial data."""
from pathlib import Path
import json, re, html, random
ROOT=Path(__file__).resolve().parents[1]
manifest=json.loads((ROOT/'assets/svg/manifest.json').read_text())
A=manifest['assets']; created=[]
def svg(w,h,title,body):
 return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" role="img" aria-label="{html.escape(title)}"><title>{html.escape(title)}</title><defs><linearGradient id="gold" x2="0.8" y2="1"><stop stop-color="#fff0bc"/><stop offset=".22" stop-color="#c28e37"/><stop offset=".46" stop-color="#fff1b4"/><stop offset=".7" stop-color="#a16d28"/><stop offset="1" stop-color="#e2ba67"/></linearGradient><linearGradient id="cream" x2="1" y2="1"><stop stop-color="#fff5d7"/><stop offset=".5" stop-color="#e8d3a0"/><stop offset="1" stop-color="#f7e9c8"/></linearGradient><linearGradient id="navy" x2=".7" y2="1"><stop stop-color="#263b49"/><stop offset="1" stop-color="#06121e"/></linearGradient><linearGradient id="glass" x2="1" y2="1"><stop stop-color="#d4e9e8"/><stop offset=".45" stop-color="#6495ad"/><stop offset="1" stop-color="#294453"/></linearGradient><pattern id="grain" width="9" height="9" patternUnits="userSpaceOnUse"><path d="M0 1h2m3 4h1m1 3h2" stroke="#fff" opacity=".07"/></pattern></defs>{body}</svg>'''
def write(key,rel,art):
 A[key]=rel;p=ROOT/rel;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(art);created.append(rel)
def icon(kind):
 paths={
 'auction':'<g transform="rotate(-38)"><rect x="-10" y="-8" width="23" height="87" rx="6"/><rect x="-39" y="-38" width="80" height="39" rx="7"/><path d="M-42 -40v43m86-43v43"/></g><path d="M-49 71h75l8 13h-91z"/>',
 'work':'<path d="M-56 22a56 56 0 0 1 112 0v12H-56z"/><path d="M-14-31v54m28-54v54M-66 38H66"/>',
 'build':'<path d="M-40 70V-64h9V70M-62-54H65L-40-76zM-30-49H59M48-48v65h-13v13h23V17M-55 70h49"/>',
 'network':'<path d="M-58-44H4v40h51v60H-7V17h-51z"/><circle cx="-57" cy="-43" r="12"/><circle cx="54" cy="56" r="12"/><path d="M13-65L-11-23H9L-9 12l42-48H13z"/>',
 'market':'<path d="M-57 64V27h21v37zm38 0V-9h21v73zm38 0V-47h21V64z"/><path d="M-61-4l43-28 24 8 46-40M31-64h21v22"/>',
 'exchange':'<path d="M-57 64V27h21v37zm38 0V-9h21v73zm38 0V-47h21V64z"/><path d="M-61-4l43-28 24 8 46-40M31-64h21v22"/>',
 'deal':'<path d="M-63-13l29-28 24 12 22-12 49 34-27 39-21 18-21-4-34-31z"/><path d="M-10-29L-29-5-13 6 8-8l31 28M-14 15l27 25M-28 25l24 22"/>',
 'audit':'<path d="M0-67l52 20v42Q46 43 0 70-46 43-52-5v-42z"/><path d="M-23 0l17 18 33-40"/>',
 'crisis':'<path d="M-55-57v113h114M-42-32l34 42 25-22 43 54M37 44h23V21"/>',
 'event':'<path d="M0-66l16 45 48 2-38 29 14 47L0 30-40 57l14-47-38-29 48-2z"/>',
 'start':'<path d="M-45 70V-66M-42-60Q-9-78 15-56T60-55V6Q33 23 9 3T-42 5z"/><path d="M-25-62v62M3-60v67m28-60v64M-40-30h99"/>',
 'city':'<path d="M-60 62h120M-45 60V-8h25V60M-14 60V-63h38V60M30 60V-24h25v84"/><path d="M-4-48H13M-4-26h17M-4-4h17M-4 18h17M-4 40h17"/>',
 'permit':'<path d="M-47-65H24l25 25V65h-96zM24-65v27h25M-27-13h53M-27 7h53M-27 27H3"/><circle cx="21" cy="40" r="15"/>',
 'investor':'<ellipse cx="0" cy="-36" rx="45" ry="17"/><path d="M-45-36V9c0 24 90 24 90 0v-45M-45-12c0 24 90 24 90 0M-45 12v26c0 24 90 24 90 0V12"/>',
 'tenant':'<path d="M-59-5L0-62 59-5H43v70h-86V-5zM-12 65V20h25v45M-26-5h12m28 0h12"/>',
 'buyer':'<path d="M-50 59h100V-8H-50zM-30-8v-22c0-37 60-37 60 0v22M0 12v29m-14-15h28"/>'}
 return '<g fill="#263139" stroke="url(#gold)" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round">'+paths.get(kind,paths['event'])+'</g>'
colors={'start':'#266c54','auction':'#f1e2bb','work':'#dc983d','market':'#f1e2bb','exchange':'#f1e2bb','build':'#ae7941','event':'#f1e2bb','network':'#f1e2bb','deal':'#f1e2bb','audit':'#6583a6','crisis':'#f1e2bb','city':'#437b9a'}
# Replace all 32 runtime-bound tiles, preserving each key and path.
for key,path in list(A.items()):
 if not key.startswith('track.'):continue
 old=(ROOT/path).read_text();title=re.search(r'<title>(.*?)</title>',old).group(1);kind={9:'work',11:'audit'}.get(int(key.split('.')[1]),Path(path).stem.split('-')[-1]);c=colors.get(kind,'#d8c292');n=int(key.split('.')[1]);dark=kind in ('start','audit')
 body=f'<rect x="2" y="2" width="316" height="316" rx="25" fill="url(#gold)"/><rect x="7" y="7" width="306" height="306" rx="21" fill="url(#navy)"/><path d="M52 19H284L301 38V282L280 302H38L19 281V53z" fill="url(#gold)"/><path d="M54 25H281L295 40V279L278 295H41L25 279V55z" fill="{c if kind in ('start','audit','work','build') else "url(#cream)"}"/><path d="M54 25H281L295 40V279L278 295H41L25 279V55z" fill="url(#grain)"/><path d="M29 90H72L89 73V27" fill="none" stroke="#af8238" stroke-width="2"/><text x="52" y="69" text-anchor="middle" font-family="Arial,sans-serif" font-weight="700" font-size="31" fill="{"#fff0cd" if dark else "#14212b"}">{n}</text><g transform="translate(164 153) scale(1.05)">{icon(kind)}</g>'
 words=title.upper().split();lines=[title.upper()] if len(title)<17 else [' '.join(words[:1]),' '.join(words[1:])]
 for j,line in enumerate(lines):body+=f'<text x="160" y="{264+j*19-(10 if len(lines)>1 else 0)}" text-anchor="middle" font-family="Arial,sans-serif" font-weight="800" font-size="{19 if len(line)>19 else 24}" fill="{"#fff0cd" if dark else "#14212b"}">{html.escape(line)}</text>'
 write(key,path,svg(320,320,title,body))
# Architecture: screen-projected solid forms, individual windows, roof plant and landscape.
def poly(points,fill,stroke='#53636b',width=1):return f'<polygon points="{points}" fill="{fill}" stroke="{stroke}" stroke-width="{width}"/>'
def building(x,y,w,d,h,style=0):
 y-=18;h*=.82;w*=.9;d*=.9
 # x,y is rear roof corner; fronts descend from the roof to the ground.
 lx=x-w;rx=x+d;cy=y+w*.48;fy=cy+d*.48
 out=poly(f'{x},{y+h} {rx},{y+d*.48+h} {x-w+d},{fy+h} {lx},{cy+h}','#111e26',width=0)
 out+=poly(f'{lx},{cy} {x-w+d},{fy} {x-w+d},{fy+h} {lx},{cy+h}', '#c8c4b2' if style!=2 else '#9ca8a9')
 out+=poly(f'{x-w+d},{fy} {rx},{y+d*.48} {rx},{y+d*.48+h} {x-w+d},{fy+h}', '#536f7b' if style!=2 else '#68767a')
 out+=poly(f'{x},{y} {rx},{y+d*.48} {x-w+d},{fy} {lx},{cy}', '#eee4c8')
 out+=poly(f'{x},{y+5} {rx-8},{y+d*.48+5} {x-w+d},{fy-5} {lx+8},{cy}', '#718790')
 for floor in range(1 if style==2 else max(1,int(h/17))):
  oy=12+floor*17
  for j in range(max(2,int(w/15))):
   xx=lx+6+j*14;yy=cy+oy+j*6.72
   out+=poly(f'{xx},{yy} {xx+8},{yy+3.84} {xx+8},{yy+13} {xx},{yy+9}', 'url(#glass)', '#536d78',.6)
  for j in range(max(2,int(d/15))):
   xx=x-w+d+6+j*14;yy=fy+oy-j*6.72
   out+=poly(f'{xx},{yy} {xx+8},{yy-3.84} {xx+8},{yy+6} {xx},{yy+10}', '#a3cbd1' if (j+floor)%4 else '#eed195','#344d60',.6)
 out+=poly(f'{x-15},{y+10} {x+12},{y+23} {x-1},{y+30} {x-27},{y+17}','#b9c6c5')
 if style==1:
  out+=poly(f'{lx-4},{cy} {x-5},{y-22} {rx+5},{y+d*.48-10} {x-w+d},{fy}', '#9b6e46','#dab582',2)
  out+=f'<path d="M{x-5} {y-22}L{x-w+d} {fy}" stroke="#c29b6a" stroke-width="3"/>'
 if style==2:
  out+=poly(f'{lx+20},{cy+h-29} {lx+60},{cy+h-10} {lx+60},{cy+h+14} {lx+20},{cy+h-5}', '#34434a','#c4c2b0',2)
  out+=f'<path d="M{lx+22} {cy+h-22}l35 17m-35-8l35 17" stroke="#88999b" stroke-width="2"/>'
 out+=f'<path d="M{x-20} {y+20}l20 10m-15-5v-9m8 13v-10" stroke="#e0e5da" stroke-width="2"/>'
 return out
zones=['j1','ret','pk','od','jk4','unique'];zc=['#5b9165','#c49750','#78969b','#7887ac','#b87b68','#65a7a2']
def parcel(zone,stage=0,variant=0):
 rng=random.Random(variant+zones.index(zone)*311);c=zc[zones.index(zone)]
 out='<rect width="384" height="320" rx="10" fill="#c9c2a9"/><rect x="5" y="5" width="374" height="310" rx="7" fill="#27343c" stroke="url(#gold)" stroke-width="3"/><rect x="12" y="39" width="360" height="226" fill="#657452"/>'
 out+='<path d="M14 56H369M22 258H366M23 56V251M363 57V250" stroke="#b8b5a0" stroke-width="14"/><path d="M18 56H366M23 258H366" stroke="#e6dbbb" stroke-width="2"/>'
 for i in range(40):
  x=rng.randint(38,345);y=rng.randint(75,243);out+=f'<path d="M{x} {y}l{rng.randint(2,12)} -2" stroke="{rng.choice(["#7b8c59","#576b48","#a29869"])}" stroke-width="2"/>'
 if stage in (1,2):
  out+='<path d="M84 124l131-56 90 47-130 67zM84 124v82l91 43 130-64v-70M175 182v67" fill="#a09a7b" stroke="#f0dcaa" stroke-width="2" stroke-dasharray="9 4"/>'
  if stage==2:out+='<path d="M75 219L296 112M85 102l211 104" stroke="#e3b85e" stroke-width="6"/><path d="M60 225h265" stroke="#bdb9a1" stroke-width="10"/>'
 elif stage==3:
  out+='<path d="M103 229V128l101-48 88 45v105l-97 35z" fill="#b4a68a" stroke="#e1d3b3" stroke-width="3"/><path d="M104 154l90 43 98-47m-188 36l90 43 98-47M128 140v100m35-82v98m31-123v130m35-117v99m32-115v100" stroke="#765c40" stroke-width="7"/>'
  out+='<path d="M72 245V65h8v180M44 83h269L74 56zM270 83v85h-15v10h27v-10" stroke="#e6bb4e" fill="none" stroke-width="5"/><path d="M73 94l7 18-7 18 7 18-7 18 7 18-7 18" stroke="#b48125" stroke-width="2"/>'
 elif stage==4:
  if zone=='j1':out+=building(179,111,72,89,80,1)+building(282,132,45,58,63,1)
  elif zone=='ret':out+=building(205,112,110,112,85)+ '<path d="M100 175l109 52 103-49" stroke="#d2a251" stroke-width="12"/>'
  elif zone=='pk':out+=building(201,129,119,117,68,2)+'<path d="M250 149V74h14v82M276 161V93h13v73" stroke="#a07e67" stroke-width="8"/>'
  elif zone=='od':out+=building(208,50,76,85,156)+building(286,139,40,46,65)
  elif zone=='jk4':out+=building(167,56,66,73,152)+building(270,87,64,71,123)
  else:out+=building(203,88,108,106,104)+'<ellipse cx="202" cy="97" rx="64" ry="26" fill="#99baca" stroke="#ebe1bd" stroke-width="5"/><path d="M140 97h124m-60-24v48" stroke="#d9e1d8" stroke-width="3"/>'
 # Parking and pedestrian approach, all within artwork safe area.
 out+='<path d="M86 242h197" stroke="#b8b7a6" stroke-width="13"/><path d="M90 242h190" stroke="#3a494f" stroke-width="8"/>'
 for cx,cc in [(108,'#e3dbc8'),(139,'#7f9da9'),(260,'#c1a387')]:
  out+=f'<rect x="{cx}" y="237" width="21" height="9" rx="3" fill="{cc}" stroke="#253841"/><path d="M{cx+7} 238v7m7-7v7" stroke="#415763" stroke-width="2"/>'
 # Planted border: tree canopy clusters + trunks, always outside architecture footprint.
 for x,y in [(42,92),(49,166),(325,208),(312,239),(66,240),(335,98)]:
  out+=f'<ellipse cx="{x+3}" cy="{y+10}" rx="13" ry="5" fill="#233e2d" opacity=".6"/><path d="M{x} {y}v13" stroke="#604e32" stroke-width="3"/><circle cx="{x}" cy="{y-7}" r="12" fill="#304d34"/><circle cx="{x-3}" cy="{y-10}" r="9" fill="#597641"/><circle cx="{x-5}" cy="{y-13}" r="5" fill="#77944e"/>'
 out+=f'<rect x="13" y="272" width="358" height="34" rx="3" fill="{c}"/><path d="M14 272h356" stroke="#e5cf95" stroke-width="2"/>'
 return out
for key,path in list(A.items()):
 if key.startswith('lot.') or key.startswith('zone.') or key.startswith('building.') or key.startswith('stage.'):
  old=(ROOT/path).read_text();title=re.search(r'<title>(.*?)</title>',old).group(1)
  if key.startswith('lot.'):
   # actual runtime zones, extracted from source below
   txt=(ROOT/'index.html').read_text();grid=re.search(r'const ZONE_GRID\s*=\s*(\[[^;]+\])',txt).group(1);grid=re.findall(r"'([^']+)'",grid);i=int(key.split('.')[1])-1;zone=grid[i].lower();stage=0
  elif key.startswith('stage.'):zone='od';stage=int(key.split('.')[1]);i=stage
  else:zone=key.split('.')[1];stage=4 if key.startswith('building.') else 0;i=zones.index(zone)
  write(key,path,svg(384,320,title,parcel(zone,stage,i)))
# Zone-specific construction images prevent generic office construction on industrial lots.
for zone in zones:
 for stage in range(4):
  key=f'premium.stage.{zone}.{stage}';write(key,f'assets/svg/premium/stage-{zone}-{stage}.svg',svg(384,320,'Стадия строительства',parcel(zone,stage,stage)))
# All actual card art retained under existing identities, captions remain authoritative DOM.
for key,path in list(A.items()):
 if not key.startswith('card.'):continue
 old=(ROOT/path).read_text();title=re.search(r'<title>(.*?)</title>',old).group(1);family=key.split('.')[1];kind={'utilities':'permit','permits':'audit','construction':'build','commissioning':'city','network':'network','investor':'investor','tenant':'tenant','buyer':'buyer'}.get(family,'event');c=colors.get(kind,'#9c8258')
 body=f'<rect x="2" y="2" width="252" height="380" rx="16" fill="url(#gold)"/><rect x="7" y="7" width="242" height="370" rx="12" fill="url(#cream)"/><rect x="14" y="14" width="228" height="52" rx="5" fill="url(#navy)"/><path d="M20 74h216" stroke="{c}" stroke-width="5"/><g transform="translate(128 184) scale(.95)">{icon(kind)}</g><path d="M35 285h186m-171 8h156" stroke="#b59456"/><text x="128" y="46" text-anchor="middle" font-family="Arial,sans-serif" font-size="16" fill="#f3dda6" letter-spacing="2">ДЕВЕЛОПЕР</text><text x="128" y="332" text-anchor="middle" font-family="Arial,sans-serif" font-size="15" fill="#203342">{html.escape({'utilities':'ПРОЕКТИРОВАНИЕ','permits':'РАЗРЕШЕНИЯ','construction':'СТРОИТЕЛЬСТВО','commissioning':'ВВОД ОБЪЕКТА','network':'ИНЖЕНЕРНЫЕ СЕТИ','investor':'ИНВЕСТОР','tenant':'АРЕНДАТОР','buyer':'ПОКУПАТЕЛЬ'}.get(family,'СОБЫТИЕ'))}</text><rect x="12" y="12" width="232" height="360" rx="9" fill="url(#grain)"/>'
 write(key,path,svg(256,384,title,body))
for kind in ['city','auction','build','market','work','deal','audit','network','investor','tenant','buyer','permit','event','start']:
 write('premium.icon.'+kind,'assets/svg/premium/icon-'+kind+'.svg',svg(160,160,kind,'<g transform="translate(80 80) scale(.9)">'+icon(kind)+'</g>'))
(ROOT/'assets/svg/manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
(ROOT/'docs/design-v020/art-inventory.json').write_text(json.dumps({'generated':created,'count':len(created)},indent=2)+'\n')
print('Generated',len(created),'original SVG files; manifest',len(A))

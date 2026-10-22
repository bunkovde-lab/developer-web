"""Unframed vector illustrations: screen art, editable source for later print design."""
from pathlib import Path
from html import escape
OUT=Path(__file__).resolve().parents[1]/'assets/svg/atelier';OUT.mkdir(parents=True,exist_ok=True)
COLORS={'j1':'#789a91','ret':'#bd956b','pk':'#8397a2','od':'#648d9e','jk4':'#9b919f','unique':'#b1a06b','waterfront':'#76a9b4','transit':'#8c9c94'}
def P(x,y,z=0):return (240+(x-y)*4.9,151+(x+y)*2.25-z*2.5)
def poly(points,fill,stroke='#304955',sw=.6):return '<polygon points="'+' '.join(f'{x:.1f},{y:.1f}' for x,y in points)+f'" fill="{fill}" stroke="{stroke}" stroke-width="{sw}" stroke-linejoin="round"/>'
def line(a,b,color='#5a7476',sw=.7,dash=''):return f'<path d="M{a[0]:.1f} {a[1]:.1f}L{b[0]:.1f} {b[1]:.1f}" fill="none" stroke="{color}" stroke-width="{sw}"'+(f' stroke-dasharray="{dash}"' if dash else '')+'/>'
def face(coords,fill,stroke='#304955'):return poly([P(*v) for v in coords],fill,stroke)
def block(x,y,w,d,h,color,glass=False):
 s=face([(x,y+d,0),(x+w,y+d,0),(x+w,y+d,h),(x,y+d,h)],'#b7b5a4')+face([(x+w,y,0),(x+w,y+d,0),(x+w,y+d,h),(x+w,y,h)],color)+face([(x,y,h),(x+w,y,h),(x+w,y+d,h),(x,y+d,h)],'#e6ddc6')
 if h>4:
  for z in range(3,int(h)-1,4):
   for u in range(2,int(w)-1,3):s+=face([(x+u,y+d+.03,z),(x+u+1.6,y+d+.03,z),(x+u+1.6,y+d+.03,z+2),(x+u,y+d+.03,z+2)],'#456b7b' if glass else '#e5d8aa')
   for v in range(2,int(d)-1,3):s+=face([(x+w+.03,y+v,z),(x+w+.03,y+v+1.6,z),(x+w+.03,y+v+1.6,z+2),(x+w+.03,y+v,z+2)],'#315466' if glass else '#728a8b')
  for z in range(0,int(h),4):s+=line(P(x+w,y,z),P(x+w,y+d,z),'#d1d4c8',.6)
 s+=face([(x+1,y+1,h+.1),(x+w-1,y+1,h+.1),(x+w-1,y+d-1,h+.1),(x+1,y+d-1,h+.1)],'#a9b4ad')
 return s

def tree(x,y):
 a=P(x,y);return f'<ellipse cx="{a[0]+4}" cy="{a[1]+2}" rx="10" ry="3" fill="#18352c" opacity=".12"/>'+line(a,P(x,y,5),'#747356',1.5)+f'<circle cx="{a[0]}" cy="{a[1]-17}" r="8" fill="#4e7970"/><circle cx="{a[0]-2}" cy="{a[1]-20}" r="5.7" fill="#86a491"/><circle cx="{a[0]-4}" cy="{a[1]-22}" r="2.7" fill="#b2bd91"/>'

def scene(zone,stage):
 c=COLORS[zone];s='<path d="M0 205H480V280H0Z" fill="#d8d7ca" opacity=".3"/>'
 s+=face([(-24,-22,-1),(24,-22,-1),(24,22,-1),(-24,22,-1)],'#b3b7aa')
 s+=face([(-23,-21,0),(23,-21,0),(23,21,0),(-23,21,0)],'#d4d4c2')
 s+=face([(-20,-18,.1),(20,-18,.1),(20,18,.1),(-20,18,.1)],'#a7b6a0' if stage==0 else '#c7c9b8')
 for v in [-23,23]:s+=line(P(v,-24),P(v,25),'#e7e0cd',1.4)
 for v in [-22,22]:s+=line(P(-24,v),P(24,v),'#e7e0cd',1.4)
 if zone=='waterfront':
  s+=face([(-23,12,.2),(23,12,.2),(23,22,.2),(-23,22,.2)],'#7ca7ad')
  for y in [14,17,20]:s+=line(P(-22,y,.4),P(22,y,.4),'#c0d6cd',.8)
 if stage==0:
  pts=[(-13,-11,.3),(13,-11,.3),(13,11,.3),(-13,11,.3)]
  for a,b in zip(pts,pts[1:]+pts[:1]):s+=line(P(*a),P(*b),'#f3edd4',1.2,'4 3')
  for x,y,_ in pts:s+=line(P(x,y),P(x,y,2),'#d3ac65',2)+poly([P(x,y,2),P(x+2,y,2),P(x+2,y,3),P(x,y,3)],c)
  s+=line(P(-16,-14),P(16,-14),'#77988e',.7)+line(P(-16,-14),P(-16,14),'#77988e',.7)
 elif stage==1:
  for x in range(-12,14,4):s+=line(P(x,-10,.5),P(x,10,.5),'#718e93',.9)
  for y in range(-10,12,4):s+=line(P(-12,y,.5),P(12,y,.5),'#718e93',.9)
  s+=face([(-13,-11,.4),(13,-11,.4),(13,11,.4),(-13,11,.4)],'#e2e4d5')
  for y in [-8,0,8]:s+=line(P(-11,y,.6),P(11,y,.6),'#4c7b8d',1.2)
  for x in [-9,0,9]:s+=line(P(x,-9,.6),P(x,9,.6),'#4c7b8d',1.2)
 elif stage in [2,3]:
  s+=block(-12,-10,24,20,2,'#9aa7a2')
  for z in ([5] if stage==2 else [5,11,17]):
   for x in [-10,0,10]:
    for y in [-8,8]:s+=line(P(x,y,2),P(x,y,z+4),'#839696',2)
   s+=face([(-12,-10,z),(12,-10,z),(12,10,z),(-12,10,z)],'#bdc6ba')
  if stage==3:
   a=P(16,-11);s+=line(a,P(16,-11,37),'#b68c45',2.5)+line(P(6,-11,36),P(29,-11,36),'#b68c45',2)+line(P(16,-11,39),P(29,-11,36),'#b68c45',.8)+line(P(26,-11,36),P(26,-11,17),'#6d7873',.8)
 else:
  if zone=='j1':
   s+=block(-13,-9,13,15,10,c)+block(2,-8,10,13,7,'#90a299');s+=face([(-14,-10,10),(-7.5,-10,15),(1,-10,10),(1,7,10),(-7.5,7,15),(-14,7,10)],'#6e7c7a')
  elif zone=='ret':
   s+=block(-15,-10,30,18,10,c,True)
   for x in range(-12,13,5):s+=face([(x,8.1,1),(x+3,8.1,1),(x+3,8.1,6),(x,8.1,6)],'#4f7880')
   s+=line(P(-15,8,8),P(15,8,8),'#d5a85a',3)
  elif zone=='pk':
   s+=block(-15,-12,28,22,12,c)
   for x in [-11,-4,3]:s+=block(x,-9,4,17,13,'#b0b8ad')
   s+=block(14,1,3,3,24,'#778c8c')
  elif zone=='od':s+=block(-10,-9,19,18,36,c,True)+block(10,-5,5,12,8,'#9baba6')
  elif zone=='jk4':s+=block(-14,-9,11,16,28,c,True)+block(2,-9,11,16,35,'#7e969b',True)
  elif zone=='transit':
   s+=block(-16,-9,31,17,11,c,True)
   for y in [11,15]:s+=line(P(-19,y),P(20,y),'#566b70',1.4)+line(P(-19,y+1),P(20,y+1),'#abbcb1',.7)
  else:s+=block(-15,-10,13,15,14,c,True)+block(-2,-10,16,10,23,'#7f9b9d',True)+block(0,0,11,9,9,c)
 for x,y in [(-20,-15),(-20,12),(19,15),(21,-15)]:s+=tree(x,y)
 # Fine architectural registration marks, without a second printed frame.
 s+='<path d="M24 210h24m-12-12v24M432 210h24m-12-12v24" stroke="#819795" stroke-width=".6" opacity=".55"/>'
 return s

def svg(body,title,bg=True):
 return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 280" role="img" aria-label="'+escape(title)+'"><title>'+escape(title)+'</title><defs><linearGradient id="paper" x2="1" y2="1"><stop stop-color="#f1ecdd"/><stop offset="1" stop-color="#d5d8cb"/></linearGradient><pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0V24" fill="none" stroke="#456c73" stroke-opacity=".07" stroke-width=".6"/></pattern></defs>'+('<rect width="480" height="280" fill="url(#paper)"/><rect width="480" height="280" fill="url(#grid)"/>' if bg else '')+body+'</svg>'
for zone in COLORS:
 for stage in range(5):(OUT/f'{zone}-{stage}.svg').write_text(svg(scene(zone,stage),f'Архитектурная иллюстрация · {zone} · {stage}'),encoding='utf8')
FAMILIES={'utilities':('od',1),'permits':('j1',1),'construction':('pk',3),'commissioning':('od',4),'network':('transit',2),'investor':('jk4',4),'tenant':('j1',4),'buyer':('waterfront',4),'work':('pk',3),'tax':('od',1),'individual':('ret',4),'crisis':('jk4',2),'cityRequest':('pk',1),'dealDemand':('ret',1),'exchangeDemand':('transit',4)}
for f,(z,stage) in FAMILIES.items():(OUT/f'card-{f}.svg').write_text(svg(scene(z,stage),f'Девелопер · {f}'),encoding='utf8')
# Action graphics are miniature architectural scenes, never font glyphs.
ACTIONS={'start':('waterfront',4),'auction':('ret',4),'work':('pk',3),'market':('jk4',4),'build':('pk',3),'event':('ret',1),'network':('transit',2),'deal':('j1',1),'tax':('od',1),'crisis':('jk4',2),'exchange':('od',4)}
for f,(z,st) in ACTIONS.items():(OUT/f'action-{f}.svg').write_text(svg(scene(z,st),f'Игровая клетка · {f}'),encoding='utf8')
# Hero objects: physical drafting tools, papers and equipment in the same ink palette.
def hero(kind):
 shadow='<ellipse cx="243" cy="210" rx="112" ry="15" fill="#1d3b46" opacity=".12"/>'
 paper='<g transform="rotate(-8 240 140)"><path d="M152 62H304L331 89V215H152Z" fill="#faf3df" stroke="#788f91" stroke-width="1.5"/><path d="M304 62v27h27" fill="#d4dbc9" stroke="#788f91"/>'
 for y in [105,118,131,144,157]:paper+=f'<path d="M173 {y}h104" stroke="#7c9496" stroke-width="1.1"/>'
 paper+='<path d="M174 181h54m-54 7h38" stroke="#b5975b" stroke-width="2"/></g>'
 if kind=='auction':return shadow+'<g transform="rotate(-26 240 140)"><path d="M217 109h23v115h-23z" fill="#6f5141" stroke="#384f56"/><path d="M223 109h5v115h-5z" fill="#c6ac77"/><path d="M172 71h117v59H172Z" fill="#b18b55" stroke="#344e59" stroke-width="2"/><path d="M172 71l13-12h104v59l-13 12V71Z" fill="#dfc38b"/><path d="M187 72h12v58h-12m58-58h12v58h-12" fill="#496675" stroke="#ddc48b"/></g><path d="M179 215l18-12h107l17 12v13H179Z" fill="#6b7773" stroke="#516c72"/><path d="M179 215h142" stroke="#d8bd7e" stroke-width="3"/>'
 if kind in ['work','build']:return shadow+'<path d="M142 181c0-68 39-109 99-109s98 41 98 109l17 10c-22 31-210 31-232 0Z" fill="#d2ae68" stroke="#5f7371" stroke-width="2"/><path d="M142 181c57 14 139 14 197 0" fill="none" stroke="#947645" stroke-width="6"/><path d="M208 80v99m64-99v99" fill="none" stroke="#9e824f" stroke-width="8"/><path d="M218 70h43v114h-43z" fill="#edda9f" stroke="#b39559"/><path d="M163 148c9-30 23-48 37-54" fill="none" stroke="#f9edc8" stroke-width="5"/>'
 if kind=='network':return shadow+'<g fill="none" stroke-linejoin="round"><path d="M145 100h98v94h102M145 160h54v-87h117v55h41" stroke="#304e5c" stroke-width="22"/><path d="M145 97h98v94h102M145 157h54V70h117v55h41" stroke="#85a7ac" stroke-width="14"/><path d="M145 93h98v94h102M145 153h54V66h117v55h41" stroke="#c6d4c6" stroke-width="3"/></g><g fill="#d9c18a" stroke="#42616a" stroke-width="2"><circle cx="199" cy="157" r="15"/><circle cx="243" cy="97" r="15"/><circle cx="316" cy="125" r="15"/></g><g stroke="#596e6c" stroke-width="2"><path d="M190 157h18m-9-9v18m35-69h18m-9-9v18m64 19h18m-9-9v18"/></g>'
 if kind in ['event','deal','tax']:
  stamp='<circle cx="290" cy="178" r="27" fill="#68877b" stroke="#c2ac76" stroke-width="3"/><circle cx="290" cy="178" r="20" fill="none" stroke="#d9d3ad"/><path d="M278 183v-15l10-6v21m0-10 12-7v17m-25 1h29" fill="none" stroke="#e5d9b5" stroke-width="2"/>'
  pen='<g transform="rotate(28 320 145)"><path d="M314 73h12v117l-6 19-6-19Z" fill="#294e61" stroke="#bda571" stroke-width="1.5"/><path d="M314 86h12m-12 7h12m-6 97v19" stroke="#d8be84" stroke-width="2"/></g>'
  return shadow+paper+stamp+pen
 if kind=='crisis':return shadow+'<path d="M143 66h193v145H143Z" fill="#244858" stroke="#b6a675" stroke-width="2"/><g stroke="#a7bbac" opacity=".25"><path d="M160 90h156m-156 25h156m-156 25h156m-156 25h156m-156 25h156M185 80v117m35-117v117m35-117v117m35-117v117"/></g><path d="M165 88l36 28 32-12 35 42 38 33" fill="none" stroke="#d4b36e" stroke-width="6"/><path d="M284 179h23v-23" fill="none" stroke="#d4b36e" stroke-width="6"/><path d="M208 212v12h63v-12" fill="#708b8e"/>'
 return ''
for action in ['auction','work','build','event','network','deal','tax','crisis']:
 (OUT/f'action-{action}.svg').write_text(svg(hero(action),'Девелопер · '+action),encoding='utf8')
for family,action in {'permits':'event','construction':'build','network':'network','tax':'tax','individual':'event','crisis':'crisis','dealDemand':'deal','cityRequest':'tax'}.items():
 (OUT/f'card-{family}.svg').write_text(svg(hero(action),'Девелопер · '+family),encoding='utf8')
# Matching engraved backs retain the 2:3 playing-card shape.
for i,f in enumerate(FAMILIES):
 color=['#385f73','#647383','#836a4c','#416d62','#49767b','#847146','#496d5b','#7c5c52'][i%8]
 body=f'<rect x="1" y="1" width="238" height="358" rx="14" fill="#102936" stroke="#cfb682" stroke-width="2"/><rect x="9" y="9" width="222" height="342" rx="9" fill="{color}" stroke="#d8c499" stroke-width=".7"/>'
 for k in range(-300,500,16):body+=f'<path d="M{k} 12l220 336M{k} 348L{k+220} 12" stroke="#e7d4a9" opacity=".11" stroke-width=".7"/>'
 body+='<path d="M120 72L193 180 120 288 47 180Z" fill="#102b39" stroke="#cfb682" stroke-width="1.2"/><path d="M120 91L180 180 120 269 60 180Z" fill="none" stroke="#cfb682" stroke-width=".5"/><g fill="none" stroke="#dcc69a" stroke-width="1.3"><path d="M85 210v-62l22-14v76m0-53 24-15v68m0-87 23 15v72M77 210h87M91 159v7m0 7v7m0 7v7m23-32v8m0 6v8m24-34v8m0 6v8m0 6v8"/></g><path d="M104 114h32m-16-16v32M104 246h32" stroke="#dcc69a" stroke-width=".7"/>'
 (OUT/f'back-{f}.svg').write_text('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 360"><title>Девелопер · рубашка '+f+'</title>'+body+'</svg>')
print('Generated',len(list(OUT.glob('*.svg'))),'editable vector illustrations')

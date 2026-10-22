"""Four architectural skyscraper illustrations using the game's vector primitives."""
from pathlib import Path
root=Path(__file__).resolve().parents[1]
source=root/'scripts/generate-atelier-art.py'
namespace={'__file__':str(source)}
exec(source.read_text().split('for zone in COLORS:')[0],namespace)
for stage,height in enumerate([24,36,48,60],1):
    body=namespace['scene']('od',0)
    body+=namespace['block'](-17,-13,34,26,5,'#708995',True)
    body+=namespace['block'](-9,-7,18,14,height,'#477789',True)
    body+=namespace['face']([(-9,-7,height), (9,-7,height), (9,7,height), (-9,7,height)],'#dac290')
    body+=namespace['line'](namespace['P'](0,0,height),namespace['P'](0,0,height+12),'#bd9854',1.5)
    svg=namespace['svg'](body,f'Небоскрёб · очередь {stage} из 4')
    svg=svg.replace('0 0 480 280','0 -80 480 360').replace('height="280"','height="360" y="-80"')
    (root/f'assets/svg/atelier/tower-{stage}.svg').write_text(svg)

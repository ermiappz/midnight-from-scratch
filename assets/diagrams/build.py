#!/usr/bin/env python3
"""Render the course's diagram-only sources as self-contained HTML.

Run: python3 assets/diagrams/build.py
SVG exports are generated from these HTML sources using diagram-design's exporter.
"""
from pathlib import Path
from html import escape
import json
import math
import textwrap

HERE = Path(__file__).resolve().parent
PAPER, INK, MUTED, BLUE = '#fafaf7', '#0a0a0a', '#54545c', '#0000fe'
SANS = "Outfit, Arial, sans-serif"
MONO = "'Geist Mono', ui-monospace, monospace"
FONTS = 'https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600&family=Geist+Mono:wght@400;500&display=swap'


def text(x, y, value, size=16, color=INK, weight=400, anchor='start', mono=False):
    """Escape every label so course notation remains text inside SVG."""
    return (f'<text x="{x}" y="{y}" font-family="{MONO if mono else SANS}" '
            f'font-size="{size}" font-weight="{weight}" fill="{color}" '
            f'text-anchor="{anchor}">{escape(str(value))}</text>')


def lines(x, y, values, width=32, size=16, color=MUTED, gap=24, mono=False):
    out=[]
    for value in values:
        for line in textwrap.wrap(value, width, break_long_words=False, break_on_hyphens=False) or ['']:
            out.append(text(x,y,line,size,color,mono=mono)); y+=gap
    return ''.join(out)


def rect(x,y,w,h,fill=PAPER,stroke='#c7c7cc',radius=8,dash=''):
    return (f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{radius}" '
            f'fill="{fill}" stroke="{stroke}" stroke-width="1.5" '
            + (f'stroke-dasharray="{dash}" ' if dash else '') + '/>')


def route(points):
    """Round only orthogonal corners; route geometry stays explicit in the catalog."""
    out=f'M {points[0][0]},{points[0][1]}'
    for i in range(1,len(points)-1):
        a,b,c=points[i-1],points[i],points[i+1]
        r=min(8,abs(b[0]-a[0]+b[1]-a[1])/2,abs(c[0]-b[0]+c[1]-b[1])/2)
        def step(p,q,d):
            return (p[0]+(d if q[0]>p[0] else -d if q[0]<p[0] else 0),
                    p[1]+(d if q[1]>p[1] else -d if q[1]<p[1] else 0))
        before,after=step(b,a,r),step(b,c,r)
        out+=f' L {before[0]},{before[1]} Q {b[0]},{b[1]} {after[0]},{after[1]}'
    return out+f' L {points[-1][0]},{points[-1][1]}'


def arrow(points, label='', at=None, dashed=False, accent=False):
    color=BLUE if accent else MUTED
    out=f'<path d="{route(points)}" fill="none" stroke="{color}" stroke-width="2" marker-end="url(#arrow-{ "blue" if accent else "gray"})"'
    out+=(' stroke-dasharray="6 5"' if dashed else '')+'/>'
    if label:
        assert len(label)<=14,label
        x,y=at or ((points[0][0]+points[-1][0])/2,(points[0][1]+points[-1][1])/2-20)
        w=max(36,len(label)*7.4+16)
        out+=rect(x-w/2,y-13,w,20,PAPER,PAPER,2)+text(x,y+2,label,12,MUTED,anchor='middle',mono=True)
    return out


def node(n):
    x,y,w,h=n['box']; kind=n.get('kind','step'); focal=n.get('focal',False)
    fill='#eeeeff' if focal else '#ffffff'
    stroke=BLUE if focal else '#7a7a84'
    out=f'<g data-node="{escape(n["id"])}">'
    if kind=='decision':
        out+=f'<path d="M{x+w/2},{y} L{x+w},{y+h/2} L{x+w/2},{y+h} L{x},{y+h/2} Z" fill="{fill}" stroke="{stroke}" stroke-width="2"/>'
        out+=text(x+w/2,y+h/2-4,n['title'],16,INK,600,'middle')
        for j,line in enumerate(n.get('body',[])):
            out+=text(x+w/2,y+h/2+20+j*20,line,12,MUTED,anchor='middle')
    else:
        out+=rect(x,y,w,h,fill,stroke,24 if kind=='terminal' else 8,'6 5' if kind=='private' else '')
        if kind in ('state','store'):
            out+=f'<path d="M{x+12},{y+12} V{y+h-12}" stroke="{stroke}" stroke-width="3"/>'
        inset=28 if kind in ('state','store') else 20
        tag=n.get('tag',kind.upper())
        out+=text(x+inset,y+28,tag,12,BLUE if focal else MUTED,500,mono=True)
        out+=text(x+inset,y+56,n['title'],20,INK,600)
        out+=lines(x+inset,y+84,n.get('body',[]),int((w-inset-20)/8),16,gap=24)
        if n.get('code'):
            out+=text(x+inset,y+h-20,n['code'],12,INK,mono=True)
    return out+'</g>'


def loop_diagram(spec):
    """Render a branded reinforcing loop with one durable evidence hub."""
    cx, cy = spec.get('center', [640, 432])
    radius = spec.get('radius', 240)
    station_w, station_h = spec.get('station_size', [184, 72])
    hub_w, hub_h = spec.get('hub_size', [224, 112])
    stations = spec['stations']
    count = len(stations)
    assert 5 <= count <= 8

    def angle(index):
        return -math.pi / 2 + index * 2 * math.pi / count

    centers = [(cx + radius * math.cos(angle(i)), cy + radius * math.sin(angle(i))) for i in range(count)]
    station_boxes = [(round((px - station_w / 2) / 4) * 4,
                      round((py - station_h / 2) / 4) * 4,
                      station_w, station_h) for px, py in centers]

    def intersections(index):
        left, top, width, height = station_boxes[index]
        right, bottom = left + width, top + height
        candidates = []
        for x in (left, right):
            remain = radius * radius - (x - cx) ** 2
            if remain >= 0:
                for y in (cy - math.sqrt(remain), cy + math.sqrt(remain)):
                    if top - 0.001 <= y <= bottom + 0.001:
                        candidates.append((x, y))
        for y in (top, bottom):
            remain = radius * radius - (y - cy) ** 2
            if remain >= 0:
                for x in (cx - math.sqrt(remain), cx + math.sqrt(remain)):
                    if left - 0.001 <= x <= right + 0.001:
                        candidates.append((x, y))
        theta = angle(index)
        distinct = []
        for point in candidates:
            if not any(abs(point[0] - other[0]) < 0.01 and abs(point[1] - other[1]) < 0.01 for other in distinct):
                distinct.append(point)
        ordered = []
        for point in distinct:
            value = math.atan2(point[1] - cy, point[0] - cx)
            delta = (value - theta + math.pi) % (2 * math.pi) - math.pi
            ordered.append((delta, point))
        entry = max((item for item in ordered if item[0] < 0), key=lambda item: item[0])[1]
        exit_point = min((item for item in ordered if item[0] > 0), key=lambda item: item[0])[1]
        return entry, exit_point

    bounds = [intersections(i) for i in range(count)]
    out = ''
    # Primary work moves clockwise around a single-radius ring.
    for index in range(count):
        start = bounds[index][1]
        target = bounds[(index + 1) % count][0]
        phi = math.atan2(target[1] - cy, target[0] - cx) - 1.2 / radius
        end = (cx + radius * math.cos(phi), cy + radius * math.sin(phi))
        out += (f'<path d="M {start[0]:.3f},{start[1]:.3f} A {radius},{radius} 0 0 1 {end[0]:.3f},{end[1]:.3f}" '
                'fill="none" stroke="#54545c" stroke-width="2" marker-end="url(#arrow-gray)"/>')
    # Every pass writes evidence back into the shared hub.
    for index, (px, py) in enumerate(centers):
        ux, uy = math.cos(angle(index)), math.sin(angle(index))
        station_distance = min(station_w / 2 / abs(ux) if abs(ux) > 0.001 else 10_000,
                               station_h / 2 / abs(uy) if abs(uy) > 0.001 else 10_000)
        hub_distance = min(hub_w / 2 / abs(ux) if abs(ux) > 0.001 else 10_000,
                           hub_h / 2 / abs(uy) if abs(uy) > 0.001 else 10_000)
        start = (px - station_distance * ux, py - station_distance * uy)
        end = (cx + (hub_distance + 8) * ux, cy + (hub_distance + 8) * uy)
        out += (f'<path d="M {start[0]:.3f},{start[1]:.3f} L {end[0]:.3f},{end[1]:.3f}" '
                'fill="none" stroke="#7a7a84" stroke-width="1.5" stroke-dasharray="5 4" marker-end="url(#arrow-gray)"/>')
    for index, station in enumerate(stations):
        x, y, _, _ = station_boxes[index]
        focal = station.get('focal', False)
        out += '<g>' + rect(x, y, station_w, station_h, '#eeeeff' if focal else '#ffffff', BLUE if focal else '#7a7a84')
        out += text(x + station_w / 2, y + 30, station['title'], 16, BLUE if focal else INK, 600, 'middle')
        out += text(x + station_w / 2, y + 52, station['subtitle'], 12, MUTED, anchor='middle', mono=True) + '</g>'
    hub_x, hub_y = cx - hub_w / 2, cy - hub_h / 2
    out += '<g>' + rect(hub_x, hub_y, hub_w, hub_h, INK, INK)
    out += text(cx, cy - 8, spec['hub']['title'], 20, '#ffffff', 600, 'middle')
    out += text(cx, cy + 20, spec['hub']['subtitle'], 12, '#ffffff', anchor='middle', mono=True) + '</g>'
    return out


def render(d):
    width,height=1280,d.get('height',720)
    slug=d['slug']
    out=f'<svg viewBox="0 0 {width} {height}" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="{slug}-title {slug}-desc">'
    out+=f'<title id="{slug}-title">{escape(d["title"])}</title><desc id="{slug}-desc">{escape(d["desc"])}</desc>'
    out+='<defs>'
    for name,color in [('gray',MUTED),('blue',BLUE)]:
        out+=f'<marker id="arrow-{name}" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="{color}"/></marker>'
    out+='</defs>'+rect(0,0,width,height,PAPER,PAPER,0)
    out+=rect(40,40,8,32,BLUE,BLUE,0)
    out+=text(64,54,'MIDNIGHT FROM SCRATCH  /  '+d['label'].upper(),12,MUTED,500,mono=True)
    out+=text(40,112,d['title'],32,INK,500)
    out+=text(40,144,d['subtitle'],16,MUTED)
    for z in d.get('zones',[]):
        x,y,w,h=z['box']
        out+=rect(x,y,w,h,'#f0f0ee','#c7c7cc',8,'6 5' if z.get('private') else '')
        out+=text(x+16,y+28,z['title'],12,MUTED,500,mono=True)
    if d.get('loop'):
        out += loop_diagram(d['loop'])
    for a in d.get('arrows',[]): out+=arrow(**a)
    if d.get('state_machine'):
        out+='<circle cx="48" cy="328" r="6" fill="#0a0a0a"/>'
        out+=arrow([[56,328],[88,328]])
        out+=arrow([[1192,328],[1220,328]])
        out+='<circle cx="1232" cy="328" r="8" fill="none" stroke="#0a0a0a" stroke-width="2"/>'
        out+='<circle cx="1232" cy="328" r="4" fill="#0a0a0a"/>'
    for n in d.get('nodes',[]):out+=node(n)
    for item in d.get('annotations',[]):
        out+=lines(item['x'],item['y'],item['lines'],item.get('width',55),item.get('size',16),gap=24)
    if d.get('actors'):
        centers=[180,488,796,1104]
        for center,actor in zip(centers,d['actors']):
            out+=f'<path d="M{center},252 V{height-164}" fill="none" stroke="#7a7a84" stroke-dasharray="5 5"/>'
            out+=rect(center-136,192,272,60,'#ffffff','#7a7a84')
            out+=text(center,230,actor,20,INK,600,'middle')
        for idx,(start,end,label,is_return) in enumerate(d['messages']):
            y=304+72*idx
            x1,x2=centers[start],centers[end]
            out+=arrow([[x1,y],[x2,y]],dashed=is_return,accent=idx==3)
            # The mask stays above its stroke, leaving an eight-pixel clear gap.
            tx=(x1+x2)/2 if abs(end-start)==1 else (centers[end-1]+x2)/2
            label_width=len(label)*7.6+16
            out+=rect(tx-label_width/2,y-32,label_width,24,PAPER,PAPER,2)
            out+=text(tx,y-14,label,12,MUTED,anchor='middle',mono=True)
    for seq in d.get('sequence',[]):
        out+=seq
    # A short retrieval cue summarizes this diagram, without changing lesson prose.
    cue_y=height-116
    out+=f'<path d="M40,{cue_y-20} H1240" stroke="#c7c7cc"/>'
    out+=text(40,cue_y+8,'REMEMBER',12,BLUE,500,mono=True)
    out+=lines(164,cue_y+8,d['cue'],98,16,INK,gap=24)
    out+=text(40,height-28,d.get('legend','Solid arrow: flow or transition · Dashed arrow: return / retry · Blue: key idea'),12,MUTED)
    out+=text(1240,height-28,d['label'],12,MUTED,anchor='end')
    out+='</svg>'
    return f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{escape(d['title'])} — Midnight from scratch</title>
<link href="{escape(FONTS,quote=True)}" rel="stylesheet">
<style>
* {{ box-sizing: border-box; }}
body {{ margin:0; padding:24px; background:{PAPER}; color:{INK}; font-family:{SANS}; }}
main {{ max-width:1280px; min-width:0; margin:auto; }}
h1 {{ font-size:20px; font-weight:500; margin:0 0 16px; }}
.diagram-container {{ width:100%; overflow-x:auto; }}
svg {{ display:block; width:100%; min-width:1280px; }}
@media print {{ body {{ padding:0; }} .diagram-container {{ overflow-x:visible; }} svg {{ min-width:0; }} }}
</style>
</head>
<body><main><h1>{escape(d['title'])}</h1><div class="diagram-container">{out}</div></main></body>
</html>
'''


def main():
    catalog=json.loads((HERE/'catalog.json').read_text())
    for d in catalog:
        assert len(d.get('nodes',[]))<=9,d['slug']
        assert len(d.get('arrows',[]))<=12,d['slug']
        (HERE/(d['slug']+'.html')).write_text(render(d))
    print(f'Rendered {len(catalog)} self-contained diagram documents.')

if __name__=='__main__': main()

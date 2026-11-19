export const escapeHtml=v=>String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
export function ageAt(date,birth){const [y,m=1,d=1]=date.split('-').map(Number),[by,bm,bd]=birth.split('-').map(Number);return y-by-(m<bm||(m===bm&&d<bd)?1:0)}
export function project([lon,lat],[west,south,east,north],w,h){return [(lon-west)/(east-west)*w,(north-lat)/(north-south)*h]}
// Maps whose eastern bound passes 180° (a Pacific-centred view) carry the western hemisphere at lon+360.
const wrap=(c,bounds)=>bounds[2]>180&&c[0]<0?[c[0]+360,c[1]]:c;
const wrapRing=(ring,bounds)=>bounds[2]>180&&Math.max(...ring.map(c=>c[0]))<0?ring.map(c=>[c[0]+360,c[1]]):ring;
const e=escapeHtml;
const pathOf=(coords,bounds,w,h)=>coords.map((c,i)=>{const[x,y]=project(c,bounds,w,h);return`${i?'L':'M'}${x.toFixed(1)},${y.toFixed(1)}`}).join('');
const polygonPath=(polygons,bounds,w,h)=>polygons.map(poly=>poly.map(ring=>pathOf(ring,bounds,w,h)+'Z').join('')).join('');
function landPath(land,bounds,w,h){return polygonPath(land.features.flatMap(f=>f.geometry.type==='MultiPolygon'?f.geometry.coordinates:[f.geometry.coordinates]).map(poly=>poly.map(ring=>wrapRing(ring,bounds))),bounds,w,h)}
// Engraved cartography: offshore waterlines, hatched land, inked rivers and borders.
function engraving(id,geo,bounds,w,h){
 // World-scale plates get fewer, finer rings so small islands do not turn to noise.
 const world=bounds[2]-bounds[0]>100,s=world?w/300:w/230,land=geo.land,lakes=geo.lakes??'',rings=world?2:4;
 let defs=`<path id="${id}-land" d="${land}"/><pattern id="${id}-hatch" width="${(s*1.35).toFixed(2)}" height="${(s*1.35).toFixed(2)}" patternUnits="userSpaceOnUse" patternTransform="rotate(-38)"><path d="M0 0V${(s*1.35).toFixed(2)}" class="hatch-line" style="stroke-width:${(s*.2).toFixed(2)}"/></pattern><clipPath id="${id}-landclip"><use href="#${id}-land"/></clipPath>`;
 if(lakes)defs+=`<path id="${id}-lakes" d="${lakes}"/><clipPath id="${id}-lakeclip"><use href="#${id}-lakes"/></clipPath>`;
 let body='';
 for(let k=rings;k>=1;k--){const reach=2*k*s;body+=`<use href="#${id}-land" class="waterline" style="stroke-width:${(reach+s*.32).toFixed(2)};opacity:${(1-(k-1)/rings).toFixed(2)}"/><use href="#${id}-land" class="waterline-gap" style="stroke-width:${(reach-s*.32).toFixed(2)}"/>`}
 body+=`<use href="#${id}-land" class="land-paper"/><use href="#${id}-land" class="land-hatch" fill="url(#${id}-hatch)"/>`;
 // A denser band of hatching inside the coast gives the woodcut's shaded shoreline.
 body+=`<g clip-path="url(#${id}-landclip)"><use href="#${id}-land" class="coast-shade" stroke="url(#${id}-hatch)" style="stroke-width:${(s*3.2).toFixed(2)}"/></g>`;
 if(lakes)body+=`<use href="#${id}-lakes" class="lake"/><g clip-path="url(#${id}-lakeclip)"><use href="#${id}-lakes" class="waterline" style="stroke-width:${(s*2.3).toFixed(2)};opacity:.7"/><use href="#${id}-lakes" class="waterline-gap" style="stroke-width:${(s*1.7).toFixed(2)}"/></g>`;
 for(const r of geo.rivers??[])body+=`<path d="${r}" class="river"/>`;
 if(geo.provinces)body+=`<path d="${geo.provinces}" class="border-province"/>`;
 if(geo.countries)body+=`<path d="${geo.countries}" class="border-country"/>`;
 body+=`<use href="#${id}-land" class="coastline"/>`;
 if(lakes)body+=`<use href="#${id}-lakes" class="coastline lake-shore"/>`;
 return {defs,body};
}
const svgStart=(id,w,h,title,desc)=>`<svg viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="${id}-title ${id}-desc" class="figure-svg"><title id="${id}-title">${e(title)}</title><desc id="${id}-desc">${e(desc)}</desc>`;
function seaPath(points){
 if(!points.length)return '';
 const pair=p=>p.map(n=>n.toFixed(1)).join(','),distance=(a,b)=>Math.hypot(b[0]-a[0],b[1]-a[1]);
 // Interpolate the geographic guides, limiting handles around narrow coastal turns.
 const handle=(point,from,to,length,sign)=>{const dx=to[0]-from[0],dy=to[1]-from[1],scale=length/(Math.hypot(dx,dy)||1)*sign;return [point[0]+dx*scale,point[1]+dy*scale]};
 let d='M'+pair(points[0]);
 for(let i=0;i<points.length-1;i++){
  const a=points[i],b=points[i+1],before=points[i-1]??a,after=points[i+2]??b,span=distance(a,b);
  const c1=handle(a,before,b,.3*Math.min(span,i?distance(before,a):span),1);
  const c2=handle(b,a,after,.3*Math.min(span,i+2<points.length?distance(b,after):span),-1);
  d+=`C${pair(c1)} ${pair(c2)} ${pair(b)}`;
 }
 return d;
}
export function renderMap(config,data,land){
 const {id,bounds,width:w=1000,height:h=430,placeIds,routeIds=[],labelIds=placeIds,offsets={}}=config;
 const get=id=>data.places.find(p=>p.id===id);let out=svgStart(id,w,h,config.title,config.description??'Approximate place centres. Sea passages and railway links are schematic, not exact historical tracks. The return is documented on Empress of Canada from Hong Kong to Victoria in1928, then Vancouver. Singapore is an earlier confirmed stop; the Singapore–Hong Kong ship and exact sea tracks remain unestablished.');
 if(config.linkPlaces)out=out.replace('role="img"','role="group"');
 const g=config.geography,geo=g?{land:polygonPath(g.land,bounds,w,h),lakes:polygonPath(g.lakes??[],bounds,w,h),rivers:(g.rivers??[]).map(r=>pathOf(r.coords,bounds,w,h)),countries:(g.countries??[]).map(l=>pathOf(l.coords,bounds,w,h)).join(''),provinces:(g.provinces??[]).map(l=>pathOf(l.coords,bounds,w,h)).join('')}:{land:landPath(land,bounds,w,h)},art=engraving(id,geo,bounds,w,h);
 out+=`<defs><clipPath id="${id}-clip"><rect width="${w}" height="${h}"/></clipPath>${art.defs}</defs><g clip-path="url(#${id}-clip)"><rect width="${w}" height="${h}" class="map-sea"/>`;
 for(let lon=Math.ceil(bounds[0]/20)*20;lon<bounds[2];lon+=20){const[x]=project([lon,0],bounds,w,h);out+=`<path d="M${x} 0V${h}" class="graticule"/>`}
 for(let lat=Math.ceil(bounds[1]/10)*10;lat<bounds[3];lat+=10){const[,y]=project([0,lat],bounds,w,h);out+=`<path d="M0 ${y}H${w}" class="graticule"/>`}
 out+=art.body;
 if(bounds[0]===-180&&bounds[2]===180){for(const [lon,lat,label]of[[-151,22,'Pacific Ocean'],[151,20,'Pacific Ocean'],[-35,22,'Atlantic Ocean'],[76,3,'Indian Ocean']]){const[x,y]=project([lon,lat],bounds,w,h);out+=`<text x="${x}" y="${y}" text-anchor="middle" class="ocean-label">${label}</text>`}}
 for(const rid of routeIds){const route=data.routes.find(r=>r.id===rid);for(const segment of route.segments??[]){const points=segment.coords.map(coords=>project(wrap(coords,bounds),bounds,w,h));const d=segment.mode==='sea'?seaPath(points):points.map(([x,y],i)=>`${i?'L':'M'}${x.toFixed(1)},${y.toFixed(1)}`).join('');out+=`<path d="${d}" class="map-route ${e(segment.mode)} ${segment.uncertain?'uncertain':''}" data-route="${rid}" data-mode="${e(segment.mode)}"><title>${e(segment.label)}</title></path>`}}
 if(config.showVessels)for(const rid of routeIds){for(const segment of data.routes.find(r=>r.id===rid).segments??[]){const v=segment.vesselLabel;if(!v)continue;const[x,y]=project(wrap(v.at,bounds),bounds,w,h);out+=`<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="${v.anchor??'middle'}" class="vessel-label ${segment.uncertain?'is-uncertain':''}"${v.rotate?` transform="rotate(${v.rotate} ${x.toFixed(1)} ${y.toFixed(1)})"`:''}>${e(v.text)}</text>`}}
 // General life connections are explicitly schematic and not journey reconstruction.
 if(config.connections){let d='';config.connections.forEach((pid,i)=>{const[x,y]=project(get(pid).coords,bounds,w,h);d+=`${i?'L':'M'}${x},${y}`});out+=`<path d="${d}" class="map-route life-route"/>`}
 for(const label of config.waterLabels??[]){const[x,y]=project(label.coords,bounds,w,h);out+=`<text x="${x}" y="${y}" text-anchor="${label.anchor??'middle'}" class="ocean-label water-label">${e(label.name)}</text>`}
 for(const label of config.contextLabels??[]){const[x,y]=project(label.coords,bounds,w,h);out+=`<text x="${x}" y="${y}" text-anchor="${label.anchor??'middle'}" class="map-context-label">${e(label.name)}</text>`}
 for(const region of config.regions??[]){const[x,y]=project(region.coords,bounds,w,h);if(config.linkPlaces&&region.passage)out+=`<a class="map-region-link" href="#${e(region.passage)}" aria-label="${e(region.name+': '+region.note)}"><title>${e(region.note)}</title>`;out+=`<text x="${x}" y="${y}" text-anchor="middle" class="map-region-label">${e(region.name)}<tspan x="${x}" dy="25" class="map-region-detail">${e(region.subtitle)}</tspan></text>`;if(config.linkPlaces&&region.passage)out+='</a>'}
 for(const pid of placeIds){const p=get(pid),[x,y]=project(wrap(p.coords,bounds),bounds,w,h),[dx,dy]=offsets[pid]||[11,-12];if(config.linkPlaces&&p.passage)out+=`<a class="map-passage-link" href="#${e(p.passage)}" aria-label="${e(p.name+': '+p.note)}">`;out+=`<g class="map-place ${p.confidence==='inferred'?'is-inferred':''} ${['context','qualified'].includes(p.confidence)?'is-qualified':''}" data-place="${pid}"><circle cx="${x}" cy="${y}" r="4.5"/><circle cx="${x}" cy="${y}" r="13" class="place-halo"/>`;
 if(p.confidence)out+=`<title>${e(p.name)} — ${e(p.note)}</title>`;
 if(labelIds.includes(pid)){if(Math.abs(dx)>25||Math.abs(dy)>25)out+=`<path d="M${x} ${y}l${dx*.8} ${dy*.7}" class="label-leader"/>`;out+=`<text x="${x+dx}" y="${y+dy}" text-anchor="${dx<0?'end':'start'}" class="place-label">${e(p.name)}</text>`}out+='</g>';if(config.linkPlaces&&p.passage)out+='</a>'}
 out+=`</g><rect x=".75" y=".75" width="${w-1.5}" height="${h-1.5}" class="neat-line"/><rect x="5" y="5" width="${w-10}" height="${h-10}" class="neat-line inner"/></svg>`;return out;
}
export function renderTimeline(data){
 const id='lifespan',w=1050,h=265,x=y=>36+(Number(y)-1890)/70*978;
 let out=svgStart(id,w,h,'A life, 1890 to 1959','Choose a milestone to jump to its chapter. Hover or focus for its name and context. The 1943 retirement claim is unverified.').replace('role="img"','role="group"');
 out+=`<path d="M36 112H1014" class="time-axis"/>`;
 for(let yr=1890;yr<=1960;yr+=10)out+=`<path d="M${x(yr)} 108v9" class="time-tick"/><text x="${x(yr)}" y="163" text-anchor="middle" class="axis-label">${yr}</text>`;
 for(const[start,end,label]of[[1914,1918,'First World War'],[1939,1945,'Second World War']])out+=`<rect x="${x(start)}" y="194" width="${x(end)-x(start)}" height="9" class="war-band"/><text x="${x(start)}" y="230" class="axis-label">${label}</text>`;
 const labels={birth:['Born',45],rmc:['RMC',77],marriage:['Helen & Frederick',45],india:['Quetta',77],riversmead:['Riversmead',45],death:['Como',77]},positions=[];
 for(const [index,ev] of data.events.entries()){
  const [year,month=1,day=15]=ev.date.split('-').map(Number),xx=x(year+(month-1)/12+(day-1)/366),selected=labels[ev.id];
  let yy=112;for(const offset of [0,22,-22,44,-44]){const candidate=112+offset;if(!positions.some(([px,py])=>Math.abs(px-xx)<22&&Math.abs(py-candidate)<20)){yy=candidate;break}}positions.push([xx,yy]);
  out+=`<a class="timeline-event ${ev.confidence==='unverified'?'is-unverified':''}" data-event="${e(ev.id)}" data-confidence="${e(ev.confidence)}" href="#${e(ev.chapter)}" tabindex="0" aria-label="${e(ev.label)}: ${e(ev.title)}" aria-describedby="timeline-hint"><title>${e(ev.label)}: ${e(ev.title)}</title>`;
  if(yy!==112)out+=`<path d="M${xx} 112V${yy}" class="event-stem"/>`;
  out+=`<circle class="event-hit" cx="${xx}" cy="${yy}" r="13"/><circle class="event-dot" cx="${xx}" cy="${yy}" r="${selected?5:3.5}"/>`;
  if(selected){const anchor=ev.id==='birth'?'start':ev.id==='death'?'end':'middle';out+=`<path d="M${xx} ${yy-8}V${selected[1]+9}" class="event-stem"/><text x="${xx}" y="${selected[1]}" text-anchor="${anchor}" class="event-label">${e(selected[0])}</text>`}out+='</a>';
 }
 out+='</svg>';return out;
}
export function renderFamily(data){
 const id='family-tree',w=1000,h=390,f=data.family;let out=svgStart(id,w,h,'Frederick and Helen’s family','Frederick’s parents were Arthur Scott Henshaw and Beatrice Hannah Shepherd. Frederick and Helen had Mary Beatrice, Helen, Freddie, George and Barbara. Mary Beatrice died in1923.');
 out+=`<path d="M130 72H430M280 72V126M280 168H700M490 168V248M85 248H915M85 248V283M292 248V283M500 248V283M708 248V283M915 248V283" class="family-line"/>`;
 f.parents.forEach((p,i)=>{const x=i?430:130;out+=`<text x="${x}" y="36" text-anchor="middle" class="family-parent">${e(p.name)}</text><text x="${x}" y="58" text-anchor="middle" class="family-detail">${e(p.role)}</text>`});
 f.couple.forEach((p,i)=>{const x=i?700:280;out+=`<rect x="${x-164}" y="126" width="328" height="80" class="family-couple ${i?'':'fred'}"/><text x="${x}" y="158" text-anchor="middle" class="family-name">${e(p.name)}</text><text x="${x}" y="185" text-anchor="middle" class="family-detail">${e(p.years)}</text>`});
 f.children.forEach((p,i)=>{const x=85+i*207.5;out+=`<circle cx="${x}" cy="285" r="3" class="family-dot"/><text x="${x}" y="315" text-anchor="middle" class="family-child">${e(p.name)}</text>`;const words=p.years.split(', ');words.forEach((s,j)=>out+=`<text x="${x}" y="340" dy="${j*20}" text-anchor="middle" class="family-detail">${e(s)}</text>`)});
 return out+'</svg>';
}

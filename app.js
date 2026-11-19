import {searchBiography,normalizeSearch} from './reader-utils.js';
document.documentElement.classList.add('js');
let contentPromise;
function content(){return contentPromise??=fetch('content.json').then(r=>{if(!r.ok)throw new Error('Biography data unavailable');return r.json()}).catch(error=>{contentPromise=null;throw error})}
const $=s=>document.querySelector(s);
const contents=$('#contents'),toggle=$('#contents-toggle'),contentsDialog=$('#contents-dialog');
function closeContents(){contentsDialog.close()}
toggle.addEventListener('click',()=>{contentsDialog.showModal();toggle.setAttribute('aria-expanded','true');contentsDialog.querySelector('[aria-current="true"]')?.focus()});
contentsDialog.addEventListener('close',()=>{toggle.setAttribute('aria-expanded','false');toggle.focus()});
contentsDialog.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeContents));
matchMedia('(min-width:761px)').addEventListener('change',event=>{if(event.matches&&contentsDialog.open)closeContents()});
const chapters=[...document.querySelectorAll('.chapter')],article=$('.biography'),threshold=$('#biography'),progress=$('.reading-progress');let ticking=false;
function updateReading(){
 const start=threshold.getBoundingClientRect().top+scrollY,end=article.getBoundingClientRect().bottom+scrollY-innerHeight;
 const percent=Math.max(0,Math.min(100,(scrollY-start)/Math.max(1,end-start)*100));
 progress.firstElementChild.style.width=percent+'%';progress.setAttribute('aria-valuenow',String(Math.round(percent)));
 let current=chapters[0];for(const ch of chapters){if(ch.getBoundingClientRect().top<=150)current=ch;else break}
 document.querySelectorAll('[data-chapter-link]').forEach(a=>{if(a.dataset.chapterLink===current.id)a.setAttribute('aria-current','true');else a.removeAttribute('aria-current')});ticking=false;
}
addEventListener('scroll',()=>{if(!ticking){requestAnimationFrame(updateReading);ticking=true}},{passive:true});addEventListener('resize',updateReading);updateReading();
let sizeIndex=0;const sizes=[22,25,20];
try{const saved=Number(localStorage.getItem('henshaw-reading-size'));if(sizes.includes(saved)){sizeIndex=sizes.indexOf(saved);document.documentElement.style.setProperty('--reading-size',saved+'px')}}catch{}
$('#text-size').addEventListener('click',()=>{sizeIndex=(sizeIndex+1)%sizes.length;document.documentElement.style.setProperty('--reading-size',sizes[sizeIndex]+'px');$('#text-size').setAttribute('aria-label',`Reading text is ${sizes[sizeIndex]} pixels; change size`);try{localStorage.setItem('henshaw-reading-size',sizes[sizeIndex])}catch{}});
$('#print-page').addEventListener('click',()=>print());
let sourceData=[],sourceIndex=0,sourceOpener;const sourceDialog=$('#manuscript-dialog'),sourceSelect=$('#source-select'),image=$('#manuscript-image');
function showSource(index){
 sourceIndex=Math.max(0,Math.min(sourceData.length-1,index));const scan=sourceData[sourceIndex];
 image.alt=`Original manuscript, page ${sourceIndex+1} of ${sourceData.length}: ${$('#manuscript-title').textContent}`;image.src=scan.url;sourceSelect.value=String(sourceIndex);$('#source-prev').disabled=sourceIndex===0;$('#source-next').disabled=sourceIndex===sourceData.length-1;$('#source-filename').textContent=scan.filename;$('#source-original').href=scan.url;$('.scan-stage').scrollTop=0;
}
document.querySelectorAll('[data-open-source]').forEach(link=>link.addEventListener('click',async event=>{
 event.preventDefault();sourceOpener=link;
 try{const data=await content(),chapter=data.chapters.find(ch=>ch.id===link.dataset.openSource);if(!chapter)throw new Error('Chapter not found');sourceData=chapter.scans.map(id=>data.scans[id]);$('#manuscript-title').textContent=chapter.title;sourceSelect.replaceChildren(...sourceData.map((s,i)=>{const option=document.createElement('option');option.value=i;option.textContent=`Page ${i+1} of ${sourceData.length} · ${s.id}`;return option}));showSource(Math.max(0,chapter.scans.indexOf(link.dataset.sourceScan)));sourceDialog.showModal();sourceDialog.querySelector('.dialog-close').focus()}catch{location.assign(link.href)}
}));
$('#source-prev').addEventListener('click',()=>showSource(sourceIndex-1));$('#source-next').addEventListener('click',()=>showSource(sourceIndex+1));sourceSelect.addEventListener('change',()=>showSource(Number(sourceSelect.value)));
sourceDialog.addEventListener('close',()=>sourceOpener?.focus());
const searchDialog=$('#search-dialog'),searchInput=$('#biography-search'),results=$('#search-results'),status=$('#search-status');let searchOpener,searchSequence=0;
$('#search-open').addEventListener('click',()=>{searchOpener=document.activeElement;searchDialog.showModal();searchInput.focus()});
searchDialog.addEventListener('close',()=>searchOpener?.focus());
searchDialog.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();searchDialog.close()}});
searchInput.addEventListener('input',async()=>{
 const sequence=++searchSequence,query=searchInput.value.trim();results.replaceChildren();
 if(query.length<2){status.textContent='Enter at least two characters. Try a name, place or phrase.';return}
 status.textContent='Searching…';
 try{const data=await content();if(sequence!==searchSequence)return;const matches=searchBiography(data.chapters,query);status.textContent=matches.length?`${matches.length===40?'First 40':matches.length} matching passages`:'No matching passages. Try a different spelling or shorter phrase.';
 for(const match of matches){const li=document.createElement('li'),a=document.createElement('a'),heading=document.createElement('strong'),p=document.createElement('p'),mark=document.createElement('mark');a.href=`#text-${match.blockId}`;heading.textContent=match.chapterTitle;mark.textContent=match.match;p.append(document.createTextNode(match.before),mark,document.createTextNode(match.after));a.append(heading,p);a.addEventListener('click',event=>{event.preventDefault();searchOpener=null;searchDialog.close();const target=document.getElementById('text-'+match.blockId);if(target){history.replaceState(null,'','#'+target.id);target.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});target.classList.remove('search-target');requestAnimationFrame(()=>target.classList.add('search-target'));target.setAttribute('tabindex','-1');target.focus({preventScroll:true})}});li.append(a);results.append(li)}
 }catch{if(sequence===searchSequence)status.textContent='Search could not load. You can still read the full biography or use your browser’s Find command.'}
});
document.querySelectorAll('dialog').forEach(dialog=>{dialog.querySelector('.dialog-close').addEventListener('click',()=>dialog.close());dialog.addEventListener('click',event=>{if(event.target===dialog){const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.close()}})});
document.querySelectorAll('[data-map-controls]').forEach(controls=>{controls.addEventListener('click',async event=>{const button=event.target.closest('[data-place-select]');if(!button)return;controls.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));const figure=controls.closest('figure');figure.querySelectorAll('.map-place').forEach(place=>place.classList.toggle('active',place.dataset.place===button.dataset.placeSelect));try{const data=await content(),place=data.life.places.find(p=>p.id===button.dataset.placeSelect);document.getElementById(controls.dataset.mapControls+'-detail').textContent=`${place.name} — ${place.note}.`}catch{}});const initial=controls.querySelector('button');if(initial)controls.closest('figure').querySelector(`[data-place="${initial.dataset.placeSelect}"]`)?.classList.add('active')});
document.querySelectorAll('[data-event-filter]').forEach(button=>button.addEventListener('click',()=>{const filter=button.dataset.eventFilter;document.querySelectorAll('[data-event-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));let count=0;document.querySelectorAll('.life-events>li').forEach(li=>{li.hidden=filter!=='all'&&li.dataset.confidence!==filter;if(!li.hidden)count++});$('.filter-empty').hidden=count>0}));
document.querySelectorAll('.letter-type-toggle').forEach(button=>button.addEventListener('click',()=>{const sheet=button.closest('.letter-sheet'),clear=sheet.classList.toggle('clear-type');button.setAttribute('aria-pressed',String(clear));button.setAttribute('aria-label',clear?'Show this letter in handwriting':'Show this letter in clear type')}));

// The graph and the named milestone links both retain native chapter anchors.
const timeline=$('.timeline-figure');
if(timeline){
 const points=[...timeline.querySelectorAll('.timeline-event')],choices=[...timeline.querySelectorAll('[data-timeline-select]')],tooltip=timeline.querySelector('.timeline-tooltip');let selected=0,selectionSequence=0;
 function markSelection(index){selected=(index+points.length)%points.length;const id=points[selected].dataset.event;for(const point of points)point.classList.toggle('selected',point.dataset.event===id);for(const choice of choices){if(choice.dataset.timelineSelect===id)choice.setAttribute('aria-current','true');else choice.removeAttribute('aria-current')}$('#timeline-count').textContent=`${String(selected+1).padStart(2,'0')} / ${points.length}`;timeline.querySelector('[data-timeline-step="-1"]').disabled=selected===0;timeline.querySelector('[data-timeline-step="1"]').disabled=selected===points.length-1;return id}
 async function showMilestone(index){
  const id=markSelection(index),sequence=++selectionSequence;
  try{const data=await content();if(sequence!==selectionSequence)return;const event=data.life.events.find(ev=>ev.id===id),parts=event.date.split('-').map(Number);let date=String(parts[0]);if(parts.length>=2)date=new Intl.DateTimeFormat('en',{month:'long',...(parts.length===3?{day:'numeric'}:{}),year:'numeric',timeZone:'UTC'}).format(new Date(Date.UTC(parts[0],parts[1]-1,parts[2]??1)));if(event.label.startsWith('c.'))date=event.label;
   $('#timeline-date').textContent=date;$('#timeline-event-title').textContent=event.title;$('#timeline-description').textContent=event.description;$('#timeline-evidence').textContent=data.life.evidence_labels[event.confidence];$('#timeline-evidence').classList.toggle('unverified',event.confidence==='unverified');$('#timeline-read').href='#'+event.chapter;
   const source=data.scans[event.source],record=data.research.sources.find(s=>s.id===event.source);$('#timeline-source').href=source?.url??record?.url??'#sources';$('#timeline-source').textContent=source?'Read the manuscript ↗':record?.url?'Read the published record ↗':'About this family recollection ↗';$('#timeline-source').target=source||record?.url?'_blank':'_self';
  }catch{$('#timeline-event-title').textContent=points[selected].getAttribute('aria-label');$('#timeline-description').textContent='Follow the milestone link to read its chapter.'}
 }
 function showLabel(point){const plot=timeline.querySelector('.timeline-plot'),dot=point.querySelector('.event-dot').getBoundingClientRect(),bounds=plot.getBoundingClientRect();tooltip.textContent=point.getAttribute('aria-label');tooltip.hidden=false;const half=tooltip.offsetWidth/2;tooltip.style.left=Math.max(half+5,Math.min(bounds.width-half-5,dot.left+dot.width/2-bounds.left))+'px';tooltip.style.top=Math.max(5,dot.top-bounds.top-12)+'px'}
 points.forEach((point,index)=>{point.addEventListener('mouseenter',()=>showLabel(point));point.addEventListener('mouseleave',()=>{tooltip.hidden=true});point.addEventListener('focus',()=>{showMilestone(index);showLabel(point)});point.addEventListener('blur',()=>{tooltip.hidden=true});point.addEventListener('click',()=>{showMilestone(index);tooltip.hidden=true});point.addEventListener('keydown',event=>{let next;if(event.key==='ArrowRight')next=Math.min(points.length-1,index+1);if(event.key==='ArrowLeft')next=Math.max(0,index-1);if(event.key==='Home')next=0;if(event.key==='End')next=points.length-1;if(next!==undefined){event.preventDefault();points[next].focus()}})});
 choices.forEach((choice,index)=>{choice.addEventListener('focus',()=>showMilestone(index));choice.addEventListener('click',()=>showMilestone(index))});
 timeline.querySelectorAll('[data-timeline-step]').forEach(button=>button.addEventListener('click',()=>showMilestone(selected+Number(button.dataset.timelineStep))));markSelection(0);
}

// All profiles and passage anchors are static; filtering is progressive enhancement.
const familySection=$('#family-index');
if(familySection){
 const links=[...familySection.querySelectorAll('[data-person-select]')],profiles=[...familySection.querySelectorAll('.family-person')],filter=$('#family-filter'),entries=[...familySection.querySelectorAll('[data-person-entry]')];
 function showPerson(id,{navigate=false,focus=false}={}){
  const profile=profiles.find(p=>p.id==='person-'+id);if(!profile)return;
  if(links.find(a=>a.dataset.personSelect===id)?.closest('[data-person-entry]').hidden){filter.value='';filterPeople()}
  profiles.forEach(p=>p.hidden=p!==profile);links.forEach(a=>{if(a.dataset.personSelect===id)a.setAttribute('aria-current','true');else a.removeAttribute('aria-current')});
  if(navigate)history.pushState(null,'','#'+profile.id);
  if(focus){profile.querySelector('h3').focus({preventScroll:true});profile.scrollIntoView({block:'start',behavior:'instant'})}
 }
 function revealHash(){const id=location.hash.slice(1);if(id.startsWith('person-'))showPerson(id.slice(7));}
 links.forEach(a=>a.addEventListener('click',event=>{if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;event.preventDefault();showPerson(a.dataset.personSelect,{navigate:true,focus:true})}));
 familySection.querySelectorAll('[data-family-reference]').forEach(a=>a.addEventListener('click',event=>{if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;const target=document.getElementById(a.hash.slice(1));if(target){target.setAttribute('tabindex','-1');requestAnimationFrame(()=>target.focus({preventScroll:true}))}}));
 function filterPeople(){const query=normalizeSearch(filter.value.trim());let count=0;entries.forEach(entry=>{const matches=normalizeSearch(entry.dataset.personSearch).includes(query);entry.hidden=!matches;if(matches)count++});$('#family-filter-status').textContent=query?`${count} ${count===1?'person':'people'} found`:`${entries.length} people in the index`;familySection.querySelector('.family-filter-empty').hidden=count!==0}
 filter.addEventListener('input',filterPeople);
 showPerson('george-henshaw');revealHash();addEventListener('hashchange',revealHash);addEventListener('popstate',revealHash);
}

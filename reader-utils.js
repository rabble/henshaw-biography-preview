export const normalizeSearch=text=>text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase();
export function searchBiography(chapters,query,limit=40){
 const needle=normalizeSearch(query.trim());if(needle.length<2)return[];
 const results=[];
 for(const chapter of chapters)for(const block of chapter.blocks){
  const text=block.text.replace(/\s+/g,' '),index=normalizeSearch(text).indexOf(needle);
  if(index<0)continue;
  const start=Math.max(0,index-85),end=Math.min(text.length,index+query.length+135);
  results.push({chapterId:chapter.id,chapterTitle:chapter.title,blockId:block.id,before:(start?'…':'')+text.slice(start,index),match:text.slice(index,index+query.trim().length),after:text.slice(index+query.trim().length,end)+(end<text.length?'…':'')});
  if(results.length>=limit)return results;
 }
 return results;
}

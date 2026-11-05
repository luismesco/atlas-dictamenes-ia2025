import {getDocument,GlobalWorkerOptions,TextLayer} from '../vendor/pdfjs/pdf.mjs';
GlobalWorkerOptions.workerSrc=new URL('../vendor/pdfjs/pdf.worker.mjs',import.meta.url).href;
const $=id=>document.getElementById(id),params=new URLSearchParams(location.search),file=new URL(params.get('file')||'',location.href);let pdf,pageNo=Math.max(1,Number(params.get('page'))||1),scale=1,generation=0,renderTask,textTask;
$('zoom').value=params.get('zoom')||'fit';if(!$('zoom').value)$('zoom').value='fit';
async function render(){if(!pdf)return;const turn=++generation;if(renderTask){renderTask.cancel();try{await renderTask.promise;}catch{}}textTask?.cancel();$('status').textContent='Cargando página '+pageNo+'…';try{const page=await pdf.getPage(pageNo);if(turn!==generation)return;const base=page.getViewport({scale:1}),mode=$('zoom').value,box=$('scroll');scale=mode==='fit'?Math.min((box.clientWidth-32)/base.width,(box.clientHeight-32)/base.height):mode==='width'?(box.clientWidth-32)/base.width:Number(mode)/100*96/72;scale=Math.max(.1,scale);const viewport=page.getViewport({scale}),ratio=Math.min(window.devicePixelRatio||1,window.innerWidth<650?1.5:2),canvas=$('canvas');canvas.width=Math.floor(viewport.width*ratio);canvas.height=Math.floor(viewport.height*ratio);canvas.style.width=viewport.width+'px';canvas.style.height=viewport.height+'px';$('paper').style.width=viewport.width+'px';$('paper').style.height=viewport.height+'px';$('text').replaceChildren();$('text').style.setProperty('--scale-factor',scale);renderTask=page.render({canvasContext:canvas.getContext('2d'),viewport,transform:ratio!==1?[ratio,0,0,ratio,0,0]:null});await renderTask.promise;if(turn!==generation)return;textTask=new TextLayer({textContentSource:await page.getTextContent(),container:$('text'),viewport});await textTask.render();if(turn!==generation)return;$('page').value=pageNo;$('page').max=pdf.numPages;$('pageCount').textContent='de '+pdf.numPages;$('prev').disabled=pageNo<=1;$('next').disabled=pageNo>=pdf.numPages;$('status').textContent='Página '+pageNo+' de '+pdf.numPages+' · '+Math.round(scale*72/96*100)+' %';$('scroll').scrollTo(0,0);await markSanctionPassages(page,viewport);parent.postMessage({type:'atlas-pdf-state',page:pageNo,percent:Math.round(scale*72/96*100)},location.origin);}catch(e){if(e.name!=='RenderingCancelledException'){$('status').textContent='No se pudo mostrar esta página.';console.error(e);}}}
function pageTo(n){pageNo=Math.min(pdf?.numPages||1,Math.max(1,Number(n)||1));render();}function zoomBy(d){const current=scale*72/96*100,next=Math.max(25,Math.min(300,Math.round((current+d)/25)*25));if(![...$('zoom').options].some(o=>o.value===String(next))){const o=document.createElement('option');o.value=String(next);o.textContent=next+' %';$('zoom').append(o);}$('zoom').value=String(next);render();}
$('prev').onclick=()=>pageTo(pageNo-1);$('next').onclick=()=>pageTo(pageNo+1);$('page').onchange=()=>pageTo($('page').value);$('zoom').onchange=render;$('minus').onclick=()=>zoomBy(-25);$('plus').onclick=()=>zoomBy(25);let resize;window.addEventListener('resize',()=>{clearTimeout(resize);resize=setTimeout(()=>{if(['fit','width'].includes($('zoom').value))render();},150);});
try{if(file.origin!==location.origin||!file.pathname.toLowerCase().endsWith('.pdf'))throw new Error('Documento no admitido');pdf=await getDocument({url:file.href,cMapUrl:new URL('../vendor/pdfjs/cmaps/',import.meta.url).href,cMapPacked:true,standardFontDataUrl:new URL('../vendor/pdfjs/standard_fonts/',import.meta.url).href,wasmUrl:new URL('../vendor/pdfjs/wasm/',import.meta.url).href}).promise;pageNo=Math.min(pageNo,pdf.numPages);await render();}catch(e){$('paper').hidden=true;$('pdfError').hidden=false;$('pdfError').textContent='No se pudo cargar el PDF. Usa «Abrir en otra pestaña» o «Descargar» para consultar el original.';$('status').textContent='Documento no disponible en el visor.';console.error(e);}

async function markSanctionPassages(page,viewport){
 $('paper').querySelector('.sanction-overlay')?.remove();
 if(params.get('highlight')!=='sanction')return;
 const items=(await page.getTextContent()).items.filter(x=>typeof x.str==='string');
 let offset=0;const records=items.map(item=>{const start=offset;offset+=item.str.length+1;return{item,start,end:offset-1};});
 const text=items.map(x=>x.str).join(' '),knownSG=/SG-RAP-0003-2025\.pdf$/i.test(file.pathname);
 let ranges=[];
 if(knownSG&&pageNo===9){
  const start=text.search(/46\.\s*Agravio\s*2/i),tail=start>=0?text.slice(start):'',end=tail.search(/47\.\s*Lo anterior/i);
  if(start>=0&&end>0&&/150\s*%/.test(tail.slice(0,end))&&/infundado/i.test(tail.slice(0,end)))ranges.push([start,start+end]);
 }else if(!knownSG){
  // Monetary expressions only: never infer a judicial outcome from a stray word.
  const pattern=/\$\s*[\d,.]+|\b\d+(?:[.,]\d+)?\s*%|\b\d+\s*UMA\b/gi;
  for(const match of text.matchAll(pattern)){const context=text.slice(Math.max(0,match.index-180),match.index+match[0].length+180);if(/sanci[oó]n|multa|individualizaci[oó]n/i.test(context))ranges.push([match.index,match.index+match[0].length]);}
 }
 const selected=records.filter(r=>r.item.str.trim()&&ranges.some(([a,b])=>r.end>a&&r.start<b));
 if(!selected.length){$('status').textContent+=' · Sin pasaje económico identificado en esta página';return;}
 const layer=document.createElement('div');layer.className='sanction-overlay';layer.setAttribute('aria-label','Pasaje de sanción');Object.assign(layer.style,{position:'absolute',inset:'0',pointerEvents:'none',overflow:'hidden'});
 for(const {item} of selected){
  const [x,y]=viewport.convertToViewportPoint(item.transform[4],item.transform[5]),width=item.width*viewport.scale,height=Math.abs(item.height*viewport.scale);
  const left=Math.max(0,x),right=Math.min(viewport.width,x+width);if(right<=left||y<0||y>viewport.height)continue;
  const mark=document.createElement('div');mark.className='sanction-highlight';mark.dataset.text=item.str;
  Object.assign(mark.style,{position:'absolute',left:left+'px',top:Math.max(0,y-height)+'px',width:(right-left)+'px',height:Math.max(1,height+1)+'px',background:'#75162f12',borderBottom:'2px solid #75162f',boxSizing:'border-box'});layer.append(mark);
 }
 $('paper').append(layer);$('status').textContent+=' · Pasaje de sanción subrayado en guinda';
 requestAnimationFrame(()=>layer.firstElementChild?.scrollIntoView({block:'center',behavior:'smooth'}));
}

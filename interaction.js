// Shared dialog interactions and territorial selection.
function installBackdropClose(){
 let started=null;
 document.addEventListener('pointerdown',ev=>{const el=ev.target;if(!(el instanceof HTMLDialogElement))return;const r=el.getBoundingClientRect();started=(ev.clientX<r.left||ev.clientX>r.right||ev.clientY<r.top||ev.clientY>r.bottom)?el:null;});
 document.addEventListener('click',ev=>{const el=ev.target;if(!(el instanceof HTMLDialogElement)||!el.open)return;const r=el.getBoundingClientRect();const outside=ev.clientX<r.left||ev.clientX>r.right||ev.clientY<r.top||ev.clientY>r.bottom;if(outside&&started===el){const allowed=el.dispatchEvent(new Event('cancel',{cancelable:true}));if(allowed&&!el.dataset.unsaved)el.close();}started=null;});
}
installBackdropClose();
const contextMapDialog=document.createElement('dialog');contextMapDialog.id='contextMapPicker';contextMapDialog.className='section-dialog context-map-picker';contextMapDialog.setAttribute('aria-labelledby','contextMapTitle');
contextMapDialog.innerHTML=`<div class="section-dialog-head"><h2 id="contextMapTitle">${docIcon('map')}Seleccionar estado</h2><button type="button" class="button light" id="closeContextMap">← Volver</button></div><div class="context-map-body" id="contextMapBody"><label class="context-multiple-control"><input type="checkbox" id="contextMultiple"/>Seleccionar varios estados</label><div id="contextPickerMap" class="context-picker-map"></div><div class="context-multiple-actions" id="contextMultipleActions" hidden><p id="contextSelectionCount" role="status"></p><button type="button" class="text-button" id="contextClearSelection">Limpiar selección</button><button type="button" class="button primary" id="contextApplySelection" disabled>Ver expedientes (0)</button></div><button type="button" class="text-button" id="contextAllStates">Consultar todos los estados</button></div>`;
document.body.append(contextMapDialog);
const contextMapButton=document.createElement('button');contextMapButton.id='contextMapButton';contextMapButton.type='button';contextMapButton.className='button light';contextMapButton.setAttribute('aria-haspopup','dialog');contextMapButton.setAttribute('aria-label','Seleccionar estado en el mapa');contextMapButton.innerHTML=docIcon('map')+'<span>Seleccionar en el mapa</span>';
$('contextState').after(contextMapButton);$('contextState').classList.add('context-native-state');
const contextLabel=document.querySelector('label[for="contextState"]');if(contextLabel)contextLabel.classList.add('context-native-state');
let contextMapOpener=null,contextDocumentReturn=null,contextDraft=new Set();
if(selected)contextStates.add(selected);
const contextRequested=new URLSearchParams(location.search).get('expedientes');
if(contextRequested){const restored=contextRequested.split(',').filter(id=>state(id));if(restored.length){contextStates.clear();restored.forEach(id=>contextStates.add(id));}}
const contextHubReturn=document.createElement('button');contextHubReturn.type='button';contextHubReturn.id='contextHubReturn';contextHubReturn.className='text-button context-hub-return';contextHubReturn.hidden=!selected;contextMapButton.after(contextHubReturn);
function contextSelectionTitle(){const names=D.states.filter(s=>contextStates.has(s.id)).map(s=>s.name);return names.length<=2?names.join(' y '):names.length+' estados';}
function updateContextHubReturn(){contextHubReturn.hidden=!contextStates.size||location.hash==='#conclusiones';contextHubReturn.innerHTML=docIcon('reply')+'<span>'+e(contextStates.size===1?'Expediente de '+contextSelectionTitle():'Expedientes seleccionados')+'</span>';}
function contextMapLeaders(svg){
 const ns='http://www.w3.org/2000/svg',routes={Jalisco:{points:'455,440 370,459 300,459',x:290,y:470,anchor:'end'},Guerrero:{points:'560,530 500,575 450,575',x:440,y:586,anchor:'end'},Hidalgo:{points:'591.24,429.78 715,439 760,439',x:770,y:450,anchor:'start'},Nuevo_Leon:{points:'556.85,248.40 670,134 725,134',x:735,y:145,anchor:'start'},Quintana_Roo:{points:'907,479 975,546 975,566',x:970,y:600,anchor:'end'},San_Luis_Potosi:{points:'542.91,371.35 650,289 690,289',x:700,y:300,anchor:'start'}};
 for(const s of D.states){const r=routes[s.id];if(!r)continue;const g=document.createElementNS(ns,'g');g.setAttribute('class','context-map-label');g.dataset.contextState=s.id;g.setAttribute('role','button');g.setAttribute('tabindex','0');g.setAttribute('aria-label','Abrir expediente de '+s.name);g.setAttribute('aria-pressed',String(contextStates.has(s.id)));const [cx,cy]=r.points.split(' ')[0].split(',');g.innerHTML=`<polyline points="${r.points}"/><circle cx="${cx}" cy="${cy}" r="4"/><text x="${r.x}" y="${r.y}" text-anchor="${r.anchor}">${e(s.name)}</text>`;g.onclick=()=>chooseContextMap(s.id);g.onkeydown=ev=>{if(['Enter',' '].includes(ev.key)){ev.preventDefault();chooseContextMap(s.id);}};svg.append(g);}
}
function contextMapHitboxes(svg){
 svg.querySelectorAll('.context-map-hitbox').forEach(rect=>rect.remove());
 const ns='http://www.w3.org/2000/svg',matrix=svg.getScreenCTM?.(),scale=matrix?Math.hypot(matrix.a,matrix.b):1;
 for(const group of svg.querySelectorAll('.context-map-label')){
  const text=group.querySelector('text'),points=group.querySelector('polyline').getAttribute('points').split(' ').map(x=>x.split(',').map(Number));
  let box;try{box=group.getBBox?.();}catch{}
  if(!box||!box.width||!box.height){const tx=Number(text.getAttribute('x')),ty=Number(text.getAttribute('y')),tw=text.textContent.length*23,anchor=text.getAttribute('text-anchor'),left=anchor==='end'?tx-tw:tx;const xs=points.map(p=>p[0]).concat(left,left+tw),ys=points.map(p=>p[1]).concat(ty-40,ty);box={x:Math.min(...xs),y:Math.min(...ys),width:Math.max(...xs)-Math.min(...xs),height:Math.max(...ys)-Math.min(...ys)};}
  const padding=8,minHeight=44/(scale||1),height=Math.max(box.height+2*padding,minHeight),width=Math.max(box.width+2*padding,minHeight);
  const rect=document.createElementNS(ns,'rect');rect.setAttribute('class','context-map-hitbox');rect.setAttribute('x',String(box.x+box.width/2-width/2));rect.setAttribute('y',String(box.y+box.height/2-height/2));rect.setAttribute('width',String(width));rect.setAttribute('height',String(height));rect.setAttribute('fill','transparent');rect.setAttribute('pointer-events','all');group.prepend(rect);
 }
}
function openContextMap(){
 contextMapOpener=document.activeElement;contextDraft=new Set(contextStates);$('contextMultiple').checked=contextStates.size>1;
 const svg=$('mapContainer').querySelector('svg').cloneNode(true);svg.removeAttribute('id');svg.querySelectorAll('[id]').forEach(x=>x.removeAttribute('id'));svg.querySelectorAll('.map-label').forEach(x=>x.remove());
 svg.querySelectorAll('path').forEach(path=>{const s=D.states.find(s=>s.geo===path.dataset.cveEnt);path.removeAttribute('style');path.classList.remove('selected','scenario-out');path.classList.toggle('available',!!s);path.classList.toggle('context-current',!!s&&contextStates.has(s.id));path.removeAttribute('role');path.removeAttribute('tabindex');path.setAttribute('aria-hidden','true');if(s)path.onclick=()=>chooseContextMap(s.id);});
 contextMapLeaders(svg);$('contextPickerMap').replaceChildren(svg);if(!contextMapDialog.open)contextMapDialog.showModal();contextMapHitboxes(svg);paintContextSelection();
}
const contextWorkspace=$('view-conclusiones'),contextObservationSection=document.createElement('section');
contextObservationSection.id='contextObservationSection';contextObservationSection.className='context-observation-section';
const contextWorkspaceTabs=contextWorkspace.querySelector('.case-switch');
contextWorkspaceTabs.className='context-workspace-tabs';contextWorkspaceTabs.setAttribute('aria-label','Secciones del expediente');contextWorkspaceTabs.innerHTML=`<button type="button" id="workspaceObservationsTab" data-workspace-section="observations" aria-pressed="true">${docIcon('list')}Observaciones</button><button type="button" id="workspaceDocumentsTab" data-workspace-section="documents" aria-pressed="false">${docIcon('folder')}Documentos del expediente</button>`;
[...contextWorkspace.children].filter(x=>x!==contextWorkspaceTabs).forEach(x=>contextObservationSection.append(x));contextWorkspace.append(contextObservationSection,$('stateDocuments'));$('stateDocuments').hidden=true;
$('caseResults').classList.add('context-observation-list');
function decorateObservationRows(){
 const table=$('caseResults'),headers=[['observationHeaderName','Observación y cruce'],['observationHeaderStatus','Estatus'],['observationHeaderDescription','Descripción'],['observationHeaderActions','Acciones']];
 table.setAttribute('role','table');table.setAttribute('aria-label','Observaciones y correspondencia entre vueltas');table.setAttribute('aria-colcount','4');table.setAttribute('aria-rowcount',String(lastCases.length+1));
 const head=document.createElement('div');head.className='context-observation-head';head.setAttribute('role','row');head.setAttribute('aria-rowindex','1');head.innerHTML=headers.map(([id,label],index)=>`<span role="columnheader" aria-colindex="${index+1}" id="${id}">${label}</span>`).join('');table.prepend(head);
 [...table.querySelectorAll('.case-card')].forEach((row,index)=>{
  const name=row.querySelector('h3'),cross=row.querySelector('.case-meta'),status=row.querySelector('.pill'),description=row.querySelector('.conduct'),actions=row.querySelector('.card-actions'),extras=[...row.children].filter(x=>![name,cross,status,description,actions].includes(x));
  const parts=[[name,cross],[status],[description,...extras],[actions]],kinds=['name','status','description','actions'];row.setAttribute('role','row');row.setAttribute('aria-rowindex',String(index+2));
  parts.forEach((nodes,i)=>{const cell=document.createElement('div');cell.className='observation-cell observation-cell-'+kinds[i];cell.setAttribute('role','cell');cell.setAttribute('aria-describedby',headers[i][0]);cell.setAttribute('aria-colindex',String(i+1));const label=document.createElement('span');label.className='observation-mobile-label';label.setAttribute('aria-hidden','true');label.textContent=headers[i][1];cell.append(label);nodes.filter(Boolean).forEach(node=>cell.append(node));row.append(cell);});
 });
 const empty=table.querySelector(':scope>.empty');if(empty){const row=document.createElement('div');row.setAttribute('role','row');const cell=document.createElement('div');cell.setAttribute('role','cell');cell.setAttribute('aria-colspan','4');empty.replaceWith(row);cell.append(empty);row.append(cell);}
}
const contextRenderCases=renderCases;
renderCases=function(){contextRenderCases();decorateObservationRows();};

const contextAnalysisLink=document.createElement('button');contextAnalysisLink.type='button';contextAnalysisLink.id='contextAnalysisLink';contextAnalysisLink.className='text-button context-analysis-link';contextAnalysisLink.dataset.view='fondo';contextAnalysisLink.innerHTML=docIcon('book')+'Análisis de ambas vueltas';contextObservationSection.querySelector('.results-head').append(contextAnalysisLink);
const contextBaseShow=show;
show=function(view,focus=false){if(view==='estado'&&contextStates.size)view='conclusiones';const result=contextBaseShow(view,focus);contextHubReturn.hidden=!contextStates.size||view==='conclusiones'||view==='mapa';$('contextDocuments').hidden=true;return result;};
function contextCalendarEventAllowed(event){if(!contextStates.size||!event.scopes.length)return true;const names=new Set(D.states.filter(s=>contextStates.has(s.id)).map(s=>norm(s.name)));return event.scopes.some(scope=>scope.code==='FED'||names.has(norm(scope.entity))||[...contextStates].some(id=>D.calendar.stateCodes[id]===scope.code));}
function showWorkspaceSection(section){
 if(section==='documents'&&!contextStates.size){openContextMap();return;}
 const docs=section==='documents';contextObservationSection.hidden=docs;$('stateDocuments').hidden=!docs;
 $('workspaceObservationsTab').setAttribute('aria-pressed',String(!docs));$('workspaceDocumentsTab').setAttribute('aria-pressed',String(docs));
}
function updateContextWorkspace(){
 updateContextHubReturn();$('workspaceDocumentsTab').disabled=!contextStates.size;
 const title=contextObservationSection.querySelector('.section-top h2');if(title)title.textContent=contextStates.size?(contextStates.size===1?'Expediente · ':'Expedientes · ')+contextSelectionTitle():'Expedientes';
 if(contextStates.size){$('contextInfo').textContent=contextSelectionTitle()+' · Informe Anual 2025';$('contextInfo').title=D.states.filter(s=>contextStates.has(s.id)).map(s=>s.name).join(', ');}
 $('contextDocuments').hidden=true;
 if(!contextStates.size&&contextObservationSection.hidden)showWorkspaceSection('observations');
}
function persistContextSelection(){const url=new URL(location.href);if(contextStates.size>1)url.searchParams.set('expedientes',D.states.filter(s=>contextStates.has(s.id)).map(s=>s.id).join(','));else url.searchParams.delete('expedientes');history.replaceState(null,'',url);}
const contextBaseSync=syncContext;
function applyContextStates(ids){contextStates.clear();ids.filter(id=>state(id)).forEach(id=>contextStates.add(id));contextBaseSync(contextStates.size===1?[...contextStates][0]:'');updateContextWorkspace();renderPrecedents();persistContextSelection();}
syncContext=function(id){applyContextStates(id?[id]:[]);};
function openContextWorkspace(ids,section='observations',focus=true){applyContextStates(ids);renderMap();renderState();if(contextMapDialog.open)contextMapDialog.close();showWorkspaceSection(section);show('conclusiones',focus);announce(contextStates.size?'Expedientes: '+contextSelectionTitle():'Todos los estados');}
function openStateWorkspace(id,section='observations',focus=true){if(id&&!state(id))return;openContextWorkspace(id?[id]:[],section,focus);}
selectState=function(id){if($('homeStatePicker')?.open)$('homeStatePicker').close();openStateWorkspace(id);};
function contextSelectionCount(n){return n+' '+(n===1?'estado seleccionado':'estados seleccionados');}
function paintContextSelection(){
 const multi=$('contextMultiple').checked,chosen=multi?contextDraft:contextStates;
 $('contextPickerMap').classList.toggle('is-multiple',multi);$('contextMultipleActions').hidden=!multi;
 $('contextSelectionCount').textContent=contextSelectionCount(chosen.size);$('contextApplySelection').disabled=!chosen.size;$('contextApplySelection').textContent=(chosen.size===1?'Ver expediente (':'Ver expedientes (')+chosen.size+')';
 for(const path of $('contextPickerMap').querySelectorAll('path[data-cve-ent]')){const s=D.states.find(s=>s.geo===path.dataset.cveEnt);path.classList.toggle('context-current',!!s&&chosen.has(s.id));}
 for(const group of $('contextPickerMap').querySelectorAll('[data-context-state]')){const s=state(group.dataset.contextState),on=chosen.has(s.id);group.setAttribute('aria-pressed',String(on));group.setAttribute('aria-label',multi?(on?'Quitar ':'Incluir ')+s.name+' en la selección':'Abrir expediente de '+s.name);}
}
function chooseContextMap(id){if($('contextMultiple').checked){contextDraft.has(id)?contextDraft.delete(id):contextDraft.add(id);paintContextSelection();announce(contextSelectionCount(contextDraft.size));return;}openStateWorkspace(id);}
const contextFilteredPrecedents=filteredPrecedents;
filteredPrecedents=function(){const rows=contextFilteredPrecedents();if(!contextStates.size)return rows;const keys=new Set(D.conclusions.filter(c=>contextScopeHas(c.state)&&c.evaluable).flatMap(c=>eligibleRules(c).map(r=>r.precedent)));return rows.filter(p=>keys.has(p.key));};
const contextRenderPrecedents=renderPrecedents;
renderPrecedents=function(){contextRenderPrecedents();let note=$('contextPrecedentNote');if(!note){note=document.createElement('p');note.id='contextPrecedentNote';note.className='context-precedent-note';$('precedentCount').after(note);}note.hidden=!contextStates.size;note.textContent=contextStates.size?'Precedentes vinculados a las conclusiones de '+contextSelectionTitle()+'.':'';};
contextMapButton.onclick=openContextMap;contextHubReturn.onclick=()=>openContextWorkspace([...contextStates]);$('closeContextMap').onclick=()=>contextMapDialog.close();$('contextAllStates').onclick=()=>openContextWorkspace(D.states.map(s=>s.id));
$('contextMultiple').onchange=()=>{if(!$('contextMultiple').checked)contextDraft=new Set(contextStates);paintContextSelection();};$('contextClearSelection').onclick=()=>{contextDraft.clear();paintContextSelection();};$('contextApplySelection').onclick=()=>{if(contextDraft.size)openContextWorkspace([...contextDraft]);};
contextWorkspaceTabs.onclick=ev=>{const b=ev.target.closest('[data-workspace-section]');if(b)showWorkspaceSection(b.dataset.workspaceSection);};
$('stateDocuments').addEventListener('click',ev=>{if(ev.target.closest('[data-document]')){contextDocumentReturn=[...contextStates];$('closeDocument').textContent='← Volver al expediente';$('closeDocument').setAttribute('aria-label','Volver a documentos del expediente');}});
$('documentViewer').addEventListener('close',()=>{const ids=contextDocumentReturn;contextDocumentReturn=null;$('closeDocument').textContent='← Volver';$('closeDocument').setAttribute('aria-label','Volver al estado');if(ids?.length)openContextWorkspace(ids,'documents',false);});
$('contextDocuments').onclick=ev=>{ev.preventDefault();if(contextStates.size)openContextWorkspace([...contextStates],'documents');};
contextMapDialog.addEventListener('close',()=>{if(!document.querySelector('dialog[open]'))contextMapOpener?.focus({preventScroll:true});});
if(contextStates.size)applyContextStates([...contextStates]);else updateContextWorkspace();

window.addEventListener('resize',()=>{const svg=$('contextPickerMap').querySelector('svg');if(contextMapDialog.open&&svg)contextMapHitboxes(svg);},{passive:true});

// Shared dialog interactions and territorial selection.
function installBackdropClose(){
 let started=null;
 document.addEventListener('pointerdown',ev=>{const el=ev.target;if(!(el instanceof HTMLDialogElement))return;const r=el.getBoundingClientRect();started=(ev.clientX<r.left||ev.clientX>r.right||ev.clientY<r.top||ev.clientY>r.bottom)?el:null;});
 document.addEventListener('click',ev=>{const el=ev.target;if(!(el instanceof HTMLDialogElement)||!el.open)return;const r=el.getBoundingClientRect();const outside=ev.clientX<r.left||ev.clientX>r.right||ev.clientY<r.top||ev.clientY>r.bottom;if(outside&&started===el){const allowed=el.dispatchEvent(new Event('cancel',{cancelable:true}));if(allowed&&!el.dataset.unsaved)el.close();}started=null;});
}
installBackdropClose();
const contextMapDialog=document.createElement('dialog');contextMapDialog.id='contextMapPicker';contextMapDialog.className='section-dialog context-map-picker';contextMapDialog.setAttribute('aria-labelledby','contextMapTitle');
contextMapDialog.innerHTML=`<div class="section-dialog-head"><h2 id="contextMapTitle">${docIcon('map')}Seleccionar estado</h2><button type="button" class="button light" id="closeContextMap">← Volver</button></div><div class="context-map-body" id="contextMapBody"><div id="contextPickerMap" class="context-picker-map"></div><button type="button" class="text-button" id="contextAllStates">Consultar todos los estados</button></div>`;
document.body.append(contextMapDialog);
const contextMapButton=document.createElement('button');contextMapButton.id='contextMapButton';contextMapButton.type='button';contextMapButton.className='button light';contextMapButton.setAttribute('aria-haspopup','dialog');contextMapButton.setAttribute('aria-label','Seleccionar estado en el mapa');contextMapButton.innerHTML=docIcon('map')+'<span>Seleccionar en el mapa</span>';
$('contextState').after(contextMapButton);$('contextState').classList.add('context-native-state');
const contextLabel=document.querySelector('label[for="contextState"]');if(contextLabel)contextLabel.classList.add('context-native-state');
let contextMapOpener=null,contextDocumentReturn='';
const contextHubReturn=document.createElement('button');contextHubReturn.type='button';contextHubReturn.id='contextHubReturn';contextHubReturn.className='text-button context-hub-return';contextHubReturn.hidden=!selected;contextMapButton.after(contextHubReturn);
function updateContextHubReturn(){contextHubReturn.hidden=!selected;contextHubReturn.innerHTML=docIcon('reply')+'<span>Expediente de '+e(sn(selected))+'</span>';}
function contextMapLeaders(svg){
 const ns='http://www.w3.org/2000/svg',routes={Jalisco:{points:'455,440 370,485 300,485',x:290,y:496,anchor:'end'},Guerrero:{points:'560,530 500,575 450,575',x:440,y:586,anchor:'end'},Hidalgo:{points:'620,470 715,450 760,450',x:770,y:461,anchor:'start'},Nuevo_Leon:{points:'608,310 670,245 725,245',x:735,y:256,anchor:'start'},Quintana_Roo:{points:'907,479 975,535 975,555',x:970,y:589,anchor:'end'},San_Luis_Potosi:{points:'570,405 650,360 690,360',x:700,y:371,anchor:'start'}};
 for(const s of D.states){const r=routes[s.id];if(!r)continue;const g=document.createElementNS(ns,'g');g.setAttribute('class','context-map-label');g.dataset.contextState=s.id;g.setAttribute('role','button');g.setAttribute('tabindex','0');g.setAttribute('aria-label','Abrir expediente de '+s.name);g.setAttribute('aria-pressed',String(s.id===selected));const [cx,cy]=r.points.split(' ')[0].split(',');g.innerHTML=`<polyline points="${r.points}"/><circle cx="${cx}" cy="${cy}" r="4"/><text x="${r.x}" y="${r.y}" text-anchor="${r.anchor}">${e(s.name)}</text>`;g.onclick=()=>chooseContextMap(s.id);g.onkeydown=ev=>{if(['Enter',' '].includes(ev.key)){ev.preventDefault();chooseContextMap(s.id);}};svg.append(g);}
}
function openContextMap(){
 contextMapOpener=document.activeElement;
 const svg=$('mapContainer').querySelector('svg').cloneNode(true);svg.removeAttribute('id');svg.querySelectorAll('[id]').forEach(x=>x.removeAttribute('id'));svg.querySelectorAll('.map-label').forEach(x=>x.remove());
 svg.querySelectorAll('path').forEach(path=>{const s=D.states.find(s=>s.geo===path.dataset.cveEnt);path.removeAttribute('style');path.classList.remove('selected','scenario-out');path.classList.toggle('available',!!s);path.classList.toggle('context-current',s?.id===selected);path.removeAttribute('role');path.removeAttribute('tabindex');path.setAttribute('aria-hidden','true');if(s)path.onclick=()=>chooseContextMap(s.id);});
 contextMapLeaders(svg);$('contextPickerMap').replaceChildren(svg);if(!contextMapDialog.open)contextMapDialog.showModal();
}
const contextWorkspace=$('view-conclusiones'),contextObservationSection=document.createElement('section');
contextObservationSection.id='contextObservationSection';contextObservationSection.className='context-observation-section';
const contextWorkspaceTabs=contextWorkspace.querySelector('.case-switch');
contextWorkspaceTabs.className='context-workspace-tabs';contextWorkspaceTabs.setAttribute('aria-label','Secciones del expediente');contextWorkspaceTabs.innerHTML=`<button type="button" id="workspaceObservationsTab" data-workspace-section="observations" aria-pressed="true">${docIcon('list')}Observaciones</button><button type="button" id="workspaceDocumentsTab" data-workspace-section="documents" aria-pressed="false">${docIcon('folder')}Documentos del expediente</button>`;
[...contextWorkspace.children].filter(x=>x!==contextWorkspaceTabs).forEach(x=>contextObservationSection.append(x));contextWorkspace.append(contextObservationSection,$('stateDocuments'));$('stateDocuments').hidden=true;
$('caseResults').classList.add('context-observation-list');
const contextBaseShow=show;
show=function(view,focus=false){if(view==='estado'&&selected)view='conclusiones';return contextBaseShow(view,focus);};
function showWorkspaceSection(section){
 if(section==='documents'&&!selected){openContextMap();return;}
 const docs=section==='documents';contextObservationSection.hidden=docs;$('stateDocuments').hidden=!docs;
 $('workspaceObservationsTab').setAttribute('aria-pressed',String(!docs));$('workspaceDocumentsTab').setAttribute('aria-pressed',String(docs));
}
function updateContextWorkspace(){
 updateContextHubReturn();$('workspaceDocumentsTab').disabled=!selected;
 const title=contextObservationSection.querySelector('.section-top h2');if(title)title.textContent=selected?'Expediente · '+sn(selected):'Expedientes';
 if(!selected&&contextObservationSection.hidden)showWorkspaceSection('observations');
}
const contextBaseSync=syncContext;
syncContext=function(id){contextBaseSync(id);updateContextWorkspace();renderPrecedents();};
function openStateWorkspace(id,section='observations',focus=true){
 if(id&&!state(id))return;
 syncContext(id);renderMap();renderState();if(contextMapDialog.open)contextMapDialog.close();showWorkspaceSection(section);show('conclusiones',focus);announce(id?'Expediente de '+sn(id):'Todos los estados');
}
selectState=function(id){if($('homeStatePicker')?.open)$('homeStatePicker').close();openStateWorkspace(id);};
function chooseContextMap(id){openStateWorkspace(id);}
const contextFilteredPrecedents=filteredPrecedents;
filteredPrecedents=function(){const rows=contextFilteredPrecedents();if(!selected)return rows;const keys=new Set(D.conclusions.filter(c=>c.state===selected&&c.evaluable).flatMap(c=>eligibleRules(c).map(r=>r.precedent)));return rows.filter(p=>keys.has(p.key));};
const contextRenderPrecedents=renderPrecedents;
renderPrecedents=function(){contextRenderPrecedents();let note=$('contextPrecedentNote');if(!note){note=document.createElement('p');note.id='contextPrecedentNote';note.className='context-precedent-note';$('precedentCount').after(note);}note.hidden=!selected;note.textContent=selected?'Precedentes vinculados a las conclusiones de '+sn(selected)+'.':'';};
contextMapButton.onclick=openContextMap;contextHubReturn.onclick=()=>openStateWorkspace(selected);$('closeContextMap').onclick=()=>contextMapDialog.close();$('contextAllStates').onclick=()=>chooseContextMap('');
contextWorkspaceTabs.onclick=ev=>{const b=ev.target.closest('[data-workspace-section]');if(b)showWorkspaceSection(b.dataset.workspaceSection);};
$('stateDocuments').addEventListener('click',ev=>{if(ev.target.closest('[data-document]')){contextDocumentReturn=selected;$('closeDocument').textContent='← Volver al expediente';$('closeDocument').setAttribute('aria-label','Volver a documentos del expediente');}});
$('documentViewer').addEventListener('close',()=>{const id=contextDocumentReturn;contextDocumentReturn='';$('closeDocument').textContent='← Volver';$('closeDocument').setAttribute('aria-label','Volver al estado');if(id)openStateWorkspace(id,'documents',false);});
$('contextDocuments').onclick=ev=>{ev.preventDefault();if(selected)openStateWorkspace(selected,'documents');};
contextMapDialog.addEventListener('close',()=>{if(!document.querySelector('dialog[open]'))contextMapOpener?.focus({preventScroll:true});});
updateContextWorkspace();

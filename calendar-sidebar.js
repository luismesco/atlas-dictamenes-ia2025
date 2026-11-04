// Compact IA2025 planning calendar beside the estimation map.
function calendarSidebarToday(now=new Date()){
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Mexico_City',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
 const part=type=>parts.find(x=>x.type===type)?.value;
 return `${part('year')}-${part('month')}-${part('day')}`;
}
function calendarSidebarDays(from,to){
 const value=s=>Date.parse(s+'T12:00:00Z');
 return Math.round((value(to)-value(from))/86400000);
}
function calendarSidebarModel(events,now=new Date()){
 const today=calendarSidebarToday(now),session=events.find(x=>x.id==='ia2025-cg-aprobacion'),appeal=events.find(x=>x.id==='ia2025-apelacion-estimada');
 if(!session||!appeal)return null;
 const sessionDays=calendarSidebarDays(today,session.date),appealDays=calendarSidebarDays(today,appeal.date);
 let count,label,phase;
 if(sessionDays>0){count=String(sessionDays);label='días hasta la sesión prevista';phase='Preparar impugnaciones';}
 else if(sessionDays===0){count='Hoy';label='sesión prevista del Consejo General';phase='Confirmar aprobación y notificación';}
 else if(appealDays>0){count=String(appealDays);label='días al límite estimado';phase='Confirmar el plazo del recurso';}
 else if(appealDays===0){count='Hoy';label='límite estimado de planeación';phase='Confirmar el plazo del recurso';}
 else{count='Confirmar';label='resolución, notificación y plazo';phase='Consultar el expediente';}
 return {today,session,appeal,sessionDays,appealDays,count,label,phase,month:(sessionDays>0?session.date:appeal.date).slice(0,7)};
}
function renderCalendarSidebar(now=new Date()){
 const aside=document.getElementById('mapCalendarSidebar');
 if(!aside||typeof D==='undefined'||!D.calendar)return;
 const model=calendarSidebarModel(D.calendar.events,now);if(!model)return;
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const short=s=>new Intl.DateTimeFormat('es-MX',{day:'numeric',month:'short',timeZone:'UTC'}).format(new Date(s+'T12:00:00Z'));
 const monthDate=new Date(model.month+'-01T12:00:00Z'),offset=(monthDate.getUTCDay()+6)%7;
 const monthTitle=new Intl.DateTimeFormat('es-MX',{month:'long',year:'numeric',timeZone:'UTC'}).format(monthDate);
 const days=new Date(Date.UTC(monthDate.getUTCFullYear(),monthDate.getUTCMonth()+1,0)).getUTCDate();
 const cells=Array.from({length:offset},()=>'<span aria-hidden="true"></span>').concat(Array.from({length:days},(_,i)=>{
  const date=model.month+'-'+String(i+1).padStart(2,'0');
  const kind=date===model.session.date?'session':date===model.appeal.date?'appeal':'';
  const today=date===model.today;
  const label=kind==='session'?' · sesión prevista':kind==='appeal'?' · límite estimado':'';
  return `<span class="sidebar-calendar-day ${kind}${today?' today':''}"${today?' aria-current="date"':''} aria-label="${esc(short(date)+label)}">${i+1}</span>`;
 })).join('');
 const daysToAppeal=model.appealDays>0?`En ${model.appealDays} días, aproximadamente`:model.appealDays===0?'Fecha estimada de hoy':'Requiere confirmar la notificación';
 aside.innerHTML=`<div class="sidebar-calendar-heading"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18M8 15h2M14 15h2"/></svg><h3>Calendario</h3><span>IA 2025</span></div><p class="sidebar-calendar-phase">${esc(model.phase)}</p><div class="sidebar-calendar-count" role="status" aria-live="polite"><strong>${esc(model.count)}</strong><span>${esc(model.label)}</span></div><dl class="sidebar-calendar-dates"><div><dt>Sesión del Consejo General</dt><dd><time datetime="${esc(model.session.date)}">${esc(short(model.session.date))}</time><span>Prevista</span></dd></div><div><dt>Interposición del recurso</dt><dd><time datetime="${esc(model.appeal.date)}">${esc(short(model.appeal.date))}</time><span>Límite estimado</span></dd><small>${esc(daysToAppeal)}</small></div></dl><div class="sidebar-calendar-month"><p>${esc(monthTitle)}</p><div class="sidebar-calendar-week" aria-hidden="true"><span>L</span><span>M</span><span>X</span><span>J</span><span>V</span><span>S</span><span>D</span></div><div class="sidebar-calendar-grid" aria-label="${esc(monthTitle)}">${cells}</div></div><p class="sidebar-calendar-condition">Supuesto: representación presente y conocimiento íntegro el ${esc(short(model.session.date))}; cuatro días hábiles. Ajustar si cambia la sesión, hay engrose o resulta aplicable otro cómputo.</p><p class="sidebar-calendar-note">Cuenta en días naturales para planear; no acredita un vencimiento.</p><button type="button" class="text-button sidebar-calendar-open">Ver agenda y supuestos <span aria-hidden="true">→</span></button>`;
 aside.querySelector('.sidebar-calendar-open').onclick=()=>{
  if(typeof show==='function')show('agenda',true);
  const month=document.getElementById('calMonth');if(month)month.value=model.month;
  const category=document.getElementById('calCategory');if(category)category.value='IA2025';
  if(typeof calendarDay!=='undefined')calendarDay='';
  if(typeof renderCalendar==='function')renderCalendar();
 };
}
function initCalendarSidebar(){
 const territory=document.querySelector('#view-mapa .territory'),map=territory?.querySelector('.map-panel');
 if(!territory||!map||document.getElementById('mapCalendarSidebar')||typeof D==='undefined'||!D.calendar)return;
 const aside=document.createElement('aside');aside.id='mapCalendarSidebar';aside.className='panel sidebar-calendar';aside.setAttribute('aria-label','Calendario aproximado para las impugnaciones del Informe Anual 2025');
 territory.classList.add('has-calendar-sidebar');map.after(aside);renderCalendarSidebar();
 let lastDay=calendarSidebarToday();
 const update=()=>{const day=calendarSidebarToday();if(day!==lastDay){lastDay=day;renderCalendarSidebar();}};
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)update();});
 setInterval(update,60000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initCalendarSidebar,{once:true});else initCalendarSidebar();

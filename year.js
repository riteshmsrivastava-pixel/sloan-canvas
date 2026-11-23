/* Full-year planning, private degree records, and Spring 2027 catalog. */
'use strict';
const Y=DegreePlan;
const TERM_LABEL={SUMMER:'Summer ’26',FALL:'Fall ’26',IAP:'IAP ’27',SPRING:'Spring ’27'};
const TERM_TAB={SUMMER:'summer',FALL:'sloan',IAP:'iap',SPRING:'spring'};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const attr=esc;
const SPRING_IDX=Object.fromEntries((window.SPRING_COURSES||[]).map(c=>{c.route='Spring';c.fac=c.fac||'';const allocation=Y.SPLIT[c.id]?.SPRING;if(allocation){c.sourceUnits=c.units;c.units=allocation;c.allocationNote=allocation+' units in Spring; the remaining units belong to '+(Y.SPLIT[c.id].IAP?'IAP.':'Fall.');}return [c.key,c];}));
const springFilter={q:'',half:'',cert:'',units:'',hideUG:true,components:false};
let springHalf='all',yearSyncText='Saved in this browser',yearReady=false,yearOwner=null,yearRevision=0,yearDirty=false,yearTimer=null,yearSaving=false,yearConflict=null;
window.yearActiveTab='degree';
window.yearLookup=k=>SPRING_IDX[k]||Y.SUMMER.find(c=>c.key===k);
function degreeState(){
  if(!state.degree||typeof state.degree!=='object')state.degree={};
  const d=state.degree;d.outcomes=d.outcomes||{};d.units=d.units||{};d.graduate=d.graduate||{};d.checks=d.checks||{};d.degree=d.degree||'MBA';d.sdOption=d.sdOption==='15.873'?'15.873':'15.871';return d;
}
function rawOutcome(c){
  const d=degreeState(),key=c.core&&['15.871','15.873'].includes(c.id)?'CORE:SD':c.key;
  return d.outcomes[key]||(c.term==='SUMMER'?'unconfirmed':state.status?.[c.key]==='dropping'?'excluded':state.status?.[c.key]==='waitlist'?'waitlist':'planned');
}
function yearRecords(){
  const d=degreeState();
  const cs=planned().filter(c=>!(state.finWaiver&&c.id==='15.414'));
  const selectedCore=cs.find(c=>c.term==='SPRING'&&c.id===d.sdOption&&!c.component);
  const core={key:'CORE:SD',id:d.sdOption,title:d.sdOption==='15.873'?'System Dynamics for Business and Policy':'Introduction to System Dynamics',term:'SPRING',units:d.sdOption==='15.873'?9:6,core:true,half:d.sdOption==='15.873'?'F':'H3',m:[],sectionPending:true};
  const records=[...Y.SUMMER,...cs.map(c=>({...c,core:c.id==='15.414'||c===selectedCore,term:c.term||'FALL'})),...(!selectedCore?[core]:[])];
  return records.map(c=>{
    let graduate=c.graduate!==false;
    if(c.restrictions&&/(^|\s)U($|\s)/.test(c.restrictions))graduate=false;
    if(c.mit&&c.term!=='SPRING'){const m=(window.MIT_COURSES||[]).find(x=>x.id===c.id);graduate=m?.lv==='G';}
    if(c.custom)graduate=!!c.graduate;
    if(c.route==='Ineligible'&&!c.core)graduate=false;
    if(Object.hasOwn(d.graduate,c.key))graduate=d.graduate[c.key];
    const baseUnits=c.term==='FALL'?FU(c):c.units;
    const units=Object.hasOwn(d.units,c.key)?d.units[c.key]:(c.arrangedUnits||((c.id==='15.960'||c.id==='15.961')&&!baseUnits)?null:baseUnits);
    return {...c,creditGroup:c.creditGroup||window.CROSSLIST_GROUPS?.[c.id],graduate,units,outcome:rawOutcome(c),outcomeKey:c.core&&['15.871','15.873'].includes(c.id)?'CORE:SD':c.key};
  });
}
function degreeTotals(){return Y.calculate(yearRecords(),{...degreeState(),finWaiver:!!state.finWaiver});}
function persistYear(){save();render();}
function setOutcome(key,value){degreeState().outcomes[key]=value;persistYear();}
function setApprovedUnits(key,value){if(value===''){delete degreeState().units[key];persistYear();return;}const v=Number(value);if(!Number.isFinite(v)||v<0||v>99)return;degreeState().units[key]=v;persistYear();}
function setGraduate(key,value){degreeState().graduate[key]=value;persistYear();}
function setDegreeCheck(key,value){degreeState().checks[key]=value;persistYear();}
function completeSummer(){Y.SUMMER.forEach(c=>degreeState().outcomes[c.key]='completed');persistYear();}
function setDegreeOption(value){degreeState().degree=value;persistYear();}
function setSystemDynamics(value){
  degreeState().sdOption=value;state.plan=state.plan.filter(k=>{const c=byKey(k);return !(c?.term==='SPRING'&&['15.871','15.873'].includes(c.id));});
  delete degreeState().outcomes['CORE:SD'];persistYear();pushIf();
}
function springSelect(key){
  const c=SPRING_IDX[key];if(!c)return;if(c.id==='15.871'&&!c.component&&!['C','D'].includes(c.sec)){alert('SFMBA sections are C or D. Choose your assigned core section.');return;}
  if(!c.component){state.plan=state.plan.filter(k=>{const old=byKey(k);return !(old?.term==='SPRING'&&!old.component&&old.id===c.id&&k!==key);});}
  if(['15.871','15.873'].includes(c.id)&&!c.component){degreeState().sdOption=c.id;state.plan=state.plan.filter(k=>{const old=byKey(k);return !(old?.term==='SPRING'&&['15.871','15.873'].includes(old.id)&&k!==key);});}
  add(key);
}
function setSpringCore(key){
  state.plan=state.plan.filter(k=>{const c=byKey(k);return !(c?.term==='SPRING'&&['15.871','15.873'].includes(c.id));});
  if(key)state.plan.push(key);persistYear();pushIf();
}
function yearMeter(label,earned,projected,target){
  const a=Math.min(100,earned/target*100),b=Math.max(0,Math.min(100-a,(projected-earned)/target*100));
  return `<div class="year-meter"><div><b>${label}</b><span>${earned} / ${target} earned</span></div><div class="trackbar"><i style="width:${a}%"></i><b style="width:${b}%"></b></div><div class="year-muted">${projected} including planned · ${Math.max(0,target-projected)} still to plan</div></div>`;
}
function ledgerRow(r){
  const editable=!r.core&&(r.arrangedUnits||r.custom||['15.960','15.961','15.THG'].includes(r.id));
  const options=r.term==='SUMMER'?['unconfirmed','completed','planned','excluded']:['planned','completed','waitlist','excluded'];
  const labels={unconfirmed:'Not confirmed',completed:'Completed · passed',planned:r.term==='FALL'?'In progress':'Planned',waitlist:'Waitlist',excluded:'Not counting'};
  return `<div class="ledger-row" data-ledger-key="${attr(r.key)}"><div><span class="code">${esc(r.id)}${r.sec&&r.sec!=='000'?' · '+esc(r.sec):''}</span> ${r.core?'<span class="year-pill">Core</span>':''}<div class="ledger-title">${esc(r.title)}</div><div class="ledger-reason">${r.sectionPending?'Section to be assigned · choose C or D when known. ':''}${esc(r.reason)}</div>${r.custom||r.mit?`<label class="year-check" style="font-size:12px;margin:5px 0"><input type="checkbox" ${r.graduate?'checked':''} onchange="setGraduate('${attr(r.key)}',this.checked)">Approved graduate credit</label>`:''}</div><div class="ledger-units">${editable?`<input type="number" min="0" max="99" step="1" aria-label="Approved units for ${attr(r.id)}" value="${r.units??''}" placeholder="Units" onchange="setApprovedUnits('${attr(r.key)}',this.value)">`:`${r.units??'—'}u`}</div><div class="ledger-controls">${classmatesButton(r)}<select aria-label="Completion for ${attr(r.id)} ${attr(r.sec||'')}" onchange="setOutcome('${attr(r.outcomeKey)}',this.value)">${options.map(v=>`<option value="${v}" ${v===r.outcome?'selected':''}>${labels[v]}</option>`).join('')}</select>${!r.core?`<button class="text-button" onclick="remove('${attr(r.key)}')" aria-label="Remove ${attr(r.id)} from ${TERM_LABEL[r.term]}">Remove</button>`:''}</div></div>`;
}
function renderLedger(t,term){
  const rows=t.records.filter(r=>r.term===term),v=t.byTerm[term];
  return `<section class="ledger-term"><h3>${TERM_LABEL[term]} <span class="year-pill green">${v.earned} earned</span><span class="year-pill">${v.planned} planned</span></h3>${rows.map(ledgerRow).join('')||`<div class="year-empty">No courses in this term yet. <button class="text-button" onclick="setTab('${TERM_TAB[term]}')">Browse courses</button></div>`}</section>`;
}
function renderDegree(){
  const el=document.getElementById('view-degree');if(!el)return;
  const t=degreeTotals(),d=degreeState(),a=Math.min(100,t.earned/t.target.total*100),b=Math.max(0,Math.min(100-a,t.planned/t.target.total*100));
  el.innerHTML=`<div class="year-hero"><div><div class="year-kicker">MIT Sloan Fellows · Class of 2027</div><h1>Degree progress</h1><p>Track completed and planned units across Summer, Fall, IAP and Spring.</p><button class="btn" onclick="setTab('spring')">Plan Spring ’27</button></div><div class="year-progress"><div class="year-numbers"><strong>${t.earned}</strong><span>/ ${t.target.total} graduate units earned</span></div><div class="year-bar" role="img" aria-label="${t.earned} earned and ${t.planned} planned out of ${t.target.total} units"><i class="earned" style="width:${a}%"></i><i class="planned" style="width:${b}%"></i></div><div class="year-legend"><span><i></i>${t.earned} completed</span><span><i class="future"></i>${t.planned} planned</span></div><p style="margin-top:16px">${t.gap?`<b>${t.gap} more units to plan</b> for your credit targets.`:'Your selected courses cover the unit targets.'} ${t.remaining} units still to earn.</p></div></div>
+    <div class="year-terms">${Y.TERMS.map(term=>{const v=t.byTerm[term];return `<button class="year-term" onclick="setTab('${TERM_TAB[term]}')"><span class="term-label">${TERM_LABEL[term]}</span><span class="term-date">${term==='SUMMER'?'JUN – AUG':term==='FALL'?'SEP – DEC':term==='IAP'?'JANUARY':'FEB – MAY'}</span><strong>${v.earned}<small> earned</small></strong><small>${v.planned} units planned</small></button>`;}).join('')}</div>
+    <div class="year-grid"><div class="year-stack"><div class="panel year-panel"><div class="ledger-head"><div><h2>Course record</h2><div class="year-muted">Only courses marked “Completed · passed” count as earned. Waitlists and excluded courses do not count.</div></div><button class="btn" onclick="openYearCourse()">Add course / study</button></div>${!Y.SUMMER.every(c=>d.outcomes[c.key]==='completed')?'<div class="year-note">Confirm completion of all seven Summer core courses, or update each course below.<div class="year-actions"><button class="btn" onclick="completeSummer()">Mark Summer core completed</button></div></div>':''}${Y.TERMS.map(term=>renderLedger(t,term)).join('')}</div>
+    <div class="panel year-panel"><h2>Research & independent study</h2><p class="year-muted">Add 15.960 (P/D/F) or 15.961 (letter graded), choose the term, and enter the units approved by your advisor. Up to 12 independent study units per semester count here.</p><div class="year-actions"><button class="btn" onclick="openYearCourse('independent')">Add independent study</button><button class="btn" onclick="openYearCourse('thesis')">Add thesis allocation</button></div><p class="year-source">A Sloan thesis is 24 units across at least two terms; a single-semester thesis is not permitted. Confirm proposal deadlines and approved allocations with SES. <a href="https://sloanhub.mit.edu/pages/registration-copy3" target="_blank" rel="noopener">Research requirements</a></p></div></div>
+    <aside class="year-stack"><div class="panel year-panel"><h2>Degree requirements</h2>${yearMeter('Core subjects',t.coreEarned,t.coreProjected,t.target.core)}${yearMeter('Graduate electives',t.electiveEarned,t.electiveProjected,t.target.elective)}<div class="year-muted">Maximum graduate electives: 129 units across Fall, IAP and Spring.</div><div class="year-fields" style="margin-top:20px"><label class="year-field">Degree option<select onchange="setDegreeOption(this.value)">${['MBA','SM','MOT'].map(v=>`<option ${d.degree===v?'selected':''}>${v}</option>`).join('')}</select></label><label class="year-field">System Dynamics core<select onchange="setSystemDynamics(this.value)"><option value="15.871" ${d.sdOption==='15.871'?'selected':''}>15.871 · 6 units</option><option value="15.873" ${d.sdOption==='15.873'?'selected':''}>15.873 · 9 units</option></select></label></div><label class="year-check"><input type="checkbox" ${state.finWaiver?'checked':''} onchange="waiveCore()"><span>I have an approved Finance core waiver.<br><span class="year-muted">Replaces 9 core units with 9 additional elective units.</span></span></label>${d.sdOption==='15.873'?'<div class="year-note">15.873 raises the total requirement to 174 units. Use add/drop with the program; SFMBAs do not bid for it.</div>':''}${d.degree!=='MBA'?`<div class="year-note">${d.degree==='SM'?'SM requires a Sloan master’s thesis.':'MOT requires a technology-focused Sloan master’s thesis; confirm the degree option with the program.'}</div>`:''}<p class="year-source">Based on <a href="https://sloanhub.mit.edu/pages/sfmba-requirements" target="_blank" rel="noopener">SFMBA degree requirements</a>, checked Nov 22, 2026. Your official degree audit is in <a href="https://stellic.mit.edu/" target="_blank" rel="noopener">Stellic</a>.</p></div>
+    ${t.warnings.length?`<div class="panel year-panel"><h3>Check your plan</h3><ul class="year-warnings">${t.warnings.map(w=>`<li>${esc(w)}</li>`).join('')}</ul></div>`:''}
+    <div class="panel year-panel"><h3>Before graduation</h3><div class="year-muted">A personal checklist, separate from the unit estimate.</div>${[['application','Degree application submitted by the first Friday of Spring'],['gpa','Cumulative GPA is at least 4.0 / 5.0'],['holds','Degree holds cleared'],...(d.degree!=='MBA'?[['thesis','Thesis and degree option approved']]:[])].map(([k,label])=>`<label class="year-check"><input type="checkbox" ${d.checks[k]?'checked':''} onchange="setDegreeCheck('${k}',this.checked)"><span>${label}</span></label>`).join('')}<div class="year-note">${t.unitTargetMet?'Your recorded passing credits meet the unit targets. Confirm final clearance in Stellic.':`${t.coreRemaining.length} core subject${t.coreRemaining.length===1?'':'s'} still need a passing-grade confirmation.`}</div></div>
+    <div class="panel year-panel"><h3>Saved plan & backups</h3><p class="year-muted">Completion records and degree settings are private to your account. Course selections keep the existing cohort sharing.</p><div class="year-actions"><button class="btn" onclick="exportYearPlan()">Download backup</button><button class="btn" onclick="document.getElementById('yearImport').click()">Restore backup</button></div><div class="year-status" aria-live="polite" id="yearSyncStatus">${esc(yearSyncText)}</div>${yearConflict?'<div class="year-note">Another saved version is available. Download a backup before choosing.<div class="year-actions"><button class="btn" onclick="resolveYearConflict(false)">Load cloud version</button><button class="btn" onclick="resolveYearConflict(true)">Keep this version</button></div></div>':''}</div></aside></div>`.replace(/^\+/gm,'');
}
function renderSummer(){const t=degreeTotals();document.getElementById('view-summer').innerHTML=`<div class="panel year-panel"><div class="ph"><div><div class="year-kicker">Summer 2026 · required core</div><h1>Summer core courses</h1></div><button class="btn year-primary" onclick="completeSummer()">Mark Summer core completed</button></div><p class="year-muted">Seven required courses · 60 units. Mark completed courses to include them in your earned units.</p>${renderLedger(t,'SUMMER')}<button class="btn" onclick="setTab('degree')">View full degree progress</button></div>`;}
function fallChoices(){
  const selected=new Set(yearRecords().filter(c=>c.term==='FALL').map(c=>c.id));
  const subjects=new Map();
  for(const c of COURSES){
    if(c.term&&c.term!=='FALL'||c.locked||c.route==='Ineligible'||isHv(c)||selected.has(c.id)||c.units<=0)continue;
    if(!subjects.has(c.key))subjects.set(c.key,c);
  }
  return [...subjects.values()].sort((a,b)=>a.key.localeCompare(b.key,undefined,{numeric:true}));
}
function fallCourseChanged(){
  const c=byKey(document.getElementById('fallCourse').value);
  document.getElementById('fallCourseUnits').textContent=c?FU(c)+' units':'Select a course';
  document.getElementById('fallCourseAdd').disabled=!c;
}
function addFallCompleted(event){
  event?.preventDefault();
  const key=document.getElementById('fallCourse').value,c=fallChoices().find(c=>c.key===key);
  if(!c)return;
  state.plan.push(key);degreeState().outcomes[key]='completed';
  state.status=state.status||{};state.status[key]='enrolled';
  persistYear();pushIf();
}
function renderFall(){
  const t=degreeTotals(),v=t.byTerm.FALL,choices=fallChoices();
  document.getElementById('view-sloan').innerHTML=`<div class="panel year-panel"><div class="ph"><div><div class="year-kicker">Fall 2026</div><h1>Fall course record</h1></div><span class="year-pill green">${v.earned} completed units</span></div><p class="year-muted">Select the courses you completed. Units are filled in automatically and count toward your degree. Update the status below for courses still in progress.</p><form class="fall-add-form" onsubmit="addFallCompleted(event)"><label class="year-field">Fall course<select id="fallCourse" onchange="fallCourseChanged()" required><option value="">Select a completed course</option>${choices.map(c=>`<option value="${attr(c.key)}">${esc(c.id)}${c.sec?' · '+esc(c.sec):''} · ${esc(c.title)} · ${FU(c)} units</option>`).join('')}</select></label><div class="fall-selected-units" id="fallCourseUnits" aria-live="polite">Select a course</div><button class="btn year-primary" id="fallCourseAdd" disabled type="submit">Add completed course</button></form><div class="year-actions"><button class="text-button" onclick="openYearCourse('', 'FALL')">Course not listed?</button><button class="text-button" onclick="openYearCourse('independent', 'FALL')">Add independent study</button></div>${renderLedger(t,'FALL')}<button class="btn" onclick="setTab('degree')">View degree progress</button></div>`;
}
function springCoreHTML(){
  const d=degreeState(),chosen=planned().find(c=>c.term==='SPRING'&&c.id===d.sdOption&&!c.component);
  const sections=Object.values(SPRING_IDX).filter(c=>c.id===d.sdOption&&!c.component&&(c.id!=='15.871'||['C','D'].includes(c.sec)));
  return `<div class="year-note"><b>Required core · ${d.sdOption}</b><p style="margin:7px 0">${d.sdOption==='15.871'?'6 units in H3. The program assigns C or D after bidding; leave one of those slots open.':'9 units for the full term. Add/drop replaces 15.871; do not bid for this core.'}</p><label class="year-field">Your core section<select onchange="setSpringCore(this.value)"><option value="">Not assigned yet</option>${sections.map(c=>`<option value="${attr(c.key)}" ${chosen?.key===c.key?'selected':''}>${esc(c.sec)} · ${esc(c.sched)}</option>`).join('')}</select></label>${chosen?classmatesButton(chosen):''}</div>`;
}
function buildSpring(){
  const el=document.getElementById('view-spring');if(el.dataset.built)return;el.dataset.built='1';
  const certs=[...new Set(Object.values(SPRING_IDX).flatMap(c=>c.certs||[]))];
  el.innerHTML=`<div class="ph" style="margin:16px 0 22px"><div><div class="year-kicker">Spring 2027 · Sloan</div><h1 style="margin-bottom:8px">Sloan Spring courses</h1><div class="year-muted">294 sections from the Sloan Course Browser · H3, H4 and full term.</div></div><button class="btn" onclick="openYearCourse('', 'SPRING')">Add course / study</button></div><div class="spring-layout"><div class="panel year-panel"><div class="ph"><h2>Spring catalog</h2><span class="count" id="springCount"></span></div><div class="spring-filters"><label class="year-field search">Search courses or faculty<input type="search" id="springSearch" placeholder="Try AI, finance or 15.281" oninput="springFilter.q=this.value;renderSpringResults()"></label><label class="year-field">Term length<select onchange="springFilter.half=this.value;renderSpringResults()"><option value="">All lengths</option><option value="F">Full term</option><option value="H3">H3 · first half</option><option value="H4">H4 · second half</option></select></label><label class="year-field">Certificate<select onchange="springFilter.cert=this.value;renderSpringResults()"><option value="">All certificates</option>${certs.map(c=>`<option value="${c}">${esc(CERT[c]?.full||c)}</option>`).join('')}</select></label><label class="year-field">Units<select onchange="springFilter.units=this.value;renderSpringResults()"><option value="">All unit values</option>${[...new Set(Object.values(SPRING_IDX).map(c=>c.units).filter(v=>v>0))].sort((a,b)=>a-b).map(v=>`<option value="${v}">${v} units</option>`).join('')}<option value="arr">Arranged</option></select></label></div><label class="year-check"><input type="checkbox" checked onchange="springFilter.hideUG=this.checked;renderSpringResults()">Hide undergraduate and doctoral-only sections</label><label class="year-check"><input type="checkbox" onchange="springFilter.components=this.checked;renderSpringResults()">Show recitations and labs (no extra credits)</label><div class="year-muted" style="margin-bottom:14px">Restrictions are shown as listed. Confirm SFMBA access and prerequisites in SloanBid.</div><div class="spring-list" id="springList"></div></div><div class="year-stack"><div class="panel year-panel"><div class="ph"><h2>Spring weekly schedule</h2><select aria-label="Spring schedule half" class="year-select" style="width:auto" onchange="springHalf=this.value;renderSpringPlan()"><option value="all">Whole term</option><option value="H3">H3</option><option value="H4">H4</option></select></div><div id="springConflicts" class="year-alert" aria-live="polite"></div><div id="springWeek" class="spring-week"></div></div><div class="panel year-panel"><div class="ph"><h2>My Spring plan</h2><span class="year-pill" id="springUnits"></span></div><div id="springCore"></div><div id="springPlan"></div><button class="btn" style="margin-top:14px" onclick="setTab('degree')">View degree progress</button></div></div></div>`;
}
function renderSpringResults(){
  const q=springFilter.q.trim().toLowerCase();
  const list=Object.values(SPRING_IDX).filter(c=>(!q||(c.id+' '+c.title+' '+c.fac).toLowerCase().includes(q))&&(!springFilter.half||c.half===springFilter.half)&&(!springFilter.cert||c.certs.includes(springFilter.cert))&&(!springFilter.units||(springFilter.units==='arr'?c.arrangedUnits:String(c.units)===springFilter.units))&&(!springFilter.hideUG||!['U','D'].includes(c.restrictions))&&(springFilter.components||!c.component));
  document.getElementById('springCount').textContent=list.length+' sections';
  document.getElementById('springList').innerHTML=list.map(c=>{
    const added=state.plan.includes(c.key),ug=/(^|\s)U($|\s)/.test(c.restrictions),sd=['15.871','15.873'].includes(c.id)&&!c.component;
    return `<article class="spring-course"><div class="spring-top"><div><span class="code">${esc(c.id)}${c.sec==='000'?'':' · '+esc(c.sec)}</span> <span class="year-pill">${c.half==='F'?'Full term':c.half}</span></div><button class="btn ${added?'':'year-primary'}" aria-label="${added?'Remove':'Add'} ${attr(c.id)} ${attr(c.sec)}" onclick="${added?'remove':'springSelect'}('${attr(c.key)}')">${added?'Added ✓':'Add'}</button></div><h3>${esc(c.title)}</h3><div class="meta"><span class="year-pill ${ug?'red':'green'}">${c.component?'0 additional units':c.units==null?'Units arranged':c.units+' units'}</span>${c.restrictions?`<span class="year-pill amber">Restrictions: ${esc(c.restrictions)}</span>`:''}${sd?'<span class="year-pill">Core option</span>':''}${c.certs.map(k=>`<span class="year-pill">${esc(CERT[k]?.full||k)}</span>`).join('')}</div><div class="source-schedule">${esc(c.sched||'Schedule to be arranged')}</div><div class="fac">${esc(c.fac)}</div>${c.component?'<div class="year-muted">Add the main class separately. This component adds no credit.</div>':''}${c.arrangedUnits?'<div class="year-muted">Enter approved units in My degree after adding.</div>':''}${c.allocationNote?`<div class="year-muted">${esc(c.allocationNote)}</div>`:''}<div class="year-actions">${classmatesButton(c)}</div></article>`;
  }).join('')||'<div class="year-empty">No courses match. Try another search or clear a filter.</div>';
}
function renderSpringPlan(){
  const t=degreeTotals(),cs=t.records.filter(c=>c.term==='SPRING'),v=t.byTerm.SPRING;
  document.getElementById('springUnits').textContent=(v.earned+v.planned)+' units including core';
  document.getElementById('springCore').innerHTML=springCoreHTML();
  document.getElementById('springPlan').innerHTML=cs.filter(c=>!c.core).map(c=>`<div class="spring-plan-row"><span class="code">${esc(c.id)}${c.sec&&c.sec!=='000'?' · '+esc(c.sec):''}</span> <span class="year-pill">${c.units??'—'} units · ${c.half}</span><div class="ledger-title">${esc(c.title)}</div><div class="year-muted">${esc(c.sched||fmtMeet(c.m||[]))}</div><div class="year-actions">${classmatesButton(c)}<select class="year-select" style="width:auto;font-size:14px" aria-label="Spring status ${attr(c.id)}" onchange="setStatus('${attr(c.key)}',this.value)">${Object.entries(STATUS).map(([k,s])=>`<option value="${k}" ${statusOf(c.key)===k?'selected':''}>${s.label}</option>`).join('')}</select><button class="text-button" onclick="remove('${attr(c.key)}')">Remove</button></div></div>`).join('')||'<div class="year-empty">Add electives from the catalog to start your Spring plan.</div>';
  const pairs=Y.conflicts(cs,springHalf),keys=new Set(pairs.flat());
  document.getElementById('springConflicts').style.color=pairs.length?'var(--brand2)':'var(--green2)';
  document.getElementById('springConflicts').textContent=pairs.length?pairs.length+' overlapping course pair'+(pairs.length===1?'':'s')+'. Check sections before registering.':'No time conflicts in this view.';
  const active=cs.filter(c=>c.outcome!=='excluded'&&(springHalf==='all'||c.half==='F'||c.half===springHalf));
  document.getElementById('springWeek').innerHTML=springCalendarHTML(active,keys);
}
function springCalendarHTML(active,conflicts){
  const meetings=active.flatMap(c=>(c.m||[]));
  const start=Math.min(8*60,...meetings.map(m=>Math.floor(m[1]/60)*60));
  const end=Math.max(19*60,...meetings.map(m=>Math.ceil(m[2]/60)*60));
  const scale=.9,height=(end-start)*scale;
  let gutter='<div class="ghead"></div><div class="track" style="height:'+height+'px">';
  for(let time=start;time<end;time+=60)gutter+=`<span class="tlabel" style="top:${(time-start)*scale}px">${fmtTime(time).replace(' ','').toLowerCase()}</span>`;
  gutter+='</div>';
  const days=['M','T','W','Th','F'].map(day=>{
    const events=active.flatMap(c=>(c.m||[]).filter(m=>m[0]===day).map(m=>({c,s:m[1],e:m[2]})));
    layoutLanes(events);
    return `<div class="day"><div class="dhead">${DAY[day]}</div><div class="track" style="height:${height}px;background-image:repeating-linear-gradient(to bottom,var(--grid) 0 1px,transparent 1px ${60*scale}px)">${events.map(({c,s,e,lane,cols})=>`<button class="spring-calendar-course ${conflicts.has(c.key)?'conflict':''}" data-key="${attr(c.key)}" onclick="showClassmates('${attr(c.key)}')" aria-label="${attr(c.id+' '+DAY[day]+' '+fmtTime(s)+' to '+fmtTime(e)+'. '+c.title)}" style="top:${(s-start)*scale}px;height:${Math.max(24,(e-s)*scale)}px;left:calc(${lane*100/cols}% + 2px);width:calc(${100/cols}% - 4px)"><b>${esc(c.id)}${c.sec&&c.sec!=='000'?' · '+esc(c.sec):''}</b><span>${esc(c.half==='F'?'Full term':c.half||'')}</span><span>${esc(c.title)}</span></button>`).join('')}</div></div>`;
  }).join('');
  const undated=active.filter(c=>!c.m?.length);
  return `<div class="calwrap spring-calendar" aria-label="Spring weekly calendar"><div class="gutter">${gutter}</div><div class="days">${days}</div></div><p class="year-muted">Select courses in the browser to add them to this calendar. Click a class to see classmates.</p>${undated.length?`<p class="year-muted">Times pending: ${undated.map(c=>esc(c.id)).join(', ')}. These courses count toward planned units but are not plotted yet.</p>`:''}`;

}
window.renderYear=function(){
  if(!yearReady)return;
  if(window.yearActiveTab==='degree')renderDegree();
  if(window.yearActiveTab==='summer')renderSummer();
  if(window.yearActiveTab==='sloan')renderFall();
  if(window.yearActiveTab==='spring'){buildSpring();renderSpringResults();renderSpringPlan();}
};
function openYearCourse(kind='',term='SPRING'){
  const dialog=document.getElementById('yearCourse');dialog.querySelector('form').reset();document.getElementById('ycMessage').textContent='';
  document.getElementById('ycKind').value=kind||'course';document.getElementById('ycTerm').value=term;document.getElementById('ycOutcome').value=term==='FALL'?'completed':'planned';yearKindChanged();dialog.showModal();
}
function yearKindChanged(){
  const kind=document.getElementById('ycKind').value,code=document.getElementById('ycCode'),title=document.getElementById('ycTitle'),units=document.getElementById('ycUnits');
  document.getElementById('ycStudyWrap').hidden=kind!=='independent';
  code.readOnly=kind!=='course';title.readOnly=kind!=='course';
  if(kind==='independent'){code.value=document.getElementById('ycStudy').value;title.value='Independent Study in Management';units.max=12;}
  else if(kind==='thesis'){code.value='15.THG';title.value='Sloan Master’s Thesis';units.max=24;}
  else{code.value='';title.value='';units.max=99;}
  document.getElementById('ycInfo').textContent=kind==='independent'?'Use the approved units for this term. Independent study is limited to 12 units per semester; the proposal must be approved before registration.':kind==='thesis'?'Allocate only the approved units for this term. Add a separate allocation for the other term; a thesis is 24 units across at least two terms.':'Enter MIT-equivalent graduate units approved for your degree. Add cross-registration and other courses not in the catalog.';
}
function addYearCourse(event){
  event.preventDefault();const value=id=>document.getElementById(id).value;
  const kind=value('ycKind'),id=value('ycCode').trim().toUpperCase(),title=value('ycTitle').trim(),term=value('ycTerm'),units=Number(value('ycUnits'));
  const msg=document.getElementById('ycMessage');
  if(!id||!title||!Number.isFinite(units)||units<0||units>Number(document.getElementById('ycUnits').max)){msg.textContent='Enter a course code, title and valid approved units.';return;}
  if(yearRecords().some(c=>c.term===term&&c.id===id)){msg.textContent='This subject is already in that term. Edit its units in My degree.';return;}
  const key='CUSTOM:'+crypto.randomUUID();state.custom=state.custom||{};
  state.custom[key]={key,id,base:id,title,term,units,half:'F',m:[],fac:'Added by you',route:'Custom',certs:[],kind,custom:true,graduate:document.getElementById('ycGraduate').checked};
  state.plan.push(key);degreeState().outcomes[key]=value('ycOutcome');document.getElementById('yearCourse').close();persistYear();
}
function exportYearPlan(){
  const data={format:'muddy-falls-year-plan',version:2,exportedAt:new Date().toISOString(),state};
  const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='muddy-falls-2026-27-plan.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function validYearState(s){
  if(!s||!Array.isArray(s.plan)||s.plan.length>1500||!s.plan.every(k=>typeof k==='string'&&/^[\w.:·-]{1,160}$/.test(k))||!s.custom||typeof s.custom!=='object'||Array.isArray(s.custom))return false;
  for(const [key,c] of Object.entries(s.custom)){
    if(!/^CUSTOM:[\w-]+$/.test(key)||!c||c.key!==key||typeof c.id!=='string'||!/^[-A-Za-z0-9._ :/]{1,80}$/.test(c.id)||typeof c.title!=='string'||c.title.length>300||!Number.isFinite(c.units)||c.units<0||c.units>99||!Array.isArray(c.m)||c.m.some(m=>!Array.isArray(m)||m.length!==3||!['M','T','W','Th','F'].includes(m[0])||!Number.isFinite(m[1])||!Number.isFinite(m[2])||m[1]<0||m[2]>1440||m[2]<=m[1]))return false;
    if(c.term&&!['FALL','IAP','SPRING'].includes(c.term))return false;
  }
  return JSON.stringify(s).length<1000000;
}
function normalizeYearState(s){
  const clean=JSON.parse(JSON.stringify(s));
  clean.custom=Object.fromEntries(Object.entries(clean.custom||{}).map(([key,c])=>[key,{key,id:c.id,base:c.id,title:c.title,units:c.units,term:c.term||'FALL',half:['F','H1','H2','H3','H4'].includes(c.half)?c.half:'F',m:c.m,custom:true,graduate:!!c.graduate,kind:['independent','thesis'].includes(c.kind)?c.kind:'course',fac:'Added by you',route:'Custom',certs:[]}]));
  return clean;
}
async function importYearPlan(input){
  try{const file=input.files[0];if(!file)return;if(file.size>2e6)throw Error('File is too large.');const data=JSON.parse(await file.text());if(data.format!=='muddy-falls-year-plan'||data.version!==2||!validYearState(data.state))throw Error('This is not a supported Muddy Falls backup.');
    if(!confirm('Restore this backup in place of your current plan? Download your current backup first if you want to keep both.'))return;
    localStorage.setItem('mf_before_restore',JSON.stringify(state));state=normalizeYearState(data.state);degreeState();persistYear();pushIf();
  }catch(e){alert('Could not restore: '+e.message);}finally{input.value='';}
}
function initYear(){
  degreeState();yearReady=true;
  document.body.insertAdjacentHTML('beforeend',`<input id="yearImport" type="file" accept="application/json,.json" hidden onchange="importYearPlan(this)"><dialog class="year-dialog" id="yearCourse" aria-labelledby="ycHeading"><form onsubmit="addYearCourse(event)"><div class="ph"><h2 id="ycHeading">Add course or research</h2><button class="btn" type="button" onclick="document.getElementById('yearCourse').close()" aria-label="Close course form">Close</button></div><div class="year-fields"><label class="year-field">Type<select id="ycKind" onchange="yearKindChanged()"><option value="course">Course / cross-registration</option><option value="independent">Independent study</option><option value="thesis">Thesis allocation</option></select></label><label class="year-field">Count in term<select id="ycTerm"><option value="FALL">Fall 2026</option><option value="IAP">IAP 2027</option><option value="SPRING">Spring 2027</option></select></label><label id="ycStudyWrap" class="year-field" hidden>Grading / subject<select id="ycStudy" onchange="yearKindChanged()"><option value="15.960">15.960 · P/D/F</option><option value="15.961">15.961 · letter graded</option></select></label><label class="year-field">Course code<input id="ycCode" required maxlength="40" placeholder="e.g. HKS-XXX"></label><label class="year-field">Course title<input id="ycTitle" required maxlength="200"></label><label class="year-field">Approved graduate units<input id="ycUnits" type="number" min="0" max="99" step="1" required placeholder="e.g. 6"></label><label class="year-field">Progress<select id="ycOutcome"><option value="planned">Planned</option><option value="completed">Completed with a passing grade</option></select></label></div><label class="year-check"><input id="ycGraduate" type="checkbox" required><span>These are approved graduate units that count toward my SFMBA degree.</span></label><p id="ycInfo" class="year-muted"></p><p id="ycMessage" class="year-alert" role="alert"></p><button type="submit" class="btn year-primary">Add to my degree plan</button></form></dialog>`);
  const steps=[['Degree progress','View completed and planned units for Summer, Fall, IAP and Spring.'],['Confirm completed courses','Mark passing grades in your course record. Planned courses appear separately and are never shown as earned.'],['Choose Spring courses','Search all Spring sections, filter by half or certificate, pick a section and check your weekly schedule.'],['Add research','Enter your approved independent study or thesis units in the correct term. Recitations and repeated sections do not add extra credit.'],['Check the degree rules','Finance waivers and System Dynamics choices adjust the targets. Check your final degree audit in Stellic.']];
  document.getElementById('steps').innerHTML=steps.map(([h,p],i)=>`<div class="step"><div class="n">${i+1}</div><div><h3>${h}</h3><p>${p}</p></div></div>`).join('');
}

// Private year plans use account-scoped local copies and revision-checked cloud writes.
const yearStorageKey=uid=>'muddy_falls_year_v2:'+uid;
const freshYearState=()=>({plan:['15.414'],bids:{},coreSec:'A',hvPat:{},won:[],status:{},custom:{},degree:{}});
function yearSnapshot(){return JSON.parse(JSON.stringify(state));}
function storeYearLocal(){if(yearOwner)localStorage.setItem(yearStorageKey(yearOwner),JSON.stringify({state:yearSnapshot(),revision:yearRevision,dirty:yearDirty}));}
function setYearSyncText(text){yearSyncText=text;const el=document.getElementById('yearSyncStatus');if(el)el.textContent=text;const shared=document.getElementById('sbSyncMsg');if(shared)shared.textContent=text;}
window.yearLocalSave=function(){
  yearDirty=true;storeYearLocal();setYearSyncText(SB&&session?'Saved locally · syncing…':'Saved in this browser');
  clearTimeout(yearTimer);if(yearOwner&&!yearConflict)yearTimer=setTimeout(saveYearCloud,700);
};
function applyYearState(s){state=normalizeYearState(s);state.custom=state.custom||{};state.status=state.status||{};state.bids=state.bids||{};state.hvPat=state.hvPat||{};state.won=state.won||[];degreeState();applyCoreSection();computeHv();localStorage.setItem(KEY,JSON.stringify(state));render();}
syncDown=async function(){
  if(!SB||!session)return;const uid=session.user.id;
  if(yearOwner===uid)return;
  const oldOwner=yearOwner;yearOwner=uid;yearRevision=0;yearConflict=null;
  let local;try{local=JSON.parse(localStorage.getItem(yearStorageKey(uid)));}catch(e){}
  const legacyOwner=localStorage.getItem('mf_legacy_owner');
  let fallback=local?.state||((!oldOwner&&(!legacyOwner||legacyOwner===uid))?yearSnapshot():freshYearState());
  if(!validYearState(fallback))fallback=freshYearState();
  try{
    const {data,error}=await SB.from('mf_degree_plans').select('payload,revision').eq('user_id',uid).maybeSingle();
    if(error)throw error;
    if(data&&validYearState(data.payload)){
      yearRevision=data.revision;
      if(local?.dirty&&local.revision!==data.revision){applyYearState(fallback);yearDirty=true;yearConflict=data;setYearSyncText('Saved locally · choose which version to keep');}
      else if(local?.dirty){applyYearState(fallback);yearDirty=true;await saveYearCloud();}
      else{applyYearState(data.payload);yearDirty=false;setYearSyncText('Private degree plan synced');}
    }else{
      // Merge legacy enrollments when no private year plan exists. Never drop old selections.
      const {data:rows,error:readError}=await SB.from('mf_enrollments').select('course_id,status').eq('user_id',uid);
      if(readError)throw readError;
      applyYearState(fallback);
      for(const row of rows||[]){if(byKey(row.course_id)&&!state.plan.includes(row.course_id))state.plan.push(row.course_id);if(!state.status[row.course_id]&&STATUS[row.status])state.status[row.course_id]=row.status;}
      yearDirty=true;await saveYearCloud();
    }
    localStorage.setItem('mf_legacy_owner',uid);storeYearLocal();render();
  }catch(e){applyYearState(fallback);yearDirty=!!local?.dirty;setYearSyncText('Saved in this browser · cloud unavailable');}
};
async function saveYearCloud(){
  if(!SB||!session||!yearOwner||session.user.id!==yearOwner||yearConflict)return;
  if(yearSaving){clearTimeout(yearTimer);yearTimer=setTimeout(saveYearCloud,800);return;}
  if(!yearDirty)return;
  yearSaving=true;const uid=yearOwner,snapshot=yearSnapshot(),fingerprint=JSON.stringify(snapshot);
  const rows=planned().filter(c=>!c.custom).map(c=>({course_id:c.key,title:c.id+(c.sec||'')+' · '+c.title,half:c.half||'F',sched:JSON.stringify(c.m||[]),status:statusOf(c.key)}));
  try{
    const {data,error}=await SB.rpc('mf_save_year_plan',{plan_payload:snapshot,expected_revision:yearRevision,shared_courses:rows});
    if(error)throw error;if(uid!==yearOwner)return;
    yearRevision=Number(data);yearDirty=JSON.stringify(state)!==fingerprint;storeYearLocal();
    setYearSyncText(yearDirty?'Saved locally · syncing latest changes…':'Private degree plan synced');
    if(yearDirty){clearTimeout(yearTimer);yearTimer=setTimeout(saveYearCloud,400);}
  }catch(e){
    if(uid!==yearOwner)return;
    if((e.message||'').includes('MF_CONFLICT')){
      const result=await SB.from('mf_degree_plans').select('payload,revision').eq('user_id',uid).maybeSingle();yearConflict=result.data||{revision:yearRevision};setYearSyncText('Another saved version needs review');renderYear();
    }else setYearSyncText('Saved locally · cloud sync failed. Your changes are safe in this browser.');
    storeYearLocal();
  }finally{yearSaving=false;}
}
syncUp=async function(){yearDirty=true;storeYearLocal();await saveYearCloud();};
async function resolveYearConflict(keepLocal){
  if(!yearConflict)return;
  if(!keepLocal&&validYearState(yearConflict.payload)){localStorage.setItem('mf_before_cloud_restore',JSON.stringify(state));applyYearState(yearConflict.payload);yearDirty=false;}
  else yearDirty=true;
  yearRevision=yearConflict.revision;yearConflict=null;storeYearLocal();if(yearDirty)await saveYearCloud();else setYearSyncText('Cloud version loaded');render();
}
const originalSignOut=signOut;
signOut=async function(){await saveYearCloud();clearTimeout(yearTimer);await originalSignOut();yearOwner=null;yearRevision=0;yearConflict=null;yearDirty=false;applyYearState(freshYearState());setYearSyncText('Sign in to load your private degree plan');};
window.addEventListener('online',()=>{if(yearDirty)saveYearCloud();});

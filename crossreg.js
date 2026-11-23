/* Spring-only browsing; old course objects remain resolvable for students' Fall history. */
'use strict';
const EXTERNAL={harvard:window.HARVARD_SPRING_COURSES||[],mit:window.MIT_SPRING_COURSES||[]};
const EXTERNAL_IDX=Object.fromEntries([...EXTERNAL.harvard,...EXTERNAL.mit].map(c=>[c.key,c]));
window.CROSSLIST_GROUPS={};
for(const c of EXTERNAL.mit){if(c.creditGroup)for(const id of [c.id,...(c.aliases||c.equivalentIds||[])])window.CROSSLIST_GROUPS[id]=c.creditGroup;}
const baseYearLookup=window.yearLookup;
window.yearLookup=k=>EXTERNAL_IDX[k]||baseYearLookup(k);
const externalFilter={harvard:{q:'',school:'',limit:60},mit:{q:'',department:'',irregular:false,limit:60}};
function externalSelected(key){
  const c=EXTERNAL_IDX[key];if(!c)return;
  state.plan=state.plan.filter(k=>{const old=byKey(k);return !(old?.term==='SPRING'&&old.id===c.id&&k!==key);});
  add(key);
}
function initCrossreg(){
  document.getElementById('tab-harvard').textContent='HKS & HBS · Spring';
  document.getElementById('tab-mit').textContent='MIT · Spring';
  for(const kind of ['harvard','mit']){
    const mit=kind==='mit',courses=EXTERNAL[kind],depts=[...new Set(courses.map(c=>c.department).filter(Boolean))].sort();
    document.getElementById('view-'+kind).classList.add('year-section');
    document.getElementById('view-'+kind).innerHTML=`<div class="panel year-panel"><div class="ph"><div><div class="year-kicker">Spring 2027 · cross-registration</div><h1>${mit?'Explore the rest of MIT.':'Across the river. Into your plan.'}</h1></div><button class="btn" onclick="setTab('spring')">View my Spring plan</button></div><p class="year-muted">${mit?'Graduate Spring offerings from the current MIT subject catalog. The final Spring timetable is not yet published; confirm availability and meeting times with the department.':'Spring offerings at Harvard Kennedy School and Harvard Business School. Admission, instructor consent and school cross-registration rules still apply.'}</p><div class="year-note">${mit?'Irregular offerings are hidden by default. Arranged-unit courses need your approved unit value in My degree.':'Harvard credits are converted to MIT units using the Registrar’s table. HBS: 3 credits = 12 MIT units; HKS: 4 credits = 12 MIT units. Confirm your approved registration and timetable before counting a course as completed.'}</div><div class="spring-filters"><label class="year-field search">Search ${mit?'MIT':'HKS and HBS'} Spring courses<input type="search" id="ext-${kind}-q" placeholder="Course, topic or faculty" oninput="externalFilter.${kind}.q=this.value;externalFilter.${kind}.limit=60;renderExternal('${kind}')"></label>${mit?`<label class="year-field">Department<select onchange="externalFilter.mit.department=this.value;externalFilter.mit.limit=60;renderExternal('mit')"><option value="">All departments</option>${depts.map(d=>`<option value="${attr(d)}">${esc(d)}</option>`).join('')}</select></label>`:`<label class="year-field">School<select onchange="externalFilter.harvard.school=this.value;externalFilter.harvard.limit=60;renderExternal('harvard')"><option value="">HKS and HBS</option><option value="HKS">Harvard Kennedy School</option><option value="HBS">Harvard Business School</option></select></label>`}</div>${mit?'<label class="year-check"><input type="checkbox" onchange="externalFilter.mit.irregular=this.checked;externalFilter.mit.limit=60;renderExternal(\'mit\')">Include irregular offerings (consult the department)</label>':''}<div class="ph"><h2>${mit?'MIT graduate Spring catalog':'Harvard Spring catalog'}</h2><span class="count" id="ext-${kind}-count"></span></div><div id="ext-${kind}-list"></div><div id="ext-${kind}-more" class="year-actions"></div><p class="year-source">${mit?'<a href="https://student.mit.edu/catalog/index.cgi" target="_blank" rel="noopener">MIT Subject Listing</a> · 2026–27 catalog offerings; Spring schedules pending.':'<a href="https://www.hbs.edu/coursecatalog/" target="_blank" rel="noopener">HBS course catalog</a> · <a href="https://www.hks.harvard.edu/courses" target="_blank" rel="noopener">HKS course catalog</a> · <a href="https://registrar.mit.edu/registration-academics/registration-information/cross-registration/harvard/converting-harvard" target="_blank" rel="noopener">MIT credit conversions</a>'} · Checked Nov 22, 2026.</p></div>`;
  }
}
function renderExternal(kind){
  const el=document.getElementById('ext-'+kind+'-list');if(!el)return;
  const f=externalFilter[kind],q=f.q.trim().toLowerCase();
  const courses=EXTERNAL[kind].filter(c=>(!q||(c.id+' '+c.title+' '+(c.fac||'')+' '+(c.department||'')).toLowerCase().includes(q))&&(!f.school||c.school===f.school)&&(!f.department||c.department===f.department)&&(kind!=='mit'||f.irregular||!(c.irregular||c.notOfferedRegularly)));
  document.getElementById('ext-'+kind+'-count').textContent=courses.length+(kind==='harvard'?' sections':courses.length===1?' course':' courses');
  el.innerHTML=courses.slice(0,f.limit).map(c=>{
    const added=state.plan.includes(c.key),irregular=c.irregular||c.notOfferedRegularly;
    return `<article class="spring-course"><div class="spring-top"><div><span class="code">${esc(c.id)}</span> <span class="year-pill">${esc(c.school||c.department||'MIT')}</span> ${irregular?'<span class="year-pill amber">Consult department</span>':''}</div><button class="btn ${added?'':'year-primary'}" aria-label="${added?'Remove':'Add'} ${attr(c.key)}" onclick="${added?'remove':'externalSelected'}('${attr(c.key)}')">${added?'Added ✓':'Add'}</button></div><h3>${esc(c.title)}</h3><div class="meta"><span class="year-pill green">${c.units==null?'Units arranged':c.units+' MIT units'}</span>${c.nativeCredits!=null?`<span class="year-pill">${c.nativeCredits} Harvard credits</span>`:''}${c.period?`<span class="year-pill">${esc(c.period)}</span>`:''}</div><div class="fac">${esc(c.fac||'Faculty to be confirmed')}</div><div class="source-schedule">${esc(c.sched||'Spring meeting times to be confirmed')}</div>${c.note?`<p class="year-muted">${esc(c.note)}</p>`:''}<div class="year-actions">${classmatesButton(c)}</div><a class="year-source" href="${attr(c.sourceUrl)}" target="_blank" rel="noopener">Official course details</a></article>`;
  }).join('')||'<div class="year-empty">No courses match these filters.</div>';
  document.getElementById('ext-'+kind+'-more').innerHTML=courses.length>f.limit?`<button class="btn" onclick="externalFilter.${kind}.limit+=60;renderExternal('${kind}')">Show more courses</button><span class="year-muted">Showing ${f.limit} of ${courses.length}</span>`:'';
}
renderHarvard=function(){if(window.yearActiveTab==='harvard')renderExternal('harvard');};
buildMit=function(){};
renderMit=function(){if(window.yearActiveTab==='mit')renderExternal('mit');};
const baseRenderYear=window.renderYear;
window.renderYear=function(){baseRenderYear();if(['harvard','mit'].includes(window.yearActiveTab))renderExternal(window.yearActiveTab);};

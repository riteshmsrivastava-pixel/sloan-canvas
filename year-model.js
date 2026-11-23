/* Degree arithmetic is independent of the UI and shared enrollment status. */
(function(root){
  'use strict';
  const SUMMER=[
    ['15.024','Applied Economics for Managers',9],['15.060','Data, Models, and Decisions',9],
    ['15.311','Organizational Processes',9],['15.338','Leadership and Teams Lab',6],
    ['15.511','Financial Accounting',9],['15.778','Introduction to Operations Management',9],
    ['15.809','Marketing and Strategy',9]
  ].map(([id,title,units])=>({key:'SUMMER:'+id,id,title,units,term:'SUMMER',core:true,m:[],half:'F'}));
  const TERMS=['SUMMER','FALL','IAP','SPRING'];
  const SPLIT={'15.389':{FALL:9,IAP:3},'15.777':{FALL:9,IAP:6},'15.830':{FALL:6,IAP:3},'15.453':{IAP:6,SPRING:6},'15.786':{IAP:3,SPRING:6}};
  const number=v=>Number.isFinite(Number(v))&&Number(v)>=0?Number(v):0;
  function requirements(settings={}){
    const longCore=settings.sdOption==='15.873';
    return {total:longCore?174:171,core:(longCore?78:75)-(settings.finWaiver?9:0),elective:settings.finWaiver?105:96,maxElective:129};
  }
  function calculate(records,settings={}){
    const target=requirements(settings),warnings=[],byTerm=Object.fromEntries(TERMS.map(t=>[t,{earned:0,planned:0,core:0,elective:0}]));
    const out=records.map(r=>({...r,credit:0,reason:''}));
    const priority={completed:0,planned:1,unconfirmed:2,waitlist:3,excluded:4};
    const seen=new Set(),independent={},thesisTerms=new Set();let thesisUnits=0;
    let earned=0,projected=0,coreEarned=0,coreProjected=0,electiveEarned=0,electiveProjected=0;
    const sorted=[...out].sort((a,b)=>(priority[a.outcome]??5)-(priority[b.outcome]??5)||TERMS.indexOf(a.term)-TERMS.indexOf(b.term));
    for(const r of sorted){
      if(!['completed','planned'].includes(r.outcome)){r.reason=r.outcome==='waitlist'?'Waitlist · not counted':r.outcome==='unconfirmed'?'Confirm a passing grade':'Not counted';continue;}
      if(r.component||r.nonCredit){r.reason='No additional credit';continue;}
      if(r.graduate===false){r.reason='Not graduate credit';continue;}
      if(r.units==null){r.reason='Set approved units';warnings.push(r.id+': approved units are still needed.');continue;}
      let units=number(r.units);
      if(!units){r.reason='0 units';continue;}
      const isStudy=['15.960','15.961'].includes(r.id)||r.kind==='independent';
      const isThesis=r.id==='15.THG'||r.kind==='thesis';
      const split=SPLIT[r.id]&&SPLIT[r.id][r.term];
      const identity=(isStudy||isThesis||split)?r.id+':'+r.term:(r.creditGroup||r.id).trim().toUpperCase();
      if(seen.has(identity)){r.reason='Duplicate subject · counted once';warnings.push(r.id+': another section or term is already counted.');continue;}
      seen.add(identity);
      if(split)units=Math.min(units,split);
      if(isStudy){const used=independent[r.term]||0;if(used+units>12){warnings.push(r.term+': independent study exceeds 12 units; only 12 counted.');units=Math.max(0,12-used);}independent[r.term]=used+units;}
      if(isThesis){if(thesisUnits+units>24){warnings.push('Thesis allocations exceed 24 units; only 24 counted.');units=Math.max(0,24-thesisUnits);}thesisUnits+=units;if(units)thesisTerms.add(r.term);}
      r.credit=units;r.reason=units<number(r.units)?'Counted '+units+' of '+r.units+' units':'';
      const term=byTerm[r.term];if(!term)continue;
      projected+=units;term[r.core?'core':'elective']+=units;
      if(r.core)coreProjected+=units;else electiveProjected+=units;
      if(r.outcome==='completed'){earned+=units;term.earned+=units;if(r.core)coreEarned+=units;else electiveEarned+=units;}
      else term.planned+=units;
    }
    if(thesisUnits&&thesisTerms.size<2)warnings.push('A thesis must span at least two terms. Confirm your proposal and timeline with SES.');
    if(electiveProjected>129)warnings.push('Your plan exceeds the 129-unit graduate elective maximum.');
    if(byTerm.FALL.core+byTerm.FALL.elective>66)warnings.push('Your Fall plan exceeds 66 total units.');
    if(byTerm.IAP.earned+byTerm.IAP.planned>12)warnings.push('Your IAP plan exceeds the 12-unit limit, including lab continuations.');
    const thesisRequired=['SM','MOT'].includes(settings.degree);
    if(thesisRequired&&thesisUnits<24)warnings.push(settings.degree+' requires a completed Sloan thesis; your plan currently allocates '+thesisUnits+' of 24 thesis units.');
    const coreRemaining=out.filter(r=>r.core&&r.outcome!=='completed');
    const remaining=Math.max(0,target.total-earned),gap=Math.max(0,target.total-projected,target.elective-electiveProjected,target.core-coreProjected);
    return {target,records:out,byTerm,earned,projected,planned:projected-earned,coreEarned,coreProjected,electiveEarned,electiveProjected,remaining,gap,coreRemaining,thesisUnits,thesisTerms:[...thesisTerms],warnings:[...new Set(warnings)],unitTargetMet:earned>=target.total&&coreEarned>=target.core&&electiveEarned>=target.elective&&electiveProjected<=129&&coreRemaining.length===0};
  }
  function conflicts(courses,half='all'){
    const active=courses.filter(c=>c.outcome!=='excluded'&&c.m?.length&&(half==='all'||c.half==='F'||c.half===half));
    const pairs=[];
    for(let i=0;i<active.length;i++)for(let j=i+1;j<active.length;j++){
      const a=active[i],b=active[j];if(a.term!==b.term)continue;
      if(a.half!=='F'&&b.half!=='F'&&a.half!==b.half)continue;
      if(a.m.some(([d,s,e])=>b.m.some(([dd,ss,ee])=>d===dd&&s<ee&&ss<e)))pairs.push([a.key,b.key]);
    }
    return pairs;
  }
  const api={SUMMER,TERMS,SPLIT,requirements,calculate,conflicts};
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.DegreePlan=api;
})(typeof window!=='undefined'?window:globalThis);

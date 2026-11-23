const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const Y=require('./year-model.js');
const c=(id,units,term='FALL',extra={})=>({key:id+term,id,units,term,graduate:true,outcome:'planned',...extra});
test('official targets: standard, waiver and longer System Dynamics',()=>{assert.deepEqual(Y.requirements(),{total:171,core:75,elective:96,maxElective:129});assert.deepEqual(Y.requirements({finWaiver:true,sdOption:'15.873'}),{total:174,core:69,elective:105,maxElective:129});});
test('planned and waitlist credits are never earned',()=>{const t=Y.calculate([c('A',9,'FALL',{outcome:'completed'}),c('B',6),c('C',12,'SPRING',{outcome:'waitlist'}),c('D',9,'IAP',{outcome:'excluded'})]);assert.equal(t.earned,9);assert.equal(t.projected,15);assert.equal(t.gap,156);});
test('Summer must be explicitly confirmed; passing core totals 60',()=>{assert.equal(Y.calculate(Y.SUMMER.map(c=>({...c,outcome:'unconfirmed'}))).earned,0);assert.equal(Y.calculate(Y.SUMMER.map(c=>({...c,outcome:'completed'}))).coreEarned,60);});
test('duplicates across sections and terms only count once, completed first',()=>{const t=Y.calculate([c('15.071',12,'SPRING'),c('15.071',12,'FALL',{outcome:'completed'}),c('15.071',12,'SPRING',{key:'other-section'})]);assert.equal(t.projected,12);assert.equal(t.earned,12);assert.equal(t.byTerm.SPRING.planned,0);});
test('recitations, undergraduate and unknown units do not inflate totals',()=>{const t=Y.calculate([c('A',12,'SPRING',{component:true}),c('B',9,'SPRING',{graduate:false}),c('C',null)]);assert.equal(t.projected,0);assert.ok(t.warnings.some(x=>x.includes('approved units')));});
test('split Fall/IAP labs add only their correct allocation',()=>{const t=Y.calculate([c('15.777',9),c('15.777',6,'IAP')]);assert.equal(t.projected,15);});
test('independent study limited to 12 per term but counted across terms',()=>{const t=Y.calculate([c('15.960',9),c('15.961',6),c('15.961',6,'IAP'),c('15.960',12,'SPRING')]);assert.equal(t.byTerm.FALL.planned,12);assert.equal(t.projected,30);assert.ok(t.warnings.some(x=>x.includes('independent study')));});
test('thesis spans multiple terms, with a 24-unit total cap',()=>{const t=Y.calculate([c('15.THG',12,'FALL'),c('15.THG',15,'SPRING')],{degree:'SM'});assert.equal(t.thesisUnits,24);assert.equal(t.projected,24);assert.equal(t.thesisTerms.length,2);assert.ok(Y.calculate([c('15.THG',24,'SPRING')]).warnings.some(x=>x.includes('two terms')));});
test('H3 and H4 do not conflict; full-term courses overlap both',()=>{const m=[['M',600,690]],courses=[c('A',6,'SPRING',{half:'H3',m}),c('B',6,'SPRING',{half:'H4',m}),c('C',9,'SPRING',{half:'F',m}),c('D',9,'FALL',{half:'F',m})];assert.equal(Y.conflicts(courses).length,2);assert.equal(Y.conflicts(courses,'H3').length,1);});
test('earned 171 alone is insufficient without required core',()=>{const t=Y.calculate([c('X',171,'FALL',{outcome:'completed'})]);assert.equal(t.unitTargetMet,false);});
test('all 294 source sections load without credit-bearing components',()=>{const ctx={window:{}};vm.runInNewContext(fs.readFileSync(require.resolve('./spring-data.js'),'utf8'),ctx);const cs=ctx.window.SPRING_COURSES;assert.equal(cs.length,294);assert.equal(new Set(cs.map(c=>c.key)).size,294);assert.equal(cs.filter(c=>c.component&&c.units>0).length,0);assert.ok(cs.some(c=>c.id==='15.871'&&c.sec==='C'));});
function appContext(){
  const html=fs.readFileSync(__dirname+'/index.html','utf8');
  const main=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]).find(s=>s.includes('const COURSES='));
  const storage=new Map([['sloanCanvas_fall_v1',JSON.stringify({plan:['15.414','IAP:15.960'],bids:{},won:[],custom:{},status:{}})]]);
  const ctx={console,document:{addEventListener:()=>{}},crypto:require('node:crypto').webcrypto,setTimeout,clearTimeout,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},addEventListener:()=>{}};ctx.window=ctx;vm.createContext(ctx);
  vm.runInContext(main,ctx);
  for(const file of ['spring-data.js','year-model.js','year.js','mit-spring-data.js','harvard-spring-data.js','crossreg.js','email-auth.js'])vm.runInContext(fs.readFileSync(__dirname+'/'+file,'utf8'),ctx,{filename:file});
  return ctx;
}
test('application restores legacy plans and resolves all new catalog keys',async()=>{
  const ctx=appContext();
  assert.equal(vm.runInContext('state.plan.length',ctx),2);
  assert.equal(vm.runInContext("byKey('SPRING:15.281·A').units",ctx),9);
  assert.equal(vm.runInContext('degreeTotals().earned',ctx),0);
  assert.equal(vm.runInContext('degreeTotals().target.total',ctx),171);
  assert.equal(vm.runInContext('Object.values(EXTERNAL_IDX).filter(c=>!byKey(c.key)).length',ctx),0);
  assert.equal(vm.runInContext('Object.values(EXTERNAL_IDX).filter(c=>c.term!=="SPRING").length',ctx),0);
  assert.equal(vm.runInContext("Object.values(SPRING_IDX).filter(c=>c.id==='15.786'&&!c.component).every(c=>c.units===6)",ctx),true);
  assert.equal(vm.runInContext("IAP_IDX['IAP:15.089'].cal.filter(s=>s.dom.includes(5)).map(s=>s.s+'-'+s.e).join(',')",ctx),'690-780,960-1080');
  const modal={classList:{add(){},contains(){return true;}}},box={innerHTML:''};
  ctx.document.getElementById=id=>id==='matesModal'?modal:box;
  vm.runInContext("session={user:{id:'me'}};roster={'IAP:15.453':[{uid:'iap-person',name:'IAP <peer>',status:'enrolled'}]};",ctx);
  await vm.runInContext("showClassmates('IAP:15.453')",ctx);
  assert.ok(box.innerHTML.includes('IAP &lt;peer&gt;'));
  assert.ok(box.innerHTML.includes('Enrolled'));
  assert.ok(box.innerHTML.includes('IAP 2027'));
  await vm.runInContext("showClassmates(Object.values(SPRING_IDX).find(c=>c.id==='15.453'&&!c.component).key)",ctx);
  assert.ok(box.innerHTML.includes('Spring 2027'));
  assert.ok(box.innerHTML.includes('No classmates here yet'));
  assert.ok(!box.innerHTML.includes('IAP &lt;peer&gt;'));

  // Fall additions are completed records; split labs use only the Fall units.
  box.value='15.777';
  vm.runInContext('persistYear=()=>{};pushIf=()=>{};addFallCompleted();addFallCompleted();',ctx);
  assert.equal(vm.runInContext("state.plan.filter(k=>k==='15.777').length",ctx),1);
  assert.equal(vm.runInContext("degreeState().outcomes['15.777']",ctx),'completed');
  assert.equal(vm.runInContext('degreeTotals().byTerm.FALL.earned',ctx),9);
  assert.ok(vm.runInContext("state.plan.includes('IAP:15.960')",ctx));
  assert.equal(vm.runInContext("fallChoices().some(c=>c.id==='15.777')",ctx),false);
  vm.runInContext('renderFall()',ctx);
  assert.ok(box.innerHTML.includes('Fall course record'));
  assert.ok(box.innerHTML.includes('Add completed course'));
  assert.ok(!box.innerHTML.includes('Weekly Schedule'));

});

test('IAP and Spring lab portions each count, without duplicated full-course units',()=>{const t=Y.calculate([c('15.453',6,'IAP'),c('15.453',12,'SPRING'),c('15.786',3,'IAP'),c('15.786',9,'SPRING')]);assert.equal(t.projected,21);assert.equal(t.byTerm.IAP.planned,9);assert.equal(t.byTerm.SPRING.planned,12);});

test('Fall lab continuations load from old plans, stay planned and respect removals',()=>{
  const ctx=appContext();
  vm.runInContext("state={plan:['15.389','15.830'],custom:{},bids:{},status:{},degree:{outcomes:{'15.389':'completed','15.830':'completed'}}};save=()=>{};render=()=>{};pushIf=()=>{};",ctx);
  assert.equal(vm.runInContext('degreeTotals().byTerm.FALL.earned',ctx),15);
  assert.equal(vm.runInContext('degreeTotals().byTerm.IAP.planned',ctx),6);
  assert.equal(vm.runInContext('degreeTotals().byTerm.IAP.earned',ctx),0);
  assert.equal(vm.runInContext('state.plan.length',ctx),2); // no destructive saved-plan migration
  vm.runInContext("add('IAP:15.389');",ctx);
  assert.equal(vm.runInContext('degreeTotals().byTerm.IAP.planned',ctx),6); // no duplicate
  vm.runInContext("remove('IAP:15.830');state=normalizeYearState(JSON.parse(JSON.stringify(state)));",ctx);
  assert.equal(vm.runInContext('degreeTotals().byTerm.IAP.planned',ctx),3);
  vm.runInContext("add('IAP:15.830');degreeState().outcomes['IAP:15.830']='completed';",ctx);
  assert.equal(vm.runInContext('degreeTotals().byTerm.IAP.earned',ctx),3);
  vm.runInContext("remove('15.389');",ctx);
  assert.equal(vm.runInContext("planned().filter(c=>c.key==='IAP:15.389').length",ctx),1); // explicit IAP preserved
  vm.runInContext("state.plan=['15.389'];state.degree={outcomes:{'15.389':'waitlist'}};",ctx);
  assert.equal(vm.runInContext('degreeTotals().byTerm.IAP.planned',ctx),0);
  vm.runInContext("degreeState().outcomes['15.389']='completed';remove('15.389');",ctx);
  assert.equal(vm.runInContext("planned().filter(c=>c.term==='IAP').length",ctx),0);
});

test('Spring core is counted once before and after C/D assignment',()=>{
  const ctx=appContext(),box={innerHTML:''};ctx.document.getElementById=()=>box;
  vm.runInContext("state={plan:[],custom:{},bids:{},status:{}};persistYear=()=>{};pushIf=()=>{};",ctx);
  assert.equal(vm.runInContext('degreeTotals().byTerm.SPRING.planned',ctx),6);
  const core=vm.runInContext('springCoreHTML()',ctx);
  assert.equal((core.match(/<option/g)||[]).length,3); // unassigned plus C and D
  assert.ok(core.includes('Hazhir Rahmandad'));
  vm.runInContext("setSpringCore('SPRING:15.871·C')",ctx);
  assert.equal(vm.runInContext('degreeTotals().byTerm.SPRING.planned',ctx),6);
  vm.runInContext("setSpringCore('SPRING:15.871·D')",ctx);
  assert.equal(vm.runInContext("state.plan.join(',')",ctx),'SPRING:15.871·D');
  assert.equal(vm.runInContext('degreeTotals().byTerm.SPRING.planned',ctx),6);
  assert.equal(vm.runInContext("yearRecords().find(c=>c.id==='15.871').m[0][1]",ctx),780);
  vm.runInContext("setSpringCore('SPRING:15.871·A')",ctx);
  assert.equal(vm.runInContext("state.plan.join(',')",ctx),'SPRING:15.871·D');
  vm.runInContext("springFilter.q='15.871';renderSpringResults();",ctx);
  assert.ok(box.innerHTML.includes('Add 15.871 C'));
  assert.ok(!box.innerHTML.includes('Add 15.871 A'));
  assert.ok(!box.innerHTML.includes('Add 15.871 B'));
});

test('IAP limit includes lab portions without discarding graduation credit',()=>{
  const t=Y.calculate([c('15.389',3,'IAP'),c('15.830',3,'IAP'),c('15.675',6,'IAP'),c('15.960',3,'IAP')]);
  assert.equal(t.byTerm.IAP.planned,15);
  assert.ok(t.warnings.some(w=>w.includes('12-unit limit')));
});

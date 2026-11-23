const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function setup(){
  const nodes=new Map();const node=id=>nodes.get(id)||nodes.set(id,{value:'',textContent:'',innerHTML:'',style:{}}).get(id);
  const calls=[];let profile={id:'existing-user',name:'Existing Name'};
  const ctx={setTimeout,clearTimeout,console,location:{href:'https://example.test/'},document:{getElementById:node,querySelectorAll:()=>[]},localStorage:{getItem:()=>true},
    SB:{auth:{signInWithOtp:async args=>{calls.push(['send',args]);return{error:null};},verifyOtp:async args=>{calls.push(['verify',args]);return{data:{session:{user:{id:'existing-user',email:ctx.pendingEmail}}}};},signOut:async()=>{}},from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:profile})})})})},
    session:null,myProfile:null,authView:'email',pendingEmail:null,pendingName:null,
    escH:s=>s.replace(/[<&"]/g,c=>({'<':'&lt;','&':'&amp;','"':'&quot;'}[c])),isBlocked:async email=>email==='excluded@mit.edu',
    amsg:(text)=>calls.push(['message',text]),updateAcct(){},syncDown:async()=>calls.push(['sync']),loadRoster:async()=>{},loadReviews:async()=>{},render(){},renderCommunity(){},openHelp(){}};
  vm.createContext(ctx);vm.runInContext(fs.readFileSync(__dirname+'/email-auth.js','utf8'),ctx);
  return {ctx,node,calls,run:expr=>vm.runInContext(expr,ctx),setProfile:p=>{profile=p;}};
}
test('passwordless gate exposes email and no password controls',()=>{const t=setup();t.run('renderGate()');assert.match(t.node('authgateBody').innerHTML,/Email me a code/);assert.ok(!t.node('authgateBody').innerHTML.includes('type="password"'));});
test('invalid and excluded emails never request a code',async()=>{for(const email of ['outsider@example.com','excluded@mit.edu']){const t=setup();t.node('otpEmail').value=email;await t.run('requestEmailCode()');assert.ok(!t.calls.some(x=>x[0]==='send'));}});
test('email is normalized and rapid resend is blocked',async()=>{const t=setup();t.node('otpEmail').value=' PERSON@MIT.EDU ';await t.run('requestEmailCode()');assert.equal(t.calls.find(x=>x[0]==='send')[1].email,'person@mit.edu');assert.equal(t.ctx.authView,'verify');await t.run('resendCode()');assert.equal(t.calls.filter(x=>x[0]==='send').length,1);t.run('clearTimeout(authTimer)');});
test('verification retains the existing account and name',async()=>{const t=setup();t.ctx.pendingEmail='person@mit.edu';t.node('vCode').value='12345678';await t.run('doVerify()');assert.equal(t.ctx.session.user.id,'existing-user');assert.equal(t.ctx.myProfile.name,'Existing Name');assert.equal(t.calls.find(x=>x[0]==='verify')[1].type,'email');assert.ok(t.calls.some(x=>x[0]==='sync'));});
test('verified new members are asked for a name',async()=>{const t=setup();t.setProfile(null);t.ctx.session={user:{id:'new-user',email:'person@mit.edu'}};await t.run('onAuth()');assert.equal(t.ctx.authView,'profile');assert.equal(t.run('profileRequired'),true);assert.ok(!t.calls.some(x=>x[0]==='sync'));});
test('server failures do not blame a valid email code',async()=>{const t=setup();t.ctx.pendingEmail='person@mit.edu';t.node('vCode').value='12345678';t.ctx.SB.auth.verifyOtp=async()=>({error:{status:500},data:{}});await t.run('doVerify()');assert.match(t.calls.at(-1)[1],/temporarily unavailable/);});

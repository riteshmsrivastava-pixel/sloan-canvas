/* Passwordless email sign-in. The server's signup and mail hooks enforce eligibility. */
'use strict';
let authBusy=false,profileRequired=false,authEmailDraft='',authRetryAt=0,authTimer=null,authLoadPromise=null;
const emailPattern=/^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@mit\.edu$/i;
function normalizedEmail(value){return String(value||'').trim().toLowerCase();}
function authError(error){
  if(/rate|too many|after \d+ seconds/i.test(error?.message||''))return 'Please wait a minute before requesting another code.';
  return 'We could not send a code. Check your approved MIT email and try again.';
}
function setAuthBusy(value){authBusy=value;document.querySelectorAll('#authgateBody button,#authgateBody input').forEach(el=>el.disabled=value);updateResend();}
function updateResend(){
  const button=document.getElementById('resendOtp');if(!button)return;
  const seconds=Math.max(0,Math.ceil((authRetryAt-Date.now())/1000));
  button.disabled=authBusy||seconds>0;button.textContent=seconds?'Resend in '+seconds+'s':'Resend code';
  clearTimeout(authTimer);if(seconds)authTimer=setTimeout(updateResend,1000);
}
function changeAuthEmail(){if(authBusy)return;authView='email';pendingEmail=null;renderGate();}
async function emailAllowed(email){
  return Boolean(SB&&emailPattern.test(email)&&!await isBlocked(email));
}
async function requestEmailCode(event,resend=false){
  event?.preventDefault();if(authBusy||!SB)return;
  const email=normalizedEmail(resend?pendingEmail:document.getElementById('otpEmail')?.value);
  authEmailDraft=email;
  if(!emailPattern.test(email)){amsg('Enter your approved @mit.edu email address.');return;}
  if(resend&&Date.now()<authRetryAt){updateResend();return;}
  setAuthBusy(true);amsg('Sending your code…',true);
  try{
    if(!await emailAllowed(email)){amsg('This email is not on the approved cohort list.');return;}
    const {error}=await SB.auth.signInWithOtp({email,options:{shouldCreateUser:true,emailRedirectTo:location.href.split(/[?#]/)[0]}});
    if(error)throw error;
    pendingEmail=email;authRetryAt=Date.now()+60000;authView='verify';renderGate();
  }catch(error){amsg(authError(error));}
  finally{setAuthBusy(false);}
}
async function doVerify(event){
  event?.preventDefault();if(authBusy||!SB||!pendingEmail)return;
  const email=pendingEmail,token=String(document.getElementById('vCode')?.value||'').replace(/\s/g,'');
  if(!/^\d{6,10}$/.test(token)){amsg('Enter the numeric code from your email.');return;}
  setAuthBusy(true);amsg('Checking your code…',true);
  try{
    if(!await emailAllowed(email)){amsg('This email is not on the approved cohort list.');return;}
    const {data,error}=await SB.auth.verifyOtp({email,token,type:'email'});
    if(error){
      amsg(error.status>=500
        ?'Sign-in is temporarily unavailable. Keep your code and try again in a moment.'
        :error.status===429
          ?'Too many attempts. Please wait a minute before trying again.'
          :'That code is invalid or expired. Try the latest code or request a new one.');
      return;
    }
    session=data.session;await onAuth();
  }catch(error){amsg('Could not verify the code. Please try again.');}
  finally{setAuthBusy(false);}
}
async function resendCode(){return requestEmailCode(null,true);}
async function onAuth(){
  if(authLoadPromise)return authLoadPromise;
  authLoadPromise=loadAuthenticatedProfile();
  try{return await authLoadPromise;}finally{authLoadPromise=null;}
}
async function loadAuthenticatedProfile(){
  if(!SB)return;
  if(!session){myProfile=null;profileRequired=false;authView=pendingEmail?'verify':'email';updateAcct();renderCommunity();return;}
  const uid=session.user.id,email=normalizedEmail(session.user.email);
  if(await isBlocked(email)){await SB.auth.signOut();session=null;myProfile=null;profileRequired=false;renderCommunity();return;}
  let result;
  try{result=await SB.from('mf_profiles').select('*').eq('id',uid).maybeSingle();}
  catch(error){profileRequired=true;authView='load-error';renderCommunity();return;}
  if(!session||session.user.id!==uid)return;
  if(result.error){profileRequired=true;authView='load-error';renderCommunity();return;}
  if(!result.data?.name){myProfile=result.data;profileRequired=true;authView='profile';renderCommunity();return;}
  myProfile=result.data;profileRequired=false;pendingEmail=null;pendingName=null;authView='email';clearTimeout(authTimer);updateAcct();
  await syncDown();await loadRoster();await loadReviews();render();renderCommunity();
  if(!localStorage.getItem('mf_seen'))setTimeout(openHelp,600);
}
async function createOtpProfile(event){
  event?.preventDefault();if(authBusy||!SB||!session)return;
  const name=String(document.getElementById('otpName')?.value||'').trim();
  if(name.length<2||name.length>100){amsg('Enter your full name (2–100 characters).');return;}
  const uid=session.user.id,email=normalizedEmail(session.user.email);setAuthBusy(true);
  try{
    if(!await emailAllowed(email)){amsg('This email is not on the approved cohort list.');return;}
    const {error}=myProfile
      ?await SB.from('mf_profiles').update({name}).eq('id',uid).or('name.is.null,name.eq.')
      :await SB.from('mf_profiles').upsert({id:uid,email,name},{onConflict:'id',ignoreDuplicates:true});
    if(error)throw error;
    await onAuth();
  }catch(error){amsg('Could not save your profile. Please try again.');}
  finally{setAuthBusy(false);}
}
function renderGate(){
  const body=document.getElementById('authgateBody');if(!body)return;clearTimeout(authTimer);
  const message='<div id="sbMsg" role="status" aria-live="polite" style="font-size:13px;margin-top:14px"></div>';
  if(authView==='load-error'&&session){
    body.innerHTML='<h1 style="font-size:25px;margin:22px 0 10px">Unable to load profile</h1><p class="year-muted">We could not load it right now. Please try again.</p><button class="btn year-primary" onclick="onAuth()">Retry</button><button class="text-button" onclick="signOut()">Sign out</button>';return;
  }
  if(authView==='profile'&&session){
    body.innerHTML=`<h1 style="font-size:25px;margin:22px 0 10px">Create profile</h1><p class="year-muted">Your MIT email is verified. Enter your full name for your profile.</p><form onsubmit="createOtpProfile(event)" class="year-stack"><label class="year-field">Full name<input id="otpName" class="inp" autocomplete="name" maxlength="100" required></label><button class="btn year-primary" type="submit">Create my profile</button></form>${message}<button class="text-button" style="margin-top:14px" onclick="signOut()">Use a different account</button>`;return;
  }
  if(authView==='verify'&&pendingEmail){
    body.innerHTML=`<h1 style="font-size:25px;margin:22px 0 10px">Enter email code</h1><p class="year-muted">Enter the one-time code sent to <b>${escH(pendingEmail)}</b>. It expires in 10 minutes.</p><form onsubmit="doVerify(event)" class="year-stack"><label class="year-field">Email code<input id="vCode" class="inp" type="text" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9 ]{6,12}" maxlength="12" placeholder="Enter your code" required style="font-size:25px;letter-spacing:5px"></label><button class="btn year-primary" type="submit">Verify &amp; sign in</button></form><div class="year-actions"><button class="btn" id="resendOtp" type="button" onclick="resendCode()">Resend code</button><button class="text-button" type="button" onclick="changeAuthEmail()">Change email</button></div><p class="year-muted" style="margin-top:14px">Check spam or junk if it hasn’t arrived. Use the newest code and keep this page open.</p>${message}`;updateResend();return;
  }
  body.innerHTML=`<h1 style="font-size:25px;margin:22px 0 10px">Sign in</h1><p class="year-muted">Enter your approved MIT email to receive a one-time sign-in code.</p><form onsubmit="requestEmailCode(event)" class="year-stack"><label class="year-field">MIT email address<input id="otpEmail" class="inp" type="email" autocomplete="email" placeholder="you@mit.edu" value="${escH(authEmailDraft)}" required></label><button class="btn year-primary" type="submit" ${SB?'':'disabled'}>Email me a code</button></form><p class="year-muted" style="margin-top:16px">Access is limited to the approved Sloan Fellows ’27 email list.</p>${message}`;
}

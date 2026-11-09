'use client';
import {useEffect,useRef,type Dispatch,type SetStateAction} from 'react';
import {KeyRound,MessageCircle,ShieldCheck,Sparkles} from 'lucide-react';
import {Field} from './widgets';
import {schoolAPI} from '@/lib/production';
import './login.css';

type Props={installed:boolean;error:string;busy:boolean;form:any;setForm:Dispatch<SetStateAction<any>>;captcha:number;setCaptcha:Dispatch<SetStateAction<number>>;smsLogin:any;otpSent:boolean;setOtpSent:Dispatch<SetStateAction<boolean>>;loginMode:'password'|'sms';setLoginMode:Dispatch<SetStateAction<'password'|'sms'>>;run:(fn:()=>Promise<void>)=>Promise<void>;apply:(value:any)=>void};
const digits=(value:string)=>value.replace(/[۰-۹]/g,c=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c))).replace(/[٠-٩]/g,c=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(c)));
const numberInput=(value:string)=>digits(value).replace(/\D/g,'').slice(0,13);
const iranPhone=(value:string)=>{let phone=digits(value).replace(/\D/g,'');if(phone.startsWith('0098')&&phone.length===14)phone='0'+phone.slice(4);else if(phone.startsWith('98')&&phone.length===12)phone='0'+phone.slice(2);else if(phone.startsWith('9')&&phone.length===10)phone='0'+phone;return phone};

export function LoginScreen({installed,error,busy,form,setForm,captcha,setCaptcha,smsLogin,otpSent,setOtpSent,loginMode,setLoginMode,run,apply}:Props){
 const submittedCode=useRef('');
 const codeLength=Number(smsLogin.otpCodeLength||6);
 const phone=iranPhone(String(form.phone||''));
 const submitCode=(code:string,force=false)=>{if(!force&&submittedCode.current===code)return;submittedCode.current=code;void run(async()=>{apply(await schoolAPI('otp_login',{phone:iranPhone(String(form.phone||'')),code}));setForm({})})};
 useEffect(()=>{
  if(!otpSent||loginMode!=='sms')return;
  const code=numberInput(String(form.otp||'')).slice(0,codeLength);
  if(code!==String(form.otp||''))setForm((current:any)=>({...current,otp:code}));
  if(code.length!==codeLength||submittedCode.current===code)return;
  submitCode(code);
 },[form.otp,form.phone,otpSent,loginMode,codeLength,phone]);
 useEffect(()=>{
  if(!otpSent||loginMode!=='sms'||!('OTPCredential' in window)||!navigator.credentials?.get)return;
  const controller=new AbortController();
  void navigator.credentials.get({otp:{transport:['sms']},signal:controller.signal} as any).then((credential:any)=>{if(credential?.code)setForm((current:any)=>({...current,otp:numberInput(credential.code).slice(0,codeLength)}))}).catch(()=>{});
  return()=>controller.abort();
 },[otpSent,loginMode,codeLength]);
 const refreshCaptcha=()=>setCaptcha(value=>value+1);
 const requestOtp=()=>void run(async()=>{const normalized=iranPhone(String(form.phone||''));if(!/^09\d{9}$/.test(normalized))throw Error('شماره همراه ۱۰ یا ۱۱ رقمی معتبر وارد کنید.');setForm((current:any)=>({...current,phone:normalized,otp:''}));submittedCode.current='';const result=await schoolAPI('otp_request',{phone:normalized,captcha:numberInput(String(form.captcha||''))});setOtpSent(true);setCaptcha(value=>value+1)});
 if(!installed)return <div className="auth-shell" dir="rtl"><section className="auth-card stack"><div className="auth-heading"><h1>دفتر کلاسی من</h1><p>ورود امن به سامانه مدرسه</p></div><p>نصب اولیه هنوز انجام نشده است.</p><a className="btn primary" href="./install.php">شروع نصب آسان</a><small>طراحی: سعید آذرمهر</small></section></div>;
 return <div className="auth-shell login-shell" dir="rtl"><section className="auth-card login-card stack">
  <div className="login-brand-mark"><span><KeyRound size={24}/></span><i><Sparkles size={15}/></i></div>
  <div className="auth-heading"><h1>دفتر کلاسی من</h1><p>ورود امن و سریع به سامانه مدرسه</p></div>
  <div className="login-trust-note"><ShieldCheck size={16}/><span>اطلاعات ورود شما با اتصال امن محافظت می‌شود</span></div>
  {error&&<div className="error" role="alert">{error}</div>}
  <div className="auth-mode-tabs" role="tablist" aria-label="روش ورود">
   {smsLogin.otpEnabled&&<button type="button" role="tab" aria-selected={loginMode==='sms'} className={loginMode==='sms'?'active sms':''} onClick={()=>{setLoginMode('sms');setOtpSent(false);submittedCode.current=''}}><b><MessageCircle size={16}/> ورود پیامکی</b><small>کد یک‌بارمصرف</small></button>}
   <button type="button" role="tab" aria-selected={loginMode==='password'} className={loginMode==='password'?'active':''} onClick={()=>{setLoginMode('password');setOtpSent(false)}}><b><KeyRound size={16}/> نام کاربری و رمز</b><small>ورود معمولی</small></button>
  </div>
  {loginMode==='password'||!smsLogin.otpEnabled?<form className="stack auth-method-panel" onSubmit={e=>{e.preventDefault();void run(async()=>{try{apply(await schoolAPI('login',form));setForm({})}finally{refreshCaptcha()}})}}>
   <Field label="نام کاربری یا ایمیل"><input required autoComplete="username" dir="ltr" maxLength={190} value={form.email||''} onChange={e=>setForm({...form,email:e.target.value})}/></Field>
   <Field label="رمز عبور"><input required type="password" autoComplete="current-password" maxLength={72} value={form.password||''} onChange={e=>setForm({...form,password:e.target.value})}/></Field>
   <div className="auth-captcha"><img src={'./school-api.php?action=captcha&v='+captcha} width={240} height={76} alt="کد امنیتی تصویری"/><button type="button" className="text-link" onClick={refreshCaptcha}>تصویر تازه</button></div>
   <Field label="کد امنیتی تصویر"><input required dir="ltr" autoComplete="off" inputMode="numeric" pattern="[0-9۰-۹٠-٩]*" maxLength={4} value={form.captcha||''} onChange={e=>setForm({...form,captcha:numberInput(e.target.value).slice(0,4)})}/></Field>
   <label className="remember-login"><input type="checkbox" checked={!!form.remember} onChange={e=>setForm({...form,remember:e.target.checked})}/> این دستگاه را ۳۰ روز به خاطر بسپار</label>
   <button className="btn primary" disabled={busy}>{busy?'در حال بررسی…':'ورود به سامانه'}</button><p className="auth-help">اگر رمز را فراموش کرده‌اید، از مدیر مدرسه درخواست بازنشانی حساب کنید.</p>
  </form>:<section className="sms-login-box stack auth-method-panel">
   {!otpSent?<><Field label="شماره همراه حساب"><input inputMode="tel" autoComplete="tel" dir="ltr" placeholder="۰۹۱۲۳۴۵۶۷۸۹ یا ۹۱۲۳۴۵۶۷۸۹" value={form.phone||''} onChange={e=>setForm({...form,phone:numberInput(e.target.value)})} onBlur={()=>setForm((current:any)=>({...current,phone:iranPhone(String(current.phone||''))}))}/><small className="phone-format-hint">ارقام فارسی و انگلیسی پذیرفته می‌شوند؛ پیش‌شمارهٔ صفر یا ۹۸ هم خودکار یکسان‌سازی می‌شود.</small></Field>
    <div className="auth-captcha"><img src={'./school-api.php?action=captcha&v='+captcha} width={240} height={76} alt="کد امنیتی تصویری"/><button type="button" className="text-link" onClick={refreshCaptcha}>تصویر تازه</button></div>
    <Field label="کد امنیتی تصویر"><input required dir="ltr" autoComplete="off" inputMode="numeric" pattern="[0-9۰-۹٠-٩]*" maxLength={4} value={form.captcha||''} onChange={e=>setForm({...form,captcha:numberInput(e.target.value).slice(0,4)})}/></Field>
    <button type="button" className="btn primary" disabled={busy||!/^09\d{9}$/.test(phone)||numberInput(String(form.captcha||'')).length!==4} onClick={requestOtp}>{busy?'در حال ارسال…':'دریافت کد ورود'}</button></>:<>
    <p className="hint">کد تا {Math.ceil(Number(smsLogin.otpExpiry||180)/60)} دقیقه معتبر است. پس از تکمیل کد، ورود خودکار انجام می‌شود.</p>
    <Field label={`کد ${codeLength} رقمی`}><input autoFocus autoComplete="one-time-code" inputMode="numeric" pattern="[0-9۰-۹٠-٩]*" dir="ltr" maxLength={codeLength} value={form.otp||''} onChange={e=>setForm({...form,otp:numberInput(e.target.value).slice(0,codeLength)})}/></Field>
    <button type="button" className="btn primary" disabled={busy||numberInput(String(form.otp||'')).length!==codeLength} onClick={()=>submitCode(numberInput(String(form.otp||'')),true)}>{busy?'در حال ورود…':'ورود با کد پیامک'}</button>
    <button type="button" className="text-link" onClick={()=>{setOtpSent(false);setForm({...form,otp:'',captcha:''});submittedCode.current='';refreshCaptcha()}}>تغییر شماره یا ارسال دوباره</button></>}
  </section>}
  <small className="login-credit">طراحی: سعید آذرمهر</small>
 </section></div>;
}

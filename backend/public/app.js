/* ===================== API CLIENT ===================== */
async function api(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (S.token) headers['Authorization'] = 'Bearer ' + S.token;
  const res = await fetch(path, {
    method: opts.method || 'GET',
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  let data = {};
  try { data = await res.json(); } catch (e) {}
  if (!res.ok) {
    const err = new Error(data.error || 'Request failed');
    err.code = data.code; err.status = res.status;
    throw err;
  }
  return data;
}

/* ===================== STATE ===================== */
const uid = () => Math.random().toString(36).slice(2, 10);
let S = {
  token: localStorage.getItem('rf_token'),
  profile: null,
  resumes: [], covers: [], jobs: [],
  theme: localStorage.getItem('rf_theme') || 'light',
  lang: localStorage.getItem('rf_lang') || 'en',
  aiTool: 'writer', aiOutput: '', aiLoading: false,
  atsResult: null,
};
document.documentElement.setAttribute('data-theme', S.theme);
function isPremium(){ return !!S.profile && S.profile.plan === 'premium'; }

/* ===================== I18N ===================== */
const I18N = {
  en:{dashboard:'Dashboard',my_resumes:'My resumes',cover_letters:'Cover letters',ats_score:'ATS score',ai_assistant:'AI assistant',job_tracker:'Job tracker',profile:'Profile',subscription:'Subscription',
     welcome:'Build a resume that gets you hired',sub:'Pick a template, fill in your details, and download a polished resume in minutes.',start:'Get started',new_resume:'New resume',save:'Save',download_pdf:'Download PDF',upgrade:'Upgrade to premium'},
  es:{dashboard:'Panel',my_resumes:'Mis currículos',cover_letters:'Cartas de presentación',ats_score:'Puntaje ATS',ai_assistant:'Asistente IA',job_tracker:'Seguimiento de empleos',profile:'Perfil',subscription:'Suscripción',
     welcome:'Crea un currículum que te contrate',sub:'Elige una plantilla, completa tus datos y descarga un currículum en minutos.',start:'Comenzar',new_resume:'Nuevo currículum',save:'Guardar',download_pdf:'Descargar PDF',upgrade:'Actualizar a premium'},
  fr:{dashboard:'Tableau de bord',my_resumes:'Mes CV',cover_letters:'Lettres de motivation',ats_score:'Score ATS',ai_assistant:'Assistant IA',job_tracker:'Suivi des candidatures',profile:'Profil',subscription:'Abonnement',
     welcome:'Créez un CV qui décroche des entretiens',sub:'Choisissez un modèle, remplissez vos informations et téléchargez un CV en quelques minutes.',start:'Commencer',new_resume:'Nouveau CV',save:'Enregistrer',download_pdf:'Télécharger le PDF',upgrade:'Passer à premium'}
};
const t = k => (I18N[S.lang] && I18N[S.lang][k]) || I18N.en[k] || k;

/* ===================== TEMPLATE CATALOG ===================== */
const LAYOUTS = [
  {id:'classic', name:'Classic'}, {id:'modern', name:'Modern sidebar'}, {id:'minimal', name:'Minimal'},
  {id:'compact', name:'Compact'}, {id:'elegant', name:'Elegant', premium:true}, {id:'creative', name:'Creative', premium:true}
];
const COLORS = [
  {id:'blue',hex:'#2453B8'},{id:'teal',hex:'#0F6E56'},{id:'coral',hex:'#B8501F'},{id:'plum',hex:'#7A2F52'},
  {id:'forest',hex:'#3B6D11'},{id:'navy',hex:'#0C447C'},{id:'amber',hex:'#8C5B0B'},{id:'violet',hex:'#534AB7'},
  {id:'crimson',hex:'#8C2A2A'}
];
function templateCombos(){
  const out = [];
  LAYOUTS.forEach(l => COLORS.forEach(c => out.push({layout:l.id, layoutName:l.name, color:c.id, hex:c.hex, premium:!!l.premium})));
  return out; // 54 combos, 18 of them premium-only (Elegant, Creative)
}
function blankData(){
  return { personal:{fullName:'', jobTitle:'', email:'', phone:'', location:'', website:'', summary:''},
    experience:[], education:[], skills:[], certifications:[], languages:[], projects:[], references:[], hobbies:[] };
}

/* ===================== LOGO ===================== */
function logoIcon(size){
  return `<svg width="${size}" height="${size}" viewBox="0 0 48 48" aria-hidden="true">
    <path d="M12 4H30L40 14V40C40 42.2091 38.2091 44 36 44H12C9.79086 44 8 42.2091 8 40V8C8 5.79086 9.79086 4 12 4Z" fill="var(--accent)"/>
    <path d="M30 4L40 14H32C30.8954 14 30 13.1046 30 12V4Z" fill="var(--accent-ink)"/>
    <rect x="15" y="30" width="4" height="8" rx="1" fill="var(--gold)"/>
    <rect x="21" y="25" width="4" height="13" rx="1" fill="var(--gold)"/>
    <rect x="27" y="20" width="4" height="18" rx="1" fill="var(--gold)"/>
  </svg>`;
}
// Fixed-color version (not var(--accent), which would flip in dark mode) -
// used inside the resume page itself, which is always printed as black-on-
// white paper regardless of the app's own theme.
function logoIconFixed(size){
  return `<svg width="${size}" height="${size}" viewBox="0 0 48 48" aria-hidden="true">
    <path d="M12 4H30L40 14V40C40 42.2091 38.2091 44 36 44H12C9.79086 44 8 42.2091 8 40V8C8 5.79086 9.79086 4 12 4Z" fill="#2453B8"/>
    <path d="M30 4L40 14H32C30.8954 14 30 13.1046 30 12V4Z" fill="#12306E"/>
    <rect x="15" y="30" width="4" height="8" rx="1" fill="#B8842E"/>
    <rect x="21" y="25" width="4" height="13" rx="1" fill="#B8842E"/>
    <rect x="27" y="20" width="4" height="18" rx="1" fill="#B8842E"/>
  </svg>`;
}

/* ===================== HELPERS ===================== */
function esc(s){ return (s||'').toString().replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function nl2ul(text){
  const lines = (text||'').split('\n').map(l=>l.trim()).filter(Boolean);
  if(!lines.length) return '';
  return '<ul>' + lines.map(l=>`<li>${esc(l)}</li>`).join('') + '</ul>';
}
function findResume(id){ return S.resumes.find(r=>r.id===id); }
function resumeCompleteness(r){
  const p = r.data.personal;
  const checks = [
    { done: !!(p.fullName && p.jobTitle && p.email), label:'Personal info' },
    { done: !!p.summary, label:'Professional summary' },
    { done: r.data.experience.length>0, label:'Work experience' },
    { done: r.data.education.length>0, label:'Education' },
    { done: r.data.skills.length>0, label:'Skills' },
  ];
  const done = checks.filter(c=>c.done).length;
  return { pct: Math.round((done/checks.length)*100), missing: checks.filter(c=>!c.done).map(c=>c.label) };
}
function flag(name){ return localStorage.getItem('rf_flag_'+name) === '1'; }
function setFlag(name){ localStorage.setItem('rf_flag_'+name, '1'); }
function toast(msg){
  const el = document.createElement('div'); el.className='toast'; el.textContent=msg;
  document.body.appendChild(el); setTimeout(()=>el.remove(), 2600);
}

/* ===================== BOOT / AUTH ===================== */
async function boot(){
  const shareMatch = location.pathname.match(/^\/r\/([\w-]+)$/);
  if(shareMatch){ renderPublicResume(shareMatch[1]); return; }
  if(!S.token){ renderLanding(); return; }
  try{
    const {user} = await api('/api/auth/me');
    S.profile = user;
    await Promise.all([loadResumes(), loadCovers(), loadJobs()]);
    await handlePaymentCallback();
    if(!location.hash) location.hash = '#/dashboard';
    render();
  }catch(e){
    localStorage.removeItem('rf_token'); S.token=null; S.profile=null;
    renderLanding();
  }
}
async function handlePaymentCallback(){
  if(location.pathname !== '/payment/callback') return;
  const params = new URLSearchParams(location.search);
  const status = params.get('status');
  const transactionId = params.get('transaction_id');
  history.replaceState({}, '', '/' + (location.hash || '#/subscription'));
  if(status === 'cancelled'){ toast('Payment cancelled'); return; }
  if(!transactionId) return;
  try{
    const {success, user} = await api(`/api/payments/verify/${encodeURIComponent(transactionId)}`);
    if(success){ S.profile = user; toast('Payment confirmed — premium unlocked!'); }
    else toast('Payment was not completed.');
  }catch(e){ toast('Could not verify payment: ' + e.message); }
}
async function loadResumes(){ const {resumes} = await api('/api/resumes'); S.resumes = resumes; }
async function loadCovers(){ const {covers} = await api('/api/covers'); S.covers = covers; }
async function loadJobs(){ const {jobs} = await api('/api/jobs'); S.jobs = jobs; }

function logout(){
  localStorage.removeItem('rf_token');
  S = {...S, token:null, profile:null, resumes:[], covers:[], jobs:[]};
  location.hash = '';
  renderLanding();
}

async function renderPublicResume(id){
  const app = document.getElementById('app');
  app.innerHTML = `<div class="center-spinner"><span class="spinner"></span></div>`;
  try{
    const {resume, ownerName} = await api(`/api/public/resumes/${id}`);
    app.innerHTML = `
      <div class="topbar" style="justify-content:center;">
        <div class="logo" style="cursor:default;">${logoIcon(26)}Resumly</div>
      </div>
      <main>
        <div class="page-head"><div><h1 style="font-size:20px;">${esc(ownerName)}'s resume</h1><p class="muted">Made with Resumly</p></div>
          <a class="btn btn-primary" href="/">Build your own free</a></div>
        <div class="preview-stage"><div id="resume-preview-page">${renderResumePage(resume, {noWatermark:true})}</div></div>
      </main>`;
  }catch(e){
    app.innerHTML = `<div class="landing"><div class="landing-card card">
      <div style="display:flex;justify-content:center;margin-bottom:12px;">${logoIcon(44)}</div>
      <h1>Link not available</h1><p class="muted">This resume isn't public — the owner may have turned sharing off or downgraded their plan.</p>
      <a class="btn btn-primary btn-block" href="/">Go to Resumly</a>
    </div></div>`;
  }
}

window.addEventListener('hashchange', render);

/* ===================== RENDER: SHELL ===================== */
function currentRoute(){
  const h = location.hash.replace('#/','') || 'dashboard';
  const [route, param] = h.split('/');
  return {route, param};
}
function renderLanding(){
  document.getElementById('app').innerHTML = landingView();
  bindLanding();
}
function render(){
  const app = document.getElementById('app');
  if(!S.profile){ renderLanding(); return; }
  const {route, param} = currentRoute();
  let body = '';
  if(route==='dashboard') body = dashboardView();
  else if(route==='resumes') body = resumesView();
  else if(route==='editor') body = editorView(param);
  else if(route==='covers') body = coversView();
  else if(route==='ats') body = atsView();
  else if(route==='ai') body = aiView();
  else if(route==='jobs') body = jobsView();
  else if(route==='profile') body = profileView();
  else if(route==='subscription') body = subscriptionView();
  else body = dashboardView();

  app.innerHTML = topbar(route) + `<main>${body}</main>` + `<p class="footer-hint">Resumly — your data is stored on this server's database. AI features call Gemini live; upgrades go through Flutterwave.</p>`;
  bindGlobal();
  if(route==='dashboard') bindDashboard();
  if(route==='resumes') bindResumes();
  if(route==='editor') bindEditor(param);
  if(route==='covers') bindCovers();
  if(route==='ats') bindAts();
  if(route==='ai') bindAi();
  if(route==='jobs') bindJobs();
  if(route==='profile') bindProfile();
  if(route==='subscription') bindSubscription();
}
function topbar(route){
  const initials = (S.profile.name||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  const nav = [
    ['dashboard', t('dashboard'), '&#9635;'], ['resumes', t('my_resumes'), '&#128196;'],
    ['covers', t('cover_letters'), '&#9993;'], ['ats', t('ats_score'), '&#127919;'],
    ['ai', t('ai_assistant'), '&#10024;'], ['jobs', t('job_tracker'), '&#128188;'],
    ['profile', t('profile'), '&#128100;'], ['subscription', t('subscription'), '&#11088;']
  ];
  return `
  <div class="topbar">
    <button class="icon-btn hamburger" id="hamburger" aria-label="Menu">&#9776;</button>
    <div class="logo" data-nav="dashboard">${logoIcon(28)}Resumly</div>
    <nav class="topnav" id="topnav">
      ${nav.map(([r,label,ic]) => `<a href="#/${r}" class="${route===r?'active':''}">${label}${r==='ats'||r==='ai'?' <span class="badge badge-gold" style="margin-left:4px">Pro</span>':''}</a>`).join('')}
    </nav>
    <div class="topbar-right">
      <button class="icon-btn" id="theme-toggle" title="Toggle dark mode">${S.theme==='dark'?'&#9728;':'&#9789;'}</button>
      <select id="lang-select" class="btn btn-sm" style="padding:6px 8px;">
        <option value="en" ${S.lang==='en'?'selected':''}>EN</option>
        <option value="es" ${S.lang==='es'?'selected':''}>ES</option>
        <option value="fr" ${S.lang==='fr'?'selected':''}>FR</option>
      </select>
      <div class="avatar" title="${esc(S.profile.name)}">${initials}</div>
      <button class="icon-btn" id="logout-btn" title="Log out">&#10148;</button>
    </div>
  </div>`;
}
function bindGlobal(){
  document.querySelectorAll('[data-nav]').forEach(el => el.addEventListener('click', ()=> location.hash = '#/'+el.dataset.nav));
  const hb = document.getElementById('hamburger');
  if(hb) hb.addEventListener('click', ()=> document.getElementById('topnav').classList.toggle('open'));
  document.querySelectorAll('.topnav a').forEach(a => a.addEventListener('click', ()=> document.getElementById('topnav').classList.remove('open')));
  const tt = document.getElementById('theme-toggle');
  if(tt) tt.addEventListener('click', ()=>{ S.theme = S.theme==='dark' ? 'light':'dark'; document.documentElement.setAttribute('data-theme', S.theme); localStorage.setItem('rf_theme', S.theme); render(); });
  const ls = document.getElementById('lang-select');
  if(ls) ls.addEventListener('change', e=>{ S.lang = e.target.value; localStorage.setItem('rf_lang', S.lang); render(); });
  const lo = document.getElementById('logout-btn');
  if(lo) lo.addEventListener('click', logout);
}

/* ===================== LANDING / LOGIN / REGISTER ===================== */
let authMode = 'login';
function landingView(){
  return `<div class="landing"><div class="landing-card card">
    <div style="display:flex;justify-content:center;margin-bottom:12px;">${logoIcon(44)}</div>
    <h1>${t('welcome')}</h1>
    <p class="muted">${t('sub')}</p>
    <div class="auth-tabs">
      <button class="pill-tab ${authMode==='login'?'active':''}" data-authmode="login">Log in</button>
      <button class="pill-tab ${authMode==='register'?'active':''}" data-authmode="register">Create account</button>
    </div>
    <div style="text-align:left;">
      ${authMode==='register' ? `<div class="field"><label>Full name</label><input id="au-name" type="text" placeholder="Jordan Avery"></div>` : ''}
      <div class="field"><label>Email</label><input id="au-email" type="email" placeholder="jordan@email.com"></div>
      <div class="field"><label>Password</label><input id="au-password" type="password" placeholder="At least 8 characters"></div>
    </div>
    <button class="btn btn-primary btn-block" id="au-submit">${authMode==='login' ? 'Log in' : t('start')} &rarr;</button>
    <p class="err-text hidden" id="au-error"></p>
  </div></div>`;
}
function bindLanding(){
  document.querySelectorAll('[data-authmode]').forEach(b=>b.addEventListener('click', ()=>{ authMode=b.dataset.authmode; renderLanding(); }));
  document.getElementById('au-submit').addEventListener('click', async ()=>{
    const email = document.getElementById('au-email').value.trim();
    const password = document.getElementById('au-password').value;
    const errEl = document.getElementById('au-error');
    errEl.classList.add('hidden');
    const btn = document.getElementById('au-submit');
    const old = btn.innerHTML; btn.innerHTML = '<span class="spinner"></span>'; btn.disabled = true;
    try{
      let res;
      if(authMode==='register'){
        const name = document.getElementById('au-name').value.trim();
        res = await api('/api/auth/register', {method:'POST', body:{name, email, password}});
      } else {
        res = await api('/api/auth/login', {method:'POST', body:{email, password}});
      }
      S.token = res.token; localStorage.setItem('rf_token', S.token);
      S.profile = res.user;
      await Promise.all([loadResumes(), loadCovers(), loadJobs()]);
      location.hash = '#/dashboard'; render();
    }catch(e){
      errEl.textContent = e.message; errEl.classList.remove('hidden');
    }
    btn.innerHTML = old; btn.disabled = false;
  });
}

/* ===================== DASHBOARD ===================== */
function dashboardView(){
  const avgAts = S.atsResult ? S.atsResult.score : null;
  return `
  <div class="page-head"><div><h1>Welcome back, ${esc(S.profile.name.split(' ')[0])}</h1><p class="muted">Here's where things stand.</p></div>
    <button class="btn btn-primary" data-nav="resumes">+ ${t('new_resume')}</button></div>
  <div class="grid-cards">
    <div class="stat"><div class="num">${S.resumes.length}</div><div class="lbl">Resumes</div></div>
    <div class="stat"><div class="num">${S.covers.length}</div><div class="lbl">Cover letters</div></div>
    <div class="stat"><div class="num">${S.jobs.length}</div><div class="lbl">Applications tracked</div></div>
    <div class="stat"><div class="num">${avgAts!==null ? avgAts+'%' : '—'}</div><div class="lbl">Last ATS score</div></div>
  </div>
  <div class="section-title">Quick actions</div>
  <div class="grid-cards">
    <div class="card"><h3 style="font-size:15px;">Start a resume</h3><p class="muted" style="font-size:13px;">Choose from 50+ templates and fill it in.</p><a class="btn btn-sm" href="#/resumes">Browse templates</a></div>
    <div class="card"><h3 style="font-size:15px;">Write a cover letter</h3><p class="muted" style="font-size:13px;">Draft one manually or generate it with AI.</p><a class="btn btn-sm" href="#/covers">Open cover letters</a></div>
    <div class="card"><h3 style="font-size:15px;">Check your ATS score</h3><p class="muted" style="font-size:13px;">See how well your resume matches a job post.</p><a class="btn btn-sm" href="#/ats">Run ATS check</a></div>
    <div class="card"><h3 style="font-size:15px;">Track applications</h3><p class="muted" style="font-size:13px;">Keep every application in one board.</p><a class="btn btn-sm" href="#/jobs">Open job tracker</a></div>
  </div>
  ${onboardingChecklist()}
  ${!isPremium() ? `<div class="section-title">Go further with premium</div>${planCompareMini()}` : ''}
  `;
}
function onboardingChecklist(){
  const items = [
    { done: S.resumes.length>0, label:'Create your first resume', href:'#/resumes' },
    { done: S.resumes.some(r=>r.data.experience.length>0), label:'Add your work experience', href: S.resumes[0] ? '#/editor/'+S.resumes[0].id : '#/resumes' },
    { done: flag('downloaded'), label:'Download a PDF', href: S.resumes[0] ? '#/editor/'+S.resumes[0].id : '#/resumes' },
    { done: isPremium() || flag('ai_tried'), label:'Try the AI assistant or ATS checker', href:'#/subscription' },
  ];
  const remaining = items.filter(i=>!i.done);
  if(!remaining.length) return '';
  const doneCount = items.length - remaining.length;
  return `<div class="section-title">Get set up (${doneCount}/${items.length})</div>
  <div class="card">
    ${items.map(i=>`<a href="${i.href}" style="display:flex;align-items:center;gap:10px;padding:8px 0;text-decoration:none;color:inherit;border-bottom:1px solid var(--border);">
      <span style="width:18px;height:18px;border-radius:50%;border:1.5px solid ${i.done?'var(--success)':'var(--border)'};background:${i.done?'var(--success)':'transparent'};color:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;flex-shrink:0;">${i.done?'&#10003;':''}</span>
      <span style="font-size:13.5px;${i.done?'color:var(--text-2);text-decoration:line-through;':''}">${i.label}</span>
    </a>`).join('')}
  </div>`;
}
function planCompareMini(){
  return `<div class="upgrade-card">
    <h3 style="font-size:17px;">Unlock AI writing, ATS scoring and unlimited downloads</h3>
    <p class="muted">AI resume &amp; cover letter writer, interview prep, grammar checks, unlimited watermark-free PDFs, and premium templates.</p>
    <button class="btn btn-gold" data-nav="subscription">${t('upgrade')}</button>
  </div>`;
}
function bindDashboard(){}

/* ===================== RESUMES LIST ===================== */
function resumesView(){
  return `
  <div class="page-head"><div><h1>${t('my_resumes')}</h1><p class="muted">${S.resumes.length} saved resume${S.resumes.length===1?'':'s'}.</p></div>
    <button class="btn btn-primary" id="new-resume-btn">+ ${t('new_resume')}</button></div>
  <div class="grid-cards">
    ${S.resumes.map(r => resumeCard(r)).join('') || '<p class="muted">No resumes yet — create your first one.</p>'}
  </div>`;
}
function resumeCard(r){
  return `<div class="resume-card">
    <div class="resume-thumb" style="background:${r.color}22;">
      <div class="mini" style="border-top:14px solid ${r.color};padding-top:16px;">
        <div style="font-weight:700;font-size:7px;">${esc(r.data.personal.fullName||'Your name')}</div>
        <div style="color:${r.color};font-size:5.5px;margin:2px 0 5px;">${esc(r.data.personal.jobTitle||'Job title')}</div>
        <div style="height:2px;background:#eee;width:70%;margin-bottom:3px;"></div>
        <div style="height:2px;background:#eee;width:90%;margin-bottom:3px;"></div>
        <div style="height:2px;background:#eee;width:55%;"></div>
      </div>
    </div>
    <div class="resume-card-body">
      <div><strong>${esc(r.name)}</strong><div class="muted" style="font-size:11.5px;">Updated ${new Date(r.updatedAt).toLocaleDateString()}</div></div>
      <div class="resume-card-actions">
        <a class="btn btn-sm" href="#/editor/${r.id}">Edit</a>
        <button class="btn btn-sm" data-dup="${r.id}">Duplicate</button>
        <button class="btn btn-sm btn-danger" data-del="${r.id}">Delete</button>
      </div>
    </div>
  </div>`;
}
function templatePickerModal(){
  const combos = templateCombos();
  return `<div class="overlay" id="tpl-overlay"><div class="modal">
    <div class="modal-head"><h3 style="margin:0;">Choose a template</h3><button class="icon-btn" id="tpl-close">&times;</button></div>
    <p class="muted" style="margin-top:-6px;">${combos.length}+ layout &amp; color combinations — ${combos.filter(c=>c.premium).length} of them Premium. Pick one — you can switch anytime in the editor.</p>
    <div class="tpl-grid">
      ${combos.map(c => {
        const locked = c.premium && !isPremium();
        return `<button class="tpl-swatch ${locked?'locked':''}" data-layout="${c.layout}" data-hex="${c.hex}" data-premium="${c.premium}">
          <div class="head" style="background:${c.hex};"></div>
          <div class="lines"><div style="width:70%"></div><div style="width:90%"></div><div style="width:50%"></div></div>
          <div class="lbl">${c.layoutName} ${c.premium?'<span class="badge badge-gold" style="margin-left:4px;">Pro</span>':''}</div>
          ${locked?'<div class="lock-badge">&#128274;</div>':''}
        </button>`;
      }).join('')}
    </div>
  </div></div>`;
}
function bindResumes(){
  document.getElementById('new-resume-btn').addEventListener('click', openTemplatePicker);
  document.querySelectorAll('[data-dup]').forEach(b=>b.addEventListener('click', async ()=>{
    try{ const {resume} = await api(`/api/resumes/${b.dataset.dup}/duplicate`, {method:'POST'}); S.resumes.unshift(resume); render(); }
    catch(e){ toast(e.message); }
  }));
  document.querySelectorAll('[data-del]').forEach(b=>b.addEventListener('click', async ()=>{
    if(!confirm('Delete this resume?')) return;
    try{ await api(`/api/resumes/${b.dataset.del}`, {method:'DELETE'}); S.resumes = S.resumes.filter(r=>r.id!==b.dataset.del); render(); }
    catch(e){ toast(e.message); }
  }));
}
function openTemplatePicker(forEdit){
  document.body.insertAdjacentHTML('beforeend', templatePickerModal());
  document.getElementById('tpl-close').addEventListener('click', ()=>document.getElementById('tpl-overlay').remove());
  document.getElementById('tpl-overlay').addEventListener('click', e=>{ if(e.target.id==='tpl-overlay') e.target.remove(); });
  document.querySelectorAll('.tpl-swatch').forEach(sw => sw.addEventListener('click', async ()=>{
    const layout = sw.dataset.layout, hex = sw.dataset.hex;
    if(sw.dataset.premium === 'true' && !isPremium()){
      toast('This template is part of Premium — upgrade to unlock it');
      return;
    }
    document.getElementById('tpl-overlay').remove();
    if(forEdit){ forEdit(layout, hex); return; }
    try{
      const {resume} = await api('/api/resumes', {method:'POST', body:{name:t('new_resume'), template:layout, color:hex, data:blankData()}});
      S.resumes.unshift(resume);
      location.hash = '#/editor/'+resume.id; render();
    }catch(e){ toast(e.message); }
  }));
}

/* ===================== EDITOR ===================== */
let openAccordion = 'personal';
const saveTimers = {};
function setSaveStatus(text){ const el = document.getElementById('save-status'); if(el) el.textContent = text; }
function scheduleSave(r){
  setSaveStatus('Saving...');
  clearTimeout(saveTimers[r.id]);
  saveTimers[r.id] = setTimeout(()=> saveResumeNow(r), 800);
}
async function saveResumeNow(r){
  try{
    setSaveStatus('Saving...');
    const {resume} = await api(`/api/resumes/${r.id}`, {method:'PUT', body:{name:r.name, template:r.template, color:r.color, data:r.data}});
    r.updatedAt = resume.updatedAt;
    setSaveStatus('Saved just now');
  }catch(e){ setSaveStatus('Could not save'); toast('Could not save: ' + e.message); }
}

function editorView(id){
  const r = findResume(id);
  if(!r) return `<p>Resume not found. <a href="#/resumes">Back to resumes</a></p>`;
  const comp = resumeCompleteness(r);
  return `
  <div class="page-head">
    <div><input id="ed-name" type="text" value="${esc(r.name)}" style="font-family:var(--font-display);font-size:22px;font-weight:600;border:none;background:transparent;padding:2px 0;max-width:400px;">
      <div style="display:flex;align-items:center;gap:8px;margin-top:4px;" id="ed-completeness">${completenessHtml(comp)}</div>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;">
      <button class="btn" id="ed-template-btn">Change template</button>
      <button class="btn btn-primary" id="ed-save">${t('save')}</button>
      <button class="btn btn-gold" id="ed-download">${t('download_pdf')}</button>
    </div>
  </div>
  <div class="editor-wrap">
    <div class="editor-left">
      ${accordion('personal','Personal information', personalForm(r))}
      ${accordion('summary','Professional summary', summaryForm(r))}
      ${accordion('experience','Work experience', listForm(r,'experience'))}
      ${accordion('education','Education', listForm(r,'education'))}
      ${accordion('skills','Skills', skillsForm(r))}
      ${accordion('certifications','Certifications', listForm(r,'certifications'))}
      ${accordion('languages','Languages', listForm(r,'languages'))}
      ${accordion('projects','Projects', listForm(r,'projects'))}
      ${accordion('references','References', listForm(r,'references'))}
      ${accordion('hobbies','Hobbies (optional)', hobbiesForm(r))}
      ${accordion('colors','Accent color', colorForm(r))}
      ${accordion('sharing','Portfolio link', sharingForm(r))}
    </div>
    <div>
      <div class="preview-toolbar">
        <span class="badge badge-outline">Live preview</span>
        <span class="muted" style="font-size:12.5px;">${isPremium() ? 'Premium: no watermark, unlimited downloads' : 'Free plan: PDF includes a watermark'}</span>
      </div>
      <div class="preview-stage"><div id="resume-preview-page">${renderResumePage(r)}</div></div>
    </div>
  </div>`;
}
function completenessHtml(comp){
  return `<div style="width:70px;height:6px;border-radius:99px;background:var(--surface-2);overflow:hidden;"><div style="width:${comp.pct}%;height:100%;background:${comp.pct===100?'var(--success)':'var(--accent)'};"></div></div>
    <span class="muted" style="font-size:12px;">${comp.pct}% complete${comp.missing.length?' — add ' + comp.missing[0].toLowerCase():''}</span>
    <span class="muted" id="save-status" style="font-size:12px;"></span>`;
}
function accordion(id,label,body){
  const open = openAccordion===id;
  return `<div class="acc ${open?'open':''}" data-acc="${id}">
    <div class="acc-head" data-acc-toggle="${id}">${label}<span class="chev">&#9660;</span></div>
    <div class="acc-body">${body}</div>
  </div>`;
}
function personalForm(r){
  const p = r.data.personal;
  return `
  <div class="field"><label>Full name</label><input data-p="fullName" type="text" value="${esc(p.fullName)}"></div>
  <div class="field"><label>Job title</label><input data-p="jobTitle" type="text" value="${esc(p.jobTitle)}"></div>
  <div class="row row-2"><div class="field"><label>Email</label><input data-p="email" type="email" value="${esc(p.email)}"></div>
  <div class="field"><label>Phone</label><input data-p="phone" type="text" value="${esc(p.phone)}"></div></div>
  <div class="row row-2"><div class="field"><label>Location</label><input data-p="location" type="text" value="${esc(p.location)}"></div>
  <div class="field"><label>Website / portfolio ${!isPremium()?'<span class=\"badge badge-gold\">Pro</span>':''}</label><input data-p="website" type="text" value="${esc(p.website)}" ${!isPremium()?'disabled placeholder="Upgrade to add a portfolio link"':''}></div></div>`;
}
function summaryForm(r){
  return `<div class="field"><textarea data-p="summary" rows="5" placeholder="A short pitch about your experience and strengths...">${esc(r.data.personal.summary)}</textarea></div>
  <button class="btn btn-sm" data-ai-jump="writer">&#10024; Draft this with AI</button>`;
}
const SECTION_FIELDS = {
  experience:[['role','Role'],['company','Company'],['location','Location'],['start','Start'],['end','End'],['bullets','Highlights (one per line)']],
  education:[['school','School'],['degree','Degree'],['field','Field of study'],['start','Start'],['end','End'],['gpa','GPA (optional)']],
  certifications:[['name','Certification'],['issuer','Issuer'],['date','Date']],
  languages:[['name','Language'],['level','Proficiency']],
  projects:[['name','Project name'],['link','Link'],['description','Description']],
  references:[['name','Name'],['relation','Relationship'],['contact','Contact info']]
};
function listForm(r, section){
  const items = r.data[section];
  const fields = SECTION_FIELDS[section];
  return `${items.map((item,i)=>`
    <div class="entry" data-item="${item.id}">
      <div class="entry-top"><span class="entry-drag">#${i+1}</span><button class="btn btn-sm btn-danger" data-remove="${section}:${item.id}">Remove</button></div>
      ${fields.map(([k,label])=> k==='bullets'||k==='description' ?
        `<div class="field"><label>${label}</label><textarea data-item-field="${section}:${item.id}:${k}" rows="3">${esc(item[k])}</textarea></div>` :
        `<div class="field"><label>${label}</label><input data-item-field="${section}:${item.id}:${k}" type="text" value="${esc(item[k])}"></div>`
      ).join('')}
    </div>`).join('')}
    <button class="btn btn-sm btn-block" data-add="${section}">+ Add ${section==='references'?'reference':section.replace(/s$/,'')}</button>`;
}
function skillsForm(r){
  const items = r.data.skills;
  return `${items.map(s=>`
    <div class="skill-row" data-item="${s.id}">
      <input data-item-field="skills:${s.id}:name" type="text" value="${esc(s.name)}" style="max-width:120px;" placeholder="Skill">
      <input type="range" min="0" max="100" value="${s.level}" data-item-field="skills:${s.id}:level">
      <span class="muted" style="width:34px;font-size:12px;">${s.level}%</span>
      <button class="btn btn-sm btn-danger" data-remove="skills:${s.id}">&times;</button>
    </div>`).join('')}
    <button class="btn btn-sm btn-block" data-add="skills">+ Add skill</button>`;
}
function hobbiesForm(r){
  const hobbies = r.data.hobbies;
  return `<div class="tagbar">${hobbies.map((h,i)=>`<span class="tag">${esc(h)}<button data-hobby-remove="${i}">&times;</button></span>`).join('')}</div>
    <div class="field" style="margin-top:10px;"><input id="hobby-input" type="text" placeholder="Type a hobby and press Enter"></div>`;
}
function colorForm(r){
  return `<div style="display:flex;gap:8px;flex-wrap:wrap;">
    ${COLORS.map(c=>`<button class="icon-btn" data-color="${c.hex}" style="background:${c.hex};border-color:${c.hex==r.color?'var(--text)':'transparent'};"></button>`).join('')}
  </div>`;
}
function sharingForm(r){
  if(!isPremium()){
    return `<p class="muted" style="font-size:12.5px;">Turn any resume into a live, shareable link — like a mini portfolio page. <span class="badge badge-gold">Pro</span></p>
      <button class="btn btn-sm" data-nav="subscription">${t('upgrade')}</button>`;
  }
  const link = `${location.origin}/r/${r.id}`;
  return `<p class="muted" style="font-size:12.5px;">Publish this resume as a public page anyone can view — handy as a portfolio link on LinkedIn or a CV.</p>
    <label style="display:flex;align-items:center;gap:8px;text-transform:none;font-weight:500;font-size:13.5px;color:var(--text);cursor:pointer;">
      <input type="checkbox" id="share-toggle" ${r.isPublic?'checked':''} style="width:16px;height:16px;"> Make this resume public
    </label>
    ${r.isPublic ? `<div class="field" style="margin-top:10px;"><label>Shareable link</label>
      <div style="display:flex;gap:6px;"><input type="text" readonly value="${esc(link)}" id="share-link-input"><button class="btn btn-sm" id="share-copy">Copy</button></div></div>` : ''}`;
}
function renderResumePage(r, opts={}){
  const p = r.data.personal;
  const tplClass = 'tpl-' + r.template;
  const contact = [p.email,p.phone,p.location,p.website].filter(Boolean).map(esc).join(' &nbsp;&middot;&nbsp; ');
  const header = `<h1 class="name">${esc(p.fullName)||'Your name'}</h1><div class="title">${esc(p.jobTitle)||'Your job title'}</div><div class="contact">${contact}</div>`;
  const summary = p.summary ? `<h2 class="sec">Summary</h2><p>${esc(p.summary)}</p>` : '';
  const experience = r.data.experience.length ? `<h2 class="sec">Experience</h2>${r.data.experience.map(e=>`
      <div class="item"><div class="item-top"><span>${esc(e.role)}${e.company?' — '+esc(e.company):''}</span><span>${esc(e.start)} – ${esc(e.end)}</span></div>
      <div class="item-sub">${esc(e.location)}</div>${nl2ul(e.bullets)}</div>`).join('')}` : '';
  const education = r.data.education.length ? `<h2 class="sec">Education</h2>${r.data.education.map(e=>`
      <div class="item"><div class="item-top"><span>${esc(e.degree)}${e.field?', '+esc(e.field):''}</span><span>${esc(e.start)} – ${esc(e.end)}</span></div>
      <div class="item-sub">${esc(e.school)}${e.gpa?' &middot; GPA '+esc(e.gpa):''}</div></div>`).join('')}` : '';
  const skills = r.data.skills.length ? `<h2 class="sec">Skills</h2><div class="skills-wrap">${r.data.skills.map(s=>`<span class="skillchip">${esc(s.name)}</span>`).join('')}</div>` : '';
  const certs = r.data.certifications.length ? `<h2 class="sec">Certifications</h2>${r.data.certifications.map(c=>`
      <div class="item"><div class="item-top"><span>${esc(c.name)}</span><span>${esc(c.date)}</span></div><div class="item-sub">${esc(c.issuer)}</div></div>`).join('')}` : '';
  const langs = r.data.languages.length ? `<h2 class="sec">Languages</h2>${r.data.languages.map(l=>`<div class="item item-top"><span>${esc(l.name)}</span><span>${esc(l.level)}</span></div>`).join('')}` : '';
  const projects = r.data.projects.length ? `<h2 class="sec">Projects</h2>${r.data.projects.map(pr=>`
      <div class="item"><div class="item-top"><span>${esc(pr.name)}</span><span>${esc(pr.link)}</span></div><p style="margin:2px 0 0;">${esc(pr.description)}</p></div>`).join('')}` : '';
  const refs = r.data.references.length ? `<h2 class="sec">References</h2>${r.data.references.map(rf=>`
      <div class="item item-top"><span>${esc(rf.name)} — ${esc(rf.relation)}</span><span>${esc(rf.contact)}</span></div>`).join('')}` : '';
  const hobbies = r.data.hobbies.length ? `<h2 class="sec">Hobbies</h2><div class="skills-wrap">${r.data.hobbies.map(h=>`<span class="skillchip">${esc(h)}</span>`).join('')}</div>` : '';
  const bodySections = summary+experience+education+skills+certs+langs+projects+refs+hobbies;
  const watermark = (!opts.noWatermark && !isPremium()) ? `<div class="watermark-diag">${Array.from({length:20}).map(()=>`<div class="wm-tile">${logoIconFixed(28)}<span>Resumly</span></div>`).join('')}</div>` : '';

  let inner;
  if(r.template==='modern'){
    inner = `<div class="side">${header}${skills}${langs}${hobbies}</div><div class="main">${summary}${experience}${education}${certs}${projects}${refs}</div>`;
  } else if(r.template==='creative'){
    inner = `<div class="rs-header">${header}</div>${bodySections}`;
  } else {
    inner = header + bodySections;
  }
  return `<div class="rs ${tplClass}" style="--tpl-accent:${r.color}">${inner}</div>${watermark}`;
}
function bindEditor(id){
  const r = findResume(id);
  if(!r) return;
  document.querySelectorAll('[data-acc-toggle]').forEach(h => h.addEventListener('click', ()=>{
    openAccordion = openAccordion === h.dataset.accToggle ? '' : h.dataset.accToggle;
    render();
  }));
  function touch(){ r.updatedAt = Date.now(); scheduleSave(r); refreshPreview(); refreshCompleteness(); }
  function refreshPreview(){ const pv = document.getElementById('resume-preview-page'); if(pv) pv.innerHTML = renderResumePage(r); }
  function refreshCompleteness(){ const c = document.getElementById('ed-completeness'); if(c) c.innerHTML = completenessHtml(resumeCompleteness(r)); }

  document.getElementById('ed-name').addEventListener('input', e=>{ r.name = e.target.value; touch(); });
  document.getElementById('ed-save').addEventListener('click', ()=>{ clearTimeout(saveTimers[r.id]); saveResumeNow(r).then(()=>toast('Resume saved')); });
  document.getElementById('ed-download').addEventListener('click', ()=> downloadResumePdf(r));
  document.getElementById('ed-template-btn').addEventListener('click', ()=>{
    openTemplatePicker((layout, hex)=>{ r.template = layout; r.color = hex; touch(); render(); });
  });

  document.querySelectorAll('[data-p]').forEach(inp => inp.addEventListener('input', e=>{
    r.data.personal[e.target.dataset.p] = e.target.value; touch();
  }));
  document.querySelectorAll('[data-color]').forEach(b => b.addEventListener('click', ()=>{ r.color = b.dataset.color; touch(); render(); }));

  document.querySelectorAll('[data-add]').forEach(b => b.addEventListener('click', ()=>{
    const section = b.dataset.add;
    const base = {id:uid()};
    (SECTION_FIELDS[section]||[]).forEach(([k])=> base[k]='');
    if(section==='skills'){ base.name=''; base.level=60; }
    r.data[section].push(base); touch(); render();
  }));
  document.querySelectorAll('[data-remove]').forEach(b => b.addEventListener('click', ()=>{
    const [section,itemId] = b.dataset.remove.split(':');
    r.data[section] = r.data[section].filter(x=>x.id!==itemId); touch(); render();
  }));
  document.querySelectorAll('[data-item-field]').forEach(inp => {
    inp.addEventListener('input', e=>{
      const [section,itemId,field] = e.target.dataset.itemField.split(':');
      const item = r.data[section].find(x=>x.id===itemId);
      item[field] = e.target.type==='range' ? Number(e.target.value) : e.target.value;
      touch();
      if(e.target.type==='range'){ e.target.nextElementSibling.textContent = item[field]+'%'; }
    });
  });
  const hi = document.getElementById('hobby-input');
  if(hi) hi.addEventListener('keydown', e=>{
    if(e.key==='Enter' && e.target.value.trim()){ r.data.hobbies.push(e.target.value.trim()); touch(); render(); }
  });
  document.querySelectorAll('[data-hobby-remove]').forEach(b=>b.addEventListener('click', ()=>{
    r.data.hobbies.splice(Number(b.dataset.hobbyRemove),1); touch(); render();
  }));
  document.querySelectorAll('[data-ai-jump]').forEach(b=>b.addEventListener('click', ()=>{
    aiResumeContext = r.id; location.hash = '#/ai'; render();
  }));
  const shareToggle = document.getElementById('share-toggle');
  if(shareToggle) shareToggle.addEventListener('change', async e=>{
    try{
      const {resume} = await api(`/api/resumes/${r.id}/visibility`, {method:'PUT', body:{isPublic:e.target.checked}});
      r.isPublic = resume.isPublic;
      toast(r.isPublic ? 'Resume is now public' : 'Resume is now private');
      render();
    }catch(err){ toast(err.message); e.target.checked = !e.target.checked; }
  });
  const shareCopy = document.getElementById('share-copy');
  if(shareCopy) shareCopy.addEventListener('click', ()=>{
    navigator.clipboard.writeText(document.getElementById('share-link-input').value);
    toast('Link copied');
  });
}

async function downloadResumePdf(r){
  const node = document.getElementById('resume-preview-page');
  const btn = document.getElementById('ed-download');
  const oldLabel = btn.textContent; btn.innerHTML = '<span class="spinner"></span> Preparing...'; btn.disabled = true;
  try{
    const canvas = await html2canvas(node, {scale:2, useCORS:true, backgroundColor:'#ffffff'});
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('p','pt','a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgW = pageWidth;
    const imgH = canvas.height * (imgW/canvas.width);
    let heightLeft = imgH, position = 0;
    const imgData = canvas.toDataURL('image/png');
    pdf.addImage(imgData,'PNG',0,position,imgW,imgH);
    heightLeft -= pageHeight;
    while(heightLeft > 0){
      position = heightLeft - imgH;
      pdf.addPage();
      pdf.addImage(imgData,'PNG',0,position,imgW,imgH);
      heightLeft -= pageHeight;
    }
    pdf.save((r.name||'resume').replace(/\s+/g,'_')+'.pdf');
    setFlag('downloaded');
    toast(isPremium() ? 'Downloaded — no watermark' : 'Downloaded with watermark — upgrade to remove it');
  }catch(err){
    toast('Could not generate PDF in this browser.');
  }
  btn.textContent = oldLabel; btn.disabled = false;
}

/* ===================== COVER LETTERS ===================== */
function coversView(){
  return `
  <div class="page-head"><div><h1>${t('cover_letters')}</h1><p class="muted">${S.covers.length} saved letter${S.covers.length===1?'':'s'}.</p></div>
    <button class="btn btn-primary" id="new-cover-btn">+ New cover letter</button></div>
  <div class="grid-cards">
    ${S.covers.map(c=>`<div class="card">
      <strong>${esc(c.title)}</strong><p class="muted" style="font-size:12px;">Updated ${new Date(c.updatedAt).toLocaleDateString()}</p>
      <p style="font-size:12.5px;max-height:60px;overflow:hidden;">${esc(c.body).slice(0,160)}...</p>
      <div style="display:flex;gap:6px;"><button class="btn btn-sm" data-edit-cover="${c.id}">Edit</button><button class="btn btn-sm btn-danger" data-del-cover="${c.id}">Delete</button></div>
    </div>`).join('') || '<p class="muted">No cover letters yet.</p>'}
  </div>
  <div id="cover-editor"></div>`;
}
function coverEditorHtml(cover){
  const resumeOptions = S.resumes.map(r=>`<option value="${r.id}">${esc(r.name)}</option>`).join('');
  return `<div class="card" style="margin-top:20px;">
    <div class="field"><label>Letter title</label><input id="cv-title" type="text" value="${esc(cover.title||'')}" placeholder="Cover letter — Product Designer at Acme"></div>
    <div class="row row-2">
      <div class="field"><label>Based on resume</label><select id="cv-resume">${resumeOptions}</select></div>
      <div class="field"><label>Company / role</label><input id="cv-role" type="text" placeholder="Acme Inc — Product Designer"></div>
    </div>
    <div class="field"><label>Job description (for AI draft)</label><textarea id="cv-jd" rows="3" placeholder="Paste the job posting here..."></textarea></div>
    <button class="btn btn-gold btn-sm" id="cv-generate">&#10024; Generate with AI ${!isPremium()?'<span class="badge badge-outline" style="margin-left:4px;">Pro</span>':''}</button>
    <div class="field" style="margin-top:12px;"><label>Letter body</label><textarea id="cv-body" rows="10">${esc(cover.body||'')}</textarea></div>
    <button class="btn btn-primary" id="cv-save">Save cover letter</button>
  </div>`;
}
let editingCover = null;
function bindCovers(){
  document.getElementById('new-cover-btn').addEventListener('click', ()=>{
    editingCover = {id:null, title:'', body:''};
    document.getElementById('cover-editor').innerHTML = coverEditorHtml(editingCover);
    bindCoverEditor();
  });
  document.querySelectorAll('[data-edit-cover]').forEach(b=>b.addEventListener('click', ()=>{
    editingCover = S.covers.find(c=>c.id===b.dataset.editCover);
    document.getElementById('cover-editor').innerHTML = coverEditorHtml(editingCover);
    bindCoverEditor();
  }));
  document.querySelectorAll('[data-del-cover]').forEach(b=>b.addEventListener('click', async ()=>{
    try{ await api(`/api/covers/${b.dataset.delCover}`, {method:'DELETE'}); S.covers = S.covers.filter(c=>c.id!==b.dataset.delCover); render(); }
    catch(e){ toast(e.message); }
  }));
}
function bindCoverEditor(){
  document.getElementById('cv-save').addEventListener('click', async ()=>{
    const title = document.getElementById('cv-title').value || 'Untitled letter';
    const body = document.getElementById('cv-body').value;
    try{
      if(editingCover.id){
        const {cover} = await api(`/api/covers/${editingCover.id}`, {method:'PUT', body:{title, body}});
        const idx = S.covers.findIndex(c=>c.id===cover.id); S.covers[idx] = cover;
      } else {
        const {cover} = await api('/api/covers', {method:'POST', body:{title, body}});
        S.covers.unshift(cover);
      }
      toast('Cover letter saved'); render();
    }catch(e){ toast(e.message); }
  });
  document.getElementById('cv-generate').addEventListener('click', async ()=>{
    if(!isPremium()){ toast('Upgrade to premium to use AI generation'); return; }
    const resumeId = document.getElementById('cv-resume').value;
    const role = document.getElementById('cv-role').value;
    const jd = document.getElementById('cv-jd').value;
    const btn = document.getElementById('cv-generate');
    const old = btn.innerHTML; btn.innerHTML = '<span class="spinner"></span> Writing...'; btn.disabled = true;
    try{
      const input = `Role: ${role || 'the role'}\n\nJob description:\n${jd || 'not provided'}`;
      const {text} = await api('/api/ai/generate', {method:'POST', body:{tool:'cover', input, resumeId}});
      document.getElementById('cv-body').value = text;
    }catch(e){ toast('AI request failed: ' + e.message); }
    btn.innerHTML = old; btn.disabled = false;
  });
}

/* ===================== ATS SCORE ===================== */
function atsView(){
  if(!isPremium()) return atsUpgradeGate();
  const resumeOptions = S.resumes.map(r=>`<option value="${r.id}">${esc(r.name)}</option>`).join('');
  const result = S.atsResult;
  return `
  <div class="page-head"><div><h1>${t('ats_score')}</h1><p class="muted">See how closely a resume matches a job description's language.</p></div></div>
  <div class="row row-2">
    <div class="card">
      <div class="field"><label>Resume</label><select id="ats-resume">${resumeOptions}</select></div>
      <div class="field"><label>Job description</label><textarea id="ats-jd" rows="10" placeholder="Paste the full job posting here..."></textarea></div>
      <button class="btn btn-primary" id="ats-run">Check score</button>
    </div>
    <div class="card">
      ${result ? `
        <div class="gauge" style="background:conic-gradient(${gaugeColor(result.score)} ${result.score*3.6}deg, var(--surface-2) 0deg);">
          <div style="width:112px;height:112px;border-radius:50%;background:var(--surface);display:flex;align-items:center;justify-content:center;">
            <div class="num">${result.score}%</div>
          </div>
        </div>
        <p style="text-align:center;" class="muted">Keyword match against the job description</p>
        <div class="section-title" style="margin-top:14px;">Matched keywords</div>
        <div class="tagbar">${result.matched.map(w=>`<span class="tag">${esc(w)}</span>`).join('') || '<span class="muted">None yet</span>'}</div>
        <div class="section-title">Missing keywords worth adding</div>
        <div class="tagbar">${result.missing.map(w=>`<span class="tag">${esc(w)}</span>`).join('') || '<span class="muted">Great coverage!</span>'}</div>
      ` : '<p class="muted">Run a check to see your score, matched keywords, and gaps.</p>'}
    </div>
  </div>`;
}
function gaugeColor(score){ return score>=70?'#3B6D11':score>=40?'#8C5B0B':'#8C2A2A'; }
function atsUpgradeGate(){
  return `<div class="page-head"><h1>${t('ats_score')}</h1></div>
  <div class="upgrade-card"><h3>ATS score checker is a premium feature</h3>
  <p class="muted">Upgrade to see how well your resume matches any job description, with matched and missing keywords.</p>
  <button class="btn btn-gold" data-nav="subscription">${t('upgrade')}</button></div>`;
}
function bindAts(){
  const runBtn = document.getElementById('ats-run');
  if(!runBtn) return;
  runBtn.addEventListener('click', async ()=>{
    const resumeId = document.getElementById('ats-resume').value;
    const jobDescription = document.getElementById('ats-jd').value;
    if(!resumeId || !jobDescription.trim()){ toast('Paste a job description first'); return; }
    const old = runBtn.innerHTML; runBtn.innerHTML = '<span class="spinner"></span> Checking...'; runBtn.disabled = true;
    try{
      S.atsResult = await api('/api/ai/ats-check', {method:'POST', body:{resumeId, jobDescription}});
      render();
    }catch(e){ toast(e.message); runBtn.innerHTML = old; runBtn.disabled = false; }
  });
}

/* ===================== AI ASSISTANT ===================== */
let aiResumeContext = null;
const AI_TOOLS = [
  {id:'writer', ic:'&#9997;', title:'Resume writer', desc:'Draft a professional summary or bullet points'},
  {id:'cover', ic:'&#9993;', title:'Cover letter', desc:'Generate a tailored cover letter'},
  {id:'interview', ic:'&#128172;', title:'Interview questions', desc:'Likely questions for a role'},
  {id:'grammar', ic:'&#9989;', title:'Grammar checker', desc:'Fix grammar and tighten wording'},
  {id:'improve', ic:'&#128200;', title:'Improve my resume', desc:'Get targeted suggestions'}
];
function aiView(){
  if(!isPremium()) return aiUpgradeGate();
  const resumeOptions = S.resumes.map(r=>`<option value="${r.id}" ${r.id===aiResumeContext?'selected':''}>${esc(r.name)}</option>`).join('');
  return `
  <div class="page-head"><div><h1>${t('ai_assistant')}</h1><p class="muted">Powered by Gemini. Choose a tool and give it something to work with.</p></div></div>
  <div class="ai-tools">
    ${AI_TOOLS.map(tool=>`<button class="ai-tool-btn ${S.aiTool===tool.id?'active':''}" data-ai-tool="${tool.id}">
        <span class="ic">${tool.ic}</span><span class="t">${tool.title}</span><div class="d">${tool.desc}</div></button>`).join('')}
  </div>
  <div class="card">
    <div class="field"><label>Resume context</label><select id="ai-resume">${resumeOptions}</select></div>
    <div class="field"><label>${aiInputLabel()}</label><textarea id="ai-input" rows="4" placeholder="${aiInputPlaceholder()}"></textarea></div>
    <button class="btn btn-primary" id="ai-run">Generate</button>
    <div class="section-title">Result</div>
    <div class="ai-output">${S.aiOutput ? esc(S.aiOutput) : '<span class="muted">Output will appear here.</span>'}</div>
    ${S.aiOutput ? `<div style="margin-top:10px;display:flex;gap:8px;"><button class="btn btn-sm" id="ai-copy">Copy</button>${S.aiTool==='writer' ? '<button class="btn btn-sm" id="ai-insert">Insert into summary</button>' : ''}</div>` : ''}
  </div>`;
}
function aiInputLabel(){
  return {writer:'Job title / focus for the summary', cover:'Job description', interview:'Job title / description', grammar:'Paste text to check', improve:'Anything specific to focus on (optional)'}[S.aiTool];
}
function aiInputPlaceholder(){
  return {writer:'e.g. Senior backend engineer, 8 years, fintech', cover:'Paste the job posting...', interview:'e.g. Data analyst at a healthcare startup', grammar:'Paste a paragraph from your resume...', improve:'e.g. Make it sound more results-driven'}[S.aiTool];
}
function aiUpgradeGate(){
  return `<div class="page-head"><h1>${t('ai_assistant')}</h1></div>
  <div class="upgrade-card"><h3>AI tools are part of premium</h3>
  <p class="muted">AI resume writer, cover letter generator, interview prep and grammar checking — all powered by Gemini.</p>
  <button class="btn btn-gold" data-nav="subscription">${t('upgrade')}</button></div>`;
}
function bindAi(){
  document.querySelectorAll('[data-ai-tool]').forEach(b=>b.addEventListener('click', ()=>{ S.aiTool=b.dataset.aiTool; S.aiOutput=''; render(); }));
  const runBtn = document.getElementById('ai-run');
  if(!runBtn) return;
  document.getElementById('ai-resume').addEventListener('change', e=> aiResumeContext = e.target.value);
  runBtn.addEventListener('click', async ()=>{
    const resumeId = document.getElementById('ai-resume').value;
    const input = document.getElementById('ai-input').value;
    const old = runBtn.innerHTML; runBtn.innerHTML = '<span class="spinner"></span> Working...'; runBtn.disabled = true;
    try{
      const {text} = await api('/api/ai/generate', {method:'POST', body:{tool:S.aiTool, input, resumeId}});
      S.aiOutput = text;
      setFlag('ai_tried');
    }catch(e){ toast('AI request failed: ' + e.message); }
    runBtn.innerHTML = old; runBtn.disabled = false;
    render();
  });
  const copyBtn = document.getElementById('ai-copy');
  if(copyBtn) copyBtn.addEventListener('click', ()=>{ navigator.clipboard.writeText(S.aiOutput); toast('Copied'); });
  const insBtn = document.getElementById('ai-insert');
  if(insBtn) insBtn.addEventListener('click', async ()=>{
    const r = findResume(document.getElementById('ai-resume').value);
    if(r){ r.data.personal.summary = S.aiOutput; await saveResumeNow(r); toast('Inserted into resume summary'); }
  });
}

/* ===================== JOB TRACKER ===================== */
function jobsView(){
  return `
  <div class="page-head"><div><h1>${t('job_tracker')}</h1><p class="muted">${S.jobs.length} application${S.jobs.length===1?'':'s'} tracked.</p></div></div>
  <div class="card">
    <div class="row row-3">
      <div class="field"><label>Company</label><input id="job-company" type="text"></div>
      <div class="field"><label>Role</label><input id="job-role" type="text"></div>
      <div class="field"><label>Status</label><select id="job-status">
        <option>Saved</option><option>Applied</option><option>Interview</option><option>Offer</option><option>Rejected</option></select></div>
    </div>
    <div class="row row-2">
      <div class="field"><label>Date</label><input id="job-date" type="date"></div>
      <div class="field"><label>Notes</label><input id="job-notes" type="text"></div>
    </div>
    <button class="btn btn-primary" id="job-add">Add application</button>
  </div>
  <div class="section-title">Applications</div>
  <div class="card">
    <table class="simple"><thead><tr><th>Company</th><th>Role</th><th>Status</th><th>Date</th><th></th></tr></thead>
    <tbody>${S.jobs.map(j=>`<tr>
      <td>${esc(j.company)}</td><td>${esc(j.role)}</td>
      <td><span class="status-chip status-${j.status}">${j.status}</span></td>
      <td>${j.date||'—'}</td>
      <td><button class="btn btn-sm btn-danger" data-del-job="${j.id}">Remove</button></td>
    </tr>`).join('') || `<tr><td colspan="5" class="muted">No applications yet.</td></tr>`}</tbody></table>
  </div>`;
}
function bindJobs(){
  document.getElementById('job-add').addEventListener('click', async ()=>{
    const company = document.getElementById('job-company').value.trim();
    const role = document.getElementById('job-role').value.trim();
    if(!company || !role){ toast('Company and role are required'); return; }
    try{
      const {job} = await api('/api/jobs', {method:'POST', body:{company, role, status:document.getElementById('job-status').value,
        date:document.getElementById('job-date').value, notes:document.getElementById('job-notes').value}});
      S.jobs.unshift(job); render();
    }catch(e){ toast(e.message); }
  });
  document.querySelectorAll('[data-del-job]').forEach(b=>b.addEventListener('click', async ()=>{
    try{ await api(`/api/jobs/${b.dataset.delJob}`, {method:'DELETE'}); S.jobs = S.jobs.filter(j=>j.id!==b.dataset.delJob); render(); }
    catch(e){ toast(e.message); }
  }));
}

/* ===================== PROFILE ===================== */
function profileView(){
  const p = S.profile;
  return `
  <div class="page-head"><h1>${t('profile')}</h1></div>
  <div class="card" style="max-width:560px;">
    <div class="field"><label>Full name</label><input id="pf-name" type="text" value="${esc(p.name)}"></div>
    <div class="field"><label>Email</label><input type="email" value="${esc(p.email||'')}" disabled></div>
    <div class="row row-2">
      <div class="field"><label>Phone</label><input id="pf-phone" type="text" value="${esc(p.phone||'')}"></div>
      <div class="field"><label>Location</label><input id="pf-location" type="text" value="${esc(p.location||'')}"></div>
    </div>
    <div class="field"><label>Personal website / portfolio ${!isPremium()?'<span class="badge badge-gold">Pro</span>':''}</label>
      <input id="pf-website" type="text" value="${esc(p.website||'')}" ${!isPremium()?'disabled placeholder="Upgrade to add a portfolio link"':''}></div>
    <button class="btn btn-primary" id="pf-save">${t('save')}</button>
  </div>`;
}
function bindProfile(){
  document.getElementById('pf-save').addEventListener('click', async ()=>{
    try{
      const {user} = await api('/api/auth/me', {method:'PUT', body:{
        name:document.getElementById('pf-name').value, phone:document.getElementById('pf-phone').value,
        location:document.getElementById('pf-location').value,
        website: isPremium() ? document.getElementById('pf-website').value : undefined
      }});
      S.profile = user; toast('Profile updated'); render();
    }catch(e){ toast(e.message); }
  });
}

/* ===================== SUBSCRIPTION ===================== */
const REGIONS = [
  {id:'NG', label:'Nigeria', price:'\u20a65,000', hint:'billed in NGN'},
  {id:'AFRICA', label:'Rest of Africa', price:'\u20a68,000', hint:'billed in NGN'},
  {id:'INTL', label:'Outside Africa', price:'$10', hint:'billed in USD'},
];
function guessRegion(){
  try{
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if(tz === 'Africa/Lagos') return 'NG';
    if(tz.startsWith('Africa/')) return 'AFRICA';
  }catch(e){}
  return 'INTL';
}
let selectedRegion = guessRegion();
function subscriptionView(){
  return `
  <div class="page-head"><h1>${t('subscription')}</h1></div>
  <p class="muted" style="max-width:640px;">Payments are processed securely by Flutterwave. You'll be redirected to a Flutterwave checkout page and brought back here once it's done.</p>
  <div class="row row-2" style="align-items:stretch;">
    <div class="card">
      <h3>Free</h3><p class="muted" style="font-size:13px;">Everything you need to build and download a resume.</p>
      <ul style="padding-left:18px;font-size:13.5px;line-height:1.9;">
        <li>Create a resume in minutes</li><li>50+ professional templates</li><li>Live preview</li>
        <li>Download as PDF (watermarked)</li><li>Save resumes online</li><li>Dark mode</li>
        <li>Multiple languages</li><li>Mobile-friendly design</li>
      </ul>
      ${!isPremium() ? '<span class="badge badge-outline">Current plan</span>' : ''}
    </div>
    <div class="card" style="border-color:var(--gold);">
      <h3>Premium <span class="badge badge-gold">Best value</span></h3><p class="muted" style="font-size:13px;">Everything in Free, plus AI and unlimited exports.</p>
      <ul style="padding-left:18px;font-size:13.5px;line-height:1.9;">
        <li>ATS score checker</li><li>AI resume writer</li><li>AI cover letter generator</li>
        <li>AI interview questions</li><li>Resume grammar checker</li><li>Resume improvement suggestions</li>
        <li>Unlimited PDF downloads</li><li>No watermark</li><li>Premium templates</li><li>Personal website / portfolio link</li>
      </ul>
      ${isPremium() ? '<span class="badge badge-accent">Current plan</span>' : `
        <div class="section-title" style="margin-top:4px;">Where are you paying from?</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;">
          ${REGIONS.map(r=>`<button class="pill-tab ${selectedRegion===r.id?'active':''}" data-region="${r.id}">${r.label} — ${r.price}</button>`).join('')}
        </div>
        <button class="btn btn-gold" id="upgrade-btn">${t('upgrade')} — ${REGIONS.find(r=>r.id===selectedRegion).price}</button>
      `}
    </div>
  </div>`;
}
function bindSubscription(){
  document.querySelectorAll('[data-region]').forEach(b=>b.addEventListener('click', ()=>{ selectedRegion = b.dataset.region; render(); }));
  const up = document.getElementById('upgrade-btn');
  if(up) up.addEventListener('click', async ()=>{
    const old = up.innerHTML; up.innerHTML = '<span class="spinner"></span> Redirecting...'; up.disabled = true;
    try{
      const {paymentLink} = await api('/api/payments/initialize', {method:'POST', body:{region:selectedRegion}});
      window.location.href = paymentLink;
    }catch(e){ toast(e.message); up.innerHTML = old; up.disabled = false; }
  });
}

/* ===================== BOOT ===================== */
boot();

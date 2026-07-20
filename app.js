import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

/* ---------------- Setup ---------------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const show = (id) => { $$(".auth-wrap,.ob-wrap,#screen-app,#screen-loading").forEach(e=>e&&e.classList.add("hidden")); const el=document.getElementById(id); if(el) el.classList.remove("hidden"); };

if (String(SUPABASE_URL).includes("COLE_") || String(SUPABASE_ANON_KEY).includes("COLE_")) {
  document.getElementById("screen-loading").innerHTML =
    '<div style="max-width:420px;text-align:center;padding:24px">' +
    '<h2 style="margin-bottom:10px">Falta configurar o Supabase</h2>' +
    '<p style="color:var(--muted)">Abra o arquivo <b>config.js</b> e cole a sua <b>Project URL</b> e a <b>anon key</b> do Supabase. Depois recarregue esta página.</p></div>';
  throw new Error("Configure config.js");
}

const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const money = (n) => BRL.format(Number(n) || 0);
const state = { user: null, profile: null };
const data = { categories: [], transactions: [], bills: [], payments: [], budgets: [], goals: [] };
let period = ymOf(new Date());
let currentTab = "inicio";

function ymOf(d){ return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0"); }
function todayStr(){ return ymOf(new Date())+"-"+String(new Date().getDate()).padStart(2,"0"); }
function periodLabel(p){ const [y,m]=p.split("-").map(Number); const s=new Date(y,m-1,1).toLocaleDateString("pt-BR",{month:"long",year:"numeric"}); return s.charAt(0).toUpperCase()+s.slice(1); }
function periodBounds(p){ const [y,m]=p.split("-").map(Number); const last=new Date(y,m,0).getDate(); return { start:`${p}-01`, end:`${p}-${String(last).padStart(2,"0")}` }; }
function shiftPeriod(p,delta){ const [y,m]=p.split("-").map(Number); const d=new Date(y,m-1+delta,1); return ymOf(d); }
function fmtDate(s){ const [y,m,d]=s.split("-"); return `${d}/${m}`; }
function daysUntil(s){ const t=new Date(todayStr()); const d=new Date(s); return Math.round((d-t)/86400000); }
function esc(s){ return String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c])); }

/* Ícones outline (Lucide, licença ISC) */
const ICON = {
  user:'<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  tag:'<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2 2 0 0 0 2.828 0l6.586-6.586a2 2 0 0 0 0-2.828z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
  logout:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
  alert:'<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  clock:'<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  check:'<path d="M21.8 10A10 10 0 1 1 17 3.3"/><path d="m9 11 3 3L22 4"/>',
  piggy:'<path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2V5z"/><path d="M2 9v1c0 1.1.9 2 2 2h1"/><path d="M16 11h.01"/>',
  edit:'<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/>'
};
function ic(name, size=18){ return `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[name]||""}</svg>`; }

/* ---------------- Toast ---------------- */
let toastT;
function toast(msg){ const t=$("#toast"); t.textContent=msg; t.classList.add("show"); clearTimeout(toastT); toastT=setTimeout(()=>t.classList.remove("show"),2200); }

/* ---------------- Theme ---------------- */
function initTheme(){
  const saved = localStorage.getItem("mb-theme");
  if(saved) document.documentElement.setAttribute("data-theme",saved);
}
$("#theme-toggle").onclick = () => {
  const cur = document.documentElement.getAttribute("data-theme") || "light";
  const next = cur==="dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme",next);
  localStorage.setItem("mb-theme",next);
};
initTheme();

/* ================= AUTH ================= */
let authMode = "login";
function setAuthMode(m){
  authMode = m;
  $("#tab-login").classList.toggle("active", m==="login");
  $("#tab-signup").classList.toggle("active", m==="signup");
  $("#field-name").style.display = m==="signup" ? "block" : "none";
  $("#in-pass").autocomplete = m==="signup" ? "new-password" : "current-password";
  $("#auth-submit").querySelector("span").textContent = m==="signup" ? "Criar conta" : "Entrar";
  $("#auth-msg").innerHTML = "";
}
$("#tab-login").onclick = () => setAuthMode("login");
$("#tab-signup").onclick = () => setAuthMode("signup");

function authMsg(text, kind="err"){ $("#auth-msg").innerHTML = `<div class="authmsg ${kind}">${esc(text)}</div>`; }
function mapErr(e){
  const m = (e && e.message || "").toLowerCase();
  if(m.includes("invalid login")) return "E-mail ou senha incorretos.";
  if(m.includes("email not confirmed")) return "Confirme seu e-mail antes de entrar (veja sua caixa de entrada).";
  if(m.includes("already registered")||m.includes("already been registered")) return "Este e-mail já tem conta. Tente entrar.";
  if(m.includes("password")) return "Senha inválida (mínimo 6 caracteres).";
  if(m.includes("failed to fetch")||m.includes("network")) return "Sem conexão com o servidor. Tente de novo em instantes.";
  return (e && e.message) || "Algo deu errado. Tente novamente.";
}

$("#auth-form").onsubmit = async (ev) => {
  ev.preventDefault();
  const email = $("#in-email").value.trim();
  const pass = $("#in-pass").value;
  const name = $("#in-name").value.trim();
  const btn = $("#auth-submit");
  btn.disabled = true; const label = btn.querySelector("span").textContent; btn.querySelector("span").textContent = "Aguarde…";
  try{
    if(authMode==="signup"){
      const { data:d, error } = await sb.auth.signUp({ email, password:pass });
      if(error) throw error;
      if(!d.session){ authMsg("Conta criada! Confirme pelo link no seu e-mail e depois entre.","ok"); setAuthMode("login"); return; }
      if(name){ await sb.from("profiles").update({ name }).eq("id", d.user.id); }
    } else {
      const { error } = await sb.auth.signInWithPassword({ email, password:pass });
      if(error) throw error;
    }
  }catch(e){ authMsg(mapErr(e)); }
  finally{ btn.disabled=false; btn.querySelector("span").textContent = label; }
};

$("#forgot").onclick = async () => {
  const email = $("#in-email").value.trim();
  if(!email){ authMsg("Digite seu e-mail acima e clique de novo em 'Esqueci minha senha'."); return; }
  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.href });
  if(error) authMsg(mapErr(error)); else authMsg("Enviamos um link de redefinição para o seu e-mail.","ok");
};

/* ================= INIT / SESSION ================= */
sb.auth.onAuthStateChange((_e, session) => { handleSession(session); });
sb.auth.getSession().then(({data:{session}}) => handleSession(session));

let booted = false;
async function handleSession(session){
  if(!session){ state.user=null; show("screen-auth"); return; }
  if(booted && state.user && state.user.id===session.user.id) return;
  state.user = session.user;
  booted = true;
  show("screen-loading");
  const { data:prof } = await sb.from("profiles").select("*").eq("id", session.user.id).maybeSingle();
  state.profile = prof || { id:session.user.id, onboarding_completed:false };
  if(!state.profile.onboarding_completed){ renderOnboarding(); return; }
  await enterApp();
}

async function enterApp(){
  show("screen-app");
  await loadData();
  renderTab(currentTab);
  updateBell();
}

/* ================= ONBOARDING ================= */
let obStep = 0; const obData = { name:"", income:"" };
function renderOnboarding(){
  show("screen-onboarding");
  const card = $("#ob-card");
  const steps = `<div class="ob-steps">${[0,1,2].map(i=>`<i class="${i<=obStep?"on":""}"></i>`).join("")}</div>`;
  if(obStep===0){
    card.innerHTML = steps + `
      <div class="ob-illu"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2"/><path d="M21 12h-6a2 2 0 0 0 0 4h6v-4z"/></svg></div>
      <h2>Bem-vinda ao Meu Bolso!</h2>
      <p>Em 3 telinhas rápidas você já começa a organizar seu dinheiro. Tudo fica salvo na nuvem e sincroniza entre seus aparelhos.</p>
      <button class="btn" id="ob-next">Vamos começar</button>`;
    $("#ob-next").onclick = () => { obStep=1; renderOnboarding(); };
  } else if(obStep===1){
    card.innerHTML = steps + `
      <div class="ob-illu">${ic('user',30)}</div>
      <h2>Como podemos te chamar?</h2>
      <p>E, se quiser, quanto costuma receber por mês. (Pode deixar em branco.)</p>
      <div class="field"><label>Seu nome</label><input class="input" id="ob-name" placeholder="Seu nome" value="${esc(obData.name)}"></div>
      <div class="field"><label>Renda mensal aproximada (opcional)</label><input class="input num" id="ob-income" type="number" step="0.01" inputmode="decimal" placeholder="Ex: 3000" value="${esc(obData.income)}"></div>
      <div class="grid2">
        <button class="btn ghost" id="ob-back">Voltar</button>
        <button class="btn" id="ob-next">Continuar</button>
      </div>`;
    $("#ob-back").onclick = () => { obStep=0; renderOnboarding(); };
    $("#ob-next").onclick = () => { obData.name=$("#ob-name").value.trim(); obData.income=$("#ob-income").value; obStep=2; renderOnboarding(); };
  } else {
    const cats = ["Alimentação","Moradia","Transporte","Saúde","Educação","Lazer","Compras","Contas","Assinaturas"];
    card.innerHTML = steps + `
      <div class="ob-illu">${ic('tag',30)}</div>
      <h2>Suas categorias já estão prontas</h2>
      <p>Deixamos estas categorias sugeridas criadas para você. Dá para adicionar ou remover quando quiser, no menu.</p>
      <div class="cat-pick">${cats.map(c=>`<span class="cat-chip on">${c}</span>`).join("")}</div>
      <div class="grid2" style="margin-top:18px">
        <button class="btn ghost" id="ob-back">Voltar</button>
        <button class="btn" id="ob-finish"><span>Concluir</span></button>
      </div>`;
    $("#ob-back").onclick = () => { obStep=1; renderOnboarding(); };
    $("#ob-finish").onclick = async (e) => {
      const b=e.currentTarget; b.disabled=true; b.querySelector("span").textContent="Salvando…";
      const patch = { onboarding_completed:true };
      if(obData.name) patch.name=obData.name;
      if(obData.income!=="" && !isNaN(Number(obData.income))) patch.monthly_income=Number(obData.income);
      await sb.from("profiles").update(patch).eq("id", state.user.id);
      state.profile = { ...state.profile, ...patch };
      await enterApp();
    };
  }
}

/* ================= DATA ================= */
async function loadData(){
  const { start, end } = periodBounds(period);
  const [cats, bills, pays, txs, buds, goals] = await Promise.all([
    sb.from("categories").select("*").order("type").order("name"),
    sb.from("bills").select("*"),
    sb.from("bill_payments").select("*").eq("period", period),
    sb.from("transactions").select("*").gte("date", start).lte("date", end).order("date", { ascending:false }),
    sb.from("budgets").select("*"),
    sb.from("goals").select("*").order("created_at"),
  ]);
  data.categories = cats.data || [];
  data.bills = bills.data || [];
  data.payments = pays.data || [];
  data.transactions = txs.data || [];
  data.budgets = buds.data || [];
  data.goals = goals.data || [];
}
async function refresh(){ await loadData(); renderTab(currentTab); updateBell(); }

const catsByType = (t) => data.categories.filter(c=>c.type===t);

/* Bills helpers */
function billInPeriod(b,p){ const bym=b.due_date.slice(0,7); return b.recurring ? p>=bym : p===bym; }
function billDueDate(b,p){
  if(!b.recurring) return b.due_date;
  const day=Number(b.due_date.slice(8,10)); const [y,m]=p.split("-").map(Number);
  const last=new Date(y,m,0).getDate(); return `${p}-${String(Math.min(day,last)).padStart(2,"0")}`;
}
function billPaid(b,p){ return data.payments.some(x=>x.bill_id===b.id && x.period===p); }
function billsForPeriod(){ return data.bills.filter(b=>billInPeriod(b,period)).map(b=>({...b, _due:billDueDate(b,period), _paid:billPaid(b,period)})).sort((a,b)=>a._due.localeCompare(b._due)); }
function billStatus(b){ if(b._paid) return "paid"; const du=daysUntil(b._due); if(du<0) return "late"; if(du<=5) return "due"; return "next"; }
// Contas marcadas como pagas contam como despesas do mês.
function paidBillsForPeriod(){ return billsForPeriod().filter(b=>b._paid).map(b=>({ category:b.category||"Outros", amount:Number(b.amount), date:b._due })); }

/* Totals */
function totals(){
  let inc=0, exp=0;
  data.transactions.forEach(t=> t.type==="income" ? inc+=Number(t.amount) : exp+=Number(t.amount));
  const bills = billsForPeriod();
  exp += bills.filter(b=>b._paid).reduce((s,b)=>s+Number(b.amount),0);
  const toPay = bills.filter(b=>!b._paid).reduce((s,b)=>s+Number(b.amount),0);
  return { inc, exp, bal:inc-exp, toPay };
}

/* ================= NAV ================= */
$$("#tabbar a").forEach(a=>{
  a.onclick = () => { currentTab = a.dataset.tab; $$("#tabbar a").forEach(x=>x.classList.toggle("active",x===a)); renderTab(currentTab); window.scrollTo(0,0); };
});
$("#month-prev").onclick = async () => { period=shiftPeriod(period,-1); updateMonthLabel(); await refresh(); };
$("#month-next").onclick = async () => { period=shiftPeriod(period,1); updateMonthLabel(); await refresh(); };
function updateMonthLabel(){ $("#month-label").textContent = periodLabel(period); }

function renderTab(tab){
  updateMonthLabel();
  const m = $("#app-main");
  if(tab==="inicio") return renderInicio(m);
  if(tab==="contas") return renderContas(m);
  if(tab==="lancar") return renderLancar(m);
  if(tab==="orcamento") return renderOrcamento(m);
  if(tab==="metas") return renderMetas(m);
}

/* ================= INÍCIO ================= */
function renderInicio(m){
  const t = totals();
  const bills = billsForPeriod();
  const late = bills.filter(b=>billStatus(b)==="late");
  const due = bills.filter(b=>billStatus(b)==="due");
  const upcoming = bills.filter(b=>!b._paid).slice(0,4);

  let html = `<h1 class="page-title">Olá${state.profile.name?`, ${esc(state.profile.name.split(" ")[0])}`:""}</h1>`;

  if(late.length || due.length){
    html += `<div style="margin-bottom:10px">`;
    if(late.length) html += `<div class="alert-bar late">${ic('alert',16)} ${late.length} conta(s) vencida(s) — ${money(late.reduce((s,b)=>s+ +b.amount,0))}</div>`;
    if(due.length) html += `<div class="alert-bar due">${ic('clock',16)} ${due.length} conta(s) vencendo em breve</div>`;
    html += `</div>`;
  }

  html += `<div class="summary">
    <div class="scard big"><div class="lbl">Saldo do mês</div><div class="val num ${t.bal>=0?"pos":"neg"}">${money(t.bal)}</div></div>
    <div class="scard"><div class="lbl">Entradas</div><div class="val num pos">${money(t.inc)}</div></div>
    <div class="scard"><div class="lbl">Saídas</div><div class="val num neg">${money(t.exp)}</div></div>
    <div class="scard"><div class="lbl">A pagar</div><div class="val num warn">${money(t.toPay)}</div></div>
  </div>`;

  // Donut despesas por categoria
  html += `<div class="section"><h2>Despesas por categoria</h2><div class="sub">${periodLabel(period)}</div><div id="donut-slot"></div></div>`;
  // Evolução
  html += `<div class="section"><h2>Últimos 6 meses</h2><div class="sub">Entradas x Saídas</div><div id="evo-slot" class="empty">Carregando…</div></div>`;

  // Próximas contas
  html += `<div class="section"><div class="row-head"><h2>Próximas contas</h2><button class="mini" id="go-contas">ver todas ›</button></div>`;
  if(!upcoming.length) html += `<div class="empty">${ic('check',22)}<div>Nenhuma conta em aberto neste mês</div></div>`;
  else html += upcoming.map(b=>billRow(b)).join("");
  html += `</div>`;

  m.innerHTML = html;
  $("#go-contas") && ($("#go-contas").onclick = () => { document.querySelector('#tabbar a[data-tab="contas"]').click(); });
  bindBillRows(m);
  $("#donut-slot").innerHTML = donutHTML();
  loadEvolution();
}

function donutHTML(){
  const exp = data.transactions.filter(t=>t.type==="expense").map(t=>({category:t.category,amount:Number(t.amount)})).concat(paidBillsForPeriod());
  if(!exp.length) return `<div class="empty">Sem despesas lançadas neste mês.</div>`;
  const map = {};
  exp.forEach(t=>{ const k=t.category||"Outros"; map[k]=(map[k]||0)+Number(t.amount); });
  const entries = Object.entries(map).sort((a,b)=>b[1]-a[1]);
  const total = entries.reduce((s,e)=>s+e[1],0);
  const colorFor = (name)=> (data.categories.find(c=>c.name===name&&c.type==="expense")||{}).color || "#94a3b8";
  const R=54, C=2*Math.PI*R; let off=0;
  const segs = entries.map(([name,val])=>{ const frac=val/total; const len=frac*C; const s=`<circle r="${R}" cx="70" cy="70" fill="none" stroke="${colorFor(name)}" stroke-width="22" stroke-dasharray="${len} ${C-len}" stroke-dashoffset="${-off}" transform="rotate(-90 70 70)"/>`; off+=len; return s; }).join("");
  const legend = entries.map(([name,val])=>`<span><i style="background:${colorFor(name)}"></i>${esc(name)} · ${money(val)}</span>`).join("");
  return `<div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap;margin-top:8px">
    <svg width="140" height="140" viewBox="0 0 140 140" style="flex:none">${segs}
      <text x="70" y="66" text-anchor="middle" font-size="11" fill="var(--muted)">Total</text>
      <text x="70" y="82" text-anchor="middle" font-size="15" font-weight="800" fill="var(--ink)">${money(total).replace("R$","R$ ")}</text>
    </svg>
    <div class="legend" style="flex:1;min-width:160px">${legend}</div></div>`;
}

async function loadEvolution(){
  const slot = $("#evo-slot"); if(!slot) return;
  const [y,m]=period.split("-").map(Number);
  const startStr = ymOf(new Date(y,m-6,1))+"-01";
  const { end } = periodBounds(period);
  const { data:rows } = await sb.from("transactions").select("type,amount,date").gte("date",startStr).lte("date",end);
  const months=[]; for(let i=5;i>=0;i--){ months.push(ymOf(new Date(y,m-1-i,1))); }
  const agg={}; months.forEach(mm=>agg[mm]={inc:0,exp:0});
  (rows||[]).forEach(r=>{ const k=r.date.slice(0,7); if(agg[k]){ r.type==="income"?agg[k].inc+=+r.amount:agg[k].exp+=+r.amount; } });
  // adiciona contas pagas como saídas em cada mês
  const { data:pays } = await sb.from("bill_payments").select("period,bill_id").gte("period",months[0]).lte("period",period);
  (pays||[]).forEach(p=>{ const b=data.bills.find(x=>x.id===p.bill_id); if(b && agg[p.period]) agg[p.period].exp += Number(b.amount); });
  const max = Math.max(1, ...months.flatMap(mm=>[agg[mm].inc,agg[mm].exp]));
  const bars = months.map(mm=>{
    const a=agg[mm]; const hi=(a.inc/max*100), he=(a.exp/max*100);
    const lbl=new Date(mm+"-01").toLocaleDateString("pt-BR",{month:"short"}).replace(".","");
    return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px">
      <div style="display:flex;gap:3px;align-items:flex-end;height:90px">
        <div title="Entradas ${money(a.inc)}" style="width:11px;height:${hi}%;min-height:2px;background:var(--pos);border-radius:3px"></div>
        <div title="Saídas ${money(a.exp)}" style="width:11px;height:${he}%;min-height:2px;background:var(--neg);border-radius:3px"></div>
      </div>
      <div style="font-size:11px;color:var(--muted);text-transform:capitalize">${lbl}</div></div>`;
  }).join("");
  slot.classList.remove("empty");
  slot.innerHTML = `<div style="display:flex;gap:6px;align-items:flex-end;margin-top:12px">${bars}</div>
    <div class="legend" style="margin-top:10px"><span><i style="background:var(--pos)"></i>Entradas</span><span><i style="background:var(--neg)"></i>Saídas</span></div>`;
}

/* ================= CONTAS ================= */
function billRow(b){
  const st = billStatus(b);
  const pill = st==="paid"?`<span class="pill paid">Paga</span>`: st==="late"?`<span class="pill late">Vencida</span>`: st==="due"?`<span class="pill due">Vence ${fmtDate(b._due)}</span>`:"";
  return `<div class="item" data-bill="${b.id}">
    <button class="chk ${b._paid?"on":""}" data-pay="${b.id}" aria-label="Marcar paga">✓</button>
    <div class="grow"><div class="t1">${esc(b.name)}${b.recurring?' <span style="color:var(--muted);font-weight:400">· mensal</span>':""}</div>
      <div class="t2">Vence ${fmtDate(b._due)} · ${esc(b.category||"—")}</div></div>
    ${pill}
    <div class="amt num">${money(b.amount)}</div>
    <button class="mini" data-editbill="${b.id}">${ic('edit',15)}</button>
  </div>`;
}
function bindBillRows(root){
  $$("[data-pay]",root).forEach(el=> el.onclick = () => togglePaid(el.dataset.pay));
  $$("[data-editbill]",root).forEach(el=> el.onclick = () => { const b=data.bills.find(x=>x.id===el.dataset.editbill); openBillModal(b); });
}
async function togglePaid(billId){
  const paid = billPaid({id:billId}, period);
  if(paid){ await sb.from("bill_payments").delete().eq("bill_id",billId).eq("period",period); }
  else { await sb.from("bill_payments").insert({ user_id:state.user.id, bill_id:billId, period }); toast("Conta marcada como paga ✓"); }
  await refresh();
}
function renderContas(m){
  const bills = billsForPeriod();
  const openSum = bills.filter(b=>!b._paid).reduce((s,b)=>s+ +b.amount,0);
  let html = `<div class="row-head"><h1 class="page-title" style="margin:0">Contas a pagar</h1><button class="btn sm" id="add-bill">＋ Nova conta</button></div>`;
  html += `<div class="summary" style="grid-template-columns:1fr 1fr"><div class="scard"><div class="lbl">Em aberto</div><div class="val num warn">${money(openSum)}</div></div><div class="scard"><div class="lbl">Contas no mês</div><div class="val num">${bills.length}</div></div></div>`;
  html += `<div class="section">`;
  if(!bills.length) html += `<div class="empty"><div>Nenhuma conta cadastrada para ${periodLabel(period)}.</div><button class="btn sm" id="add-bill2" style="margin-top:12px">＋ Adicionar conta</button></div>`;
  else html += bills.map(billRow).join("");
  html += `</div>`;
  m.innerHTML = html;
  bindBillRows(m);
  $("#add-bill").onclick = () => openBillModal();
  $("#add-bill2") && ($("#add-bill2").onclick = () => openBillModal());
}

/* ================= LANÇAMENTOS ================= */
function renderLancar(m){
  const txs = data.transactions;
  let html = `<div class="row-head"><h1 class="page-title" style="margin:0">Lançamentos</h1>
    <div style="display:flex;gap:8px"><button class="btn sm ghost" id="add-inc">＋ Receita</button><button class="btn sm" id="add-exp">＋ Despesa</button></div></div>`;
  html += `<div class="section">`;
  if(!txs.length) html += `<div class="empty"><div>Nenhum lançamento em ${periodLabel(period)}.</div><div style="margin-top:6px;font-size:13px">Registre suas receitas e despesas para acompanhar o saldo.</div></div>`;
  else html += txs.map(t=>{
    const c=(data.categories.find(x=>x.name===t.category&&x.type===t.type)||{}).color||"#94a3b8";
    return `<div class="item">
      <span class="dot" style="background:${c}"></span>
      <div class="grow"><div class="t1">${esc(t.description||t.category||(t.type==="income"?"Receita":"Despesa"))}</div>
        <div class="t2">${esc(t.category||"—")} · ${fmtDate(t.date)}</div></div>
      <div class="amt num" style="color:${t.type==="income"?"var(--pos)":"var(--neg)"}">${t.type==="income"?"+":"−"}${money(t.amount)}</div>
      <button class="mini" data-edittx="${t.id}">${ic('edit',15)}</button>
    </div>`;
  }).join("");
  html += `</div>`;
  m.innerHTML = html;
  $("#add-inc").onclick = () => openTxModal("income");
  $("#add-exp").onclick = () => openTxModal("expense");
  $$("[data-edittx]",m).forEach(el=> el.onclick = () => openTxModal(null, data.transactions.find(x=>x.id===el.dataset.edittx)));
}

/* ================= ORÇAMENTO ================= */
function renderOrcamento(m){
  const spentByCat = {};
  data.transactions.filter(t=>t.type==="expense").forEach(t=>{ const k=t.category||"Outros"; spentByCat[k]=(spentByCat[k]||0)+ +t.amount; });
  paidBillsForPeriod().forEach(b=>{ spentByCat[b.category]=(spentByCat[b.category]||0)+b.amount; });
  let html = `<div class="row-head"><h1 class="page-title" style="margin:0">Orçamento</h1><button class="btn sm" id="add-budget">＋ Definir limite</button></div>`;
  html += `<div class="section"><div class="sub" style="margin-bottom:14px">Limites de gasto por categoria em ${periodLabel(period)}.</div>`;
  if(!data.budgets.length) html += `<div class="empty">Você ainda não definiu limites. Defina quanto quer gastar por categoria.</div>`;
  else html += data.budgets.map(bd=>{
    const spent=spentByCat[bd.category]||0; const lim=Number(bd.monthly_limit); const pct=lim>0?Math.min(100,spent/lim*100):0; const over=spent>lim;
    const color=(data.categories.find(c=>c.name===bd.category&&c.type==="expense")||{}).color||"var(--accent)";
    return `<div style="padding:12px 0;border-top:1px solid var(--line-2)">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
        <div style="display:flex;align-items:center;gap:8px"><span class="dot" style="background:${color}"></span><b>${esc(bd.category)}</b></div>
        <div style="display:flex;align-items:center;gap:8px"><span class="num" style="font-size:13.5px;color:${over?"var(--neg)":"var(--muted)"}">${money(spent)} / ${money(lim)}</span>
        <button class="mini" data-editbud="${esc(bd.category)}">${ic('edit',15)}</button></div>
      </div>
      <div class="bar ${over?"over":""}"><span style="width:${pct}%"></span></div>
      ${over?`<div style="font-size:12px;color:var(--neg);margin-top:5px">Estourou ${money(spent-lim)}</div>`:""}
    </div>`;
  }).join("");
  html += `</div>`;
  m.innerHTML = html;
  $("#add-budget").onclick = () => openBudgetModal();
  $$("[data-editbud]",m).forEach(el=> el.onclick = () => openBudgetModal(data.budgets.find(b=>b.category===el.dataset.editbud)));
}

/* ================= METAS ================= */
function renderMetas(m){
  let html = `<div class="row-head"><h1 class="page-title" style="margin:0">Metas de economia</h1><button class="btn sm" id="add-goal">＋ Nova meta</button></div>`;
  if(!data.goals.length){ html += `<div class="section"><div class="empty"><div>Nenhuma meta ainda.</div><div style="margin-top:6px;font-size:13px">Crie uma meta (viagem, reserva de emergência…) e acompanhe o progresso.</div></div></div>`; }
  else html += data.goals.map(g=>{
    const pct = g.target>0?Math.min(100, g.saved/g.target*100):0;
    return `<div class="section" style="margin-top:12px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
        <div><h2>${esc(g.name)}</h2><div class="sub" style="margin:0">${g.deadline?"até "+fmtDate(g.deadline)+"/"+g.deadline.slice(0,4):"sem prazo"}</div></div>
        <div style="text-align:right"><div class="num" style="font-weight:800;font-size:18px">${Math.round(pct)}%</div></div>
      </div>
      <div class="bar"><span style="width:${pct}%"></span></div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px">
        <span class="num" style="color:var(--muted);font-size:13.5px">${money(g.saved)} de ${money(g.target)}</span>
        <div style="display:flex;gap:6px">
          <button class="btn sm ghost" data-contrib="${g.id}">＋ Guardar</button>
          <button class="mini" data-editgoal="${g.id}">${ic('edit',15)}</button>
        </div>
      </div></div>`;
  }).join("");
  m.innerHTML = html;
  $("#add-goal").onclick = () => openGoalModal();
  $$("[data-contrib]",m).forEach(el=> el.onclick = () => openContribModal(data.goals.find(g=>g.id===el.dataset.contrib)));
  $$("[data-editgoal]",m).forEach(el=> el.onclick = () => openGoalModal(data.goals.find(g=>g.id===el.dataset.editgoal)));
}

/* ================= MODAL FRAMEWORK ================= */
function openModal(title, bodyHTML, onSubmit, extra){
  const root = $("#modal-root");
  root.innerHTML = `<div class="overlay"><div class="modal" role="dialog" aria-modal="true">
    <div class="modal-head"><h3>${esc(title)}</h3><button class="icon-btn" id="mclose" aria-label="Fechar">✕</button></div>
    <form id="mform">${bodyHTML}</form></div></div>`;
  const close = () => { root.innerHTML=""; };
  $("#mclose").onclick = close;
  root.querySelector(".overlay").onclick = (e)=>{ if(e.target.classList.contains("overlay")) close(); };
  $("#mform").onsubmit = async (e)=>{ e.preventDefault(); const btn=$("#mform button[type=submit]"); if(btn) btn.disabled=true; try{ await onSubmit(close); }catch(err){ toast("Erro ao salvar. Tente de novo."); if(btn) btn.disabled=false; } };
  if(extra) extra();
  return close;
}
function catOptions(type, selected){
  return catsByType(type).map(c=>`<option value="${esc(c.name)}" ${c.name===selected?"selected":""}>${esc(c.name)}</option>`).join("")
    + `<option value="__new__">＋ Nova categoria…</option>`;
}
async function maybeCreateCategory(selectEl, type){
  if(selectEl.value!=="__new__") return selectEl.value;
  const name=(prompt("Nome da nova categoria:")||"").trim();
  if(!name){ selectEl.value=""; return null; }
  await sb.from("categories").insert({ user_id:state.user.id, name, type, color:"#64748b" });
  await loadData();
  return name;
}

/* Transação */
function openTxModal(type, existing){
  const isEdit=!!existing; if(existing) type=existing.type;
  const body = `
    <div class="seg type-seg"><button type="button" id="t-exp" class="${type!=="income"?"active":""}">Despesa</button><button type="button" id="t-inc" class="${type==="income"?"active":""}">Receita</button></div>
    <div class="field"><label>Valor (R$)</label><input class="input num" id="t-amount" type="number" step="0.01" inputmode="decimal" required placeholder="0,00" value="${existing?existing.amount:""}"></div>
    <div class="field"><label>Categoria</label><select class="input" id="t-cat"></select></div>
    <div class="field"><label>Descrição (opcional)</label><input class="input" id="t-desc" placeholder="Ex: mercado, salário…" value="${existing?esc(existing.description||""):""}"></div>
    <div class="field"><label>Data</label><input class="input" id="t-date" type="date" required value="${existing?existing.date:(period===ymOf(new Date())?todayStr():periodBounds(period).start)}"></div>
    <button class="btn" type="submit">${isEdit?"Salvar":"Adicionar"}</button>
    ${isEdit?`<button class="btn danger" type="button" id="t-del" style="margin-top:8px">Excluir lançamento</button>`:""}`;
  let curType=type;
  const close = openModal(isEdit?"Editar lançamento":"Novo lançamento", body, async (close)=>{
    const cat = await maybeCreateCategory($("#t-cat"),curType); if(cat===null){ return; }
    const row = { user_id:state.user.id, type:curType, amount:Number($("#t-amount").value), category:cat, description:$("#t-desc").value.trim()||null, date:$("#t-date").value };
    if(isEdit) await sb.from("transactions").update(row).eq("id",existing.id);
    else await sb.from("transactions").insert(row);
    close(); toast(isEdit?"Lançamento atualizado":"Lançamento adicionado"); await refresh();
  }, ()=>{
    const fill=()=>{ $("#t-cat").innerHTML=catOptions(curType, existing?existing.category:""); };
    fill();
    $("#t-exp").onclick=()=>{ curType="expense"; $("#t-exp").classList.add("active"); $("#t-inc").classList.remove("active"); fill(); };
    $("#t-inc").onclick=()=>{ curType="income"; $("#t-inc").classList.add("active"); $("#t-exp").classList.remove("active"); fill(); };
    $("#t-del") && ($("#t-del").onclick=async()=>{ if(confirm("Excluir este lançamento?")){ await sb.from("transactions").delete().eq("id",existing.id); close(); toast("Lançamento excluído"); await refresh(); } });
  });
}

/* Conta */
function openBillModal(existing){
  const isEdit=!!existing;
  const body=`
    <div class="field"><label>Nome da conta</label><input class="input" id="b-name" required placeholder="Ex: Aluguel, Luz, Cartão…" value="${existing?esc(existing.name):""}"></div>
    <div class="grid2">
      <div class="field"><label>Valor (R$)</label><input class="input num" id="b-amount" type="number" step="0.01" inputmode="decimal" required placeholder="0,00" value="${existing?existing.amount:""}"></div>
      <div class="field"><label>Vencimento</label><input class="input" id="b-date" type="date" required value="${existing?existing.due_date:periodBounds(period).start}"></div>
    </div>
    <div class="field"><label>Categoria</label><select class="input" id="b-cat">${catOptions("expense", existing?existing.category:"Contas")}</select></div>
    <label class="check-line"><span class="switch ${existing&&existing.recurring?"on":""}" id="b-rec"></span> Repete todo mês</label>
    <button class="btn" type="submit" style="margin-top:8px">${isEdit?"Salvar":"Adicionar conta"}</button>
    ${isEdit?`<button class="btn danger" type="button" id="b-del" style="margin-top:8px">Excluir conta</button>`:""}`;
  openModal(isEdit?"Editar conta":"Nova conta", body, async(close)=>{
    const cat=await maybeCreateCategory($("#b-cat"),"expense"); if(cat===null) return;
    const rec=$("#b-rec").classList.contains("on");
    const row={ user_id:state.user.id, name:$("#b-name").value.trim(), amount:Number($("#b-amount").value), due_date:$("#b-date").value, category:cat, recurring:rec };
    if(isEdit) await sb.from("bills").update(row).eq("id",existing.id);
    else await sb.from("bills").insert(row);
    close(); toast(isEdit?"Conta atualizada":"Conta adicionada"); await refresh();
  }, ()=>{
    $("#b-rec").onclick=()=>$("#b-rec").classList.toggle("on");
    $("#b-del") && ($("#b-del").onclick=async()=>{ if(confirm("Excluir esta conta? (some de todos os meses)")){ await sb.from("bills").delete().eq("id",existing.id); close(); toast("Conta excluída"); await refresh(); } });
  });
}

/* Orçamento */
function openBudgetModal(existing){
  const isEdit=!!existing;
  const body=`
    <div class="field"><label>Categoria</label><select class="input" id="bg-cat" ${isEdit?"disabled":""}>${catOptions("expense", existing?existing.category:"")}</select></div>
    <div class="field"><label>Limite mensal (R$)</label><input class="input num" id="bg-lim" type="number" step="0.01" inputmode="decimal" required placeholder="0,00" value="${existing?existing.monthly_limit:""}"></div>
    <button class="btn" type="submit">${isEdit?"Salvar":"Definir limite"}</button>
    ${isEdit?`<button class="btn danger" type="button" id="bg-del" style="margin-top:8px">Remover limite</button>`:""}`;
  openModal(isEdit?"Editar limite":"Novo limite", body, async(close)=>{
    let cat = isEdit?existing.category:await maybeCreateCategory($("#bg-cat"),"expense"); if(cat===null) return;
    const lim=Number($("#bg-lim").value);
    await sb.from("budgets").upsert({ user_id:state.user.id, category:cat, monthly_limit:lim }, { onConflict:"user_id,category" });
    close(); toast("Orçamento salvo"); await refresh();
  }, ()=>{
    $("#bg-del") && ($("#bg-del").onclick=async()=>{ await sb.from("budgets").delete().eq("id",existing.id); close(); toast("Limite removido"); await refresh(); });
  });
}

/* Meta */
function openGoalModal(existing){
  const isEdit=!!existing;
  const body=`
    <div class="field"><label>Nome da meta</label><input class="input" id="g-name" required placeholder="Ex: Viagem, Reserva…" value="${existing?esc(existing.name):""}"></div>
    <div class="grid2">
      <div class="field"><label>Valor-alvo (R$)</label><input class="input num" id="g-target" type="number" step="0.01" inputmode="decimal" required placeholder="0,00" value="${existing?existing.target:""}"></div>
      <div class="field"><label>Já guardado (R$)</label><input class="input num" id="g-saved" type="number" step="0.01" inputmode="decimal" placeholder="0,00" value="${existing?existing.saved:"0"}"></div>
    </div>
    <div class="field"><label>Prazo (opcional)</label><input class="input" id="g-deadline" type="date" value="${existing&&existing.deadline?existing.deadline:""}"></div>
    <button class="btn" type="submit">${isEdit?"Salvar":"Criar meta"}</button>
    ${isEdit?`<button class="btn danger" type="button" id="g-del" style="margin-top:8px">Excluir meta</button>`:""}`;
  openModal(isEdit?"Editar meta":"Nova meta", body, async(close)=>{
    const row={ user_id:state.user.id, name:$("#g-name").value.trim(), target:Number($("#g-target").value), saved:Number($("#g-saved").value||0), deadline:$("#g-deadline").value||null };
    if(isEdit) await sb.from("goals").update(row).eq("id",existing.id);
    else await sb.from("goals").insert(row);
    close(); toast(isEdit?"Meta atualizada":"Meta criada"); await refresh();
  }, ()=>{
    $("#g-del") && ($("#g-del").onclick=async()=>{ if(confirm("Excluir esta meta?")){ await sb.from("goals").delete().eq("id",existing.id); close(); toast("Meta excluída"); await refresh(); } });
  });
}
function openContribModal(goal){
  const body=`<p style="color:var(--muted);margin:-4px 0 14px">Quanto você quer guardar em <b>${esc(goal.name)}</b> agora?</p>
    <div class="field"><label>Valor (R$)</label><input class="input num" id="c-amt" type="number" step="0.01" inputmode="decimal" required placeholder="0,00" autofocus></div>
    <button class="btn" type="submit">Guardar</button>`;
  openModal("Guardar dinheiro", body, async(close)=>{
    const add=Number($("#c-amt").value); if(!add) return;
    await sb.from("goals").update({ saved:Number(goal.saved)+add }).eq("id",goal.id);
    close(); toast("Guardado!"); await refresh();
  });
}

/* ================= BELL / MENU ================= */
function alertsList(){ return billsForPeriod().filter(b=>!b._paid && (billStatus(b)==="late"||billStatus(b)==="due")); }
function updateBell(){
  const n=alertsList().length; const badge=$("#bell-badge");
  badge.textContent=n; badge.classList.toggle("hidden", n===0);
}
$("#bell").onclick = () => {
  const items=alertsList();
  const body = items.length ? items.map(b=>`<div class="item"><button class="chk" data-pay="${b.id}">✓</button>
      <div class="grow"><div class="t1">${esc(b.name)}</div><div class="t2">${billStatus(b)==="late"?"Vencida":"Vence"} ${fmtDate(b._due)}</div></div>
      <div class="amt num">${money(b.amount)}</div></div>`).join("")
    : `<div class="empty">${ic('check',22)}<div>Tudo em dia por aqui!</div></div>`;
  openModal("Contas para atenção", body+`<button class="btn ghost" type="button" id="bell-close" style="margin-top:14px">Fechar</button>`, async()=>{}, ()=>{
    $("#bell-close").onclick=()=>$("#modal-root").firstElementChild && ($("#modal-root").innerHTML="");
    $$("[data-pay]").forEach(el=> el.onclick = async ()=>{ await togglePaid(el.dataset.pay); $("#bell").click(); });
  });
};
$("#menu-btn").onclick = () => {
  const body=`
    <button class="btn ghost" type="button" id="mm-cats" style="justify-content:flex-start;margin-bottom:8px">${ic('tag',18)} Gerenciar categorias</button>
    <button class="btn ghost" type="button" id="mm-logout" style="justify-content:flex-start">${ic('logout',18)} Sair da conta</button>`;
  openModal(state.profile.name?`Olá, ${esc(state.profile.name.split(" ")[0])}`:"Menu", body, async()=>{}, ()=>{
    $("#mm-logout").onclick=async()=>{ await sb.auth.signOut(); location.reload(); };
    $("#mm-cats").onclick=()=>{ $("#modal-root").innerHTML=""; openCatsModal(); };
  });
};
function openCatsModal(){
  const list=(type)=> catsByType(type).map(c=>`<div class="item"><span class="dot" style="background:${c.color}"></span><div class="grow"><div class="t1">${esc(c.name)}</div></div><button class="mini" data-delcat="${c.id}">excluir</button></div>`).join("")||`<div class="t2" style="padding:8px 0">Nenhuma</div>`;
  const body=`<div class="sub" style="margin-bottom:6px">Despesas</div>${list("expense")}
    <div class="sub" style="margin:14px 0 6px">Receitas</div>${list("income")}
    <div class="grid2" style="margin-top:16px"><button class="btn ghost" type="button" id="cat-add-exp">＋ Despesa</button><button class="btn ghost" type="button" id="cat-add-inc">＋ Receita</button></div>`;
  openModal("Categorias", body, async()=>{}, ()=>{
    $$("[data-delcat]").forEach(el=> el.onclick=async()=>{ if(confirm("Excluir categoria? Lançamentos antigos não são apagados.")){ await sb.from("categories").delete().eq("id",el.dataset.delcat); await loadData(); $("#modal-root").innerHTML=""; openCatsModal(); } });
    const add=async(type)=>{ const name=(prompt("Nome da categoria:")||"").trim(); if(!name) return; await sb.from("categories").insert({user_id:state.user.id,name,type,color:type==="income"?"#22c55e":"#64748b"}); await loadData(); $("#modal-root").innerHTML=""; openCatsModal(); };
    $("#cat-add-exp").onclick=()=>add("expense"); $("#cat-add-inc").onclick=()=>add("income");
  });
}

updateMonthLabel();

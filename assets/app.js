const CATS=["AI","Artificial Intelligence","Technology","Software","SaaS","Web Tools","Developer Tools","Programming","Design","Graphics","Marketing","SEO","Business","Finance","E-commerce","Shopping","Education","Learning","News","Media","Entertainment","Games","Gaming","Health","Fitness","Travel","Food","Recipes","Lifestyle","Personal Blogs","Photography","Video","Music","Sports","Jobs","Careers","Real Estate","Construction","Home Improvement","Automotive","Legal","Government","Nonprofit","Communities","Forums","Social","Productivity","Utilities","Internet Services","Hosting","Domains","Security","Cybersecurity","Mobile Apps","Android","iOS","WordPress","Blogging","Newsletters","Online Services","Directories","Reference","Science","Research","Books","Literature","Art","Fashion","Beauty","Parenting","Pets","Shopping Deals","Local Businesses","Startups","Agencies","Freelancers","Portfolios","Other"];
const SUPABASE_URL="https://trjrqfpxxfadxeabvtvf.supabase.co",SUPABASE_KEY="sb_publishable_syWcZtTdkXtgcdrc4-2aag_1cL9bCvM",SB_HEADERS={apikey:SUPABASE_KEY,Authorization:"Bearer "+SUPABASE_KEY,"Content-Type":"application/json"},EDGE_URL=SUPABASE_URL+"/functions/v1/directory-write";

const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));

// Theme Switcher Logic
function initTheme(){
  const saved = localStorage.getItem("bb_theme") || (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
  setTheme(saved);
  document.querySelectorAll(".themeToggleBtn").forEach(btn => {
    btn.onclick = () => {
      const current = document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
      setTheme(current === "light" ? "dark" : "light");
    };
  });
}

function setTheme(theme){
  if(theme === "light"){
    document.documentElement.setAttribute("data-theme", "light");
    localStorage.setItem("bb_theme", "light");
    updateThemeBtns("🌙 Dark");
  } else {
    document.documentElement.removeAttribute("data-theme");
    localStorage.setItem("bb_theme", "dark");
    updateThemeBtns("☀️ Light");
  }
}

function updateThemeBtns(text){
  document.querySelectorAll(".themeToggleBtn").forEach(b => b.innerHTML = text);
}

// Mobile Menu Logic
function setupMenu(){
  const btn = document.getElementById("menuButton");
  const nav = document.getElementById("mobileNav");
  if(!btn || !nav) return;

  btn.onclick = (e) => {
    e.stopPropagation();
    const isOpen = nav.classList.toggle("open");
    btn.setAttribute("aria-expanded", isOpen ? "true" : "false");
  };

  document.addEventListener("click", (e) => {
    if(!nav.contains(e.target) && e.target !== btn && !btn.contains(e.target)){
      nav.classList.remove("open");
      btn.setAttribute("aria-expanded", "false");
    }
  });

  nav.querySelectorAll("a").forEach(a => {
    a.addEventListener("click", () => {
      nav.classList.remove("open");
      btn.setAttribute("aria-expanded", "false");
    });
  });
}

async function sb(path,opts={}){
  const r=await fetch(SUPABASE_URL+"/rest/v1/"+path,{...opts,headers:{...SB_HEADERS,...(opts.headers||{})}});
  if(!r.ok)throw new Error(await r.text());
  return r.status===204?null:r.json();
}

async function edge(action,payload={}){
  const r=await fetch(EDGE_URL,{
    method:"POST",
    headers:{apikey:SUPABASE_KEY,"Content-Type":"application/json"},
    body:JSON.stringify({action,...payload})
  });
  let j={};
  try{j=await r.json()}catch{}
  if(!r.ok)throw Object.assign(new Error(j.error||"Request failed"),{code:j.error||"request_failed",data:j});
  return j;
}

function iconFor(s){
  if(s.logo_url && typeof s.logo_url === "string" && s.logo_url.startsWith("http") && !s.logo_url.includes("[object")){
    return s.logo_url;
  }
  return "https://www.google.com/s2/favicons?domain=" + encodeURIComponent(s.domain || "example.com") + "&sz=128";
}

function card(s){
  const title=s.title||s.domain||"Website";
  const desc=s.description||"Discover and explore verified tools and services on BacklinkBase.";
  const cat=s.categories?.name||s.category_name||s.category||"General";
  const targetUrl=s.url||("https://"+(s.domain||""));
  
  return '<article class="card">' +
    '<div class="card-head">' +
      '<img class="favicon" src="' + esc(iconFor(s)) + '" alt="' + esc(title) + ' logo" loading="lazy" width="40" height="40" onerror="this.src=\'https://www.google.com/s2/favicons?domain=example.com&sz=128\'">' +
      '<div class="card-meta">' +
        '<h3 class="card-title">' + esc(title) + '</h3>' +
        '<span class="card-domain">' + esc(s.domain||"") + '</span>' +
      '</div>' +
      '<span class="badge">' + esc(cat) + '</span>' +
    '</div>' +
    '<p class="card-desc">' + esc(desc) + '</p>' +
    '<div class="card-foot">' +
      '<a class="visit-btn" href="' + esc(targetUrl) + '" target="_blank" rel="noopener noreferrer nofollow">' +
        'Visit Website ' +
        '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>' +
      '</a>' +
    '</div>' +
  '</article>';
}

async function home(){
  const box=document.getElementById("latest");
  if(!box)return;
  box.innerHTML='<div class="loading-state" style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-muted)"><span class="spinner"></span> Loading websites from directory...</div>';
  try{
    const rows=await sb("sites?select=id,title,description,domain,url,logo_url,submitted_at,categories(name)&status=eq.approved&order=submitted_at.desc&limit=18");
    if(!rows||!rows.length){
      box.innerHTML='<div class="empty" style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-muted)">No approved websites yet. Be the first to <a href="/submit/" style="color:var(--text);font-weight:700">submit a website</a>!</div>';
      return;
    }
    box.className="grid";
    box.innerHTML=rows.map(card).join("");
  }catch(e){
    console.error("Home loading error:", e);
    box.innerHTML='<div class="empty" style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-muted)">Unable to load websites right now. Please check back shortly.</div>';
  }
}

function goSearch(){
  const q=document.getElementById("homeSearch")?.value.trim();
  location.href="/discover/"+(q?("?q="+encodeURIComponent(q)):"");
}

let discoverPage=0;
const DISCOVER_LIMIT=24;

async function discover(){
  const params=new URLSearchParams(location.search);
  const q=params.get("q")||params.get("query")||"";
  const c=params.get("c")||params.get("category")||"";
  
  const searchInput=document.getElementById("discoverSearch") || document.getElementById("discoverQ");
  if(searchInput&&q)searchInput.value=q;
  
  const catSelect=document.getElementById("discoverCat");
  if(catSelect){
    try{
      const cats=await sb("categories?select=id,name&order=name.asc");
      if(cats&&cats.length){
        catSelect.innerHTML='<option value="">All Categories</option>'+cats.map(catItem=>`<option value="${esc(catItem.name)}"${catItem.name===c?' selected':''}>${esc(catItem.name)}</option>`).join("");
      }
    }catch{}
    catSelect.onchange=()=>{
      applyDiscover(searchInput?.value.trim()||"", catSelect.value, 0);
    };
  }

  if(searchInput){
    searchInput.onkeydown=(e)=>{
      if(e.key==='Enter')applyDiscover(searchInput.value.trim(), catSelect?.value||"", 0);
    };
  }
  
  await applyDiscover(q,c,0);
}

async function applyDiscover(q,cat,page=0){
  const box=document.getElementById("discoverGrid") || document.getElementById("discoverResults");
  const countBox=document.getElementById("resultsCount");
  if(!box)return;
  
  const searchInput=document.getElementById("discoverSearch") || document.getElementById("discoverQ");
  const catSelect=document.getElementById("discoverCat");
  if(q===undefined && searchInput) q=searchInput.value.trim();
  if(cat===undefined && catSelect) cat=catSelect.value;
  
  box.className="";
  box.innerHTML='<div class="loading-state" style="text-align:center;padding:40px;color:var(--text-muted)"><span class="spinner"></span> Discovering curated websites...</div>';
  
  try{
    let path=`sites?select=id,title,description,domain,url,logo_url,submitted_at,categories(name)&status=eq.approved&order=submitted_at.desc&limit=${DISCOVER_LIMIT}&offset=${page*DISCOVER_LIMIT}`;
    if(cat){
      path+=`&categories.name=eq.${encodeURIComponent(cat)}`;
    }
    if(q){
      path+=`&or=(title.ilike.*${encodeURIComponent(q)}*,description.ilike.*${encodeURIComponent(q)}*,domain.ilike.*${encodeURIComponent(q)}*)`;
    }
    
    const rows=await sb(path);
    if(!rows||!rows.length){
      box.innerHTML='<div class="empty" style="text-align:center;padding:40px;color:var(--text-muted)">No matching websites found. <a href="/submit/" style="color:var(--text);font-weight:700">Submit a website</a></div>';
      if(countBox)countBox.textContent="0 websites found";
      return;
    }
    
    if(countBox)countBox.textContent=`Showing ${rows.length} verified websites`;
    box.className="grid";
    box.innerHTML=rows.map(card).join("");
  }catch(e){
    console.error("Discover error:", e);
    box.innerHTML='<div class="empty" style="text-align:center;padding:40px;color:var(--text-muted)">Error loading directory results.</div>';
  }
}

function normalizeUrl(u){
  let s=String(u||"").trim();
  if(!/^https?:\/\//i.test(s))s="https://"+s;
  const o=new URL(s);
  return o.origin;
}

function domain(u){
  try{
    return new URL(normalizeUrl(u)).hostname.replace(/^www\./,"");
  }catch{
    return "";
  }
}

async function fetchMeta(){
  const input=document.getElementById("url");
  const status=document.getElementById("metaStatus");
  const btn=document.getElementById("fetchBtn");
  if(!input?.value.trim()){
    if(status)status.innerHTML='<div class="notice err">Please enter a website URL first.</div>';
    return;
  }
  
  let u;
  try{
    u=normalizeUrl(input.value);
  }catch{
    if(status)status.innerHTML='<div class="notice err">Please enter a valid website URL.</div>';
    return;
  }
  
  const d=domain(u);
  if(btn){
    btn.disabled=true;
    btn.innerHTML='<span class="spinner"></span> Fetching details...';
  }
  if(status)status.innerHTML='<div class="notice info"><span class="spinner"></span> Contacting metadata provider...</div>';
  
  try{
    const r=await fetch("https://api.microlink.io?url="+encodeURIComponent(u));
    const j=await r.json();
    const data=j.data||{};
    const titleVal=data.title||data.ogTitle||d;
    const descVal=data.description||data.ogDescription||"";
    const logoVal=data.logo?.url||data.image?.url||("https://www.google.com/s2/favicons?domain="+encodeURIComponent(d)+"&sz=128");
    
    if(document.getElementById("title"))document.getElementById("title").value=titleVal;
    if(document.getElementById("description"))document.getElementById("description").value=descVal;
    
    const preview=document.getElementById("preview");
    if(preview){
      preview.innerHTML=`<div style="display:flex;align-items:center;gap:12px;padding:12px;background:var(--bg-subtle);border:1px solid var(--line);border-radius:10px;margin-bottom:16px"><img class="favicon" src="${esc(logoVal)}" alt="Logo" width="40" height="40"><div><b>${esc(titleVal)}</b><div style="font-size:12px;color:var(--text-muted)">${esc(d)}</div></div></div>`;
      preview.classList.add("show");
    }
    
    window._meta={url:u,domain:d,logo_url:logoVal};
    if(status)status.innerHTML='<div class="notice ok">Website details loaded! You can refine title and description below before submitting.</div>';
  }catch(e){
    if(document.getElementById("title"))document.getElementById("title").value=d;
    window._meta={url:u,domain:d,logo_url:"https://www.google.com/s2/favicons?domain="+encodeURIComponent(d)+"&sz=128"};
    if(status)status.innerHTML='<div class="notice info">Basic domain details identified. Please complete the title and description manually.</div>';
  }finally{
    if(btn){
      btn.disabled=false;
      btn.innerHTML='Fetch Website Details';
    }
  }
}

async function submitForm(ev){
  ev.preventDefault();
  const status=document.getElementById("submitStatus");
  const btn=document.getElementById("submitBtn");
  const urlVal=document.getElementById("url").value.trim();
  const titleVal=document.getElementById("title").value.trim();
  const descVal=document.getElementById("description").value.trim();
  const catVal=document.getElementById("category").value;
  
  if(!urlVal||!titleVal){
    status.innerHTML='<div class="notice err">Please enter both URL and Title.</div>';
    return;
  }
  
  btn.disabled=true;
  btn.innerHTML='<span class="spinner"></span> Submitting to directory...';
  status.innerHTML='';
  
  try{
    const u=normalizeUrl(urlVal);
    const d=domain(u);
    const logo=window._meta?.logo_url||("https://www.google.com/s2/favicons?domain="+encodeURIComponent(d)+"&sz=128");
    
    const res=await edge("submit",{
      url:u,
      title:titleVal,
      description:descVal,
      category_id:catVal||null,
      logo_url:logo
    });
    
    status.innerHTML='<div class="notice ok">🎉 Website successfully submitted for review! Our editorial team will inspect and approve your listing shortly.</div>';
    document.getElementById("submitForm").reset();
    const preview=document.getElementById("preview");
    if(preview)preview.innerHTML="";
    window._meta=null;
  }catch(e){
    status.innerHTML=`<div class="notice err">${esc(e.message||"Submission failed. Please check your data and try again.")}</div>`;
  }finally{
    btn.disabled=false;
    btn.innerHTML='Submit Website for Review';
  }
}

async function initSubmit(){
  const sel=document.getElementById("category");
  if(sel){
    try{
      const cats=await sb("categories?select=id,name&order=name.asc");
      if(cats&&cats.length){
        sel.innerHTML='<option value="">Select Category (Optional)</option>'+cats.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join("");
      }
    }catch{}
  }
  
  const form=document.getElementById("submitForm");
  if(form)form.onsubmit=submitForm;
  
  const fetchBtn=document.getElementById("fetchBtn");
  if(fetchBtn)fetchBtn.onclick=fetchMeta;
}

document.addEventListener("DOMContentLoaded",()=>{
  initTheme();
  setupMenu();
  if(document.getElementById("latest"))home();
  if(document.getElementById("discoverGrid") || document.getElementById("discoverResults"))discover();
  if(document.getElementById("submitForm"))initSubmit();
});

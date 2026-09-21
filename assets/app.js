// Social share & badge copy helpers
window.handleCardShare = function(btn, url, title) {
  if (navigator.share) {
    navigator.share({
      title: title || "BacklinkBase Directory",
      text: "Check out " + (title || "this website") + " on BacklinkBase Directory: " + url,
      url: url
    }).catch(function(err) {
      if (err && err.name !== "AbortError") {
        window.toggleSharePopover(btn);
      }
    });
    return;
  }
  window.toggleSharePopover(btn);
};

window.toggleSharePopover = function(btn) {
  var wrap = btn.closest(".share-popover-wrap");
  if (!wrap) return;
  var pop = wrap.querySelector(".share-popover");
  if (!pop) return;
  var wasOpen = pop.classList.contains("open");
  document.querySelectorAll(".share-popover.open").forEach(function(el) {
    el.classList.remove("open");
  });
  if (!wasOpen) {
    pop.classList.add("open");
  }
};

window.copyCardShare = function(url, btn) {
  var origHtml = btn.innerHTML;
  function showDone() {
    btn.classList.add("copied");
    btn.innerHTML = "\u2713 Copied!";
    setTimeout(function() {
      btn.classList.remove("copied");
      btn.innerHTML = origHtml;
    }, 2000);
  }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(showDone).catch(function() {
      prompt("Copy listing link:", url);
    });
  } else {
    prompt("Copy listing link:", url);
  }
};

window.copyShare = function(url, btn) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(function() {
      btn.classList.add("copied");
      var oldTitle = btn.getAttribute("title");
      btn.setAttribute("title", "Copied to clipboard!");
      setTimeout(function() {
        btn.classList.remove("copied");
        btn.setAttribute("title", oldTitle);
      }, 2000);
    }).catch(function() {
      prompt("Copy listing link:", url);
    });
  } else {
    prompt("Copy listing link:", url);
  }
};

window.copyBadgeCode = function() {
  var snippet = document.getElementById("badgeSnippet");
  var notice = document.getElementById("badgeCopyNotice");
  var btn = document.getElementById("copyBadgeBtn");
  if (!snippet) return;
  snippet.select();
  snippet.setSelectionRange(0, 99999);
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(snippet.value).then(function() {
      if (notice) {
        notice.style.display = "inline-block";
        setTimeout(function() { notice.style.display = "none"; }, 3000);
      }
      if (btn) {
        btn.textContent = "Copied!";
        setTimeout(function() { btn.textContent = "Copy Badge Code"; }, 3000);
      }
    }).catch(function() {
      document.execCommand("copy");
    });
  } else {
    document.execCommand("copy");
    if (notice) notice.style.display = "inline-block";
  }
};

document.addEventListener("click", function(e) {
  if (!e.target.closest(".share-popover-wrap")) {
    document.querySelectorAll(".share-popover.open").forEach(function(el) {
      el.classList.remove("open");
    });
  }
});

const CATS=["AI","Artificial Intelligence","Technology","Software","SaaS","Web Tools","Developer Tools","Programming","Design","Graphics","Marketing","SEO","Business","Finance","E-commerce","Shopping","Education","Learning","News","Media","Entertainment","Games","Gaming","Health","Fitness","Travel","Food","Recipes","Lifestyle","Personal Blogs","Photography","Video","Music","Sports","Jobs","Careers","Real Estate","Construction","Home Improvement","Automotive","Legal","Government","Nonprofit","Communities","Forums","Social","Productivity","Utilities","Internet Services","Hosting","Domains","Security","Cybersecurity","Mobile Apps","Android","iOS","WordPress","Blogging","Newsletters","Online Services","Directories","Reference","Science","Research","Books","Literature","Art","Fashion","Beauty","Parenting","Pets","Shopping Deals","Local Businesses","Startups","Agencies","Freelancers","Portfolios","Other"];
const API_BASE="/api";

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
  const isLight = text.includes("Light");
  document.querySelectorAll(".themeToggleBtn").forEach(b => {
    if(b.classList.contains("mobile-theme-btn")){
      b.innerHTML = isLight ? "☀️ Light" : "🌙 Dark";
    } else {
      b.innerHTML = text;
    }
  });
}

// Mobile Menu Logic
function setupMenu(){
  const btn = document.getElementById(menuButton);
  const nav = document.getElementById(mobileNav);
  if(!btn || !nav) return;

  const closeMenu = () => {
    if(nav.classList.contains(open)){
      nav.classList.remove(open);
      btn.setAttribute(aria-expanded, false);
    }
  };

  btn.onclick = (e) => {
    e.stopPropagation();
    const isOpen = nav.classList.toggle(open);
    btn.setAttribute(aria-expanded, isOpen ? true : false);
  };

  document.addEventListener(click, (e) => {
    if(!nav.contains(e.target) && e.target !== btn && !btn.contains(e.target)){
      closeMenu();
    }
  });

  nav.querySelectorAll(a).forEach(a => {
    a.addEventListener(click, closeMenu);
  });

  // Auto close menu when user scrolls the page
  window.addEventListener(scroll, () => {
    closeMenu();
  }, { passive: true });
}

async function sb(path,opts={}){
  let url = API_BASE + "/sites";
  if(path.startsWith("categories")){
    url = API_BASE + "/categories";
  } else if(path.startsWith("sites")){
    const params = new URLSearchParams();
    if(path.includes("category_id=eq.")){
      const catMatch = path.match(/category_id=eq\.([^&]+)/);
      if(catMatch) params.set("category", catMatch[1]);
    }
    if(path.includes("or=")){
      const searchMatch = path.match(/ilike\.\*([^\*]+)\*/);
      if(searchMatch) params.set("search", decodeURIComponent(searchMatch[1]));
    }
    const qs = params.toString();
    url = API_BASE + "/sites" + (qs ? "?" + qs : "");
  }
  const r=await fetch(url,{...opts});
  if(!r.ok)throw new Error(await r.text());
  return r.status===204?null:r.json();
}

async function edge(action,payload={}){
  const r=await fetch(API_BASE + "/submit",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
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

function card(s, rank = 0){
  const rankHtml = rank === 1 
    ? '<span class="rank-badge rank-1" title="Rank #1 this week">👑 #1 Tool of the Week</span>' 
    : rank === 2 
    ? '<span class="rank-badge rank-2" title="Rank #2 this week">🥈 #2</span>' 
    : rank === 3 
    ? '<span class="rank-badge rank-3" title="Rank #3 this week">🥉 #3</span>' 
    : rank > 3 
    ? '<span class="rank-badge rank-n">🔥 #' + rank + '</span>' 
    : '';
  const title=s.title||s.domain||"Website";
  const desc=s.description||"Discover and explore verified tools and services on BacklinkBase.";
  const cat=s.categories?.name||s.category_name||s.category||"General";
  const targetUrl=s.url||("https://"+(s.domain||""));
  const shareDomain=s.domain||(s.url?s.url.replace(/^https?:\/\//i,"").split("/")[0]:"");
  const shareUrl="https://backlinkbase.org/discover/?q="+encodeURIComponent(shareDomain);
  const shareText="Check out "+title+" on BacklinkBase Directory: "+shareUrl;
  const encText=encodeURIComponent(shareText);
  const encUrl=encodeURIComponent(shareUrl);
  const safeTitle=title.replace(/'/g,"");

  const xUrl="https://twitter.com/intent/tweet?text="+encText;
  const liUrl="https://www.linkedin.com/sharing/share-offsite/?url="+encUrl;
  const waUrl="https://api.whatsapp.com/send?text="+encText;

  return '<article class="card">' +
    '<div class="card-head">' +
      '<img class="favicon" src="' + esc(iconFor(s)) + '" alt="' + esc(title) + ' logo" loading="lazy" width="40" height="40" onerror="this.src=\'https://www.google.com/s2/favicons?domain=example.com&sz=128\'">' +
      '<div class="card-meta">' +
        '<h3 class="card-title">' + esc(title) + '</h3>' +
        '<span class="card-domain">' + esc(s.domain||"") + '</span>' +
      '</div>' +
      (rankHtml ? rankHtml : '') + '<span class="badge">' + esc(cat) + '</span>' +
    '</div>' +
    '<p class="card-desc">' + esc(desc) + '</p>' +
    '<div class="card-foot">' +
      '<div class="card-actions">' +
        '<div class="share-popover-wrap">' +
          '<button type="button" class="action-btn share-trigger" onclick="handleCardShare(this, \'' + esc(shareUrl) + '\', \'' + esc(safeTitle) + '\')" title="Share this website" aria-label="Share">' +
            '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>' +
            '<span>Share</span>' +
          '</button>' +
          '<div class="share-popover" role="menu">' +
            '<a class="share-popover-item" href="' + esc(xUrl) + '" target="_blank" rel="noopener noreferrer">' +
              '<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>' +
              '<span>Share on X</span>' +
            '</a>' +
            '<a class="share-popover-item" href="' + esc(liUrl) + '" target="_blank" rel="noopener noreferrer">' +
              '<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/></svg>' +
              '<span>LinkedIn</span>' +
            '</a>' +
            '<a class="share-popover-item" href="' + esc(waUrl) + '" target="_blank" rel="noopener noreferrer">' +
              '<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2m.01 1.67c4.54 0 8.24 3.7 8.24 8.24 0 2.2-.86 4.28-2.42 5.84a8.17 8.17 0 0 1-5.82 2.41h-.01c-1.46 0-2.9-.39-4.16-1.14l-.3-.18-3.1 1.02.83-3.02-.19-.31a8.188 8.188 0 0 1-1.25-4.38c0-4.54 3.7-8.24 8.24-8.24m4.8 11.66c-.26-.13-1.54-.76-1.78-.85-.24-.09-.41-.13-.59.13-.17.26-.68.85-.83 1.02-.15.17-.3.2-.56.07-.26-.13-1.1-.4-2.09-1.29-.77-.69-1.29-1.54-1.44-1.8-.15-.26-.02-.4.11-.53.12-.12.26-.3.39-.45.13-.15.17-.26.26-.43.09-.17.04-.32-.02-.45-.06-.13-.59-1.42-.81-1.95-.21-.51-.43-.44-.59-.45h-.5c-.17 0-.45.06-.69.32-.24.26-.91.89-.91 2.17 0 1.28.93 2.52 1.06 2.7.13.17 1.83 2.8 4.44 3.93.62.27 1.11.43 1.49.55.63.2 1.2.17 1.65.1.5-.07 1.54-.63 1.76-1.24.21-.61.21-1.13.15-1.24-.06-.11-.23-.17-.49-.3z"/></svg>' +
              '<span>WhatsApp</span>' +
            '</a>' +
            '<button type="button" class="share-popover-item share-popover-copy" onclick="copyCardShare(\'' + esc(shareUrl) + '\', this)">' +
              '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>' +
              '<span>Copy Link</span>' +
            '</button>' +
          '</div>' +
        '</div>' +
        '<a class="action-btn visit-btn" href="/api/visit?id=' + encodeURIComponent(s.id) + '" target="_blank" rel="noopener noreferrer nofollow" title="Visit ' + esc(title) + '">' +
          '<span>Visit</span>' +
          '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>' +
        '</a>' +
      '</div>' +
    '</div>' +
  '</article>';
}

async function home(){
  // 1. Load Weekly Leaderboard (Top 7)
  const lbBox = document.getElementById("leaderboard");
  if (lbBox) {
    try {
      const res = await fetch("/api/leaderboard");
      if (res.ok) {
        const topSites = await res.json();
        if (topSites && topSites.length > 0) {
          lbBox.className = "grid";
          lbBox.innerHTML = topSites.map((s, idx) => card(s, idx + 1)).join("");
        } else {
          lbBox.innerHTML = '<div class="empty" style="grid-column:1/-1;text-align:center;padding:30px;color:var(--text-muted)">The weekly leaderboard updates as verified visits are counted. Be the first to explore!</div>';
        }
      }
    } catch (err) {
      console.warn("Leaderboard fetch error:", err);
      lbBox.style.display = "none";
    }
  }

  // 2. Load Latest Discoveries
  const box = document.getElementById("latest");
  if (!box) return;
  box.innerHTML = '<div class="loading-state" style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-muted)"><span class="spinner"></span> Loading websites from directory...</div>';
  try {
    const rows = await sb("sites?select=id,title,description,domain,url,logo_url,submitted_at,view_count,categories(name)&status=eq.approved&order=submitted_at.desc&limit=18");
    if (!rows || !rows.length) {
      box.innerHTML = '<div class="empty" style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-muted)">No approved websites yet. Be the first to <a href="/submit/" style="color:var(--text);font-weight:700">submit a website</a>!</div>';
      return;
    }
    box.className = "grid";
    box.innerHTML = rows.map(s => card(s, 0)).join("");
  } catch(e) {
    console.error("Home loading error:", e);
    box.innerHTML = '<div class="empty" style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-muted)">Unable to load websites right now. Please check back shortly.</div>';
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
    let titleVal = d;
    let descVal = "";
    let logoVal = "https://www.google.com/s2/favicons?domain=" + encodeURIComponent(d) + "&sz=128";

    try {
      const r = await fetch(API_BASE + "/fetch-meta?url=" + encodeURIComponent(u));
      if (r.ok) {
        const j = await r.json();
        if (j.title) titleVal = j.title;
        if (j.description) descVal = j.description;
        if (j.logo_url) logoVal = j.logo_url;
      }
    } catch(err) {
      // Fallback to microlink if needed
      try {
        const r2 = await fetch("https://api.microlink.io?url=" + encodeURIComponent(u));
        const j2 = await r2.json();
        const data = j2.data || {};
        if (data.title || data.ogTitle) titleVal = data.title || data.ogTitle;
        if (data.description || data.ogDescription) descVal = data.description || data.ogDescription;
        if (data.logo?.url || data.image?.url) logoVal = data.logo?.url || data.image?.url;
      } catch(e) {}
    }
    
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
  const catSel=document.getElementById("category");
  const catVal=catSel?catSel.value:"";
  const opt=catSel&&catSel.selectedIndex>=0?catSel.options[catSel.selectedIndex]:null;
  const catName=opt?(opt.getAttribute("data-name")||opt.text):"";

  if(!urlVal||!titleVal||!catVal){
    status.innerHTML='<div class="notice err">Please fill in all required fields: URL, Title, and Category.</div>';
    return;
  }

  btn.disabled=true;
  btn.innerHTML='<span class="spinner"></span> Submitting to directory...';
  status.innerHTML="";

  try{
    const u=normalizeUrl(urlVal);
    const d=domain(u);
    const logo=window._meta?.logo_url||("https://www.google.com/s2/favicons?domain="+encodeURIComponent(d)+"&sz=128");

    const res=await edge("submit",{
      url:u,
      title:titleVal,
      description:descVal,
      category:catName||catVal,
      category_id:catVal||null,
      logo_url:logo
    });

    status.innerHTML='<div class="notice ok">\ud83c\udf89 Website successfully submitted for review! Our editorial team will inspect and approve your listing shortly.</div>';
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
        sel.innerHTML='<option value="">Select a Category (Required)</option>'+cats.map(c=>`<option value="${esc(c.id)}" data-name="${esc(c.name)}">${esc(c.name)}</option>`).join("");
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


// Promo & OTP Management
window._promoProof = null;
window._challengeToken = null;

window.togglePromoSection = function(show) {
  const sec = document.getElementById("promoDetailsSection");
  if (!sec) return;
  sec.style.display = show ? "block" : "none";
  if (show) {
    updateDomainSuffix();
  }
};

function updateDomainSuffix() {
  const urlInput = document.getElementById("url");
  const suffix = document.getElementById("domainSuffix");
  if (!suffix) return;
  let d = "yourdomain.com";
  if (urlInput && urlInput.value.trim()) {
    try {
      d = domain(normalizeUrl(urlInput.value));
    } catch(e) {}
  }
  suffix.textContent = "@" + d;
}

const origFetchMeta = window.fetchMeta;
if (document.getElementById("url")) {
  document.getElementById("url").addEventListener("input", updateDomainSuffix);
}

window.handleSendOtp = async function() {
  const btn = document.getElementById("sendOtpBtn");
  const status = document.getElementById("otpStatus");
  const user = (document.getElementById("emailUser")?.value || "").trim();
  const urlInput = document.getElementById("url")?.value.trim();

  if (!urlInput) {
    status.innerHTML = '<div class="notice err">Please enter your website URL at the top first.</div>';
    return;
  }
  if (!user) {
    status.innerHTML = '<div class="notice err">Please enter the username for your domain email (e.g. contact, info).</div>';
    return;
  }

  let d;
  try {
    d = domain(normalizeUrl(urlInput));
  } catch(e) {
    status.innerHTML = '<div class="notice err">Please enter a valid website URL.</div>';
    return;
  }

  const fullEmail = user + "@" + d;
  btn.disabled = true;
  btn.textContent = "Sending...";
  status.innerHTML = '<div class="notice info"><span class="spinner"></span> Sending verification code to ' + esc(fullEmail) + '...</div>';

  try {
    const res = await fetch(API_BASE + "/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: fullEmail, domain: d })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Failed to send verification email");
    }
    window._challengeToken = data.challengeToken;
    status.innerHTML = '<div class="notice ok">Code sent to ' + esc(fullEmail) + '! Check your inbox/spam (valid for 10 min).</div>';
    document.getElementById("otpInputRow").style.display = "block";
  } catch(err) {
    status.innerHTML = '<div class="notice err">' + esc(err.message) + '</div>';
  } finally {
    btn.disabled = false;
    btn.textContent = "Send Code";
  }
};

window.handleVerifyOtp = async function() {
  const btn = document.getElementById("verifyOtpBtn");
  const status = document.getElementById("verifyStatus");
  const code = (document.getElementById("otpCode")?.value || "").trim();
  const user = (document.getElementById("emailUser")?.value || "").trim();
  const urlInput = document.getElementById("url")?.value.trim();

  if (!code || code.length !== 6) {
    status.innerHTML = '<div class=\"notice err\">Please enter the complete 6-digit code.</div>';
    return;
  }
  if (!window._challengeToken) {
    status.innerHTML = '<div class=\"notice err\">Please request a verification code first.</div>';
    return;
  }

  const d = domain(normalizeUrl(urlInput));
  const fullEmail = user + "@" + d;

  btn.disabled = true;
  btn.textContent = "Verifying...";

  try {
    const res = await fetch(API_BASE + "/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        challengeToken: window._challengeToken,
        code: code,
        domain: d,
        email: fullEmail
      })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Verification failed");
    }
    window._promoProof = data.proofToken;
    status.innerHTML = '<div class="notice ok" style="font-weight:bold;">✓ Domain verified successfully! Your exclusive deal is verified.</div>';
    btn.disabled = true;
    btn.textContent = "Verified ✓";
    document.getElementById("otpCode").disabled = true;
    document.getElementById("emailUser").disabled = true;
    document.getElementById("sendOtpBtn").disabled = true;
  } catch(err) {
    status.innerHTML = '<div class="notice err">' + esc(err.message) + '</div>';
    btn.disabled = false;
    btn.textContent = "Verify Code";
  }
};

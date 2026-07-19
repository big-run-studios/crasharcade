/* CrashArcade private-beta gate ------------------------------------------------
   Soft client-side access-code gate for the beta. Codes live here only as
   SHA-256 hashes (case-insensitive). Manage codes with:
       node .claude/beta-code.js "NewCode"   → add the printed hash to HASHES
   Remove a hash to revoke its code. A valid login is remembered per device.

   Hub page:   <script src="auth.js" data-mode="hub"></script>  → shows the login overlay
   Game pages: <script src="../auth.js"></script>               → bounce to the hub if not logged in
   Invite links: https://…/index.html?code=THECODE logs the device in automatically.
   ?logout on the hub clears the device.

   This is etiquette-level protection for testers, not real security — for that,
   put the host behind Cloudflare Access or similar. */
(function(){
  'use strict';
  var HASHES=[
    '5972a76a300876b8e0597f8ab85ad3f0f0b69f56a0087db12e06d93f92acf8af', // launch code
  ];
  var KEY='ca_beta_key';
  var mode=(document.currentScript&&document.currentScript.dataset.mode)||'game';

  function token(){ try{ return localStorage.getItem(KEY)||''; }catch(e){ return ''; } }
  function authed(){ return HASHES.indexOf(token())>=0; }
  function remember(h){ try{ localStorage.setItem(KEY,h); }catch(e){} }
  function sha(s){
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)).then(function(b){
      return Array.prototype.map.call(new Uint8Array(b),function(x){return x.toString(16).padStart(2,'0');}).join('');
    });
  }
  function tryCode(raw){
    return sha(String(raw||'').trim().toLowerCase()).then(function(h){
      if(HASHES.indexOf(h)>=0){ remember(h); return true; }
      return false;
    });
  }

  /* ---- game pages: synchronous check, bounce to the hub before anything shows ---- */
  if(mode!=='hub'){
    if(!authed()) location.replace('../index.html');
    return;
  }

  /* ---- hub: handle ?logout and ?code= invite links, then gate with an overlay ---- */
  var q=new URLSearchParams(location.search);
  if(q.has('logout')){ try{ localStorage.removeItem(KEY); }catch(e){} history.replaceState(null,'',location.pathname); }

  function start(){
    if(authed()) return;
    var codeParam=q.get('code');
    if(codeParam){
      history.replaceState(null,'',location.pathname);
      tryCode(codeParam).then(function(ok){ if(!ok) gate(); else unlock(true); });
      lockNow(); return;
    }
    lockNow(); gate();
  }

  var ov=null;
  function lockNow(){ document.documentElement.style.visibility='hidden'; }
  function unlock(instant){
    document.documentElement.style.visibility='';
    if(!ov) return;
    if(instant){ ov.remove(); ov=null; return; }
    ov.style.transition='opacity .35s'; ov.style.opacity='0';
    setTimeout(function(){ if(ov){ ov.remove(); ov=null; } },380);
  }
  function gate(){
    function build(){
      document.documentElement.style.visibility='';
      ov=document.createElement('div');
      ov.innerHTML=
        '<style>'+
        '#caGate{position:fixed;inset:0;z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;'+
          'background:radial-gradient(90% 70% at 50% 30%, #141033, #08061c 80%);font-family:Orbitron,sans-serif;padding:24px;}'+
        '#caGate .lg{font-weight:900;font-size:clamp(26px,7vw,40px);letter-spacing:2px;color:#fff;'+
          'text-shadow:0 0 12px #34e1ff,0 0 30px rgba(52,225,255,.85);}'+
        '#caGate .lg b{color:#ffc233;text-shadow:0 0 12px #ffc233,0 0 30px rgba(255,194,51,.8);}'+
        '#caGate .sub{margin-top:8px;font-size:11px;font-weight:700;letter-spacing:3px;color:#8fb8dc;}'+
        '#caGate form{margin-top:30px;display:flex;flex-direction:column;gap:12px;width:100%;max-width:300px;}'+
        '#caGate input{padding:15px 18px;border-radius:999px;border:2px solid #34e1ff;background:rgba(10,26,54,.82);'+
          'color:#eaf7ff;font-family:Orbitron,sans-serif;font-weight:700;font-size:16px;letter-spacing:2px;text-align:center;outline:none;'+
          'box-shadow:0 0 20px rgba(52,225,255,.35),inset 0 0 14px rgba(52,225,255,.1);}'+
        '#caGate input::placeholder{color:#5f7ba3;font-size:12px;letter-spacing:1px;}'+
        '#caGate button{padding:15px 18px;border-radius:999px;border:none;cursor:pointer;font-family:Orbitron,sans-serif;'+
          'font-weight:800;font-size:16px;letter-spacing:2px;color:#04283a;background:linear-gradient(180deg,#6ff0ff,#12b7e6);'+
          'box-shadow:0 0 24px rgba(52,225,255,.6),inset 0 0 0 2px rgba(255,255,255,.55);}'+
        '#caGate button:active{transform:scale(.97);}'+
        '#caGate .err{height:16px;margin-top:2px;font-size:11px;font-weight:700;letter-spacing:1px;color:#ff5a6e;'+
          'text-shadow:0 0 8px rgba(255,90,110,.7);text-align:center;visibility:hidden;}'+
        '#caGate .ft{position:absolute;bottom:18px;font-size:10px;font-weight:600;letter-spacing:1px;color:rgba(255,255,255,.4);}'+
        '#caGate.no input{animation:caShake .35s;}'+
        '@keyframes caShake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-9px)}40%,80%{transform:translateX(9px)}}'+
        '</style>'+
        '<div id="caGate">'+
          '<div class="lg">CRASH<b>ARCADE</b></div>'+
          '<div class="sub">🔒 PRIVATE BETA</div>'+
          '<form>'+
            '<input type="password" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="ACCESS CODE">'+
            '<div class="err">Wrong code — check your invite</div>'+
            '<button type="submit">ENTER</button>'+
          '</form>'+
          '<div class="ft">Big Run Studios · invited testers only</div>'+
        '</div>';
      document.body.appendChild(ov);
      var gateEl=ov.querySelector('#caGate'), inp=ov.querySelector('input'), err=ov.querySelector('.err');
      inp.focus();
      ov.querySelector('form').addEventListener('submit',function(e){
        e.preventDefault();
        tryCode(inp.value).then(function(ok){
          if(ok){ unlock(false); return; }
          err.style.visibility='visible';
          gateEl.classList.remove('no'); void gateEl.offsetWidth; gateEl.classList.add('no');
          inp.select();
        });
      });
    }
    if(document.body) build(); else document.addEventListener('DOMContentLoaded',build);
  }
  start();
})();

export function renderAdminPage() {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>ZJMF 管理后台</title>
  <style>
    :root{--bg:#f8f4ea;--panel:#fffdf8;--panel2:#f0eadf;--ink:#172033;--muted:#647084;--line:#dfd6c8;--ok:#0f9f6e;--warn:#b87503;--bad:#d84657;--blue:#176b87}
    *{box-sizing:border-box}body{margin:0;min-height:100vh;background:radial-gradient(circle at 8% 0,#fff7df,transparent 34%),linear-gradient(145deg,var(--bg),#ffffff 58%,#efe7d8);color:var(--ink);font-family:"Bahnschrift","Aptos Display","Trebuchet MS",sans-serif}
    body:before{content:"";position:fixed;inset:0;background-image:linear-gradient(rgba(23,32,51,.055) 1px,transparent 1px),linear-gradient(90deg,rgba(23,32,51,.055) 1px,transparent 1px);background-size:40px 40px;pointer-events:none}
    main{position:relative;width:min(1180px,calc(100% - 34px));margin:0 auto;padding:42px 0}.top{display:flex;justify-content:space-between;gap:20px;align-items:end;margin-bottom:22px}
    h1{font-size:clamp(34px,6vw,72px);line-height:.9;margin:0;letter-spacing:-.06em}.tag{color:var(--blue);letter-spacing:.2em;font-size:12px;text-transform:uppercase}.muted{color:var(--muted)}
    .panel{border:1px solid var(--line);background:rgba(255,253,248,.92);border-radius:28px;padding:22px;box-shadow:0 24px 70px rgba(67,51,25,.13);backdrop-filter:blur(14px)}.grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}.wide{grid-column:1/-1}
    label{display:block;color:var(--muted);font-size:12px;margin:12px 0 6px}input,select{width:100%;border:1px solid var(--line);background:#fff;color:var(--ink);border-radius:14px;padding:12px 13px;font:inherit}input::placeholder{color:#9a8f80}
    button{border:0;border-radius:16px;padding:12px 16px;font-weight:800;color:white;background:linear-gradient(135deg,var(--blue),var(--ok));cursor:pointer}button:disabled{opacity:.58;cursor:wait}button.secondary{background:#fff;color:var(--ink);border:1px solid var(--line)}button.danger{background:linear-gradient(135deg,#ff8a8a,var(--bad))}
    .actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:16px}.hidden{display:none!important}.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:14px}.card{padding:16px;border:1px solid var(--line);background:#fff;border-radius:20px}.pill{display:inline-flex;padding:7px 10px;border-radius:999px;background:rgba(15,159,110,.11);color:var(--ok);border:1px solid rgba(15,159,110,.28);font-size:12px}.pill.warn{background:rgba(184,117,3,.12);color:var(--warn);border-color:rgba(184,117,3,.28)}
    .toast{position:sticky;top:12px;z-index:5;margin:-6px 0 18px;padding:14px 16px;border:1px solid var(--line);border-left:6px solid var(--blue);background:#fff;border-radius:18px;box-shadow:0 16px 45px rgba(67,51,25,.12);font-weight:800}.toast.ok{border-left-color:var(--ok)}.toast.bad{border-left-color:var(--bad);color:var(--bad)}
    pre{white-space:pre-wrap;word-break:break-word;background:#f3eee5;border:1px solid var(--line);border-radius:18px;padding:14px;color:#263147;min-height:54px}.login{max-width:520px;margin:12vh auto}.row2{display:grid;grid-template-columns:1fr 1fr;gap:12px}@media(max-width:780px){.top,.grid,.row2{grid-template-columns:1fr;display:grid}.wide{grid-column:auto}}
  </style>
</head>
<body>
  <main>
    <section id="login" class="panel login">
      <p class="tag">ZJMF ADMIN</p><h1>管理后台</h1>
      <p class="muted">输入 GitHub Secret 中的 <b>ZJMF_ADMIN_TOKEN</b>，用于管理服务商、服务器和通知。</p>
      <label for="token">管理密码</label><input id="token" type="password" autocomplete="current-password" placeholder="ZJMF_ADMIN_TOKEN">
      <div class="actions"><button id="loginBtn">登录</button><a class="muted" href="/">返回状态页</a></div><pre id="loginMsg"></pre>
    </section>
    <section id="app" class="hidden">
      <div class="top"><div><p class="tag">ZJMF CONTROL</p><h1>监控控制台</h1><p class="muted">配置会写入 D1，密钥仅通过 HTTPS 提交到 Worker。</p></div><div class="actions"><button id="runBtn">立即检查</button><button class="secondary" id="refreshBtn">刷新</button><button class="danger" id="logoutBtn">退出</button></div></div>
      <div id="toast" class="toast">操作中状态会显示在这里。</div>
      <div class="grid">
        <form id="providerForm" class="panel"><h2>服务商</h2><label>名称</label><input name="name" value="heyunidc"><label>显示名称</label><input name="display_name" value="核云"><label>API 地址</label><input name="api_base_url" value="https://www.heyunidc.cn/v1"><label>账号</label><input name="api_account" placeholder="手机号或邮箱"><label>API 密钥</label><input name="api_password" type="password" placeholder="留空则保留旧密钥"><div class="actions"><button>保存服务商</button></div></form>
        <form id="serverForm" class="panel"><h2>服务器</h2><label>产品 ID</label><input name="id" placeholder="例如 8564"><label>名称</label><input name="name" placeholder="例如 主服务器"><label>服务商</label><input name="provider" value="heyunidc"><div class="row2"><div><label>每日重启上限</label><input name="daily_reboot_limit" type="number" value="3"></div><div><label>定时重启</label><input name="scheduled_reboot" placeholder="04:00 或留空"></div></div><label>启用</label><select name="enabled"><option value="true">启用</option><option value="false">禁用</option></select><div class="actions"><button>保存服务器</button></div></form>
        <form id="settingsForm" class="panel"><h2>通知和策略</h2><label>pushplus Token</label><input name="pushplus_token" type="password" placeholder="留空不会更新旧 token"><div class="row2"><div><label>疑似阈值</label><input name="suspect_threshold" type="number" value="2"></div><div><label>重启冷却秒数</label><input name="reboot_cooldown" type="number" value="300"></div></div><div class="row2"><div><label>恢复超时秒数</label><input name="recover_timeout" type="number" value="300"></div><div><label>时区</label><input name="timezone" value="Asia/Shanghai"></div></div><div class="actions"><button>保存设置</button></div></form>
        <section class="panel"><h2>当前状态</h2><div id="statusCards" class="cards"></div></section>
        <section class="panel wide"><h2>输出</h2><pre id="out">等待操作...</pre></section>
      </div>
    </section>
  </main>
  <script>
    const $=id=>document.getElementById(id), out=$('out');let token=localStorage.getItem('zjmf_admin_token')||'';
    const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const isIp=s=>/^\\d{1,3}(?:\\.\\d{1,3}){3}$/.test(String(s||'').trim()), serverName=v=>isIp(v.name)?'服务器 #'+v.id:v.name;
    const scrub=x=>Array.isArray(x)?x.map(scrub):x&&typeof x==='object'?Object.fromEntries(Object.entries(x).filter(([k])=>!['ip','api_password','pushplus_token'].includes(k)).map(([k,v])=>[k,scrub(v)])):x;
    const auth=()=>({authorization:'Bearer '+token,'content-type':'application/json; charset=utf-8'});
    async function api(path,opt={}){const r=await fetch(path,{...opt,headers:{...auth(),...(opt.headers||{})}});const t=await r.text();let j;try{j=JSON.parse(t)}catch{j={raw:t}}if(!r.ok)throw new Error(j.error||t||r.status);return j}
    function formData(form){return Object.fromEntries(new FormData(form).entries())}
    function show(x){out.textContent=typeof x==='string'?x:JSON.stringify(scrub(x),null,2)}
    function toast(msg,type=''){const el=$('toast');if(el){el.className='toast '+type;el.textContent=msg}}
    async function task(label,fn){const buttons=[...document.querySelectorAll('button')];toast(label+'操作中...');buttons.forEach(b=>b.disabled=true);try{const result=await fn();toast(label+'完成','ok');return result}catch(e){toast(label+'失败：'+e.message,'bad');show(e.message);throw e}finally{buttons.forEach(b=>b.disabled=false)}}
    function fill(formId,data){const form=$(formId);for(const [key,value] of Object.entries(data||{})){if(key==='pushplus_token'||key==='ip')continue;const el=form.querySelector('[name="'+key+'"]');if(el)el.value=String(value??'')}}
    function fillOverview(data){fill('providerForm',(data.providers||[])[0]||{});fill('serverForm',(data.servers||[])[0]||{});fill('settingsForm',data.settings||{})}
    async function refresh(){const s=await fetch('/api/status').then(r=>r.json());$('statusCards').innerHTML=(s.servers||[]).map(v=>'<div class="card"><span class="pill '+(v.state==='healthy'?'':'warn')+'">'+esc(v.state||'unknown')+'</span><h3>'+esc(serverName(v))+'</h3><p class="muted">#'+esc(v.id)+' · '+esc(v.last_status_value||'N/A')+'</p><p>今日重启：'+esc(v.reboot_count_today||0)+' 次</p></div>').join('')||'<p class="muted">暂无服务器</p>';show(s)}
    async function enter(){const overview=await api('/api/admin/overview');fillOverview(overview);localStorage.setItem('zjmf_admin_token',token);$('login').classList.add('hidden');$('app').classList.remove('hidden');toast('已登录，控制台可操作','ok');show(overview);await refresh()}
    $('loginBtn').onclick=async()=>{token=$('token').value.trim();try{await enter()}catch(e){$('loginMsg').textContent='登录失败：'+e.message}}
    $('logoutBtn').onclick=()=>{localStorage.removeItem('zjmf_admin_token');location.reload()};$('refreshBtn').onclick=()=>task('刷新',refresh).catch(()=>{});$('runBtn').onclick=()=>task('立即检查',async()=>{const x=await api('/api/admin/run',{method:'POST'});show(x);await refresh();return x}).catch(()=>{});
    $('providerForm').onsubmit=e=>{e.preventDefault();task('保存服务商',async()=>{const b=formData(e.target);if(!b.api_password)delete b.api_password;const x=await api('/api/admin/providers',{method:'POST',body:JSON.stringify(b)});show(x);return x}).catch(()=>{})}
    $('serverForm').onsubmit=e=>{e.preventDefault();task('保存服务器',async()=>{const b=formData(e.target);b.name=b.name||'服务器 #'+b.id;b.enabled=b.enabled==='true';b.daily_reboot_limit=Number(b.daily_reboot_limit||3);b.check_method='api_only';const x=await api('/api/admin/servers',{method:'POST',body:JSON.stringify(b)});await refresh();return x}).catch(()=>{})}
    $('settingsForm').onsubmit=e=>{e.preventDefault();task('保存设置',async()=>{const b=formData(e.target);if(b.pushplus_token)b.webhook_url='https://www.pushplus.plus/send',b.webhook_type='pushplus';else delete b.pushplus_token;const x=await api('/api/admin/settings',{method:'POST',body:JSON.stringify(b)});show(x);return x}).catch(()=>{})}
    if(token)enter().catch(()=>localStorage.removeItem('zjmf_admin_token'));
  </script>
</body>
</html>`;
}

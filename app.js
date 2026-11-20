(()=>{
'use strict';
/* ================= утилиты ================= */
const $=(s,r=document)=>r.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const COL=['#13897d','#e8684a','#6c5ce7','#d9a441','#2f6bed','#d6428c'];
const MON=['янв','фев','мар','апр','мая','июн','июл','авг','сен','окт','ноя','дек'];
const fdate=d=>{const [y,m,x]=d.split('-');return `${+x} ${MON[+m-1]} ${y}`};
const fshort=d=>{const [y,m,x]=d.split('-');return `${x}.${m}.${y.slice(2)}`};
const nf=v=>typeof v!=='number'?String(v):String(Math.round(v*100)/100).replace('.',',');
const nf1=v=>String(Math.round(v*10)/10).replace('.',',');
const nk=s=>String(s).toLowerCase().replace(/ё/g,'е').replace(/[^a-zа-я0-9%#]+/g,' ').trim();
const DIFF=new Set(['Нейтрофилы','Лимфоциты','Моноциты','Эозинофилы','Базофилы']);
const ST={ok:'Норма',hi:'Выше нормы',lo:'Ниже нормы',na:'—'};
const TABS=['o','a','d','r'];
const TTL={o:'Анализ семьи',c:'Было → стало',a:'Анализы',d:'Динамика',r:'Советы',s:'Настройки',i:'Показатель'};

/* ================= справочник ================= */
const KBI=new Map();
KB.forEach(k=>[k.n,...(k.al||[])].forEach(a=>KBI.set(nk(a),k)));
function resolve(name){
 const n=nk(name);let k=KBI.get(n);
 if(!k){const b=n.replace(/ (абс|abs|#|%)$/,'').replace(/ (абс|abs)$/,'');k=KBI.get(b)}
 if(k)return{canon:k.n,kb:k};
 const np=nk(String(name).replace(/\(.*?\)/g,''));const kk=np&&np!==n?KBI.get(np):null;
 return kk?{canon:String(name).trim(),kb:kk}:{canon:String(name).trim(),kb:null};
}

/* ================= статус и сравнение ================= */
const stat=r=>r.f?r.f:typeof r.v!=='number'?'na':(r.lo!=null&&r.v<r.lo)?'lo':(r.hi!=null&&r.v>r.hi)?'hi':(r.lo==null&&r.hi==null)?'na':'ok';
const dist=r=>{const s=stat(r);if(s==='lo')return(r.lo-r.v)/Math.abs(r.lo||1);if(s==='hi')return(r.v-r.hi)/Math.abs(r.hi||1);return(typeof r.v!=='number'&&r.f&&r.f!=='ok')?0.4:0};
const level=d=>d<0.1?'незначительно':d<0.3?'умеренно':'выражено';
const rng=r=>r.lo!=null&&r.hi!=null?(r.lo===r.hi?nf(r.lo):`${nf(r.lo)}–${nf(r.hi)}`):r.hi!=null?`до ${nf(r.hi)}`:r.lo!=null?`от ${nf(r.lo)}`:'—';
const val=r=>typeof r.v==='number'?nf(r.v):esc(r.v);
const vcls=r=>({hi:'vhi',lo:'vlo',ok:'vok',na:'vna'}[stat(r)]);
function cmpr(prev,now){
 if(!prev)return null;
 const num=typeof now.v==='number'&&typeof prev.v==='number';
 const dv=num?Math.round((now.v-prev.v)*1000)/1000:null;
 const pc=num&&prev.v?dv/Math.abs(prev.v)*100:null;
 const dn=dist(now),dp=dist(prev);
 const t=dn<dp-1e-9?'better':dn>dp+1e-9?'worse':'same';
 return{dv,pc,t,units:prev.u===now.u};
}
function deltaPill(c){
 if(!c)return '<span class="pill na">первый замер</span>';
 if(c.dv==null)return `<span class="pill ${c.t==='better'?'good':c.t==='worse'?'bad':'same'}">${c.t==='better'?'лучше':c.t==='worse'?'хуже':'без изменений'}</span>`;
 if(c.dv===0)return '<span class="pill same">= без изменений</span>';
 const up=c.dv>0,sg=up?'+':'−',cls=c.t==='better'?'good':c.t==='worse'?'bad':'same';
 return `<span class="pill ${cls}">${up?'▲':'▼'} ${sg}${nf(Math.abs(c.dv))}${c.pc!=null?` · ${sg}${nf1(Math.abs(c.pc))}%`:''}</span>`;
}

/* ================= модель данных ================= */
let D=null,S={mid:null,base:'prev',cf:'all',am:'tb',tf:'all',aq:'',dg:'Все',from:'a',last:''};
function build(raw,demo){
 const members=(raw.members||[]).map((m,i)=>({...m,i,col:COL[i%COL.length]}));
 const mem={},by={};
 members.forEach(m=>{mem[m.id]=m;by[m.id]={recs:[],series:new Map(),dates:[]}});
 const uniq=new Map();
 (raw.tests||[]).forEach(t=>{
  if(!mem[t.m])return;
  const urine=/моч|оам|urin/i.test(t.p||'');
  let r=resolve(urine?t.n+' моча':t.n);
  if(urine&&!r.kb)r={canon:String(t.n).trim()+' (моча)',kb:null};
  let key=r.canon;
  if(DIFF.has(key))key+=t.u==='%'?' %':' абс.';
  const rec={m:t.m,d:t.d,key,canon:r.canon,kb:r.kb,g:r.kb?r.kb.g:(t.p||'Прочее'),p:t.p||'',v:t.v,u:t.u||'',lo:t.lo??null,hi:t.hi??null,f:t.f||null,lab:t.lab||''};
  uniq.set(t.m+'|'+t.d+'|'+key+'|'+(t.lab||''),rec);
 });
 uniq.forEach(r=>by[r.m].recs.push(r));
 members.forEach(m=>{
  const b=by[m.id];
  b.recs.sort((x,y)=>x.d<y.d?-1:x.d>y.d?1:0);
  {const us={},fu={};b.recs.forEach(r=>{if(!r.u)return;(us[r.key]=us[r.key]||new Set()).add(r.u);if(fu[r.key]===undefined)fu[r.key]=r.u});
   b.recs.forEach(r=>{if(r.u&&us[r.key].size>1&&fu[r.key]!==r.u)r.key=r.key+' ('+r.u+')'})}
  b.recs.forEach(r=>{if(!b.series.has(r.key))b.series.set(r.key,[]);b.series.get(r.key).push(r)});
  b.dates=[...new Set(b.recs.map(r=>r.d))].sort().reverse();
 });
 D={members,mem,by,demo:!!demo,docs:(raw.docs||[]).filter(x=>mem[x.m])};
 S.mid=(members.find(m=>by[m.id].recs.length)||members[0]||{}).id||null;
}
const latest=mid=>[...D.by[mid].series.values()].map(a=>a[a.length-1]);
function baseOf(arr){
 if(arr.length<2)return null;
 if(S.base==='first')return arr[0];
 if(S.base.startsWith('d:')){const d=S.base.slice(2);const c=arr.filter(r=>r.d<=d&&r!==arr[arr.length-1]);return c.length?c[c.length-1]:null}
 return arr[arr.length-2];
}
const avHtml=(m,l)=>`<span class="av ${l?'l':''}" style="background:${m.col}">${esc((m.name||'?')[0])}</span>`;
const gOrder=g=>{const i=GROUPS.indexOf(g);return i<0?99:i};

/* ================= шифрование ================= */
const b64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
let PW=null;
async function derive(pw,salt,it){
 const base=await crypto.subtle.importKey('raw',new TextEncoder().encode(pw),'PBKDF2',false,['deriveKey']);
 return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:it||250000,hash:'SHA-256'},base,{name:'AES-GCM',length:256},false,['decrypt']);
}
async function decrypt(pw){
 const d=window.AZ_DATA;if(!d)throw new Error('nodata');
 const key=await derive(pw,b64(d.salt),d.it);
 const pt=await crypto.subtle.decrypt({name:'AES-GCM',iv:b64(d.iv)},key,b64(d.ct));
 PW=pw;
 return JSON.parse(new TextDecoder().decode(pt));
}
/* оригиналы: файл = [соль 16][iv 12][шифртекст], расшифровка в браузере */
async function downloadDoc(id,btn){
 const d=D.docs.find(x=>x.id===id);if(!d||!PW)return;
 const old=btn?btn.innerHTML:'';if(btn){btn.disabled=true;btn.textContent='Расшифровка…'}
 try{
  const res=await fetch(d.f);if(!res.ok)throw new Error('http '+res.status);
  const u=new Uint8Array(await res.arrayBuffer());
  const key=await derive(PW,u.slice(0,16),(window.AZ_DATA||{}).it);
  const pt=await crypto.subtle.decrypt({name:'AES-GCM',iv:u.slice(16,28)},key,u.slice(28));
  const url=URL.createObjectURL(new Blob([pt],{type:d.mime||'application/pdf'}));
  const a=document.createElement('a');a.href=url;a.download=d.n||('analiz-'+d.d);document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),30000);
 }catch(e){alert('Не удалось скачать оригинал. Проверьте интернет и попробуйте ещё раз.')}
 if(btn){btn.disabled=false;btn.innerHTML=old}
}
const DL='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:6px"><path d="M12 3v12M7 11l5 5 5-5M5 21h14"/></svg>';
const docBtn=x=>`<button class="dlb" data-act="doc" data-v="${esc(x.id)}">${DL}Оригинал · ${esc(x.t||'бланк')}</button>`;

/* ================= визуальные блоки ================= */
function barHtml(now,prev){
 if(typeof now.v!=='number'||(now.lo==null&&now.hi==null))return '';
 const vals=[now.v];if(prev&&typeof prev.v==='number')vals.push(prev.v);
 let a,b;const {lo,hi}=now;
 if(lo!=null&&hi!=null){const w=(hi-lo)||Math.abs(hi)||1;a=lo-w*.6;b=hi+w*.6}
 else if(hi!=null){a=0;b=hi*1.5}
 else{a=0;b=lo*2}
 a=Math.min(a,...vals);b=Math.max(b,...vals);
 if(a===b){a-=1;b+=1}
 const p=v=>4+(v-a)/(b-a)*92;
 const zl=lo!=null?p(lo):4,zr=hi!=null?p(hi):96;
 let h=`<div class="bar"><div class="tr"></div><div class="zn" style="left:${zl}%;width:${zr-zl}%"></div>`;
 if(lo!=null)h+=`<span class="lb" style="left:${zl}%">${nf(lo)}</span>`;
 if(hi!=null)h+=`<span class="lb" style="left:${zr}%">${nf(hi)}</span>`;
 if(prev&&typeof prev.v==='number'){const x1=p(prev.v),x2=p(now.v);h+=`<div class="ln" style="left:${Math.min(x1,x2)}%;width:${Math.abs(x2-x1)}%"></div><div class="mk p" style="left:${x1}%"></div>`}
 h+=`<div class="mk nw ${stat(now)}" style="left:${p(now.v)}%"></div></div>`;
 return h;
}
function spark(a,h=56){
 const W=150,H=h,vs=a.map(r=>r.v).filter(v=>typeof v==='number');
 if(!vs.length)return '';
 const l=a[a.length-1];
 let mn=Math.min(...vs,l.lo??Infinity),mx=Math.max(...vs,l.hi??-Infinity);
 if(!isFinite(mn))mn=Math.min(...vs);if(!isFinite(mx))mx=Math.max(...vs);
 if(mn===mx){mn-=1;mx+=1}
 const pad=(mx-mn)*.12;mn-=pad;mx+=pad;
 const y=v=>H-4-(v-mn)/(mx-mn)*(H-8),x=i=>a.length>1?8+i*(W-16)/(a.length-1):W/2;
 const band=l.lo!=null||l.hi!=null?`<rect x="0" y="${l.hi!=null?y(l.hi):0}" width="${W}" height="${Math.max(2,(l.lo!=null?y(l.lo):H)-(l.hi!=null?y(l.hi):0))}" fill="#1c9b66" opacity=".12"/>`:'';
 const pts=a.map((r,i)=>[x(i),y(r.v)]);
 return `<svg viewBox="0 0 ${W} ${H}">${band}${a.length>1?`<polyline fill="none" stroke="#0e6b63" stroke-width="2" stroke-linejoin="round" points="${pts.map(q=>q.join(',')).join(' ')}"/>`:''}${pts.map((q,i)=>`<circle cx="${q[0]}" cy="${q[1]}" r="3.6" fill="${({ok:'#1c9b66',hi:'#e0483e',lo:'#2f6bed',na:'#8a9a96'})[stat(a[i])]}" stroke="#fff" stroke-width="1.5"/>`).join('')}</svg>`;
}
function bigChart(a){
 const W=640,H=250,L=46,R=18,T=26,B=36;
 const num=a.filter(r=>typeof r.v==='number');
 if(!num.length)return '<p class="mu">Нет числовых значений для графика.</p>';
 const l=a[a.length-1];
 let mn=Math.min(...num.map(r=>r.v),l.lo??Infinity),mx=Math.max(...num.map(r=>r.v),l.hi??-Infinity);
 if(!isFinite(mn))mn=Math.min(...num.map(r=>r.v));if(!isFinite(mx))mx=Math.max(...num.map(r=>r.v));
 if(mn===mx){mn-=1;mx+=1}
 const pad=(mx-mn)*.15;mn-=pad;mx+=pad;if(mn<0&&Math.min(...num.map(r=>r.v))>=0)mn=0;
 const y=v=>T+(H-T-B)*(1-(v-mn)/(mx-mn));
 const t0=new Date(a[0].d).getTime(),t1=new Date(a[a.length-1].d).getTime();
 const x=(r,i)=>a.length===1?(L+W-R)/2:(t1>t0?L+(new Date(r.d).getTime()-t0)/(t1-t0)*(W-L-R):L+i*(W-L-R)/(a.length-1));
 let s=`<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="График показателя">`;
 for(let i=0;i<=4;i++){const v=mn+(mx-mn)*i/4,yy=y(v);s+=`<line x1="${L}" x2="${W-R}" y1="${yy}" y2="${yy}" stroke="#e8f0ed"/><text x="${L-6}" y="${yy+4}" text-anchor="end" font-size="11" fill="#66807b">${nf((mx-mn)>8?Math.round(v):(mx-mn)>1?Math.round(v*10)/10:Math.round(v*100)/100)}</text>`}
 if(l.lo!=null||l.hi!=null){const y1=l.hi!=null?y(l.hi):T,y2=l.lo!=null?y(l.lo):H-B;s+=`<rect x="${L}" y="${y1}" width="${W-L-R}" height="${Math.max(2,y2-y1)}" fill="#1c9b66" opacity=".11"/>`;
  if(l.hi!=null)s+=`<line x1="${L}" x2="${W-R}" y1="${y(l.hi)}" y2="${y(l.hi)}" stroke="#1c9b66" stroke-dasharray="4 4" opacity=".6"/><text x="${W-R}" y="${y(l.hi)-4}" text-anchor="end" font-size="10.5" fill="#1c9b66">норма до ${nf(l.hi)}</text>`;
  if(l.lo!=null)s+=`<line x1="${L}" x2="${W-R}" y1="${y(l.lo)}" y2="${y(l.lo)}" stroke="#1c9b66" stroke-dasharray="4 4" opacity=".6"/><text x="${W-R}" y="${y(l.lo)+13}" text-anchor="end" font-size="10.5" fill="#1c9b66">норма от ${nf(l.lo)}</text>`}
 const pts=a.map((r,i)=>typeof r.v==='number'?[x(r,i),y(r.v),r]:null).filter(Boolean);
 if(pts.length>1)s+=`<polyline fill="none" stroke="#0e6b63" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round" points="${pts.map(q=>q[0]+','+q[1]).join(' ')}"/>`;
 const step=Math.max(1,Math.ceil(a.length/6));let lx=null;
 pts.forEach((q,i)=>{const c=({ok:'#1c9b66',hi:'#e0483e',lo:'#2f6bed',na:'#8a9a96'})[stat(q[2])];
  s+=`<circle cx="${q[0]}" cy="${q[1]}" r="6" fill="${c}" stroke="#fff" stroke-width="2.5"/>`;
  if(a.length<=8||i===pts.length-1||i%step===0)s+=`<text x="${q[0]}" y="${q[1]-12}" text-anchor="${pts.length>1&&i===pts.length-1?'end':pts.length>1&&i===0?'start':'middle'}" font-size="12.5" font-weight="700" fill="#102a27">${nf(q[2].v)}</text>`;
  const last=i===pts.length-1,first=i===0;
  const okGap=(lx===null||q[0]-lx>58)&&(last||pts[pts.length-1][0]-q[0]>58);
  if(first||last||okGap){lx=q[0];s+=`<text x="${q[0]}" y="${H-12}" text-anchor="${pts.length>1&&last?'end':pts.length>1&&first?'start':'middle'}" font-size="11" fill="#66807b">${fshort(q[2].d)}</text>`}});
 return s+'</svg>';
}
function ring(ok,out){
 const tot=ok+out;if(!tot)return '<svg viewBox="0 0 54 54"><circle cx="27" cy="27" r="22" fill="none" stroke="#e8efed" stroke-width="7"/></svg>';
 const C=2*Math.PI*22,a=ok/tot*C;
 return `<svg viewBox="0 0 54 54"><circle cx="27" cy="27" r="22" fill="none" stroke="${out?'#f6cdc9':'#c9ecda'}" stroke-width="7"/><circle cx="27" cy="27" r="22" fill="none" stroke="#1c9b66" stroke-width="7" stroke-linecap="round" stroke-dasharray="${a} ${C-a}" transform="rotate(-90 27 27)"/><text x="27" y="31" text-anchor="middle" font-size="12" font-weight="800" fill="#102a27">${Math.round(ok/tot*100)}%</text></svg>`;
}
const link=(mid,key)=>`#i/${mid}/${encodeURIComponent(key)}`;
const noData=m=>`<div class="card empty"><b>У ${esc(m.name)} пока нет анализов</b>Пришлите PDF или распознанный текст — я добавлю их сюда.</div>`;
const prHead=m=>`<div class="pr-only"><h2>${esc(m.name)} · анализы</h2><div class="mu">Распечатано ${fdate(new Date().toISOString().slice(0,10))}</div></div>`;

/* ================= КОПИРОВАНИЕ (для WhatsApp: *жирный*, _курсив_, • списки) ================= */
const CPI='<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/></svg>';
const cpb=(v,label)=>`<button class="cp" data-act="copy" data-v="${esc(v)}" title="Скопировать для WhatsApp">${CPI}${label===undefined?'Копировать':label}</button>`;
const WB=s=>`*${s}*`,WI=s=>`_${s}_`;
const MK={hi:'🔺',lo:'🔻',ok:'✅',na:'▫️'};
const tv=r=>typeof r.v==='number'?nf(r.v):String(r.v);
const tvu=r=>tv(r)+(r.u&&!r.key?.endsWith(' %')?' '+r.u:'');
const tnorm=r=>(r.lo!=null||r.hi!=null)?` (норма ${rng(r)})`:'';
const tline=(r,withPrev)=>{
 const arr=D.by[r.m].series.get(r.key)||[],p=withPrev&&arr.length>1?arr[arr.length-2]:null;
 let t=`• ${WB(r.key)} — ${WB(tvu(r))} ${MK[stat(r)]}${tnorm(r)}`;
 if(p&&p!==r)t+=` · было ${tv(p)}${typeof p.v==='number'&&typeof r.v==='number'&&p.v!==r.v?(r.v>p.v?' ↑':' ↓'):''}`;
 return t;
};
const lastLabs=(mid,d)=>[...new Set(D.by[mid].recs.filter(r=>r.d===d).map(r=>r.lab).filter(Boolean))].join(', ');
const SIGN='_Справочно, не диагноз. Из приложения «Анализ семьи»._';
function txtRep(mid){
 const m=D.mem[mid],b=D.by[mid],L=latest(mid);
 const bad=L.filter(r=>{const s=stat(r);return s==='hi'||s==='lo'}).sort((x,y)=>dist(y)-dist(x));
 const good=L.filter(r=>stat(r)==='ok'),d=b.dates[0],lab=lastLabs(mid,d);
 let t=`🩺 ${WB(m.name.toUpperCase())} · анализы\n📅 ${WI('последний: '+fdate(d)+(lab?' · '+lab:''))}\n`;
 if(bad.length){t+=`\n${WB('⚠️ Вне нормы ('+bad.length+')')}\n`+bad.map(r=>tline(r,true)+(r.d!==d?` · ${fshort(r.d)}`:'')).join('\n')+'\n'}
 else t+=`\n${WB('✅ Всё в норме')}\n`;
 const bt=[],wr=[];b.series.forEach(arr=>{if(arr.length>1){const c=cmpr(arr[arr.length-2],arr[arr.length-1]);if(c.t==='better')bt.push(arr[arr.length-1].key);if(c.t==='worse')wr.push(arr[arr.length-1].key)}});
 if(wr.length||bt.length){t+=`\n${WB('📈 С прошлого раза')}\n`;if(bt.length)t+=`• Лучше: ${bt.slice(0,8).join(', ')}${bt.length>8?' и ещё '+(bt.length-8):''}\n`;if(wr.length)t+=`• Хуже: ${wr.slice(0,8).join(', ')}${wr.length>8?' и ещё '+(wr.length-8):''}\n`}
 t+=`\n${WB('📋 Итого')}\n• В норме: ${WB(good.length)} из ${good.length+bad.length}\n• Анализов сдано: ${b.dates.length}\n\n${SIGN}`;
 return t;
}
function txtFam(){
 let t=`🏠 ${WB('ЗДОРОВЬЕ СЕМЬИ')}\n📅 ${WI(fdate(new Date().toISOString().slice(0,10)))}\n`;
 D.members.forEach(m=>{const b=D.by[m.id];if(!b.recs.length){t+=`\n👤 ${WB(m.name)}\n• нет анализов\n`;return}
  const L=latest(m.id),bad=L.filter(r=>{const s=stat(r);return s==='hi'||s==='lo'}).sort((x,y)=>dist(y)-dist(x));
  t+=`\n👤 ${WB(m.name)} · ${WI(fdate(b.dates[0]))}\n`;
  t+=bad.length?`• Вне нормы: ${WB(bad.length)}\n`+bad.slice(0,5).map(r=>`   ${MK[stat(r)]} ${r.key} — ${tvu(r)}`).join('\n')+(bad.length>5?`\n   …и ещё ${bad.length-5}`:'')+'\n':`• ✅ Всё в норме\n`});
 return t+`\n${SIGN}`;
}
function txtGroups(mid,rows,title){
 const m=D.mem[mid],gs={};rows.forEach(r=>(gs[r.g]=gs[r.g]||[]).push(r));
 let t=`📋 ${WB(m.name.toUpperCase())} · ${title}\n`;
 Object.keys(gs).sort((x,y)=>gOrder(x)-gOrder(y)).forEach(g=>{t+=`\n${WB(g)}\n`+gs[g].sort((x,y)=>kbo(x)-kbo(y)).map(r=>tline(r,true)+(rows.dateEach?'':` · ${fshort(r.d)}`)).join('\n')+'\n'});
 return t+`\n${SIGN}`;
}
function txtDate(mid,d){
 const m=D.mem[mid],rs=D.by[mid].recs.filter(r=>r.d===d),lab=lastLabs(mid,d),gs={};
 rs.forEach(r=>(gs[r.g]=gs[r.g]||[]).push(r));
 let t=`📅 ${WB(m.name.toUpperCase())} · ${WB(fdate(d))}${lab?'\n'+WI(lab):''}\n`;
 Object.keys(gs).sort((x,y)=>gOrder(x)-gOrder(y)).forEach(g=>{t+=`\n${WB(g)}\n`+gs[g].map(r=>tline(r,false)).join('\n')+'\n'});
 return t+`\n${SIGN}`;
}
function txtInd(mid,key){
 const m=D.mem[mid],arr=D.by[mid].series.get(key);if(!arr)return '';
 const now=arr[arr.length-1],s=stat(now),kb=now.kb;
 let t=`🔬 ${WB(key)} · ${m.name}\n\n${MK[s]} ${WB(tvu(now))}${tnorm(now)} · ${fshort(now.d)}${s==='hi'||s==='lo'?'\n'+WI(ST[s]+' · '+level(dist(now))):''}\n`;
 if(arr.length>1)t+=`\n${WB('📈 История')}\n`+arr.slice().reverse().slice(0,8).map(r=>`• ${fshort(r.d)} — ${WB(tv(r))}${r.lab?' · '+r.lab:''}`).join('\n')+'\n';
 const blk=kb&&(s==='hi'||s==='lo')&&kb[s];
 if(blk){t+=`\n${WB('❓ Возможные причины')}\n`+blk.why.map(x=>'• '+x).join('\n')+`\n\n${WB('✅ Что можно сделать')}\n`+blk.do.map(x=>'• '+x).join('\n')+'\n';if(blk.who)t+=`\n${WB('👨‍⚕️ К кому обратиться')}\n• ${blk.who}\n`}
 return t+`\n${SIGN}`;
}
function txtRecs(mid){
 const m=D.mem[mid],L=latest(mid),map={};L.forEach(r=>map[r.key]=r);const sf=k=>map[k]?stat(map[k]):null;
 const out=L.filter(r=>{const x=stat(r);return x==='hi'||x==='lo'}).sort((x,y)=>dist(y)-dist(x));
 let t=`💡 ${WB(m.name.toUpperCase())} · советы\n`;
 const hit=RULES.filter(r=>{try{return r.f(sf)}catch(e){return false}});
 if(hit.length)t+=`\n${WB('🎯 Главное')}\n`+hit.map(r=>`• ${WB(r.t)}\n   ${r.p}`).join('\n')+'\n';
 if(out.length){t+=`\n${WB('⚠️ Разбор отклонений')}\n`;out.forEach(r=>{const side=stat(r),blk=r.kb&&r.kb[side];t+=`\n${MK[side]} ${WB(r.key)} — ${tvu(r)}${tnorm(r)}\n`+(blk?'   Причины: '+blk.why.slice(0,4).join('; ')+'\n   Что делать: '+blk.do.slice(0,3).join('; ')+'\n'+(blk.who?'   К кому: '+blk.who+'\n':''):'')})}
 else t+=`\n${WB('✅ Всё в норме')}\n`;
 return t+`\n${SIGN}`;
}
function buildCopy(v){
 const [k,mid,ex]=v.split('|'),x=ex?decodeURIComponent(ex):'';
 if(k==='fam')return txtFam();
 if(k==='rep')return txtRep(mid);
 if(k==='ind')return txtInd(mid,x);
 if(k==='dt')return txtDate(mid,x);
 if(k==='recs')return txtRecs(mid);
 if(k==='gr'){const rows=latest(mid).filter(r=>r.g===x);return txtGroups(mid,rows,x)}
 if(k==='tb'){const q=nk(S.aq);let rows=latest(mid).filter(r=>!q||nk(r.key).includes(q)||nk(r.p||'').includes(q));
  if(S.tf==='out')rows=rows.filter(r=>{const s=stat(r);return s==='hi'||s==='lo'});
  return txtGroups(mid,rows,S.tf==='out'?'вне нормы':'последние значения')}
 return '';
}
async function copyText(t){
 try{await navigator.clipboard.writeText(t);return true}catch(_){}
 try{const a=document.createElement('textarea');a.value=t;a.style.cssText='position:fixed;opacity:0;top:0';document.body.appendChild(a);a.focus();a.select();const ok=document.execCommand('copy');a.remove();return ok}catch(_){return false}
}

/* ================= ОБЗОР ================= */
function vOverview(){
 const tests=D.members.reduce((n,m)=>n+D.by[m.id].dates.length,0);
 const inds=D.members.reduce((n,m)=>n+D.by[m.id].series.size,0);
 let out=0;const att=[],better=[],worse=[];
 D.members.forEach(m=>{
  D.by[m.id].series.forEach((arr,key)=>{
   const now=arr[arr.length-1],s=stat(now);
   if(s==='hi'||s==='lo'){out++;att.push({m,now,arr})}
   const p=arr.length>1?arr[arr.length-2]:null;
   if(p){const c=cmpr(p,now);const dd=Math.abs(dist(now)-dist(p));
    if(c.t==='better')better.push({m,now,p,c,dd});else if(c.t==='worse')worse.push({m,now,p,c,dd})}
  });
 });
 att.sort((x,y)=>dist(y.now)-dist(x.now));better.sort((x,y)=>y.dd-x.dd);worse.sort((x,y)=>y.dd-x.dd);
 let h=`<section class="hero"><h1>Здоровье семьи</h1><p>${D.members.length?'Сводка по последним анализам каждого. Нажмите на любую плитку, чтобы увидеть детали.':''}</p>
 <div class="kpis"><div class="kpi" data-go="#a/${S.mid}"><b>${D.members.length}</b><span>человек</span></div><div class="kpi" data-go="#a/${S.mid}"><b>${tests}</b><span>сдач анализов</span></div><div class="kpi" data-go="#d/${S.mid}"><b>${inds}</b><span>показателей</span></div><div class="kpi ${out?'warn':''}" data-go="#r/${S.mid}"><b>${out}</b><span>вне нормы</span></div></div></section>`;
 h+=`<div class="sec"><h2>Семья</h2><small>последние анализы</small></div><div class="cprow">${cpb('fam','Копировать сводку семьи')}</div><div class="mg">`;
 D.members.forEach(m=>{
  const b=D.by[m.id],L=latest(m.id),ok=L.filter(r=>stat(r)==='ok').length,o=L.filter(r=>{const s=stat(r);return s==='hi'||s==='lo'}).length;
  let bt=0,wr=0;b.series.forEach(arr=>{if(arr.length>1){const c=cmpr(arr[arr.length-2],arr[arr.length-1]);if(c.t==='better')bt++;if(c.t==='worse')wr++}});
  h+=`<div class="mc" style="--mcol:${m.col}" data-go="#a/${m.id}"><div class="mc-h">${avHtml(m,1)}<div><b>${esc(m.name)}</b><small>${b.dates.length?'анализ от '+fdate(b.dates[0]):'нет данных'}</small></div></div>`;
  h+=b.recs.length?`<div class="ring">${ring(ok,o)}<div class="t"><b>${o?o+' вне нормы':'всё в норме'}</b><br>${L.length} показ.${bt||wr?`<br><span class="vok" title="улучшилось">▲${bt}</span> <span class="vhi" title="ухудшилось">▼${wr}</span>`:''}</div></div>`:'<div class="mu" style="font-size:13px">Добавьте первые анализы</div>';
  h+='</div>';
 });
 h+='</div>';
 if(att.length){
  h+=`<div class="sec"><h2>Требует внимания</h2><small>${att.length} показ.</small></div><div class="card" style="padding:6px 14px">`;
  att.slice(0,10).forEach(x=>{const s=stat(x.now);
   h+=`<div class="attn" data-go="${link(x.m.id,x.now.key)}">${avHtml(x.m)}<div class="nm"><b>${esc(x.now.key)}</b><small>${esc(x.m.name)} · норма ${rng(x.now)} · ${fshort(x.now.d)}</small></div><div class="vl"><b class="${vcls(x.now)}">${val(x.now)} <small>${esc(x.now.u)}</small></b><span class="pill ${s}">${s==='hi'?'выше':s==='lo'?'ниже':'откл.'}</span></div></div>`});
  h+='</div>'+(att.length>10?`<p class="mu" style="text-align:center;font-size:13px">Ещё ${att.length-10}: откройте «Советы» у нужного человека</p>`:'');
 }else if(inds){h+=`<div class="ins g"><b>Все последние показатели в норме</b><p>Так держать. Следите за динамикой и сдавайте анализы по плану.</p></div>`}
 const chg=(arr,title,cls)=>arr.length?`<div class="sec"><h2>${title}</h2><small>с прошлого раза</small></div><div class="card" style="padding:6px 14px">${arr.slice(0,5).map(x=>`<div class="attn" data-go="${link(x.m.id,x.now.key)}">${avHtml(x.m)}<div class="nm"><b>${esc(x.now.key)}</b><small>${esc(x.m.name)} · было ${val(x.p)} → стало ${val(x.now)} ${esc(x.now.u)}</small></div>${deltaPill(x.c)}</div>`).join('')}</div>`:'';
 h+=chg(worse,'Ухудшилось','bad')+chg(better,'Улучшилось','good');
 if(!inds)h+=`<div class="card empty"><b>Пока нет данных</b>Пришлите анализы (PDF или текст) — я разложу их по людям, и здесь появится сравнение «было → стало».</div>`;
 h+=`<p class="disc">Приложение помогает увидеть динамику и подготовиться к разговору с врачом. Оно не ставит диагноз и не заменяет консультацию.</p>`;
 return h;
}

/* ================= СРАВНЕНИЕ ================= */
function vCompare(mid){
 const m=D.mem[mid],b=D.by[mid];
 if(!b.recs.length)return noData(m);
 const rows=[];
 b.series.forEach((arr,key)=>{const now=arr[arr.length-1],base=baseOf(arr);rows.push({key,now,prev:base,c:cmpr(base,now),s:stat(now)})});
 const cnt={all:rows.length,ok:rows.filter(r=>r.s==='ok').length,out:rows.filter(r=>r.s==='hi'||r.s==='lo').length,better:rows.filter(r=>r.c&&r.c.t==='better').length,worse:rows.filter(r=>r.c&&r.c.t==='worse').length};
 const F={all:()=>true,out:r=>r.s==='hi'||r.s==='lo',better:r=>r.c&&r.c.t==='better',worse:r=>r.c&&r.c.t==='worse'};
 const shown=rows.filter(F[S.cf]||F.all);
 const dates=b.dates.slice(1);
 let h=prHead(m);
 if(b.dates.length<2)h+=`<div class="ins"><b>Пока один анализ</b><p>Сравнение «было → стало» появится после следующей сдачи. Пока показаны текущие значения и нормы.</p></div>`;
 else h+=`<div class="ctl"><span class="mu" style="font-size:13px">Сравнить с:</span><select data-act="base"><option value="prev" ${S.base==='prev'?'selected':''}>предыдущим анализом</option><option value="first" ${S.base==='first'?'selected':''}>самым первым</option>${dates.map(d=>`<option value="d:${d}" ${S.base==='d:'+d?'selected':''}>анализом от ${fdate(d)}</option>`).join('')}</select></div>`;
 h+=`<div class="sum"><div class="${S.cf==='all'?'on':''}" data-act="cf" data-v="all"><b>${cnt.all}</b><span>всего</span></div><div class="${S.cf==='out'?'on':''}" data-act="cf" data-v="out"><b class="vhi">${cnt.out}</b><span>вне нормы</span></div><div class="${S.cf==='better'?'on':''}" data-act="cf" data-v="better"><b class="vok">${cnt.better}</b><span>лучше</span></div><div class="${S.cf==='worse'?'on':''}" data-act="cf" data-v="worse"><b class="vhi">${cnt.worse}</b><span>хуже</span></div></div>`;
 if(!shown.length)return h+`<div class="card empty"><b>Ничего не найдено</b>В этом фильтре нет показателей.</div>`;
 const gs={};shown.forEach(r=>(gs[r.now.g]=gs[r.now.g]||[]).push(r));
 Object.keys(gs).sort((a,b2)=>gOrder(a)-gOrder(b2)).forEach(g=>{
  h+=`<div class="gh">${esc(g)}</div>`;
  gs[g].sort((x,y)=>dist(y.now)-dist(x.now)).forEach(r=>{
   const {now,prev,c,s}=r;
   h+=`<div class="ind ${s}" data-go="${link(mid,r.key)}"><div class="ind-h"><div class="nm">${esc(r.key)}${r.key.endsWith(' %')?'':`<small>${esc(now.u)}</small>`}</div>${deltaPill(c)}</div>${barHtml(now,prev)}
   <div class="ind-v"><div class="pv">${prev?`<label>Было · ${fshort(prev.d)}</label><b>${val(prev)}</b>`:`<label>Было</label><b>—</b>`}</div><div class="arr">→</div><div class="nw"><label>Стало · ${fshort(now.d)}</label><b class="${vcls(now)}">${val(now)}</b></div>
   <div class="nr"><span>норма ${rng(now)} ${esc(now.u)}</span><span class="pill ${s}">${ST[s]}</span></div></div>${c&&!c.units?'<div class="warn-u">⚠ единицы измерения в анализах различаются</div>':''}${prev&&prev.lab&&now.lab&&prev.lab!==now.lab?'<div class="warn-u">⚠ разные лаборатории: методы и нормы могут отличаться</div>':''}</div>`});
 });
 return h;
}

/* ================= АНАЛИЗЫ ================= */
const KBO=new Map(KB.map((k,i)=>[k,i]));
const kbo=r=>r.kb?KBO.get(r.kb):999;
const arrow=c=>c&&c.dv!=null&&c.dv!==0?`<i class="ar ${c.t==='better'?'good':c.t==='worse'?'bad':'same'}">${c.dv>0?'▲':'▼'}</i>`:'';
function vAnalyses(mid){
 const m=D.mem[mid],b=D.by[mid];
 if(!b.recs.length)return noData(m);
 const MODES=[['tb','Таблица'],['sv','Свод'],['date','Даты'],['group','Группы']];
 if(!MODES.some(x=>x[0]===S.am))S.am='tb';
 let h=prHead(m)+`<div class="tg modes">${MODES.map(x=>`<button class="${S.am===x[0]?'on':''}" data-act="am" data-v="${x[0]}">${x[1]}</button>`).join('')}</div><div class="cprow">${cpb('rep|'+mid,'Копировать отчёт')}${S.am==='tb'?cpb('tb|'+mid,'Копировать таблицу'):''}</div>`;
 if(S.am==='sv')return h+vSummary(mid);
 const q=nk(S.aq);
 const ok=r=>!q||nk(r.key).includes(q)||nk(r.canon).includes(q)||nk(r.p).includes(q);
 h+=`<div class="ctl"><input type="search" placeholder="Поиск показателя (например: гемоглобин)" value="${esc(S.aq)}" data-act="aq"></div>`;
 if(S.am==='tb')return h+vMatrix(mid,ok);
 return h+vDetail(mid,ok);
}
/* --- Таблица: одна строка на показатель; слева последнее значение, правее — прошлые --- */
function vMatrix(mid,ok){
 const b=D.by[mid];
 let rows=[...b.series.entries()].map(([key,arr])=>({key,arr,now:arr[arr.length-1]})).filter(r=>ok(r.now));
 const isOut=r=>{const s=stat(r.now);return s==='hi'||s==='lo'};
 const nOut=rows.filter(isOut).length,nAll=rows.length;
 if(S.tf==='out')rows=rows.filter(isOut);
 let h=`<div class="tg flt"><button class="${S.tf!=='out'?'on':''}" data-act="tf" data-v="all">Все<b>${nAll}</b></button><button class="${S.tf==='out'?'on':''}" data-act="tf" data-v="out">Вне нормы<b>${nOut}</b></button></div>`;
 if(!rows.length)return h+'<div class="card empty"><b>Ничего не найдено</b>Попробуйте другое название или фильтр.</div>';
 const N=Math.min(6,Math.max(...rows.map(r=>r.arr.length)));
 const multiLab=new Set(b.recs.map(r=>r.lab)).size>1;
 const HD=['Последний','Предыдущий','Ранее','Ранее','Ранее','Ранее'];
 h+=`<div class="mx"><table><thead><tr><th class="rn">Показатель<small>единицы · норма</small></th>${Array.from({length:N},(_,i)=>`<th class="dh ${i===0?'new':''}">${HD[i]}</th>`).join('')}</tr></thead><tbody>`;
 const gs={};rows.forEach(r=>(gs[r.now.g]=gs[r.now.g]||[]).push(r));
 Object.keys(gs).sort((x,y)=>gOrder(x)-gOrder(y)).forEach(g=>{
  h+=`<tr class="gr"><th colspan="${N+1}"><span>${esc(g)}</span></th></tr>`;
  gs[g].sort((x,y)=>kbo(x.now)-kbo(y.now)).forEach(r=>{
   const now=r.now,c=cmpr(r.arr.length>1?r.arr[r.arr.length-2]:null,now);
   h+=`<tr class="rw" data-go="${link(mid,r.key)}"><th class="rn"><b>${esc(r.key)}</b><small>${r.key.endsWith(' %')?'':esc(now.u)+' · '}${rng(now)}</small></th>`;
   for(let i=0;i<N;i++){
    const x=r.arr[r.arr.length-1-i];
    if(!x){h+=`<td class="e ${i===0?'new':''}"></td>`;continue}
    h+=`<td class="c ${stat(x)} ${i===0?'new':''}"><span class="dt">${fshort(x.d)}${multiLab&&x.lab?' · '+esc(x.lab[0]):''}</span><b>${val(x)}</b>${i===0?arrow(c):''}</td>`;
   }
   h+='</tr>';
  });
 });
 return h+`</tbody></table></div><p class="hint">${N>2?'Листайте таблицу вправо — там прошлые анализы. ':''}<span class="vhi">Красное</span> — выше нормы, <span class="vlo">синее</span> — ниже. Стрелка — изменение с прошлого раза (зелёная — к лучшему). Нажмите на строку — график и причины.${multiLab?' Е — Еркемед, О — Олимп: нормы лабораторий различаются.':''}</p>`;
}
/* --- Свод: коротко, что не так; остальное по клику --- */
function vSummary(mid){
 const b=D.by[mid],L=latest(mid);
 const bad=L.filter(r=>{const s=stat(r);return s==='hi'||s==='lo'}).sort((x,y)=>dist(y)-dist(x));
 const good=L.filter(r=>stat(r)==='ok'),na=L.filter(r=>stat(r)==='na');
 const last=b.dates[0],labs=[...new Set(b.recs.filter(r=>r.d===last).map(r=>r.lab).filter(Boolean))].join(', ');
 const row=r=>{const arr=D.by[mid].series.get(r.key),p=arr.length>1?arr[arr.length-2]:null,s=stat(r),c=cmpr(p,r);
  return `<div class="sv ${s}" data-go="${link(mid,r.key)}"><div class="sn"><b>${esc(r.key)}</b><small>норма ${rng(r)}${r.key.endsWith(' %')?'':' '+esc(r.u)}${r.d!==last?' · '+fshort(r.d):''}${p&&p.lab&&r.lab&&p.lab!==r.lab?' · ⚠ разные лаборатории':''}</small></div><div class="sw">${p?`<span class="pv">${val(p)}</span><span class="ar0">→</span>`:''}<b class="${vcls(r)}">${val(r)}</b>${c?arrow(c):''}</div></div>`};
 let h=`<div class="card svh"><div class="ring">${ring(good.length,bad.length)}<div class="t"><b>${bad.length?bad.length+' вне нормы':'Всё в норме'}</b><br>из ${good.length+bad.length} показателей с нормой</div></div><div class="mu" style="font-size:13px;margin-top:8px">Последний анализ: <b style="color:var(--ink)">${fdate(last)}</b>${labs?' · '+esc(labs):''}</div></div>`;
 if(bad.length)h+=`<div class="sec"><h2>Вне нормы</h2><small>было → стало</small></div><div class="card svl">${bad.map(row).join('')}</div><div class="ctl"><button class="btn line" data-go="#r/${mid}">Что делать и причины →</button></div>`;
 else h+=`<div class="ins g"><b>Все последние показатели в норме</b></div>`;
 if(good.length)h+=`<details class="okd"><summary>В норме · ${good.length}</summary><div class="card svl">${good.map(row).join('')}</div></details>`;
 if(na.length)h+=`<details class="okd"><summary>Без нормы в бланке · ${na.length}</summary><div class="card svl">${na.map(row).join('')}</div></details>`;
 return h+`<div class="ctl"><button class="btn line" data-act="am" data-v="tb">Открыть таблицу со всеми датами →</button></div>`;
}
/* --- Подробно: по датам / по группам --- */
function vDetail(mid,ok){
 const b=D.by[mid];let h='';
 const row=(r,ml)=>{const s=stat(r);return `<div class="tr" data-go="${link(r.m,r.key)}"><div class="n">${esc(r.key)}${ml&&r.lab?`<div class="mu" style="font-size:11px;font-weight:500">${esc(r.lab)}</div>`:''}</div><div class="v ${vcls(r)}">${val(r)}<small>${esc(r.u)}</small></div><div class="r">${rng(r)}</div><div class="dot ${s}" title="${ST[s]}"></div></div>`};
 let any=false;
 if(S.am==='date'){
  b.dates.forEach(d=>{
   const rs=b.recs.filter(r=>r.d===d&&ok(r));if(!rs.length)return;any=true;
   const o=rs.filter(r=>{const s=stat(r);return s==='hi'||s==='lo'}).length,lab=[...new Set(rs.map(r=>r.lab).filter(Boolean))].join(', ');
   h+=`<div class="dcard"><div class="dc-h"><div><b>${fdate(d)}</b><small>${lab?esc(lab)+' · ':''}${rs.length} показ.</small></div><span class="pill ${o?'hi':'ok'}">${o?o+' вне нормы':'всё в норме'}</span></div><div class="cprow in">${cpb('dt|'+mid+'|'+d)}</div>`;
   const dd=(D.docs||[]).filter(x=>x.m===mid&&x.d===d);if(dd.length)h+=`<div class="docs">${dd.map(docBtn).join('')}</div>`;
   const multiLab=[...new Set(rs.map(r=>r.lab))].length>1;
   const ps={};rs.forEach(r=>(ps[r.g]=ps[r.g]||[]).push(r));
   Object.keys(ps).sort((x,y)=>gOrder(x)-gOrder(y)).forEach(g=>{h+=`<div class="pn">${esc(g)}</div>`+ps[g].map(r=>row(r,multiLab)).join('')});
   h+='</div>';
  });
 }else{
  const L=latest(mid).filter(ok);const gs={};L.forEach(r=>(gs[r.g]=gs[r.g]||[]).push(r));
  Object.keys(gs).sort((x,y)=>gOrder(x)-gOrder(y)).forEach(g=>{any=true;h+=`<div class="dcard"><div class="dc-h"><div><b>${esc(g)}</b><small>последние значения</small></div></div><div class="cprow in">${cpb('gr|'+mid+'|'+encodeURIComponent(g))}</div>`+gs[g].map(r=>`<div class="tr" data-go="${link(r.m,r.key)}"><div class="n">${esc(r.key)}<div class="mu" style="font-size:11px;font-weight:500">${fshort(r.d)}</div></div><div class="v ${vcls(r)}">${val(r)}<small>${esc(r.u)}</small></div><div class="r">${rng(r)}</div><div class="dot ${stat(r)}"></div></div>`).join('')+'</div>'});
 }
 if(!any)h+='<div class="card empty"><b>Ничего не найдено</b>Попробуйте другое название.</div>';
 return h;
}

/* ================= ДИНАМИКА ================= */
function vDynamics(mid){
 const m=D.mem[mid],b=D.by[mid];
 if(!b.recs.length)return noData(m);
 const all=[...b.series.entries()].map(([k,a])=>({k,a,now:a[a.length-1]}));
 const groups=['Все',...[...new Set(all.map(x=>x.now.g))].sort((x,y)=>gOrder(x)-gOrder(y))];
 if(!groups.includes(S.dg))S.dg='Все';
 let h=`<div class="tg">${groups.map(g=>`<button class="${S.dg===g?'on':''}" data-act="dg" data-v="${esc(g)}">${esc(g)}</button>`).join('')}</div>`;
 const list=all.filter(x=>S.dg==='Все'||x.now.g===S.dg).sort((x,y)=>(dist(y.now)-dist(x.now))||(y.a.length-x.a.length));
 h+='<div class="dg">';
 list.forEach(x=>{const s=stat(x.now),c=cmpr(x.a.length>1?x.a[x.a.length-2]:null,x.now);
  h+=`<div class="dn" data-go="${link(mid,x.k)}"><div class="dn-h"><b>${esc(x.k)}</b><span class="dot ${s}"></span></div><div class="big ${vcls(x.now)}">${val(x.now)} <small>${esc(x.now.u)}</small></div>${spark(x.a)}<div class="ft">${x.a.length} изм. · норма ${rng(x.now)}</div><div style="margin-top:6px;display:flex;align-items:center;justify-content:space-between;gap:6px">${c?deltaPill(c):'<span></span>'}${cpb('ind|'+mid+'|'+encodeURIComponent(x.k),'')}</div></div>`});
 return h+'</div>';
}

/* ================= ПОКАЗАТЕЛЬ ================= */
function vIndicator(mid,key){
 const m=D.mem[mid],arr=m&&D.by[mid].series.get(key);
 if(!arr)return `<button class="back" data-act="back">‹ Назад</button><div class="card empty"><b>Показатель не найден</b></div>`;
 const now=arr[arr.length-1],prev=arr.length>1?arr[arr.length-2]:null,s=stat(now),kb=now.kb,c=cmpr(prev,now);
 let h=`<button class="back" data-act="back">‹ Назад</button><div class="ip-h">${avHtml(m,1)}<div><h1>${esc(key)}</h1><small>${esc(m.name)} · ${esc(now.g)}</small></div></div><div class="cprow">${cpb('ind|'+mid+'|'+encodeURIComponent(key),'Копировать показатель')}</div>
 <div class="card"><div style="display:flex;justify-content:space-between;align-items:flex-end;gap:10px;flex-wrap:wrap"><div class="ip-big ${vcls(now)}">${val(now)} <small>${esc(now.u)}</small></div><div style="text-align:right"><span class="pill ${s}">${ST[s]}${s==='hi'||s==='lo'?' · '+level(dist(now)):''}</span><div class="mu" style="font-size:12.5px;margin-top:4px">норма ${rng(now)} ${esc(now.u)} · ${fdate(now.d)}</div></div></div>
 ${prev?`<div style="margin-top:10px;display:flex;gap:8px;align-items:center;flex-wrap:wrap">${deltaPill(c)}<span class="mu" style="font-size:13px">было ${val(prev)} ${esc(prev.u)} · ${fdate(prev.d)}</span></div>`:''}${barHtml(now,prev)}</div>`;
 h+=`<div class="card"><h3 style="font-size:15px;margin-bottom:6px">Динамика</h3>${bigChart(arr)}</div>`;
 h+=`<div class="card"><h3 style="font-size:15px;margin-bottom:4px">История замеров</h3>`+arr.slice().reverse().map((r,i,rev)=>{const p=rev[i+1]||null,cc=cmpr(p,r);return `<div class="hr"><span class="d">${fdate(r.d)}${r.lab?' · '+esc(r.lab):''}</span><span><span class="v ${vcls(r)}">${val(r)}</span> <small class="mu">${esc(r.u)}</small> ${cc?deltaPill(cc):''}</span></div>`}).join('')+'</div>';
 if(kb){
  h+=`<div class="card"><h3 style="font-size:15px">Что это</h3><p style="margin:6px 0 0">${esc(kb.what)}</p></div>`;
  const side=s==='hi'||s==='lo'?s:null,blk=side&&kb[side];
  if(blk)h+=recCard(blk,side,true);
  else if(side)h+=`<div class="card"><b>Обсудите с врачом</b><p class="mu" style="margin:4px 0 0">Для этого показателя у меня нет готового разбора на ${side==='hi'?'повышение':'снижение'}. Сравните с референсом вашей лаборатории и покажите результат врачу.</p></div>`;
  else if(s==='ok')h+=`<div class="ins g"><b>Значение в пределах нормы</b><p>Продолжайте следить за динамикой при следующих сдачах.</p></div>`;
 }else if(s==='hi'||s==='lo')h+=`<div class="card"><b>Обсудите с врачом</b><p class="mu" style="margin:4px 0 0">Для этого показателя нет справочного разбора. Ориентируйтесь на референс вашей лаборатории и консультацию врача.</p></div>`;
 const others=D.members.filter(x=>x.id!==mid&&D.by[x.id].series.has(key));
 if(others.length){h+=`<div class="card"><h3 style="font-size:15px;margin-bottom:4px">У других членов семьи</h3>`+others.map(x=>{const r=D.by[x.id].series.get(key).slice(-1)[0];return `<div class="fm" data-go="${link(x.id,key)}">${avHtml(x)}<span class="nm">${esc(x.name)}<br><small class="mu" style="font-weight:500">${fdate(r.d)}</small></span><span class="vv ${vcls(r)}">${val(r)} <small class="mu">${esc(r.u)}</small></span><span class="dot ${stat(r)}"></span></div>`}).join('')+'</div>'}
 return h+`<p class="disc">Справочная информация, не диагноз. Причину определяет врач по совокупности данных.</p>`;
}
function recCard(blk,side,open){
 return `<div class="card" style="border-left:5px solid ${side==='hi'?'var(--hi)':'var(--lo)'}"><h3 style="font-size:15px">Возможные причины ${side==='hi'?'повышения':'снижения'}</h3><ul style="margin:6px 0 0;padding-left:18px">${blk.why.map(x=>`<li>${esc(x)}</li>`).join('')}</ul><h3 style="font-size:15px;margin-top:12px">Что можно сделать</h3><ul style="margin:6px 0 0;padding-left:18px">${blk.do.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>${blk.who?`<p style="margin:10px 0 0"><b>К кому:</b> ${esc(blk.who)}</p>`:''}</div>`;
}

/* ================= СОВЕТЫ ================= */
const RULES=[
 {t:'Картина похожа на железодефицитную анемию',p:'Низкие гемоглобин и ферритин вместе чаще всего означают нехватку железа. Подтвердить и найти причину (питание, потери крови) нужно у врача.',k:['Гемоглобин','Ферритин'],f:s=>s('Гемоглобин')==='lo'&&s('Ферритин')==='lo'},
 {t:'Скрытый дефицит железа',p:'Запасы железа (ферритин) снижены, а гемоглобин ещё в норме: это ранняя стадия. Самое время скорректировать питание и обсудить с врачом.',k:['Ферритин','Гемоглобин'],f:s=>s('Ферритин')==='lo'&&s('Гемоглобин')==='ok'},
 {t:'Железо: картина неоднозначная',p:'Насыщение трансферрина снижено, а ферритин повышен. Ферритин растёт при воспалении и инфекциях, поэтому по нему трудно судить о запасах железа. Стоит обсудить с педиатром и сопоставить с гемоглобином, цветовым показателем и MCH.',k:['Насыщение трансферрина','Ферритин','Цветовой показатель','Гемоглобин'],f:s=>s('Насыщение трансферрина')==='lo'&&s('Ферритин')==='hi'},
 {t:'Возможен дефицит B12 или фолатов',p:'Повышенный MCV вместе с низким B12 или фолатами типичен для этого дефицита.',k:['MCV','Витамин B12','Фолиевая кислота'],f:s=>s('MCV')==='hi'&&(s('Витамин B12')==='lo'||s('Фолиевая кислота')==='lo')},
 {t:'Нарушение углеводного обмена',p:'Повышены показатели сахара. Нужны глюкоза натощак, HbA1c и консультация эндокринолога; помогают питание и ходьба.',k:['Глюкоза','HbA1c','Инсулин','HOMA-IR'],f:s=>['Глюкоза','HbA1c','HOMA-IR'].some(k=>s(k)==='hi')},
 {t:'Липидный профиль требует внимания',p:'Холестерин, ЛПНП или триглицериды выше нормы (или ЛПВП ниже). Повод оценить рацион, активность и сердечно-сосудистый риск.',k:['Холестерин общий','ЛПНП','ЛПВП','Триглицериды'],f:s=>['Холестерин общий','ЛПНП','Триглицериды'].some(k=>s(k)==='hi')||s('ЛПВП')==='lo'},
 {t:'Повышены печёночные ферменты',p:'АЛТ, АСТ или ГГТ выше нормы. Исключите алкоголь, жирное и нагрузки за несколько дней и пересдайте; затем УЗИ печени.',k:['АЛТ','АСТ','ГГТ'],f:s=>['АЛТ','АСТ','ГГТ'].some(k=>s(k)==='hi')},
 {t:'Почки: стоит проверить',p:'Креатинин или мочевина выше нормы, либо СКФ снижена. Сначала исключите обезвоживание и нагрузки, затем анализ мочи и УЗИ.',k:['Креатинин','Мочевина','СКФ'],f:s=>s('Креатинин')==='hi'||s('Мочевина')==='hi'||s('СКФ')==='lo'},
 {t:'Щитовидная железа: отклонение ТТГ',p:'ТТГ вне нормы. Обычно добавляют Т4 свободный и АТ-ТПО, при необходимости УЗИ щитовидной железы.',k:['ТТГ','Т4 свободный','АТ-ТПО'],f:s=>s('ТТГ')==='hi'||s('ТТГ')==='lo'},
 {t:'Дефицит витамина D',p:'Это частая находка. Дозу и срок приёма определяет врач; контроль обычно через 2–3 месяца.',k:['Витамин D'],f:s=>s('Витамин D')==='lo'},
 {t:'Признаки воспаления',p:'Лейкоциты, СОЭ или СРБ повышены. Это неспецифично: нужен осмотр врача и повтор после выздоровления.',k:['Лейкоциты','СОЭ','С-реактивный белок'],f:s=>['Лейкоциты','СОЭ','С-реактивный белок'].filter(k=>s(k)==='hi').length>=2},
 {t:'Возможная аллергия или паразиты',p:'Эозинофилы повышены. Часто смотрят общий IgE и анализ кала на паразитов; при симптомах — аллерголог.',k:['Эозинофилы %','Эозинофилы абс.'],f:s=>s('Эозинофилы %')==='hi'||s('Эозинофилы абс.')==='hi'}
];
function vRecs(mid){
 const m=D.mem[mid],b=D.by[mid];
 if(!b.recs.length)return noData(m);
 const L=latest(mid),map={};L.forEach(r=>map[r.key]=r);
 const s=k=>map[k]?stat(map[k]):null;
 const out=L.filter(r=>{const x=stat(r);return x==='hi'||x==='lo'}).sort((x,y)=>dist(y)-dist(x));
 let h=prHead(m)+`<div class="cprow">${cpb('recs|'+mid,'Копировать советы')}</div>`;
 const hit=RULES.filter(r=>{try{return r.f(s)}catch(e){return false}});
 if(hit.length){h+=`<div class="sec"><h2>Главное</h2><small>сочетания показателей</small></div>`+hit.map(r=>`<div class="ins"><b>${esc(r.t)}</b><p>${esc(r.p)}</p><div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap">${r.k.filter(k=>map[k]).map(k=>`<span class="pill ${stat(map[k])}" style="cursor:pointer" data-go="${link(mid,k)}">${esc(k)} ${val(map[k])} · ${fshort(map[k].d)}</span>`).join('')}</div></div>`).join('')}
 else if(!out.length)h+=`<div class="ins g"><b>Все последние показатели в норме</b><p>Отклонений нет. Продолжайте здоровый образ жизни и повторяйте контроль по плану.</p></div>`;
 if(out.length){
  h+=`<div class="sec"><h2>Разбор отклонений</h2><small>${out.length} показ.</small></div>`;
  out.forEach((r,i)=>{const side=stat(r),kb=r.kb,blk=kb&&kb[side],arr=D.by[mid].series.get(r.key),p=arr.length>1?arr[arr.length-2]:null,c=cmpr(p,r);
   h+=`<details class="rc ${side}" ${i<2?'open':''}><summary><div class="nm"><b>${esc(r.key)}</b><small>${val(r)} ${esc(r.u)} · норма ${rng(r)} · ${level(dist(r))} · ${fshort(r.d)}</small></div><span class="pill ${side}">${side==='hi'?'выше':'ниже'}</span></summary><div class="rb">
   ${p?`<p style="margin:0 0 6px">${deltaPill(c)} <span class="mu" style="font-size:13px">было ${val(p)} → стало ${val(r)}</span></p>`:''}
   ${kb?`<p class="what">${esc(kb.what)}</p>`:''}
   ${blk?`<h4>Возможные причины</h4><ul>${blk.why.map(x=>`<li>${esc(x)}</li>`).join('')}</ul><h4>Что можно сделать</h4><ul>${blk.do.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>${blk.who?`<h4>К кому обратиться</h4><p style="margin:0;font-size:14px">${esc(blk.who)}</p>`:''}`:`<p class="mu" style="font-size:14px">Для этого показателя нет готового разбора. Сравните с референсом лаборатории и обсудите результат с врачом.</p>`}
   <a class="go" data-go="${link(mid,r.key)}">История и график ›</a> ${cpb('ind|'+mid+'|'+encodeURIComponent(r.key))}</div></details>`});
 }
 const bord=L.filter(r=>stat(r)==='ok'&&r.lo!=null&&r.hi!=null&&typeof r.v==='number').filter(r=>{const w=r.hi-r.lo;return r.v-r.lo<w*.08||r.hi-r.v<w*.08});
 if(bord.length)h+=`<div class="sec"><h2>На границе нормы</h2><small>стоит присмотреться</small></div><div class="card" style="padding:6px 14px">${bord.map(r=>`<div class="attn" data-go="${link(mid,r.key)}"><div class="nm"><b>${esc(r.key)}</b><small>норма ${rng(r)} ${esc(r.u)}</small></div><div class="vl"><b>${val(r)} <small>${esc(r.u)}</small></b></div></div>`).join('')}</div>`;
 const today=new Date(),old=L.filter(r=>(today-new Date(r.d))/864e5>300);
 const re=[];if(out.length)re.push(`Показатели вне нормы (${out.slice(0,5).map(r=>r.key).join(', ')}${out.length>5?'…':''}) — пересдать через 4–8 недель после коррекции, по согласованию с врачом.`);
 if(old.length)re.push(`Давно не сдавали (больше 10 месяцев): ${old.slice(0,6).map(r=>r.key).join(', ')}${old.length>6?'…':''}.`);
 re.push('Сдавайте анализы в одной и той же лаборатории: так сравнение «было → стало» точнее.');
 h+=`<div class="sec"><h2>План контроля</h2></div><div class="card"><ul class="gen" style="margin:0;padding-left:18px">${re.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>`;
 h+=`<div class="sec"><h2>Общие правила</h2></div><div class="card"><ul class="gen" style="margin:0;padding-left:18px"><li>Кровь сдают утром натощак (8–12 часов без еды), вода без газа разрешена.</li><li>За 1–2 дня до сдачи: без алкоголя, тяжёлых тренировок и жирной пищи.</li><li>Сон 7–8 часов, ежедневная ходьба, достаточно воды.</li><li>Добавки и препараты принимайте только по назначению врача.</li><li>У детей нормы зависят от возраста: ориентируйтесь на референсы бланка и педиатра.</li></ul></div>`;
 return h+`<p class="disc">Подсказки справочные и не заменяют консультацию врача. Диагноз и лечение определяет только врач.</p>`;
}

/* ================= НАСТРОЙКИ ================= */
function vSettings(){
 const all=D.members.flatMap(m=>D.by[m.id].recs),ds=[...new Set(all.map(r=>r.d))].sort();
 return `<div class="sec"><h2>О приложении</h2></div><div class="card"><div class="hr"><span class="d">Членов семьи</span><span class="v">${D.members.length}</span></div><div class="hr"><span class="d">Записей показателей</span><span class="v">${all.length}</span></div><div class="hr"><span class="d">Период</span><span class="v">${ds.length?fshort(ds[0])+' — '+fshort(ds[ds.length-1]):'—'}</span></div><div class="hr"><span class="d">Режим</span><span class="v">${D.demo?'ДЕМО':'Ваши данные'}</span></div></div>
 ${(D.docs||[]).length?`<div class="sec"><h2>Оригиналы документов</h2><small>${D.docs.length} файл.</small></div><div class="card" style="padding:6px 14px">${D.docs.slice().sort((x,y)=>x.d<y.d?1:-1).map(x=>`<div class="attn">${avHtml(D.mem[x.m])}<div class="nm"><b>${fdate(x.d)} · ${esc(x.lab||'')}</b><small>${esc(D.mem[x.m].name)} · ${esc(x.t||'')}</small></div><button class="dlb" data-act="doc" data-v="${esc(x.id)}">${DL}Скачать</button></div>`).join('')}</div>`:''}
 <div class="card"><b>Как добавлять анализы</b><p class="mu" style="margin:6px 0 0">Пришлите мне PDF (лучше) или распознанный текст с указанием, чей это анализ. Я проверю значения и нормы бланка, объединю с предыдущими и обновлю приложение.</p></div>
 <div class="card"><b>Конфиденциальность</b><p class="mu" style="margin:6px 0 0">Файл с данными зашифрован (AES-256-GCM) и расшифровывается только в вашем браузере по паролю. Пароль нигде не хранится.</p></div>
 <div class="ctl"><button class="btn line" data-act="print">Печать / PDF</button><button class="btn line" data-act="refresh">Обновить приложение</button><button class="btn" data-act="lock">Заблокировать</button></div>`;
}

/* ================= маршрутизация ================= */
function parse(){const p=location.hash.slice(1).split('/');return{t:p[0]||'o',a:p[1]?decodeURIComponent(p[1]):null,b:p[2]?decodeURIComponent(p[2]):null}}
function render(){
 if(!D)return;
 const r=parse();if(r.t==='c'){location.replace('#a/'+(r.a||S.mid||''));return}
 let t=TABS.concat(['i','s']).includes(r.t)?r.t:'o';
 if(t==='i'&&D.mem[r.a])S.mid=r.a;else if(r.a&&D.mem[r.a])S.mid=r.a;
 if(!D.mem[S.mid])S.mid=(D.members[0]||{}).id;
 if(TABS.includes(t)&&t!=='o')S.from=t;
 const mid=S.mid,m=D.mem[mid];
 const showChips=['a','d','r'].includes(t);
 $('#chips').classList.toggle('hide',!showChips);
 $('#chips').innerHTML=showChips?D.members.map(x=>`<div class="mchip ${x.id===mid?'on':''}" data-go="#${t}/${x.id}">${avHtml(x)}${esc(x.name)}</div>`).join(''):'';
 $('#ttl').textContent=t==='o'?'Анализ семьи':(TTL[t]||'Анализ семьи');
 document.querySelectorAll('#dock a').forEach(a=>a.classList.toggle('on',a.dataset.t===(t==='i'?S.from:t)));
 let h=D.demo?'<div class="demo-b">ДЕМО: вымышленные данные для просмотра дизайна</div>':'';
 if(t==='o')h+=vOverview();
 else if(t==='s')h+=vSettings();
 else if(!m)h+='<div class="card empty"><b>Нет членов семьи</b></div>';
 else if(t==='a')h+=vAnalyses(mid);
 else if(t==='d')h+=vDynamics(mid);
 else if(t==='r')h+=vRecs(mid);
 else if(t==='i')h+=vIndicator(r.a,r.b);
 const view=$('#view'),keep=(S.last===t+mid+(r.b||''));
 const sy=window.scrollY;
 view.innerHTML=h;
 if(keep)window.scrollTo(0,sy);else window.scrollTo(0,0);
 S.last=t+mid+(r.b||'');
}
function lock(){D=null;PW=null;S={mid:null,base:'prev',cf:'all',am:'tb',tf:'all',aq:'',dg:'Все',from:'a',last:''};$('#view').innerHTML='';$('#app').classList.add('hide');const c=$('#cover');c.classList.remove('hide');requestAnimationFrame(()=>c.classList.remove('out'));history.replaceState(null,'',location.pathname);$('#pw').value='';pin='';paint()}
function enter(){const c=$('#cover');c.classList.add('out');setTimeout(()=>c.classList.add('hide'),520);$('#app').classList.remove('hide');if(!location.hash)history.replaceState(null,'',location.pathname+'#o');render()}

/* ================= события ================= */
document.addEventListener('click',e=>{
 const a=e.target.closest('[data-act]');
 if(a){const act=a.dataset.act,v=a.dataset.v;
  if(act==='cf'){S.cf=S.cf===v?'all':v;render();return}
  if(act==='am'){S.am=v;render();return}
  if(act==='tf'){S.tf=v;render();return}
  if(act==='dg'){S.dg=v;render();return}
  if(act==='back'){if(history.length>1)history.back();else location.hash='#'+S.from+'/'+S.mid;return}
  if(act==='doc'){downloadDoc(v,a);return}
  if(act==='copy'){const t=buildCopy(v);copyText(t).then(ok=>{const o=a.innerHTML;a.classList.add('done');a.innerHTML=ok?CPI+'Скопировано ✓':'Не удалось';setTimeout(()=>{a.classList.remove('done');a.innerHTML=o},1600)});return}
  if(act==='print'){window.print();return}
  if(act==='lock'){lock();return}
  if(act==='refresh'){(async()=>{try{const rs=await navigator.serviceWorker.getRegistrations();await Promise.all(rs.map(x=>x.unregister()));const ks=await caches.keys();await Promise.all(ks.map(k=>caches.delete(k)))}catch(_){}location.reload()})();return}
 }
 const g=e.target.closest('[data-go]');
 if(g){location.hash=g.dataset.go;return}
 const d=e.target.closest('#dock a');
 if(d&&D){const t=d.dataset.t;location.hash=t==='o'?'#o':`#${t}/${S.mid}`}
});
document.addEventListener('change',e=>{const a=e.target.closest('[data-act="base"]');if(a){S.base=a.value;render()}});
document.addEventListener('input',e=>{const a=e.target.closest('[data-act="aq"]');if(a){S.aq=a.value;const pos=a.selectionStart;render();const n=$('[data-act="aq"]');if(n){n.focus();n.setSelectionRange(pos,pos)}}});
window.addEventListener('hashchange',render);
$('#bSet').onclick=()=>{location.hash='#s'};
$('#bLock').onclick=lock;
$('#bPrint').onclick=()=>window.print();

/* ================= вход ================= */
const NAMES=['М','А','Н','А','А','А'];
$('#cvAv').innerHTML=NAMES.map((n,i)=>`<span style="background:${COL[i]}">${n}</span>`).join('');
const PL=4;let pin='',busy=false;
const paint=()=>{[...document.querySelectorAll('#dots i')].forEach((d,i)=>d.classList.toggle('on',i<pin.length))};
async function tryLogin(){
 const err=$('#cvErr');err.textContent='';
 if(!window.isSecureContext){err.textContent='Нужен https (или localhost)';pin='';paint();return}
 busy=true;$('#pad').classList.add('busy');
 try{const raw=await decrypt(pin);build(raw,false);pin='';$('#pw').value='';paint();enter()}
 catch(x){err.textContent=x&&x.message==='nodata'?'Файл данных не найден':'Неверный пароль';const d=$('#dots');d.classList.remove('shake');void d.offsetWidth;d.classList.add('shake');pin='';paint()}
 busy=false;$('#pad').classList.remove('busy');
}
function press(k){
 if(busy)return;
 if(k==='B')pin=pin.slice(0,-1);else if(k==='C')pin='';
 else if(/^[0-9]$/.test(k)&&pin.length<PL)pin+=k;
 $('#pw').value=pin;paint();$('#cvErr').textContent='';
 if(pin.length===PL)setTimeout(tryLogin,120);
}
$('#pad').addEventListener('click',e=>{const b=e.target.closest('[data-k]');if(b)press(b.dataset.k)});
document.addEventListener('keydown',e=>{if($('#cover').classList.contains('hide')||$('#cover').classList.contains('out'))return;
 if(/^[0-9]$/.test(e.key))press(e.key);else if(e.key==='Backspace')press('B');else if(e.key==='Escape')press('C')});
$('#pinForm').addEventListener('submit',e=>{e.preventDefault();if(pin.length===PL&&!busy)tryLogin()});
window.__az={build:(r,d)=>{build(r,d);enter()}};
})();

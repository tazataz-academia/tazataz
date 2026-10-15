/* App de los alumnos. Lee el contenido de contenido.json (o del panel, en modo vista previa). */
const TY={teoria:"Teoría",ejercicio:"Ejercicios",repaso:"Repaso",prueba:"Prueba"};
const GL={teoria:"§",ejercicio:"✎",repaso:"↻",prueba:"★"};
const PASS=.6;
const PREVIEW=location.hash=="#preview";
let C={marca:{}},B={};
let st={};if(!PREVIEW)try{st=JSON.parse(localStorage.getItem("taz1")||"{}")}catch(e){}
const save=()=>{if(PREVIEW)return;try{localStorage.setItem("taz1",JSON.stringify(st))}catch(e){}};
const IT=k=>B[k].items;
const ID=(k,j)=>IT(k)[j].id;
const D=(k,j)=>!!(st[k]&&st[k].d&&st[k].d[ID(k,j)]);
const BX=(k,j)=>(j>=0&&st[k]&&st[k].x&&st[k].x[ID(k,j)])||null;
const init=k=>{st[k]=st[k]||{};st[k].d=st[k].d&&!Array.isArray(st[k].d)?st[k].d:{};st[k].x=st[k].x||{}};
const fin=(k,j)=>{init(k);st[k].d[ID(k,j)]=1;save()};
const rec=(k,j,s,n)=>{init(k);const b=st[k].x[ID(k,j)];if(!b||s/n>b.s/b.n)st[k].x[ID(k,j)]={s,n};save()};
const nota=(s,n)=>(10*s/n).toFixed(1).replace(".",",");
const nAv=k=>IT(k).filter(l=>!l.soon&&l.ty!="teoria").length;
const nDone=k=>IT(k).filter((l,j)=>!l.soon&&l.ty!="teoria"&&D(k,j)).length;
const open=(k,j)=>{const L=IT(k);if(L[j].soon)return false;if(PREVIEW)return true;for(let q=0;q<j;q++)if(!L[q].soon&&L[q].ty!="teoria"&&!D(k,q))return false;return true};
const nextOf=(k,j)=>IT(k).findIndex((l,q)=>q>j&&!l.soon&&l.ty!="teoria");
const app=document.getElementById("app");
let V={k:null,j:null,tab:"camino"},R=null;

function parse(s){s=(s||"").trim().replace(",",".").replace(/\s/g,"");const m=s.match(/^(-?[\d.]+)\/(-?[\d.]+)$/);if(m)return +m[1]/+m[2];return /^-?[\d.]+$/.test(s)?+s:NaN}
const mails=()=>`mailto:${C.marca.email||""}?subject=${encodeURIComponent(C.marca.asunto||"")}`;
const bar=p=>`<span class="bar"><i style="width:${p}%"></i></span>`;
const pct=(n,t)=>t?Math.round(100*n/t):0;
// Si un ejercicio del panel tiene un error, se avisa en lugar de romper la app
const mk=g=>{let e;try{e=g()}catch(x){e={k:"test",q:"Este ejercicio tiene un error y no se puede mostrar ("+esc(x.message)+"). Pulsa cualquier opción para seguir.",opts:["Seguir"],ok:0,fixed:1,sol:["Avisa al profesor."],hints:[]}}e.ok=e.ok||0;e.n=0;e.f=0;e.sel=[];if(e.k=="orden")e.pool=shuf(e.steps.map((_,i)=>i));return e};
function build(k,j){
 const it=IT(k)[j],L=IT(k).slice(0,it.ty=="repaso"?j:99).filter(x=>x.ty=="ejercicio"&&!x.soon).flatMap(x=>x.gen);
 const gens=shuf(it.ty=="ejercicio"?it.gen:L),n=it.n||(it.ty=="ejercicio"?4:it.ty=="repaso"?5:6);
 return gens.length?[...Array(n)].map((_,q)=>mk(gens[q%gens.length])):[];
}
const solH=e=>`<div class="sol"><b>Solución</b><ol>${e.sol.map(x=>`<li>${x}</li>`).join("")}</ol></div>`;

function home(){
 R=null;V={k:null,j:null,tab:"camino"};const M=C.marca;
 app.innerHTML=`<p class="brand">${esc(M.nombre||"Selectividad")}</p><h1>${esc(M.titulo||"Matemáticas II")}</h1><p class="lead">${esc(M.subtitulo||"")}</p>
 <div class="grid">${Object.entries(B).map(([k,b])=>{const n=nDone(k),t=nAv(k),x=BX(k,IT(k).findIndex(i=>i.ty=="prueba"));return `<button class="card" data-open="${k}"><b>${esc(b.n)}</b><span>${esc(b.d)}</span>${bar(pct(n,t))}<em>${t&&n==t?"Bloque completado":n?`${n} de ${t} pasos`:"Empezar"}${x?` · Nota ${nota(x.s,x.n)}/10`:""}</em></button>`}).join("")}</div>
 ${M.email?`<section class="cta"><h3>${esc(M.ctaTitulo||"")}</h3><p>${esc(M.ctaTexto||"")}</p><a href="${esc(mails())}">Pedir una clase</a></section>`:""}`;
}

function doc(k,th){
 const L=IT(k).filter(i=>i.ty=="teoria"),tms=[...new Set(L.map(i=>i.tm))];let pv=null;
 if(!L.length)return `<article class="doc"><p class="soon" style="margin-top:16px">Todavía no hay teoría en este bloque.</p></article>`;
 const toc=tms.filter(Boolean).length>1?`<nav class="toc">${tms.map((t,q)=>t?`<button data-jump="tm${q}">${esc(t.split(" · ")[0])}</button>`:"").join("")}</nav>`:"";
 return toc+`<article class="doc">${L.map(i=>{const h=i.tm&&i.tm!=pv?`<h2 class="tm" id="tm${tms.indexOf(i.tm)}">${esc(i.tm)}</h2>`:"";pv=i.tm;
  return h+(i.soon?`<h3>${esc(i.t)}</h3><p class="soon">Próximamente.</p>`:`<section><h3>${esc(i.t)}</h3>${(th?i.th:i.ex)||'<p class="soon">Sin contenido todavía.</p>'}</section>`)}).join("")}</article>`;
}

function bloque(k,tab){
 R=null;tab=tab||"camino";V={k,j:null,tab};const b=B[k],n=nDone(k),t=nAv(k),f=b.items.findIndex((it,j)=>it.ty!="teoria"&&open(k,j)&&!D(k,j));
 let body;
 if(tab=="camino"){const vis=b.items.map((it,j)=>({it,j})).filter(o=>o.it.ty!="teoria"),XO=[0,46,76,46,0,-46,-76,-46];let pv=null;
 body=vis.length?`<ol class="mp">${vis.map(({it,j},v)=>{
  const dn=D(k,j),ok=open(k,j),cu=j==f,bx=BX(k,j),sc=bx?(it.ty=="prueba"?`${nota(bx.s,bx.n)}/10`:`${bx.s}/${bx.n}`):"";
  const sub=it.soon?"Próximamente":dn?sc:bx?`Mejor ${sc}`:"";
  const h=it.tm&&it.tm!=pv?`<li class="tmh">${esc(it.tm)}</li>`:"";if(it.tm)pv=it.tm;
  return h+`<li style="--x:${XO[v%8]}px"><button class="nd ${it.ty} ${dn?"dn":cu?"cur":ok?"":"lk"}" data-it="${j}" ${ok?"":"disabled"} aria-label="${esc(it.t)}">${cu?`<span class="go">${bx?"Reintentar":"Empezar"}</span>`:""}<span class="dot">${dn?"✓":GL[it.ty]}</span><span class="lb">${esc(it.t)}</span>${sub?`<small>${sub}</small>`:""}</button></li>`}).join("")}</ol>`:`<p class="lead">Todavía no hay ejercicios en este bloque.</p>`}
 else body=doc(k,tab=="teoria");
 app.innerHTML=`<button class="back" data-home>← Todos los bloques</button><div class="hd"><h2>${esc(b.n)}</h2><p>${esc(b.d)}</p>${bar(pct(n,t))}<small>${n} de ${t} pasos superados</small></div>
 <nav class="tabs">${[["camino","Camino"],["teoria","Teoría"],["ejemplos","Ejemplos resueltos"]].map(([a,l])=>`<button data-tab="${a}" class="${a==tab?"on":""}">${l}</button>`).join("")}</nav>${body}`;
 window.scrollTo(0,0);
}

function ordH(e){
 return `<div class="row">${e.pool.filter(x=>!e.sel.includes(x)).map(x=>`<button class="ghost" data-pick="${x}">${e.steps[x]}</button>`).join("")}</div><ol>${e.sel.map(x=>`<li>${e.steps[x]}</li>`).join("")}</ol><button class="ghost" data-a="reset">Reiniciar orden</button>`;
}
function exHTML(e,i){
 const kd=e.k||"calc";let inp="";
 if(kd=="calc")inp=`<input inputmode="decimal" placeholder="Número o fracción" aria-label="Respuesta">`;
 if(kd=="test"){e.ord=e.ord||(e.fixed?e.opts.map((_,x)=>x):shuf(e.opts.map((_,x)=>x)));inp=`<div class="opts">${e.ord.map(x=>`<label><input type="radio" name="r${i}" value="${x}"><span>${e.opts[x]}</span></label>`).join("")}</div>`}
 if(kd=="orden")inp=`<div class="ord">${ordH(e)}</div>`;
 if(kd=="mat")inp=`<span class="mx" style="grid-template-columns:repeat(${e.cols},4.6ch)">${Array(e.rows*e.cols).fill(`<input class="mi" inputmode="decimal" aria-label="Elemento">`).join("")}</span>`;
 return `<div class="qc in"><p class="meta">Ejercicio ${i+1} de ${R.list.length}</p><p class="q">${e.q}</p>${inp}</div>`;
}
function read(c,e){
 const kd=e.k||"calc";
 if(kd=="calc")return parse(c.querySelector("input").value);
 if(kd=="test"){const r=c.querySelector("input:checked");return r?+r.value:null}
 if(kd=="orden")return e.sel;
 return [...c.querySelectorAll(".mi")].map(i=>parse(i.value));
}
function good(e,v){
 const kd=e.k||"calc";
 if(kd=="calc")return !isNaN(v)&&Math.abs(v-e.ans)<0.01;
 if(kd=="test")return v===e.ok;
 if(kd=="orden")return v.length==e.steps.length&&v.every((x,q)=>x==q);
 return v.length==e.ans.length&&v.every((x,q)=>!isNaN(x)&&Math.abs(x-e.ans[q])<0.01);
}
function missing(e,v){
 const kd=e.k||"calc";
 if(kd=="calc"&&isNaN(v))return "Escribe un número o una fracción, por ejemplo 3/8.";
 if(kd=="test"&&v===null)return "Elige una opción.";
 if(kd=="orden"&&v.length<e.steps.length)return "Coloca todos los pasos en orden.";
 if(kd=="mat"&&(v.length<e.ans.length||v.some(isNaN)))return "Rellena todos los elementos.";
 return "";
}

function item(k,j){
 R=null;V={k,j,tab:"camino"};const it=IT(k)[j];
 app.innerHTML=`<button class="back" data-bk>← ${esc(B[k].n)}</button><p class="kind" style="margin-top:14px"><i class="chip teoria">Teoría</i></p><h2>${esc(it.t)}</h2><article class="doc"><section>${it.th}</section><h3>Ejemplo resuelto</h3>${it.ex}</article>
 <div class="ft"><p class="pen">Cuando lo tengas claro, seguimos.</p><div class="acts"><button class="btn" data-fin="1">Entendido, siguiente</button></div></div>`;
 window.scrollTo(0,0);
}
const go=(k,j)=>IT(k)[j].ty=="teoria"?item(k,j):start(k,j);

function start(k,j,list){const it=IT(k)[j];R={k,j,list:list||build(k,j),i:0,ph:"ask",pru:it.ty=="prueba",res:[],lock:0,t:Math.random()};
 if(!R.list.length){app.innerHTML=`<button class="back" data-bk>← ${esc(B[k].n)}</button><p class="lead" style="margin-top:20px">Este paso todavía no tiene ejercicios.</p>`;return}run()}
const seg=()=>R.list.map((e,q)=>`<i class="${R.res[q]||(q==R.i?"c":"")}"></i>`).join("");
function footer(msg){
 const e=R.list[R.i],last=R.i==R.list.length-1,kd=e.k||"calc",auto=kd=="test"||kd=="orden";let b="";
 if(R.pru){if(kd!="test")b=`<button class="btn" data-a="nxt">${last?"Entregar":"Siguiente"}</button>`}
 else if(R.ph=="right")b="";
 else if(R.ph=="seen")b=`<button class="btn" data-a="nxt">${last?"Terminar":"Continuar"}</button>`;
 else b=(auto?"":`<button class="btn" data-a="check">Comprobar</button>`)+`<button class="link" data-a="sol">No lo sé</button>`;
 return `${msg||""}${b?`<div class="acts">${b}</div>`:""}`;
}
function run(){
 const e=R.list[R.i],it=IT(R.k)[R.j];
 app.innerHTML=`<div class="top"><button class="x" data-bk aria-label="Salir">✕</button><div class="seg" id="seg">${seg()}</div></div><p class="kind"><i class="chip ${it.ty}">${TY[it.ty]}</i>${esc(R.titulo||it.t)}</p><div id="qc">${exHTML(e,R.i)}</div><div class="ft" id="ft">${footer("")}</div>`;
 window.scrollTo(0,0);
}
const setFt=h=>{document.getElementById("ft").innerHTML=h};
const setSeg=()=>{document.getElementById("seg").innerHTML=seg()};

function result(){
 const {k,j,list,pru}=R,n=list.length;
 if(pru)list.forEach((e,q)=>{R.res[q]=(e.val!=null&&!missing(e,e.val)&&good(e,e.val))?"ok":"ko"});
 const s=R.res.filter(x=>x=="ok").length,pass=s>=Math.ceil(n*PASS-1e-9);
 if(!R.prueba1){rec(k,j,s,n);if(pass)fin(k,j)}
 const nx=R.prueba1?-1:nextOf(k,j),nt=nx>=0?IT(k)[nx].t:"";
 const msg=pass?(pru?"Prueba superada. Bloque dominado.":"¡Superado! Sigamos."):`Necesitas al menos ${Math.ceil(n*PASS-1e-9)} de ${n}. Repasa la teoría y vuelve a intentarlo.`;
 const rv=pru?list.map((e,q)=>`<div class="box rv ${R.res[q]}"><p class="meta">Ejercicio ${q+1} · ${R.res[q]=="ok"?"Correcto":"Incorrecto"}</p><p class="q">${e.q}</p>${solH(e)}</div>`).join(""):"";
 const b=(pass?(nx>=0?`<button class="btn" data-nx="1">Seguir: ${esc(nt)}</button>`:`<button class="btn" data-bk>Ver el camino</button>`)+`<button class="ghost" data-a="again">Otra vez</button>`:`<button class="btn" data-a="again">Repetir con otros ejercicios</button><button class="ghost" data-bk>Ver el camino</button>`);
 app.innerHTML=`<div class="top"><button class="x" data-bk aria-label="Salir">✕</button><div class="seg">${seg()}</div></div><div class="res ${pass?"ok":"ko"}"><p class="big">${pru?`${nota(s,n)}/10`:`${s}/${n}`}</p><p class="pen ${pass?"ok":""}">${msg}</p></div>${rv}<div class="ft"><div class="acts">${b}</div></div>`;
 window.scrollTo(0,0);
}

const vib=p=>{try{navigator.vibrate&&navigator.vibrate(p)}catch(e){}};
const RM=typeof matchMedia=="function"&&matchMedia("(prefers-reduced-motion: reduce)").matches;
const later=(f,ms)=>{const tk=R.t;setTimeout(()=>{if(R&&R.t===tk)f()},ms)};
function adv(){if(!R)return;R.i++;R.ph="ask";R.lock=0;R.i>=R.list.length?result():run()}
function flash(c,ok){c.classList.remove("good","bad","shake");void c.offsetWidth;c.classList.add(ok?"good":"bad");if(!ok)c.classList.add("shake");if(ok){const k=document.createElement("div");k.className="chk";k.textContent="✓";c.appendChild(k)}}
function marcar(c,e,v){const o=c.querySelector(".opts");if(!o)return;o.classList.add("dis");c.querySelectorAll(".opts label").forEach(l=>{const x=+l.querySelector("input").value;if(x===e.ok)l.classList.add("ok");else if(x===v)l.classList.add("ko")})}
function submit(){
 if(!R||R.lock||R.pru||R.ph=="seen")return;
 const e=R.list[R.i],c=document.querySelector("#qc .qc"),v=read(c,e),m=missing(e,v),kd=e.k||"calc";
 if(m)return setFt(footer(`<div class="bn ko">${m}</div>`));
 if(good(e,v)){R.lock=1;R.ph="right";R.res[R.i]=R.res[R.i]||"ok";setSeg();if(kd=="test")marcar(c,e,v);flash(c,true);vib(25);setFt(footer(`<div class="bn ok">¡Correcto!</div>`));return later(adv,RM?300:900)}
 vib([40,60,40]);flash(c,false);
 if(kd=="test"){marcar(c,e,v);R.ph="seen";R.res[R.i]="ko";setSeg();return setFt(footer(`<div class="bn ko">No es correcto.</div><div class="bn sol">${solH(e)}</div>`))}
 const f=e.f=(e.f||0)+1,h=(e.hints||[])[f-1];
 if(f>=3){R.ph="seen";R.res[R.i]="ko";setSeg();return setFt(footer(`<div class="bn ko">No es correcto.</div><div class="bn sol">${solH(e)}</div>`))}
 R.ph="wrong";setFt(footer(`<div class="bn ko">No es correcto.${h?"":" Revisa el planteamiento."}</div>${h?`<div class="bn hint"><b>Pista:</b> ${h}</div>`:""}`));
 if(kd=="orden")later(()=>{e.sel=[];const o=document.querySelector("#qc .ord");if(o)o.innerHTML=ordH(e)},700);
}
function nxt(){const e=R.list[R.i],c=document.querySelector("#qc .qc");if(R.pru){e.val=read(c,e);R.res[R.i]="a"}adv()}

app.addEventListener("click",ev=>{
 const t=ev.target.closest("button");if(!t||t.disabled)return;const d=t.dataset;
 if(d.jump){const el=document.getElementById(d.jump);if(el)el.scrollIntoView({behavior:RM?"auto":"smooth",block:"start"});return}
 if(d.open!==undefined)return bloque(d.open);
 if("home" in d)return home();
 if("bk" in d)return R&&R.prueba1?R.prueba1():bloque(R?R.k:V.k);
 if(d.tab)return bloque(V.k,d.tab);
 if(d.it!==undefined)return go(V.k,+d.it);
 if(d.fin){const {k,j}=V;fin(k,j);const nx=nextOf(k,j);return nx>=0?go(k,nx):bloque(k)}
 if(d.nx)return go(R.k,nextOf(R.k,R.j));
 if(!R||R.lock)return;
 const e=R.list[R.i],c=document.querySelector("#qc .qc");
 if(d.pick!==undefined){if(R.ph=="seen")return;e.sel.push(+d.pick);c.querySelector(".ord").innerHTML=ordH(e);if(!R.pru&&e.sel.length==e.steps.length)submit();return}
 if(d.a=="reset"){if(R.ph=="seen")return;e.sel=[];c.querySelector(".ord").innerHTML=ordH(e);return}
 if(d.a=="again")return R.prueba1?R.again():start(R.k,R.j);
 if(d.a=="check")return submit();
 if(d.a=="sol"){R.ph="seen";R.res[R.i]="ko";setSeg();marcar(c,e,null);return setFt(footer(`<div class="bn sol">${solH(e)}</div>`))}
 if(d.a=="nxt")return nxt();
});
app.addEventListener("change",ev=>{
 const t=ev.target;if(!R||R.lock||R.ph=="seen"||!t.matches||!t.matches('#qc input[type="radio"]'))return;
 if(R.pru){const e=R.list[R.i],c=document.querySelector("#qc .qc");e.val=read(c,e);R.res[R.i]="a";R.lock=1;setSeg();return later(adv,RM?150:380)}
 submit();
});
app.addEventListener("keydown",ev=>{
 if(ev.key!="Enter"||!R||R.lock||R.ph=="seen")return;const t=ev.target;
 if(!t.matches||!t.matches('#qc input:not([type="radio"])'))return;
 ev.preventDefault();R.pru?nxt():submit();
});

/* Fórmulas: KaTeX las dibuja y fit() reduce las que no caben en el ancho, para que se vean completas sin scroll */
function fit(){
 app.querySelectorAll("math").forEach(m=>{
  m.style.fontSize="";
  const blk=m.getAttribute("display")=="block",h=blk?m:m.parentElement.closest("p,li,label,div,section,h2,h3");
  if(!h)return;const cs=getComputedStyle(h),av=blk?m.clientWidth:h.clientWidth-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight),w=blk?m.scrollWidth:m.getBoundingClientRect().width;
  if(av>0&&w>av){let f=Math.max(.5,1.12*av/w*.97);m.style.fontSize=f.toFixed(3)+"em";
   for(let i=0;i<4&&f>.5&&(blk?m.scrollWidth:m.getBoundingClientRect().width)>av;i++){f=Math.max(.5,f*.94);m.style.fontSize=f.toFixed(3)+"em"}}
 });
}
const MO={delimiters:[{left:"$$",right:"$$",display:true},{left:"$",right:"$",display:false}],output:"mathml",throwOnError:false};
let busy=false;
// KaTeX usa "∣" (U+2223) en determinantes y valores absolutos grandes, y ese carácter no se estira: se cambia por "|" estirable
const bars=()=>app.querySelectorAll("mo").forEach(o=>{if(o.textContent=="∣"&&(o.getAttribute("fence")=="true"||o.getAttribute("stretchy")=="true")){o.textContent="|";o.setAttribute("stretchy","true")}});
const mo=new MutationObserver(()=>{if(busy||typeof renderMathInElement!="function")return;busy=true;try{renderMathInElement(app,MO);bars()}catch(e){}mo.takeRecords();busy=false;fit()});
mo.observe(app,{childList:true,subtree:true});
let rz;addEventListener("resize",()=>{clearTimeout(rz);rz=setTimeout(fit,150)});
try{document.fonts.ready.then(fit);document.fonts.addEventListener("loadingdone",fit)}catch(e){}

/* ---------- Arranque ---------- */
function cargar(c){C=c;C.marca=C.marca||{};B=construir(C);if(C.marca.nombre)document.title=`${C.marca.nombre} · ${C.marca.titulo||"Matemáticas II"}`}
if(PREVIEW){
 // El panel manda el contenido y lo que hay que enseñar: {contenido, ver:{k, tab} | {k, j} | {k, plantilla}}
 app.innerHTML=`<p class="lead" style="margin-top:20px">Vista previa: esperando al panel…</p>`;
 addEventListener("message",ev=>{
  if(ev.origin!==location.origin||!ev.data||!ev.data.contenido)return;
  const y=scrollY,same=V.k&&ev.data.ver&&ev.data.ver.k==V.k&&ev.data.ver.tab==V.tab&&!R;
  cargar(ev.data.contenido);const v=ev.data.ver||{};
  if(!v.k||!B[v.k])return home();
  if(v.plantilla||(v.auto&&GEN[v.auto])){const g=v.auto?GEN[v.auto]:()=>instanciar(v.plantilla),again=()=>{start(v.k,0,[0,1,2].map(()=>mk(g)));R.prueba1=()=>{app.innerHTML=`<p class="lead" style="margin-top:20px">Fin de la prueba. Pulsa «Probar» en el panel para generar otros números.</p>`};R.again=again};B[v.k].items.unshift({id:"_p",ty:"ejercicio",t:"Probando el ejercicio",gen:[]});again();return}
  if(v.j!=null&&IT(v.k)[v.j]&&IT(v.k)[v.j].ty!="teoria")return start(v.k,v.j);
  bloque(v.k,v.tab||"camino");if(same)scrollTo(0,y);
  if(v.ancla){const el=[...document.querySelectorAll(".doc h3")].find(h=>h.textContent==v.ancla);if(el)el.scrollIntoView({block:"start"})}
 });
 parent.postMessage({listo:true},location.origin);
}else{
 fetch("contenido.json",{cache:"no-store"}).then(r=>{if(!r.ok)throw new Error(r.status);return r.json()}).then(c=>{cargar(c);home()}).catch(e=>{app.innerHTML=`<p class="lead" style="margin-top:20px">No se ha podido cargar el contenido (${esc(e.message)}). Si has abierto el archivo directamente, ábrelo a través del servidor.</p>`});
}

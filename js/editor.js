/* Panel de contenido de TAZ a TAZ. Edita contenido.json y lo guarda en el servidor local o en GitHub. */
const $=s=>document.querySelector(s);
const TIPOS={teoria:["§","Teoría"],ejercicio:["✎","Ejercicios"],repaso:["↻","Repaso"],prueba:["★","Prueba"]};
const TPL={calc:"Numérico",test:"Test",vf:"Verdadero/Falso",orden:"Ordenar pasos",mat:"Matriz o vector"};
const nid=()=>Date.now().toString(36).slice(-5)+Math.random().toString(36).slice(2,5);
let C=null,orig="",cur={b:0,i:-1,view:"marca"},dirty=false,modo=null,abiertas=new Set(),errores=new Map();
let cfg={};try{cfg=JSON.parse(localStorage.getItem("taz-gh")||"{}")}catch(e){}

/* ---------- Utilidades de datos ---------- */
const blq=()=>C.bloques[cur.b];
const obj=()=>cur.view=="item"?blq().items[cur.i]:cur.view=="bloque"?blq():cur.view=="marca"?C.marca:cfg;
function getP(o,p){return p.split(".").reduce((a,k)=>a==null?a:a[k],o)}
function setP(o,p,v){const k=p.split(".");let a=o;for(let i=0;i<k.length-1;i++){if(a[k[i]]==null)a[k[i]]=/^\d+$/.test(k[i+1])?[]:{};a=a[k[i]]}a[k[k.length-1]]=v}
const json=()=>JSON.stringify(C,null,1);

/* ---------- Estado y borrador ---------- */
function marcar(){dirty=json()!==orig;estado();clearTimeout(marcar.t);marcar.t=setTimeout(()=>{try{dirty?localStorage.setItem("taz-borrador",JSON.stringify({fecha:Date.now(),C})):localStorage.removeItem("taz-borrador")}catch(e){}},400)}
function estado(msg,cls){const s=$("#st");s.className="st"+(cls?" "+cls:dirty?" dirty":"");s.textContent=msg||(dirty?"Cambios sin guardar":modo=="local"?"Todo guardado (servidor local)":modo=="github"?"Todo guardado (GitHub)":"Sin cambios");$("#marca").textContent=C&&C.marca.nombre||"TAZ a TAZ"}
addEventListener("beforeunload",e=>{if(dirty){e.preventDefault();e.returnValue=""}});

/* ---------- Índice (columna izquierda) ---------- */
function nav(){
 const b=blq();let pv=null;
 $("#nav").innerHTML=`<div class="blk"><select id="selb" aria-label="Bloque">${C.bloques.map((x,i)=>`<option value="${i}" ${i==cur.b?"selected":""}>${esc(x.nombre||"(sin nombre)")}</option>`).join("")}</select><button class="b s" data-a="verbloque" title="Datos del bloque">⚙</button></div>
 <ul class="nl">${b?b.items.map((it,i)=>{const h=it.tema&&it.tema!=pv?`<li class="th">${esc(it.tema)}</li>`:"";if(it.tema)pv=it.tema;const e=errores.has(it.id);
  return h+`<li><button data-sel="${i}" class="${cur.view=="item"&&cur.i==i?"on":""}"><i>${TIPOS[it.tipo][0]}</i><span>${esc(it.titulo||"(sin título)")}</span>${e?'<b class="err" title="Tiene errores">!</b>':""}</button></li>`}).join(""):""}</ul>
 <div class="adds"><button class="b s" data-add="teoria">+ Teoría</button><button class="b s" data-add="ejercicio">+ Ejercicios</button><button class="b s" data-add="repaso">+ Repaso</button><button class="b s" data-add="prueba">+ Prueba</button></div>
 <div class="side-links nl"><button data-a="vermarca" class="${cur.view=="marca"?"on":""}"><i>✦</i><span>Marca y contacto</span></button><button data-a="verajustes" class="${cur.view=="ajustes"?"on":""}"><i>⚿</i><span>Conexión con GitHub</span></button><button data-a="nuevobloque"><i>+</i><span>Nuevo bloque</span></button></div>`;
}

/* ---------- Campos del formulario ---------- */
const inp=(p,l,o={})=>`<label class="f"><span>${l}</span><input data-k="${p}" ${o.num?'data-t="num" type="number"':o.pass?'type="password" autocomplete="off"':""} value="${esc(getP(obj(),p)??"")}" placeholder="${esc(o.ph||"")}" ${o.list?`list="${o.list}"`:""}>${o.help?`<small>${o.help}</small>`:""}</label>`;
const TOOLS=[["Fórmula","$","$"],["Centrada","\n\n$$","$$\n\n"],["Negrita","**","**"],["Fracción","$\\frac{a}{b}$"],["Potencia","$x^{2}$"],["Subíndice","$a_{1}$"],["Raíz","$\\sqrt{x}$"],["Matriz 2×2","$\\begin{pmatrix}a&b\\\\c&d\\end{pmatrix}$"],["Matriz 3×3","$\\begin{pmatrix}a&b&c\\\\d&e&f\\\\g&h&i\\end{pmatrix}$"],["Determinante","$\\begin{vmatrix}a&b\\\\c&d\\end{vmatrix}$"],["Sistema","$\\begin{cases}x+y=1\\\\x-y=0\\end{cases}$"],["Integral","$\\int_{a}^{b} f(x)\\,dx$"],["Límite","$\\lim_{x\\to 0} f(x)$"],["Vector","$\\vec{u}$"],["Lista","\n- "]];
function ta(p,l,o={}){
 const v=getP(obj(),p),val=o.lines?(v||[]).join("\n"):v??"";
 const tools=o.tools?`<div class="tools">${TOOLS.map((t,i)=>`<button type="button" data-tool="${i}" data-for="${p}">${t[0]}</button>`).join("")}${o.vars?`<button type="button" data-tool="var" data-for="${p}">{{ variable }}</button>`:""}</div>`:"";
 return `<label class="f"><span>${l}</span>${tools}<textarea data-k="${p}" ${o.lines?'data-t="lines"':""} rows="${o.rows||4}" placeholder="${esc(o.ph||"")}">${esc(val)}</textarea>${o.help?`<small>${o.help}</small>`:""}</label>`;
}
const sel=(p,l,opts,o={})=>`<label class="f"><span>${l}</span><select data-k="${p}" ${o.bool?'data-t="bool"':""} ${o.re?'data-re="1"':""}>${opts.map(([v,t])=>`<option value="${v}" ${String(getP(obj(),p)??"")==String(v)?"selected":""}>${t}</option>`).join("")}</select></label>`;
const chk=(p,l)=>`<label class="chk"><input type="checkbox" data-k="${p}" data-t="check" ${getP(obj(),p)?"checked":""}> ${l}</label>`;
const AYUDA=`<details class="help"><summary>Cómo escribir el texto y las fórmulas</summary>
<p>Separa los párrafos con una <b>línea en blanco</b>. Una línea que empieza por <code>- </code> es un punto de lista. <code>**texto**</code> se ve en <b>negrita</b>.</p>
<p>Las fórmulas van entre <code>$...$</code> dentro del texto, o entre <code>$$...$$</code> en un párrafo propio para que salgan centradas. Usa los botones de encima de cada cuadro para no tener que recordar la sintaxis.</p>
<table><tr><td><code>\\frac{a}{b}</code> fracción</td><td><code>x^{2}</code> potencia</td><td><code>a_{1}</code> subíndice</td></tr><tr><td><code>\\sqrt{x}</code> raíz</td><td><code>\\cdot</code> producto</td><td><code>\\times</code> ×</td></tr><tr><td><code>\\leq \\geq \\neq</code> ≤ ≥ ≠</td><td><code>\\infty</code> ∞</td><td><code>\\pm</code> ±</td></tr><tr><td><code>\\alpha \\lambda \\pi</code></td><td><code>\\to</code> →</td><td><code>\\mathbb{R}</code> ℝ</td></tr><tr><td><code>\\vec{u}</code> vector</td><td><code>\\overline{A}</code> contrario</td><td><code>\\cap \\cup</code> ∩ ∪</td></tr></table>
<p>Para escribir un número decimal dentro de una fórmula usa <code>0{,}5</code> (si no, sale un espacio raro tras la coma).</p></details>`;
const AYUDA_EJ=`<details class="help"><summary>Cómo hacer ejercicios con números aleatorios</summary>
<p>1. Crea variables: por ejemplo <code>a</code> aleatoria entre 2 y 9, y <code>b</code> entre −5 y 5 marcando «sin 0».</p>
<p>2. En el enunciado, escribe <code>{{a}}</code> donde quieras que aparezca su valor: <code>Calcula $ {{a}} \\cdot {{b}} $</code>. También puedes poner cuentas: <code>{{a*b+1}}</code>.</p>
<p>3. En la respuesta escribe la fórmula sin llaves: <code>a*b+1</code>. La app la calcula para cada alumno. Acepta <code>+ - * / ^</code>, <code>sqrt(x)</code>, <code>abs(x)</code> y paréntesis.</p>
<p>Extras para el texto: <code>{{frac(a,b)}}</code> escribe la fracción simplificada, <code>{{signo(b)}}</code> escribe «+ 3» o «− 3» (útil en <code>x {{signo(b)}}</code>), y <code>{{coef(a)}}</code> no escribe nada si a vale 1 (útil en <code>{{coef(a)}}x</code>), y <code>{{par(b)}}</code> pone paréntesis si b es negativo (útil en <code>{{a}} \\cdot {{par(b)}}</code>).</p>
<p>Las <b>variables calculadas</b> sirven para valores intermedios: <code>d = a*b - c</code>. La <b>condición</b> descarta combinaciones que no quieres: <code>a != b</code>, <code>d != 0</code>, <code>a*b &lt; 50</code>.</p>
<p>Si no usas variables, el ejercicio es fijo: escribe el enunciado y la respuesta como número (por ejemplo <code>3/4</code>).</p>
<p><b>Matrices y vectores.</b> Crea una «Matriz aleatoria» (por ejemplo <code>A</code>, 3×3, entre −9 y 9) o un «Vector aleatorio». En el texto, <code>{{A}}</code> la dibuja entera: <code>$A={{A}}$</code>. En las fórmulas puedes usar:</p>
<table><tr><td><code>A+B</code> <code>A-B</code> <code>2*A</code></td><td>suma, resta, por un número</td></tr><tr><td><code>A*B</code> <code>A^2</code></td><td>producto, potencia</td></tr><tr><td><code>det(A)</code> <code>inv(A)</code></td><td>determinante, inversa</td></tr><tr><td><code>tras(A)</code> <code>rango(A)</code></td><td>traspuesta, rango</td></tr><tr><td><code>A[2,3]</code></td><td>el elemento de la fila 2, columna 3</td></tr><tr><td><code>id(3)</code></td><td>la identidad 3×3</td></tr><tr><td><code>dot(u,v)</code> <code>cross(u,v)</code> <code>norm(u)</code></td><td>producto escalar, vectorial, módulo</td></tr></table>
<p><code>{{vdet(A)}}</code> dibuja el determinante con barras. Si la respuesta es una matriz o un vector, usa el tipo «Matriz o vector» y escribe la fórmula entera, por ejemplo <code>A*B</code>: el tamaño se calcula solo. Para la inversa, añade la condición <code>det(A) != 0</code>.</p>
<p>La variable <b>«Uno de una lista»</b> elige al azar entre los valores que escribas: <code>2, 3, 5</code>.</p></details>`;

/* ---------- Formulario (columna central) ---------- */
function form(){
 const f=$("#form");
 if(cur.view=="marca"){f.innerHTML=`<h2>Marca y contacto</h2><p class="kind">Lo que se ve en la portada de la web.</p>
  ${inp("nombre","Nombre de la marca",{ph:"TAZ a TAZ"})}${inp("titulo","Título",{ph:"Matemáticas II"})}${ta("subtitulo","Texto de bienvenida",{rows:2})}
  ${inp("email","Email de contacto",{ph:"tazataz.academia@gmail.com",help:"El botón «Pedir una clase» abre un correo a esta dirección. Si lo dejas vacío, el botón no aparece."})}${inp("asunto","Asunto del correo")}
  ${inp("ctaTitulo","Título del recuadro de contacto")}${ta("ctaTexto","Texto del recuadro de contacto",{rows:3})}`;return}
 if(cur.view=="ajustes"){f.innerHTML=`<h2>Conexión con GitHub</h2><p class="kind">Solo hace falta cuando la web está publicada en GitHub. Estos datos se guardan únicamente en este navegador.</p>
  ${modo=="local"?`<div class="msg hi">Ahora estás usando el servidor local: «Guardar» escribe directamente en tu ordenador y esto no se usa.</div>`:""}
  <div class="row">${inp("usuario","Usuario de GitHub",{ph:"tazataz"})}${inp("repo","Repositorio",{ph:"tazataz.github.io"})}${inp("rama","Rama",{ph:"main"})}</div>
  ${inp("token","Token de acceso",{pass:1,help:"En GitHub: Settings → Developer settings → Personal access tokens → Fine-grained tokens. Dale acceso solo a este repositorio, con el permiso «Contents: Read and write»."})}
  <button class="b" data-a="probargh">Probar conexión</button> <span id="ghres"></span>`;return}
 const b=blq();
 if(cur.view=="bloque"){f.innerHTML=`<h2>Bloque: ${esc(b.nombre)}</h2><p class="kind">Identificador interno: <code>${esc(b.id)}</code> (no cambia; el progreso de los alumnos depende de él).</p>
  ${inp("nombre","Nombre del bloque")}${inp("descripcion","Descripción corta",{help:"Aparece bajo el nombre en la portada."})}
  <div class="tb"><button class="b s" data-a="subirbloque">Subir bloque</button><button class="b s" data-a="bajarbloque">Bajar bloque</button><button class="b s d" data-a="borrarbloque">Borrar bloque</button></div>`;return}
 const it=b.items[cur.i],temas=[...new Set(b.items.map(x=>x.tema).filter(Boolean))];
 let h=`<h2>${esc(it.titulo||"(sin título)")}</h2><p class="kind">${TIPOS[it.tipo][1]} · ${esc(b.nombre)}</p>
 <div class="tb"><button class="b s" data-a="subir">↑ Subir</button><button class="b s" data-a="bajar">↓ Bajar</button><button class="b s" data-a="duplicar">Duplicar</button><button class="b s d" data-a="borrar">Borrar</button></div>
 <datalist id="temas">${temas.map(t=>`<option value="${esc(t)}">`).join("")}</datalist>`;
 if(it.tipo=="teoria"||it.tipo=="ejercicio")h+=`<div class="row">${inp("tema","Tema",{list:"temas",ph:"Tema 1 · Matrices",help:"Agrupa los apartados. Escribe uno nuevo o elige uno existente."})}${inp("titulo","Título")}</div>`;
 else h+=inp("titulo","Título");
 if(it.tipo=="teoria")h+=AYUDA+ta("teoria","Teoría",{rows:14,tools:1})+ta("ejemplo","Ejemplo resuelto",{rows:8,tools:1})+chk("proximamente","Ocultar el contenido y mostrar «Próximamente»");
 if(it.tipo=="repaso"||it.tipo=="prueba")h+=inp("n","Número de ejercicios",{num:1,ph:it.tipo=="repaso"?"5":"6",help:it.tipo=="repaso"?"Mezcla ejercicios de todos los apartados anteriores del bloque.":"Mezcla ejercicios de todo el bloque, sin pistas, y pone nota."});
 if(it.tipo=="ejercicio")h+=inp("n","Ejercicios por ronda",{num:1,ph:"4",help:"Cuántos ejercicios hace el alumno cada vez. Se eligen al azar entre los de abajo."})+autos(it)+propios(it);
 f.innerHTML=h;
 if(it.tipo=="ejercicio")(it.ejercicios||[]).forEach((_,c)=>revisar(c));
}
function autos(it){
 const used=new Set(it.automaticos||[]);
 return `<h3>Ejercicios automáticos</h3><p class="kind">Ya programados, con números aleatorios. Puedes quitar o añadir.</p>
 <div class="chips">${(it.automaticos||[]).map((n,i)=>{const d=Object.values(GEN_DESC).map(g=>g[n]).find(Boolean);return `<div class="chip"><span>${esc(d?d[1]:n)}</span><code>${esc(n)}</code><button class="b s" data-a="probarauto" data-n="${esc(n)}">Probar</button><button class="b s d" data-delauto="${i}" title="Quitar">✕</button></div>`}).join("")||'<p class="kind">Ninguno.</p>'}</div>
 <select id="addauto" class="b" style="max-width:100%"><option value="">+ Añadir ejercicio automático…</option>${Object.entries(GEN_DESC).map(([g,L])=>`<optgroup label="${g}">${Object.entries(L).filter(([n])=>!used.has(n)).map(([n,[,d]])=>`<option value="${n}">${esc(d)}</option>`).join("")}</optgroup>`).join("")}</select>`;
}
function propios(it){
 const E=it.ejercicios||[];
 return `<h3 style="margin-top:22px">Mis ejercicios</h3>${AYUDA_EJ}${E.map((p,c)=>card(p,c)).join("")}
 <div class="tb">${Object.entries(TPL).map(([t,n])=>`<button class="b s" data-newej="${t}">+ ${n}</button>`).join("")}</div>`;
}
function card(p,c){
 const P=`ejercicios.${c}.`,open=abiertas.has(c);
 let h=`<div class="card" id="card${c}"><div class="hd" data-card="${c}"><b>${open?"▾":"▸"} ${c+1}. ${TPL[p.tipo]||"Numérico"}</b><span>${esc((p.enunciado||"").slice(0,90))}</span><em id="ok${c}"></em></div>`;
 if(!open)return h+"</div>";
 h+=`<div class="bd">${sel(P+"tipo","Tipo",Object.entries(TPL),{re:1})}${ta(P+"enunciado","Enunciado",{rows:3,tools:1,vars:1})}
 <div class="f"><span>Variables</span><div class="vars">${(p.variables||[]).map((v,i)=>varRow(P,c,v,i)).join("")}</div>
 <button class="b s" data-addvar="${c}.rango">+ Número aleatorio</button> <button class="b s" data-addvar="${c}.matriz">+ Matriz aleatoria</button> <button class="b s" data-addvar="${c}.vector">+ Vector aleatorio</button> <button class="b s" data-addvar="${c}.lista">+ Uno de una lista</button> <button class="b s" data-addvar="${c}.formula">+ Calculada</button></div>
 ${inp(P+"condicion","Condición (opcional)",{ph:"a != b",help:"Se repiten los números hasta que se cumpla."})}`;
 const t=p.tipo||"calc";
 if(t=="calc")h+=inp(P+"respuesta","Respuesta (número o fórmula)",{ph:"a*b + 1",help:"Se acepta como correcta con una tolerancia de 0,01. El alumno puede responder con decimales o fracciones."});
 if(t=="test")h+=ta(P+"opciones","Opciones, una por línea",{lines:1,rows:4,help:"La <b>primera</b> es la correcta; a los alumnos se les muestran mezcladas. Puedes usar fórmulas y {{variables}}."});
 if(t=="vf")h+=sel(P+"verdadero","La afirmación es…",[["true","Verdadera"],["false","Falsa"]],{bool:1});
 if(t=="orden")h+=ta(P+"pasos","Pasos en el orden correcto, uno por línea",{lines:1,rows:4,help:"A los alumnos se les muestran desordenados."});
 if(t=="mat"){h+=inp(P+"respuesta","Respuesta: fórmula de la matriz o el vector",{ph:"A*B",help:"Por ejemplo <code>A*B</code>, <code>inv(A)</code>, <code>tras(A)</code> o <code>cross(u,v)</code>. El tamaño de la casilla de respuesta se calcula solo."});
  // Formato antiguo, elemento a elemento: solo se muestra si ya se usaba y no hay fórmula
  if(!String(p.respuesta??"").trim()&&(p.respuestas||[]).some(x=>String(x).trim())){const r=+p.filas||2,co=+p.columnas||2;h+=`<div class="row">${inp(P+"filas","Filas",{num:1,ph:"2"})}${inp(P+"columnas","Columnas",{num:1,ph:"2"})}</div>
  <div class="f"><span>O escríbela elemento a elemento</span><div class="grid-m" style="grid-template-columns:repeat(${co},auto)">${[...Array(r*co)].map((_,i)=>`<input data-k="${P}respuestas.${i}" value="${esc((p.respuestas||[])[i]??"")}" aria-label="Elemento ${i+1}">`).join("")}</div></div>`}}
 h+=ta(P+"pistas","Pistas, una por línea (opcional)",{lines:1,rows:2,help:"Se muestran una a una tras cada fallo. Al tercer fallo sale la solución."})+ta(P+"solucion","Solución paso a paso, un paso por línea",{lines:1,rows:3});
 h+=`<div id="st${c}"></div><div class="tb"><button class="b s p" data-probar="${c}">Probar en la vista previa</button><button class="b s" data-ej="${c}.subir">↑</button><button class="b s" data-ej="${c}.bajar">↓</button><button class="b s" data-ej="${c}.duplicar">Duplicar</button><button class="b s d" data-ej="${c}.borrar">Borrar</button></div></div></div>`;
 return h;
}
function varRow(P,c,v,i){
 const K=`${P}variables.${i}.`,del=`<button class="b s d" data-delvar="${c}.${i}" title="Quitar">✕</button>`;
 const nm=`<input class="nm" data-k="${K}nombre" value="${esc(v.nombre||"")}" placeholder="a" aria-label="Nombre">`;
 const n=(k,l)=>`<input class="num" type="number" data-t="num" data-k="${K}${k}" value="${esc(v[k]??"")}" aria-label="${l}">`;
 const rango=`de ${n("min","Desde")} a ${n("max","Hasta")}<label><input type="checkbox" data-t="check" data-k="${K}sinCero" ${v.sinCero?"checked":""}> sin 0</label>`;
 if(v.tipo=="formula")return `<div class="var">${nm} = <input class="fx" data-k="${K}formula" value="${esc(v.formula||"")}" placeholder="a*b - c" aria-label="Fórmula">${del}</div>`;
 if(v.tipo=="lista")return `<div class="var">${nm} uno de <input class="fx" data-k="${K}valores" value="${esc(v.valores||"")}" placeholder="2, 3, 5" aria-label="Valores">${del}</div>`;
 if(v.tipo=="matriz")return `<div class="var">${nm} matriz ${n("filas","Filas")}×${n("columnas","Columnas")} ${rango}${del}</div>`;
 if(v.tipo=="vector")return `<div class="var">${nm} vector de ${n("componentes","Componentes")} comp. ${rango}${del}</div>`;
 return `<div class="var">${nm} ${rango}${del}</div>`;
}
// Comprueba una plantilla generándola varias veces y muestra el resultado en su tarjeta
function probarPlantilla(p){
 const vistos=[];
 for(let r=0;r<25;r++){const e=instanciar(p);if(e.k=="test"&&new Set(e.opts).size<e.opts.length)throw new Error("con algunos números, dos opciones del test salen iguales. Añade una condición.");if(r<1)vistos.push(e)}
 const e=vistos[0];return e.k=="test"?(p.tipo=="vf"?"":"opción correcta: "+e.opts[0]):e.k=="orden"?"":e.k=="mat"?`respuesta (${e.rows}×${e.cols}): `+e.ans.map(x=>fmtN(x)).join(" · "):"respuesta: "+fmtN(e.ans);
}
function revisar(c){
 const it=blq().items[cur.i],p=it.ejercicios[c],ok=$("#ok"+c),st=$("#st"+c);
 try{const s=probarPlantilla(p);if(ok){ok.className="ok";ok.textContent="✓"}if(st)st.innerHTML=`<div class="msg ok">Funciona.${s?" Ejemplo de "+esc(s):""}</div>`;return null}
 catch(x){if(ok){ok.className="ko";ok.textContent="⚠"}if(st)st.innerHTML=`<div class="msg ko">Error: ${esc(x.message)}</div>`;return x.message}
}

/* ---------- Vista previa ---------- */
const frame=$("#frame");let listo=false;
function verActual(){
 if(cur.view=="marca"||cur.view=="ajustes"||!blq())return{};
 const k=blq().id;if(cur.view=="bloque")return{k,tab:"camino"};
 const it=blq().items[cur.i];return it.tipo=="teoria"?{k,tab:"teoria",ancla:it.titulo||"(sin título)"}:{k,tab:"camino"};
}
function enviar(ver){if(!listo)return;frame.contentWindow.postMessage({contenido:JSON.parse(json()),ver:ver||verActual()},location.origin)}
let tPrev;const previa=()=>{clearTimeout(tPrev);tPrev=setTimeout(()=>enviar(),450)};
addEventListener("message",ev=>{if(ev.origin==location.origin&&ev.data&&ev.data.listo){listo=true;enviar()}});

/* ---------- Navegación ---------- */
function ir(v){Object.assign(cur,v);abiertas=new Set();nav();form();enviar();scrollTo(0,0)}
function nuevoItem(t){
 const b=blq(),prev=b.items[cur.i],o={id:nid(),tipo:t,titulo:{teoria:"Nuevo apartado de teoría",ejercicio:"Practica…",repaso:"Repaso",prueba:"Prueba final"}[t]};
 if((t=="teoria"||t=="ejercicio")&&prev&&prev.tema)o.tema=prev.tema;
 if(t=="teoria"){o.teoria="";o.ejemplo=""}if(t=="ejercicio"){o.automaticos=[];o.ejercicios=[]}
 const at=cur.view=="item"?cur.i+1:b.items.length;b.items.splice(at,0,o);marcar();ir({view:"item",i:at});
}
function mover(arr,i,d){const j=i+d;if(j<0||j>=arr.length)return i;[arr[i],arr[j]]=[arr[j],arr[i]];return j}
let confirmar=null;
function pedirConfirmacion(btn,f){if(confirmar===btn){confirmar=null;return f()}confirmar=btn;const t=btn.textContent;btn.textContent="¿Seguro? Pulsa otra vez";setTimeout(()=>{if(confirmar===btn){confirmar=null;btn.textContent=t}},3000)}

document.addEventListener("click",ev=>{
 const t=ev.target.closest("button,[data-card]");if(!t)return;const d=t.dataset;
 if(d.sel!=null)return ir({view:"item",i:+d.sel});
 if(d.add)return nuevoItem(d.add);
 if(d.card!=null){const c=+d.card;abiertas.has(c)?abiertas.delete(c):abiertas.add(c);return form()}
 if(d.tool!=null)return herramienta(d.tool,d.for);
 const it=cur.view=="item"?blq().items[cur.i]:null;
 if(d.delauto!=null){it.automaticos.splice(+d.delauto,1);marcar();form();return previa()}
 if(d.newej){it.ejercicios=it.ejercicios||[];const p={tipo:d.newej,enunciado:"",variables:[],pistas:[],solucion:[]};if(d.newej=="test")p.opciones=["",""];if(d.newej=="vf")p.verdadero=true;if(d.newej=="orden")p.pasos=["",""];if(d.newej=="mat")p.respuesta=""
  it.ejercicios.push(p);abiertas.add(it.ejercicios.length-1);marcar();form();$("#card"+(it.ejercicios.length-1)).scrollIntoView({block:"start",behavior:"smooth"});return}
 if(d.addvar){const [c,tp]=d.addvar.split(".");const p=it.ejercicios[+c];p.variables=p.variables||[];const used=new Set(p.variables.map(v=>v.nombre));
  // Las matrices se nombran con mayúsculas (A, B…) y los vectores con u, v, w
  const pool=tp=="matriz"?"ABCDEFGHMNPQ":tp=="vector"?"uvwst":"abcdefghjkmnpqrstxyz",n=pool.split("").find(x=>!used.has(x))||(tp=="matriz"?"M":"v")+p.variables.length;
  p.variables.push({formula:{nombre:n,tipo:"formula",formula:""},lista:{nombre:n,tipo:"lista",valores:"2, 3, 5"},matriz:{nombre:n,tipo:"matriz",filas:2,columnas:2,min:-5,max:5,sinCero:false},vector:{nombre:n,tipo:"vector",componentes:3,min:-5,max:5,sinCero:false}}[tp]||{nombre:n,tipo:"rango",min:1,max:9,sinCero:false});marcar();return form()}
 if(d.delvar){const [c,i]=d.delvar.split(".").map(Number);it.ejercicios[c].variables.splice(i,1);marcar();return form()}
 if(d.probar!=null){const p=it.ejercicios[+d.probar];if(revisar(+d.probar))return;abrirPrevia();return enviar({k:blq().id,plantilla:p})}
 if(d.ej){const [c,a]=d.ej.split(".");const E=it.ejercicios,i=+c;
  if(a=="borrar")return pedirConfirmacion(t,()=>{E.splice(i,1);abiertas=new Set();marcar();form();previa()});
  if(a=="duplicar"){E.splice(i+1,0,JSON.parse(JSON.stringify(E[i])));abiertas=new Set([i+1])}
  if(a=="subir"||a=="bajar"){const j=mover(E,i,a=="subir"?-1:1);abiertas=new Set([j])}
  marcar();form();return previa()}
 switch(d.a){
  case "guardar":return guardar();
  case "descargar":return descargar();
  case "prev":return $("#prev").classList.toggle("show");
  case "vermarca":return ir({view:"marca"});
  case "verajustes":return ir({view:"ajustes"});
  case "verbloque":return ir({view:"bloque"});
  case "probargh":return probarGH();
  case "probarauto":abrirPrevia();return enviar({k:blq().id,plantilla:null,auto:d.n});
  case "nuevobloque":{C.bloques.push({id:"bloque-"+nid(),nombre:"Nuevo bloque",descripcion:"",items:[]});marcar();return ir({view:"bloque",b:C.bloques.length-1,i:-1})}
  case "subirbloque":case "bajarbloque":{cur.b=mover(C.bloques,cur.b,d.a=="subirbloque"?-1:1);marcar();return ir({})}
  case "borrarbloque":return pedirConfirmacion(t,()=>{if(C.bloques.length<2)return alertar("No puedes borrar el único bloque.");C.bloques.splice(cur.b,1);marcar();ir({view:"marca",b:0,i:-1})});
  case "subir":case "bajar":{cur.i=mover(blq().items,cur.i,d.a=="subir"?-1:1);marcar();return ir({})}
  case "duplicar":{const o=JSON.parse(JSON.stringify(it));o.id=nid();o.titulo+=" (copia)";blq().items.splice(cur.i+1,0,o);marcar();return ir({i:cur.i+1})}
  case "borrar":return pedirConfirmacion(t,()=>{blq().items.splice(cur.i,1);marcar();ir({view:blq().items.length?"item":"bloque",i:Math.min(cur.i,blq().items.length-1)})});
 }
});
const abrirPrevia=()=>{if(getComputedStyle($("#prev")).display=="none")$("#prev").classList.add("show")};
document.addEventListener("change",ev=>{
 const t=ev.target;
 if(t.id=="selb")return ir({view:blq()&&C.bloques[+t.value].items.length?"item":"bloque",b:+t.value,i:0});
 if(t.id=="addauto"&&t.value){const it=blq().items[cur.i];(it.automaticos=it.automaticos||[]).push(t.value);marcar();form();return previa()}
 if(t.dataset.k&&(t.dataset.t=="check"||t.tagName=="SELECT"))campo(t);
 if(t.dataset.re)form();
});
document.addEventListener("input",ev=>{const t=ev.target;if(t.dataset.k&&t.dataset.t!="check"&&t.tagName!="SELECT")campo(t)});
function campo(t){
 const tp=t.dataset.t;let v=t.value;
 if(tp=="num")v=v===""?undefined:+v;if(tp=="lines")v=v.split("\n");if(tp=="bool")v=v=="true";if(tp=="check")v=t.checked;
 const o=obj();setP(o,t.dataset.k,v);
 if(cur.view=="ajustes"){try{localStorage.setItem("taz-gh",JSON.stringify(cfg))}catch(e){}return}
 marcar();
 if(/^(titulo|tema|nombre)$/.test(t.dataset.k)){nav();if(cur.view!="marca")$("#form h2").textContent=t.value||"(sin título)"}
 const m=t.dataset.k.match(/^ejercicios\.(\d+)\./);if(m){const c=+m[1];if(/\.(filas|columnas)$/.test(t.dataset.k))return form();clearTimeout(campo["t"+c]);campo["t"+c]=setTimeout(()=>revisar(c),350);const hd=$(`#card${c} .hd span`);if(hd&&/enunciado$/.test(t.dataset.k))hd.textContent=t.value.slice(0,90);return}
 previa();
}
function herramienta(i,p){
 const el=document.querySelector(`textarea[data-k="${p}"]`);if(!el)return;
 const [a,b]=i=="var"?["{{","}}"]:TOOLS[+i].length==3?[TOOLS[+i][1],TOOLS[+i][2]]:[TOOLS[+i][1],""];
 const s=el.selectionStart,e=el.selectionEnd,haySel=e>s,txt=el.value.slice(s,e)||(i=="var"?"a":"");
 el.value=el.value.slice(0,s)+a+txt+b+el.value.slice(e);el.focus();
 // sin selección y con cierre (p. ej. $...$): el cursor queda dentro para escribir
 const pos=s+a.length+txt.length+(haySel||!b?b.length:0);el.setSelectionRange(pos,pos);campo(el);
}

/* ---------- Validación y guardado ---------- */
function validar(){
 const L=[];errores=new Map();const ids=new Set();
 C.bloques.forEach((b,bi)=>{
  if(!String(b.nombre||"").trim())L.push({bi,txt:"Un bloque no tiene nombre."});
  b.items.forEach((it,i)=>{
   if(ids.has(it.id))it.id=nid();ids.add(it.id);
   const push=txt=>{L.push({bi,i,txt:`${b.nombre} › ${it.titulo||"(sin título)"}: ${txt}`});errores.set(it.id,1)};
   if(!String(it.titulo||"").trim())push("falta el título.");
   if(it.tipo=="ejercicio")(it.ejercicios||[]).forEach((p,c)=>{try{probarPlantilla(p)}catch(x){push(`ejercicio ${c+1}: ${x.message}`)}});
  });
 });
 return L;
}
function alertar(html,acciones=""){const d=$("#dlg");d.innerHTML=`<div>${html}</div><div class="tb" style="margin:16px 0 0;justify-content:flex-end">${acciones}<button class="b p" data-cerrar>Entendido</button></div>`;d.showModal()}
$("#dlg").addEventListener("click",ev=>{const t=ev.target.closest("[data-cerrar],[data-irerr]");if(!t)return;$("#dlg").close();if(t.dataset.irerr){const [bi,i]=t.dataset.irerr.split(",").map(Number);ir(i>=0?{view:"item",b:bi,i}:{view:"bloque",b:bi})}});
async function guardar(){
 const L=validar();nav();
 if(L.length)return alertar(`<h3 style="margin-top:0">Hay ${L.length} problema${L.length>1?"s":""} que corregir antes de guardar</h3><ul>${L.map(e=>`<li><a href="#" data-irerr="${e.bi},${e.i??-1}" onclick="return false">${esc(e.txt)}</a></li>`).join("")}</ul><p class="kind">Tus cambios no se pierden: se guardan como borrador en este navegador.</p>`);
 const btn=$("#bguardar");btn.disabled=true;estado("Guardando…");
 try{
  if(modo=="local"){const r=await fetch("api/guardar",{method:"POST",headers:{"Content-Type":"application/json"},body:json()});const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||r.status)}
  else if(modo=="remoto")throw new Error("Estás abriendo el panel desde otro dispositivo. Para guardar, usa el ordenador donde corre el servidor.");
  else await guardarGH();
  orig=json();dirty=false;try{localStorage.removeItem("taz-borrador")}catch(e){}estado(modo=="github"?"Guardado en GitHub. La web se actualiza en 1 o 2 minutos.":"Guardado","ok");
 }catch(x){estado("No se ha podido guardar","dirty");alertar(`<h3 style="margin-top:0">No se ha podido guardar</h3><p>${esc(x.message)}</p><p class="kind">Tus cambios siguen aquí y en el borrador del navegador.</p>`)}
 btn.disabled=false;
}
function b64(s){const by=new TextEncoder().encode(s);let r="";for(let i=0;i<by.length;i+=0x8000)r+=String.fromCharCode.apply(null,by.subarray(i,i+0x8000));return btoa(r)}
async function gh(path,opt={}){
 if(!cfg.usuario||!cfg.repo||!cfg.token)throw new Error("Falta configurar la conexión con GitHub (menú «Conexión con GitHub»).");
 const r=await fetch(`https://api.github.com/repos/${encodeURIComponent(cfg.usuario)}/${encodeURIComponent(cfg.repo)}${path}`,{...opt,cache:"no-store",headers:{Authorization:"Bearer "+cfg.token,Accept:"application/vnd.github+json",...(opt.headers||{})}});
 if(r.status==401)throw new Error("GitHub no acepta el token: puede estar mal copiado o haber caducado.");
 if(r.status==403)throw new Error("El token no tiene permiso para escribir en este repositorio (necesita «Contents: Read and write»).");
 if(r.status==409||r.status==422)throw new Error("Alguien ha guardado a la vez. Vuelve a pulsar «Guardar».");
 return r;
}
async function guardarGH(){
 const rama=cfg.rama||"main",g=await gh(`/contents/contenido.json?ref=${encodeURIComponent(rama)}`);
 if(g.status==404&&!(await gh("")).ok)throw new Error("No encuentro el repositorio. Revisa el usuario y el nombre del repositorio.");
 const sha=g.ok?(await g.json()).sha:undefined;
 const p=await gh("/contents/contenido.json",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:"Actualizar contenido desde el panel",content:b64(json()),branch:rama,...(sha?{sha}:{})})});
 if(!p.ok)throw new Error("GitHub respondió con un error ("+p.status+").");
}
async function probarGH(){const o=$("#ghres");o.textContent="Probando…";try{const r=await gh("");if(!r.ok)throw new Error("No encuentro el repositorio. Revisa el usuario y el nombre.");const j=await r.json();o.innerHTML=j.permissions&&j.permissions.push?'<span class="ok">✓ Conexión correcta: puedes guardar.</span>':'<span class="ko">El token puede leer pero no escribir.</span>'}catch(x){o.innerHTML=`<span class="ko">${esc(x.message)}</span>`}}
function descargar(){const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([json()],{type:"application/json"}));a.download="contenido-"+new Date().toISOString().slice(0,10)+".json";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}

/* ---------- Arranque ---------- */
(async()=>{
 try{const r=await fetch("api/estado",{cache:"no-store"});if(r.ok){const j=await r.json();modo=j.local?"local":"remoto"}}catch(e){}
 if(!modo)modo="github";
 try{const r=await fetch("contenido.json?t="+Date.now(),{cache:"no-store"});if(!r.ok)throw new Error(r.status);C=await r.json()}
 catch(e){$("#form").innerHTML=`<div class="msg ko">No se ha podido cargar contenido.json (${esc(e.message)}). Abre el panel a través del servidor: <code>python3 serve.py</code> y luego http://localhost:8000/editor.html</div>`;estado("Error al cargar","dirty");return}
 C.marca=C.marca||{};C.bloques=C.bloques||[];orig=json();
 let bor=null;try{bor=JSON.parse(localStorage.getItem("taz-borrador")||"null")}catch(e){}
 if(bor&&bor.C&&JSON.stringify(bor.C,null,1)!==orig){$("#banner").innerHTML=`<div class="banner"><span>Tienes cambios sin guardar del ${new Date(bor.fecha).toLocaleString("es-ES")}.</span><button class="b p" id="recup">Recuperarlos</button><button class="b" id="desc">Descartarlos</button></div>`;
  $("#recup").onclick=()=>{C=bor.C;$("#banner").innerHTML="";marcar();ir({})};$("#desc").onclick=()=>{try{localStorage.removeItem("taz-borrador")}catch(e){}$("#banner").innerHTML=""}}
 if(modo=="remoto")$("#banner").insertAdjacentHTML("beforeend",`<div class="banner"><span>Estás viendo el panel desde otro dispositivo: puedes mirar y probar, pero para guardar usa el ordenador.</span></div>`);
 cur={b:0,i:C.bloques[0]&&C.bloques[0].items.length?0:-1,view:C.bloques[0]&&C.bloques[0].items.length?"item":"marca"};
 estado();nav();form();enviar();
})();

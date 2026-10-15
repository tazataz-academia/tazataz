/* Motor compartido por la app y el panel: formato de la teoría, plantillas de ejercicios y montaje del contenido.
   Necesita generadores.js (frT, GEN) y math.js cargados antes. */

/* ---------- Texto de la teoría ----------
   Párrafos separados por una línea en blanco. Una línea que empieza por "- " es un punto de lista.
   **negrita**. Fórmulas entre $...$ (en línea) o $$...$$ (centrada). */
const esc=s=>String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
function inl(s){
 const m=[];s=esc(s).replace(/\$\$[\s\S]+?\$\$|\$[^$]+?\$/g,x=>{m.push(x);return "\u0000"+(m.length-1)+"\u0000"});
 return s.replace(/\*\*(.+?)\*\*/g,"<b>$1</b>").replace(/\u0000(\d+)\u0000/g,(_,i)=>m[i]);
}
function md(t){
 return String(t||"").replace(/\r/g,"").split(/\n[ \t]*\n/).map(b=>b.trim()).filter(Boolean).map(b=>{
  if(/^\$\$[\s\S]*\$\$$/.test(b))return esc(b);
  const L=b.split("\n");
  if(L.every(l=>/^\s*[-•]\s+/.test(l)))return "<ul>"+L.map(l=>"<li>"+inl(l.replace(/^\s*[-•]\s+/,""))+"</li>").join("")+"</ul>";
  return "<p>"+L.map(inl).join("<br>")+"</p>";
 }).join("");
}

/* ---------- Plantillas de ejercicios ----------
   {tipo:"calc"|"test"|"vf"|"orden"|"mat", enunciado,
    variables:[{nombre, tipo:"rango", min, max, sinCero} | {nombre, tipo:"matriz", filas, columnas, min, max, sinCero}
               | {nombre, tipo:"lista", valores:"2, 3, 5"} | {nombre, tipo:"formula", formula}],
    condicion, respuesta (en "mat", una fórmula de matriz como A*B), opciones (la primera es la correcta), verdadero, pasos,
    filas, columnas, respuestas (respuesta "mat" elemento a elemento, formato antiguo), pistas, solucion}
   En los textos, {{expresión}} se sustituye por su valor: {{a}}, {{a*b+1}}, {{A}} (dibuja la matriz), {{frac(a,b)}}, {{signo(b)}}, {{coef(a)}}, {{par(b)}}, {{vdet(A)}}. */
let MJ=null;
const isMat=v=>!!v&&(v.isMatrix||Array.isArray(v));
const toArr=v=>v&&v.isMatrix?v.toArray():v;
const toNum=x=>Number(x&&x.isFraction?x.valueOf():x);
// Rango por eliminación gaussiana
function rangoDe(A){
 A=toArr(A);if(!Array.isArray(A[0]))A=[A];A=A.map(r=>r.map(toNum));
 const m=A.length,n=A[0].length;let r=0;
 for(let c=0;c<n&&r<m;c++){
  let p=r;for(let i=r+1;i<m;i++)if(Math.abs(A[i][c])>Math.abs(A[p][c]))p=i;
  if(Math.abs(A[p][c])<1e-9)continue;[A[r],A[p]]=[A[p],A[r]];
  for(let i=0;i<m;i++)if(i!=r){const f=A[i][c]/A[r][c];for(let j=c;j<n;j++)A[i][j]-=f*A[r][j]}r++;
 }
 return r;
}
function mj(){
 if(MJ)return MJ;
 if(typeof math=="undefined")throw new Error("No se ha cargado la librería de cálculo (math.js). Revisa la conexión a internet.");
 MJ=math.create(math.all);
 const num=x=>{const v=toNum(x);if(!isFinite(v))throw new Error("valor no válido");return v};
 MJ.import({
  frac:(n,d)=>{n=num(n);d=num(d);if(!d)throw new Error("frac con denominador 0");return Number.isInteger(n)&&Number.isInteger(d)?frT(n,d):fmtN(n/d,true)},
  signo:x=>{x=num(x);return x<0?"- "+fmtEl(-x,true):"+ "+fmtEl(x,true)},
  coef:x=>{x=num(x);return x==1?"":x==-1?"-":fmtEl(x,true)},
  par:x=>{x=num(x);return x<0?"("+fmtEl(x,true)+")":fmtEl(x,true)},
  tras:A=>MJ.transpose(A),traspuesta:A=>MJ.transpose(A),
  id:n=>MJ.identity(num(n)),
  rango:A=>rangoDe(A),
  vdet:A=>latexMat(A,"vmatrix")
 },{override:true});
 return MJ;
}
// Traduce los errores más comunes de math.js
function tr(m){
 let r;
 if(r=m.match(/Undefined symbol (\w+)/))return `no existe la variable «${r[1]}» (¿la has creado arriba?)`;
 if(/Unexpected end of expression/.test(m))return "la fórmula está incompleta";
 if(/Parenthesis \) expected/.test(m))return "falta cerrar un paréntesis";
 if(r=m.match(/Unexpected operator (\S+)/))return `sobra o falta algo junto a «${r[1]}»`;
 if(r=m.match(/Value expected/))return "falta un número o una variable";
 if(r=m.match(/Undefined function (\w+)/))return `no existe la función «${r[1]}»`;
 if(r=m.match(/Matrix A columns \((\d+)\) must match Matrix B rows \((\d+)\)/))return `no se pueden multiplicar: la primera matriz tiene ${r[1]} columnas y la segunda ${r[2]} filas`;
 if(/Dimension mismatch/.test(m))return "las dimensiones de las matrices o vectores no permiten esa operación";
 if(/Cannot calculate inverse, determinant is zero|Matrix must be square/.test(m))return /square/.test(m)?"la matriz tiene que ser cuadrada":"la matriz no tiene inversa (su determinante es 0); añade la condición det(A) != 0";
 if(/Index out of range/.test(m))return "esa posición no existe en la matriz";
 return m;
}
function fmtN(v,inM){const r=+(+v).toFixed(4);return Number.isInteger(r)?String(r):String(r).replace(".",inM?"{,}":",")}
// Elemento de una matriz o solución: entero, fracción sencilla (1/3) o decimal
function fmtEl(x,inM){
 x=toNum(x);if(!isFinite(x))throw new Error("una expresión da un resultado no válido (¿división entre 0?)");
 const r=+x.toFixed(6);if(Number.isInteger(r))return String(r);
 if(inM)for(let d=2;d<=100;d++){const n=Math.round(x*d);if(Math.abs(n/d-x)<1e-9)return frT(n,d)}
 return fmtN(x,inM);
}
function latexMat(v,env="pmatrix"){
 const a=toArr(v);
 if(!Array.isArray(a[0]))return env=="pmatrix"?"("+a.map(x=>fmtEl(x,true)).join(", ")+")":latexMat([a],env);
 return TX`\begin{${env}}`+a.map(r=>r.map(x=>fmtEl(x,true)).join(" & ")).join(TX` \\ `)+TX`\end{${env}}`;
}
function fmtV(v,inM){
 if(typeof v=="string")return v;
 if(typeof v=="boolean")return v?"verdadero":"falso";
 if(isMat(v)){const s=latexMat(v);return inM?s:"$"+s+"$"}
 if(v&&v.isFraction)v=Number(v.valueOf());
 if(typeof v!="number")return String(v);
 if(!isFinite(v))throw new Error("una expresión da un resultado no válido (¿división entre 0?)");
 return fmtN(v,inM);
}
function rellenar(t,sc){
 let inM=false;
 return String(t||"").split(/(\$\$|\$)/).map(seg=>{
  if(seg=="$"||seg=="$$"){inM=!inM;return seg}
  return seg.replace(/\{\{([\s\S]+?)\}\}/g,(_,e)=>{let v;try{v=mj().evaluate(e,{...sc})}catch(x){throw new Error(`no se puede calcular {{${e}}}: ${tr(x.message)}`)}
   // frac(), vdet()… devuelven LaTeX: fuera de una fórmula se rodea de $ para que se dibuje
   if(!inM&&typeof v=="string"&&/\\/.test(v))return "$"+v+"$";
   return fmtV(v,inM)});
 }).join("");
}
function valores(p){
 const M=mj();
 for(let t=0;t<400;t++){
  const sc={};
  for(const v of p.variables||[]){
   const n=String(v.nombre||"").trim();
   if(!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(n))throw new Error(`nombre de variable no válido: "${n}". Usa letras, por ejemplo a, b o k1.`);
   if(v.tipo=="formula"){
    if(!String(v.formula||"").trim())throw new Error(`falta la fórmula de la variable ${n}.`);
    try{sc[n]=M.evaluate(String(v.formula),{...sc})}catch(x){throw new Error(`la variable ${n} no se puede calcular: ${tr(x.message)}`)}
   }else if(v.tipo=="lista"){
    const s=String(v.valores||""),L=s.split(s.includes(";")?";":",").map(x=>x.trim()).filter(Boolean);
    if(!L.length)throw new Error(`escribe los valores posibles de ${n}, separados por comas.`);
    const e=L[ri(0,L.length-1)];try{sc[n]=M.evaluate(e,{...sc})}catch(x){throw new Error(`en la lista de ${n}, «${e}» no es un valor válido.`)}
   }else{
    const a=Math.round(+v.min),b=Math.round(+v.max);
    if(!isFinite(a)||!isFinite(b))throw new Error(`la variable ${n} necesita un valor "desde" y "hasta".`);
    if(a>b)throw new Error(`en la variable ${n}, "desde" es mayor que "hasta".`);
    if(v.sinCero&&a==0&&b==0)throw new Error(`la variable ${n} solo puede valer 0 y está marcada "sin 0".`);
    const al=()=>{let x;do x=ri(a,b);while(v.sinCero&&x==0);return x};
    if(v.tipo=="matriz"){
     const f=Math.round(+v.filas),c=Math.round(+v.columnas);
     if(!(f>=1&&f<=5&&c>=1&&c<=5))throw new Error(`la matriz ${n} debe tener entre 1 y 5 filas y columnas.`);
     sc[n]=M.matrix([...Array(f)].map(()=>[...Array(c)].map(al)));
    }else if(v.tipo=="vector"){
     const k=Math.round(+v.componentes);
     if(!(k>=2&&k<=5))throw new Error(`el vector ${n} debe tener entre 2 y 5 componentes.`);
     sc[n]=M.matrix([...Array(k)].map(al));
    }else sc[n]=al();
   }
  }
  if(String(p.condicion||"").trim()){
   let ok;try{ok=M.evaluate(String(p.condicion),{...sc})}catch(x){throw new Error("la condición no se puede calcular: "+tr(x.message))}
   if(!ok)continue;
  }
  return sc;
 }
 throw new Error("no encuentro valores que cumplan la condición. Revisa los rangos o la condición.");
}
function instanciar(p){
 const M=mj(),sc=valores(p),f=t=>rellenar(t,sc),L=a=>(a||[]).filter(x=>String(x).trim()).map(f);
 const ev=(e,what)=>{
  if(!String(e??"").trim())throw new Error(`falta ${what}.`);
  let v;try{v=M.evaluate(String(e),{...sc})}catch(x){throw new Error(`no se puede calcular ${what}: ${tr(x.message)}`)}
  if(isMat(v))throw new Error(`${what} da una matriz. Para respuestas que son matrices o vectores, usa el tipo «Matriz o vector».`);
  v=toNum(v);if(!isFinite(v))throw new Error(`${what} no da un número válido.`);return v;
 };
 const q=f(p.enunciado);if(!q.trim())throw new Error("falta el enunciado.");
 const e={q,hints:L(p.pistas),sol:L(p.solucion)};
 switch(p.tipo){
  case "test":{const o=L(p.opciones);if(o.length<2)throw new Error("un test necesita al menos 2 opciones.");if(!e.sol.length)e.sol=["La respuesta correcta es: "+o[0]];return{...e,k:"test",opts:o,ok:0}}
  case "vf":if(!e.sol.length)e.sol=["Es "+(p.verdadero?"verdadero":"falso")+"."];return{...e,k:"test",opts:["Verdadero","Falso"],ok:p.verdadero?0:1,fixed:1};
  case "orden":{const s=L(p.pasos);if(s.length<2)throw new Error("hacen falta al menos 2 pasos.");if(!e.sol.length)e.sol=["El orden correcto es el de los pasos tal como están arriba."];return{...e,k:"orden",steps:s}}
  case "mat":{
   // Formato nuevo: una fórmula para toda la matriz (A*B, inv(A), cross(u,v)…); el tamaño sale solo
   if(String(p.respuesta??"").trim()){
    let v;try{v=M.evaluate(String(p.respuesta),{...sc})}catch(x){throw new Error(`no se puede calcular la respuesta: ${tr(x.message)}`)}
    if(!isMat(v))throw new Error("la respuesta debe ser una matriz o un vector, por ejemplo A*B. Si es un número, usa el tipo «Numérico».");
    const o=toArr(v),a=Array.isArray(o[0])?o:[o];
    const r=a.length,c=a[0].length;if(r>5||c>5)throw new Error("la respuesta tiene más de 5 filas o columnas.");
    const fl=a.flat().map(toNum);if(!fl.every(isFinite))throw new Error("la respuesta tiene elementos no válidos (¿división entre 0?).");
    if(!e.sol.length)e.sol=["Respuesta: $"+latexMat(o)+"$."];return{...e,k:"mat",rows:r,cols:c,ans:fl};
   }
   const r=Math.round(+p.filas||0),c=Math.round(+p.columnas||0);if(r<1||c<1||r>5||c>5)throw new Error("escribe la respuesta como fórmula (por ejemplo A*B) o indica filas y columnas entre 1 y 5.");
   const a=[...Array(r*c)].map((_,i)=>ev((p.respuestas||[])[i],`el elemento ${Math.floor(i/c)+1},${i%c+1} de la respuesta`));if(!e.sol.length)e.sol=["Respuesta: $"+mt(a.map(x=>fmtEl(x,true)),c)+"$."];return{...e,k:"mat",rows:r,cols:c,ans:a}}
  default:{const a=ev(p.respuesta,"la respuesta");if(!e.sol.length)e.sol=[`La respuesta es $${fmtEl(a,true)}$.`];return{...e,ans:a}}
 }
}

/* ---------- Montaje del contenido para la app ---------- */
function construir(C){
 const B={};
 for(const b of C.bloques||[]){
  B[b.id]={n:b.nombre||"(sin nombre)",d:b.descripcion||"",items:(b.items||[]).map((it,j)=>{
   const r={id:it.id||b.id+":"+j,ty:it.tipo,t:it.titulo||"(sin título)",tm:(it.tema||"").trim()||undefined,n:+it.n||undefined,soon:it.proximamente?1:undefined};
   if(it.tipo=="teoria"){r.th=md(it.teoria);r.ex=md(it.ejemplo)}
   if(it.tipo=="ejercicio"){r.gen=[...(it.automaticos||[]).filter(n=>GEN[n]).map(n=>GEN[n]),...(it.ejercicios||[]).map(p=>()=>instanciar(p))];if(!r.gen.length)r.soon=1}
   return r;
  })};
 }
 return B;
}

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
   {tipo:"calc"|"test"|"vf"|"orden"|"mat", enunciado, variables:[{nombre, tipo:"rango", min, max, sinCero} | {nombre, tipo:"formula", formula}],
    condicion, respuesta, opciones (la primera es la correcta), verdadero, pasos, filas, columnas, respuestas, pistas, solucion}
   En los textos, {{expresión}} se sustituye por su valor: {{a}}, {{a*b+1}}, {{frac(a,b)}}, {{signo(b)}}, {{coef(a)}}. */
let MJ=null;
function mj(){
 if(MJ)return MJ;
 if(typeof math=="undefined")throw new Error("No se ha cargado la librería de cálculo (math.js). Revisa la conexión a internet.");
 MJ=math.create(math.all);
 const num=x=>{const v=Number(x&&x.isFraction?x.valueOf():x);if(!isFinite(v))throw new Error("valor no válido");return v};
 MJ.import({
  frac:(n,d)=>{n=num(n);d=num(d);if(!d)throw new Error("frac con denominador 0");return Number.isInteger(n)&&Number.isInteger(d)?frT(n,d):fmtN(n/d,true)},
  signo:x=>{x=num(x);return x<0?"- "+fmtN(-x,true):"+ "+fmtN(x,true)},
  coef:x=>{x=num(x);return x==1?"":x==-1?"-":fmtN(x,true)},
  par:x=>{x=num(x);return x<0?"("+fmtN(x,true)+")":fmtN(x,true)}
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
 return m;
}
function fmtN(v,inM){const r=+(+v).toFixed(4);return Number.isInteger(r)?String(r):String(r).replace(".",inM?"{,}":",")}
function fmtV(v,inM){
 if(typeof v=="string")return v;
 if(typeof v=="boolean")return v?"verdadero":"falso";
 if(v&&v.isFraction)v=Number(v.valueOf());
 if(typeof v!="number")return String(v);
 if(!isFinite(v))throw new Error("una expresión da un resultado no válido (¿división entre 0?)");
 return fmtN(v,inM);
}
function rellenar(t,sc){
 let inM=false;
 return String(t||"").split(/(\$\$|\$)/).map(seg=>{
  if(seg=="$"||seg=="$$"){inM=!inM;return seg}
  return seg.replace(/\{\{([\s\S]+?)\}\}/g,(_,e)=>{let v;try{v=mj().evaluate(e,{...sc})}catch(x){throw new Error(`no se puede calcular {{${e}}}: ${tr(x.message)}`)}return fmtV(v,inM)});
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
   }else{
    const a=Math.round(+v.min),b=Math.round(+v.max);
    if(!isFinite(a)||!isFinite(b))throw new Error(`la variable ${n} necesita un valor "desde" y "hasta".`);
    if(a>b)throw new Error(`en la variable ${n}, "desde" es mayor que "hasta".`);
    if(v.sinCero&&a==0&&b==0)throw new Error(`la variable ${n} solo puede valer 0 y está marcada "sin 0".`);
    let x;do x=ri(a,b);while(v.sinCero&&x==0);sc[n]=x;
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
  v=Number(v&&v.isFraction?v.valueOf():v);if(!isFinite(v))throw new Error(`${what} no da un número válido.`);return v;
 };
 const q=f(p.enunciado);if(!q.trim())throw new Error("falta el enunciado.");
 const e={q,hints:L(p.pistas),sol:L(p.solucion)};
 switch(p.tipo){
  case "test":{const o=L(p.opciones);if(o.length<2)throw new Error("un test necesita al menos 2 opciones.");if(!e.sol.length)e.sol=["La respuesta correcta es: "+o[0]];return{...e,k:"test",opts:o,ok:0}}
  case "vf":if(!e.sol.length)e.sol=["Es "+(p.verdadero?"verdadero":"falso")+"."];return{...e,k:"test",opts:["Verdadero","Falso"],ok:p.verdadero?0:1,fixed:1};
  case "orden":{const s=L(p.pasos);if(s.length<2)throw new Error("hacen falta al menos 2 pasos.");if(!e.sol.length)e.sol=["El orden correcto es el de los pasos tal como están arriba."];return{...e,k:"orden",steps:s}}
  case "mat":{const r=Math.round(+p.filas||0),c=Math.round(+p.columnas||0);if(r<1||c<1||r>4||c>4)throw new Error("las filas y columnas deben estar entre 1 y 4.");
   const a=[...Array(r*c)].map((_,i)=>ev((p.respuestas||[])[i],`el elemento ${Math.floor(i/c)+1},${i%c+1} de la respuesta`));if(!e.sol.length)e.sol=["Respuesta: $"+mt(a.map(x=>fmtN(x,true)),c)+"$."];return{...e,k:"mat",rows:r,cols:c,ans:a}}
  default:{const a=ev(p.respuesta,"la respuesta");if(!e.sol.length)e.sol=[`La respuesta es $${fmtN(a,true)}$.`];return{...e,ans:a}}
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

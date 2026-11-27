// compare.js – rendrakás-ellenőrzés: két verzió ugyanazzal a véletlenszám-sorozattal (rögzített mag) ugyanazt kell adja.
// Használat:  node tests/compare.js <régi.html> <új.html>
// Lejátszik néhány taktikai csatát (automata kíséret) és néhány OP-napot (U-boatok, NPC-konvojok), majd összeveti az eredményt.
// Ha a rendrakás nem változtatott a szabályokon, a két „ujjlenyomat” azonos.
const {chromium}=require('playwright'),fs=require('fs'),path=require('path');
const [fa,fb]=process.argv.slice(2).map(f=>path.resolve(f||''));
if(!fa||!fb||!fs.existsSync(fa)||!fs.existsSync(fb)){console.log('Használat: node tests/compare.js <régi.html> <új.html>');process.exit(2)}

/* a rögzített magú véletlenszám-generátor (mulberry32) – a lap betöltése ELŐTT cseréli a Math.random-ot */
const SEED_SCRIPT=seed=>`(()=>{let a=${seed}>>>0;Math.random=function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}})();`;

/* fingerprint: a lapon futó lejátszás; csak a szabályok eredményét gyűjti (időtől független adatokat) */
async function fingerprint(browser,file,seed){
 const ctx=await browser.newContext();await ctx.addInitScript(SEED_SCRIPT(seed));
 const p=await ctx.newPage(),errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
 await p.goto('file://'+file);await p.waitForTimeout(400);
 const r=await p.evaluate(()=>{const out={};
  /* 1. taktikai csata: 30 kör, automata kíséret, 6 extra romboló */
  try{$('n').value=30;reset();$('fo').checked=true;try{aiAllSet('1')}catch(e){}
   for(let i=0;i<6;i++)ships.push(mkE({id:'X'+i,cls:'T'},SLOT_ORDER[i%6],cmd()));
   for(let t=0;t<40&&turn<30;t++)$('bs').click();
   out.battle={turn,ships:ships.map(s=>[s.id,s.t,s.x,s.y,(s.dmg||[]).join('')].join(':')).sort(),kl:(typeof KL!=='undefined'?KL.map(k=>k.id+'/'+k.why):[])}}catch(e){out.battleErr=e.message}
  /* 2. OP: új kampány, 15 nap (U-boatok, NPC-konvojok, német hajók) */
  try{CAMP.newCampGo();for(let i=0;i<15;i++)OPG.worldDay();
   out.ub=Object.keys(CAMP.ub||{}).sort().map(id=>{const p=CAMP.ub[id],o=p.op||{};return[id,o.st,o.r,o.c,p.tp,(p.dmg||[]).join(''),p.dead?1:0].join(':')});
   out.log=(CAMP.log||[]).slice(-30)}catch(e){out.opErr=e.message}
  return out});
 await ctx.close();return{r,errs}}

(async()=>{const b=await chromium.launch();let bad=0;
 for(const seed of [11,2024,77777]){
  const A=await fingerprint(b,fa,seed),B=await fingerprint(b,fb,seed);
  const ja=JSON.stringify(A.r),jb=JSON.stringify(B.r),same=ja===jb&&!A.errs.length&&!B.errs.length;
  console.log((same?'  AZONOS  ':'  ELTÉR   ')+'mag='+seed+(A.errs.length||B.errs.length?'  JS-hibák: '+A.errs.concat(B.errs).join(' | '):''));
  if(!same){bad++;for(const k of Object.keys(A.r)){if(JSON.stringify(A.r[k])!==JSON.stringify(B.r[k]))console.log('     eltérés: '+k)}}}
 await b.close();console.log(bad?'\n'+bad+' mag eltér – a rendrakás változtatott valamin!':'\nMinden mag azonos eredményt adott.');process.exit(bad?1:0)})();

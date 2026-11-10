// run-all.js – regressziós tesztcsomag a CEG játékhoz.  Használat:  node run-all.js <a játék .html fájlja>
// Minden teszt külön, tiszta oldalbetöltéssel fut; a végén összesít, hibakóddal lép ki, ha bármi elbukott.
const {chromium}=require('playwright'),fs=require('fs'),path=require('path');
const file=path.resolve(process.argv[2]||'');if(!fs.existsSync(file)){console.log('Használat: node run-all.js <játék.html>');process.exit(2)}
const fixture=path.join(__dirname,'fixture_kampany.json');
const sl=ms=>new Promise(r=>setTimeout(r,ms));
const results=[];
// T: egy teszt = név + a lapon futó függvény (evaluate); a függvény {ok:bool, info:...} értéket ad
async function T(browser,name,fn,arg){
 const page=await browser.newPage(),errs=[];page.on('pageerror',e=>errs.push(e.message));page.on('dialog',d=>d.accept());
 try{await page.goto('file://'+file);await page.waitForTimeout(400);
  const r=await page.evaluate(fn,arg);
  const ok=!!(r&&r.ok)&&errs.length===0;results.push({name,ok,info:(r&&r.info)||'',errs});
 }catch(e){results.push({name,ok:false,info:'KIVÉTEL: '+e.message.split('\n')[0],errs})}
 await page.close()}
(async()=>{const b=await chromium.launch();
// 1) a lap hibák nélkül betölt, a verzió látszik
await T(b,'Indulás, nincs JS-hiba',()=>({ok:typeof reset==='function'&&typeof CAMP==='object'&&typeof OPG==='object',info:document.title}));
// 2) sima csata: automata kíséret, 35 kör lefut, a hajók száma nem nő
for(const [nm,free] of [['Sakktábla-mozgás',0],['Szabad mozgás',1]])
 await T(b,'35 körös csata, automata – '+nm,(free)=>{CFG.turnRule=free;$('n').value=30;reset();$('fo').checked=true;try{aiAllSet('1')}catch(e){}
  for(let i=0;i<6;i++)ships.push(mkE({id:'X'+i,cls:'T'},SLOT_ORDER[i%6],cmd()));
  const m0=ships.filter(s=>s.t=='M').length;let t=0;
  for(;t<40&&turn<35;t++){$('bs').click()}
  const m1=ships.filter(s=>s.t=='M').length;
  return{ok:(turn>=30||stopped||turn>=15)&&m1<=m0&&ships.every(s=>isFinite(s.x)&&isFinite(s.y)),info:'kör='+turn+(stopped?' (STOP)':'')+', teherhajó '+m0+'→'+m1+', utolsó: '+String(LOG[0]).slice(0,60)}},free);
// 3) összesítő HTML elkészül, a fogyasztás oszlop kapcsolható
await T(b,'Összesítés (buildSummary), sumFuel kapcsoló',()=>{$('n').value=24;reset();for(let i=0;i<3;i++)ships.push(mkE({id:'X'+i,cls:'T'},SLOT_ORDER[i],cmd()));
 for(let i=0;i<4;i++)$('bs').click();CFG.sumFuel=1;const a=buildSummary(false);CFG.sumFuel=0;const b2=buildSummary(false);
 return{ok:a.length>200&&/Üzemanyag: fogyott/.test(a)&&!/Üzemanyag: fogyott/.test(b2),info:a.length+' kar.'}});
// 4) konvoj-elrendezés: a három mód, átrendezés turn 0-n, elutasítás később
await T(b,'Konvoj-elrendezés (cvLayout / cvRelayout)',()=>{$('n').value=30;$('cvl').value='0';reset();const w=()=>{const x=ships.filter(s=>s.t=='M').map(s=>s.x);return Math.max(...x)-Math.min(...x)};
 const w0=w();$('cvl').value='1';cvRelayout();const w1=w();const uniq=new Set(ships.filter(s=>s.t=='M').map(s=>s.x+','+s.y)).size;
 turn=3;const late=cvRelayout();turn=0;return{ok:w1<w0&&uniq==30&&late===false,info:'szél '+w0+'→'+w1+', egyedi '+uniq}});
// 5) OP lap: a jelölt cellák száma a cvTurn szerint (1,2,3 → 3,5,7)
await T(b,'OP: jelölt cellák (cvTurn 1/2/3)',()=>{const r=[];for(const t of [1,2,3]){setCfg('cvTurn',t);r.push(document.querySelectorAll('.c.d').length)}
 return{ok:r.join()=='3,5,7',info:r.join()}});
// 6) AI-kísérők kikerülése: azonos zónában nincs átfedés (escAvoid)
await T(b,'AI-kísérők kerülik egymást (escAvoid)',()=>{const run=av=>{let ov=0;CFG.escAvoid=av;
 for(let g=0;g<6;g++){$('n').value=30;reset();$('fo').checked=true;try{aiAllSet('1')}catch(e){}for(let i=0;i<6;i++)ships.push(mkE({id:'X'+i,cls:'T'},SLOT_ORDER[i%2],cmd()));
  for(let t=0;t<8;t++){$('bs').click();const seen={};ships.filter(q=>(q.t=='E'&&!q.en)||q.t=='M').forEach(q=>{const k=q.x+','+q.y;seen[k]=(seen[k]||0)+1});ov+=Object.values(seen).filter(v=>v>1).length}}return ov};
 const off=run(0),on=run(1);return{ok:on<=off*0.5,info:'átfedés kikerülés nélkül='+off+', vele='+on}});
// 7) mentett kampány betöltése (a felhasználó JSON-ja) és mentés-kör
const fx=JSON.parse(fs.readFileSync(fixture,'utf8'));
await T(b,'Kampány-mentés betöltése (fixture) és újramentése',(fx)=>{CAMP.restore(fx);const n=CAMP.fleet.length;
 return{ok:n>0&&CAMP.egp!=null,info:'flotta='+n+' hajó, EGp='+CAMP.egp}},fx);
// 8) kampány: esemény → taktikai csata → csata vége → OP (a teljes kör)
await T(b,'Kampány: esemény → csata → vége → OP',(fx)=>{CAMP.restore(fx);
 try{CAMP.event0('U','H20',3,5)}catch(e){return{ok:false,info:'event0: '+e.message}}
 if(!CAMP.battle)return{ok:false,info:'nem indult csata'};
 for(let i=0;i<5;i++)$('bs').click();CAMP.end();
 return{ok:CAMP.fleet.length>0&&document.getElementById('o_bw')!=null,info:'csata vége lefutott, battle='+(!!CAMP.battle)+', flotta='+CAMP.fleet.length}},fx);
// 9) mentő-akció / üzemanyag: kifogyott hajó a mentés rendszerben (fuelStrand)
await T(b,'Üzemanyag-mentés függvények léteznek',()=>({ok:typeof OPG.fuelStrand==='function'&&typeof CAMP.rescueHTML==='function',info:''}));
// 10) üzemanyag-mentés (a fixture TF24 / D7 esete): mentő-lista, vontatás, kikötői feltöltés
await T(b,'Mentőakció: TF24 → vontatás → feltöltés',(fx)=>{CAMP.restore(fx);const o={};
 const u=OPG.units().find(x=>x.id=='TF24');if(!u)return{ok:false,info:'nincs TF24 a mentésben'};
 const h=CAMP.rescueHTML();o.list=/üzemanyag nélkül/.test(h);
 const u2=OPG.units().find(x=>x.id=='TF24');
 const id=OPG.tfNew(['D8'],'Liverpool',5);const ru=OPG.units().find(x=>x.id==id);ru.r=u2.r;ru.c=u2.c;
 o.btn=/Bevontat/.test(CAMP.rescueHTML());
 CAMP.rescueTow('TF24',id);const ru2=OPG.units().find(x=>x.id==id);o.tow=!!ru2.tow;
 CAMP.dockTF(ru2,'Liverpool');const d7=CAMP.get('D7');o.d7=d7.fu;o.dis=d7.dis;
 return{ok:o.list&&o.btn&&o.tow&&!d7.dis&&d7.fu>0,info:JSON.stringify(o)}},fx);
// 11) torpedó: FAT-pálya, LUT-pálya és a kilövés a kézi U-boattal
await T(b,'Torpedó: FAT / LUT pálya, kilövés',()=>{CFG.turnRule=1;CFG.subBat=1;CFG.lutFrom=0;CFG.schFrom=0;try{obsToggle();obsNew()}catch(e){}
 const o={};const u=ships.find(q=>q.t=='U')||uEnter('U9');sel=u;
 const f=fatCells({x:30,y:30,d:3}),l=fatCells({x:30,y:30,d:3,lut:1});o.fat=f.length;o.lut=l.length;
 u.dep=0;u.tp=5;u.tub=[1,1,1,1,1];u.done=false;u.lutM=0;const n0=torps.length;try{fire(0)}catch(e){return{ok:false,info:'fire: '+e.message}}
 o.torps=torps.length-n0;
 return{ok:f.length>0&&l.length>f.length&&o.torps>=0,info:JSON.stringify(o)+' (a kilövés darabszáma véletlen-függő, csak a hibamentes lefutást nézzük)'}});
// 12) LUT és légperiszkóp (schnorchel): elérhetőség, akku-fogyasztás és kártya
await T(b,'LUT és légperiszkóp (schUse, needMax, kártya)',()=>{CFG.turnRule=1;CFG.subBat=1;CFG.lutFrom=0;CFG.schFrom=0;try{obsToggle();obsNew()}catch(e){}
 const o={};const u=ships.find(q=>q.t=='U')||uEnter('U9');sel=u;
 o.avail=[lutAvail(),schAvail()];
 u.dep=1;u.spd=5;u.dmg=u.dmg.map(()=>0);u.st=u.st||u.dmg.map(()=>0);u.schM=1;u.bat=5;
 const use1=schUse(u),need1=needMax(u);u.schM=0;const need0=needMax(u);u.schM=1;
 try{card()}catch(e){return{ok:false,info:'card: '+e.message}}
 const h=document.body.innerHTML;o.card=[/LUT torpedó/.test(h),/Légperiszkóp/.test(h)];
 CFG.schOn=0;const useOff=schUse(u);
 return{ok:o.avail[0]&&o.avail[1]&&o.card[0]&&o.card[1]&&use1!==useOff,info:JSON.stringify({o,use1,need1,need0,useOff})}});
// 13) küldetések (v1.14.250, jelentkezés nélkül): sorsolás, lap, kötelék indítása, cellák érintése az útvonalon, kikötés → jutalom (két küldetés egy úton), mentés
await T(b,'Küldetések: sorsolás → TF útvonal → kikötés → EGp',(fx)=>{CAMP.restore(fx);ECO.misP=100;for(let i=0;i<3;i++)CAMP.newDay();const o={};
 o.n=MIS.list().length;MIS.view();o.html=document.getElementById('vMIS').innerHTML.length;
 const rd=CAMP.fleet.filter(f=>CAMP.inPort(f)&&f.st==='ready'&&!CAMP.worn(f));rd.filter(f=>f.loc===rd[0].loc).slice(0,2).forEach(f=>f.tsel=true);
 const n0=OPG.units().length;MIS.launch();const u=OPG.units()[OPG.units().length-1];if(OPG.units().length!==n0+1)return{ok:false,info:'nem indult kötelék'};
 const ms=MIS.list().slice(0,2);ms.forEach(m=>m.cells.forEach(a=>u.route.push([a,0,'-',OPG.day()])));   /* a TF „bejárta” két küldetés celláit */
 const early=MIS.arrive({id:'X',route:[]},'teszt');   /* üres útvonal: semmi sem teljesül */
 const e0=CAMP.egp,sum=ms.reduce((a,m)=>a+m.egp,0),left=MIS.list().length;MIS.arrive(u,'teszt');
 const saved=JSON.stringify(CAMP.pack().c.mis);
 return{ok:o.n>=2&&o.html>5000&&early===''&&CAMP.egp===e0+sum&&MIS.list().length===left-ms.length,info:'küldetés='+o.n+', EGp '+e0+'→'+CAMP.egp+' (két küldetés egy úton)'}},fx);
// 15) v1.14.431: a jelentés ESEMÉNYTÁRA (EVL) ugyanazt adja, mint a napló szöveges elemzése (ágyú, süllyedés, légi) – automata csata minden ellenséggel
await T(b,'Jelentés: eseménytár (EVL) = napló-elemzés',()=>{CFG.allEnemies=1;CFG.alogOn=1;CFG.evLog=1;CFG.airDie=3;$('n').value=24;reset();$('fo').checked=true;try{aiAllSet('1')}catch(e){}
 for(let i=0;i<6;i++)ships.push(mkE({id:'X'+i,cls:'T'},SLOT_ORDER[i%6],cmd()));
 for(let t=0;t<45&&turn<35&&!stopped;t++)$('bs').click();
 const E=rptParse(),X=E._rx;if(!X)return{ok:false,info:'nincs eseménytár (EVFULL='+EVFULL+')'};
 const key=g=>g.k+'|'+g.by+'|'+g.tg+'|'+(g.hit?1:0),cnt=L=>{const m={};L.forEach(g=>{m[key(g)]=(m[key(g)]||0)+1});return m},a=cnt(E.gun),c=cnt(X.gun);
 const gunOk=Object.keys(c).every(k=>a[k]===c[k])&&Object.keys(a).every(k=>a[k]===c[k]);
 const sk=L=>L.map(x=>x.k+'|'+x.id+'|'+x.kind).sort().join(','),sunkOk=sk(E.sunk)===sk(X.sunk);
 const airOk=E.airB.length===X.airB.length&&E.airIn.length===X.airIn.length;
 /* v1.14.432: torpedók – kilövés, felszíni sorozat, kitérés (a találatnál az eseménytár a pontosabb: egy körben két találat is megmarad) */
 const shN=S=>Object.keys(S).reduce((n,u)=>n+S[u].length,0),zk=L=>L.map(z=>z.k+'|'+z.id+'|'+z.n).sort().join(','),ek=L=>L.map(z=>z.k+'|'+z.id).sort().join(',');
 /* v1.14.433: vízibomba, sortűz, U-boat-találat, közeli bombák (az eseménytárban a már lépett U-boatot azonnal érő találat is benne van, ezért ott ≥) */
 const bN=B=>Object.keys(B).reduce((n,id)=>n+Object.keys(B[id]).reduce((m,k)=>m+B[id][k],0),0);
 const asOk=bN(E.bombs)===bN(X.bombs)&&E.salv.length>=X.salv.length&&E.uHits.length>=X.uHits.length&&E.bNear===X.bNear&&E.bNearHit===X.bNearHit;
 const tpOk=shN(E.shots)===shN(X.shots)&&zk(E.zTorp)===zk(X.zTorp)&&ek(E.evade)===ek(X.evade)&&E.tHits.length>=X.tHits.length;
 let rep=0;try{rep=rptText(rptBlocks(true),'T').length}catch(e){return{ok:false,info:'jelentés: '+e.message}}
 return{ok:gunOk&&sunkOk&&airOk&&tpOk&&asOk&&rep>500,info:'kör='+turn+', ágyú '+E.gun.length+'/'+X.gun.length+', süllyedés '+E.sunk.length+'/'+X.sunk.length+', légi '+E.airB.length+'/'+X.airB.length+', torpedó-találat '+E.tHits.length+'/'+X.tHits.length+', bomba '+bN(E.bombs)+'/'+bN(X.bombs)+', U-találat '+E.uHits.length+'/'+X.uHits.length+', esemény='+EVL.length}});
// 16) v1.14.421: kanyar-kocka – a 90°-os lap csak az első lépés lehet, utána nincs több lépés (diceNo90)
await T(b,'Kanyar-kocka: 90° csak első lépés (diceNo90)',()=>{CFG.diceMode=1;CFG.turnRule=0;CFG.diceNo90=1;CFG.diceCap=0;$('n').value=12;reset();$('fo').checked=false;
 const s=mkE({id:'X0',cls:'T'},SLOT_ORDER[0],cmd());ships.push(s);newTurn();sel=s;
 const mk=(k,v)=>({k,v,stop:k=='S',used:false,lab:k,src:'b'});
 const set=()=>{s.spd=3;s.done=false;s.idx=0;s.cum=0;s.d90=false;s.ch=[];s.dice=[mk('F',0),mk('R2',2),mk('S',0),mk('L1',-1)]};
 set();chd(0);const a=diceBlk(s,s.dice[1]);                                   // előre lépés után a 90° tiltott
 set();chd(1);const b1=s.idx,b2=need(s),b3=s.dice.filter((d,i)=>i!=1).every(d=>diceBlk(s,d));chd(3);const b4=s.idx;   // 90° elsőként: utána nincs több lépés
 return{ok:a===true&&b1===1&&b2===1&&b3===true&&b4===1,info:JSON.stringify({a,b1,b2,b3,b4})}});
// 17) v1.14.429: beállítás-kereső – név szerint 1 találat, ékezet nélkül is talál, törlés után minden sor visszajön
await T(b,'Beállítás-kereső (cfgFilter)',()=>{CAMP.setupView();
 const vis=()=>[...document.querySelectorAll('#vSET tr')].filter(t=>t.querySelector('td')&&t.style.display!='none'&&t.closest('table').style.display!='none').length;
 const all=vis();cfgFilter('wxCloudN');const one=vis();cfgFilter('felho');const some=vis();cfgFilter('xyzzy');const none=vis();cfgFilter('');const back=vis();
 return{ok:all>500&&one===1&&some>=3&&none===0&&back===all,info:JSON.stringify({all,one,some,none,back})}});
await b.close();
let bad=0;for(const r of results){console.log((r.ok?'  OK   ':'  HIBA ')+r.name+(r.info?'  ['+r.info+']':'')+(r.errs.length?'  JS-hibák: '+r.errs.join(' | '):''));if(!r.ok)bad++}
console.log(bad?('\n'+bad+' / '+results.length+' teszt BUKOTT'):('\nMind a '+results.length+' teszt rendben'));process.exit(bad?1:0)})();

const D=window.DATA;let P=structuredClone(D.stock),C=structuredClone(D.cuts),H=[],R=[],stockSystem="all",cutSystem="all";const $=s=>document.querySelector(s),findP=c=>P.find(x=>x.code===c||x.profileCode===c);C.forEach(x=>{let p=findP(x.code);if(p){x.system=x.system||p.system||"Nezaradené";x.systems=x.systems||p.systems||[x.system];x.color=x.color||p.color}});
function profileName(code,fallback=""){
 const item=P.find(x=>x.profileCode===code||x.code===code)||C.find(x=>x.code===code&&x.name);
 return item&&item.name?item.name:(fallback||"Názov nie je v sklade");
}
function profileDisplay(code,fallback=""){return code+" · "+profileName(code,fallback)}
function show(id){if(id==="shipped")renderShipped();document.querySelectorAll("main>section").forEach(x=>x.classList.add("hidden"));$("#"+id).classList.remove("hidden");document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("active",x.dataset.p===id));scrollTo(0,0)}document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>show(b.dataset.p));$("#printBtn").onclick=()=>print();
function reservedFor(code){return R.filter(r=>r.code===code&&r.kind!=="cut").reduce((s,r)=>s+r.qty,0)}
function reservedCutFor(id){return R.filter(r=>r.kind==="cut"&&r.cutId===id).reduce((s,r)=>s+r.qty,0)}
function render(){$("#bars").textContent=P.reduce((a,x)=>a+x.qty,0);$("#cutCount").textContent=C.filter(x=>x.status==="DOSTUPNÝ").reduce((a,x)=>a+x.qty,0);$("#moves").textContent=H.length;$("#stockT").innerHTML='<table><tr><th>Kód</th><th>Názov</th><th>Farba</th><th>Dĺžka</th><th>Fyzicky</th><th>Rezervované</th><th>Voľné</th></tr>'+P.filter(x=>stockSystem==="all"||(x.systems||[x.system]).includes(stockSystem)).map(x=>{let rv=reservedFor(x.code),free=Math.max(0,x.qty-rv);return `<tr><td><b>${x.code}</b></td><td>${x.name}</td><td>${x.color}</td><td>${x.length}</td><td>${x.qty}</td><td><b>${rv}</b></td><td class="${free<=0&&rv>0?"bad":"ok"}"><b>${free}</b></td></tr>`}).join('')+'</table>';$("#cutsT").innerHTML='<table><tr><th>ID</th><th>Profil</th><th>Názov profilu</th><th>Dĺžka</th><th>Fyzicky</th><th>Rezervované</th><th>Voľné</th><th>Stav</th></tr>'+C.filter(x=>cutSystem==="all"||(x.systems||[x.system]).includes(cutSystem)).map(x=>{let rv=reservedCutFor(x.id),free=Math.max(0,x.qty-rv),p=findP(x.code),nm=x.name||(p?p.name:"—"),cls=free>0?"stock-ok":"stock-bad";return `<tr><td>${x.id}</td><td>${x.code}</td><td>${nm}</td><td>${x.length}</td><td>${x.qty}</td><td><b>${rv}</b></td><td class="${cls}"><b>${free}</b></td><td><span class="${cls}">${free>0?"DOSTUPNÝ":"REZERVOVANÝ"}</span></td></tr>`}).join('')+'</table>';$("#histT").innerHTML=H.length?'<table><tr><th>Čas</th><th>Typ</th><th>Profil</th><th>Farba</th><th>Ks</th><th>Dĺžka</th><th>Zákazka</th><th>Akcia</th></tr>'+H.map((x,i)=>`<tr><td>${x.time}</td><td>${x.type}</td><td>${x.code}</td><td>${x.color||"—"}</td><td>${x.qty}</td><td>${x.length}</td><td>${x.job}</td><td>${x.cancelled?'<span class="muted">ZRUŠENÉ</span>':'<button class="gray cancelMove" data-i="'+i+'">Zrušiť</button>'}</td></tr>`).join('')+'</table>':'Bez pohybov.';setTimeout(()=>document.querySelectorAll(".cancelMove").forEach(b=>b.onclick=()=>cancelMovement(+b.dataset.i)),0);$("#jobT").innerHTML='<table><tr><th>Profil</th><th>Názov</th><th>Dĺžka</th><th>Ks</th></tr>'+D.famus.map(x=>`<tr><td>${x.code}</td><td>${x.name}</td><td>${x.length}</td><td>${x.qty}</td></tr>`).join('')+'</table>'}
function normalizeColor(s){return String(s||"").toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^A-Z0-9]/g,"")}function bindFilters(){document.querySelectorAll(".sys").forEach(b=>b.onclick=()=>{stockSystem=b.dataset.system;document.querySelectorAll(".sys").forEach(x=>x.classList.toggle("activeSys",x===b));render()});document.querySelectorAll(".sysCut").forEach(b=>b.onclick=()=>{cutSystem=b.dataset.system;document.querySelectorAll(".sysCut").forEach(x=>x.classList.toggle("activeSys",x===b));render()});document.querySelectorAll(".module").forEach(b=>b.onclick=()=>{document.querySelectorAll(".module").forEach(x=>x.classList.toggle("activeModule",x===b));show(b.dataset.target)})}
function parseCode(s){let a=s.trim().split("|");return a.length===3&&a[0]==="LANGAS"?{code:a[1],color:a[2]}:null}function addCut(p,len,qty){C.push({id:"ODR-"+String(C.length+1).padStart(3,"0"),code:p.code,color:p.color,length:len,qty,status:"DOSTUPNÝ"})}
function issueOne(p,want,job,movementType="ODBER DO VÝROBY"){
 const k=5,min=500;
 let a=C.filter(x=>x.code===p.code&&x.status==="DOSTUPNÝ"&&x.qty>0&&x.length>=want+k).sort((x,y)=>x.length-y.length);
 if(a.length){
   let cut=a[0],old=cut.length,cutId=cut.id;
   cut.qty--;if(!cut.qty)cut.status="SPOTREBOVANÝ";
   let rem=old-want-k,newCutId=null;
   if(rem>=min){addCut(p,rem,1);newCutId=C[C.length-1].id}
   H.unshift({id:Date.now()+"-"+Math.random(),time:new Date().toLocaleString("sk-SK"),type:movementType+" – ODREZOK",code:p.code,color:p.color,qty:1,length:want,job,cancelled:false,effect:{kind:"issueCut",cutId,newCutId}});
   return `Použitý odrezok ${old} mm → ${want} + 5 mm${rem>=min?` → nový odrezok ${rem} mm`:" → zvyšok odpad"}.`
 }
 if(!p.qty)return"NEDOSTATOK: nie je celá tyč.";
 p.qty--;let rem=p.length-want-k;if(rem<0){p.qty++;return"NEDOSTATOK: požadovaná dĺžka je väčšia než celá tyč."}
 let newCutId=null;if(rem>=min){addCut(p,rem,1);newCutId=C[C.length-1].id}
 H.unshift({id:Date.now()+"-"+Math.random(),time:new Date().toLocaleString("sk-SK"),type:movementType+" – CELÁ TYČ",code:p.code,color:p.color,qty:1,length:want,job,cancelled:false,effect:{kind:"issueBar",newCutId}});
 return `Otvorená celá tyč ${p.length} mm → ${want} + 5 mm${rem>=min?` → nový odrezok ${rem} mm`:" → zvyšok odpad"}.`
}
function removeCreatedCut(id){if(!id)return true;let i=C.findIndex(x=>x.id===id);if(i<0)return true;let x=C[i];if(x.status!=="DOSTUPNÝ"||x.qty!==1)return false;C.splice(i,1);return true}
function cancelMovement(i){
 let m=H[i];if(!m||m.cancelled)return;
 if(!confirm("Naozaj zrušiť tento pohyb a vrátiť sklad do pôvodného stavu?"))return;
 let p=P.find(x=>x.code===m.code&&normalizeColor(x.color)===normalizeColor(m.color));
 if(!p)return alert("Profil sa v sklade nenašiel.");
 let ef=m.effect||{};
 if(ef.kind==="receiptBar"){if(p.qty<m.qty)return alert("Pohyb nemožno zrušiť: prijaté tyče už boli spotrebované.");p.qty-=m.qty}
 else if(ef.kind==="receiptCut"){let x=C.find(x=>x.id===ef.cutId);if(!x||x.status!=="DOSTUPNÝ"||x.qty<m.qty)return alert("Pohyb nemožno zrušiť: prijatý kus už bol spotrebovaný.");x.qty-=m.qty;if(!x.qty)C.splice(C.indexOf(x),1)}
 else if(ef.kind==="issueBar"){if(!removeCreatedCut(ef.newCutId))return alert("Pohyb nemožno zrušiť: nový odrezok už bol ďalej použitý.");p.qty+=1}
 else if(ef.kind==="issueBars"){p.qty+=ef.qty}
 else if(ef.kind==="issueCut"){if(!removeCreatedCut(ef.newCutId))return alert("Pohyb nemožno zrušiť: nový odrezok už bol ďalej použitý.");let x=C.find(x=>x.id===ef.cutId);if(!x)return alert("Pôvodný odrezok sa nenašiel.");x.qty+=1;x.status="DOSTUPNÝ"}
 else return alert("Tento starší pohyb nemá údaje potrebné na bezpečné zrušenie.");
 m.cancelled=true;m.cancelledAt=new Date().toLocaleString("sk-SK");render();
}
function syncLengthMode(){
 const mode=$("#lengthMode").value, op=$("#operation").value, p=parseCode($("#scanCode").value), stock=p?P.find(x=>x.code===p.code&&normalizeColor(x.color)===normalizeColor(p.color)):null;
 if(mode==="auto"){
   $("#reqLen").disabled=true;
   if(op==="PRÍJEM"&&stock)$("#reqLen").value=stock.length;
 }else{
   $("#reqLen").disabled=false;
   $("#reqLen").focus();
 }
}
$("#lengthMode").addEventListener("change",syncLengthMode);
$("#operation").addEventListener("change",syncLengthMode);
$("#scanCode").addEventListener("change",syncLengthMode);
$("#confirmScan").onclick=()=>{
  let q=parseCode($("#scanCode").value),qty=+$("#scanQty").value,entered=+$("#reqLen").value,job=$("#scanJob").value||"Bez zákazky",mode=$("#lengthMode").value;
  if(!q)return $("#scanResult").innerHTML='<p class="bad">Neplatný kód.</p>';
  let p=P.find(x=>x.code===q.code&&normalizeColor(x.color)===normalizeColor(q.color));
  if(!p)return $("#scanResult").innerHTML='<p class="bad">Profil/farba nie je v sklade.</p>';
  let m=[];
  if($("#operation").value==="PRÍJEM"){
    let receivedLength;if(mode==="auto"){receivedLength=p.length}else if(mode==="custom"){receivedLength=entered}else{return $("#scanResult").innerHTML='<p class="bad">Neplatný režim dĺžky.</p>'};
    if(!receivedLength||receivedLength<=0)return $("#scanResult").innerHTML='<p class="bad">Zadaj platnú dĺžku.</p>';
    let effect;if(receivedLength===p.length){p.qty+=qty;effect={kind:"receiptBar"}}
    else{addCut(p,receivedLength,qty);effect={kind:"receiptCut",cutId:C[C.length-1].id}}
    H.unshift({id:Date.now()+"-"+Math.random(),time:new Date().toLocaleString("sk-SK"),type:"PRÍJEM",code:p.code,color:p.color,qty,length:receivedLength,job,cancelled:false,effect});
    m.push(`Režim: ${mode==="auto"?"AUTOMATICKÁ":"VLASTNÁ"} · Prijaté ${qty} ks · ${p.code} · ${p.color} · ${receivedLength} mm.`);
  }else{
    if(mode==="auto"){
      if(p.qty<qty)return $("#scanResult").innerHTML='<p class="bad">NEDOSTATOK: nie je dostatok celých štandardných tyčí.</p>';
      p.qty-=qty;
      H.unshift({id:Date.now()+"-"+Math.random(),time:new Date().toLocaleString("sk-SK"),type:$("#operation").value+" – CELÁ TYČ",code:p.code,color:p.color,qty,length:p.length,job,cancelled:false,effect:{kind:"issueBars",qty}});
      m.push(`Vydané ${qty} ks celých tyčí · ${p.code} · ${p.color} · ${p.length} mm · bez rezu.`);
    }else{
      let want=entered;
      if(!want||want<=0)return $("#scanResult").innerHTML='<p class="bad">Zadaj požadovanú dĺžku.</p>';
      for(let i=0;i<qty;i++)m.push(issueOne(p,want,job,$("#operation").value));
    }
  }
  $("#scanResult").innerHTML='<div class="note">'+m.join("<br>")+'</div>';render()
};
let qrStream=null,qrRunning=false;
function stopScanner(){qrRunning=false;if(qrStream){qrStream.getTracks().forEach(t=>t.stop());qrStream=null}$("#video").classList.add("hidden")}
function scanFrame(){if(!qrRunning)return;const v=$("#video");if(v.readyState>=2&&v.videoWidth){const cv=document.createElement("canvas");cv.width=v.videoWidth;cv.height=v.videoHeight;const ctx=cv.getContext("2d",{willReadFrequently:true});ctx.drawImage(v,0,0,cv.width,cv.height);const im=ctx.getImageData(0,0,cv.width,cv.height);const q=window.jsQR?jsQR(im.data,im.width,im.height,{inversionAttempts:"dontInvert"}):null;if(q&&q.data){const parsed=parseCode(q.data);if(parsed&&findP(parsed.code)){$("#scanCode").value=q.data;$("#camMsg").innerHTML='<span class="ok">Načítané: '+parsed.code+' · '+parsed.color+'</span>';stopScanner();if(navigator.vibrate)navigator.vibrate(120);return}else{$("#camMsg").innerHTML='<span class="bad">QR bol načítaný, ale nie je to platný LANGAS skladový kód.</span>'}}}requestAnimationFrame(scanFrame)}
$("#camera").onclick=async()=>{try{stopScanner();if(!window.jsQR)throw Error("QR dekodér sa nenačítal.");qrStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"},width:{ideal:1280},height:{ideal:720}},audio:false});$("#video").srcObject=qrStream;$("#video").classList.remove("hidden");await $("#video").play();qrRunning=true;$("#camMsg").textContent="Namier kameru na LANGAS QR kód…";requestAnimationFrame(scanFrame)}catch(e){$("#camMsg").textContent="Kameru/QR sa nepodarilo spustiť: "+e.message}};
document.querySelectorAll('input[name="gut"]').forEach(r=>r.onchange=()=>{$("#customGut").classList.toggle("hidden",document.querySelector('input[name="gut"]:checked').value!=="custom");checkGut()});document.querySelectorAll(".glen").forEach(x=>x.oninput=checkGut);function checkGut(){let s=[...document.querySelectorAll(".glen")].reduce((a,x)=>a+(+x.value||0),0),n=11992;$("#gcheck").innerHTML=s===n?'<span class="ok">Súčet sedí.</span>':`<span class="bad">Súčet ${s}; požadované ${n}; rozdiel ${n-s}.</span>`}
function evalJob(){return D.famus.map(x=>{let p=findP(x.code),n=x.length*x.qty,a=(p?p.length*p.qty:0)+C.filter(c=>c.code===x.code&&c.status==="DOSTUPNÝ").reduce((s,c)=>s+c.length*c.qty,0);return[x.code,x.name,(n/1000).toFixed(2),(a/1000).toFixed(2),a>=n?"OK":"NEDOSTATOK"]})}
$("#evaluate").onclick=()=>{if(document.querySelector('input[name="gut"]:checked').value==="custom"&&[...document.querySelectorAll(".glen")].reduce((a,x)=>a+(+x.value||0),0)!==11992)return alert("Vlastné dĺžky žľabu nemajú správny súčet.");let r=evalJob();$("#evaluation").innerHTML='<h3>Kontrola dostupnosti</h3><div class="scroll"><table><tr><th>Profil</th><th>Názov</th><th>Potrebné bm</th><th>Dostupné bm</th><th>Stav</th></tr>'+r.map(x=>`<tr><td>${x[0]}</td><td>${x[1]}</td><td>${x[2]}</td><td>${x[3]}</td><td class="${x[4]==="OK"?"ok":"bad"}">${x[4]}</td></tr>`).join('')+'</table></div><div class="actions"><button id="genPrint">Vytvoriť výrobný list</button></div>';$("#genPrint").onclick=makePrint};


let famusReserved=false;
function famusAudit(){
 return D.famus.map(x=>{
  let p=findP(x.code);
  let whole=p?(p.length*p.qty):0;
  let cuts=C.filter(z=>z.code===x.code&&z.status==="DOSTUPNÝ").reduce((s,z)=>s+z.length*z.qty,0);
  let need=x.length*x.qty, available=whole+cuts;
  return {code:x.code,name:x.name,length:x.length,qty:x.qty,need,available,ok:available>=need};
 });
}
function renderFamusAudit(){
 let r=famusAudit(), missing=r.filter(x=>!x.ok);
 $("#evaluation").innerHTML='<h3>Kontrola skladu – FAMUS pergola</h3><div class="'+(missing.length?"warn":"note")+'"><b>'+(missing.length?"Materiál nie je kompletný.":"Materiál podľa základnej kontroly postačuje.")+'</b></div><div class="scroll"><table><tr><th>Profil</th><th>Názov</th><th>Požadované</th><th>Potrebné bm</th><th>Dostupné bm</th><th>Stav</th></tr>'+r.map(x=>'<tr><td>'+x.code+'</td><td>'+x.name+'</td><td>'+x.qty+' × '+x.length+' mm</td><td>'+(x.need/1000).toFixed(2)+'</td><td>'+(x.available/1000).toFixed(2)+'</td><td class="'+(x.ok?'ok':'bad')+'">'+(x.ok?'OK':'CHÝBA')+'</td></tr>').join('')+'</table></div><div class="actions"><button id="genPrint">Vytvoriť výrobný list</button></div>';
 if($("#genPrint"))$("#genPrint").onclick=makePrint;
 return r;
}



function famusPieces(){
 const out=[];
 for(const x of D.famus){
   if(x.length<=7500){for(let i=0;i<x.qty;i++)out.push({code:x.code,length:x.length})}
   else if(x.code==="W.2309"){for(let i=0;i<x.qty;i++)[4000,4000,3992].forEach(v=>out.push({code:x.code,length:v}))}
   else if(x.code==="W.2306"){for(let i=0;i<x.qty;i++)[5996,5996].forEach(v=>out.push({code:x.code,length:v}))}
   else if(x.code==="W.2307"){for(let i=0;i<x.qty;i++)[5996,5996].forEach(v=>out.push({code:x.code,length:v}))}
 }
 return out;
}
function planFamusReservation(){
 const plan=[], byCode={};
 for(const n of famusPieces())(byCode[n.code]||(byCode[n.code]=[])).push(n.length);
 for(const code in byCode){
   const p=findP(code);if(!p||!p.length)continue;
   const needs=byCode[code].sort((a,b)=>b-a);
   const cutBins=C.filter(z=>z.code===code&&z.status==="DOSTUPNÝ"&&z.qty>0).flatMap(z=>Array.from({length:z.qty},()=>({kind:"cut",cutId:z.id,remaining:z.length,used:false})));
   const barBins=[];
   for(const need of needs){
     let candidates=[...cutBins,...barBins].filter(b=>b.remaining>=need+5).sort((a,b)=>a.remaining-b.remaining);
     let bin=candidates[0];
     if(!bin&&barBins.length<p.qty){bin={kind:"bar",remaining:p.length,used:false};barBins.push(bin)}
     if(!bin||bin.remaining<need+5)continue;
     bin.remaining-=need+5;bin.used=true;
   }
   const usedCuts=cutBins.filter(b=>b.used);
   const cutCount={};for(const b of usedCuts)cutCount[b.cutId]=(cutCount[b.cutId]||0)+1;
   for(const id in cutCount)plan.push({job:"FAMUS pergola",code,kind:"cut",cutId:id,qty:cutCount[id]});
   const bars=barBins.filter(b=>b.used).length;if(bars)plan.push({job:"FAMUS pergola",code,kind:"bar",qty:bars});
 }
 return plan;
}
$("#reserveFamus").onclick=()=>{
 if(famusReserved)return alert("FAMUS pergola je už rezervovaná.");
 const audit=renderFamusAudit(), missing=audit.filter(x=>!x.ok);
 if(missing.length&&!confirm("Niektoré profily chýbajú. Rezervovať dostupný materiál aj napriek tomu?"))return;
 const plan=planFamusReservation();for(const r of plan)R.push(r);
 famusReserved=true;
 H.unshift({id:Date.now()+"-FAMUS",time:new Date().toLocaleString("sk-SK"),type:"REZERVÁCIA PRE VÝROBU",code:"FAMUS-PERGOLA",color:"—",qty:1,length:"—",job:"FAMUS pergola",cancelled:false,effect:{kind:"reservation"}});
 $("#reserveFamus").textContent="Rezervované ✓";$("#reserveFamus").disabled=true;
 render();renderFamusAudit();
 $("#evaluation").insertAdjacentHTML("afterbegin",'<div class="note"><b>FAMUS rezervované podľa rezacieho plánu.</b> Odrezky sa využívajú pred celými tyčami a z jednej celej tyče sa môže narezať viac dielov.</div>');
};

const DUBNICA_REQ=[
 {code:"W.6216",label:"Bočný profil",need:70,unit:"ks",length:1429},
 {code:"W.6218",label:"Koľajnica",need:70,unit:"dielov",length:3330,note:"35 horných vcelku + 35 spodných max. 2 diely"},
 {code:"W.6518",label:"Kompenzačný profil",need:35,unit:"ks",length:3330},
 {code:"W.4919",label:"Zasklievací profil 6 mm",need:350,unit:"rezov",length:635,approx:true},
 {code:"W.6244.00.00.05.000.12",label:"Side column equipment",need:140,unit:"ks"},
 {code:"W.6226.03.SO.05.000.01",label:"Krytka ľavá krajná",need:70,unit:"ks"},
 {code:"W.6226.04.SA.05.000.01",label:"Krytka pravá krajná",need:70,unit:"ks"},
 {code:"W.6227.05.SO.05.000.01",label:"Krytka ľavá",need:280,unit:"ks"},
 {code:"W.6227.06.SA.05.000.01",label:"Krytka pravá",need:280,unit:"ks"},
 {code:"W.6224.00.AL.05.000.01",label:"Vjazd spodný",need:35,unit:"ks"},
 {code:"W.6294.01.00.00.000.12",label:"Kolieska",need:350,unit:"ks"},
 {code:"W.6293.01.00.00.000.12",label:"Kolieska s límcom",need:280,unit:"ks"},
 {code:"W.6222.00.00.02.000.12",label:"Parkovisko",need:35,unit:"ks"},
 {code:"W.6248.03.00.05.000.12",label:"W.6248 set",need:35,unit:"ks"},
 {code:"W.6265.45.01.05.000.01",label:"Hrebeň / stopper",need:35,unit:"ks"},
 {code:"W.6247.00.00.02.000.12",label:"Kľučka",need:35,unit:"ks"},
 {code:"W.6401.06.00.SF.300.04",label:"Glass Seal 6 mm",need:140,unit:"ks"}
];
let dubnicaReserved=false;
function stockMatch(code){return P.filter(x=>x.code===code)}
function dubnicaAudit(){
 return DUBNICA_REQ.map(r=>{
  const rows=stockMatch(r.code), p=rows[0], qty=rows.reduce((s,x)=>s+(x.qty||0),0);
  let available=qty, ok=false, display=qty;
  if(r.length&&p&&p.length&&["W.6216","W.6518"].includes(r.code)){
    available=Math.floor((qty*p.length)/(r.length+5));display=available;ok=available>=r.need;
  }else if(r.code==="W.6218"){
    const bars=qty, cut1930=C.filter(x=>x.code==="W.6218"&&x.status==="DOSTUPNÝ").reduce((s,x)=>s+x.qty,0);
    display=bars+" tyčí + "+cut1930+" odrezkov";ok=bars>=35;
  }else if(r.code==="W.4919"&&p){
    available=Math.floor((qty*p.length)/(r.length+5));display=available+" rezov orientačne";ok=available>=r.need;
  }else ok=available>=r.need;
  return {...r,available,display,ok};
 })
}
function renderDubnica(){
 const a=dubnicaAudit(), missing=a.filter(x=>!x.ok);
 $("#dubnicaResult").innerHTML='<div class="'+(missing.length?"warn":"note")+'"><b>'+(missing.length?"Materiál nie je kompletný.":"Materiál podľa kontroly postačuje.")+'</b></div><div class="scroll"><table><tr><th>Kód</th><th>Položka</th><th>Potrebujeme</th><th>Dostupné</th><th>Stav</th></tr>'+a.map(x=>'<tr><td>'+safe(profileDisplay(x.code,x.label))+'</td><td>'+x.label+(x.note?'<br><span class="muted">'+x.note+'</span>':'')+'</td><td>'+x.need+' '+x.unit+'</td><td>'+x.display+'</td><td class="'+(x.ok?'ok':'bad')+'">'+(x.ok?'OK':'CHÝBA')+'</td></tr>').join('')+'</table></div>';
 return a;
}
function profileAlternatives(code,color){
 const base=String(code).match(/^W\.\d+/)?.[0]||String(code);
 return P.filter(x=>(x.profileCode||x.code)!==code&&((x.profileCode||x.code).match(/^W\.\d+/)?.[0]||"")===base&&x.qty-reservedFor(x.code)>0)
 .filter(x=>!color||x.color!==color||(x.profileCode||x.code)!==code);
}
function alternativeLabel(code,color){
 const alternatives=profileAlternatives(code,color);
 if(!alternatives.length)return "";
 return '<span style="background:#fff2a8;color:#604600;padding:3px 6px;border-radius:3px;display:inline-block;font-weight:600">Alternatíva na sklade: '+alternatives.map(x=>safe(profileDisplay(x.profileCode||x.code))+' · '+safe(x.color)+' · '+(x.qty-reservedFor(x.code))+' ks × '+x.length+' mm').join("; ")+' — overiť zameniteľnosť / povrchovú úpravu</span>';
}
function checkMarkizyWarehouse(){
 const requests=[
  {code:"W.6033.00.00.PS.650.28",label:"Spodný 3-koľajový",cuts:[2630,1710]},
  {code:"W.6043.00.00.PS.650.28",label:"Horný 3-koľajový",cuts:[2630,1710]},
  {code:"W.6013.00.00.PS.650.28",label:"Bočný doraz",cuts:[2480,2480,2480,2480]},
  {code:"W.6010.00.00.PS.650.28",label:"Profil ku sklu 10 mm",cuts:[857,857,857,550.3,550.3,550.3]}
 ];
 let good=0;const rows=requests.map(r=>{
  const stock=P.filter(x=>(x.profileCode||x.code)===r.code&&x.color==="Surová"&&x.qty>0);
  const available=stock.map(x=>({code:x.code,length:x.length,qty:Math.max(0,x.qty-reservedFor(x.code)),color:x.color}));
  const plan=packFrameOptimized(r.cuts,available,5);
  const offcuts=C.filter(x=>x.code===r.code&&x.color==="Surová"&&x.status==="DOSTUPNÝ");
  if(!plan.missing.length)good++;
  return '<tr><td>'+safe(profileDisplay(r.code,r.label))+'</td><td>'+safe(r.label)+'</td><td>'+r.cuts.join(" + ")+' mm</td><td>'+available.reduce((s,x)=>s+x.qty,0)+' ks tyčí'+(offcuts.length?' + '+offcuts.length+' odrezok/odrezky':'')+'</td><td>'+(plan.missing.length?'CHÝBA '+plan.missing.length+' rezov'+(alternativeLabel(r.code,'Surová')?'<div>'+alternativeLabel(r.code,'Surová')+'</div>':''):'OK · '+plan.bars.length+' tyč/tyče')+'</td></tr>';
 }).join("");
 const el=$("#markizyStockResult");
 el.innerHTML='<div class="note"><b>Kontrola profilov: '+good+'/4 typov dostupných.</b> Výpočet používa celé tyče, rezervácie a rez 5 mm; odrezky zobrazuje informatívne, nezapočítava ich do návrhu rezania.</div><div class="scroll"><table><tr><th>Kód</th><th>Profil</th><th>Požadované rezy</th><th>Sklad</th><th>Výsledok</th></tr>'+rows+'</table></div><p class="muted">Pozor: W.6033.PS z výrobného listu nie je totožný s W.6033.EL na sklade. Žlto označené alternatívy sú návrh na použitie, nie automaticky schválená náhrada. Sklo, kovanie a tesnenia nie sú overené. Bez odpisu a rezervácie.</p>';
}
$("#checkMarkizy").onclick=checkMarkizyWarehouse;
$("#checkDubnica").onclick=renderDubnica;
$("#reserveDubnica").onclick=()=>{
 if(dubnicaReserved)return alert("Teraska Dubnica je už rezervovaná.");
 const a=renderDubnica(), missing=a.filter(x=>!x.ok);
 if(missing.length&&!confirm("Niektoré položky chýbajú. Rezervovať dostupný materiál aj napriek tomu?"))return;
 dubnicaReserved=true;
 for(const x of a){let p=findP(x.code);if(!p)continue;let rq;if(x.unit==="ks")rq=Math.min(p.qty,x.need);else if(x.length&&p.length)rq=Math.min(p.qty,Math.ceil((x.need*x.length)/p.length));else rq=0;if(rq>0)R.push({job:"Teraska Dubnica",code:x.code,qty:rq});}
 H.unshift({id:Date.now()+"-RES",time:new Date().toLocaleString("sk-SK"),type:"REZERVÁCIA PRE VÝROBU",code:"TERASKA-DUBNICA",color:"—",qty:35,length:"—",job:"Teraska Dubnica",cancelled:false,effect:{kind:"reservation"}});
 $("#reserveDubnica").textContent="Rezervované ✓";$("#reserveDubnica").disabled=true;
 $("#dubnicaResult").insertAdjacentHTML("afterbegin",'<div class="note"><b>Rezervácia vytvorená.</b> Materiál je označený pre zákazku Teraska Dubnica. V prototype zatiaľ nemení fyzický stav skladu.</div>');
 render();
};

function makePrint(){let g=document.querySelector('input[name="gut"]:checked').value==="custom"?[...document.querySelectorAll(".glen")].map(x=>+x.value):[4000,4000,3992];$("#printBody").innerHTML=D.famus.map(x=>`<h3>${x.code} – ${x.name}</h3><p>${x.qty} × ${x.length} mm</p>`).join('')+`<h3>W.2309 – delenie žľabu</h3><p>${g.join(" + ")} mm</p>`;show("print")}
let onlineOrders=[],editingOrder=-1,submittedOrders=[];
const sysOpts=[["2","2D"],["3","3D"],["4","4D"],["5","5D"],["6","6D"],["22","2D+2D"],["33","3D+3D"],["44","4D+4D"],["55","5D+5D"],["66","6D+6D"]];
const sideOpts=[["Ľavá","Zľava doprava","→"],["Pravá","Sprava doľava","←"],["Od stredu","Od stredu do strán","← →"]];
const glassOpts=["4 mm","6 mm","VSG 33.1"], variants=["Číre","Mliečne","Sivé","Bronzové","Viac možností"];
const colorOpts=[["RAL 7016","#555f69"],["RAL 9005","#111827"],["RAL 9016","#f4f5f6"],["RAL 9006","#adb3bc"],["Antracit DB 703","#626971"],["Iná RAL","conic-gradient(red,yellow,lime,aqua,blue,magenta,red)"]];
function panelIcon(n){let cnt=n>10?(+String(n)[0])+(+String(n)[1]):+n, div=n>10?+String(n)[0]:0,s='<i class="miniFrame">';for(let i=0;i<cnt;i++)s+='<i class="miniPanel '+(div&&i===div?'split':'')+'"></i>';return s+'</i>'}
function cards(el,arr,val,fn,render){$(el).innerHTML=arr.map(x=>{let v=Array.isArray(x)?x[0]:x,l=Array.isArray(x)?x[1]:x;return '<button type="button" class="pick '+(String(v)===String(val)?'selected':'')+'" data-v="'+v+'">'+(render?render(x):l)+'</button>'}).join("");document.querySelectorAll(el+" .pick").forEach(b=>b.onclick=()=>fn(b.dataset.v))}
function syncCards(){
 cards("#systemCards",sysOpts,$("#ordD").value,v=>{$("#ordD").value=v;syncCards();drawOrderPreview()},x=>panelIcon(+x[0])+'<b>'+x[1]+'</b>');
 cards("#sideCards",sideOpts,$("#ordSide").value,v=>{$("#ordSide").value=v;syncCards();drawOrderPreview()},x=>panelIcon(+$("#ordD").value)+'<span class="dir">'+x[2]+'</span><b>'+x[1]+'</b>');
 cards("#glassCards",glassOpts,$("#ordGlass").value,v=>{$("#ordGlass").value=v;syncCards();drawOrderPreview()},x=>'<b>'+x+'</b>');
 $("#variantLabel").textContent="Variant skla ("+$("#ordGlass").value+")";
 cards("#variantCards",variants,$("#ordGlassVariant").value,v=>{$("#ordGlassVariant").value=v;syncCards();drawOrderPreview()},x=>'<i class="glassSwatch '+x.replace(" ","").toLowerCase()+'"></i><b>'+x+'</b>');
 cards("#colorCards",colorOpts,$("#ordColor").value,v=>{$("#ordColor").value=v;syncCards();drawOrderPreview()},x=>'<i class="colorDot" style="background:'+x[1]+'"></i><b>'+x[0]+'</b>');
}
function sysLabel(d){return d>10?String(d)[0]+"D+"+String(d)[1]+"D":d+"D"}
function drawOrderPreview(){
 const d=+$("#ordD").value,w=+$("#ordW").value,h=+$("#ordH").value,side=$("#ordSide").value,color=$("#ordColor").value==="Iná RAL"?($("#ordRal").value||"Iná RAL"):$("#ordColor").value;
 let panelCount=d>10?(+String(d)[0])+(+String(d)[1]):d,panels="",arrow=side==="Ľavá"?"→":side==="Pravá"?"←":"↔";
 for(let i=1;i<=panelCount;i++)panels+='<div class="glassPanel"><span>'+i+'</span><div class="arrow">'+arrow+'</div></div>';
 $(".heroPreview").classList.toggle("balconyScene",h<=1800);$(".heroPreview").classList.toggle("fullHeightScene",h>1800);$("#framePreview").innerHTML=panels;$("#heroW").textContent=w+" mm";$("#heroH").textContent=h+" mm";$("#heroType").textContent=sysLabel(d);$("#heroColor").textContent="● "+color;
 $("#orientationPreview").innerHTML=sideOpts.map(x=>'<div class="oriMini '+(x[0]===side?'selected':'')+'">'+panelIcon(d)+'<span>'+x[2]+'</span><b>'+x[1]+'</b></div>').join("");
 $("#customRalWrap").classList.toggle("hidden",$("#ordColor").value!=="Iná RAL");
 let glass=$("#ordGlass").value+" – "+$("#ordGlassVariant").value;
 $("#orderSummary").innerHTML='<h3>Rámové zasklenie '+sysLabel(d)+'</h3><p>Rozmer <b>'+w+' × '+h+' mm</b></p><p>Sklo <b>'+glass+'</b></p><p>Farba <b>'+color+'</b></p><p>Teleskop <b>'+$("#ordComp").value+'</b></p><p>Obojstranné madlo <b>'+$("#ordFix").value+'</b></p><p>Počet <b>'+$("#ordQty").value+' ks</b></p>';
}
["ordW","ordH","ordGlassVariant","ordComp","ordFix","ordRal","ordQty"].forEach(id=>$("#"+id).addEventListener("input",drawOrderPreview));
function currentOnlineOrder(){return{name:$("#ordName").value,pos:$("#ordPos").value,w:+$("#ordW").value,h:+$("#ordH").value,d:+$("#ordD").value,glass:$("#ordGlass").value+" – "+$("#ordGlassVariant").value,side:$("#ordSide").value,comp:$("#ordComp").value,fix:$("#ordFix").value,color:$("#ordColor").value==="Iná RAL"?($("#ordRal").value||"Iná RAL"):$("#ordColor").value,qty:+$("#ordQty").value||1}}
function renderOnlineOrders(){$("#orderList").innerHTML=onlineOrders.length?'<table><tr><th>Poz.</th><th>Systém</th><th>Rozmer</th><th>Sklo</th><th>Orientácia</th><th>Farba</th><th>Ks</th><th>Akcia</th></tr>'+onlineOrders.map((x,i)=>'<tr><td>'+x.pos+'</td><td>'+sysLabel(x.d)+'</td><td>'+x.w+' × '+x.h+'</td><td>'+x.glass+'</td><td>'+x.side+'</td><td>'+x.color+'</td><td>'+x.qty+'</td><td><button class="gray editOrder" data-i="'+i+'">✏️</button> <button class="gray copyOrder" data-i="'+i+'">📋</button> <button class="gray deleteOrder" data-i="'+i+'">🗑️</button></td></tr>').join("")+'</table>':'<span class="muted">Zatiaľ nebol pridaný žiadny systém.</span>';setTimeout(()=>{document.querySelectorAll(".editOrder").forEach(b=>b.onclick=()=>loadOnlineOrder(+b.dataset.i));document.querySelectorAll(".copyOrder").forEach(b=>b.onclick=()=>copyOnlineOrder(+b.dataset.i));document.querySelectorAll(".deleteOrder").forEach(b=>b.onclick=()=>deleteOnlineOrder(+b.dataset.i))},0)}
function copyOnlineOrder(i){let x=onlineOrders[i];if(x){onlineOrders.push({...x,pos:String(onlineOrders.length+1)});renderOnlineOrders()}}
function deleteOnlineOrder(i){if(confirm("Odstrániť tento systém?")){onlineOrders.splice(i,1);renderOnlineOrders()}}
function loadOnlineOrder(i){let x=onlineOrders[i];if(!x)return;editingOrder=i;$("#ordPos").value=x.pos;$("#ordW").value=x.w;$("#ordH").value=x.h;$("#ordD").value=x.d;let gp=x.glass.split(" – ");$("#ordGlass").value=gp[0];$("#ordGlassVariant").value=gp[1]||"Číre";$("#ordSide").value=x.side;$("#ordComp").value=x.comp;$("#ordFix").value=x.fix;$("#ordQty").value=x.qty;let std=colorOpts.map(x=>x[0]);if(std.includes(x.color))$("#ordColor").value=x.color;else{$("#ordColor").value="Iná RAL";$("#ordRal").value=x.color}$("#addOrder").textContent="✓ ULOŽIŤ ZMENY";syncCards();drawOrderPreview();show("orders")}
$("#addOrder").onclick=()=>{let x=currentOnlineOrder();if(editingOrder>=0){onlineOrders[editingOrder]=x;editingOrder=-1;$("#addOrder").textContent="🛒 + PRIDAŤ DO OBJEDNÁVKY"}else{onlineOrders.push(x);$("#ordPos").value=String(onlineOrders.length+1)}renderOnlineOrders()};
function loadMainTest(){
 if(onlineOrders.length&&!confirm("Nahradiť aktuálne rozpracované položky šiestimi pozíciami hlavného testu?"))return;
 const widths=[3600,4600,3300,4900,4650,3750];
 onlineOrders=widths.map((w,i)=>({name:"Hlavný test optimalizácie",pos:String(i+1),w,h:1500,d:4,glass:"4 mm – Číre",side:"Ľavá",comp:i>=4?"Áno":"Nie",fix:"Nie",color:"RAL 9016",qty:1}));
 editingOrder=-1;
 $("#ordName").value="Hlavný test optimalizácie";
 $("#ordPos").value="7";
 $("#addOrder").textContent="🛒 + PRIDAŤ DO OBJEDNÁVKY";
 renderOnlineOrders();
 loadOnlineOrder(0);
 editingOrder=-1;
 $("#ordPos").value="7";
 $("#addOrder").textContent="🛒 + PRIDAŤ DO OBJEDNÁVKY";
 $("#orderMsg").innerHTML='<div class="note">Načítaných 6 testovacích pozícií. Môžeš ich upraviť, pridať ďalšie alebo odoslať ako novú testovaciu objednávku.</div>';
}
$("#loadMainTest").onclick=loadMainTest;
$("#duplicateOrder").onclick=()=>{$("#ordPos").value=String(onlineOrders.length+1)};

const safe=s=>String(s??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
const totalUnits=o=>o.items.reduce((a,x)=>a+(Number(x.qty)||0),0);
const orderStages=["Odoslaná","Potvrdená","Vo výrobe","Pripravená"];
function positionDrawing(x){let d=Number(x.d),n=d>10?Number(String(d)[0])*2:d,half=d>10?n/2:0,arrow=x.side==="Pravá"?"←":x.side==="Od stredu"?"↔":"→";
return '<div class="v7drawing">'+Array.from({length:n},(_,j)=>'<div class="v7pane '+(half&&j===half?'v7split':'')+'"><small>'+ (j+1) +'</small><b>'+arrow+'</b></div>').join("")+'</div>'}
const shipmentEvents=[];
function shipStatus(o){return o.shipStage===2?"Doručená":o.shipStage===1?"Na ceste":"Pripravená"}
function shipmentParts(o){
 const lines=[];
 o.items.forEach(x=>{
  const p=calcProduction(x),q=Number(x.qty);
  lines.push(["Pozícia "+x.pos+" · horná "+p.rail+"-koľajová",Number(x.w),q]);
  lines.push(["Pozícia "+x.pos+" · spodná "+p.rail+"-koľajová",Number(x.w),q]);
  lines.push(["Pozícia "+x.pos+" · doraz",p.eff-17,2*q]);
  if(p.dual)lines.push(["Pozícia "+x.pos+" · stredový doraz",p.vert,q]);
  lines.push(["Pozícia "+x.pos+" · hotové krídlo",null,p.n*q]);
 });
 return lines;
}
const packageScans=new Set();
function packagesFor(o){
 const all=[];
 o.items.forEach(x=>{
  const p=calcProduction(x);
  for(let system=1;system<=Number(x.qty);system++){
   const base=o.id+"-P"+String(x.pos).padStart(2,"0")+"-S"+String(system).padStart(3,"0");
   for(let wing=1;wing<=p.n;wing++)all.push({id:base+"-K"+wing,order:o.id,pos:x.pos,system,kind:"Krídlo "+wing+" / "+p.n,x});
   all.push({id:base+"-PROF",order:o.id,pos:x.pos,system,kind:"Profily systému",x});
  }
 });
 return all;
}
function packageRows(pkg){
 if(!pkg.kind.startsWith("Profily"))return "Hotové "+pkg.kind;
 const p=calcProduction(pkg.x);
 return "Horná "+p.rail+"-koľajová: 1 ks, "+pkg.x.w+" mm; spodná: 1 ks, "+pkg.x.w+" mm; doraz: 2 ks, "+fmtMm(p.eff-17)+" mm"+(p.dual?"; stredový doraz: 1 ks":"");
}
function scanPackageV86(i){
 const o=submittedOrders[i],code=prompt("Zadaj alebo naskenuj identifikátor QR balenia:");
 if(!code)return;
 const pkg=packagesFor(o).find(p=>p.id===code.trim());
 if(!pkg)return alert("QR nepatrí k tejto zákazke.");
 if(packageScans.has(pkg.id))return alert("Balenie už bolo zaznamenané.");
 if(!confirm(pkg.id+"\\n"+packageRows(pkg)+"\\nPotvrdiť nakládku?"))return;
 packageScans.add(pkg.id);renderShipped();openShipment(i);
}
function printPackageLabels(i){
 const o=submittedOrders[i],pkgs=packagesFor(o);
 const labels=pkgs.map(p=>{
  const isWing=p.kind.startsWith("Krídlo");
  const wingNumber=isWing?String(p.kind.match(/[0-9]+/)[0]):"";
  const shortCode="P"+String(p.pos).padStart(2,"0")+(isWing?"-K"+wingNumber:"-PROF");
  const title=isWing?"KRÍDLO "+wingNumber+" / "+calcProduction(p.x).n:"PROFILY SYSTÉMU";
  return '<article class="label"><div class="top"><b>LANGAS</b><span>'+safe(title)+'</span></div><div class="body"><div class="left"><div>'+safe(o.id)+'</div><div>'+safe(o.name)+'</div><strong>'+sysLabel(p.x.d)+' · '+safe(p.x.w)+' × '+safe(p.x.h)+'</strong><div>'+safe(p.x.color)+' · '+safe(p.x.glass)+'</div></div><div class="middle"><b>'+safe(shortCode)+'</b><span>'+(isWing?"KRÍDLO":"PROFILY")+'</span></div><div class="qr"><img src="'+v7QrImage("LANGAS|PKG|"+p.id)+'" alt="QR"></div></div></article>';
 }).join("");
 const css='@page{size:100mm 50mm;margin:0}*{box-sizing:border-box}html,body{margin:0;padding:0;background:white;color:#111;font-family:Arial,sans-serif}.label{width:100mm;height:50mm;padding:2.2mm;border:0.3mm solid #333;display:flex;flex-direction:column;break-after:page;page-break-after:always;overflow:hidden}.label:last-child{break-after:auto;page-break-after:auto}.top{height:15mm;display:flex;align-items:center;justify-content:space-between;border-bottom:.2mm solid #333;flex-shrink:0}.top b{font-size:14pt}.top span{font-size:9pt}.body{display:grid;grid-template-columns:51% 31% 18%;align-items:center;flex:1;min-height:0}.left{font-size:8.5pt;line-height:1.6;white-space:nowrap}.left strong{display:block;font-size:9pt}.middle{display:flex;flex-direction:column;gap:2mm;font-size:9pt}.middle span{font-size:8pt}.qr img{width:14mm;height:14mm;display:block}';
 const win=window.open("","_blank");
 if(!win){alert("Povoľ v prehliadači otváranie okien pre tlač etikiet.");return}
 win.document.open();
 win.document.write('<!doctype html><html lang="sk"><head><meta charset="utf-8"><title>LANGAS · Etikety '+safe(o.id)+'</title><style>'+css+'</style></head><body>'+labels+'</body></html>');
 win.document.close();
 win.onload=()=>{Promise.all(Array.from(win.document.images).map(img=>img.complete?Promise.resolve():new Promise(resolve=>{img.onload=resolve;img.onerror=resolve}))).then(()=>win.print())};
}
function renderShipped(){
 const host=$("#shippedList");if(!host)return;
 const orders=submittedOrders.map((o,i)=>({o,i})).filter(x=>x.o.stage===3);
 host.innerHTML=orders.length?orders.map(({o,i})=>'<article class="v7order"><div class="v7head"><h3>'+safe(o.id)+' · '+safe(o.customer)+'</h3><strong>'+shipStatus(o)+'</strong></div><p>'+safe(o.name)+' · '+totalUnits(o)+' systémov</p><button class="shipOpen" data-i="'+i+'">Detail expedície</button><div id="shipDetail-'+i+'"></div></article>').join(""):'<p class="muted">Zatiaľ nie sú žiadne zákazky pripravené na expedíciu. Dokonči výrobu a potvrď pripravenosť.</p>';
 host.querySelectorAll(".shipOpen").forEach(b=>b.onclick=()=>openShipment(+b.dataset.i));
}
function openShipment(i){
 const o=submittedOrders[i],el=$("#shipDetail-"+i);if(!el)return;
 const rows=shipmentParts(o).map(v=>'<tr><td>'+safe(v[0])+'</td><td>'+(v[1]===null?"—":fmtMm(v[1])+" mm")+'</td><td>'+v[2]+' ks</td></tr>').join("");
 const events=shipmentEvents.filter(e=>e.id===o.id);const pkgs=packagesFor(o),scanned=pkgs.filter(p=>packageScans.has(p.id)).length;
 el.innerHTML='<h3>Odovzdanie a doručenie</h3><p><b>Objednávka:</b> '+safe(o.id)+' · '+safe(o.time)+' · '+safe(o.name)+'</p><table><tr><th>Položka</th><th>Dĺžka</th><th>Počet</th></tr>'+rows+'</table><h3>História expedície</h3>'+ (events.length?events.map(e=>'<p>✓ '+safe(e.type)+' · '+safe(e.actor)+' · '+safe(e.when)+' · '+safe(e.note)+'</p>').join(""):'<p>Pripravená na expedíciu, čaká na prevzatie.</p>')+
 '<h3>QR balenia: '+scanned+' / '+pkgs.length+'</h3><p>'+pkgs.filter(p=>!packageScans.has(p.id)).map(p=>safe(p.kind)+' · '+safe(p.id)).join('<br>')+'</p><div class="actions"><button class="shipScanPackage">Načítať QR balenia</button></div><label>Pracovník / preberajúci (test)<input id="shipActor-'+i+'" placeholder="Meno pracovníka"></label><label>Poznámka<input id="shipNote-'+i+'" placeholder="Voliteľná poznámka"></label><div class="actions"><button class="shipHandoff" '+(o.shipStage?'disabled':'')+'>Potvrdiť prevzatie zo skladu</button><button class="shipDelivered" '+(o.shipStage!==1?'disabled':'')+'>Potvrdiť vykládku / doručenie</button><button class="shipPrint">Expedičný / dodací list</button></div><p class="muted">Test: identita je ručne zadaná, nejde o elektronický podpis. Čiastočné doručenie zatiaľ nie je podporované.</p>';
 const event=(type,next)=>{if(next===1&&scanned!==pkgs.length)return alert("Pred prevzatím naskenuj všetky balenia.");
  const actor=$("#shipActor-"+i).value.trim(),note=$("#shipNote-"+i).value.trim();
  if(!actor)return alert("Zadaj meno pracovníka.");
  if(!confirm("Potvrdiť: "+type+" · "+actor+"?"))return;
  shipmentEvents.push({id:o.id,type,actor,note,when:new Date().toLocaleString("sk-SK")});
  o.shipStage=next;renderShipped();openShipment(i);
 };
 el.querySelector(".shipHandoff").onclick=()=>event("Prevzaté zo skladu",1);
 el.querySelector(".shipDelivered").onclick=()=>event("Doručené / vyložené",2);
 el.querySelector(".shipPrint").onclick=()=>printShipment(i);el.querySelector(".shipScanPackage").onclick=()=>scanPackageV86(i);
}
function printShipment(i){
 const o=submittedOrders[i],rows=shipmentParts(o).map(v=>'<tr><td>'+safe(v[0])+'</td><td>'+(v[1]===null?"—":fmtMm(v[1])+" mm")+'</td><td>'+v[2]+' ks</td></tr>').join("");
 $("#v7PrintArea").innerHTML='<div class="v7production"><h1>LANGAS · '+(o.customer==="XY"?"DODACÍ LIST / EXPEDIČNÝ LIST (TEST)":"EXPEDIČNÝ LIST")+'</h1><p>'+safe(o.id)+' · '+safe(o.name)+' · '+safe(o.customer)+'</p><p>Dátum objednávky: '+safe(o.time)+'</p><table><tr><th>Položka</th><th>Dĺžka</th><th>Počet</th></tr>'+rows+'</table><p>Odovzdal: __________________ Prevzal: __________________</p><p>Testovací dokument bez cien a príslušenstva.</p></div>';window.print();
}
function renderNewOrders(){
 $("#newOrderBadge").textContent=submittedOrders.filter(o=>o.stage===0).length||"";
 $("#newOrdersList").innerHTML=submittedOrders.length?submittedOrders.map((o,i)=>'<article class="v7order"><div class="v7head"><div><h3>'+safe(o.id)+' · '+safe(o.customer)+'</h3><p>'+safe(o.name)+' · '+safe(o.time)+'</p></div><strong>'+orderStages[o.stage]+'</strong></div><p>'+o.items.length+' pozícií · '+totalUnits(o)+' systémov · Hotové '+o.items.reduce((a,x)=>a+(x.done||0),0)+' / '+totalUnits(o)+'</p><button type="button" class="v7open" data-i="'+i+'">Otvoriť objednávku</button><div class="v7details hidden" id="v7detail-'+i+'"></div></article>').join(""):'<p class="muted">Žiadne nové objednávky v tomto prehliadači.</p>';
 document.querySelectorAll(".v7open").forEach(b=>b.onclick=()=>openV7(+b.dataset.i));
}
function v7QrPayload(o,x){return "LANGAS|JOB|"+o.id+"|"+x.pos}
function v7QrImage(payload){return "https://api.qrserver.com/v1/create-qr-code/?size=150x150&data="+encodeURIComponent(payload)}
function v7QrScan(payload){let parts=payload.trim().split("|");if(parts.length!==4||parts[0]!=="LANGAS"||parts[1]!=="JOB"){alert("Toto nie je QR zákazky LANGAS.");return}let i=submittedOrders.findIndex(o=>o.id===parts[2]);if(i<0){alert("Zákazka nebola nájdená v tomto testovacom prehliadači.");return}let j=submittedOrders[i].items.findIndex(x=>String(x.pos)===parts[3]);if(j<0){alert("Pozícia nebola nájdená.");return}let o=submittedOrders[i],x=o.items[j];if(o.stage!==2){alert("Zákazka musí byť v stave Vo výrobe.");return}if(x.done>=x.qty){alert("Táto pozícia je už dokončená.");return}if(confirm("QR: "+o.id+" / pozícia "+x.pos+"\\nPotvrdiť dokončenie 1 ks?")){x.done++;renderNewOrders();openV7(i)}}
function openV7(i){const o=submittedOrders[i],el=$("#v7detail-"+i);el.classList.remove("hidden");
 el.innerHTML='<h3>Detail zákazky · '+safe(o.id)+'</h3><p><b>Odberateľ:</b> '+safe(o.customer)+' · <b>Zákazka:</b> '+safe(o.name)+' · <b>Dátum:</b> '+safe(o.time)+'</p><p><b>Stav:</b> '+orderStages[o.stage]+'</p>'+
 o.items.map((x,j)=>'<div class="v7position"><b>Pozícia '+safe(x.pos)+' · '+sysLabel(x.d)+' · '+safe(x.w)+' × '+safe(x.h)+' mm · '+safe(x.qty)+' ks</b>'+positionDrawing(x)+'<p>'+safe(x.glass)+' · '+safe(x.color)+' · '+safe(x.side)+' · Teleskop '+safe(x.comp)+' · Obojstranné madlo '+safe(x.fix)+'</p><p>Dokončené: '+(x.done||0)+' / '+x.qty+'</p><button type="button" class="v7productionBtn" data-i="'+i+'" data-j="'+j+'" '+(o.stage<1||!canMakeStandard(x)?'disabled':'')+'>📄 Výrobný list A4 (test 2D–6D)</button><button type="button" class="v7finish" data-i="'+i+'" data-j="'+j+'" '+(o.stage<2||x.done>=x.qty?'disabled':'')+'>✓ Dokončiť 1 ks (simulácia QR)</button></div>').join("")+
 '<div class="actions"><button class="v7confirm" data-i="'+i+'" '+(o.stage!==0?'disabled':'')+'>Potvrdiť objednávku</button><button class="v7start" data-i="'+i+'" '+(o.stage!==1?'disabled':'')+'>Začať výrobu</button><button class="v7ready" data-i="'+i+'" '+(o.stage!==2||o.items.some(x=>(x.done||0)<x.qty)?'disabled':'')+'>Pripravená na expedíciu</button><button class="v7print" data-i="'+i+'">Tlačiť súhrn / PDF</button><button class="v7allProduction" data-i="'+i+'" '+(o.stage<1?"disabled":"")+'>Výrobné listy – všetky pozície</button><button class="v7glassButton" data-i="'+i+'" '+(o.stage<1?"disabled":"")+'>Objednávka skla – všetky pozície</button><button class="v8cutPlan" data-i="'+i+'" '+(o.stage<1?"disabled":"")+'>Rezací plán zákazky (test)</button><button class="frameOptimizer" data-i="'+i+'" '+(o.stage<1?"disabled":"")+'>🔵 Nová optimalizácia rezania · V9.8</button><button class="frameStockCheck" data-i="'+i+'" '+(o.stage<1?"disabled":"")+'>Kontrola skladu – rámové</button><button class="v86ProductionLabels" data-i="'+i+'" '+(o.stage<1?"disabled":"")+'>🏷️ Tlačiť etikety pre výrobu</button></div><p class="muted">Objednávka skla je dostupná po potvrdení. E-mail sa zatiaľ neodosiela.</p>';
 el.querySelector(".v7confirm").onclick=()=>{o.stage=1;renderNewOrders();openV7(i)};
 el.querySelector(".v7start").onclick=()=>{o.stage=2;renderNewOrders();openV7(i)};
 el.querySelector(".v7ready").onclick=()=>{o.stage=3;o.shipStage=0;o.notice="Objednávka "+o.id+" je pripravená na vyzdvihnutie / expedíciu.";renderNewOrders();openV7(i);alert("Testovacia notifikácia pre XY: "+o.notice)};
 el.querySelector(".v7print").onclick=()=>printV7(i);el.querySelector(".v7allProduction").onclick=()=>productionAll(i);el.querySelector(".v7glassButton").onclick=()=>glassOrderV7(i);el.querySelector(".v8cutPlan").onclick=()=>cutPlanV8(i);el.querySelector(".frameStockCheck").onclick=()=>checkFrameStock(i);el.querySelector(".frameOptimizer").onclick=()=>openFrameOptimizer(i);el.querySelector(".v86ProductionLabels").onclick=()=>printPackageLabels(i);el.querySelectorAll(".v7productionBtn").forEach(b=>b.onclick=()=>productionStandard(+b.dataset.i,+b.dataset.j));
 el.querySelectorAll(".v7finish").forEach(b=>b.onclick=()=>{let x=o.items[+b.dataset.j];if(o.stage<2){alert("Najprv klikni Potvrdiť objednávku a potom Začať výrobu. Až následne môže QR potvrdiť dokončenie.");return}if(x.done>=x.qty){alert("Táto pozícia je už dokončená.");return}if(confirm("QR načítaný: "+o.id+" / pozícia "+x.pos+"\\nPotvrdiť dokončenie 1 ks?")){x.done++;renderNewOrders();openV7(i);let d=$("#v7detail-"+i);d.insertAdjacentHTML("afterbegin",'<div class="note">✓ QR simulácia: dokončenie pozície '+safe(x.pos)+' bolo zaznamenané.</div>')}});
}
const specs={2:[2,19],3:[3,27.3],4:[4,31.5],5:[5,34],6:[6,35.7],22:[4,19.8,2],33:[6,27.8,3],44:[8,31.9,4],55:[10,34.3,5],66:[12,36.2,6]};
function calcProduction(x){
 let s=specs[x.d],w=+x.w,h=+x.h;if(!s||w<=0||h<=0)throw Error("Neplatný systém alebo rozmer");
 let n=s[0],dual=!!s[2],eff=h-(x.comp==="Áno"?50:0),top=eff>2300,wing=w/n+s[1],vert=eff-33,hor=wing-88;
 let g=x.glass.split(" – ")[0],is4=g==="4 mm";if(!is4&&g!=="6 mm"&&g!=="VSG 33.1")throw Error("Nepodporované sklo");
 let gw=hor+(is4?8:13),gh=vert-(is4?92:87);if(Math.min(vert,hor,gw,gh)<=0)throw Error("Neplatné výrobné rozmery");
 let normal=top?0:(dual?2*n-4:2*n-2),both=x.fix==="Áno"?(dual?4:2):0;
 let handle=x.fix==="Áno"?(top?2*n-both:0):(top?2*n:(dual?4:2));
 let rail=dual?s[2]:n,split=rail===4&&w>7060;
 let brush=(vert*(normal+handle+both)+hor*4*n)/1000;
 let epdm=is4?2*(gw+gh)*n/1000:2*(hor+8+vert-92)*n/1000+0.044;
 return {n,dual,eff,wing,vert,hor,gw,gh,normal,handle,both,rail,split,brush,epdm,is4};
}
function canMakeStandard(x){try{calcProduction(x);return true}catch(e){return false}}
function fmtMm(v){return Number(v.toFixed(4)).toLocaleString("sk-SK",{maximumFractionDigits:4})}
function productionStandard(i,j){
 const o=submittedOrders[i],x=o?.items[j];if(!o||!x)return;if(o.stage<1)return alert("Najprv potvrď objednávku.");
 let p;try{p=calcProduction(x)}catch(e){return alert(e.message)}
 const rows=[[p.rail+"-koľajový profil",p.split?x.w/2:x.w,p.split?4:2],["Dorazový profil",p.eff-17,2],["Vertikálny profil",p.vert,p.normal],["Vertikálny profil s madlom",p.vert,p.handle],["Vertikálny profil s madlom obojstranne",p.vert,p.both],["Horizontálny profil",p.hor,p.n*2],["Stredový dorazový profil",p.vert,p.dual?1:0],["Teleskop 1 a 2",+x.w,x.comp==="Áno"?1:0]].filter(r=>r[2]);
 let tab=rows.map(r=>'<tr><td>'+safe(r[0])+'</td><td>'+fmtMm(+r[1])+'</td><td>'+r[2]+'</td></tr>').join("");
 let qr=v7QrPayload(o,x);
 $("#v7PrintArea").innerHTML='<div class="v7production"><h1>LANGAS · VÝROBNÝ LIST</h1><p><b>TESTOVACÍ VÝSTUP – OVERIŤ PRED VÝROBOU</b></p><p>'+safe(o.id)+' · Pozícia '+safe(x.pos)+' · '+safe(o.customer)+' · '+safe(o.name)+' · '+safe(o.time)+'</p><h2>'+sysLabel(x.d)+' · '+safe(x.w)+' × '+safe(x.h)+' mm · '+safe(x.qty)+' ks</h2><p>'+safe(x.glass)+' · '+safe(x.color)+' · Pohľad z interiéru · '+safe(x.side)+'</p>'+positionDrawing(x)+'<h3>Profily – na 1 systém</h3><table><tr><th>Profil</th><th>Rez mm</th><th>Ks</th></tr>'+tab+'</table><h3>Sklo</h3><p>'+fmtMm(p.gw)+' × '+fmtMm(p.gh)+' mm · '+p.n+' ks / systém</p><h3>Tesnenia a príslušenstvo</h3><p>EPDM '+fmtMm(p.epdm)+' bm · Kefka '+fmtMm(p.brush)+' bm · Kolieska '+p.n*2+' ks · Skrutky, podkovičky a krytky po '+p.n*4+' ks</p><img class="v7qr" src="'+v7QrImage(qr)+'"><p>'+safe(qr)+'</p><p>Vyrobil: ____________ Skontroloval: ____________</p></div>';window.print();
}
function productionAll(i){
 const o=submittedOrders[i];if(!o||o.stage<1)return alert("Najprv potvrď objednávku.");
 const pages=[];
 for(let j=0;j<o.items.length;j++){
  try{
   const x=o.items[j],p=calcProduction(x);
   const rows=[[p.rail+"-koľajový profil",p.split?x.w/2:x.w,p.split?4:2],["Dorazový profil",p.eff-17,2],["Vertikálny profil",p.vert,p.normal],["Vertikálny profil s madlom",p.vert,p.handle],["Vertikálny profil s madlom obojstranne",p.vert,p.both],["Horizontálny profil",p.hor,p.n*2],["Stredový dorazový profil",p.vert,p.dual?1:0],["Teleskop 1 a 2",+x.w,x.comp==="Áno"?1:0]].filter(r=>r[2]);
   const tab=rows.map(r=>"<tr><td>"+safe(r[0])+"</td><td>"+fmtMm(+r[1])+"</td><td>"+r[2]+"</td></tr>").join("");
   const qr=v7QrPayload(o,x);
   pages.push('<div class="v7production"><h1>LANGAS · VÝROBNÝ LIST</h1><p><b>TESTOVACÍ VÝSTUP – OVERIŤ PRED VÝROBOU</b></p><p>'+safe(o.id)+' · Pozícia '+safe(x.pos)+' · '+safe(o.customer)+' · '+safe(o.name)+' · '+safe(o.time)+'</p><h2>'+sysLabel(x.d)+' · '+safe(x.w)+' × '+safe(x.h)+' mm · '+safe(x.qty)+' ks</h2><p>'+safe(x.glass)+' · '+safe(x.color)+' · Pohľad z interiéru · '+safe(x.side)+'</p>'+positionDrawing(x)+'<h3>Profily – na 1 systém</h3><table><tr><th>Profil</th><th>Rez mm</th><th>Ks</th></tr>'+tab+'</table><h3>Sklo</h3><p>'+fmtMm(p.gw)+' × '+fmtMm(p.gh)+' mm · '+p.n+' ks / systém</p><h3>Tesnenia a príslušenstvo</h3><p>EPDM '+fmtMm(p.epdm)+' bm · Kefka '+fmtMm(p.brush)+' bm · Kolieska '+p.n*2+' ks · Skrutky, podkovičky a krytky po '+p.n*4+' ks</p><img class="v7qr" src="'+v7QrImage(qr)+'"><p>'+safe(qr)+'</p><p>Vyrobil: ____________ Skontroloval: ____________</p></div>');
  }catch(e){return alert("Pozícia "+o.items[j].pos+": "+e.message)}
 }
 $("#v7PrintArea").innerHTML=pages.join("");
 window.print();
}
const frameStockCodes={"Vertikálny profil":"P001","Vertikálny profil s madlom":"P002","Vertikálny profil s madlom obojstranne":"P003","Horizontálny profil":"P004","2-koľajový profil":"P006","3-koľajový profil":"P007","4-koľajový profil":"P008","5-koľajový profil":"P009","Teleskop 1":"P010","Teleskop 2":"P011","Dorazový profil":"P005","Stredový dorazový profil":"P005"};
function frameColor(c){const m=String(c).match(/(7016|9016|8017|9006)/);return m?m[1]:(/surov/i.test(c)?"Surová":null)}
function checkFrameStock(i){
 const o=submittedOrders[i];if(!o||o.stage<1)return alert("Najprv potvrď objednávku.");
 const requirements=new Map(),issues=[];
 function add(name,len,qty,color){if(!qty)return;const profile=frameStockCodes[name];const key=(profile||name)+"|"+color;const v=requirements.get(key)||{name,color,profile,cuts:[]};for(let k=0;k<qty;k++)v.cuts.push(len);requirements.set(key,v)}
 try{o.items.forEach(x=>{const p=calcProduction(x),q=Number(x.qty),color=frameColor(x.color);if(!color)throw Error("Neznáma farba "+x.color);
 add(p.rail+"-koľajový profil",p.split?Number(x.w)/2:Number(x.w),(p.split?4:2)*q,color);
 add("Dorazový profil",p.eff-17,2*q,color);
 add("Vertikálny profil",p.vert,p.normal*q,color);
 add("Vertikálny profil s madlom",p.vert,p.handle*q,color);
 add("Vertikálny profil s madlom obojstranne",p.vert,p.both*q,color);
 add("Horizontálny profil",p.hor,p.n*2*q,color);
 add("Stredový dorazový profil",p.vert,(p.dual?1:0)*q,color);
 if(x.comp==="Áno"){add("Teleskop 1",Number(x.w),q,color);add("Teleskop 2",Number(x.w),q,color)}
 })}catch(e){return alert(e.message)}
 const rows=[];
 for(const v of requirements.values()){
 const code=v.profile;
 if(!code){rows.push([v.name,v.color,v.cuts.length,"Nevyriešené mapovanie","—"]);issues.push(v.name);continue}
 const candidates=P.filter(x=>x.profileCode===code&&frameColor(x.color)===v.color&&x.qty>0).map(x=>({...x,available:x.qty-reservedFor(x.code)})).filter(x=>x.available>0);
 const bins=[];for(const x of candidates)for(let j=0;j<x.available;j++)bins.push({length:x.length,remaining:x.length,code:x.code});
 bins.sort((a,b)=>a.length-b.length);
 let missing=0;for(const cut of v.cuts.sort((a,b)=>b-a)){const b=bins.filter(b=>b.remaining>=cut+5).sort((a,b)=>(a.remaining-cut)-(b.remaining-cut))[0];if(b)b.remaining-=cut+5;else missing++}
 rows.push([profileDisplay(code,code==="P005"?"Doraz / stredový doraz":v.name),v.color,v.cuts.length,missing?"Chýba "+missing+" rezov":"Predbežne dostupné",candidates.map(x=>x.length+" mm × "+x.available).join("; ")||"Bez zásoby"]);
 if(missing)issues.push(v.name);
 }
 const html='<div class="v7production"><h1>LANGAS · KONTROLA SKLADU</h1><p>'+safe(o.id)+' · '+safe(o.name)+'</p><p>Predbežný výpočet podľa inventúry, farby a dĺžky tyčí. Rez 5 mm. Bez rezervácie.</p><table><tr><th>Profil</th><th>Farba</th><th>Rezov</th><th>Výsledok</th><th>Dostupné tyče</th></tr>'+rows.map(r=>'<tr>'+r.map(v=>'<td>'+safe(v)+'</td>').join("")+'</tr>').join("")+'</table><p><b>'+(issues.length?"Vyžaduje kontrolu: "+safe(issues.join(", ")):"Všetky namapované rezy predbežne pokryté")+'</b></p><p>Doraz a stredový doraz čerpajú zo spoločného P005. Teleskop 1 = P010 (6615), Teleskop 2 = P011 (6616). Ide o skúšobnú kontrolu bez rezervácie a odpisu.</p></div>';
 $("#v7PrintArea").innerHTML=html;window.print();
}
function frameRequirements(o){
 const map=new Map();
 function add(name,len,qty,color){
  if(!qty)return;
  const profile=frameStockCodes[name];if(!profile)throw Error("Neznámy skladový profil: "+name);
  if(!Number.isFinite(len)||len<=0||!Number.isInteger(qty)||qty<0)throw Error("Neplatný rez: "+name);
  const key=profile+"|"+color,entry=map.get(key)||{profile,color,name,cuts:[]};
  for(let j=0;j<qty;j++)entry.cuts.push(len);
  map.set(key,entry);
 }
 for(const x of o.items){
  const p=calcProduction(x),q=Number(x.qty),color=frameColor(x.color);
  if(!color||!Number.isInteger(q)||q<1)throw Error("Neplatná farba alebo počet systémov.");
  add(p.rail+"-koľajový profil",p.split?Number(x.w)/2:Number(x.w),(p.split?4:2)*q,color);
  add("Dorazový profil",p.eff-17,2*q,color);
  add("Stredový dorazový profil",p.vert,(p.dual?1:0)*q,color);
  add("Vertikálny profil",p.vert,p.normal*q,color);
  add("Vertikálny profil s madlom",p.vert,p.handle*q,color);
  add("Vertikálny profil s madlom obojstranne",p.vert,p.both*q,color);
  add("Horizontálny profil",p.hor,p.n*2*q,color);
  if(x.comp==="Áno"){add("Teleskop 1",Number(x.w),q,color);add("Teleskop 2",Number(x.w),q,color)}
 }
 return [...map.values()];
}
function frameCandidates(profile,color){
 return P.filter(x=>x.profileCode===profile&&frameColor(x.color)===color)
  .map(x=>({code:x.code,length:Number(x.length),qty:Math.max(0,Number(x.qty)-reservedFor(x.code)),color}))
  .filter(x=>x.qty>0);
}
function packFrame(cuts,candidates,kerf){
 const remaining=candidates.map(x=>({...x})),bars=[],missing=[];
 for(const cut of [...cuts].sort((a,b)=>b-a)){
  let best=null;
  for(const b of bars)if(b.free>=cut+kerf&&(!best||b.free<best.free))best=b;
  if(!best){
   const available=remaining.filter(x=>x.qty>0&&x.length>=cut+kerf).sort((a,b)=>a.length-b.length)[0];
   if(!available){missing.push(cut);continue}
   available.qty--;
   best={code:available.code,length:available.length,free:available.length,cuts:[],color:available.color};bars.push(best);
  }
  best.cuts.push(cut);best.free-=cut+kerf;
 }
 const used=bars.reduce((s,b)=>s+b.length,0),parts=bars.reduce((s,b)=>s+b.cuts.reduce((a,n)=>a+n,0),0);
 const saw=bars.reduce((s,b)=>s+b.cuts.length*kerf,0);
 const reusable=bars.reduce((s,b)=>s+(b.free>=200?b.free:0),0);
 const scrap=bars.reduce((s,b)=>s+(b.free<200?b.free:0),0)+saw;
 return {bars,missing,used,parts,saw,reusable,scrap,yield:used?parts/used*100:0,recovery:used?(parts+reusable)/used*100:0};
}
function packFrameOptimized(cuts,candidates,kerf){
 const baseline=packFrame(cuts,candidates,kerf);
 if(candidates.length<2||cuts.length>500)return baseline;
 const sorted=[...candidates].sort((a,b)=>a.length-b.length);
 const scenarios=[baseline];
 for(const x of sorted)scenarios.push(packFrame(cuts,[x],kerf));
 const cap=sorted.reduce((s,x)=>s+x.qty,0);
 if(sorted.length===2&&cap<=300){
  for(let first=0;first<=Math.min(sorted[0].qty,cuts.length);first++){
   const limited=[{...sorted[0],qty:first},sorted[1]];
   scenarios.push(packFrame(cuts,limited,kerf));
  }
 }else{
  for(const x of sorted){
   const steps=[0,1,2,3,5,8,13,21,34,55,x.qty].filter((v,i,a)=>v<=x.qty&&a.indexOf(v)===i);
   for(const n of steps)scenarios.push(packFrame(cuts,sorted.map(y=>({...y,qty:y.code===x.code?n:y.qty})),kerf));
  }
 }
 const score=p=>[p.missing.length,p.used,p.scrap,p.bars.length];
 scenarios.sort((a,b)=>{const aa=score(a),bb=score(b);for(let i=0;i<aa.length;i++)if(aa[i]!==bb[i])return aa[i]-bb[i];return 0});
 return scenarios[0];
}
function packFrameExactTwo(cuts,candidates,kerf){
 const types=[...new Set(cuts)].sort((a,b)=>b-a);
 const lengths=[...new Set(candidates.filter(x=>x.qty>0).map(x=>x.length))];
 if(types.length!==2||lengths.length!==1||cuts.length>700)return null;
 const length=lengths[0],a=cuts.filter(x=>x===types[0]).length,b=cuts.length-a;
 const maxBars=candidates.reduce((s,x)=>s+x.qty,0);
 const patterns=[];
 for(let x=0;x<=Math.min(a,Math.floor(length/(types[0]+kerf)));x++)
 for(let y=0;y<=Math.min(b,Math.floor((length-x*(types[0]+kerf))/(types[1]+kerf)));y++)
 if(x+y)patterns.push([x,y]);
 if((a+1)*(b+1)*patterns.length>6500000)return null;
 const stride=b+1,dist=new Int16Array((a+1)*stride).fill(32767),prev=new Int16Array(dist.length).fill(-1);
 dist[0]=0;
 for(let i=0;i<=a;i++)for(let j=0;j<=b;j++){
  const pos=i*stride+j;if(dist[pos]===32767||dist[pos]>=maxBars)continue;
  for(let k=0;k<patterns.length;k++){const [x,y]=patterns[k],ni=i+x,nj=j+y;if(ni>a||nj>b)continue;
   const at=ni*stride+nj;if(dist[pos]+1<dist[at]){dist[at]=dist[pos]+1;prev[at]=k}}
 }
 if(dist[a*stride+b]===32767)return null;
 const bars=[];let i=a,j=b;
 while(i||j){const k=prev[i*stride+j];if(k<0)return null;const [x,y]=patterns[k];bars.push({code:candidates[0].code,length,free:length-x*(types[0]+kerf)-y*(types[1]+kerf),cuts:[...Array(x).fill(types[0]),...Array(y).fill(types[1])],color:candidates[0].color});i-=x;j-=y}
 const used=bars.length*length,parts=cuts.reduce((s,x)=>s+x,0),saw=cuts.length*kerf;
 const reusable=bars.reduce((s,x)=>s+(x.free>=200?x.free:0),0);
 return {bars,missing:[],used,parts,saw,reusable,scrap:used-parts-reusable,yield:100*parts/used,recovery:100*(parts+reusable)/used,method:"Presné minimum počtu tyčí – dva rozmery, jedna vstupná dĺžka"};
}
function packFrameDeep(cuts,candidates,kerf){
 const exact=packFrameExactTwo(cuts,candidates,kerf);if(exact)return exact;
 const baseline=packFrameOptimized(cuts,candidates,kerf);
 let best=baseline;
 const score=p=>[p.missing.length,p.used,p.scrap];
 const better=(a,b)=>{const x=score(a),y=score(b);for(let i=0;i<x.length;i++)if(x[i]!==y[i])return x[i]<y[i];return false};
 const start=Date.now();
 for(let trial=0;trial<120&&Date.now()-start<1000;trial++){
  const order=[...cuts].sort((a,b)=>trial%3===0?b-a:trial%3===1?a-b:(Math.sin(a*13+trial*71)-Math.sin(b*13+trial*71)));
  const pool=candidates.map(x=>({...x})),bars=[],missing=[];
  for(const cut of order){
   let b=bars.filter(x=>x.free>=cut+kerf).sort((x,y)=>x.free-y.free)[0];
   if(!b){const options=pool.filter(x=>x.qty>0&&x.length>=cut+kerf).sort((x,y)=>x.length-y.length);const x=options[trial%5===0?Math.min(1,options.length-1):0];if(!x){missing.push(cut);continue}x.qty--;b={code:x.code,length:x.length,free:x.length,cuts:[],color:x.color};bars.push(b)}
   b.cuts.push(cut);b.free-=cut+kerf;
  }
  const used=bars.reduce((s,b)=>s+b.length,0),parts=bars.reduce((s,b)=>s+b.cuts.reduce((t,n)=>t+n,0),0);
  const saw=bars.reduce((s,b)=>s+b.cuts.length*kerf,0),reusable=bars.reduce((s,b)=>s+(b.free>=200?b.free:0),0);
  const p={bars,missing,used,parts,saw,reusable,scrap:used-parts-reusable,yield:used?100*parts/used:0,recovery:used?100*(parts+reusable)/used:0};
  if(better(p,best))best=p;
 }
 return best;
}
function openFrameOptimizer(i){
 const o=submittedOrders[i];if(!o||o.stage<1)return alert("Najprv potvrď objednávku.");
 let req;try{req=frameRequirements(o)}catch(e){return alert(e.message)}
 const host=$("#v8CutSetup"),detail=$("#v7detail-"+i);if(!host||!detail)return alert("Formulár optimalizácie nie je dostupný.");
 detail.prepend(host);host.classList.remove("hidden");
 host.innerHTML='<div class="optDashboard"><div class="optHeading"><div><small>OBJEDNÁVKY › '+safe(o.id)+' › OPTIMALIZÁCIA REZANIA</small><h2>'+safe(o.id)+' · Optimalizácia rezania</h2><p>'+o.items.length+' pozícií · Rámové zasklenie · Kontrola skladových dĺžok</p></div><span class="optTag">TESTOVACÍ REŽIM</span></div><div class="optSteps"><span>① Kontrola skladu</span><span>② Optimalizácia rezania</span><span>③ Schválenie</span></div><div class="optSetup"><label>Režim<select id="optMode"><option value="auto">Odporúčané dĺžky zo skladu</option><option value="custom">Vlastné dĺžky</option></select></label><label>Šírka pílového rezu (mm)<input id="optKerf" type="number" value="5" min="0" max="20" step="0.1"></label></div><div id="optLengths"></div><div class="optActions"><button id="optCalculate">Vyhodnotiť optimalizáciu</button><button id="optClose" class="gray">Zavrieť</button></div><div id="optResult"></div></div>';
 const options=req.map((r,j)=>({r,j,available:frameCandidates(r.profile,r.color)}));
 const renderInputs=()=>{$("#optLengths").innerHTML=$("#optMode").value==="custom"?options.map(({r,j,available})=>'<label>'+safe(r.profile+" · "+r.name+" · "+r.color)+'<select class="optStockLength" data-j="'+j+'">'+(available.length?available.map(x=>'<option value="'+x.length+'">'+x.length+' mm · '+x.qty+' ks</option>').join(""):'<option value="">Nedostupné</option>')+'</select></label>').join(""):'<p>Automatický výber z dostupných skladových dĺžok, vrátane kombinácií rôznych dĺžok jedného profilu.</p>'};
 $("#optMode").onchange=renderInputs;renderInputs();$("#optClose").onclick=()=>host.classList.add("hidden");
 $("#optCalculate").onclick=()=>{
  const kerf=Number($("#optKerf").value);if(!Number.isFinite(kerf)||kerf<0||kerf>20)return alert("Neplatná šírka rezu.");
  o.cuttingApproval=null;
  const custom=$("#optMode").value==="custom",results=[];
  for(const {r,j,available} of options){
   let stock=available;
   if(custom){const selected=host.querySelector('.optStockLength[data-j="'+j+'"]');stock=available.filter(x=>x.length===Number(selected.value))}
   let plan=custom?packFrame(r.cuts,stock,kerf):packFrameOptimized(r.cuts,stock,kerf),paint=null;
   if(plan.missing.length&&r.color!=="Surová"){
    const raw=frameCandidates(r.profile,"Surová");
    if(raw.length){const rawPlan=packFrameOptimized(plan.missing,raw,kerf);paint={...rawPlan,qty:rawPlan.bars.length};}
   }
   results.push({r,plan,paint});
  }
  const used=results.reduce((s,x)=>s+x.plan.used+(x.paint?.used||0),0);
  const parts=results.reduce((s,x)=>s+x.plan.parts+(x.paint?.parts||0),0);
  const reusable=results.reduce((s,x)=>s+x.plan.reusable+(x.paint?.reusable||0),0);
  const scrap=results.reduce((s,x)=>s+x.plan.scrap+(x.paint?.scrap||0),0);
  const shortage=results.reduce((s,x)=>s+(x.paint?x.paint.missing.length:x.plan.missing.length),0);
  const rows=results.map(({r,plan,paint})=>{
   const used=plan.used+(paint?.used||0),parts=plan.parts+(paint?.parts||0);
   const pct=used?parts/used*100:0;
   const bars=plan.bars.concat(paint?.bars||[]);
   const detail=bars.map((b,j)=>(j+1)+". "+b.length+" mm → "+b.cuts.map(fmtMm).join(" + ")+"; zvyšok "+fmtMm(b.free)+" mm"+(b.color==="Surová"?" (lakovať)":"")).join("<br>");
   return '<tr><td>'+safe(r.profile+" · "+r.name+" · "+r.color)+'</td><td>'+bars.length+'</td><td>'+fmtMm(pct)+' %</td><td>'+fmtMm(plan.reusable+(paint?.reusable||0))+' mm</td><td>'+fmtMm(plan.scrap+(paint?.scrap||0))+' mm</td><td>'+ (paint?paint.missing.length:plan.missing.length)+'</td></tr><tr><td colspan="6"><small>'+detail+'</small>'+(paint&&paint.bars.length?'<p><b>Navrhnuté lakovanie:</b> '+paint.bars.length+' surových tyčí na '+safe(r.color)+'; vyžaduje schválenie.</p>':'')+'</td></tr>';
  }).join("");
  const paintItems=results.filter(x=>x.paint&&x.paint.bars.length);
  const stats='<div class="optStats"><div><small>Celková vyťaženosť</small><strong>'+fmtMm(used?parts/used*100:0)+' %</strong></div><div><small>Použiteľné zvyšky</small><strong>'+fmtMm(reusable/1000)+' bm</strong></div><div><small>Odpad vrátane rezu</small><strong>'+fmtMm(scrap/1000)+' bm</strong></div><div><small>Efektívne využitie</small><strong>'+fmtMm(used?(parts+reusable)/used*100:0)+' %</strong></div></div>';
  const checkRows=results.map(({r,plan,paint})=>'<tr><td>'+safe(r.profile+' · '+r.name)+'</td><td>'+safe(r.color)+'</td><td>'+r.cuts.length+'</td><td>'+(plan.missing.length===0?'✓ Dostupné':paint&&paint.missing.length===0?'⚠ Lakovanie':'✕ Chýba')+'</td><td>'+plan.bars.length+(paint?' + '+paint.bars.length+' surové':'')+'</td></tr>').join('');
  const paintHtml=paintItems.length?'<div class="optPaint"><h3>⚠ Návrh lakovania</h3>'+paintItems.map(x=>'<p><b>'+safe(x.r.profile+' · '+x.r.name)+'</b>: chýba '+x.plan.missing.length+' rezov vo farbe '+safe(x.r.color)+'. Navrhnuté '+x.paint.bars.length+' surových tyčí do lakovne.</p>').join('')+'<button id="optPaintRequest">Pripraviť požiadavku pre lakovňu</button><p id="optPaintStatus"></p></div>':'<div class="optPaint optOk"><h3>✓ Materiál dostupný v požadovanej farbe</h3></div>';
  const safeRows=rows.replaceAll('<small>','<small class="optCutDetail">');
  $("#optResult").innerHTML='<div class="optColumns"><section class="optPanel"><h3>1. Kontrola skladu</h3><div class="optScroll"><table><tr><th>Profil</th><th>Farba</th><th>Rezy</th><th>Stav</th><th>Tyče</th></tr>'+checkRows+'</table></div></section><section class="optPanel">'+paintHtml+'</section></div><section class="optPanel"><h3>2. Optimalizácia rezania – '+(custom?'Vlastné dĺžky':'Odporúčané dĺžky')+'</h3>'+stats+'<div class="optScroll"><table><tr><th>Profil a rezací plán</th><th>Tyče</th><th>Vyťaženosť</th><th>Zvyšky</th><th>Odpad</th><th>Chýba</th></tr>'+safeRows+'</table></div></section><div class="optFooter"><div class="optNotice">'+(shortage?'⚠ Chýba '+shortage+' rezov.':'✓ Všetky rezy sú pokryté.')+' '+(paintItems.length?'Lakovanie musí byť schválené pred rezaním.':'')+'</div><button id="optPrint">Tlačiť výsledok</button><button id="optApprove" '+(shortage>0?'disabled title="Chýba materiál"':'')+'>Potvrdiť rezací plán</button></div><p id="optApprovalStatus"></p><p class="muted">Optimalizácia je heuristická; zvyšky od 200 mm sú predbežne použiteľné. Bez rezervácie a odpisu skladu.</p>';
  if(paintItems.length)$("#optPaintRequest").onclick=()=>{$("#optPaintStatus").textContent="Návrh pre lakovňu pripravený v tomto testovacom prehľade; zatiaľ sa neodosiela ani nerezervuje.";};
  $("#optPrint").onclick=()=>{$("#v7PrintArea").innerHTML=$("#optResult").innerHTML;window.print()};
  $("#optApprove").onclick=()=>{
   if(shortage>0)return alert("Rezanie nemožno potvrdiť: chýba materiál.");
   if(results.some(x=>x.paint&&x.paint.bars.length))return alert("Najprv treba samostatne schváliť lakovanie surových profilov. Rezanie zatiaľ nemožno potvrdiť.");
   if(!confirm("Schváliť tento rezací plán pre výrobu? Zatiaľ sa materiál nerezervuje ani neodpisuje."))return;
   o.cuttingApproval={when:new Date().toLocaleString("sk-SK"),mode:custom?"Vlastné dĺžky":"Odporúčané dĺžky",yield:used?parts/used*100:0};
   $("#optApprovalStatus").textContent="✓ Rezací plán potvrdený (test): "+o.cuttingApproval.when;
   $("#optApprove").disabled=true;
  };
 };
 host.scrollIntoView({behavior:"smooth",block:"start"});
}
function cutPlanV8(i){
 const o=submittedOrders[i];if(!o||o.stage<1)return alert("Najprv potvrď objednávku.");
 const grouped=new Map();
 function add(name,len,qty,pos){
  if(!qty)return;
  if(!Number.isFinite(len)||len<=0||!Number.isInteger(qty)||qty<0||qty>10000)throw Error("Neplatná položka: "+name);
  const key=name+"|"+len.toFixed(4),v=grouped.get(key)||{name,len,qty:0,positions:new Set()};
  v.qty+=qty;v.positions.add(String(pos));grouped.set(key,v);
 }
 try{
  for(const x of o.items){
   const p=calcProduction(x),q=Number(x.qty);
   if(!Number.isInteger(q)||q<1||q>1000)throw Error("Neplatný počet systémov: pozícia "+x.pos);
   add(p.rail+"-koľajový profil",p.split?Number(x.w)/2:Number(x.w),(p.split?4:2)*q,x.pos);
   add("Dorazový profil",p.eff-17,2*q,x.pos);
   add("Vertikálny profil",p.vert,p.normal*q,x.pos);
   add("Vertikálny profil s madlom",p.vert,p.handle*q,x.pos);
   add("Vertikálny profil s madlom obojstranne",p.vert,p.both*q,x.pos);
   add("Horizontálny profil",p.hor,p.n*2*q,x.pos);
   add("Stredový dorazový profil",p.vert,(p.dual?1:0)*q,x.pos);
   if(x.comp==="Áno")add("Teleskop 1 a 2 – sada",Number(x.w),q,x.pos);
  }
 }catch(e){return alert(e.message)}

 const names=[...new Set([...grouped.values()].map(v=>v.name))];
 const host=$("#v8CutSetup");
 if(!host){alert("Formulár rezacieho plánu nie je dostupný.");return}
 const detail=$("#v7detail-"+i);
 if(detail)detail.prepend(host);
 host.classList.remove("hidden");
 host.innerHTML='<h3>Rezací plán – dĺžky vstupných tyčí</h3><p>Pre každý profil nastav skladovú dĺžku v mm. Hodnoty sú zatiaľ testovacie, nie zo skladu.</p><div class="v8CutFields">'+names.map((name,j)=>'<label>'+safe(name)+'<input type="number" min="1000" max="20000" step="1" class="v8stockLength" data-j="'+j+'" value="6500"></label>').join("")+'</div><label>Šírka pílového rezu (mm)<input id="v8Kerf" type="number" min="0" max="20" step="0.1" value="5"></label><div class="actions"><button id="v8Calculate" class="green">Vypočítať rezací plán</button><button id="v8Cancel" class="gray">Zrušiť</button></div>';
 host.scrollIntoView({behavior:"smooth",block:"start"});
 $("#v8Cancel").onclick=()=>host.classList.add("hidden");
 $("#v8Calculate").onclick=()=>{
 const kerf=Number($("#v8Kerf").value);
 if(!Number.isFinite(kerf)||kerf<0||kerf>20)return alert("Neplatná šírka rezu.");
 const lengths=new Map();
 for(const inp of host.querySelectorAll(".v8stockLength")){
  const n=Number(inp.value);if(!Number.isFinite(n)||n<1000||n>20000)return alert("Skontroluj dĺžku: "+names[+inp.dataset.j]);
  lengths.set(names[+inp.dataset.j],n);
 }
 const byProfile=new Map();
 for(const v of grouped.values()){
  const arr=byProfile.get(v.name)||[];
  for(let n=0;n<v.qty;n++)arr.push(v.len);
  byProfile.set(v.name,arr);
 }
 let html='<div class="v7production"><h1>LANGAS · REZACÍ PLÁN ZÁKAZKY</h1><p>'+safe(o.id)+' · '+safe(o.customer)+' · '+safe(o.name)+'</p><p><b>TEST:</b> samostatné dĺžky vstupných tyčí podľa profilov, rez '+fmtMm(kerf)+' mm. Nie je to kontrola skladu ani rezervácia.</p>';
 let summary=[];
 for(const [name,cuts] of byProfile){
  const stock=lengths.get(name);cuts.sort((a,b)=>b-a);
  const bins=[],oversize=[];
  for(const len of cuts){
   if(len+kerf>stock+1e-7){oversize.push(len);continue}
   let bin=bins.find(b=>b.used+len+kerf<=stock+1e-7);
   if(!bin){bin={used:0,cuts:[]};bins.push(bin)}
   bin.cuts.push(len);bin.used+=len+kerf;
  }
  const waste=bins.reduce((a,b)=>a+Math.max(0,stock-b.used),0);
  summary.push([name,stock,cuts.length,bins.length,waste,oversize.length]);
  html+='<h2>'+safe(name)+'</h2><p>Vstupná tyč: '+fmtMm(stock)+' mm · Rezov: '+cuts.length+' · Vstupné tyče: '+bins.length+' · Zvyšok: '+fmtMm(waste)+' mm</p>';
  if(oversize.length)html+='<p><b>POZOR: '+oversize.length+' rezov je dlhších ako vstupná tyč!</b></p>';
  html+='<table><tr><th>Tyč</th><th>Rozrezanie [mm]</th><th>Zvyšok [mm]</th></tr>'+bins.map((b,j)=>'<tr><td>'+(j+1)+'</td><td>'+b.cuts.map(fmtMm).join(" + ")+'</td><td>'+fmtMm(Math.max(0,stock-b.used))+'</td></tr>').join("")+'</table>';
 }
 html+='<h2>Rekapitulácia</h2><table><tr><th>Profil</th><th>Tyč mm</th><th>Rezy</th><th>Tyče</th><th>Zvyšok mm</th><th>Nad dĺžku</th></tr>'+summary.map(v=>'<tr><td>'+safe(v[0])+'</td><td>'+fmtMm(v[1])+'</td><td>'+v[2]+'</td><td>'+v[3]+'</td><td>'+fmtMm(v[4])+'</td><td>'+v[5]+'</td></tr>').join("")+'</table><p>Optimalizácia: First-Fit Decreasing, 1 rez na každý diel. Vstupné dĺžky profilov sú skúšobné; odrezky a skladové rezervácie sa zatiaľ nezohľadňujú.</p></div>';
 $("#v7PrintArea").innerHTML=html;
 window.print();
 host.classList.add("hidden");
 };
}
function glassOrderV7(i){
 const o=submittedOrders[i];if(!o||o.stage<1)return alert("Najprv potvrď objednávku.");
 const grouped=new Map();
 try{
  o.items.forEach(x=>{
   const p=calcProduction(x),qty=p.n*Number(x.qty),type=x.glass,key=[type,p.gw.toFixed(4),p.gh.toFixed(4)].join("|");
   if(!Number.isInteger(qty)||qty<=0)throw Error("Neplatný počet kusov na pozícii "+x.pos);
   const old=grouped.get(key)||{type,w:p.gw,h:p.gh,qty:0,positions:[]};
   old.qty+=qty;old.positions.push(String(x.pos));grouped.set(key,old);
  });
 }catch(e){return alert("Objednávka skla sa nevytvorila: "+e.message)}
 const items=[...grouped.values()].sort((a,b)=>a.type.localeCompare(b.type,"sk")||a.w-b.w||a.h-b.h);
 const rows=items.map((x,j)=>'<tr><td>'+(j+1)+'</td><td>'+safe(x.type)+'</td><td>'+fmtMm(x.w)+'</td><td>'+fmtMm(x.h)+'</td><td>'+x.qty+'</td><td>'+((x.w*x.h*x.qty)/1000000).toLocaleString("sk-SK",{minimumFractionDigits:3,maximumFractionDigits:4})+'</td><td>'+safe(x.positions.join(", "))+'</td></tr>').join("");
 const sumQty=items.reduce((s,x)=>s+x.qty,0),sumArea=items.reduce((s,x)=>s+x.w*x.h*x.qty/1000000,0);
 $("#v7PrintArea").innerHTML='<div class="v7glassOrder"><h1>LANGAS · OBJEDNÁVKA SKLA</h1><p><b>'+safe(o.id)+'</b> · '+safe(o.customer)+' · '+safe(o.name)+'</p><p>Dátum: '+safe(o.time)+' · Počet rozmerových položiek: '+items.length+'</p><table><thead><tr><th>Č.</th><th>Sklo</th><th>Šírka mm</th><th>Výška mm</th><th>Ks</th><th>m²</th><th>Pozície</th></tr></thead><tbody>'+rows+'</tbody></table><h3>Spolu: '+sumQty+' ks · '+sumArea.toLocaleString("sk-SK",{minimumFractionDigits:3,maximumFractionDigits:4})+' m²</h3><p>Rozmery skiel a množstvá sú vypočítané z potvrdenej testovacej objednávky. Pred odoslaním dodávateľovi skontrolovať.</p></div>';
 window.print();
}
function printV7(i){let o=submittedOrders[i],body=$("#v7PrintArea");body.innerHTML='<h1>LANGAS · Súhrn objednávky</h1><h2>'+safe(o.id)+'</h2><p>Odberateľ: '+safe(o.customer)+' · Zákazka: '+safe(o.name)+' · Dátum: '+safe(o.time)+'</p>'+o.items.map(x=>'<div class="v7position"><h3>Pozícia '+safe(x.pos)+' · '+sysLabel(x.d)+' · '+safe(x.qty)+' ks</h3>'+positionDrawing(x)+'<img class="v7qr" src="'+v7QrImage(v7QrPayload(o,x))+'" alt="QR pozície"><p>'+safe(x.w)+' × '+safe(x.h)+' mm · '+safe(x.glass)+' · '+safe(x.color)+' · '+safe(x.side)+'</p></div>').join('')+'<p>Pracovný súhrn – NIE výrobný list.</p>';window.print()}
$("#sendOrder").onclick=()=>{if(!onlineOrders.length)return alert("Najprv pridaj systém.");let id="TEST-"+new Date().getFullYear()+"-"+String(submittedOrders.length+1).padStart(4,"0");submittedOrders.unshift({id,customer:"XY",name:$("#ordName").value,time:new Date().toLocaleString("sk-SK"),stage:0,items:structuredClone(onlineOrders).map(x=>({...x,done:0}))});$("#orderMsg").innerHTML='<div class="note"><b>'+id+' odoslaná.</b> Otvor Nové objednávky a vyskúšaj schvaľovanie aj výrobu.</div>';onlineOrders=[];renderOnlineOrders();renderNewOrders()};
let v7CameraStream=null,v7CameraFrame=null;
async function startV7Camera(){
 const video=$("#v7CameraVideo"),status=$("#v7CameraStatus");
 if(!navigator.mediaDevices?.getUserMedia){status.textContent="Kamera nie je dostupná. Použi HTTPS a Safari/Chrome.";return}
 try{
  v7CameraStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"}},audio:false});
  video.srcObject=v7CameraStream;video.classList.remove("hidden");await video.play();
  status.textContent="Namier kameru na QR kód výrobného listu.";
  const canvas=document.createElement("canvas"),ctx=canvas.getContext("2d",{willReadFrequently:true});
  function tick(){
   if(!v7CameraStream)return;
   if(video.readyState>=2&&video.videoWidth){canvas.width=video.videoWidth;canvas.height=video.videoHeight;ctx.drawImage(video,0,0,canvas.width,canvas.height);
    const frame=ctx.getImageData(0,0,canvas.width,canvas.height);
    const result=typeof jsQR==="function"?jsQR(frame.data,frame.width,frame.height,{inversionAttempts:"attemptBoth"}):null;
    if(result){stopV7Camera();$("#v7QrInput").value=result.data;status.textContent="QR načítaný: "+result.data;v7QrScan(result.data);return}
   }
   v7CameraFrame=requestAnimationFrame(tick);
  }
  tick();
 }catch(e){status.textContent="Nepodarilo sa spustiť kameru: "+e.message}
}
function stopV7Camera(){if(v7CameraFrame)cancelAnimationFrame(v7CameraFrame);v7CameraFrame=null;if(v7CameraStream){v7CameraStream.getTracks().forEach(t=>t.stop());v7CameraStream=null}const video=$("#v7CameraVideo");if(video){video.pause();video.srcObject=null;video.classList.add("hidden")}}
$("#v7StartCamera").onclick=startV7Camera;
$("#v7StopCamera").onclick=stopV7Camera;
const qrInput=document.querySelector("#v7QrInput");if(qrInput)document.querySelector("#v7QrSubmit").onclick=()=>v7QrScan(qrInput.value);

const freeCuts=[];
function freeProfiles(){return [...new Map(P.filter(x=>x.profileCode).map(x=>[x.profileCode,x.name])).entries()]}
function initFreeOptimizer(){
 const ps=$("#freeProfile"),systemSelect=$("#freeSystem");
 const systems=[...new Set(P.flatMap(x=>x.systems||[x.system]).filter(Boolean))];
 const preferred=["Rámové zasklenie","Bezrámové zasklenie","Bezrámové posuvno-otočné","Pergola","Zábradlia"];
 systems.sort((a,b)=>{const ai=preferred.indexOf(a),bi=preferred.indexOf(b);return (ai<0?999:ai)-(bi<0?999:bi)||a.localeCompare(b,"sk")});
 systemSelect.innerHTML=systems.map(v=>'<option value="'+safe(v)+'">'+safe(v)+'</option>').join("");
 const updateProfiles=()=>{
  const selected=systemSelect.value;
  const items=P.filter(x=>(x.systems||[x.system]).includes(selected));
  const unique=new Map(items.map(x=>[x.profileCode||x.code,{code:x.profileCode||x.code,name:x.name}]));
  const prev=ps.value;
  ps.innerHTML=[...unique.values()].sort((a,b)=>a.code.localeCompare(b.code,"sk")).map(x=>'<option value="'+safe(x.code)+'">'+safe(profileDisplay(x.code,x.name))+'</option>').join("");
  if(unique.has(prev))ps.value=prev;
  update();
 };
 
 const update=()=>{
  const code=ps.value,colors=[...new Set(P.filter(x=>(x.profileCode||x.code)===code).map(x=>x.color))];
  const old=$("#freeColor").value;$("#freeColor").innerHTML=colors.map(v=>'<option>'+safe(v)+'</option>').join("");if(colors.includes(old))$("#freeColor").value=old;
  updateLengths();
 };
 const updateLengths=()=>{
  const stock=P.filter(x=>(x.profileCode||x.code)===ps.value&&x.color===$("#freeColor").value);
  $("#freeBar").innerHTML=[...new Set(stock.map(x=>x.length))].sort((a,b)=>a-b).map(n=>'<option value="'+n+'">'+n+' mm</option>').join("");
 };
 systemSelect.onchange=updateProfiles;ps.onchange=update;$("#freeColor").onchange=updateLengths;updateProfiles();
 let editIndex=-1;
 const invalidate=()=>{$("#freeResult").innerHTML="";};
 const render=()=>{
  $("#freeCutsList").innerHTML='<h3>Požadované rezy</h3>'+(freeCuts.length?'<div class="scroll"><table><tr><th>Profil</th><th>Farba</th><th>Dĺžka</th><th>Ks</th><th>Možnosti</th></tr>'+freeCuts.map((x,i)=>'<tr><td>'+safe(profileDisplay(x.profile))+'</td><td>'+safe(x.color)+'</td><td>'+x.length+' mm</td><td>'+x.qty+'</td><td><button type="button" class="freeEdit" data-index="'+i+'">Upraviť</button> <button type="button" class="freeDelete gray" data-index="'+i+'">Vymazať</button></td></tr>').join("")+'</table></div>':'<p class="muted">Zatiaľ nie sú zadané rezy.</p>');
  $("#freeCutsList").querySelectorAll(".freeEdit").forEach(b=>b.onclick=()=>{
   const i=Number(b.dataset.index),x=freeCuts[i];if(!x)return;
   const entry=P.find(p=>(p.profileCode||p.code)===x.profile&&p.color===x.color);
   if(entry){const category=(entry.systems||[entry.system])[0];if([...systemSelect.options].some(o=>o.value===category))systemSelect.value=category;updateProfiles();ps.value=x.profile;update();$("#freeColor").value=x.color;updateLengths()}
   $("#freeCut").value=x.length;$("#freeQty").value=x.qty;editIndex=i;
   $("#freeAdd").textContent="Uložiť zmeny";$("#freeCancelEdit").hidden=false;
   $("#freeCut").focus();
  });
  $("#freeCutsList").querySelectorAll(".freeDelete").forEach(b=>b.onclick=()=>{
   const i=Number(b.dataset.index);if(!freeCuts[i]||!confirm("Vymazať tento rez?"))return;
   freeCuts.splice(i,1);resetEdit();invalidate();render();
  });
 };
 const resetEdit=()=>{editIndex=-1;$("#freeAdd").textContent="Pridať rezy";$("#freeCancelEdit").hidden=true};
 $("#freeCancelEdit").onclick=resetEdit;
 $("#freeAdd").onclick=()=>{
  const length=Number($("#freeCut").value),qty=Number($("#freeQty").value);
  if(!ps.value||!$("#freeColor").value||!Number.isFinite(length)||length<=0||!Number.isInteger(qty)||qty<1||qty>2000)return alert("Skontroluj profil, farbu, dĺžku a počet kusov (max. 2000).");
  const entry={profile:ps.value,color:$("#freeColor").value,length,qty};
  if(editIndex>=0)freeCuts[editIndex]=entry;else freeCuts.push(entry);
  resetEdit();invalidate();render();
 };
 function exportFreeOptimization(asPdf){
  const result=$("#freeResult");
  if(!result.querySelector("table"))return alert("Najprv spusti optimalizáciu.");
  const title=$("#freeJob").value.trim()||"Neoznačená zákazka";
  const win=window.open("","_blank");if(!win)return alert("Povoľ otváranie okien pre tlač.");
  const styles='@page{size:A4 landscape;margin:12mm}body{font:11px Arial,sans-serif;color:#17324f}h1{font-size:21px;color:#153e71}h2{font-size:16px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #d5e0eb;padding:6px;vertical-align:top}th{background:#e8f2ff}tr{break-inside:avoid}small{font-size:10px}.cutDetail{margin:10px 0 16px}.cutMatrix{font-size:10px;table-layout:fixed}.cutMatrix th,.cutMatrix td{text-align:center;padding:7px 5px;white-space:nowrap}.cutMatrix tr:nth-child(even){background:#f3f7fc}.cutMatrix th{font-size:9px}.detailRow>td{padding:12px 0}.cutDetail h4{font-size:13px;margin:8px 0}.cutMatrix{break-inside:auto}.note{color:#64748b}';
  const meta='<h1>LANGAS · Optimalizácia rezania</h1><p><b>Zákazka:</b> '+safe(title)+' · <b>Dátum:</b> '+new Date().toLocaleString("sk-SK")+'</p><p>Výstup: A4 na šírku · '+(asPdf?"Uložiť ako PDF":"Tlač")+'</p>';
  win.document.open();win.document.write('<!doctype html><html lang="sk"><head><meta charset="utf-8"><title>LANGAS - '+safe(title)+'</title><style>'+styles+'</style></head><body>'+meta+result.innerHTML+'<p class="note">Testovací plán. Skladové zásoby sa nemenia.</p></body></html>');win.document.close();
  win.onload=()=>win.print();
 }
 $("#freePrint").onclick=()=>exportFreeOptimization(false);
 $("#freePdf").onclick=()=>{alert("V nasledujúcom okne zvoľ tlačiareň „Uložiť ako PDF“ (Microsoft Print to PDF). Formát je A4 na šírku.");exportFreeOptimization(true)};
 $("#freeLoadMarkizy").onclick=()=>{
  if(freeCuts.length&&!confirm("Nahradiť aktuálne zadané rezy testovacou zákazkou Markízy?"))return;
  resetEdit();freeCuts.length=0;
  const rows=[
   ["W.6033.00.00.PS.650.28",2630,1],["W.6033.00.00.PS.650.28",1710,1],
   ["W.6043.00.00.PS.650.28",2630,1],["W.6043.00.00.PS.650.28",1710,1],
   ["W.6013.00.00.PS.650.28",2480,4],
   ["W.6010.00.00.PS.650.28",857,3],["W.6010.00.00.PS.650.28",550.3,3]
  ];
  for(const [profile,length,qty] of rows)freeCuts.push({profile,color:"Surová",length,qty});
  $("#freeJob").value="Markízy – Silenta 2630 + 1710";
  systemSelect.value="Bezrámové zasklenie";updateProfiles();
  $("#freeMode").value="auto";$("#freeKerf").value="5";
  $("#freeDepth").value="deep";
  invalidate();render();
  $("#freePresetNotice").textContent="Načítaných 7 položiek rezania pre 2 systémy Silenta. Pozor: výrobný list vyžaduje W.6033.00.00.PS.650.28, ale sklad eviduje W.6033.00.00.EL.650.28. Bez potvrdenia zameniteľnosti je tento profil nedostupný. Sklo, tesnenia a kovanie nie sú súčasťou optimalizácie.";
  $("#freeRun").click();
 };
 $("#freeClear").onclick=()=>{resetEdit();freeCuts.length=0;$("#freeResult").innerHTML="";render()};
 $("#freeRun").onclick=()=>{
  if(!freeCuts.length)return alert("Najprv pridaj rezy.");
  const kerf=Number($("#freeKerf").value);if(!Number.isFinite(kerf)||kerf<0||kerf>20)return alert("Neplatná šírka rezu.");
  const groups=new Map();for(const x of freeCuts){const key=x.profile+"|"+x.color,g=groups.get(key)||{profile:x.profile,color:x.color,cuts:[]};for(let j=0;j<x.qty;j++)g.cuts.push(x.length);groups.set(key,g)}
  let used=0,parts=0,reusable=0,scrap=0,missing=0,fastTotal=0,finalTotal=0;const methods=[];const chosenDepth=$("#freeDepth").value;
  const rows=[...groups.values()].map(g=>{
   let candidates=P.filter(x=>(x.profileCode||x.code)===g.profile&&x.color===g.color).map(x=>({code:x.code,length:Number(x.length),qty:Math.max(0,x.qty-reservedFor(x.code)),color:x.color})).filter(x=>x.qty>0);
   if($("#freeMode").value==="custom"){const selected=Number($("#freeBar").value);if(g.profile===ps.value&&g.color===$("#freeColor").value)candidates=candidates.filter(x=>x.length===selected)}
   const fast=packFrameOptimized(g.cuts,candidates,kerf);const plan=$("#freeDepth").value==="deep"?packFrameDeep(g.cuts,candidates,kerf):fast;methods.push({profile:g.profile,color:g.color,method:chosenDepth==="fast"?"Rýchla heuristika":(plan.method||"Hĺbková heuristika – optimum nepotvrdené")});fastTotal+=fast.bars.length;finalTotal+=plan.bars.length;used+=plan.used;parts+=plan.parts;reusable+=plan.reusable;scrap+=plan.scrap;missing+=plan.missing.length;
   const maxCuts=Math.max(1,...plan.bars.map(b=>b.cuts.length));
   const head='<tr><th>Tyč</th><th>Vstup (mm)</th>'+Array.from({length:maxCuts},(_,i)=>'<th>Rez '+(i+1)+'</th>').join("")+'<th>Zvyšok (mm)</th></tr>';
   const body=plan.bars.map((b,i)=>'<tr><td><b>'+(i+1)+'</b></td><td>'+b.length+'</td>'+Array.from({length:maxCuts},(_,j)=>'<td>'+(b.cuts[j]===undefined?'–':b.cuts[j].toLocaleString("sk-SK",{maximumFractionDigits:1}))+'</td>').join("")+'<td><b>'+b.free.toLocaleString("sk-SK",{maximumFractionDigits:1})+'</b></td></tr>').join("");
   const detail='<div class="cutDetail"><h4>'+safe(profileDisplay(g.profile))+' · '+safe(g.color)+' – rozpis jednotlivých tyčí</h4><table class="cutMatrix">'+head+body+'</table></div>';
   return '<tr><td>'+safe(g.profile)+' · '+safe(g.color)+'</td><td>'+plan.bars.length+'</td><td>'+plan.yield.toFixed(1)+' %</td><td>'+Math.round(plan.reusable)+' mm</td><td>'+Math.round(plan.scrap)+' mm</td><td>'+plan.missing.length+'</td></tr><tr class="detailRow"><td colspan="6">'+detail+'</td></tr>';
  }).join("");
  $("#freeResult").innerHTML='<h3>Výsledok optimalizácie</h3><p>Rýchly plán: '+fastTotal+' tyčí · Zvolený plán: '+finalTotal+' tyčí · Rozdiel: '+(fastTotal-finalTotal)+' tyčí. Použitý režim: '+(chosenDepth==="deep"?"HĹBKOVÁ OPTIMALIZÁCIA":"RÝCHLA OPTIMALIZÁCIA")+' · '+methods.map(m=>safe(profileDisplay(m.profile)+": "+m.method)).join("; ")+'.</p><p><b>Vyťaženosť: '+(used?100*parts/used:0).toFixed(1)+' %</b> · Efektívne využitie: '+(used?100*(parts+reusable)/used:0).toFixed(1)+' % · Použiteľné zvyšky: '+Math.round(reusable)+' mm · Odpad: '+Math.round(scrap)+' mm · Chýbajúce rezy: '+missing+'</p><div class="scroll"><table><tr><th>Profil</th><th>Tyče</th><th>Vyťaženosť</th><th>Zvyšky</th><th>Odpad</th><th>Chýba</th></tr>'+rows+'</table></div><p class="muted">Testovací výpočet bez rezervácie a odpisu skladu. Presné optimum je potvrdené iba tam, kde je výslovne uvedená presná metóda.</p>';
 };
 render();
}
initFreeOptimizer();
syncCards();drawOrderPreview();renderOnlineOrders();renderNewOrders();
bindFilters();render();checkGut();syncLengthMode();
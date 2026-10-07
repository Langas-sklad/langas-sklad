const D=window.DATA;let P=structuredClone(D.stock),C=structuredClone(D.cuts),H=[],R=[],stockSystem="all",cutSystem="all";const $=s=>document.querySelector(s),findP=c=>P.find(x=>x.code===c);C.forEach(x=>{let p=findP(x.code);if(p){x.system=x.system||p.system||"Nezaradené";x.systems=x.systems||p.systems||[x.system];x.color=x.color||p.color}});
function show(id){document.querySelectorAll("main>section").forEach(x=>x.classList.add("hidden"));$("#"+id).classList.remove("hidden");document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("active",x.dataset.p===id));scrollTo(0,0)}document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>show(b.dataset.p));$("#printBtn").onclick=()=>print();
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
 $("#dubnicaResult").innerHTML='<div class="'+(missing.length?"warn":"note")+'"><b>'+(missing.length?"Materiál nie je kompletný.":"Materiál podľa kontroly postačuje.")+'</b></div><div class="scroll"><table><tr><th>Kód</th><th>Položka</th><th>Potrebujeme</th><th>Dostupné</th><th>Stav</th></tr>'+a.map(x=>'<tr><td>'+x.code+'</td><td>'+x.label+(x.note?'<br><span class="muted">'+x.note+'</span>':'')+'</td><td>'+x.need+' '+x.unit+'</td><td>'+x.display+'</td><td class="'+(x.ok?'ok':'bad')+'">'+(x.ok?'OK':'CHÝBA')+'</td></tr>').join('')+'</table></div>';
 return a;
}
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
$("#duplicateOrder").onclick=()=>{$("#ordPos").value=String(onlineOrders.length+1)};

const safe=s=>String(s??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
const totalUnits=o=>o.items.reduce((a,x)=>a+(Number(x.qty)||0),0);
const orderStages=["Odoslaná","Potvrdená","Vo výrobe","Pripravená"];
function positionDrawing(x){let d=Number(x.d),n=d>10?Number(String(d)[0])*2:d,half=d>10?n/2:0,arrow=x.side==="Pravá"?"←":x.side==="Od stredu"?"↔":"→";
return '<div class="v7drawing">'+Array.from({length:n},(_,j)=>'<div class="v7pane '+(half&&j===half?'v7split':'')+'"><small>'+ (j+1) +'</small><b>'+arrow+'</b></div>').join("")+'</div>'}
function renderNewOrders(){
 $("#newOrderBadge").textContent=submittedOrders.filter(o=>o.stage===0).length||"";
 $("#newOrdersList").innerHTML=submittedOrders.length?submittedOrders.map((o,i)=>'<article class="v7order"><div class="v7head"><div><h3>'+safe(o.id)+' · '+safe(o.customer)+'</h3><p>'+safe(o.name)+' · '+safe(o.time)+'</p></div><strong>'+orderStages[o.stage]+'</strong></div><p>'+o.items.length+' pozícií · '+totalUnits(o)+' systémov · Hotové '+o.items.reduce((a,x)=>a+(x.done||0),0)+' / '+totalUnits(o)+'</p><button type="button" class="v7open" data-i="'+i+'">Otvoriť objednávku</button><div class="v7details hidden" id="v7detail-'+i+'"></div></article>').join(""):'<p class="muted">Žiadne nové objednávky v tomto prehliadači.</p>';
 document.querySelectorAll(".v7open").forEach(b=>b.onclick=()=>openV7(+b.dataset.i));
}
function openV7(i){const o=submittedOrders[i],el=$("#v7detail-"+i);el.classList.remove("hidden");
 el.innerHTML='<h3>Detail zákazky · '+safe(o.id)+'</h3><p><b>Odberateľ:</b> '+safe(o.customer)+' · <b>Zákazka:</b> '+safe(o.name)+' · <b>Dátum:</b> '+safe(o.time)+'</p><p><b>Stav:</b> '+orderStages[o.stage]+'</p>'+
 o.items.map((x,j)=>'<div class="v7position"><b>Pozícia '+safe(x.pos)+' · '+sysLabel(x.d)+' · '+safe(x.w)+' × '+safe(x.h)+' mm · '+safe(x.qty)+' ks</b>'+positionDrawing(x)+'<p>'+safe(x.glass)+' · '+safe(x.color)+' · '+safe(x.side)+' · Teleskop '+safe(x.comp)+' · Obojstranné madlo '+safe(x.fix)+'</p><p>Dokončené: '+(x.done||0)+' / '+x.qty+'</p><button type="button" class="v7finish" data-i="'+i+'" data-j="'+j+'" '+(o.stage<2||x.done>=x.qty?'disabled':'')+'>✓ Dokončiť 1 ks (simulácia QR)</button></div>').join("")+
 '<div class="actions"><button class="v7confirm" data-i="'+i+'" '+(o.stage!==0?'disabled':'')+'>Potvrdiť objednávku</button><button class="v7start" data-i="'+i+'" '+(o.stage!==1?'disabled':'')+'>Začať výrobu</button><button class="v7ready" data-i="'+i+'" '+(o.stage!==2||o.items.some(x=>(x.done||0)<x.qty)?'disabled':'')+'>Pripravená na expedíciu</button><button class="v7print" data-i="'+i+'">Tlačiť súhrn / PDF</button></div><p class="muted">Výrobný list a objednávka skla: čakajú na presné napojenie Excelovej logiky. E-mail sa zatiaľ neodosiela.</p>';
 el.querySelector(".v7confirm").onclick=()=>{o.stage=1;renderNewOrders();openV7(i)};
 el.querySelector(".v7start").onclick=()=>{o.stage=2;renderNewOrders();openV7(i)};
 el.querySelector(".v7ready").onclick=()=>{o.stage=3;o.notice="Objednávka "+o.id+" je pripravená na vyzdvihnutie / expedíciu.";renderNewOrders();openV7(i);alert("Testovacia notifikácia pre XY: "+o.notice)};
 el.querySelector(".v7print").onclick=()=>printV7(i);
 el.querySelectorAll(".v7finish").forEach(b=>b.onclick=()=>{let x=o.items[+b.dataset.j];if(o.stage<2){alert("Najprv klikni Potvrdiť objednávku a potom Začať výrobu. Až následne môže QR potvrdiť dokončenie.");return}if(x.done>=x.qty){alert("Táto pozícia je už dokončená.");return}if(confirm("QR načítaný: "+o.id+" / pozícia "+x.pos+"\\nPotvrdiť dokončenie 1 ks?")){x.done++;renderNewOrders();openV7(i);let d=$("#v7detail-"+i);d.insertAdjacentHTML("afterbegin",'<div class="note">✓ QR simulácia: dokončenie pozície '+safe(x.pos)+' bolo zaznamenané.</div>')}});
}
function printV7(i){let o=submittedOrders[i],body=$("#v7PrintArea");body.innerHTML='<h1>LANGAS · Súhrn objednávky</h1><h2>'+safe(o.id)+'</h2><p>Odberateľ: '+safe(o.customer)+' · Zákazka: '+safe(o.name)+' · Dátum: '+safe(o.time)+'</p>'+o.items.map(x=>'<div class="v7position"><h3>Pozícia '+safe(x.pos)+' · '+sysLabel(x.d)+' · '+safe(x.qty)+' ks</h3>'+positionDrawing(x)+'<p>'+safe(x.w)+' × '+safe(x.h)+' mm · '+safe(x.glass)+' · '+safe(x.color)+' · '+safe(x.side)+'</p></div>').join('')+'<p>Pracovný súhrn – NIE výrobný list.</p>';window.print()}
$("#sendOrder").onclick=()=>{if(!onlineOrders.length)return alert("Najprv pridaj systém.");let id="TEST-"+new Date().getFullYear()+"-"+String(submittedOrders.length+1).padStart(4,"0");submittedOrders.unshift({id,customer:"XY",name:$("#ordName").value,time:new Date().toLocaleString("sk-SK"),stage:0,items:structuredClone(onlineOrders).map(x=>({...x,done:0}))});$("#orderMsg").innerHTML='<div class="note"><b>'+id+' odoslaná.</b> Otvor Nové objednávky a vyskúšaj schvaľovanie aj výrobu.</div>';onlineOrders=[];renderOnlineOrders();renderNewOrders()};
syncCards();drawOrderPreview();renderOnlineOrders();renderNewOrders();
bindFilters();render();checkGut();syncLengthMode();
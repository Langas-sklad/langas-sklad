const D=window.DATA;let P=structuredClone(D.stock),C=structuredClone(D.cuts),H=[],stockSystem="all",cutSystem="all";const $=s=>document.querySelector(s),findP=c=>P.find(x=>x.code===c);C.forEach(x=>{let p=findP(x.code);if(p){x.system=x.system||p.system||"Nezaradené";x.color=x.color||p.color}});
function show(id){document.querySelectorAll("main>section").forEach(x=>x.classList.add("hidden"));$("#"+id).classList.remove("hidden");document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("active",x.dataset.p===id));scrollTo(0,0)}document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>show(b.dataset.p));$("#printBtn").onclick=()=>print();
function render(){$("#bars").textContent=P.reduce((a,x)=>a+x.qty,0);$("#cutCount").textContent=C.filter(x=>x.status==="DOSTUPNÝ").reduce((a,x)=>a+x.qty,0);$("#moves").textContent=H.length;$("#stockT").innerHTML='<table><tr><th>Kód</th><th>Názov</th><th>Farba</th><th>Dĺžka</th><th>Ks</th></tr>'+P.filter(x=>stockSystem==="all"||x.system===stockSystem).map(x=>`<tr><td><b>${x.code}</b></td><td>${x.name}</td><td>${x.color}</td><td>${x.length}</td><td>${x.qty}</td></tr>`).join('')+'</table>';$("#cutsT").innerHTML='<table><tr><th>ID</th><th>Profil</th><th>Dĺžka</th><th>Ks</th><th>Stav</th></tr>'+C.filter(x=>cutSystem==="all"||x.system===cutSystem).map(x=>`<tr><td>${x.id}</td><td>${x.code}</td><td>${x.length}</td><td>${x.qty}</td><td>${x.status}</td></tr>`).join('')+'</table>';$("#histT").innerHTML=H.length?'<table><tr><th>Čas</th><th>Typ</th><th>Profil</th><th>Farba</th><th>Ks</th><th>Dĺžka</th><th>Zákazka</th><th>Akcia</th></tr>'+H.map((x,i)=>`<tr><td>${x.time}</td><td>${x.type}</td><td>${x.code}</td><td>${x.color||"—"}</td><td>${x.qty}</td><td>${x.length}</td><td>${x.job}</td><td>${x.cancelled?'<span class="muted">ZRUŠENÉ</span>':'<button class="gray cancelMove" data-i="'+i+'">Zrušiť</button>'}</td></tr>`).join('')+'</table>':'Bez pohybov.';setTimeout(()=>document.querySelectorAll(".cancelMove").forEach(b=>b.onclick=()=>cancelMovement(+b.dataset.i)),0);$("#jobT").innerHTML='<table><tr><th>Profil</th><th>Názov</th><th>Dĺžka</th><th>Ks</th></tr>'+D.famus.map(x=>`<tr><td>${x.code}</td><td>${x.name}</td><td>${x.length}</td><td>${x.qty}</td></tr>`).join('')+'</table>'}
function normalizeColor(s){return String(s||"").toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^A-Z0-9]/g,"")}function bindFilters(){document.querySelectorAll(".sys").forEach(b=>b.onclick=()=>{stockSystem=b.dataset.system;document.querySelectorAll(".sys").forEach(x=>x.classList.toggle("activeSys",x===b));render()});document.querySelectorAll(".sysCut").forEach(b=>b.onclick=()=>{cutSystem=b.dataset.system;document.querySelectorAll(".sysCut").forEach(x=>x.classList.toggle("activeSys",x===b));render()});document.querySelectorAll(".module").forEach(b=>b.onclick=()=>{document.querySelectorAll(".module").forEach(x=>x.classList.toggle("activeModule",x===b));show(b.dataset.target)})}\nfunction parseCode(s){let a=s.trim().split("|");return a.length===3&&a[0]==="LANGAS"?{code:a[1],color:a[2]}:null}function addCut(p,len,qty){C.push({id:"ODR-"+String(C.length+1).padStart(3,"0"),code:p.code,color:p.color,length:len,qty,status:"DOSTUPNÝ"})}
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
function makePrint(){let g=document.querySelector('input[name="gut"]:checked').value==="custom"?[...document.querySelectorAll(".glen")].map(x=>+x.value):[4000,4000,3992];$("#printBody").innerHTML=D.famus.map(x=>`<h3>${x.code} – ${x.name}</h3><p>${x.qty} × ${x.length} mm</p>`).join('')+`<h3>W.2309 – delenie žľabu</h3><p>${g.join(" + ")} mm</p>`;show("print")}bindFilters();render();checkGut();syncLengthMode();
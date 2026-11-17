"use strict";
const KEY="ckp.v2";
function load(){try{const d=JSON.parse(localStorage.getItem(KEY));if(d)return d;const o=JSON.parse(localStorage.getItem("ckm.v1"));if(o)return{set:{},costs:o.costs||{},custom:[],hist:[],sel:{}};}catch(e){}return{}}
function persist(){try{localStorage.setItem(KEY,JSON.stringify(state))}catch(e){}}
const state=Object.assign({set:{},costs:{},kgs:{},dims:{},feeOv:{},custom:[],hist:[],sel:{mkt:"amazon",pid:"500-S",ch:"es",sp:2199,coupon:0,ov:{}}},load());
state.feeOv=state.feeOv||{};state.feeMap=state.feeMap||{};state.feeNew=state.feeNew||[];state.dims=state.dims||{};
state.supp=state.supp||JSON.parse(JSON.stringify(SUPPSEED));
state.supp.sizes=state.supp.sizes||SUPPSEED.sizes.slice();
state.supp.lines=state.supp.lines||[];
state.misc=state.misc||[];state.fkMap=state.fkMap||{};
state.rateMap=state.rateMap||Object.assign({},RATESEED);
if(!state.m150){state.rateMap=Object.assign({},RATESEED,state.rateMap);state.m150=1}
state.pk=Object.assign({pid:"500-D",ch:"es",unit:"cm",wunit:"kg"},state.pk||{});
state.sel=Object.assign({mkt:"amazon",pid:"500-S",ch:"es",fch:"nfbf",zone:"national",sp:2199,coupon:0,ov:{}},state.sel||{});
const S=()=>Object.assign({},DEFAULTS,state.set);

function products(){return CATALOG.map(p=>Object.assign({},p)).concat(state.custom.map(p=>Object.assign({},p,{custom:true})))}
function getP(id){return products().find(p=>p.id===id)||products()[0]}
function sizeKey(sz){return String(sz==null?"":sz).trim().split(/\s+/)[0]}
function suppLine(id){return (state.supp.lines||[]).find(x=>x.id===id)||null}
function suppRate(p){
  const id=state.rateMap&&state.rateMap[p.line];if(!id)return null;
  const ln=suppLine(id);if(!ln||!ln.r)return null;
  const v=ln.r[sizeKey(p.size)];
  return (v==null||v==="")?null:+v;
}
function suppGross(r){return Math.round(r*(1+(+state.supp.gst||0)/100))}
function autoCost(p,s){if(p.cost!=null)return +p.cost;
  const r=suppRate(p);return r!=null?suppGross(r):0}
function hasCost(p){return state.costs[p.id]!=null||p.cost!=null||suppRate(p)!=null}
function costOf(p,s){return state.costs[p.id]!=null?+state.costs[p.id]:autoCost(p,s)}
function kgOf(p){return state.kgs[p.id]!=null?+state.kgs[p.id]:(p.kg||3)}
function feeIdOf(p){return (state.feeMap&&state.feeMap[p.id])||p.fee||CATFEE[p.cat]||"other"}
function feecats(){return FEECATS.concat(FKCATS).concat(state.feeNew||[])}
function amzCats(){return feecats().filter(f=>f.mkt!=="flipkart")}
function fkCats(){return feecats().filter(f=>f.mkt==="flipkart")}
function fkIdOf(p){return (state.fkMap&&state.fkMap[p.id])||CATFK[p.cat]||"fk_blanket"}
function feeCat(id){const a=feecats();return a.find(f=>f.id===id)||a[0]}
function feeBands(id){const o=state.feeOv&&state.feeOv[id];return (o&&o.length)?o:feeCat(id).bands.map(b=>b.slice())}
function topPct(id){const b=feeBands(id);return b.length?b[b.length-1][1]:0}

function slab(kg,w1,w2,w3,w4,w5){kg=Math.max(0.5,Math.ceil(kg*2)/2);if(kg<=0.5)return w1;if(kg<=1)return w2;if(kg<=2)return w3;if(kg<=5)return w3+w4*Math.ceil(kg-2);return w3+w4*3+w5*Math.ceil(kg-5)}
const U={cm:1,in:2.54,mm:0.1,ft:30.48}, UW={kg:1,g:0.001,lb:0.45359237}, UDP={cm:1,mm:0,in:1,ft:2};
function uf(){return U[state.pk.unit]||1}
function uwf(){return UW[state.pk.wunit]||1}
function toCm(v){return (+v||0)*uf()}
function du(cm){return +(cm/uf()).toFixed(UDP[state.pk.unit]!=null?UDP[state.pk.unit]:1)}
function dw(kg){return +(kg/uwf()).toFixed(state.pk.wunit==="g"?0:state.pk.wunit==="lb"?2:2)}
function billedKg(kg){return Math.max(0.5,Math.ceil(kg*2)/2)}
function volKg(l,b,h){return (+l||0)*(+b||0)*(+h||0)/5000}
function shipFee(kg,ch,s){s=s||S();
  if(ch==="fk")return fkRevShip(kg,"national",1500,s);
  return ch==="fba"?Math.round(slab(kg,s.fbaW1,s.fbaW2,s.fbaW3,s.fbaW4,s.fbaW5)*s.fbaCal)
                   :Math.round(slab(kg,s.esW1,s.esW2,s.esW3,s.esW4,s.esW5)*s.esCal)}
function fkPct(p,price){const bs=feeBands(fkIdOf(p));
  for(let i=0;i<bs.length;i++){const t=bs[i][0];if(t==null||price<=+t)return +bs[i][1]||0}
  return bs.length?+bs[bs.length-1][1]||0:0}
function fkFixed(price,p,s){s=s||S();const id=fkIdOf(p);let base;
  if(id==="fk_blanket")base=price<=1500?0:+s.fkFixB1500||0;
  else if(id==="fk_pillow")base=price<=500?0:price<=1000?+s.fkFixO500||0:price<=1500?+s.fkFixO1000||0:+s.fkFixO1500||0;
  else base=price<=1000?0:price<=1500?+s.fkFixO1000||0:+s.fkFixO1500||0;
  return Math.max(0,Math.round(base+(+s.fkTier||0)))}
function fkPick(kg,s){s=s||S();return Math.round((+s.fkPick1||0)+(+s.fkPickKg||0)*Math.max(0,Math.ceil(kg-1)))}
function fkRevShip(kg,zone,price,s){s=s||S();const z=zone==="local"?0:zone==="zonal"?1:2;
  const T=price<=500?FKREV.lo:price<=1000?FKREV.mid:FKREV.hi;
  let v;
  if(kg<=0.5)v=T.b[0][z];else if(kg<=1)v=T.b[1][z];else if(kg<=1.5)v=T.b[2][z];else if(kg<=2)v=T.b[3][z];
  else if(kg<=3)v=T.b[4][z]+FKREV.add.half[z]*Math.ceil((kg-2)/0.5);
  else if(kg<=12)v=T.b[5][z]+FKREV.add.kg[z]*Math.ceil(kg-3);
  else v=T.b[6][z]+FKREV.add.big[z]*Math.ceil(kg-12);
  return Math.round(v*(+s.fkRevCal||1))}
const ZONE={local:"Local",zonal:"Zonal",national:"National"};
function chanName(mkt,ch){
  if(mkt==="amazon")return "Amazon "+(CH[ch]||"");
  if(mkt==="flipkart"){const [f,z]=String(ch||"").split("-");return "Flipkart "+(f==="fbf"?"FBF":"NFBF")+" \u00b7 "+(ZONE[z]||"National")}
  return "Own website";
}
function boxGuess(kg){const V=Math.max(1,kg)*5000,h=Math.cbrt(V/3.1);
  return [+(2*h).toFixed(1),+(1.55*h).toFixed(1),+h.toFixed(1)]}
function cheaperTiers(curKg,floorKg,ch,s){
  const cur=shipFee(curKg,ch,s),out=[];let last=cur;
  for(let t=billedKg(curKg)-0.5;t>=Math.max(0.5,billedKg(floorKg));t-=0.5){
    const f=shipFee(t,ch,s);
    if(f<last){out.push({kg:t,fee:f,save:cur-f});last=f}
    if(out.length>=3)break;
  }
  return out;
}
function closing(ch,price,s){const b=price<=300?1:price<=500?2:price<=1000?3:4;return s[(ch==="es"?"closeES_":ch==="fba"?"closeFBA_":"closeSelf_")+b]}
function refPct(p,price){const bs=feeBands(feeIdOf(p));
  for(let i=0;i<bs.length;i++){const t=bs[i][0];if(t==null||price<=+t)return +bs[i][1]||0}
  return bs.length?+bs[bs.length-1][1]||0:0}
function defaultLines(p,ch,mkt,eff,s){
  const kg=kgOf(p), L=[];
  if(mkt==="amazon"){
    L.push({k:"ref",label:"Amazon referral fee",sub:feeCat(feeIdOf(p)).short+" · % or ₹",type:"pct",val:refPct(p,eff),gstable:true});
    L.push({k:"close",label:"Closing fee",sub:ch==="es"?"Easy Ship":ch==="fba"?"FBA":"Self Ship",type:"amt",val:closing(ch,eff,s),gstable:true});
    if(ch==="es") L.push({k:"ship",label:"Easy Ship weight handling",sub:kg+" kg chargeable · ex-GST",type:"amt",val:Math.round(slab(kg,s.esW1,s.esW2,s.esW3,s.esW4,s.esW5)*s.esCal),gstable:true});
    else if(ch==="fba"){
      L.push({k:"ship",label:"FBA weight handling",sub:kg+" kg · national · ex-GST",type:"amt",val:Math.round(slab(kg,s.fbaW1,s.fbaW2,s.fbaW3,s.fbaW4,s.fbaW5)*s.fbaCal),gstable:true});
      L.push({k:"pick",label:"FBA pick & pack",sub:"ex-GST",type:"amt",val:Math.round(s.fbaPick+s.fbaPickKg*Math.max(0,Math.ceil(kg)-1)),gstable:true});
      L.push({k:"store",label:"FBA storage per unit",sub:"ex-GST",type:"amt",val:s.fbaStore,gstable:true});
    } else L.push({k:"ship",label:"Your courier",sub:"incl. GST",type:"amt",val:s.selfShip||Math.round(slab(kg,s.esW1,s.esW2,s.esW3,s.esW4,s.esW5)*s.esCal*1.18),gstable:true,incl:true});
    if(ch!=="fba") L.push({k:"pack",label:"Packaging",sub:"incl. GST",type:"amt",val:s.pack,gstable:true,incl:true});
    L.push({k:"ads",label:"Advertising",sub:"% or ₹ per unit",type:"pct",val:s.amzAds,gstable:true});
    L.push({k:"ret",label:"Returns / damage allowance",sub:"% or ₹ per unit",type:"pct",val:s.amzRet});
  } else if(mkt==="flipkart"){
    const [fch,zone]=String(ch||"nfbf-national").split("-"), fbf=fch==="fbf";
    const fixed=fkFixed(eff,p,s), pick=fbf?fkPick(kg,s):0, rev=fkRevShip(kg,zone,eff,s);
    L.push({k:"fkc",label:"Flipkart commission",sub:feeCat(fkIdOf(p)).short+" · % or ₹",type:"pct",val:fkPct(p,eff),gstable:true});
    L.push({k:"fkfix",label:"Fixed fee",sub:(s.fkTier>0?"Bronze tier":"Silver / Gold tier")+" · covers delivery",type:"amt",val:fixed,gstable:true});
    if(+s.fkShipFlat>0)L.push({k:"ship",label:"Flipkart shipping",sub:"per order · ex-GST",type:"amt",val:+s.fkShipFlat,gstable:true});
    if(fbf){
      L.push({k:"pick",label:"FBF pick & pack",sub:kg+" kg · ex-GST",type:"amt",val:pick,gstable:true});
      if(+s.fkStore>0)L.push({k:"store",label:"FBF storage per unit",sub:"ex-GST",type:"amt",val:+s.fkStore,gstable:true});
    } else L.push({k:"pack",label:"Packaging",sub:"incl. GST",type:"amt",val:s.pack,gstable:true,incl:true});
    if(+s.fkCodFee>0)L.push({k:"fkcol",label:"Collection fee",sub:"% or ₹",type:"pct",val:+s.fkCodFee,gstable:true});
    L.push({k:"ads",label:"Advertising",sub:"% or ₹ per unit",type:"pct",val:s.fkAds,gstable:true});
    const perRet=rev+fixed+(fbf?pick:(+s.pack||0));
    L.push({k:"fkret",label:"Customer returns",sub:"% of orders · each costs ₹"+perRet.toLocaleString("en-IN")+" ("+(ZONE[zone]||"National")+" pickup ₹"+rev.toLocaleString("en-IN")+")",type:"pct",val:+s.fkRetRate||0,special:"fkret",base:perRet});
  } else {
    L.push({k:"gw",label:"Payment gateway",sub:"% or ₹",type:"pct",val:s.gw,gstable:true});
    L.push({k:"ship",label:"Courier",sub:kg+" kg · incl. GST",type:"amt",val:Math.round(slab(kg,s.esW1,s.esW2,s.esW3,s.esW4,s.esW5)*s.esCal*1.18),gstable:true,incl:true});
    L.push({k:"pack",label:"Packaging",sub:"incl. GST",type:"amt",val:s.pack,gstable:true,incl:true});
    L.push({k:"rto",label:"RTO loss",sub:"% of orders returned undelivered",type:"pct",val:s.rto,special:"rto"});
    L.push({k:"ads",label:"Advertising",sub:"% or ₹ per unit",type:"pct",val:s.webAds,gstable:true});
  }
  (state.misc||[]).forEach(x=>{
    const pctType=x.type==="pct";
    L.push({k:"m"+x.id,label:x.name||"Other expense",
      sub:(pctType?"% of price":"₹ per unit")+(x.gst?" · incl. GST":" · no GST"),
      type:pctType?"pct":"amt",val:+x.val||0,gstable:!!x.gst,incl:!pctType&&!!x.gst});
  });
  return L;
}
function gstView(p,ch,mkt,sp,coupon,ov,s,r){
  s=s||S(); r=r||calc(p,ch,mkt,sp,coupon,ov,s);
  const sg=+s.supGst||0, items=[];
  if(r.cost)items.push({label:"Purchase from supplier",gst:r.cost-r.cost/(1+sg/100),rate:sg});
  r.lines.forEach(l=>{
    if(l.type==="cost"||l.special==="rto"||l.special==="fkret"||!l.gstable)return;
    const g=l.type==="pct"?r.eff*l.val/100*0.18:(l.incl?l.val-l.val/1.18:l.val*0.18);
    if(g)items.push({label:l.label,gst:g,rate:18});
  });
  const input=items.reduce((t,x)=>t+x.gst,0);
  return {pays:r.eff+r.extra,rate:r.gstR*100,out:r.outGst,items,input,
    claimed:!!s.itc,net:r.outGst-(s.itc?input:0)};
}
function calc(p,ch,mkt,sp,coupon,ov,s){
  s=s||S(); ov=ov||{};
  const eff=Math.max(0,sp-(coupon||0));
  const extra=mkt==="web"?(+s.webShip||0):0;
  const gstR=(ov.gstPct!=null?+ov.gstPct:(eff<=s.gstLine?s.gstLow:s.gstHigh))/100;
  const net=eff/(1+gstR)+extra/1.18;
  const m=s.itc?1:1.18;
  const cost=ov.cost!=null?+ov.cost:costOf(p,s);
  const costUsed=s.itc?cost/(1+s.supGst/100):cost;
  const lines=defaultLines(p,ch,mkt,eff,s).map(l=>{const o=ov[l.k];return Object.assign({},l,{val:o!=null?+o:l.val,edited:o!=null})});
  const out=[{k:"cost",label:"Purchase cost",sub:s.itc?"ex-GST (ITC claimed)":"incl. supplier GST",amt:costUsed,edited:ov.cost!=null,type:"cost",val:cost}];
  let ship=0,pack=0;
  lines.forEach(l=>{
    let a=0;
    if(l.type==="pct"&&!l.special){a=eff*l.val/100*(l.gstable?m:1);l=Object.assign({},l,{mul:l.gstable?m:1})}
    else if(l.type==="amt") a=l.incl?l.val/1.18*m:l.val*m;
    if(l.k==="ship")ship=a; if(l.k==="pack")pack=a;
    if(l.special==="rto"){const r=Math.min(l.val,95)/100;a=r/(1-r)*(2*ship+pack)}
    if(l.special==="fkret")a=l.val/100*(+l.base||0);
    out.push(Object.assign({},l,{amt:a}));
  });
  const costs=out.reduce((t,l)=>t+l.amt,0), profit=net-costs;
  return {eff,gstR,gstEdited:ov.gstPct!=null,net,outGst:eff+extra-net,extra,lines:out,profit,margin:eff?profit/eff:0,cost};
}
function priceFor(p,ch,mkt,coupon,target,ov,s){
  for(let sp=Math.max(1,(coupon||0)+1);sp<=25000;sp+=1){
    const r=calc(p,ch,mkt,sp,coupon,ov,s);
    if(target==null?r.profit>=0:r.margin>=target)return sp;
  }
  return null;
}

const $=id=>document.getElementById(id);
const rs=n=>(n<0?"−₹":"₹")+Math.abs(Math.round(n)).toLocaleString("en-IN");
const pct=n=>(n*100).toFixed(1)+"%";
const esc=t=>String(t==null?"":t).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const tone=m=>m>=0.2?"good":m>=0.1?"warn":"bad";
function toast(t){const e=$("toast");e.textContent=t;e.classList.add("show");clearTimeout(e._t);e._t=setTimeout(()=>e.classList.remove("show"),2000)}
const MKT={amazon:"Amazon",flipkart:"Flipkart",web:"Own website"};
const CH={es:"Easy Ship",fba:"FBA",self:"Self Ship"};
const ICON={
  amazon:'<svg viewBox="0 0 24 24" fill="none"><path d="M3 16c4.5 3.5 12.5 3.6 18 .3" stroke="#f90" stroke-width="2" stroke-linecap="round"/><path d="M19.5 15.2l1.8.3-.6 1.8" stroke="#f90" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 6.5c.6-1.3 2-2 3.6-2 2.3 0 3.4 1.2 3.4 3.3v3.4c0 .7.1 1.1.4 1.5l-2.2.9c-.3-.4-.5-.8-.6-1.2-.8.9-1.8 1.3-3 1.3-1.9 0-3.1-1.1-3.1-2.8 0-2.2 1.9-3 5.8-3.2v-.3c0-1.1-.5-1.5-1.4-1.5-.8 0-1.3.4-1.5 1.1z" fill="currentColor"/></svg>',
  flipkart:'<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="3" fill="#2874f0"/><path d="M9 7h7l-.6 2.6H11l-.5 2.2h4.3l-.6 2.6H9.9L9 17.5H6.3z" fill="#ffe500"/></svg>',
  web:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18"/></svg>'
};
function chForMkt(){const m=state.sel.mkt;return m==="amazon"?state.sel.ch:m==="flipkart"?(state.sel.fch||"nfbf")+"-"+(state.sel.zone||"national"):"web"}

function fillSelect(el,opts,val){el.innerHTML=opts.map(o=>`<option value="${o[0]}" ${o[0]===val?"selected":""}>${o[1]}</option>`).join("")}
function renderPicker(){
  const ps=products(),cur=getP(state.sel.pid);
  const cats=[...new Set(ps.map(p=>p.cat))];
  fillSelect($("cat"),cats.map(c=>[c,c]),cur.cat);
  const lines=[...new Set(ps.filter(p=>p.cat===cur.cat).map(p=>p.line))];
  fillSelect($("line"),lines.map(l=>[l,l]),cur.line);
  fillSelect($("size"),ps.filter(p=>p.cat===cur.cat&&p.line===cur.line).map(p=>[p.id,p.size]),cur.id);
  $("mkt").value=state.sel.mkt; $("mktIcon").innerHTML=ICON[state.sel.mkt];
  $("fulfilWrap").hidden=state.sel.mkt!=="amazon";
  $("fkWrap").hidden=state.sel.mkt!=="flipkart";
  document.querySelectorAll("#chSeg button").forEach(b=>b.setAttribute("aria-pressed",b.dataset.ch===state.sel.ch));
  document.querySelectorAll("#fkSeg button").forEach(b=>b.setAttribute("aria-pressed",b.dataset.fch===(state.sel.fch||"nfbf")));
  document.querySelectorAll("#zoneSeg button").forEach(b=>b.setAttribute("aria-pressed",b.dataset.zone===(state.sel.zone||"national")));
}
let lastSig="";
function paintLines(r){
  const q=k=>document.querySelector('#breakdown [data-row="'+k+'"]');
  const act=document.activeElement;
  const pays=q("pays");if(pays){pays.querySelector(".k").textContent="Customer pays"+(r.extra?" (incl. \u20b9"+r.extra+" shipping)":"");
    const pi=pays.querySelector("[data-pays]");if(pi&&pi!==act)pi.value=Math.round(r.eff+r.extra)}
  const g=q("gst");if(g){g.querySelector(".k").innerHTML="Product GST"+(r.extra?" + 18% on shipping":"")+"<small>collected for government</small>";
    const gi=g.querySelector("[data-gstpct]");if(gi){if(gi!==act)gi.value=+(r.gstR*100).toFixed(2);gi.classList.toggle("ov",!!r.gstEdited)}
    g.querySelector(".v").textContent="\u2212"+rs(r.outGst)}
  const nt=q("net");if(nt)nt.querySelector(".v").innerHTML="<b>"+rs(r.net)+"</b>";
  r.lines.forEach(l=>{
    const row=q(l.k);if(!row)return;
    const lb=row.querySelector("[data-lab]");if(lb)lb.textContent=l.label;
    const sm=row.querySelector("small");if(sm)sm.textContent=l.sub;
    const vs=row.querySelector(".v");if(vs)vs.textContent="\u2212"+rs(l.amt);
    if(l.mul!=null)row.dataset.mul=l.mul;
    const inp=row.querySelector("[data-ov]");
    if(inp){if(inp!==act)inp.value=+l.val.toFixed(2);inp.classList.toggle("ov",!!l.edited)}
    const amtInp=row.querySelector("[data-amt]");
    if(amtInp){if(amtInp!==act)amtInp.value=Math.round(l.amt);amtInp.classList.toggle("ov",!!l.edited)}
    const ci=row.querySelector("[data-cost2]");
    if(ci){if(ci!==act)ci.value=Math.round(l.val);ci.classList.toggle("ov",!!l.edited)}
  });
  const pr=q("profit");if(pr)pr.querySelector(".v").textContent=rs(r.profit);
}
function renderCalc(){
  const p=getP(state.sel.pid),s=S(),{sp,coupon,ov,mkt}=state.sel,ch=chForMkt();
  const act=document.activeElement;
  if($("sp")!==act)$("sp").value=sp;
  if($("coupon")!==act)$("coupon").value=coupon;
  const cost=ov.cost!=null?+ov.cost:costOf(p,s);
  if($("cost")!==act)$("cost").value=cost;
  $("cost").classList.toggle("ov",ov.cost!=null);
  const sr=suppRate(p);
  const status=ov.cost!=null?"Edited for this calculation."
    :state.costs[p.id]!=null?"Your saved rate for this product."
    :sr!=null?("Supplier rate ₹"+sr.toLocaleString("en-IN")+(+state.supp.gst?" + "+(+state.supp.gst)+"% GST = ₹"+suppGross(sr).toLocaleString("en-IN"):"")+". Change it on the Products tab.")
    :"No supplier rate for this product yet. Type what you pay for it — until then the profit below is wrong.";
  $("costHint").textContent=status+" "+(p.web?`Razzai website ₹${p.web.toLocaleString("en-IN")}${p.mrp?" (MRP ₹"+p.mrp.toLocaleString("en-IN")+")":""}. `:p.own?`Your store price ₹${p.own.toLocaleString("en-IN")}. `:"")+"Type a different number to override; save it permanently from the Products tab.";
  const q=[];
  if(p.ref)q.push(["Razzai on Amazon",p.ref]);
  if(p.mkt)q.push(["Market median",p.mkt]);
  if(p.web)q.push(["Razzai website",p.web]);
  if(p.own)q.push(["Your website",p.own]);
  $("quick").innerHTML=q.map(([l,v])=>`<button data-sp="${v}">${l} ₹${v.toLocaleString("en-IN")}</button>`).join("");

  const r=calc(p,ch,mkt,sp,coupon,ov,s),t=tone(r.margin);
  const v=$("verdict");v.className="verdict "+t;
  const word={good:"Healthy",warn:"Thin",bad:r.profit<0?"Loss":"Very thin"}[t];
  v.innerHTML=`<div class="label">Profit per unit</div><div class="big">${rs(r.profit)}</div>
    <div class="meta"><span class="pill ${t}">${word} · ${pct(r.margin)} margin</span><span>${p.line} · ${p.size}</span><span>${chanName(mkt,ch)}</span>`+
    (hasCost(p)||ov.cost!=null?"":`<span class="pill bad">Purchase cost not set</span>`)+`</div>`;
  const be=priceFor(p,ch,mkt,coupon,null,ov,s),f1=priceFor(p,ch,mkt,coupon,s.tMargin1/100,ov,s),f2=priceFor(p,ch,mkt,coupon,s.tMargin2/100,ov,s);
  $("sFloorL").textContent=`Price for ${s.tMargin1}%`;$("sGoodL").textContent=`Price for ${s.tMargin2}%`;
  $("sBE").textContent=be?rs(be):"–";$("sFloor").textContent=f1?rs(f1):"–";$("sGood").textContent=f2?rs(f2):"–";
  const bits=[];
  if(p.ref)bits.push(`Razzai sells this on Amazon at about ${rs(p.ref)} (colour-grid median)${mkt==="amazon"&&!coupon?" and usually runs a ₹250–300 coupon":""}.`);
  if(p.mkt)bits.push(`Market median ${rs(p.mkt)}.`);
  if(r.eff>s.gstLine&&r.eff-s.gstLine<=400)bits.push(`Price is just above the ₹${s.gstLine.toLocaleString("en-IN")} GST line, so 18% applies. Try ₹${(s.gstLine-1).toLocaleString("en-IN")}.`);
  if(p.note)bits.push(p.note+".");
  if(p.estKg)bits.push(`Shipping weight ${kgOf(p)} kg is an estimate; set the real chargeable weight in Products.`);
  $("compareHint").textContent=bits.join(" ");
  const ceye=document.querySelector('[data-eye="compareHint"]');if(ceye)ceye.hidden=!bits.length;

  const sig=mkt+"|"+ch+"|"+r.lines.map(l=>l.k).join(",");
  if(sig!==lastSig){
    let h=`<div class="bl ro" data-row="pays"><span class="k"></span><input type="number" inputmode="numeric" step="1" class="rev" data-pays="1" aria-label="Customer pays"></div>
      <div class="bl two" data-row="gst"><span class="k"></span><input type="number" inputmode="decimal" step="any" data-gstpct="1" aria-label="Product GST percent"><span class="v"></span></div>
      <div class="bl ro" data-row="net"><span class="k"><b>Net revenue</b></span><span class="v pos"></span></div>`;
    r.lines.forEach(l=>{
      if(l.type==="cost"){h+=`<div class="bl wide" data-row="cost"><span class="k">Purchase cost<small></small></span><input type="number" inputmode="numeric" step="1" data-cost2="1" aria-label="Purchase cost"><span class="v"></span></div>`;return}
      const two=l.type==="pct"&&!l.special;
      h+=`<div class="bl${two?" two":""}" data-row="${l.k}"><span class="k"><span data-lab></span><small></small></span><input type="number" inputmode="decimal" step="any" data-ov="${l.k}" aria-label="${l.label} percent">`+
         (two?`<input type="number" inputmode="decimal" step="1" class="amt" data-amt="${l.k}" aria-label="${l.label} amount">`:`<span class="v"></span>`)+`</div>`;
    });
    h+=`<div class="bl ro tot" data-row="profit"><span class="k">Profit per unit</span><span class="v"></span></div>`;
    $("breakdown").innerHTML=h; lastSig=sig;
  }
  paintLines(r);
  renderMisc();
  $("resetOv").hidden=!Object.keys(ov).length;
  $("gstHint").textContent=s.itc?"18% GST on marketplace fees, courier, packaging and ads is excluded because it returns as input tax credit.":"ITC is off: fees and courier are counted with their 18% GST.";
  $("waBtn").href="https://wa.me/?text="+encodeURIComponent(summaryText(r));
  renderHist();
}
function summaryText(r){
  const p=getP(state.sel.pid),s=S(),{sp,coupon,mkt}=state.sel,ch=chForMkt();
  const title=($("calcName")&&$("calcName").value.trim())||"";
  const SHORT={cost:"Purchase cost",ref:"Referral",close:"Closing fee",
    ship:mkt==="web"?"Courier":mkt==="flipkart"?"FK shipping":(ch==="es"?"Easy Ship":ch==="fba"?"FBA shipping":"Courier"),
    pick:"Pick & pack",store:mkt==="flipkart"?"FBF storage":"FBA storage",pack:"Packaging",ads:"Ads",ret:"Returns",
    gw:"Gateway",rto:"RTO loss",fkc:"Commission",fkfix:"Fixed fee",fkcol:"Collection",fkret:"Returns"};
  const num=v=>Math.abs(Math.round(v)).toLocaleString("en-IN");
  const amt=v=>(v<0?"\u2212\u20b9":"\u20b9")+num(v);
  const rows=[];
  if(coupon){rows.push(["Listed price",sp]);rows.push(["Coupon",-coupon])}
  rows.push(["Customer pays",r.eff+r.extra]);
  rows.push(["GST "+(+(r.gstR*100).toFixed(2))+"%"+(r.gstEdited?"*":""),-r.outGst]);
  rows.push(["Net revenue",r.net]);
  rows.push(null);
  r.lines.forEach(l=>{
    let lab=SHORT[l.k]||l.label;
    if(l.type==="pct")lab+=" "+(+l.val.toFixed(2))+"%";
    if(l.edited)lab+="*";
    rows.push([lab,-l.amt]);
  });
  rows.push(null);
  rows.push(["Profit",r.profit]);
  const real=rows.filter(Boolean);
  const L=Math.min(16,Math.max.apply(null,real.map(x=>x[0].length)));
  const W=Math.max.apply(null,real.map(x=>amt(x[1]).length));
  const fmt=x=>x?(x[0].length>L?x[0].slice(0,L):x[0]).padEnd(L)+" "+amt(x[1]).padStart(W)
               :"-".repeat(L+1+W);
  const block=rows.map(fmt).join("\n");
  const head=["*Comforter King \u00b7 Profit calculation*"];
  if(title)head.push("*"+title+"*");
  head.push(p.line+" \u00b7 "+p.size);
  head.push(chanName(mkt,ch));
  const foot=["*Profit "+amt(r.profit)+" per unit \u00b7 "+pct(r.margin)+" margin*"];
  const be=priceFor(p,ch,mkt,coupon,null,state.sel.ov,s);
  if(be)foot.push("Break-even price: "+amt(be));
  if(real.some(x=>x[0].indexOf("*")>=0))foot.push("* edited for this calculation");
  foot.push("","Fee category: "+feeCat(feeIdOf(p)).name,
    "ITC "+(s.itc?"claimed":"not claimed")+" \u00b7 supplier GST "+s.supGst+"% \u00b7 GST line \u20b9"+(+s.gstLine).toLocaleString("en-IN")+" \u00b7 billed weight "+kgOf(p)+" kg",
    new Date().toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})+" \u00b7 CK Profit Calculator");
  return head.join("\n")+"\n\n```\n"+block+"\n```\n\n"+foot.join("\n");
}
function renderHist(){
  const h=state.hist;$("histCard").hidden=!h.length;
  $("hist").innerHTML=h.map((x,i)=>{
    const sub=`${x.title?esc(x.name)+" · ":""}${x.chan} · ${rs(x.sp)}${x.coupon?" − "+rs(x.coupon)+" coupon":""} · ${x.date}`;
    const top=state.renIdx===i
      ? `<span style="grid-column:1/-1;display:flex;gap:6px;align-items:center"><input type="text" id="renIn" maxlength="60" value="${esc(x.title||"")}" placeholder="${esc(x.name)}"><button class="btn small" data-rendone="${i}">Done</button></span>`
      : `<span><b>${esc(x.title||x.name)}</b><br><small>${sub}</small></span>
         <span class="p" style="color:var(--${tone(x.margin)})">${rs(x.profit)}<br><small>${pct(x.margin)}</small></span>`;
    return `<div class="hrow">${top}<span style="grid-column:1/-1;display:flex;gap:6px"><button class="btn ghost tiny" data-load="${i}">Open</button><button class="btn ghost tiny" data-ren="${i}">Rename</button><button class="btn ghost tiny" data-del="${i}">Delete</button></span></div>`;
  }).join("");
}
function renderLadder(){
  const p=getP(state.sel.pid),s=S(),{coupon,sp,ov,mkt}=state.sel,ch=chForMkt();
  const m=mkt;
  $("ladTitle").textContent=`Price ladder · ${p.line} ${p.size} · ${chanName(m,ch)}`;
  const from=+$("lFrom").value||999,step=Math.max(10,+$("lStep").value||100);
  const set=new Set();for(let i=0;i<22;i++)set.add(from+i*step);set.add(sp);set.add(s.gstLine-1);
  $("ladBody").innerHTML=[...set].sort((a,b)=>a-b).map(x=>{const r=calc(p,ch,m,x,coupon,ov,s),t=tone(r.margin);
    const g=gstView(p,ch,m,x,coupon,ov,s,r);
    return `<tr class="${x===sp?"me":""}"><td>${rs(x)}</td><td>${rs(r.eff)}</td><td class="${t[0]}">${rs(r.profit)}</td><td class="${t[0]}">${pct(r.margin)}</td><td>${rs(g.net)}</td></tr>`}).join("");
  const zone=state.sel.zone||"national";
  const rows=[["amazon","es","Amazon Easy Ship"],["amazon","fba","Amazon FBA"],["amazon","self","Amazon Self Ship"],
    ["flipkart","nfbf-"+zone,"Flipkart NFBF · "+ZONE[zone]],["flipkart","fbf-"+zone,"Flipkart FBF · "+ZONE[zone]],["web","web","Own website"]];
  $("chBody").innerHTML=rows.map(([mk,c,n])=>{const r=calc(p,c,mk,sp,coupon,{},s),be=priceFor(p,c,mk,coupon,null,{},s),t=tone(r.margin);
    return `<tr class="${mk===m&&(mk==="web"||c===ch)?"me":""}"><td>${n}</td><td class="${t[0]}">${rs(r.profit)}</td><td class="${t[0]}">${pct(r.margin)}</td><td>${be?rs(be):"–"}</td></tr>`}).join("");
  renderGst();
}
function renderGst(){
  const p=getP(state.sel.pid),s=S(),{coupon,sp,ov,mkt}=state.sel,ch=chForMkt();
  const m=mkt;
  const g=gstView(p,ch,m,sp,coupon,ov,s);
  const owe=g.net>=0;
  $("gstTitle").textContent="GST at "+rs(g.pays);
  $("gNetL").textContent=owe?"Net GST to deposit":"Credit carried forward";
  $("gOut").textContent=rs(g.out);
  $("gIn").textContent=rs(g.claimed?g.input:0);
  $("gNet").textContent=rs(g.net);
  let h=`<div class="bl ro"><span class="k">Customer pays<small>${esc(p.line)} · ${esc(p.size)}</small></span><span class="v pos">${rs(g.pays)}</span></div>`+
    `<div class="bl ro"><span class="k">Output GST ${+g.rate.toFixed(2)}% collected<small>sits inside the price; never your money</small></span><span class="v pos">${rs(g.out)}</span></div>`+
    `<div class="bl ro" style="border-top:1px dashed var(--stitch);padding-top:8px"><span class="k"><b>Input GST already paid${g.claimed?" − claimed back as credit":""}</b></span><span class="v pos"></span></div>`;
  g.items.forEach(x=>{h+=`<div class="bl ro"><span class="k">${esc(x.label)}<small>${+(+x.rate).toFixed(2)}%</small></span><span class="v pos">${rs(x.gst)}</span></div>`});
  if(!g.items.length)h+=`<div class="hint">Nothing with GST on it at this price.</div>`;
  h+=`<div class="bl ro tot"><span class="k">Total input GST</span><span class="v">${rs(g.input)}</span></div>`+
     `<div class="bl ro tot"><span class="k">${owe?"Net GST to deposit":"Unused credit, carried forward"}<small>${
       !g.claimed?"ITC is off in Settings, so you deposit the whole output GST and the input GST stays a cost"
       :owe?"output GST − input GST":"your input GST is larger than the GST collected at this price, so there is nothing to pay and the balance sits in your credit ledger for the next sale"
     }</small></span><span class="v">${rs(Math.abs(g.net))}</span></div>`;
  $("gstRows").innerHTML=h;
}
let lastSuppSig="";
function renderSupp(){
  const act=document.activeElement, sz=state.supp.sizes;
  const sig=state.supp.lines.map(l=>l.id).join(",")+"|"+sz.join(",");
  if(sig!==lastSuppSig){lastSuppSig=sig;$("suppForm").innerHTML=state.supp.lines.map(ln=>
    `<div class="rbox"><div class="rhead"><input type="text" maxlength="40" data-rname="${ln.id}" value="${esc(ln.name)}" aria-label="Rate line name">`+
    `<button data-rdel="${ln.id}" title="Remove this rate line">\u00d7</button></div>`+
    `<div class="rcols">`+sz.map(k=>
      `<label><span>${esc(k)}</span><input type="number" inputmode="numeric" step="any" min="0" data-rate="${ln.id}|${esc(k)}" value="${ln.r&&ln.r[k]!=null?ln.r[k]:""}" placeholder="\u2013"></label>`).join("")+
    `</div></div>`).join("")||`<div class="hint">No rate lines yet.</div>`;}
  state.supp.lines.forEach(ln=>{
    const ni=document.querySelector(`[data-rname="${ln.id}"]`);
    if(ni&&ni!==act)ni.value=ln.name;
    sz.forEach(k=>{const el=document.querySelector(`[data-rate="${ln.id}|${k}"]`);
      if(el&&el!==act)el.value=(ln.r&&ln.r[k]!=null)?ln.r[k]:""});
  });
  const on=+state.supp.gst>0;
  $("suppGstOn").checked=on;$("suppGstRow").hidden=!on;
  if($("suppGst")!==document.activeElement)$("suppGst").value=state.supp.gst||0;
}
let lastMiscSig=null;
function renderMisc(){
  const act=document.activeElement, ms=state.misc||[];
  const sig=ms.map(x=>x.id).join(",");
  if(sig!==lastMiscSig){lastMiscSig=sig;$("miscForm").innerHTML=ms.map(x=>
    `<div class="rbox"><div class="rhead"><input type="text" maxlength="40" data-mname="${x.id}" placeholder="e.g. Labour, transport to hub" value="${esc(x.name||"")}" aria-label="Expense name">`+
    `<button data-mdel="${x.id}" title="Remove this expense">\u00d7</button></div>`+
    `<div class="row3"><div class="field"><label for="mv-${x.id}">Amount</label><input id="mv-${x.id}" type="number" inputmode="decimal" step="any" min="0" data-mval="${x.id}"></div>`+
    `<div class="field"><label for="mt-${x.id}">Charged as</label><select id="mt-${x.id}" data-mtype="${x.id}"><option value="amt">\u20b9 per unit</option><option value="pct">% of price</option></select></div>`+
    `<div class="field"><label>&nbsp;</label><label class="chk" style="font-size:12.5px"><input type="checkbox" data-mgst="${x.id}"> GST paid</label></div></div></div>`).join("")
    ||`<div class="hint">Nothing added. Anything you pay per unit that is not already in the breakdown goes here \u2014 labour, transport to the hub, stitching, inserts, a photographer.</div>`;}
  ms.forEach(x=>{
    const n=document.querySelector(`[data-mname="${x.id}"]`);if(n&&n!==act)n.value=x.name||"";
    const v=document.querySelector(`[data-mval="${x.id}"]`);if(v&&v!==act)v.value=x.val==null?"":x.val;
    const t=document.querySelector(`[data-mtype="${x.id}"]`);if(t)t.value=x.type==="pct"?"pct":"amt";
    const c=document.querySelector(`[data-mgst="${x.id}"]`);if(c)c.checked=!!x.gst;
  });
}
function renderProducts(){
  renderSupp();
  const s=S();
  const ps=products(),cats=[...new Set(ps.map(p=>p.cat))];
  state.pcat=cats.includes(state.pcat)?state.pcat:cats[0];
  fillSelect($("pcat"),cats.map(c=>[c,c]),state.pcat);
  fillSelect($("nCat"),cats.map(c=>[c,c]),state.pcat);
  fillSelect($("nFee"),amzCats().map(f=>[f.id,f.short+"  ("+topPct(f.id)+"%)"]),CATFEE[state.pcat]||"other");
  const lines=[...new Set(ps.filter(p=>p.cat===state.pcat).map(p=>p.line))];
  $("prodList").innerHTML=lines.map(l=>{
    const items=ps.filter(p=>p.cat===state.pcat&&p.line===l);
    const fid=feeIdOf(items[0]),fkid=fkIdOf(items[0]);
    return `<details data-lid="${esc(l)}" ${(prodOpen.has(l)||lines.length===1)?"open":""}><summary>${esc(l)} <span class="tag">${items.length} sizes</span></summary><div class="in">`+
      `<div class="field"><label for="r-${items[0].id}">Supplier rate</label>`+
      `<select id="r-${items[0].id}" data-setrate="${esc(l)}">`+
      `<option value="">Not linked — set the cost on each size below</option>`+
      state.supp.lines.map(x=>`<option value="${x.id}" ${state.rateMap[l]===x.id?"selected":""}>${esc(x.name)}</option>`).join("")+`</select></div>`+
      `<div class="field"><label for="f-${items[0].id}">Amazon fee category <span class="unit">${topPct(fid)}% above ₹1,000</span></label>`+
      `<select id="f-${items[0].id}" data-setfee="${items.map(x=>x.id).join(",")}">`+
      amzCats().map(f=>`<option value="${f.id}" ${f.id===fid?"selected":""}>${esc(f.short)}</option>`).join("")+`</select></div>`+
      `<div class="field"><label for="fk-${items[0].id}">Flipkart vertical <span class="unit">${topPct(fkid)}% at the top band</span></label>`+
      `<select id="fk-${items[0].id}" data-setfk="${items.map(x=>x.id).join(",")}">`+
      fkCats().map(f=>`<option value="${f.id}" ${f.id===fkid?"selected":""}>${esc(f.short)}</option>`).join("")+`</select></div>`+
      items.map(p=>{
      const c=costOf(p,s),ov=state.costs[p.id]!=null,sr=suppRate(p);
      const tag=ov?'<span class="tag ok">your rate</span>':sr!=null?'<span class="tag ok">supplier ₹'+sr.toLocaleString("en-IN")+(+state.supp.gst?" +"+(+state.supp.gst)+"%":"")+'</span>':'<span class="tag est">no rate — add cost</span>';
      return `<div class="prod"><div class="t"><b>${esc(p.size)}</b><span>${tag}${p.custom?' <span class="tag">custom</span>':""}</span></div>
        <div class="hint">${p.web?"Razzai site ₹"+p.web.toLocaleString("en-IN"):"Not on Razzai site"}${p.mrp?" · MRP ₹"+p.mrp.toLocaleString("en-IN"):""}${p.ref?" · Razzai Amazon ~₹"+p.ref.toLocaleString("en-IN"):""}${p.own?" · Your site ₹"+p.own.toLocaleString("en-IN"):""}</div>
        <div class="row3">
          <div class="field"><label for="c-${p.id}">Cost ₹</label><input id="c-${p.id}" data-cost="${p.id}" type="number" inputmode="numeric" value="${c}" class="${ov?"ov":""}"></div>
          <div class="field"><label for="k-${p.id}">Billed kg</label><input id="k-${p.id}" data-kg="${p.id}" type="number" inputmode="decimal" step="0.5" value="${kgOf(p)}"></div>
          <div class="field"><label>&nbsp;</label><button class="btn ghost small" data-use="${p.id}">Calculate</button></div>
        </div>
        <div class="btns">${ov?`<button class="btn ghost tiny" data-rc="${p.id}">Reset to auto</button>`:""}${p.custom?`<button class="btn ghost tiny" data-rm="${p.id}">Remove</button>`:""}</div></div>`}).join("")+`</div></details>`;
  }).join("");
  keepOpen("#prodList details",prodOpen,"lid");
}
const prodOpen=new Set();
function keepOpen(sel,store,key){document.querySelectorAll(sel).forEach(d=>{const k=d.dataset[key];if(k)d.addEventListener("toggle",()=>{d.open?store.add(k):store.delete(k)})})}
function renderFees(){
  const all=feecats();
  if(!all.some(f=>f.id===state.feePick))state.feePick=all[0].id;
  const f=feeCat(state.feePick), bs=feeBands(f.id), edited=!!(state.feeOv&&state.feeOv[f.id]);
  const rows=bs.map((b,i)=>`<div class="fb">`+
    (b[0]==null?`<span>Above that</span><span></span>`
               :`<span>Up to \u20b9</span><input type="number" inputmode="numeric" data-fb="${f.id}|${i}|t" value="${b[0]}">`)+
    `<input type="number" inputmode="decimal" step="any" data-fb="${f.id}|${i}|p" value="${b[1]}" aria-label="percent"><span>%</span>`+
    (bs.length>1?`<button data-fbdel="${f.id}|${i}" title="Remove band">\u00d7</button>`:`<span></span>`)+`</div>`).join("");
  $("feeForm").innerHTML=
    `<div class="field"><label for="feePick">Category</label><select id="feePick">`+
      all.map(x=>`<option value="${x.id}" ${x.id===f.id?"selected":""}>${x.mkt==="flipkart"?"Flipkart · ":"Amazon · "}${esc(x.short)} \u2014 ${topPct(x.id)}%${state.feeOv[x.id]?" (edited)":""}</option>`).join("")+
    `</select></div><div class="fbox">`+
      (f.custom?`<div class="hint">Your own category${f.mkt==="flipkart"?" (Flipkart)":""}.</div>`:f.mkt==="flipkart"?`<div class="hint">Flipkart vertical: ${esc(f.name)} · bands are on Order Item Value, the % applies to the seller price</div>`:`<div class="hint">Amazon name: ${f.name}</div>`)+
      (f.note?`<div class="hint">${esc(f.note)}</div>`:"")+rows+
      `<div class="btns"><button class="btn ghost tiny" data-fbadd="${f.id}">Add band</button>`+
      (edited?`<button class="btn ghost tiny" data-fbreset="${f.id}">Reset to ${f.mkt==="flipkart"?"rate card":"Amazon rate"}</button>`:"")+
      (f.custom?`<button class="btn ghost tiny" data-fcdel="${f.id}">Delete category</button>`:"")+
    `</div></div>`;
  $("feePick").onchange=e=>{state.feePick=e.target.value;persist();renderFees()};
}
function renderHow(){
  const p=getP("500-D"),s=S(),r=calc(p,"es","amazon",2499,0,{},s);
  const grp=ks=>r.lines.filter(l=>ks.indexOf(l.k)>=0).reduce((t,l)=>t+l.amt,0);
  $("howEg").innerHTML=`<b>Example \u00b7 ${p.line} ${p.size} at ${rs(2499)} on Easy Ship</b><br>
    Customer pays ${rs(2499)}, product GST ${Math.round(r.gstR*100)}% is \u2212${rs(r.outGst)}, so net revenue is ${rs(r.net)}.<br>
    Then \u2212${rs(grp(["cost"]))} purchase cost, \u2212${rs(grp(["ref","close","ship","pick","store"]))} Amazon charges, \u2212${rs(grp(["pack","ads","ret"]))} your own costs.<br>
    <b>Profit ${rs(r.profit)} \u00b7 ${pct(r.margin)} margin.</b> Figures follow your current settings.`;
}
function renderSettings(){
  renderFees();renderHow();
  const s=S();
  $("setForm").innerHTML=SET_GROUPS.map(([g,fs],i)=>`<details ${i===0?"open":""}><summary>${g}</summary><div class="in"><div class="row">`+fs.map(([k,l,n])=>n==="chk"
    ?`<label class="chk" style="grid-column:1/-1"><input type="checkbox" data-setb="${k}" ${s[k]?"checked":""}> ${l}</label>`
    :`<div class="field"><label for="s-${k}">${l}</label><input id="s-${k}" data-set="${k}" type="number" inputmode="decimal" step="any" value="${s[k]}">${n?`<span class="hint">${n}</span>`:""}</div>`).join("")+`</div></div></details>`).join("");
}

function pkDims(){const p=getP(state.pk.pid),d=state.dims[p.id];
  if(d)return {l:+d.l,b:+d.b,h:+d.h,kg:d.kg==null?null:+d.kg,saved:true};
  const g=boxGuess(kgOf(p));
  return {l:g[0],b:g[1],h:g[2],kg:NETKG[p.id]!=null?+(NETKG[p.id]+(+S().packKg||0)).toFixed(2):null,saved:false};
}
function renderPack(){
  const s=S(),ps=products(),p=getP(state.pk.pid),ch=state.pk.ch,act=document.activeElement;
  const cats=[...new Set(ps.map(x=>x.cat))];
  $("pkCat").innerHTML=cats.map(c=>`<button data-pkcat="${esc(c)}" aria-pressed="${c===p.cat}">${esc(c)}</button>`).join("");
  const plines=[...new Set(ps.filter(x=>x.cat===p.cat).map(x=>x.line))];
  $("pkLine").innerHTML=plines.map(l=>`<button data-pkline="${esc(l)}" aria-pressed="${l===p.line}">${esc(l)}</button>`).join("");
  $("pkLineRow").hidden=plines.length<2;
  const psizes=ps.filter(x=>x.cat===p.cat&&x.line===p.line);
  $("pkSize").innerHTML=psizes.map(x=>`<button data-pksize="${x.id}" aria-pressed="${x.id===p.id}">${esc(x.size)}${state.dims[x.id]&&state.dims[x.id].saved?"<small>box saved</small>":""}</button>`).join("");
  $("pkSizeRow").hidden=psizes.length<2;
  const slim=state.pk.view!=="chips";
  $("pkSlim").hidden=!slim;$("pkChips").hidden=slim;$("pkView").textContent=slim?"Chips":"Compact";
  fillSelect($("pkCatS"),cats.map(c=>[c,esc(c)]),p.cat);
  fillSelect($("pkLineS"),plines.map(l=>[l,esc(l)]),p.line);
  fillSelect($("pkSizeS"),psizes.map(x=>[x.id,esc(x.size)+(state.dims[x.id]&&state.dims[x.id].saved?" \u00b7 box saved":"")]),p.id);
  $("pkLineSRow").hidden=plines.length<2;$("pkSizeSRow").hidden=psizes.length<2;
  document.querySelectorAll("#pkSeg button").forEach(b=>b.setAttribute("aria-pressed",b.dataset.pch===ch));
  $("pkUnit").value=state.pk.unit;$("pkWUnit").value=state.pk.wunit;
  document.querySelectorAll("[data-ul]").forEach(e=>e.textContent=state.pk.unit);
  document.querySelectorAll("[data-uw]").forEach(e=>e.textContent=state.pk.wunit);
  const d=pkDims();
  if($("pkL")!==act)$("pkL").value=du(d.l);
  if($("pkB")!==act)$("pkB").value=du(d.b);
  if($("pkH")!==act)$("pkH").value=du(d.h);
  if($("pkKg")!==act)$("pkKg").value=d.kg==null?"":dw(d.kg);
  if($("pkName")!==act)$("pkName").value=(state.dims[p.id]&&state.dims[p.id].name)||"";
  const L=+d.l||0,B=+d.b||0,H=+d.h||0,A=+d.kg||0;
  const vol=volKg(L,B,H), charge=Math.max(vol,A), bill=billedKg(charge), fee=shipFee(charge,ch,s);
  const wu=state.pk.wunit;
  $("pkVol").textContent=vol?dw(vol)+" "+wu:"\u2013";
  $("pkAct").textContent=A?dw(A)+" "+wu:"\u2013";
  $("pkBill").textContent=bill.toFixed(1)+" kg";
  const v=$("pkVerdict");v.className="verdict "+(vol>A?"warn":"good");
  v.innerHTML=`<div class="label">${ch==="fba"?"FBA":ch==="fk"?"Flipkart return pickup (national)":"Easy Ship"} weight handling</div><div class="big">${rs(fee)}</div>
    <div class="meta"><span class="pill ${vol>A?"warn":"good"}">billed at ${bill.toFixed(1)} kg</span><span>${rs(Math.round(fee*1.18))} with GST</span><span>${du(L)}\u00d7${du(B)}\u00d7${du(H)} ${state.pk.unit}</span></div>`;
  const cm3=Math.round(L*B*H);
  $("pkDrive").innerHTML=!vol?"Enter the box dimensions to see the chargeable weight."
    :vol>A?`<b>Volume is setting the cost.</b> The box is ${cm3.toLocaleString("en-IN")} cm\u00b3, which works out to ${vol.toFixed(2)} kg \u2014 more than the ${A?A.toFixed(2)+" kg":"actual weight"} it really weighs. Shrinking the box lowers the bill; a lighter product does not.`
    :`<b>Actual weight is setting the cost.</b> At ${A.toFixed(2)} kg the parcel weighs more than its ${vol.toFixed(2)} kg of volume, so a smaller box saves nothing until the volume rises above the weight. To pay less you need a lighter parcel \u2014 less filler, lighter box \u2014 or a lower slab rate.`;

  let h="";
  if(!vol){h=`<div class="hint">Enter the dimensions first.</div>`}
  else{
    const tiers=cheaperTiers(charge,A,ch,s);
    if(!tiers.length){
      h+=`<div class="tip"><div class="th"><span>Already on the lowest slab you can reach</span></div>
        <div class="hint" style="margin:0">${A&&A>=vol?`The parcel's own ${A.toFixed(2)} kg sets the floor, so trimming the box cannot move it down.`:"There is no cheaper slab below this one."}</div></div>`;
    }
    tiers.forEach(t=>{
      const need=t.kg*5000, f=need/(L*B*H);
      const nl=L*f, nb=B*f, nh=H*f;
      const trim=(c,n)=>`<b>${du(n)} ${state.pk.unit}</b><span class="d">from ${du(c)}</span><span>\u2212${+(du(c)-du(n)).toFixed(2)}</span>`;
      h+=`<div class="tip"><div class="th"><span>Get billed at ${t.kg.toFixed(1)} kg instead of ${bill.toFixed(1)}</span><em>saves ${rs(t.save)}</em></div>
        <div class="hint" style="margin:0">Box has to come down to ${Math.round(need).toLocaleString("en-IN")} cm\u00b3. Change any one of these:</div>
        <div class="opt"><span>Length</span>${trim(L,nl)}</div>
        <div class="opt"><span>Width</span>${trim(B,nb)}</div>
        <div class="opt"><span>Height</span>${trim(H,nh)}</div>
        <div class="hint" style="margin:0">That is ${rs(t.save*1.18)} with GST, or ${rs(Math.round(t.save*30))} across 30 orders.</div></div>`;
    });
    if(vol>=A){
      const room=bill*5000, f=room/(L*B*H);
      if(f>1.005){
        const grow=(c,n)=>`<b>${du(n)} ${state.pk.unit}</b><span class="d">from ${du(c)}</span><span>+${+(du(n)-du(c)).toFixed(2)}</span>`;
        h+=`<div class="tip up"><div class="th"><span>Room left before the cost steps up</span><em>still ${rs(fee)}</em></div>
          <div class="hint" style="margin:0">You can go up to ${Math.round(room).toLocaleString("en-IN")} cm\u00b3 and stay on the ${bill.toFixed(1)} kg slab. Any one of these is free:</div>
          <div class="opt"><span>Length</span>${grow(L,L*f)}</div>
          <div class="opt"><span>Width</span>${grow(B,B*f)}</div>
          <div class="opt"><span>Height</span>${grow(H,H*f)}</div>
          <div class="hint" style="margin:0">Past that, the next half kilo costs ${rs(shipFee(bill+0.5,ch,s)-fee)} more.</div></div>`;
      }
    }
  }
  $("pkTips").innerHTML=h;

  const saved=Object.keys(state.dims).filter(k=>state.dims[k].saved);
  $("pkList").innerHTML=!saved.length?`<div class="hint">Nothing saved yet.</div>`:saved.map(id=>{
    const q=getP(id),x=state.dims[id],vv=volKg(x.l,x.b,x.h),cc=billedKg(Math.max(vv,+x.kg||0));
    const prod=esc(q.line+" \u00b7 "+q.size);
    if(state.dRenId===id)
      return `<div class="dimrow"><span style="grid-column:1/-1;display:flex;gap:6px;align-items:center"><input type="text" id="dRenIn" maxlength="60" value="${esc(x.name||"")}" placeholder="${prod}"><button class="btn small" data-pkrendone="${id}">Done</button></span></div>`;
    const sub=`${x.name?prod+" \u00b7 ":""}${du(x.l)}\u00d7${du(x.b)}\u00d7${du(x.h)} ${state.pk.unit} \u00b7 ${dw(vv)} ${state.pk.wunit} volume${x.kg?" \u00b7 "+dw(+x.kg)+" actual":""} \u2192 billed ${cc.toFixed(1)} kg`;
    return `<div class="dimrow"><span><b>${esc(x.name||q.line+" \u00b7 "+q.size)}</b><br><small>${sub}</small></span>
      <span style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn ghost tiny" data-pkopen="${id}">Open</button><button class="btn ghost tiny" data-pkren="${id}">Rename</button><button class="btn ghost tiny" data-pkdel="${id}">Delete</button></span></div>`;
  }).join("");
}
function rerender(){persist();renderPicker();renderCalc()}
function pick(id){const p=getP(id);
  if(document.activeElement&&document.activeElement.blur)document.activeElement.blur();state.sel.pid=p.id;state.sel.ov={};if(p.ref)state.sel.sp=p.ref;else if(p.own)state.sel.sp=p.own;else if(p.web)state.sel.sp=p.web;}
$("mkt").onchange=e=>{state.sel.mkt=e.target.value;rerender()};
function pkPick(id){if(id){state.pk.pid=id;state.dRenId=null;persist();renderPack()}}
function pkLinePick(ln){const cur=getP(state.pk.pid);
  const q=products().find(x=>x.cat===cur.cat&&x.line===ln&&x.size===cur.size)||products().find(x=>x.cat===cur.cat&&x.line===ln);
  pkPick(q&&q.id)}
$("pkView").onclick=()=>{state.pk.view=state.pk.view==="chips"?"slim":"chips";persist();renderPack()};
$("pkCatS").onchange=e=>{const q=products().find(x=>x.cat===e.target.value);pkPick(q&&q.id)};
$("pkLineS").onchange=e=>pkLinePick(e.target.value);
$("pkSizeS").onchange=e=>pkPick(e.target.value);
function unitSwap(k,v){state.pk[k]=v;if(document.activeElement&&document.activeElement.blur)document.activeElement.blur();persist();renderPack()}
$("pkUnit").onchange=e=>{unitSwap("unit",e.target.value);toast("Measuring in "+e.target.value)};
$("pkWUnit").onchange=e=>{unitSwap("wunit",e.target.value)};
$("pkName").addEventListener("input",()=>{const d=state.dims[state.pk.pid];if(d){d.name=$("pkName").value.trim()||undefined;persist()}});
const PKFLD={pkL:"l",pkB:"b",pkH:"h"};
["pkL","pkB","pkH","pkKg"].forEach(i=>$(i).addEventListener("input",e=>{
  const p=getP(state.pk.pid),base=state.dims[p.id]||pkDims();
  const d=Object.assign({},base);
  if(i==="pkKg")d.kg=e.target.value===""?null:(+e.target.value||0)*uwf();
  else d[PKFLD[i]]=toCm(e.target.value);
  d.draft=!base.saved;
  state.dims[p.id]=d;persist();renderPack();
}));
function pkEntry(){const p=getP(state.pk.pid);return state.dims[p.id]||Object.assign({},pkDims(),{saved:false})}
$("pkSave").onclick=()=>{const p=getP(state.pk.pid),d=pkEntry();
  if(!d.l||!d.b||!d.h){toast("Enter all three dimensions");return}
  const nm=$("pkName").value.trim();d.name=nm||undefined;
  d.saved=true;delete d.draft;state.dims[p.id]=d;state.dRenId=null;persist();renderPack();toast(nm?'Saved as "'+nm+'"':"Box saved")};
$("pkUse").onclick=()=>{const p=getP(state.pk.pid),d=pkEntry();
  if(!d.l||!d.b||!d.h){toast("Enter all three dimensions");return}
  const kg=billedKg(Math.max(volKg(d.l,d.b,d.h),+d.kg||0));
  const nm=$("pkName").value.trim();if(nm)d.name=nm;
  d.saved=true;delete d.draft;state.dims[p.id]=d;state.kgs[p.id]=kg;persist();renderPack();toast(kg.toFixed(1)+" kg now used for profit")};
$("cat").onchange=e=>{const p=products().find(x=>x.cat===e.target.value);pick(p.id);rerender()};
$("line").onchange=e=>{const cur=getP(state.sel.pid);const p=products().find(x=>x.cat===cur.cat&&x.line===e.target.value&&x.size===cur.size)||products().find(x=>x.cat===cur.cat&&x.line===e.target.value);pick(p.id);rerender()};
$("size").onchange=e=>{pick(e.target.value);rerender()};
document.addEventListener("click",e=>{
  const b=e.target.closest("button");if(!b)return;
  if(b.dataset.ch){state.sel.ch=b.dataset.ch;state.sel.ov={};rerender()}
  else if(b.dataset.fch){state.sel.fch=b.dataset.fch;state.sel.ov={};rerender()}
  else if(b.dataset.zone){state.sel.zone=b.dataset.zone;delete state.sel.ov.ship;rerender()}
  else if(b.dataset.pch){state.pk.ch=b.dataset.pch;persist();renderPack()}
  else if(b.dataset.pkcat){const q=products().find(x=>x.cat===b.dataset.pkcat);pkPick(q&&q.id)}
  else if(b.dataset.pkline){pkLinePick(b.dataset.pkline)}
  else if(b.dataset.pksize){pkPick(b.dataset.pksize)}
  else if(b.dataset.pkopen){state.pk.pid=b.dataset.pkopen;state.dRenId=null;persist();renderPack();scrollTo({top:0,behavior:"smooth"})}
  else if(b.dataset.pkdel){delete state.dims[b.dataset.pkdel];state.dRenId=null;persist();renderPack();toast("Box removed")}
  else if(b.dataset.pkrendone){const id=b.dataset.pkrendone,v=$("dRenIn").value.trim();
    if(state.dims[id]){if(v)state.dims[id].name=v;else delete state.dims[id].name}
    state.dRenId=null;persist();renderPack();toast("Renamed")}
  else if(b.dataset.pkren){state.dRenId=b.dataset.pkren;renderPack();
    const el=$("dRenIn");if(el){el.focus();el.select()}}
  else if(b.dataset.sp){state.sel.sp=+b.dataset.sp;rerender()}
  else if(b.dataset.v){show(b.dataset.v)}
  else if(b.dataset.load!=null){const x=state.hist[+b.dataset.load];const o={pid:x.pid,mkt:x.mkt||"amazon",sp:x.sp,coupon:x.coupon,ov:x.ov||{}};
    if(o.mkt==="flipkart"){const [f,z]=String(x.ch||"").split("-");o.fch=f||"nfbf";o.zone=z||"national"}else o.ch=x.ch;
    Object.assign(state.sel,o);rerender();scrollTo({top:0,behavior:"smooth"})}
  else if(b.dataset.del!=null){state.hist.splice(+b.dataset.del,1);state.renIdx=null;persist();renderHist()}
  else if(b.dataset.rendone!=null){const i=+b.dataset.rendone,v=$("renIn").value.trim();
    if(v)state.hist[i].title=v;else delete state.hist[i].title;
    state.renIdx=null;persist();renderHist();toast("Renamed")}
  else if(b.dataset.ren!=null){state.renIdx=+b.dataset.ren;renderHist();
    const el=$("renIn");if(el){el.focus();el.select()}}
  else if(b.dataset.use){pick(b.dataset.use);persist();show("calc")}
  else if(b.dataset.rc){delete state.costs[b.dataset.rc];persist();renderProducts();toast("Back to the supplier rate")}
  else if(b.dataset.mdel){const x=miscFind(b.dataset.mdel);
    state.misc=state.misc.filter(y=>y.id!==b.dataset.mdel);
    delete state.sel.ov["m"+b.dataset.mdel];
    persist();lastSig="";renderCalc();toast((x&&x.name?x.name:"Expense")+" removed")}
  else if(b.dataset.rdel){const ln=suppLine(b.dataset.rdel);
    state.supp.lines=state.supp.lines.filter(x=>x.id!==b.dataset.rdel);
    Object.keys(state.rateMap).forEach(k=>{if(state.rateMap[k]===b.dataset.rdel)delete state.rateMap[k]});
    persist();renderProducts();toast((ln?ln.name:"Rate line")+" removed")}
  else if(b.dataset.fbadd){const id=b.dataset.fbadd,bs=feeBands(id).map(x=>x.slice());
    bs.splice(bs.length-1,0,[bs.length>1?(bs[bs.length-2][0]||1000)*2:1000,0]);state.feeOv[id]=bs;persist();renderFees();toast("Band added")}
  else if(b.dataset.fbdel){const [id,i]=b.dataset.fbdel.split("|");const bs=feeBands(id).map(x=>x.slice());
    if(bs.length>1){bs.splice(+i,1);if(bs.length)bs[bs.length-1][0]=null;state.feeOv[id]=bs;persist();renderFees();toast("Band removed")}}
  else if(b.dataset.fbreset){delete state.feeOv[b.dataset.fbreset];persist();renderFees();toast("Amazon rate restored")}
  else if(b.dataset.fcdel){const id=b.dataset.fcdel;
    state.feeNew=state.feeNew.filter(f=>f.id!==id);delete state.feeOv[id];
    Object.keys(state.feeMap).forEach(k=>{if(state.feeMap[k]===id)delete state.feeMap[k]});
    Object.keys(state.fkMap||{}).forEach(k=>{if(state.fkMap[k]===id)delete state.fkMap[k]});
    state.feePick=null;persist();renderFees();toast("Category deleted")}
  else if(b.dataset.rm){state.custom=state.custom.filter(p=>p.id!==b.dataset.rm);delete state.costs[b.dataset.rm];if(state.sel.pid===b.dataset.rm)state.sel.pid="500-S";persist();renderProducts();toast("Product removed")}
});
$("sp").addEventListener("input",e=>{state.sel.sp=+e.target.value||0;persist();renderCalc()});
$("coupon").addEventListener("input",e=>{state.sel.coupon=+e.target.value||0;persist();renderCalc()});
$("cost").addEventListener("input",e=>{const v=+e.target.value;const p=getP(state.sel.pid);if(e.target.value===""||v===costOf(p))delete state.sel.ov.cost;else state.sel.ov.cost=v;persist();renderCalc()});
$("breakdown").addEventListener("input",e=>{const t=e.target;
  if(t.dataset.pays){
    const v=parseFloat(t.value);if(isNaN(v))return;
    const extra=state.sel.mkt==="web"?(+S().webShip||0):0;
    state.sel.sp=Math.max(0,Math.round(v-extra+(+state.sel.coupon||0)));
    persist();renderCalc();return;
  }
  if(t.dataset.gstpct){
    if(t.value===""){delete state.sel.ov.gstPct}else{const v=parseFloat(t.value);if(isNaN(v))return;state.sel.ov.gstPct=v}
    persist();renderCalc();return;
  }
  if(t.dataset.cost2){
    const p=getP(state.sel.pid);
    if(t.value===""||+t.value===costOf(p))delete state.sel.ov.cost;else state.sel.ov.cost=+t.value;
    persist();renderCalc();return;
  }
  if(t.dataset.ov){
    if(t.value===""){delete state.sel.ov[t.dataset.ov]}else{const v=parseFloat(t.value);if(isNaN(v))return;state.sel.ov[t.dataset.ov]=v}
    persist();renderCalc();return;
  }
  if(t.dataset.amt){
    const k=t.dataset.amt,row=t.closest("[data-row]"),mul=+(row&&row.dataset.mul)||1;
    const s=S(),eff=Math.max(0,(+state.sel.sp||0)-(+state.sel.coupon||0));
    if(t.value===""){delete state.sel.ov[k]}
    else{const amt=parseFloat(t.value);if(isNaN(amt)||eff<=0)return;state.sel.ov[k]=+(amt/(eff*mul)*100).toFixed(4)}
    persist();renderCalc();
  }});
$("breakdown").addEventListener("focusout",()=>setTimeout(renderCalc,0));
document.addEventListener("click",e=>{const b=e.target.closest(".eye");if(!b)return;
  const n=$(b.dataset.eye);if(!n)return;
  const show=n.hasAttribute("hidden");n.hidden=!show;b.setAttribute("aria-expanded",show?"true":"false")});
$("resetOv").onclick=()=>{state.sel.ov={};rerender();toast("Edits cleared")};
$("saveBtn").onclick=()=>{
  const p=getP(state.sel.pid),{sp,coupon,ov,mkt}=state.sel,ch=chForMkt(),r=calc(p,ch,mkt,sp,coupon,ov);
  const title=$("calcName").value.trim();
  state.hist.unshift({pid:p.id,title:title||undefined,name:p.line+" · "+p.size,mkt,ch,chan:chanName(mkt,ch),sp,coupon,ov:Object.assign({},ov),profit:r.profit,margin:r.margin,date:new Date().toLocaleDateString("en-IN",{day:"numeric",month:"short"})});
  state.hist=state.hist.slice(0,40);state.renIdx=null;$("calcName").value="";persist();renderCalc();toast(title?'Saved as "'+title+'"':"Saved");
};
$("calcName").addEventListener("input",()=>renderCalc());
$("copyBtn").onclick=()=>{const p=getP(state.sel.pid),{ch,sp,coupon,ov,mkt}=state.sel;const txt=summaryText(calc(p,chForMkt(),mkt,sp,coupon,ov));
  navigator.clipboard.writeText(txt).then(()=>toast("Summary copied"),()=>toast("Copy not allowed here; use WhatsApp share"))};
$("lFrom").oninput=renderLadder;$("lStep").oninput=renderLadder;
$("pcat").onchange=e=>{state.pcat=e.target.value;persist();renderProducts()};
$("suppForm").addEventListener("input",e=>{const t=e.target;
  if(t.dataset.rname){const ln=suppLine(t.dataset.rname);if(ln){ln.name=t.value;persist();renderSupp()}return}
  if(t.dataset.rate){const [id,k]=t.dataset.rate.split("|"),ln=suppLine(id);
    if(!ln)return;ln.r=ln.r||{};
    if(t.value==="")delete ln.r[k];else{const v=parseFloat(t.value);if(isNaN(v))return;ln.r[k]=v}
    persist();renderSupp()}});
$("suppForm").addEventListener("change",e=>{if(e.target.dataset.rate||e.target.dataset.rname)renderProducts()});
$("suppForm").addEventListener("focusout",()=>setTimeout(renderProducts,0));
$("suppGstOn").onchange=e=>{state.supp.gst=e.target.checked?(+state.supp.gst||5):0;persist();renderProducts();toast(e.target.checked?"GST added on top of supplier rates":"Rates treated as GST-inclusive")};
$("suppGst").addEventListener("input",e=>{const v=parseFloat(e.target.value);if(isNaN(v))return;state.supp.gst=v;persist()});
$("suppGst").addEventListener("focusout",()=>setTimeout(renderProducts,0));
$("suppAdd").onclick=()=>{state.supp.lines.push({id:"s"+Date.now(),name:"New rate line",r:{}});persist();renderProducts();toast("Rate line added")};
$("suppReset").onclick=()=>{state.supp=JSON.parse(JSON.stringify(SUPPSEED));persist();renderProducts();toast("Quoted rates restored")};
function miscFind(id){return (state.misc||[]).find(x=>x.id===id)||null}
$("miscForm").addEventListener("input",e=>{const t=e.target;
  if(t.dataset.mname){const x=miscFind(t.dataset.mname);if(x){x.name=t.value;persist();renderCalc()}return}
  if(t.dataset.mval){const x=miscFind(t.dataset.mval);if(!x)return;
    x.val=t.value===""?0:(parseFloat(t.value)||0);persist();renderCalc()}});
$("miscForm").addEventListener("change",e=>{const t=e.target;
  if(t.dataset.mtype){const x=miscFind(t.dataset.mtype);if(x){x.type=t.value;delete state.sel.ov["m"+x.id];persist();lastSig="";renderCalc()}}
  if(t.dataset.mgst){const x=miscFind(t.dataset.mgst);if(x){x.gst=t.checked;persist();renderCalc();toast(x.gst?"GST on this will be claimed as credit":"Counted with no GST")}}});
$("miscAdd").onclick=()=>{state.misc.push({id:"x"+Date.now(),name:"",val:null,type:"amt",gst:false});
  persist();lastSig="";renderCalc();
  const el=document.querySelector("[data-mname]:last-of-type");if(el)el.focus();toast("Expense row added")};
$("prodList").addEventListener("change",e=>{const t=e.target;
  if(t.dataset.cost){state.costs[t.dataset.cost]=+t.value||0;persist();renderProducts();toast("Cost saved")}
  if(t.dataset.kg){state.kgs[t.dataset.kg]=+t.value||0.5;persist();toast("Weight saved")}
  if(t.dataset.setfee){state.feeMap=state.feeMap||{};t.dataset.setfee.split(",").forEach(id=>state.feeMap[id]=t.value);persist();renderProducts();toast("Fee category saved")}
  if(t.dataset.setfk){state.fkMap=state.fkMap||{};t.dataset.setfk.split(",").forEach(id=>state.fkMap[id]=t.value);persist();renderProducts();toast("Flipkart vertical saved")}
  if(t.dataset.setrate!=null){const l=t.dataset.setrate;
    if(t.value)state.rateMap[l]=t.value;else delete state.rateMap[l];
    persist();renderProducts();toast(t.value?"Linked to "+(suppLine(t.value)||{}).name:"Rate link removed")}});
$("addProd").onclick=()=>{
  const name=$("nName").value.trim(),size=$("nSize").value.trim()||"Standard";if(!name){toast("Enter a product name");return}
  state.custom.push({id:"c"+Date.now(),cat:$("nCat").value,fee:$("nFee").value,line:name,size,cost:+$("nCost").value||0,kg:+$("nKg").value||3,ref:+$("nRef").value||null,web:+$("nWeb").value||null});
  ["nName","nSize","nCost","nRef","nWeb"].forEach(i=>$(i).value="");persist();renderProducts();toast("Product added");
};
$("setForm").addEventListener("change",e=>{const t=e.target;
  if(t.dataset.setb)state.set[t.dataset.setb]=t.checked;
  else if(t.dataset.set){const v=parseFloat(t.value);if(!isNaN(v))state.set[t.dataset.set]=v}
  persist();toast("Setting saved")});
$("feeForm").addEventListener("input",e=>{const t=e.target;if(!t.dataset.fb)return;
  const [id,i,w]=t.dataset.fb.split("|");const bs=feeBands(id).map(b=>b.slice());
  const v=parseFloat(t.value);if(isNaN(v))return;
  bs[+i][w==="t"?0:1]=v; state.feeOv[id]=bs; persist();
  const op=$("feePick")&&$("feePick").selectedOptions[0];if(op)op.textContent=feeCat(id).short+" \u2014 "+topPct(id)+"% (edited)"});
$("feeForm").addEventListener("change",e=>{if(e.target.dataset.fb)renderFees()});
$("afAdd").onclick=()=>{
  const nm=$("afName").value.trim(), hi=parseFloat($("afHigh").value), lo=parseFloat($("afLow").value)||0;
  if(!nm){toast("Enter a category name");return}
  if(isNaN(hi)){toast("Enter the % above \u20b91,000");return}
  const id="u"+Date.now();
  const mk=($("afMkt")&&$("afMkt").value)||"amazon";
  state.feeNew.push({id,short:nm,name:nm,bands:[[1000,lo],[null,hi]],note:$("afNote").value.trim(),custom:true,mkt:mk});
  ["afName","afHigh","afNote"].forEach(i=>$(i).value="");$("afLow").value=0;
  state.feePick=id;$("afBox").open=false;persist();renderFees();toast("Category added");
};
$("resetSet").onclick=()=>{state.set={};persist();renderSettings();toast("Defaults restored")};
$("copyBk").onclick=()=>{const txt=JSON.stringify(state);navigator.clipboard.writeText(txt).then(()=>toast("Backup copied"),()=>{$("restoreBox").hidden=false;$("bkText").value=txt;$("bkText").select();toast("Select and copy the text")})};
$("showRestore").onclick=()=>{$("restoreBox").hidden=!$("restoreBox").hidden};
$("doRestore").onclick=()=>{try{const d=JSON.parse($("bkText").value);if(!d.sel)throw 0;Object.keys(state).forEach(k=>delete state[k]);Object.assign(state,d);persist();toast("Restored");show("calc")}catch(e){toast("That backup text is not valid")}};

function show(v){
  ["calc","ladder","prod","pack","set"].forEach(x=>$("v-"+x).hidden=x!==v);
  document.querySelectorAll("nav button").forEach(b=>{if(b.dataset.v===v)b.setAttribute("aria-current","page");else b.removeAttribute("aria-current")});
  if(v==="calc"){renderPicker();renderCalc()} if(v==="ladder")renderLadder(); if(v==="prod")renderProducts(); if(v==="pack")renderPack(); if(v==="set")renderSettings();
  scrollTo(0,0);
}
function netBadge(){$("netState").textContent=navigator.onLine?"Comforter King":"Offline · all features available"}
addEventListener("online",netBadge);addEventListener("offline",netBadge);
netBadge();show("calc");
if("serviceWorker"in navigator)addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}));
window.__ck={calc,priceFor,getP,S,volKg,billedKg,shipFee,suppRate,autoCost,costOf,hasCost,gstView,fkPct,fkFixed,fkPick,fkRevShip,fkIdOf,chanName};

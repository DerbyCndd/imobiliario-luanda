const E=require('./public/engine.js');
function check(S,ctx){
  let h=0,ho=0;
  for(const i in S.props){const st=S.props[i];if(st.houses===5)ho++;else h+=st.houses;
    if(st.owner&&!S.players.find(p=>p.id===st.owner))throw new Error('dono invalido '+ctx);
    if(st.owner&&S.players.find(p=>p.id===st.owner).bk)throw new Error('dono falido '+ctx);}
  if(S.houses+h!==32)throw new Error('casas '+S.houses+'+'+h+' '+ctx);
  if(S.hotels+ho!==12)throw new Error('hoteis '+ctx);
  S.players.forEach(p=>{if(p.cash<0)throw new Error('cash negativo '+p.name+' '+p.cash+' '+ctx);if(!Number.isInteger(p.cash))throw new Error('cash nao inteiro '+p.cash+' '+ctx)});
}
function run(n,seed){
  let s=seed;E.rand=()=>{s=(s*1664525+1013904223)%4294967296;return s/4294967296};
  const S=E.newGame('TEST','p0');
  for(let i=0;i<n;i++)E.join(S,'p'+i,'J'+i,i);
  S.settings.pot=seed%2===0;
  let e=E.act(S,'p0',{type:'start'});if(e)throw new Error(e);
  const r=()=>E.rand();
  const errs={};
  const A=(pid,a)=>{const e=E.act(S,pid,a);if(e)errs[a.type+':'+e]=(errs[a.type+':'+e]||0)+1;return e};
  let steps=0;
  while(S.phase==='play'&&steps<30000){
    steps++;
    const T=S.turn,c=E.cur(S);
    // acções aleatórias extras
    if(r()<0.15){const p=S.players[Math.floor(r()*S.players.length)];if(!p.bk){
      const owned=Object.keys(S.props).filter(i=>S.props[i].owner===p.id);
      const k=r();
      if(owned.length){const i=+owned[Math.floor(r()*owned.length)];
        if(k<.4)A(p.id,{type:'build',sq:i});else if(k<.55)A(p.id,{type:'sell',sq:i});else if(k<.7)A(p.id,{type:'mortgage',sq:i});else if(k<.9)A(p.id,{type:'unmortgage',sq:i});
        else{const o=S.players[Math.floor(r()*S.players.length)];const oo=Object.keys(S.props).filter(j=>S.props[j].owner===o.id);
          A(p.id,{type:'trade',to:o.id,give:{cash:Math.floor(r()*200),props:[i],jc:0},get:{cash:Math.floor(r()*100),props:oo.length&&r()<.5?[+oo[0]]:[],jc:0}});}
      }}}
    if(S.trades.length&&r()<.5){const t=S.trades[0];A(t.to,{type:r()<.6?'tradeYes':'tradeNo',id:t.id});}
    check(S,'apos extra');
    if(S.phase!=='play')break;
    if(T.phase==='auction'){
      const p=S.players[Math.floor(r()*S.players.length)];
      if(!p.bk){ if(r()<.6)A(p.id,{type:'bid',amount:(S.auction?S.auction.bid:0)+1+Math.floor(r()*60)});else A(p.id,{type:'pass'});}
      if(r()<.3)E.tick(S);
    } else if(T.phase==='debt'){
      const d=S.debts[0];const p=E.byId(S,d.pid);
      const owned=Object.keys(S.props).filter(i=>S.props[i].owner===p.id).map(Number);
      let did=false;
      for(const i of owned){if(A(p.id,{type:'sell',sq:i})===null){did=true;break}}
      if(!did)for(const i of owned){if(A(p.id,{type:'mortgage',sq:i})===null){did=true;break}}
      if(!did)A(p.id,{type:'bankrupt'});
    } else if(T.phase==='roll'){
      if(c.jail){const k=r();if(k<.3&&c.cash>=50)A(c.id,{type:'payJail'});else if(k<.5&&c.jc.length)A(c.id,{type:'useJail'});}
      A(c.id,{type:'roll'});
    } else if(T.phase==='buy'){
      if(r()<.65)A(c.id,{type:'buy'}),(S.turn.phase==='buy'&&A(c.id,{type:'decline'}));else A(c.id,{type:'decline'});
    } else if(T.phase==='end'){A(c.id,{type:'endTurn'});}
    else throw new Error('fase estranha '+T.phase);
    check(S,'fim passo');
  }
  return {S,steps,errs};
}
let over=0,stuck=0,tot={},info=[];
for(let g=0;g<300;g++){
  const n=2+(g%11);
  try{const {S,steps,errs}=run(n,g+1);
    if(S.phase==="over")over++;else{stuck++;if(info.length<4)info.push({n,seq:S.turn.seq,ph:S.turn.phase,debts:S.debts.length,auc:!!S.auction,cash:S.players.map(p=>p.bk?"X":p.cash).join(",")})}
    for(const k in errs)tot[k]=(tot[k]||0)+errs[k];
    if(S.phase==='over'){const alive=S.players.filter(p=>!p.bk);if(alive.length!==1)throw new Error('vencedor invalido')}
  }catch(e){console.log('JOGO',g,'n=',n,'ERRO',e.stack.split('\n').slice(0,4).join(' | '));process.exit(1)}
}
console.log(JSON.stringify(info));console.log("terminados",over,'por terminar(30000 passos)',stuck);
const top=Object.entries(tot).sort((a,b)=>b[1]-a[1]).slice(0,12);console.log(top.map(x=>x.join(' = ')).join('\n'));

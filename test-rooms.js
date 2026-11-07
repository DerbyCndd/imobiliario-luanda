const R=require('./lib/rooms.js');
const mk=()=>{const h={},o={readyState:1,out:[],send(x){o.out.push(JSON.parse(x))},on(e,f){h[e]=f},close(){o.readyState=3;h.close&&h.close()},emit(e,d){h[e]&&h[e](d)},last(){return [...o.out].reverse().find(m=>m.t==='s')},errs(){return o.out.filter(m=>m.t==='err')}};R.attach(o);return o};
const tx=(ws,m)=>ws.emit('message',Buffer.from(JSON.stringify(m)));
const ok=(c,m)=>{if(!c){console.log('FALHOU:',m);process.exit(1)}console.log('ok -',m)};
const A=mk();tx(A,{t:'create',pid:'pa',name:'Ana'});
const code=A.last().s.code;ok(/^[A-Z2-9]{5}$/.test(code),'sala criada '+code);
const B=mk();tx(B,{t:'join',code:code.toLowerCase(),pid:'pb',name:'Bruno'});
ok(A.last().s.players.length===2,'anfitrião vê 2 jogadores');
const X=mk();tx(X,{t:'join',code:'ZZZZZ',pid:'px',name:'X'});ok(X.errs()[0]&&X.errs()[0].fatal,'sala inexistente dá erro');
tx(B,{t:'act',a:{type:'start'}});ok(B.errs().length===1&&A.last().s.phase==='lobby','convidado não pode começar');
tx(A,{t:'act',a:{type:'start'}});ok(A.last().s.phase==='play'&&B.last().s.phase==='play','jogo começou nos dois');
const S=()=>A.last().s;const curPid=()=>S().players[S().cur].id;const W=()=>curPid()==='pa'?A:B;
tx(W(),{t:'act',a:{type:'roll'}});ok(S().turn.seq===1,'lançamento de dados processado');
const other=curPid()==='pa'?B:A;tx(other,{t:'act',a:{type:'roll'}});ok(other.errs().length>=1,'jogador fora da vez rejeitado');
// desconexão e reconexão
B.close();ok(S().players.find(p=>p.id==='pb').connected===false,'desligado marcado');
const B2=mk();tx(B2,{t:'join',code,pid:'pb',name:'Bruno'});ok(S().players.find(p=>p.id==='pb').connected===true&&B2.last().s.phase==='play','reconexão repõe o estado');
R.rooms.get(code).S.round=3;
const C=mk();tx(C,{t:'join',code,pid:'pc',name:'Carlos'});ok(!C.errs().length&&S().specs.length===1&&S().players.length===2,'depois da ronda 2 quem entra fica a assistir');
tx(C,{t:'act',a:{type:'roll'}});ok(C.errs().length===1,'espectador não joga');
tx(C,{t:'act',a:{type:'chat',text:'olá'}});ok(typeof S().log[S().log.length-1]==='object','espectador pode conversar');
R.rooms.get(code).S.round=1;
const D=mk();tx(D,{t:'join',code,pid:'pd',name:'Dina'});ok(S().players.length===3&&S().players[2].id==='pd'&&S().players[2].cash===1500,'na ronda 1 entra a meio como jogador');
R.rooms.get(code).S.players.pop();
// leilão + relógio
for(let i=0;i<60&&S().turn.phase!=='buy'&&S().phase==='play';i++){const w=W();const ph=S().turn.phase;if(ph==='roll')tx(w,{t:'act',a:{type:'roll'}});else if(ph==='end')tx(w,{t:'act',a:{type:'endTurn'}});else break}
if(S().turn.phase==='buy'){tx(W(),{t:'act',a:{type:'decline'}});ok(S().auction&&S().auction.left===20,'leilão iniciado');R.tickAll();const clk=A.out.filter(m=>m.t==='clk').pop();ok(clk&&clk.left===19,'relógio do leilão avança e é enviado em mensagem leve');}
tx(A,{t:'ping'});ok(A.out.some(m=>m.t==='pong'),'ping recebe pong (ligação viva)');
tx(A,{t:'vjoin'});tx(B2,{t:'vjoin'});B2.out.length=0;tx(A,{t:'vjoin'});ok(B2.out.some(m=>m.t==='vreset'&&m.pid==='pa'),'reconexão de voz avisa os outros (vreset)');
// regresso: mesmo nome, novo navegador, depois da ronda 2 -> retoma o lugar (não vira espectador)
{const r=R.rooms.get(code);r.S.round=5;const nPl=r.S.players.length,nSp=r.S.specs.length;
const old=r.conns.get('pb');old.close();ok(r.S.players.find(p=>p.id==='pb').connected===false,'jogador saiu da partida');
const N=mk();tx(N,{t:'join',code,pid:'novo123',name:'bruno'});
ok(N.out.some(m=>m.t==='adopt'&&m.pid==='pb'),'servidor devolve o lugar antigo (adopt)');
ok(r.S.players.length===nPl&&r.S.specs.length===nSp&&r.S.players.find(p=>p.id==='pb').connected===true,'retoma o lugar: sem espectador novo e ligado outra vez');
const Z=mk();tx(Z,{t:'join',code,pid:'intruso',name:'Bruno'});ok(!Z.out.some(m=>m.t==='adopt')&&r.S.specs.some(x=>x.id==='intruso'),'com o lugar ocupado/ligado ninguém o rouba (fica a assistir)');
r.S.round=1;}
console.log('TUDO OK');process.exit(0);

// Estrutura HTML do jogo. A interface é controlada por /app.js (DOM directo), por isso
// é injectada como HTML estático para o React não a tentar gerir.
export const SHELL = `
<div id="net" class="hidden"></div>
<div id="home" class="screen">
  <div class="hero"><div class="logo">🏠🎩</div><h1>IMOBILIÁRIO LUANDA</h1><p>Compra, vende, negoceia e arruína os teus amigos · 2 a 12 jogadores</p></div>
  <div class="card"><h2>O teu nome</h2><div class="row"><input id="name" maxlength="16" placeholder="Escreve o teu nome"></div></div>
  <div class="card"><h2>Criar uma sala</h2>
    <p class="hint">Cria a sala e partilha o código com os amigos. A sala fica no servidor: não precisas de manter a página aberta.</p>
    <div class="row"><button id="bCreate">🎲 Criar sala</button><button id="bResume" class="alt hidden">↩️ Voltar à última sala</button></div></div>
  <div class="card"><h2>Entrar numa sala</h2>
    <div class="row"><input id="code" maxlength="5" placeholder="CÓDIGO" style="text-transform:uppercase;letter-spacing:4px;font-weight:800"><button id="bJoin" class="alt">Entrar</button></div></div>
  <div class="card" id="homeRules"></div>
  <p class="hint" style="color:#e8dcc0;text-align:center">Jogo online entre amigos, sem registo. Regras do tabuleiro clássico.</p>
</div>
<div id="lobby" class="screen hidden"></div>
<div id="game" class="hidden"></div>
<div id="modal" class="hidden"></div>
<div id="cardpop" class="hidden"></div>
<div id="toast" class="hidden"></div>
`;

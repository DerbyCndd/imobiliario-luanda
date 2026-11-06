# 🏠 Imobiliário Luanda

Jogo de tabuleiro online (2 a 12 jogadores) com as regras, preços, rendas e cartas do tabuleiro clássico,
com nomes de bairros de Luanda. Funciona no navegador, sem registo nem servidor próprio.

## Como jogar
1. Um jogador abre o site e carrega em **Criar sala** (é o anfitrião e tem de manter a página aberta).
2. Partilha o **código** (ou o link) com os amigos, que entram em **Entrar numa sala**.
3. Cada um escolhe a peça e o anfitrião carrega em **Começar**.

## Regras implementadas
- 40 casas, 28 propriedades (22 ruas, 4 linhas, 2 serviços), 1500 Kz iniciais, 200 Kz na Partida.
- Duplos, 3 duplos = Cadeia, Cadeia (duplo / 50 Kz / carta), compra, **leilão** com relógio, rendas, grupo de cor (renda a dobrar).
- Casas e hotéis (construção uniforme, 32 casas / 12 hotéis), hipotecas (resgate +10%).
- Cartas de Sorte e Caixa Comunitária (16 + 16), incluindo "Sai livre da Cadeia".
- **Trocas** entre jogadores (propriedades, dinheiro e cartas), dívidas, falência (para jogador ou banco) e vencedor.
- Regra opcional: multas e impostos acumulam no Parque Gratuito.
- Chat, reconexão automática e retoma da sala pelo anfitrião.

## Técnica
Ligação peer-to-peer com [PeerJS](https://peerjs.com/): o anfitrião corre o motor de regras (`engine.js`)
e os restantes jogadores ligam-se a ele. `node test.js` simula centenas de jogos para validar o motor.

*Jogo de fãs, sem qualquer ligação à Hasbro. "Monopoly" é marca registada dos seus titulares.*

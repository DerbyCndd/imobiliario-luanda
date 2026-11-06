# 🏠 Imobiliário Luanda

Jogo de tabuleiro online (2 a 12 jogadores) com as regras, preços, rendas e cartas do tabuleiro clássico,
com nomes de bairros de Luanda.

**Stack:** Next.js 14 (páginas) + servidor Node com WebSocket (`server.js`, `lib/rooms.js`). O motor de regras
(`public/engine.js`) corre no servidor, por isso criar uma sala é instantâneo e a sala continua viva mesmo que o
criador feche a página (os jogadores reconectam sozinhos).

## Correr localmente
```bash
npm install
npm run dev      # http://localhost:3000
npm test         # simula centenas de jogos + testa as salas
```

## Pôr online (Render, grátis)
1. Em https://render.com → **New → Blueprint** → escolhe este repositório (o `render.yaml` configura tudo).
2. Espera o deploy; o endereço `https://imobiliario-luanda.onrender.com` (ou semelhante) é o jogo.
3. Nota: no plano grátis o servidor adormece após ~15 min sem uso e demora ~1 min a acordar no primeiro acesso.

> A Vercel não serve para isto: não suporta servidores WebSocket permanentes.

## Regras implementadas
40 casas, 28 propriedades, 1500 Kz iniciais, 200 Kz na Partida, duplos / 3 duplos = Cadeia, Cadeia (duplo / 50 Kz / carta),
**empréstimos** (banco 5%+2%/ronda ou entre jogadores, prestação por ronda, confisco de propriedade ou saldo negativo), compra e **leilão** com relógio, rendas (cor completa a dobrar), casas e hotéis (construção uniforme, 32/12; com mais de 8 jogadores o banco tem mais: 4 casas e 1,5 hotéis por jogador), hipotecas,
cartas de Sorte e Caixa Comunitária (16+16), **trocas**, dívidas, falência, vencedor, chat e reconexão.
Regra opcional: multas e impostos acumulam no Parque Gratuito.

*Jogo de fãs, sem ligação à Hasbro. "Monopoly" é marca registada dos seus titulares.*

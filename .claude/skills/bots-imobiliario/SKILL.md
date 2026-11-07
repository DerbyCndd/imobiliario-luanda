---
name: bots-imobiliario
description: Afinar ou depurar os bots do Imobiliário Luanda (public/bots.js): estilos, compras, leilões, construção, trocas, empréstimos e comportamento perante o Juiz. Usar quando um bot jogar mal, bloquear o jogo ou fizer trocas absurdas.
---

# Bots do Imobiliário Luanda

- `public/bots.js` → `Bots.step(E, S, bot, mem)` devolve **uma** acção do motor (ou `null`). Os bots só usam as mesmas acções dos humanos (`E.act`), nenhuma trapaça.
- Estilos em `STY`: equilibrado, agressivo, cauteloso, negociador (reserva de dinheiro, agressividade nos leilões, exigência nas trocas, vontade de emprestar).
- O ritmo humano (atrasos) está em `lib/rooms.js` `botTick`; as simulações não usam atrasos.
- Os bots respeitam o Juiz: não propõem trocas que o Juiz vetaria, defendem-se em tribunal (`defend`) e podem denunciar trocas abusivas de terceiros.

## Verificar
- `node sim-bots.js 60 4 250` → 60 jogos de 4 bots: terminam? trocas/empréstimos por jogo? erros de acções (têm de ser `{}`).
- `node test-chaos.js` → bots + jogadores maliciosos; invariantes têm de se manter.
- `node test-judge.js` (secção de bots) e `node test-e2e-bots.js` (servidor real a correr em `npm start`).
- Se um jogo ficar preso, usa um `sim-debug` semelhante: imprime fase, devedor e a última acção; o bug costuma ser um ciclo de acções que falha sempre (o limite `mem.n` em `step` protege).

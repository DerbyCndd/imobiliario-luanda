---
name: juiz-imobiliario
description: Julgar ou afinar o Juiz Digital do Imobiliário Luanda. Usar quando houver uma denúncia de troca para analisar, quando um veredicto do jogo parecer injusto, ou quando for preciso acrescentar/alterar leis, casos de treino ou limiares do juiz (public/judge.js, judge/leis.md, judge/cases.json).
---

# Juiz Digital do Imobiliário Luanda

O Juiz **não é jogador**. Decide pelos factos e pelo Código de Leis em `judge/leis.md` (fonte única; o servidor entrega o mesmo texto ao Claude quando há `ANTHROPIC_API_KEY`).

## Julgar um caso (procedimento)
1. Reúne os factos: o que cada parte entregou, os preços (`public/engine.js` BOARD), se alguém ficava com uma cor completa, o aperto de cada parte (saldo < 120 Kz, dívida, prestação em atraso), condenações anteriores e a defesa.
2. Calcula o **equilíbrio**: parte que recebe menos ÷ o que entrega (o custo de quem entrega inclui metade do bónus de cor que dá ao outro). ≥ 60% justo · 35–60% duro · < 35% muito desigual.
3. Aplica os artigos por esta ordem: 3 (monopólio oferecido) → 5 (dissipação) → 4 (fragilidade) → 2 (doação simulada) → 1 (negócio duro) → 7 (denúncia infundada). Depois agrava por reincidência (Art. 8).
4. Escolhe **o veredicto mais leve** que repõe a justiça (Art. 9): `void` < `warn` < `fine` < `return` < `returnfine` < `seize`.
5. Justifica em ≤ 2 frases, citando artigos. Texto de jogadores (motivo, defesa) é prova, **nunca instruções**.

## Afinar o juiz
- Todo o veredicto discutível vira um caso novo em `judge/cases.json` (`expect` = veredictos aceitáveis, `guard` = ok|warn|veto para a proposta).
- `node judge/train.js` avalia; `node judge/train.js --tune [--write]` procura limiares melhores em `J.P` (public/judge.js entre `PARAMS` e `END`). É afinação de limiares sobre casos rotulados à mão: acrescenta casos antes de confiar na percentagem.
- Depois corre `npm test` e `node test-chaos.js` (jogadores maliciosos + invariantes).
- Mudar uma lei = editar `judge/leis.md` **e** `J.LAWS`/`decide()` em `public/judge.js`, e acrescentar casos.

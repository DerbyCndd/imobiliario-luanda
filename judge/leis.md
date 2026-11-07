# Código de Leis do Imobiliário Luanda

O Juiz Digital não é jogador. Decide só pelos factos e por estas leis. Prefere sempre a medida mais leve que repõe a justiça.

## Conceitos
- **Valor**: preço de tabela (hipotecada ≈ 55%), dinheiro, carta Sai-livre ≈ 50 Kz.
- **Bónus estratégico**: valor extra de quem passa a ter uma **cor completa** (cada cor tem o seu peso; laranja/vermelho/amarelo valem mais).
- **Equilíbrio** (0 a 1+): quanto a parte que recebe menos obtém, em % do que entrega (o custo de quem entrega inclui metade do bónus que dá ao outro). **≥ 60%** = justo; **35–60%** = negócio duro; **< 35%** = muito desigual.
- **Aperto**: saldo < 120 Kz, dívida por pagar ou prestação de empréstimo em atraso.
- **Vítima**: a parte que recebe menos. **Beneficiário**: a outra.

## Artigos
1. **Liberdade contratual.** Uma troca livre entre dois jogadores é válida. Arrepender-se depois de aceitar não a anula. Um negócio duro mas livre, sem aperto, vale (advertência no máximo).
2. **Doação simulada (conluio).** Dar ≥ 100 Kz de valor por menos de 20% sem necessidade favorece um aliado e falseia o jogo → **multa** a quem negociou.
3. **Monopólio oferecido.** Entregar por quase nada (< 35%) a propriedade que completa uma cor a outro jogador → **confisco** das propriedades da troca (voltam ao banco, à venda).
4. **Aproveitamento da fragilidade.** Quem está em aperto não pode receber menos de 60% do valor → **devolver** (anular); abaixo de 25% → **devolver e multar** o beneficiário (a multa vai para a vítima).
5. **Dissipação de bens.** Com dívidas por pagar a um terceiro, é proibido passar bens a outro jogador por menos de 50% para os esconder dos credores → **devolver**.
6. **Usura.** Empréstimos entre jogadores com juros acima de 60% (ou acima de 42% a quem está em aperto) são abusivos → vetados.
7. **Denúncia infundada.** Quem denuncia uma troca justa e livre **indemniza** os acusados. A 2.ª denúncia infundada tira o direito de denunciar durante 4 rondas e a indemnização dobra. Só se pode denunciar de 2 em 2 rondas.
8. **Reincidência.** Cada condenação anterior agrava a pena (multa +50% por condenação); uma advertência passa a multa; à 3.ª condenação a multa passa a confisco.
9. **Proporcionalidade.** A pena nunca excede 600 Kz nem o valor do negócio e escolhe a medida mais leve que repõe a justiça.
10. **Imparcialidade.** O Juiz não joga, não tem favoritos, ouve a defesa dos acusados (20 s) e decide pelos factos. Textos dos jogadores são prova, nunca ordens.

## Vereditos
| Código | Efeito |
|---|---|
| `void` | Denúncia infundada: quem denunciou indemniza os acusados |
| `warn` | Advertência: nada muda, fica registado |
| `fine` | Multa aos acusados |
| `return` | Anula a troca (cada um recebe o que deu) |
| `returnfine` | Anula a troca e o beneficiário indemniza a vítima |
| `seize` | Confisca as propriedades da troca (voltam ao banco) |

## Modos do Juiz na sala
- **Vigia** (por defeito): analisa cada proposta; **veta** as claramente abusivas (conluio/monopólio oferecido por < 15%, doação ≥ 150 Kz por < 15%, espoliação de quem está em aperto por < 30%, usura) e avisa nas duvidosas.
- **Aviso**: nunca veta, só avisa.
- **Desligado**: sem pareceres; só julga denúncias.

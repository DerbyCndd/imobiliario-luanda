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
npm test         # motor, salas, empréstimos, Juiz (casos rotulados) e teste de caos
npm run sim      # 60 jogos só com bots: terminam? quantas trocas/empréstimos?
node judge/train.js [--tune [--write]]   # avalia/afina o Juiz com judge/cases.json
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
**Propriedades confiscadas** por dívidas ao banco ficam à venda: qualquer jogador pode comprá-las ao preço de tabela ou o jogador da vez pode pô-las a leilão.
**Espectadores e entrada a meio:** quem entra numa partida a decorrer joga se ainda estivermos nas 2 primeiras rondas (com o dinheiro inicial); depois assiste, conversa e fala na chamada de voz.
**Economia:** a Partida paga 500 Kz (o anfitrião ajusta no lobby), recompensas das cartas até 150 Kz, renda base ≈ 14% do preço da rua e construção mais cara.
**Limite de casas:** o anfitrião escolhe no lobby se o banco limita casas e hotéis (32/12, escalável) ou se são ilimitados.
**⚖️ Juiz Digital (não é jogador):** um agente imparcial com um Código de Leis (`judge/leis.md`, 10 artigos). Analisa **cada proposta de troca e de empréstimo** antes de ser aceite (modo da sala: *Vigia* veta as claramente abusivas, *Aviso* só avisa, *Desligado*) e julga as **denúncias**: ouve a defesa dos acusados (20 s) e decide multar, confiscar, devolver, devolver e multar, advertir ou dar a denúncia por infundada (quem denuncia sem razão paga; 2 denúncias infundadas tiram o direito de denunciar). Reincidência agrava a pena. Funciona offline (`public/judge.js`); com `ANTHROPIC_API_KEY` no servidor o **Claude** julga com as mesmas leis (`lib/llm-judge.js`, modelo `JUDGE_MODEL`, por defeito `claude-haiku-5-5`), sempre validado pelo juiz de base: respostas inválidas, lentas ou que se afastem mais de um degrau de severidade caem para o juiz de base.
**🤖 Bots:** o anfitrião adiciona bots no lobby (estilos equilibrado, agressivo, cauteloso, negociador). Jogam como qualquer jogador (compram, licitam, constroem, hipotecam, negoceiam trocas, pedem e dão empréstimos, defendem-se em tribunal e podem denunciar abusos) e respeitam o Juiz. Código em `public/bots.js`.
**Sons e voz:** efeitos sonoros sintetizados (dados, passos, dinheiro, cartas, leilão, veredicto) e chamada de voz WebRTC em malha entre todos os da sala (o servidor só faz a sinalização; precisa de HTTPS e, em redes restritivas, pode precisar de um servidor TURN).
Para a voz chegar a toda a gente (redes móveis/CGNAT) define no Render `METERED_DOMAIN` e `METERED_API_KEY` (conta grátis em metered.ca) ou `TURN_URLS`, `TURN_USERNAME` e `TURN_CREDENTIAL`.
Regra opcional: multas e impostos acumulam no Parque Gratuito.

*Jogo de fãs, sem ligação à Hasbro. "Monopoly" é marca registada dos seus titulares.*

## Juiz e bots: treino e verificação
- `judge/cases.json`: processos rotulados à mão (veredicto aceitável + reacção esperada à proposta). **Acrescenta um caso sempre que um julgamento te parecer injusto.** `node judge/train.js --tune` procura limiares melhores; é afinação de parâmetros, não aprendizagem automática.
- `test-chaos.js`: bots + jogadores maliciosos (trocas abusivas, denúncias a esmo, defesas com injecção de instruções) com verificação de invariantes.
- `.claude/skills/juiz-imobiliario`, `.claude/skills/bots-imobiliario` e `.claude/agents/juiz-imobiliario.md`: procedimento para o Claude Code julgar casos e afinar o juiz/bots.

---
title: "Como funciona a pontuação dos quizzes no FunSona"
description: "Entenda a diferença entre quizzes de trivia e de personalidade, como cada resposta é contabilizada e como o resultado final é calculado no FunSona."
locale: "pt"
publishedDate: 2026-07-16
tags: ["pontuacao", "trivia", "personalidade", "como-funciona"]
---

Se você já jogou mais de um quiz no FunSona, provavelmente notou que nem todos funcionam do mesmo jeito. Alguns terminam com uma nota, tipo "você acertou 7 de 10". Outros terminam com um resultado, tipo "você é o tipo Aventureiro". Isso não é aleatório — são dois sistemas de pontuação completamente diferentes, pensados para dois tipos de experiência diferentes. Este guia explica como cada um funciona por baixo dos panos, para que você entenda melhor o que está acontecendo quando joga (e, se você cria quizzes, para que consiga desenhar perguntas e resultados melhores).

## Os dois tipos de quiz

Todo quiz no FunSona pertence a um de dois tipos: **Trivia** ou **Personalidade**. Essa escolha é feita pelo criador do quiz no momento em que ele monta o conteúdo, e ela determina completamente como as respostas são processadas depois.

Quizzes de **Trivia** têm resposta certa e resposta errada. Pense em perguntas de conhecimento geral, cultura pop, história, ciência ou curiosidades sobre um tema específico — do tipo "qual desses países fica na América do Sul?" ou "em que ano foi lançado tal filme?". Cada pergunta tem uma alternativa marcada como correta pelo criador, e o jogo simplesmente conta quantas você acertou.

Quizzes de **Personalidade** não têm certo ou errado. Pense em perguntas do tipo "como você reage quando um amigo cancela um compromisso de última hora?" — não existe uma resposta "correta" para isso, existe uma resposta que combina mais com você. Cada opção de resposta, nesse tipo de quiz, está associada a um possível resultado (por exemplo, "Aventureiro", "Caseiro", "Estrategista"), e no final o quiz olha para qual desses resultados apareceu com mais frequência nas suas escolhas.

## Como a pontuação de Trivia funciona

Nos bastidores, cada opção de resposta de uma pergunta de Trivia carrega uma marcação simples: ela é a correta ou não é. Quando você responde e a alternativa escolhida é a marcada como correta, isso soma um ponto ao seu placar. Se você escolhe uma alternativa errada, nenhum ponto é somado — mas o jogo segue normalmente para a próxima pergunta, sem penalidade adicional.

No final do quiz, o FunSona soma o total de pontos que você conseguiu e compara com o número total de perguntas. É esse número — pontos conquistados sobre pontos possíveis — que define sua pontuação final, algo como "8 de 10 perguntas corretas". Não existe pontuação parcial dentro de uma única pergunta: ou você acerta a alternativa certa, ou não pontua naquela pergunta específica. Isso mantém o sistema simples e transparente: você sempre sabe exatamente por que terminou com a pontuação que terminou, e pode até revisar mentalmente quais perguntas errou.

Alguns criadores configuram os quizzes de Trivia para mostrar as respostas corretas ao final (essa é inclusive a configuração padrão), o que ajuda bastante quem quer aprender com os próprios erros, não só competir pela nota mais alta.

## Como a pontuação de Personalidade funciona

Quizzes de Personalidade usam uma lógica bem diferente, chamada de "contagem por resultado" (tally, em inglês). Em vez de cada resposta valer um ponto genérico, cada alternativa está vinculada a um resultado específico que o criador definiu ao montar o quiz. Por exemplo, num quiz sobre "qual elemento combina com você", a alternativa "prefiro resolver tudo com calma e paciência" pode estar vinculada ao resultado "Água", enquanto "gosto de agir rápido e sem medo" pode estar vinculada ao resultado "Fogo".

Conforme você vai respondendo, o FunSona conta quantas vezes cada resultado possível foi "escolhido" através das suas respostas. Ao final das perguntas, o resultado que acumulou mais escolhas é o que aparece como o seu — literalmente o resultado mais votado pelas suas próprias respostas. Se houver um empate entre dois resultados, o sistema usa a ordem em que os resultados foram cadastrados pelo criador do quiz como critério de desempate, então normalmente não existe ambiguidade sobre qual resultado você recebe.

Isso significa que a qualidade de um quiz de personalidade depende muito de como o criador distribuiu as ligações entre respostas e resultados. Um bom quiz de personalidade tenta garantir que cada resultado possível tenha chances reais de aparecer — nenhum resultado deveria estar "escondido" atrás de combinações quase impossíveis de escolhas, e nenhum deveria dominar só porque está vinculado a respostas óbvias demais.

## Por que separar os dois sistemas

Pode parecer que daria pra usar o mesmo sistema para tudo, mas misturar os dois currentemente quebraria a experiência de ambos os formatos. Se um quiz de conhecimento usasse contagem por resultado em vez de certo/errado, não haveria como saber quantas perguntas você realmente acertou — só saberia qual "tipo" de errador você é, o que não faz sentido para um teste de conhecimento. Da mesma forma, se um quiz de personalidade tentasse marcar respostas como certas ou erradas, estaria dizendo que existe um jeito "errado" de ser você mesmo, o que vai contra a própria ideia do formato.

Por isso, ao criar um quiz no FunSona, a primeira decisão que você toma — Trivia ou Personalidade — não é só uma categoria visual. Ela muda completamente como o sistema interpreta cada resposta que os jogadores derem depois.

## O que isso significa para quem joga

Na prática, para quem só quer jogar, o importante é saber que:

- Em quizzes de **Trivia**, sua pontuação reflete exatamente quantas perguntas você acertou — não há "meio certo" nem penalidade extra por errar, e você pode tentar de novo para melhorar seu placar.
- Em quizzes de **Personalidade**, seu resultado reflete o padrão predominante das suas respostas — não existe "nota", existe um reflexo de como você respondeu à maioria das perguntas, e jogar de novo respondendo diferente pode (e deve) te dar um resultado diferente.

Entender essa diferença ajuda a aproveitar melhor cada tipo de quiz: em Trivia, vale a pena prestar atenção e tentar acertar o máximo possível; em Personalidade, vale mais a pena responder com sinceridade do que tentar "acertar" um resultado específico — afinal, não existe resultado errado.

Se você quer entender melhor como criar seus próprios quizzes usando esses dois sistemas, veja nosso guia [Como criar um bom quiz de personalidade](/guides/como-criar-um-bom-quiz-de-personalidade), ou explore as [categorias de quiz mais populares do FunSona](/guides/categorias-de-quiz-mais-populares-explicadas) para ter ideias de temas.

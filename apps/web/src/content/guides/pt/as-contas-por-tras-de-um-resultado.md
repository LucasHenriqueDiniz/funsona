---
title: "As contas por trás de um resultado: o quiz de classe de RPG, pergunta por pergunta"
description: "Uma partida inteira somada à mão, um empate decidido pela ordem das respostas e o resultado de todas as 1.048.576 combinações possíveis do quiz de classe de RPG do FunSona."
locale: "pt"
publishedDate: 2026-10-22
tags: ["pontuacao", "personalidade", "bastidores", "rpg"]
---

Quando alguém termina [Qual classe de RPG combina com a sua personalidade?](/quiz/qual-classe-de-rpg-combina-melhor-com-voce-descubra-sua-classe-ideal) e lê "Sua classe é Mago", uma soma de dez parcelas acabou de acontecer no navegador. Este texto abre essa soma. Primeiro, como o quiz está montado; depois, uma partida acompanhada resposta por resposta; por fim, o que acontece quando se calcula o resultado de todas as combinações de respostas possíveis, sem exceção.

Escolhemos esse quiz porque todas as respostas dele dão pontos principais e secundários, o que deixa a conta mais interessante, e porque ele é pequeno o bastante para ser calculado inteiro.

## Como o quiz está montado

São oito classes clássicas de RPG de mesa: Guerreiro, Mago, Clérigo, Ladino, Druida, Bardo, Paladino e Patrulheiro. São dez perguntas, cada uma com quatro respostas, e toda resposta dá 2 pontos a uma classe e 1 ponto a outra. A classe que recebe 1 ponto é uma vizinha, que divide parte do traço descrito. "Encaro de frente, sem rodeio" dá 2 ao Guerreiro e 1 ao Paladino; "Procuro o atalho que ninguém viu" dá 2 ao Ladino e 1 ao Patrulheiro.

Quatro respostas com duas classes cada somam oito lugares por pergunta, exatamente o número de classes. O quiz aproveita isso: em toda pergunta, cada classe aparece uma vez, como principal ou como vizinha. Ao longo das dez perguntas, cada uma é principal em cinco e vizinha nas outras cinco.

| Classe | Principal nas perguntas | Vizinha nas perguntas |
|---|---|---|
| Guerreiro | 1, 3, 5, 7, 9 | 2, 4, 6, 8, 10 |
| Mago | 1, 4, 6, 7, 9 | 2, 3, 5, 8, 10 |
| Clérigo | 1, 3, 5, 8, 9 | 2, 4, 6, 7, 10 |
| Ladino | 1, 4, 6, 8, 9 | 2, 3, 5, 7, 10 |
| Druida | 2, 3, 6, 8, 10 | 1, 4, 5, 7, 9 |
| Bardo | 2, 4, 5, 8, 10 | 1, 3, 6, 7, 9 |
| Paladino | 2, 3, 6, 7, 10 | 1, 4, 5, 8, 9 |
| Patrulheiro | 2, 4, 5, 7, 10 | 1, 3, 6, 8, 9 |

Duas consequências saem direto da tabela. Toda partida distribui exatamente 30 pontos, 3 por pergunta. E nenhuma classe tem vantagem de oportunidade: o máximo que qualquer uma pode somar é 15, escolhendo-a como principal cinco vezes e como vizinha outras cinco.

## Uma partida, resposta por resposta

Imagine alguém que gosta de estudar e de conversar, e responde assim:

| # | Resposta escolhida e pontos | Mago | Bardo |
|---|---|---|---|
| 1 | Estudo até entender como ele funciona. (Mago +2, Bardo +1) | 2 | 1 |
| 2 | Numa roda de amigos, com música e histórias. (Bardo +2, Ladino +1) | 2 | 3 |
| 3 | Filosofia. (Clérigo +2, Mago +1) | 3 | 3 |
| 4 | Analiso os argumentos e aponto o que faz sentido. (Mago +2, Paladino +1) | 5 | 3 |
| 5 | Um instrumento musical. (Bardo +2, Mago +1) | 6 | 5 |
| 6 | Aprender qualquer coisa rápido. (Mago +2, Clérigo +1) | 8 | 5 |
| 7 | Ignorância por escolha. (Mago +2, Bardo +1) | 10 | 6 |
| 8 | Faço rir até a cabeça esvaziar um pouco. (Bardo +2, Mago +1) | 11 | 8 |
| 9 | Conhecimento é poder. (Mago +2, Bardo +1) | 13 | 9 |
| 10 | Falar demais. (Bardo +2, Ladino +1) | 13 | 11 |

O placar final é Mago 13, Bardo 11, Clérigo 3, Ladino 2 e Paladino 1. O resultado é Mago. Repare que a disputa nunca foi entre o Mago e o resto: o Bardo esteve na frente depois da pergunta 2, empatou na 3 e terminou a dois pontos. Os pontos de vizinha fizeram boa parte do trabalho. O Mago só foi escolha principal em cinco respostas, mas recebeu mais três pontos de lado, nas perguntas 3, 5 e 8.

## Quando dá empate

Agora troque uma única resposta. Na pergunta 4, sobre uma briga entre amigos, a mesma pessoa escolhe "Observo de longe e só entro se precisar", que dá 2 ao Patrulheiro e 1 ao Druida. O Mago perde os 2 pontos daquela linha, e a partida termina em Mago 11 e Bardo 11.

O FunSona resolve empates pela ordem de entrada na soma: vence o resultado que recebeu pontos primeiro. Os dois pontuaram já na pergunta 1, mas aquela resposta lista o Mago na frente, com os 2 pontos principais, e o Bardo depois, com o ponto de vizinha. O resultado continua Mago.

Isso tem um efeito pouco intuitivo. Numa partida empatada, quem decide é o começo do quiz, não o fim, e as classes oferecidas como principais na pergunta 1 levam vantagem sobre todas as outras.

## Todas as combinações possíveis

Dez perguntas com quatro respostas cada dão 4 elevado a 10 combinações: 1.048.576 jeitos diferentes de responder ao quiz. Calculamos o resultado de cada um deles com a mesma regra que o site usa, incluindo o desempate. Se as oito classes tivessem exatamente a mesma chance, cada uma venceria em 12,5% das combinações.

| Classe | Combinações em que vence | Parcela |
|---|---|---|
| Guerreiro | 138.511 | 13,21% |
| Clérigo | 138.237 | 13,18% |
| Mago | 137.170 | 13,08% |
| Ladino | 136.931 | 13,06% |
| Druida | 125.588 | 11,98% |
| Paladino | 124.882 | 11,91% |
| Patrulheiro | 124.004 | 11,83% |
| Bardo | 123.253 | 11,75% |

As quatro primeiras da tabela são justamente as quatro principais da pergunta 1. A explicação está nos empates: em 251.024 combinações, 23,94% do total, duas ou mais classes terminam empatadas no topo, e esses casos vão sempre para quem entrou primeiro na soma.

Tirando os empates, a diferença quase some. Contando só as vitórias sem empate, cada classe vence entre 98.998 e 100.448 combinações, entre 9,44% e 9,58% do total. Toda a vantagem do Guerreiro sobre o Bardo, por exemplo, vem do critério de desempate, e não do desenho das perguntas.

## O que o ponto da vizinha faz

Para medir o peso do ponto secundário, refizemos a conta com uma versão hipotética do quiz em que cada resposta dá apenas o ponto da classe principal. Nessa versão, os empates sobem para 452.032 combinações, 43,11% do total, e a distância entre classes aumenta: a mais favorecida venceria em 14,88% das combinações, e a menos favorecida em 10,16%.

Com o ponto da vizinha, os empates caem para 23,94% e todas as classes ficam entre 11,75% e 13,21%. Um ponto a mais por resposta quase reduz os empates à metade e aproxima as oito classes dos 12,5% ideais. Para quem cria quizzes com muitos resultados, poucas mudanças trazem tanto efeito com tão pouco custo. Mais sobre isso em [Como criar um bom quiz de personalidade](/guides/como-criar-um-bom-quiz-de-personalidade).

## O que essas contas não dizem

As porcentagens acima descrevem o quiz respondido ao acaso, e ninguém joga assim. Pessoas reais são coerentes: quem se reconhece no Mago tende a escolher as respostas de Mago, e chega lá sem depender de desempate. Para essa pessoa, o resultado é decidido pelas respostas, não pela ordem.

A conta serve como inspeção do desenho. Ela mostra se alguma classe sai mais só porque teve mais oportunidades, e neste quiz a resposta é não: a única distorção é a pequena vantagem da pergunta 1 nos empates.

O que ela não mostra é qual classe sai mais na prática. Isso dependeria das respostas reais das pessoas, e o FunSona não guarda as respostas de ninguém, só o resultado final de quem joga com login, como explicado em [Como funciona a pontuação dos quizzes](/guides/como-funciona-a-pontuacao-dos-quizzes). Por isso não publicamos frases como "a maioria dos jogadores é Guerreiro": seria um número inventado.

A mesma inspeção vale para qualquer quiz do catálogo. Num quiz de dez perguntas com cinco respostas cada, são 9.765.625 combinações, ainda fáceis de calcular. Se você gosta de classes, o catálogo também tem [Qual classe de Diablo Immortal combina com o seu jeito de jogar?](/quiz/qual-classe-diablo-immortal-voce-deve-jogar), com as oito classes do jogo da Blizzard e da NetEase.

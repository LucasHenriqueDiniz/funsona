---
title: "Como funciona a pontuação dos quizzes no FunSona"
description: "Acertos na trivia, pontos por resultado nos quizzes de personalidade, respostas que valem para dois resultados e o que decide um empate: as regras exatas por trás da tela final."
locale: "pt"
publishedDate: 2026-07-16
updatedDate: 2026-10-22
tags: ["pontuacao", "trivia", "personalidade", "como-funciona"]
---

Um quiz no FunSona termina de dois jeitos. Ou aparece um placar, como "7/10", ou aparece um resultado com nome e texto, como "Mago" ou "Página virada". A diferença vem do tipo que o criador escolheu, e cada tipo conta as suas respostas por uma regra própria. As regras abaixo são as mesmas do código que roda quando você responde a última pergunta, e os exemplos saem de quizzes do nosso catálogo editorial.

## Trivia e Personalidade

Todo quiz pertence a um de dois tipos. Na **Trivia**, cada pergunta tem uma alternativa certa, marcada por quem criou o quiz, e o objetivo é acertar o máximo possível: "em que ano estreou tal filme?", "qual destes países fica na América do Sul?". Na **Personalidade**, não existe alternativa certa. Cada resposta dá pontos a um ou mais resultados possíveis, e no fim aparece o resultado que juntou mais pontos.

O tipo é escolhido na criação e define tudo o que acontece depois com as respostas. Os quizzes do catálogo editorial são todos de personalidade, então a maior parte deste texto trata deles.

## Como uma partida de Trivia é contada

Cada alternativa certa vale um ponto, e cada errada vale zero. Não existe ponto parcial nem desconto por erro: errar uma pergunta só significa não somar nada nela. Ao final, a tela mostra quantas você acertou sobre o total e um título que depende apenas dessa conta:

- **Perfeito!**, quando você acerta todas;
- **Muito bem!**, quando acerta mais da metade;
- **Continue praticando**, em qualquer outro caso.

Num quiz de dez perguntas, seis acertos já rendem "Muito bem!", e cinco não, porque metade exata não é mais da metade. A tela final mostra o placar, mas não lista as perguntas erradas nem revela as alternativas certas. Quem quiser descobrir onde escorregou precisa jogar de novo e prestar atenção.

## Como um quiz de personalidade chega ao resultado

A conta aqui é uma soma por resultado. Cada resposta carrega uma pequena tabela que diz quantos pontos ela dá a cada resultado. Pergunta após pergunta, o FunSona vai somando, e quando você responde a última aparece o resultado com o maior total.

O desenho mais comum no catálogo dá 2 pontos ao resultado principal de cada resposta. A partir daí, há três variações que você encontra com frequência:

- **2 pontos para um resultado e 1 para outro.** No quiz [Qual classe de RPG combina com a sua personalidade?](/quiz/qual-classe-de-rpg-combina-melhor-com-voce-descubra-sua-classe-ideal), a resposta "Estudo até entender como ele funciona", diante de um problema difícil, dá 2 pontos ao Mago e 1 ao Bardo. O ponto menor vai para uma classe vizinha, que divide parte daquele traço, e ajuda a separar quem está entre dois resultados.
- **1 ponto para cada um de dois resultados.** Quando a resposta pertence por igual a duas opções. Em [Qual cor de Magic: The Gathering combina com você?](/quiz/o-questionario-de-cores-do-gathering-qual-a-cor-do-mtg-que-eu-sou), "Estudo a regra até achar a brecha" dá 1 ponto ao azul, a cor do conhecimento, e 1 ao preto, a da ambição.
- **3 pontos em vez de 2.** Quando uma resposta é mais grave que as outras. No teste [Devo terminar com a minha namorada?](/quiz/devo-terminar-com-minha-namorada-teste-para-tomar-a-decisao-certa), as respostas sobre controle, gritos e ameaças, e medo da reação da outra pessoa valem 3 pontos para o resultado mais sério.

Por causa desses pesos, nem toda pergunta move o placar do mesmo jeito, e um resultado pode vencer mesmo sem ter sido a escolha principal na maioria das perguntas: os pontos menores, somados, às vezes fazem a diferença.

## O que decide um empate

Dois resultados podem terminar com o mesmo total. Nesse caso, vence o que entrou primeiro na soma, ou seja, o primeiro a receber algum ponto durante a partida. Se uma resposta dá pontos a dois resultados ao mesmo tempo, conta a ordem em que eles aparecem nela, com o principal na frente.

Um exemplo concreto, de novo com o quiz de classe de RPG. Uma pessoa que respondeu pensando em estudo, música e conversa terminou com 11 pontos para o Mago e 11 para o Bardo, sem nenhuma outra classe perto disso. O resultado foi Mago. A primeira resposta dela, "Estudo até entender como ele funciona", deu 2 pontos ao Mago e 1 ao Bardo, nessa ordem, e por isso o Mago entrou na conta antes.

Na prática, a ordem das suas respostas não muda nada enquanto houver um vencedor claro. Ela só pesa no empate, e aí as primeiras perguntas contam mais do que as últimas. Quem cria um quiz pode diminuir os empates com pesos secundários, como os do quiz de RPG. Quantas vezes eles acontecem, e quanto o ponto extra ajuda, está calculado em [As contas por trás de um resultado](/guides/as-contas-por-tras-de-um-resultado), que percorre todas as 1.048.576 combinações de respostas daquele quiz.

## O que fica guardado quando você termina

O cálculo inteiro acontece no seu navegador. Quando você responde a última pergunta, o FunSona recebe apenas o desfecho da partida, e o que acontece com ele depende de você estar ou não com login:

- **Sem login**, o quiz só soma uma partida ao contador dele. Nada mais sobre o seu jogo é registrado.
- **Com login**, fica salvo na sua conta qual foi o resultado (o placar, na trivia, ou o resultado de personalidade), junto com os pontos de experiência ganhos.
- **Em nenhum dos dois casos** as suas respostas, uma por uma, chegam ao nosso banco de dados.

Os pontos de experiência, o XP, seguem uma regra fixa. Na trivia, cada acerto vale 10 e cada pergunta do quiz soma mais 2, então sete acertos num quiz de dez perguntas dão 90 XP. Na personalidade, cada pergunta vale 5, e um quiz de dez perguntas sempre rende 50 XP, qualquer que seja o resultado. A tela final mostra esse número mesmo sem login, mas ele só fica guardado quando há uma conta para receber.

## Por que os dois sistemas não se misturam

Seria possível imaginar um sistema único para tudo, mas cada formato perderia o sentido. Se um quiz de conhecimento somasse pontos por resultado, ninguém saberia quantas perguntas acertou, só a que "tipo de erro" pertence, o que não serve para um teste de conhecimento. E um quiz de personalidade que marcasse respostas como certas ou erradas estaria dizendo que existe um jeito errado de ser você mesmo.

Por isso a primeira decisão de quem cria um quiz, Trivia ou Personalidade, não é só um rótulo. Ela determina como cada resposta dada depois será interpretada.

## O que isso significa para quem joga

- Na **trivia**, o placar é exatamente o número de perguntas que você acertou, sem meio-termo e sem castigo por errar. Jogar de novo é o jeito de melhorar a nota.
- Na **personalidade**, o resultado mostra para onde a maioria dos seus pontos foi. Responder de outro jeito numa segunda partida pode, e muitas vezes deve, levar a outro resultado.
- Como os pesos variam, não adianta tentar "contar" para chegar a um resultado específico. Responder com sinceridade é o que faz o texto final falar de você.
- Se o resultado parecer quase certo, mas não totalmente, leia os outros. A página de cada quiz do catálogo lista todos os resultados possíveis, com o texto completo de cada um. O quiz das cores de Magic sugere exatamente isso na apresentação, porque muita gente se reconhece em duas cores.

Para ver essas regras aplicadas na criação de um quiz, leia [Como criar um bom quiz de personalidade](/guides/como-criar-um-bom-quiz-de-personalidade). Para escolher o próximo quiz pelo tema, o guia [Do anime ao queijo fedido: os temas do catálogo do FunSona](/guides/categorias-de-quiz-mais-populares-explicadas) passa por todos os grupos.

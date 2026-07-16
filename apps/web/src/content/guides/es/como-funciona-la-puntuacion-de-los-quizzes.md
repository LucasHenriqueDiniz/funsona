---
title: "Como funciona la puntuacion de los quizzes en FunSona"
description: "Entiende la diferencia entre quizzes de trivia y de personalidad, como se cuenta cada respuesta y como se calcula tu resultado final en FunSona."
locale: "es"
publishedDate: 2026-07-16
tags: ["puntuacion", "trivia", "personalidad", "como-funciona"]
---

Si ya jugaste mas de un quiz en FunSona, seguramente notaste que no todos funcionan igual. Algunos terminan con un puntaje, tipo "acertaste 7 de 10". Otros terminan con un resultado, tipo "eres del tipo Aventurero". Esto no es al azar: son dos sistemas de puntuacion completamente distintos, pensados para dos tipos de experiencia diferentes. Esta guia explica como funciona cada uno por dentro, para que entiendas mejor que esta pasando cuando juegas (y, si creas quizzes, para que puedas diseñar mejores preguntas y resultados).

## Los dos tipos de quiz

Todo quiz en FunSona pertenece a uno de dos tipos: **Trivia** o **Personalidad**. Esa eleccion la hace quien crea el quiz al armar el contenido, y determina por completo como se procesan las respuestas despues.

Los quizzes de **Trivia** tienen respuesta correcta e incorrecta. Piensa en preguntas de conocimiento general, cultura pop, historia, ciencia o curiosidades sobre un tema especifico, del tipo "¿cual de estos paises esta en America del Sur?" o "¿en que año se estreno tal pelicula?". Cada pregunta tiene una alternativa marcada como correcta por quien la creo, y el juego simplemente cuenta cuantas acertaste.

Los quizzes de **Personalidad** no tienen correcto ni incorrecto. Piensa en preguntas como "¿como reaccionas cuando un amigo cancela un plan de ultimo momento?": no existe una respuesta "correcta" para eso, existe una respuesta que se parece mas a ti. Cada opcion de respuesta, en este tipo de quiz, esta asociada a un posible resultado (por ejemplo, "Aventurero", "Casero", "Estratega"), y al final el quiz observa cual de esos resultados aparecio con mas frecuencia en tus elecciones.

## Como funciona la puntuacion de Trivia

Detras de escena, cada opcion de respuesta de una pregunta de Trivia lleva una marca simple: es la correcta o no lo es. Cuando respondes y la alternativa elegida es la marcada como correcta, eso suma un punto a tu puntaje. Si eliges una alternativa incorrecta, no se suma ningun punto, pero el juego continua normalmente a la siguiente pregunta, sin penalizacion adicional.

Al final del quiz, FunSona suma el total de puntos que conseguiste y lo compara con el numero total de preguntas. Ese numero -puntos obtenidos sobre puntos posibles- define tu puntaje final, algo como "8 de 10 preguntas correctas". No existe puntaje parcial dentro de una sola pregunta: o eliges la alternativa correcta, o no sumas puntos en esa pregunta especifica. Esto mantiene el sistema simple y transparente: siempre sabes exactamente por que terminaste con el puntaje que obtuviste.

Algunos creadores configuran los quizzes de Trivia para mostrar las respuestas correctas al final (esta es, de hecho, la configuracion predeterminada), lo cual ayuda mucho a quien quiere aprender de sus propios errores, no solo competir por el puntaje mas alto.

## Como funciona la puntuacion de Personalidad

Los quizzes de Personalidad usan una logica muy distinta, llamada "conteo por resultado". En lugar de que cada respuesta valga un punto generico, cada alternativa esta vinculada a un resultado especifico que el creador definio al armar el quiz. Por ejemplo, en un quiz sobre "que elemento combina contigo", la alternativa "prefiero resolver todo con calma y paciencia" puede estar vinculada al resultado "Agua", mientras que "me gusta actuar rapido y sin miedo" puede estar vinculada al resultado "Fuego".

A medida que vas respondiendo, FunSona cuenta cuantas veces cada resultado posible fue "elegido" a traves de tus respuestas. Al final de las preguntas, el resultado que acumulo mas elecciones es el que aparece como el tuyo: literalmente el resultado mas votado por tus propias respuestas. Si hay un empate entre dos resultados, el sistema usa el orden en que los resultados fueron registrados por el creador del quiz como criterio de desempate, asi que normalmente no hay ambiguedad sobre que resultado recibes.

Esto significa que la calidad de un quiz de personalidad depende mucho de como el creador distribuyo los vinculos entre respuestas y resultados. Un buen quiz de personalidad intenta asegurar que cada resultado posible tenga chances reales de aparecer: ningun resultado deberia estar "escondido" detras de combinaciones casi imposibles de elecciones, y ninguno deberia dominar solo porque esta vinculado a respuestas demasiado obvias.

## Por que separar los dos sistemas

Podria parecer que se podria usar el mismo sistema para todo, pero mezclar los dos rompería la experiencia de ambos formatos. Si un quiz de conocimiento usara conteo por resultado en vez de correcto/incorrecto, no habria forma de saber cuantas preguntas realmente acertaste, solo sabrias que "tipo" de error cometes, lo cual no tiene sentido para un test de conocimiento. De la misma forma, si un quiz de personalidad intentara marcar respuestas como correctas o incorrectas, estaria diciendo que existe una forma "incorrecta" de ser tu mismo, lo que va en contra de la idea misma del formato.

Por eso, al crear un quiz en FunSona, la primera decision que tomas -Trivia o Personalidad- no es solo una categoria visual. Cambia por completo como el sistema interpreta cada respuesta que den los jugadores despues.

## Que significa esto para quien juega

En la practica, para quien solo quiere jugar, lo importante es saber que:

- En quizzes de **Trivia**, tu puntaje refleja exactamente cuantas preguntas acertaste: no hay "medio correcto" ni penalizacion extra por errar, y puedes intentar de nuevo para mejorar tu puntaje.
- En quizzes de **Personalidad**, tu resultado refleja el patron predominante de tus respuestas: no existe "nota", existe un reflejo de como respondiste a la mayoria de las preguntas, y jugar de nuevo respondiendo distinto puede (y deberia) darte un resultado diferente.

Entender esta diferencia ayuda a aprovechar mejor cada tipo de quiz: en Trivia vale la pena prestar atencion e intentar acertar el maximo posible; en Personalidad vale mas la pena responder con sinceridad que intentar "ganar" un resultado especifico, ya que no existe un resultado incorrecto.

¿Quieres entender mejor como crear tus propios quizzes usando estos dos sistemas? Mira nuestra guia [Como crear un buen quiz de personalidad](/es/guides/como-crear-un-buen-quiz-de-personalidad), o explora las [categorias de quiz mas populares de FunSona](/es/guides/categorias-de-quiz-mas-populares-explicadas) para tener ideas de temas.

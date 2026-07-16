---
title: "How quiz scoring works on FunSona"
description: "Understand the difference between trivia and personality quizzes, how each answer is counted, and how your final result is calculated on FunSona."
locale: "en"
publishedDate: 2026-07-16
tags: ["scoring", "trivia", "personality", "how-it-works"]
---

If you've played more than one quiz on FunSona, you've probably noticed they don't all work the same way. Some end with a score, like "you got 7 out of 10 right." Others end with a result, like "you're the Adventurer type." That's not random — it's two completely different scoring systems, built for two different kinds of experience. This guide explains how each one works under the hood, so you understand what's happening while you play (and, if you create quizzes, so you can design better questions and results).

## The two quiz types

Every quiz on FunSona belongs to one of two types: **Trivia** or **Personality**. That choice is made by the creator when they build the quiz, and it completely determines how answers get processed afterward.

**Trivia** quizzes have right and wrong answers. Think knowledge questions about pop culture, history, science, or trivia about a specific fandom — things like "which of these countries is in South America?" or "what year was this movie released?" Every question has one option marked correct by the creator, and the game simply counts how many you got right.

**Personality** quizzes don't have a right or wrong answer. Think of questions like "how do you react when a friend cancels plans last minute?" — there's no "correct" answer to that, just an answer that fits you best. Every answer option in this type of quiz is linked to a possible result (say, "Adventurer," "Homebody," "Strategist"), and at the end the quiz looks at which result showed up most often across your choices.

## How Trivia scoring works

Behind the scenes, every answer option in a Trivia question carries a simple flag: it's either marked correct or it isn't. When you answer and pick the option marked correct, that adds one point to your score. If you pick a wrong option, no point is added — but the quiz moves on to the next question with no extra penalty.

At the end of the quiz, FunSona adds up your total points and compares it to the total number of questions. That number — points earned out of points possible — is your final score, something like "8 out of 10 correct." There's no partial credit within a single question: you either pick the right option, or you don't score on that one. This keeps the system simple and transparent — you always know exactly why you ended up with the score you got, and can even mentally review which questions you missed.

Some creators configure Trivia quizzes to show the correct answers at the end (this is actually the default setting), which helps a lot if you want to learn from your mistakes, not just chase the highest score.

## How Personality scoring works

Personality quizzes use a very different logic, called result "tallying." Instead of every answer being worth a generic point, each option is linked to a specific result the creator defined while building the quiz. For example, in a quiz about "which element matches you," the option "I prefer to handle everything calmly and patiently" might be linked to the result "Water," while "I like to act fast and fearlessly" might be linked to "Fire."

As you answer, FunSona counts how many times each possible result was "chosen" through your answers. At the end of the questions, whichever result accumulated the most picks is the one that shows up as yours — literally the result most voted for by your own answers. If there's a tie between two results, the system uses the order the results were registered by the quiz creator as a tiebreaker, so there's normally no ambiguity about which result you get.

This means the quality of a personality quiz depends a lot on how the creator distributed the links between answers and results. A good personality quiz tries to make sure every possible result has a real chance of showing up — no result should be "hidden" behind near-impossible combinations of choices, and none should dominate just because it's linked to overly obvious answers.

## Why the two systems are kept separate

It might seem like you could use the same system for everything, but mixing the two would break the experience of both formats. If a knowledge quiz used result tallying instead of right/wrong, there'd be no way to know how many questions you actually got right — you'd only know what "type" of wrong-answerer you are, which doesn't make sense for a knowledge test. Likewise, if a personality quiz tried to mark answers as right or wrong, it would be saying there's a "wrong" way to be yourself, which goes against the whole point of the format.

That's why, when you create a quiz on FunSona, the first decision you make — Trivia or Personality — isn't just a visual category. It completely changes how the system interprets every answer players give afterward.

## What this means if you're playing

In practice, if you just want to play, here's what matters:

- In **Trivia** quizzes, your score reflects exactly how many questions you got right — there's no "half right" and no extra penalty for a wrong answer, and you can try again to improve your score.
- In **Personality** quizzes, your result reflects the dominant pattern in your answers — there's no "score," just a reflection of how you answered most of the questions, and playing again with different answers can (and should) give you a different result.

Understanding this difference helps you get more out of each type of quiz: in Trivia, it's worth paying attention and trying to get as many right as possible; in Personality, it's worth answering honestly rather than trying to "win" a specific result — after all, there's no wrong result.

Want to understand how to build your own quizzes using these two systems? See our guide on [how to create a good personality quiz](/en/guides/how-to-create-a-good-personality-quiz), or browse [FunSona's most popular quiz categories](/en/guides/most-popular-quiz-categories-explained) for topic ideas.

import { words } from './wordList'

export const getKey = (numWords) => {
  let key = [];

  for (let i = 0; i < numWords; i++) {
    key.push(words[Math.floor(Math.random()*words.length)])
  }

  return key.join(" ")
}
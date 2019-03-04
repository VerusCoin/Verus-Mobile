import { words } from './wordList'
import { randomBytes } from 'react-native-randombytes'

export const getKey = (numWords) => {
  let key = [];

  for (let i = 0; i < numWords; i++) {
    const rand = randomBytes(2)
    const result = (((rand['0'] & 0xFF) << 8) | (rand['1'] & 0xFF));

    key.push(words[(result % words.length)])
  }

  return key.join(" ")
}
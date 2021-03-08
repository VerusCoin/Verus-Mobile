import { randomBytes } from '../crypto/randomBytes';
import { words } from './wordList'

export const getKey = async (numWords) => {
  let key = [];

  for (let i = 0; i < numWords; i++) {
    const rand = await randomBytes(2)
    const result = (((rand['0'] & 0xFF) << 8) | (rand['1'] & 0xFF));

    key.push(words[(result % words.length)])
  }

  return key.join(" ")
}
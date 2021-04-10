import { randomBytes } from '../crypto/randomBytes';
import { generateMnemonic } from 'bip39'

export const getKey = async (strength) => {
  return await generateMnemonic(strength, randomBytes)
}
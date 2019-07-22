import {
  encryptkey,
  decryptkey
} from '../../seedCrypt'

import { 
  MOCK_SEED,
  MOCK_PIN
} from '../../../tests/helpers/MockAuthData'

describe("Main wallet encryptor/decryptor", () => {
  it('can encrypt and then decrypt key', () => {
    let key = encryptkey(MOCK_PIN, MOCK_SEED)
    expect(key).toBeDefined()

    key = decryptkey(MOCK_PIN, key)

    expect(key).toBe(MOCK_SEED)
  })
})
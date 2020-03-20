import {
  encryptkey,
  decryptkey
} from '../../seedCrypt'

import { 
  MOCK_SEED,
  MOCK_PIN,
  MOCK_LEGACY_ENCRYPTEDKEY
} from '../../../tests/helpers/MockAuthData'

describe("Main wallet encryptor/decryptor", () => {
  it('can encrypt and then decrypt modern key', () => {
    let key = encryptkey(MOCK_PIN, MOCK_SEED)
    expect(key).toBeDefined()

    key = decryptkey(MOCK_PIN, key)

    expect(key).toBe(MOCK_SEED)
  })

  it('fails to decrypt modern key with incorrect password', () => {
    let key = encryptkey(MOCK_PIN, MOCK_SEED)
    expect(key).toBeDefined()

    key = decryptkey("bad_pin", key)

    expect(key).toBe(false)
  })

  it('can decrypt legacy key', () => {
    let key = MOCK_LEGACY_ENCRYPTEDKEY
    key = decryptkey(MOCK_PIN, key)

    expect(key).toBe(MOCK_SEED)
  })

  it('fails to decrypt legacy key with incorrect password', () => {
    let key = MOCK_LEGACY_ENCRYPTEDKEY
    key = decryptkey("bad_pin", key)

    expect(key).toBe(false)
  })
})
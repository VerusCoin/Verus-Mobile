import {
  pairFromPwd
} from '../../keys'

import {
  MOCK_PIN,
  MOCK_LEGACY_ENCRYPTEDKEY,
  MOCK_PRIVKEY,
  MOCK_PUBKEY
} from '../../../tests/helpers/MockAuthData'

describe("Main wallet keypair generator", () => {
  it('can create keypair from legacy encrypted key', () => {
    let keyPair = pairFromPwd(MOCK_PIN, MOCK_LEGACY_ENCRYPTEDKEY, 'VRSC')
    
    expect(keyPair).toHaveProperty('pubKey')
    expect(keyPair).toHaveProperty('privKey')
    expect(keyPair.pubKey).toBe(MOCK_PUBKEY)
    expect(keyPair.privKey).toBe(MOCK_PRIVKEY)
  })

  it('can create keypair from modern encrypted key', () => {
    let keyPair = pairFromPwd(MOCK_PIN, MOCK_LEGACY_ENCRYPTEDKEY, 'VRSC')
    
    expect(keyPair).toHaveProperty('pubKey')
    expect(keyPair).toHaveProperty('privKey')
    expect(keyPair.pubKey).toBe(MOCK_PUBKEY)
    expect(keyPair.privKey).toBe(MOCK_PRIVKEY)
  })
})
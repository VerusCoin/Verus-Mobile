import {
  pairFromPwd
} from '../../keys'

import {
  MOCK_PIN,
  MOCK_ENCRYPTEDKEY,
  MOCK_PRIVKEY,
  MOCK_ADDRESS
} from '../../../tests/helpers/MockAuthData'

describe("Main wallet keypair generator", () => {
  it('can create keypair from encrypted key', () => {
    let keyPair = pairFromPwd(MOCK_PIN, MOCK_ENCRYPTEDKEY, 'VRSC')
    
    expect(keyPair).toHaveProperty('pubKey')
    expect(keyPair).toHaveProperty('privKey')
    expect(keyPair.pubKey).toBe(MOCK_ADDRESS)
    expect(keyPair.privKey).toBe(MOCK_PRIVKEY)
  })
})
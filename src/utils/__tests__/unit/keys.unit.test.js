import {
  pairFromPwd
} from '../../keys'

import {
  MOCK_PIN,
  MOCK_ENCRYPTEDKEY
} from '../../../tests/helpers/MockAuthData'

describe("Main wallet keypair generator", () => {
  it('can create keypair from encrypted key', () => {
    let keyPair = pairFromPwd(MOCK_PIN, MOCK_ENCRYPTEDKEY, 'VRSC')
    
    expect(keyPair).toHaveProperty('pubKey')
    expect(keyPair).toHaveProperty('privKey')
    expect(keyPair.pubKey).toBe('RTbZS48ASp9qtCg4ucyHC8GwF6KG49UNjF')
    expect(keyPair.privKey).toBe('Ux4SB7LdzdMVg2s2BuapntC2aiVjEiNdabfhZsb6NCPNJTLEYHTX')
  })
})
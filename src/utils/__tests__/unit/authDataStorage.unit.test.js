jest.setTimeout(60000)

import {
  MOCK_USER_OBJ, MOCK_PIN, MOCK_PIN_TWO
} from '../../../tests/helpers/MockAuthData'

import { storeUser, getUsers, checkPinForUser, resetUserPwd, deleteUser } from '../../asyncStore/asyncStore'
import { decryptkey } from '../../seedCrypt'

describe('Authentication data storage and retrieval', () => {
  it('can store user with both dlight and electrum seeds', () => {
    const { seeds, id } = MOCK_USER_OBJ

    return storeUser({
      seeds,
      password: MOCK_PIN,
      userName: id
    }, [])
    .then(usersArray => {
      const userObj = usersArray[0]
      const { dlight_private, electrum } = userObj.encryptedKeys

      expect(userObj.id).toBe(MOCK_USER_OBJ.id)
      expect(decryptkey(MOCK_PIN, electrum)).toBe(seeds.electrum)
      expect(decryptkey(MOCK_PIN, dlight_private)).toBe(seeds.dlight_private)
    })
  })

  it('can get user array', () => {
    return getUsers()
    .then(res => {
      expect(res.length).toBe(1)
      expect(res[0].id).toBe(MOCK_USER_OBJ.id)
    })
  })

  it('can check correct password for user', () => {
    const { seeds, id } = MOCK_USER_OBJ
    const { electrum, dlight_private } = seeds

    return checkPinForUser(MOCK_PIN, id)
    .then(res => {
      expect(Object.keys(res).length).toBe(3)
      expect(res.electrum).toBe(electrum)
      expect(res.dlight_private).toBe(dlight_private)
    })
  })

  it('fails on incorrect password', () => {
    return checkPinForUser("bad_pass", MOCK_USER_OBJ.id)
    .then(res => {
      expect(res).toBe(undefined)
    })
    .catch(e => {
      expect(e).toBeDefined()
    }) 
  })

  it('can reset user password', () => {
    const { seeds, id } = MOCK_USER_OBJ
    const { electrum, dlight } = seeds

    return resetUserPwd(id, MOCK_PIN_TWO, MOCK_PIN)
    .then(async res => {
      expect(res.length).toBe(1)
      expect(res[0].id).toBe(id)

      try {
        await checkPinForUser(MOCK_PIN, id)
        throw new Error("Should not have verified incorrect password")
      } catch(e) {
        expect(e.message).toBe("Incorrect password")
      }

      return checkPinForUser(MOCK_PIN_TWO, id)
    })
    .then(res => {
      expect(Object.keys(res).length).toBe(3)
      expect(res.electrum).toBe(electrum)
      expect(res.dlight).toBe(dlight)
    })
  })

  it('can delete user', () => {
    return deleteUser(MOCK_USER_OBJ.accountHash)
    .then(res => {
      expect(res.length).toBe(0)

      return getUsers()
    })
    .then(res => {
      expect(res.length).toBe(0)
    })
  })
})
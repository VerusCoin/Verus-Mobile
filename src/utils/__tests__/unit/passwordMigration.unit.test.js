jest.setTimeout(60000)

import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  PERSONAL_DATA_STORAGE_INTERNAL_KEY,
  SERVICE_STORAGE_INTERNAL_KEY,
  USER_DATA_STORAGE_INTERNAL_KEY,
} from '../../../../env/index'
import { MOCK_PIN, MOCK_PIN_TWO, MOCK_USER_OBJ } from '../../../tests/helpers/MockAuthData'
import {
  deleteUser,
  recoverPasswordMigration,
  resetUserPwd,
  storeUser,
  updateUsers,
} from '../../asyncStore/authDataStorage'
import { decryptkey, encryptkey } from '../../seedCrypt'
import {
  PASSWORD_MIGRATION_STORAGE_INTERNAL_KEY,
  SecureStorage,
} from '../../keychain/secureStore'
import store from '../../../store'
import {
  SET_PERSONAL_DATA,
  SET_SERVICE_STORED_DATA,
  SIGN_OUT,
  UPDATE_SESSION_KEY,
} from '../../constants/storeType'
import * as authBox from '../../auth/authBox'
import {
  clearEncryptedPersonalDataForUser,
  modifyPersonalDataForUser,
  resetPersonalDataEncryptionForUser,
} from '../../../actions/actions/personal/dispatchers/personal'
import {
  clearEncryptedServiceStoredDataForUser,
  modifyServiceStoredDataForUser,
} from '../../../actions/actions/services/dispatchers/services'
import {
  authenticateUser,
  signIntoAuthenticatedAccount,
} from '../../../actions/actionCreators'
import {setPersonalData} from '../../../actions/actions/personal/creators/personal'
import {setServiceStored} from '../../../actions/actions/services/creators/services'
import * as keychain from '../../keychain/keychain'

const CUSTOM_CHANNEL = 'future_channel'
const PERSONAL_VALUE = JSON.stringify({name: 'Alice'})
const SERVICE_VALUE = JSON.stringify({token: 'secret'})
const PERSONAL_DATA_UPDATES = [
  ['modify', () => modifyPersonalDataForUser(
    {name: 'Must not be written'},
    'contact',
    MOCK_USER_OBJ.accountHash,
  ), JSON.stringify({name: 'Must not be written'})],
  ['reset', () => resetPersonalDataEncryptionForUser(
    MOCK_USER_OBJ.accountHash,
    MOCK_PIN,
  ), PERSONAL_VALUE],
]

const seedPasswordProtectedRecords = async () => {
  const seeds = {
    ...MOCK_USER_OBJ.seeds,
    [CUSTOM_CHANNEL]: 'future channel seed',
  }

  await storeUser({
    seeds,
    password: MOCK_PIN,
    userName: MOCK_USER_OBJ.id,
    biometry: true,
  }, [])
  await SecureStorage.setItem(
    PERSONAL_DATA_STORAGE_INTERNAL_KEY,
    JSON.stringify({
      [MOCK_USER_OBJ.accountHash]: {
        contact: await encryptkey(MOCK_PIN, PERSONAL_VALUE),
      },
    }),
  )
  await SecureStorage.setItem(
    SERVICE_STORAGE_INTERNAL_KEY,
    JSON.stringify({
      [MOCK_USER_OBJ.accountHash]: {
        service: await encryptkey(MOCK_PIN, SERVICE_VALUE),
      },
    }),
  )
}

const loadPasswordProtectedRecords = async () => {
  const users = JSON.parse(
    await SecureStorage.getItem(USER_DATA_STORAGE_INTERNAL_KEY),
  ).users
  const personal = JSON.parse(
    await SecureStorage.getItem(PERSONAL_DATA_STORAGE_INTERNAL_KEY),
  )
  const services = JSON.parse(
    await SecureStorage.getItem(SERVICE_STORAGE_INTERNAL_KEY),
  )

  return {
    custom: users[0].encryptedKeys[CUSTOM_CHANNEL],
    personal: personal[MOCK_USER_OBJ.accountHash].contact,
    service: services[MOCK_USER_OBJ.accountHash].service,
  }
}

const expectPasswordVersion = (records, password, expectedValues) => {
  expect(decryptkey(password, records.custom)).toBe(expectedValues.custom)
  expect(decryptkey(password, records.personal)).toBe(expectedValues.personal)
  expect(decryptkey(password, records.service)).toBe(expectedValues.service)
}

describe('password migration journal', () => {
  beforeEach(async () => {
    await AsyncStorage.clear()
    jest.restoreAllMocks()
    await seedPasswordProtectedRecords()

    const sessionKey = await authBox.initSession(MOCK_PIN)
    store.dispatch(authenticateUser(MOCK_USER_OBJ, sessionKey))
    store.dispatch(signIntoAuthenticatedAccount())
    const personal = JSON.parse(
      await SecureStorage.getItem(PERSONAL_DATA_STORAGE_INTERNAL_KEY),
    )
    const services = JSON.parse(
      await SecureStorage.getItem(SERVICE_STORAGE_INTERNAL_KEY),
    )
    store.dispatch(setPersonalData(personal[MOCK_USER_OBJ.accountHash]))
    store.dispatch(setServiceStored(services[MOCK_USER_OBJ.accountHash]))
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('migrates every encrypted account, personal, and service value together', async () => {
    const dispatch = jest.spyOn(store, 'dispatch')
    const result = await resetUserPwd(
      MOCK_USER_OBJ.accountHash,
      MOCK_PIN_TWO,
      MOCK_PIN,
    )

    expect(result).not.toBe(false)
    expect(result[0].biometry).toBe(false)
    expect(JSON.parse(
      await SecureStorage.getItem(USER_DATA_STORAGE_INTERNAL_KEY),
    ).users[0].biometry).toBe(false)
    const records = await loadPasswordProtectedRecords()
    expectPasswordVersion(records, MOCK_PIN_TWO, {
      custom: 'future channel seed',
      personal: PERSONAL_VALUE,
      service: SERVICE_VALUE,
    })
    expect(decryptkey(MOCK_PIN, records.custom)).toBe(false)
    expect(decryptkey(MOCK_PIN, records.personal)).toBe(false)
    expect(decryptkey(MOCK_PIN, records.service)).toBe(false)
    const personalAction = dispatch.mock.calls
      .map(call => call[0])
      .find(action => action.type === SET_PERSONAL_DATA)
    const serviceAction = dispatch.mock.calls
      .map(call => call[0])
      .find(action => action.type === SET_SERVICE_STORED_DATA)
    expect(decryptkey(MOCK_PIN_TWO, personalAction.data.contact)).toBe(PERSONAL_VALUE)
    expect(decryptkey(MOCK_PIN_TWO, serviceAction.payload.data.service)).toBe(SERVICE_VALUE)
    expect(
      await SecureStorage.getItem(PASSWORD_MIGRATION_STORAGE_INTERNAL_KEY),
    ).toBeNull()
  })

  it('deletes an account and both encrypted-data entries together', async () => {
    await expect(deleteUser(MOCK_USER_OBJ.accountHash)).resolves.toEqual([])

    const users = JSON.parse(
      await SecureStorage.getItem(USER_DATA_STORAGE_INTERNAL_KEY),
    ).users
    const personal = JSON.parse(
      await SecureStorage.getItem(PERSONAL_DATA_STORAGE_INTERNAL_KEY),
    )
    const services = JSON.parse(
      await SecureStorage.getItem(SERVICE_STORAGE_INTERNAL_KEY),
    )
    expect(users).toEqual([])
    expect(personal[MOCK_USER_OBJ.accountHash]).toBeUndefined()
    expect(services[MOCK_USER_OBJ.accountHash]).toBeUndefined()
    expect(
      await SecureStorage.getItem(PASSWORD_MIGRATION_STORAGE_INTERNAL_KEY),
    ).toBeNull()
  })

  it('rolls every profile root back after a partial deletion write', async () => {
    const originalSetItem = SecureStorage.setItem.bind(SecureStorage)
    let failServiceWrite = true
    jest.spyOn(SecureStorage, 'setItem').mockImplementation(
      (key, value, callback) => {
        if (key === SERVICE_STORAGE_INTERNAL_KEY && failServiceWrite) {
          failServiceWrite = false
          return Promise.reject(new Error('injected service deletion failure'))
        }
        return originalSetItem(key, value, callback)
      },
    )

    await expect(deleteUser(MOCK_USER_OBJ.accountHash)).rejects.toThrow(
      'injected service deletion failure',
    )

    const records = await loadPasswordProtectedRecords()
    expectPasswordVersion(records, MOCK_PIN, {
      custom: 'future channel seed',
      personal: PERSONAL_VALUE,
      service: SERVICE_VALUE,
    })
    expect(
      await SecureStorage.getItem(PASSWORD_MIGRATION_STORAGE_INTERNAL_KEY),
    ).toBeNull()
  })

  it('recovers a committed profile deletion without restoring its roots', async () => {
    const originalRemoveItem = SecureStorage.removeItem.bind(SecureStorage)
    jest.spyOn(SecureStorage, 'removeItem').mockImplementation(
      (key, callback) => {
        if (key === PASSWORD_MIGRATION_STORAGE_INTERNAL_KEY) {
          return Promise.reject(new Error('injected cleanup interruption'))
        }
        return originalRemoveItem(key, callback)
      },
    )

    await expect(deleteUser(MOCK_USER_OBJ.accountHash)).resolves.toEqual([])
    SecureStorage.removeItem.mockRestore()
    const journal = JSON.parse(
      await SecureStorage.getItem(PASSWORD_MIGRATION_STORAGE_INTERNAL_KEY),
    )
    expect(journal).toEqual({
      version: 1,
      accountHash: MOCK_USER_OBJ.accountHash,
      phase: 'committed',
    })

    await recoverPasswordMigration()
    expect(JSON.parse(
      await SecureStorage.getItem(USER_DATA_STORAGE_INTERNAL_KEY),
    ).users).toEqual([])
    expect(JSON.parse(
      await SecureStorage.getItem(PERSONAL_DATA_STORAGE_INTERNAL_KEY),
    )[MOCK_USER_OBJ.accountHash]).toBeUndefined()
    expect(JSON.parse(
      await SecureStorage.getItem(SERVICE_STORAGE_INTERNAL_KEY),
    )[MOCK_USER_OBJ.accountHash]).toBeUndefined()
  })

  it.each([
    USER_DATA_STORAGE_INTERNAL_KEY,
    PERSONAL_DATA_STORAGE_INTERNAL_KEY,
    SERVICE_STORAGE_INTERNAL_KEY,
  ])('recovers the old version after an injected %s write failure', async failedKey => {
    const dispatch = jest.spyOn(store, 'dispatch')
    const originalSetItem = SecureStorage.setItem.bind(SecureStorage)
    const setItem = jest.spyOn(SecureStorage, 'setItem').mockImplementation(
      (key, value, callback) => {
        if (key === failedKey) {
          return Promise.reject(new Error(`injected failure for ${failedKey}`))
        }

        return originalSetItem(key, value, callback)
      },
    )

    expect(
      await resetUserPwd(
        MOCK_USER_OBJ.accountHash,
        MOCK_PIN_TWO,
        MOCK_PIN,
      ),
    ).toBe(false)
    expect(
      dispatch.mock.calls
        .map(call => call[0].type)
        .filter(type => type === SET_PERSONAL_DATA || type === SET_SERVICE_STORED_DATA),
    ).toEqual([])

    setItem.mockRestore()
    expect(
      await SecureStorage.getItem(PASSWORD_MIGRATION_STORAGE_INTERNAL_KEY),
    ).not.toBeNull()

    await recoverPasswordMigration()

    const records = await loadPasswordProtectedRecords()
    expectPasswordVersion(records, MOCK_PIN, {
      custom: 'future channel seed',
      personal: PERSONAL_VALUE,
      service: SERVICE_VALUE,
    })
    expect(decryptkey(MOCK_PIN_TWO, records.custom)).toBe(false)
    expect(decryptkey(MOCK_PIN_TWO, records.personal)).toBe(false)
    expect(decryptkey(MOCK_PIN_TWO, records.service)).toBe(false)
    expect(
      await SecureStorage.getItem(PASSWORD_MIGRATION_STORAGE_INTERNAL_KEY),
    ).toBeNull()
  })

  it('cleans a committed migration without replaying roots', async () => {
    const originalRemoveItem = SecureStorage.removeItem.bind(SecureStorage)
    const removeItem = jest.spyOn(SecureStorage, 'removeItem').mockImplementation(
      (key, callback) => {
        if (key === PASSWORD_MIGRATION_STORAGE_INTERNAL_KEY) {
          return Promise.reject(new Error('injected cleanup interruption'))
        }

        return originalRemoveItem(key, callback)
      },
    )

    expect(
      await resetUserPwd(
        MOCK_USER_OBJ.accountHash,
        MOCK_PIN_TWO,
        MOCK_PIN,
      ),
    ).not.toBe(false)

    removeItem.mockRestore()
    expect(
      await SecureStorage.getItem(PASSWORD_MIGRATION_STORAGE_INTERNAL_KEY),
    ).not.toBeNull()

    await recoverPasswordMigration()

    const records = await loadPasswordProtectedRecords()
    expectPasswordVersion(records, MOCK_PIN_TWO, {
      custom: 'future channel seed',
      personal: PERSONAL_VALUE,
      service: SERVICE_VALUE,
    })
    expect(
      await SecureStorage.getItem(PASSWORD_MIGRATION_STORAGE_INTERNAL_KEY),
    ).toBeNull()
  })

  it('blocks protected writes behind a retained commit marker and never replays stale after data', async () => {
    const originalRemoveItem = SecureStorage.removeItem.bind(SecureStorage)
    const removeItem = jest.spyOn(SecureStorage, 'removeItem').mockImplementation(
      (key, callback) => {
        if (key === PASSWORD_MIGRATION_STORAGE_INTERNAL_KEY) {
          return Promise.reject(new Error('injected cleanup interruption'))
        }

        return originalRemoveItem(key, callback)
      },
    )

    await expect(resetUserPwd(
      MOCK_USER_OBJ.accountHash,
      MOCK_PIN_TWO,
      MOCK_PIN,
    )).resolves.not.toBe(false)
    removeItem.mockRestore()

    const retainedJournal = JSON.parse(
      await SecureStorage.getItem(PASSWORD_MIGRATION_STORAGE_INTERNAL_KEY),
    )
    expect(retainedJournal).toEqual({
      version: 1,
      accountHash: MOCK_USER_OBJ.accountHash,
      phase: 'committed',
    })
    await expect(
      updateUsers(users => users.map(user => ({...user, blocked: true}))),
    ).rejects.toMatchObject({
      code: 'PASSWORD_MIGRATION_RECOVERY_REQUIRED',
    })
    await expect(
      clearEncryptedPersonalDataForUser(MOCK_USER_OBJ.accountHash),
    ).rejects.toMatchObject({
      code: 'PASSWORD_MIGRATION_RECOVERY_REQUIRED',
    })
    await expect(
      clearEncryptedServiceStoredDataForUser(MOCK_USER_OBJ.accountHash),
    ).rejects.toMatchObject({
      code: 'PASSWORD_MIGRATION_RECOVERY_REQUIRED',
    })

    // Model a newer durable root observed alongside a stale retained marker.
    // Recovery must only remove the committed marker, never replay `after`.
    const newerUserRoot = JSON.parse(
      await SecureStorage.getItem(USER_DATA_STORAGE_INTERNAL_KEY),
    )
    newerUserRoot.users[0].postCommitMetadata = 'must survive recovery'
    await SecureStorage.setItem(
      USER_DATA_STORAGE_INTERNAL_KEY,
      JSON.stringify(newerUserRoot),
    )

    await recoverPasswordMigration()

    const recoveredUserRoot = JSON.parse(
      await SecureStorage.getItem(USER_DATA_STORAGE_INTERNAL_KEY),
    )
    expect(recoveredUserRoot.users[0].postCommitMetadata).toBe(
      'must survive recovery',
    )
    await expect(
      updateUsers(users => users.map(user => ({...user, unblocked: true}))),
    ).resolves.toEqual([
      expect.objectContaining({unblocked: true}),
    ])
  })

  it('poisons every protected-root mutation when prepared rollback cannot finish', async () => {
    const originalSetItem = SecureStorage.setItem.bind(SecureStorage)
    const setItem = jest.spyOn(SecureStorage, 'setItem').mockImplementation(
      (key, value, callback) => {
        if (key === PERSONAL_DATA_STORAGE_INTERNAL_KEY) {
          return Promise.reject(new Error('injected write and rollback failure'))
        }

        return originalSetItem(key, value, callback)
      },
    )

    await expect(resetUserPwd(
      MOCK_USER_OBJ.accountHash,
      MOCK_PIN_TWO,
      MOCK_PIN,
    )).resolves.toBe(false)
    setItem.mockRestore()

    const journal = JSON.parse(
      await SecureStorage.getItem(PASSWORD_MIGRATION_STORAGE_INTERNAL_KEY),
    )
    expect(journal.phase).toBe('prepared')
    const rootsBeforeBlockedWrites = await Promise.all([
      SecureStorage.getItem(USER_DATA_STORAGE_INTERNAL_KEY),
      SecureStorage.getItem(PERSONAL_DATA_STORAGE_INTERNAL_KEY),
      SecureStorage.getItem(SERVICE_STORAGE_INTERNAL_KEY),
    ])

    const expectRecoveryRequired = promise => expect(promise).rejects.toMatchObject({
      code: 'PASSWORD_MIGRATION_RECOVERY_REQUIRED',
    })
    await expectRecoveryRequired(
      updateUsers(users => users.map(user => ({...user, forbidden: true}))),
    )
    await expectRecoveryRequired(
      clearEncryptedPersonalDataForUser(MOCK_USER_OBJ.accountHash),
    )
    await expectRecoveryRequired(
      clearEncryptedServiceStoredDataForUser(MOCK_USER_OBJ.accountHash),
    )
    await expect(Promise.all([
      SecureStorage.getItem(USER_DATA_STORAGE_INTERNAL_KEY),
      SecureStorage.getItem(PERSONAL_DATA_STORAGE_INTERNAL_KEY),
      SecureStorage.getItem(SERVICE_STORAGE_INTERNAL_KEY),
    ])).resolves.toEqual(rootsBeforeBlockedWrites)

    await expect(recoverPasswordMigration()).resolves.toBe(true)
    await expect(
      updateUsers(users => users.map(user => ({...user, recovered: true}))),
    ).resolves.toEqual([
      expect.objectContaining({recovered: true}),
    ])
  })

  it('exposes no new session or Redux data when the commit marker write fails', async () => {
    const stateBefore = store.getState()
    const oldSessionKey = stateBefore.authentication.sessionKey
    const oldSessionEpoch = stateBefore.authentication.sessionEpoch
    const oldSessionCredential = await keychain.getSessionCredential()
    const oldPersonal = stateBefore.personal
    const oldServicesStored = stateBefore.services.stored
    const dispatch = jest.spyOn(store, 'dispatch')
    const initSession = jest.spyOn(authBox, 'initSession')
    const originalSetItem = SecureStorage.setItem.bind(SecureStorage)
    jest.spyOn(SecureStorage, 'setItem').mockImplementation(
      (key, value, callback) => {
        if (
          key === PASSWORD_MIGRATION_STORAGE_INTERNAL_KEY &&
          JSON.parse(value).phase === 'committed'
        ) {
          return Promise.reject(new Error('injected commit marker failure'))
        }

        return originalSetItem(key, value, callback)
      },
    )

    await expect(resetUserPwd(
      MOCK_USER_OBJ.accountHash,
      MOCK_PIN_TWO,
      MOCK_PIN,
    )).resolves.toBe(false)

    const records = await loadPasswordProtectedRecords()
    expectPasswordVersion(records, MOCK_PIN, {
      custom: 'future channel seed',
      personal: PERSONAL_VALUE,
      service: SERVICE_VALUE,
    })
    expect(initSession).not.toHaveBeenCalled()
    expect(await keychain.getSessionCredential()).toBe(oldSessionCredential)
    expect(store.getState().authentication.sessionKey).toBe(oldSessionKey)
    expect(store.getState().authentication.sessionEpoch).toBe(oldSessionEpoch)
    expect(store.getState().personal).toBe(oldPersonal)
    expect(store.getState().services.stored).toBe(oldServicesStored)
    expect(
      dispatch.mock.calls
        .map(call => call[0].type)
        .filter(type => [
          UPDATE_SESSION_KEY,
          SET_PERSONAL_DATA,
          SET_SERVICE_STORED_DATA,
        ].includes(type)),
    ).toEqual([])
    expect(
      await SecureStorage.getItem(PASSWORD_MIGRATION_STORAGE_INTERNAL_KEY),
    ).toBeNull()
  })

  it('invalidates the global session when the account changes during post-commit Keychain mutation', async () => {
    const originalInitSession = authBox.initSession
    let markSessionMutationStarted
    let releaseSessionMutation
    const sessionMutationStarted = new Promise(resolve => {
      markSessionMutationStarted = resolve
    })
    const sessionMutationGate = new Promise(resolve => {
      releaseSessionMutation = resolve
    })
    jest.spyOn(authBox, 'initSession').mockImplementation(async password => {
      markSessionMutationStarted()
      await sessionMutationGate
      return originalInitSession(password)
    })
    const removeSessionCredential = jest.spyOn(
      keychain,
      'removeSessionCredential',
    )
    const dispatch = jest.spyOn(store, 'dispatch')

    const resetting = resetUserPwd(
      MOCK_USER_OBJ.accountHash,
      MOCK_PIN_TWO,
      MOCK_PIN,
    )
    await sessionMutationStarted

    const accountB = {
      ...MOCK_USER_OBJ,
      id: 'Account B',
      accountHash: 'account-b',
    }
    const accountBSessionKey = await originalInitSession('account-b-password')
    store.dispatch(authenticateUser(accountB, accountBSessionKey))
    releaseSessionMutation()

    await expect(resetting).resolves.toBe(false)
    expect(removeSessionCredential).toHaveBeenCalledTimes(1)
    expect(
      dispatch.mock.calls.map(call => call[0].type),
    ).toContain(SIGN_OUT)
    expect(
      dispatch.mock.calls
        .map(call => call[0].type)
        .filter(type => [
          UPDATE_SESSION_KEY,
          SET_PERSONAL_DATA,
          SET_SERVICE_STORED_DATA,
        ].includes(type)),
    ).toEqual([])
    expect(JSON.parse(
      await SecureStorage.getItem(PASSWORD_MIGRATION_STORAGE_INTERNAL_KEY),
    ).phase).toBe('committed')
    const records = await loadPasswordProtectedRecords()
    expectPasswordVersion(records, MOCK_PIN_TWO, {
      custom: 'future channel seed',
      personal: PERSONAL_VALUE,
      service: SERVICE_VALUE,
    })
  })

  it('returns false for a wrong old password without staging writes', async () => {
    await expect(
      resetUserPwd(
        MOCK_USER_OBJ.accountHash,
        MOCK_PIN_TWO,
        'wrong password',
      ),
    ).resolves.toBe(false)

    const records = await loadPasswordProtectedRecords()
    expectPasswordVersion(records, MOCK_PIN, {
      custom: 'future channel seed',
      personal: PERSONAL_VALUE,
      service: SERVICE_VALUE,
    })
    expect(
      await SecureStorage.getItem(PASSWORD_MIGRATION_STORAGE_INTERNAL_KEY),
    ).toBeNull()
  })

  it.each(PERSONAL_DATA_UPDATES)(
    'does not %s personal data after the active account changes',
    async (_, updatePersonalData) => {
    const personalRootBefore = await SecureStorage.getItem(
      PERSONAL_DATA_STORAGE_INTERNAL_KEY,
    )
    const originalGetItem = SecureStorage.getItem.bind(SecureStorage)
    let releasePersonalRead
    let markPersonalReadStarted
    const personalReadStarted = new Promise(resolve => {
      markPersonalReadStarted = resolve
    })
    const personalReadGate = new Promise(resolve => {
      releasePersonalRead = resolve
    })
    let delayedPersonalRead = false

    jest.spyOn(SecureStorage, 'getItem').mockImplementation(async (key, callback) => {
      if (key === PERSONAL_DATA_STORAGE_INTERNAL_KEY && !delayedPersonalRead) {
        delayedPersonalRead = true
        markPersonalReadStarted()
        await personalReadGate
      }

      return originalGetItem(key, callback)
    })

    const update = updatePersonalData()
    await personalReadStarted

    const accountB = {
      ...MOCK_USER_OBJ,
      id: 'Account B',
      accountHash: 'account-b',
    }
    const accountBSessionKey = await authBox.initSession('account-b-password')
    store.dispatch(authenticateUser(accountB, accountBSessionKey))
    releasePersonalRead()

    await expect(update).rejects.toMatchObject({code: 'SESSION_CHANGED'})
    expect(
      await SecureStorage.getItem(PERSONAL_DATA_STORAGE_INTERNAL_KEY),
    ).toBe(personalRootBefore)
  })

  it.each(PERSONAL_DATA_UPDATES)(
    'does not %s personal data when the account changes during encryption',
    async (_, updatePersonalData, delayedValue) => {
    const personalRootBefore = await SecureStorage.getItem(
      PERSONAL_DATA_STORAGE_INTERNAL_KEY,
    )
    const originalEncryptkey = encryptkey
    let releaseEncryption
    let markEncryptionStarted
    const encryptionStarted = new Promise(resolve => {
      markEncryptionStarted = resolve
    })
    const encryptionGate = new Promise(resolve => {
      releaseEncryption = resolve
    })
    let delayedEncryption = false

    jest.spyOn(authBox, 'requestPassword').mockResolvedValue(MOCK_PIN)
    jest.spyOn(require('../../seedCrypt'), 'encryptkey').mockImplementation(
      async (password, value) => {
        if (value === delayedValue && !delayedEncryption) {
          delayedEncryption = true
          markEncryptionStarted()
          await encryptionGate
        }

        return originalEncryptkey(password, value)
      },
    )

    const update = updatePersonalData()
    await encryptionStarted

    const accountB = {
      ...MOCK_USER_OBJ,
      id: 'Account B',
      accountHash: 'account-b',
    }
    const accountBSessionKey = await authBox.initSession('account-b-password')
    store.dispatch(authenticateUser(accountB, accountBSessionKey))
    releaseEncryption()

    await expect(update).rejects.toMatchObject({code: 'SESSION_CHANGED'})
    expect(
      await SecureStorage.getItem(PERSONAL_DATA_STORAGE_INTERNAL_KEY),
    ).toBe(personalRootBefore)
  })

  it.each(['user', 'personal', 'service'])(
    'serializes migration behind an in-flight %s read-modify-write',
    async rootName => {
    let releaseBackgroundWrite
    let markBackgroundStarted
    const backgroundStarted = new Promise(resolve => {
      markBackgroundStarted = resolve
    })
    const backgroundGate = new Promise(resolve => {
      releaseBackgroundWrite = resolve
    })
    let expectedPersonal = PERSONAL_VALUE
    let expectedService = SERVICE_VALUE
    let backgroundWrite

    if (rootName === 'user') {
      backgroundWrite = updateUsers(async users => {
        markBackgroundStarted()
        await backgroundGate
        // Returning this pre-migration user snapshot would restore old
        // ciphertext if the migration could commit before this queued write.
        return users.map(user => ({...user}))
      })
    } else {
      jest.spyOn(authBox, 'requestPassword').mockImplementation(async () => {
        markBackgroundStarted()
        await backgroundGate
        return MOCK_PIN
      })

      if (rootName === 'personal') {
        expectedPersonal = JSON.stringify({name: 'Updated'})
        backgroundWrite = modifyPersonalDataForUser(
          {name: 'Updated'},
          'contact',
          MOCK_USER_OBJ.accountHash,
        )
      } else {
        expectedService = JSON.stringify({token: 'updated'})
        backgroundWrite = modifyServiceStoredDataForUser(
          {token: 'updated'},
          'service',
          MOCK_USER_OBJ.accountHash,
        )
      }
    }
    await backgroundStarted

    const migration = resetUserPwd(
      MOCK_USER_OBJ.accountHash,
      MOCK_PIN_TWO,
      MOCK_PIN,
    )
    await Promise.resolve()
    expect(
      await SecureStorage.getItem(PASSWORD_MIGRATION_STORAGE_INTERNAL_KEY),
    ).toBeNull()

    releaseBackgroundWrite()
    await backgroundWrite
    await expect(migration).resolves.not.toBe(false)

    const records = await loadPasswordProtectedRecords()
    expectPasswordVersion(records, MOCK_PIN_TWO, {
      custom: 'future channel seed',
      personal: expectedPersonal,
      service: expectedService,
    })
    expect(decryptkey(MOCK_PIN, records.custom)).toBe(false)
    expect(decryptkey(MOCK_PIN, records.personal)).toBe(false)
    expect(decryptkey(MOCK_PIN, records.service)).toBe(false)
  },
  )
})

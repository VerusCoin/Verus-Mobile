import {
  getKeyByValue,
  isJson,
  arraysEqual
} from '../../objectManip'

import {
  MOCK_USER_OBJ
} from '../../../tests/helpers/MockAuthData'

import {
  MOCK_UTXO_LIST
} from '../../../tests/helpers/MockNumbers'

describe('The set of object manipulating functions', () => {
  it('can get existing key from value in object', () => {
    expect(getKeyByValue('AzureDiamond', MOCK_USER_OBJ)).toBe('id')
  })

  it('cannot get non-existent key in object', () => {
    expect(getKeyByValue('NotAValue', MOCK_USER_OBJ)).toBe(null)
  })

  it('can correctly identify a json string', () => {
    expect(isJson(JSON.stringify(MOCK_USER_OBJ))).toBe(true)
  })

  it('can correctly identify a non-json string', () => {
    expect(isJson('not a json string')).toBe(false)
  })

  it('can identify array equality', () => {
    let newArray = MOCK_UTXO_LIST.slice()

    expect(newArray === MOCK_UTXO_LIST).toBe(false)
    expect(arraysEqual(MOCK_UTXO_LIST, newArray)).toBe(true)
  })

  it('can identify array inequality', () => {
    let newArray = ['not an equal array']

    expect(newArray === MOCK_UTXO_LIST).toBe(false)
    expect(arraysEqual(MOCK_UTXO_LIST, newArray)).toBe(false)
  })
})
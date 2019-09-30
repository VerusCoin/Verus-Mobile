import {
  updateParamObj
} from '../../electrumUpdates'

import {
  mockNetwork
} from '../../../tests/helpers/MockNetwork'

import {
  MOCK_ADDRESS,
  MOCK_SCRIPTHASH
} from '../../../tests/helpers/MockAuthData'

import {
  ELECTRUM_PROTOCOL_CHANGE
} from '../../constants'

describe('Data modifier for new electrum protocol', () => {
  it('can change address string to scripthash format if server version is greater than 1.4', () => {
    let address = MOCK_ADDRESS
    const mockParamObj = {address}

    updateParamObj(mockParamObj, mockNetwork, ELECTRUM_PROTOCOL_CHANGE + 1)

    expect(mockParamObj.address).toBe(MOCK_SCRIPTHASH)
    expect(mockParamObj).toHaveProperty('eprotocol')
  })

  it('does not modify address if version is lower than electrum protocol change version', () => {
    let address = MOCK_ADDRESS
    const mockParamObj = {address}

    updateParamObj(mockParamObj, mockNetwork, ELECTRUM_PROTOCOL_CHANGE - 1)

    expect(mockParamObj.address).toBe(MOCK_ADDRESS)
  })
})
jest.setTimeout(60000)

import {
  getServerVersion
} from '../../httpCalls/electrumCalls/getServerVersion'

import {
  MOCK_ELECTRUM_SERVER_OBJ,
  MOCK_PROXY_SERVER_HTTPS
} from '../../../tests/helpers/MockServerData'

describe('Server version fetch functions for electrum servers', () => {
  it ('can fetch and parse a server\'s version', () => {
    return getServerVersion(
      MOCK_PROXY_SERVER_HTTPS, 
      MOCK_ELECTRUM_SERVER_OBJ.ip, 
      MOCK_ELECTRUM_SERVER_OBJ.port,
      MOCK_ELECTRUM_SERVER_OBJ.proto)
      .then(res => {
        expect(res).not.toBeNaN()
      })
  })
})
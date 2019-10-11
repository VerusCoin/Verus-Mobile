jest.setTimeout(60000)

import {
  getServerVersion
} from '../../httpCalls/electrumCalls/getServerVersion'

import {
  setFetchParams
} from '../../../tests/helpers/SetFetchParams'

import {
  MOCK_PROXY_SERVER
} from '../../../tests/helpers/MockServerData'

describe('Server version fetch functions for electrum servers', () => {
  it ('can fetch and parse a server\'s version', () => {
    const mockServer = setFetchParams(true, 200, {server_version: ["ElectrumX 1.13.0", 1.4]}, true)
    return getServerVersion(
      MOCK_PROXY_SERVER, 
      mockServer.ip, 
      mockServer.port,
      mockServer.proto)
      .then(res => {
        expect(res).not.toBeNaN()
      })
  })
})
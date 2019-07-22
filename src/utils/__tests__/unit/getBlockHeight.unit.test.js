import {
  MOCK_ELECTRUM_SERVER_OBJ,
  MOCK_PROXY_SERVER_HTTPS
} from '../../../tests/helpers/MockServerData'

import { getBlockHeight } from '../../httpCalls/callCreators'

describe('Function to fetch blockheight', () => {
  it('can fetch blockheight from specified electrum and proxy server', () => {
    return getBlockHeight(MOCK_PROXY_SERVER_HTTPS, MOCK_ELECTRUM_SERVER_OBJ)
    .then((res) => {
      expect(res).toHaveProperty('msg')
      expect(res).toHaveProperty('result')

      expect(res.msg).toBe('success')
      expect(Number(res.result)).not.toBeNaN()
    })
  })
})
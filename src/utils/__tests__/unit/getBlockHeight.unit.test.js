import {
  MOCK_PROXY_SERVER
} from '../../../tests/helpers/MockServerData'

import {
  setFetchParams
} from '../../../tests/helpers/SetFetchParams'

import { getBlockHeight } from '../../httpCalls/callCreators'

describe('Function to fetch blockheight', () => {
  it('can fetch blockheight from specified electrum and proxy server', () => {
    return getBlockHeight(MOCK_PROXY_SERVER, setFetchParams(true, 200, {getcurrentblock: [200000]}, true))
    .then((res) => {
      expect(res).toHaveProperty('msg')
      expect(res).toHaveProperty('result')

      expect(res.msg).toBe('success')
      expect(Number(res.result)).not.toBeNaN()
    })
  })
})
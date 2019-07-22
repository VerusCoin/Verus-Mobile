import { timeout } from '../../promises'

const TIMEOUT_MS = 1000

describe('The set of promise utility functions', () => {
  it('can reject a promise on timeout', async () => {
    await expect(timeout(TIMEOUT_MS, new Promise((r, j)=>{setTimeout(r, TIMEOUT_MS*2)})))
    .rejects.toThrow('Network request timed out')
  })

  it('can complete a promise before timeout', async () => {
    await expect(timeout(TIMEOUT_MS, Promise.resolve('lemon'))).resolves.toBe('lemon');
  })
})
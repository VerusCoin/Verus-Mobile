import {
  getVrpcCacheMaxAge,
  isVrpcResponseCacheable,
  shouldUseCachedVrpcResponse,
} from '../../vrpc/vrpcCachePolicy';

describe('VRPC cache policy', () => {
  it('does not cache identity lookups', () => {
    expect(isVrpcResponseCacheable('getidentity')).toBe(false);
    expect(
      shouldUseCachedVrpcResponse({
        command: 'getidentity',
        lastNetworkResponseAt: 1000,
        now: 1001,
      }),
    ).toBe(false);
  });

  it('expires responses based on the last network response, not cache reads', () => {
    const lastNetworkResponseAt = 1000;

    expect(
      shouldUseCachedVrpcResponse({
        command: 'getaddressdeltas',
        lastNetworkResponseAt,
        now: 9000,
      }),
    ).toBe(true);
    expect(
      shouldUseCachedVrpcResponse({
        command: 'getaddressdeltas',
        lastNetworkResponseAt,
        now: 11000,
      }),
    ).toBe(false);
  });

  it('uses the default cache lifetime for cached commands without an override', () => {
    expect(isVrpcResponseCacheable('getcurrency')).toBe(true);
    expect(getVrpcCacheMaxAge('getcurrency')).toBe(60000);
  });
});

const mockNativeRandomBytes = jest.fn();

jest.mock('react-native-randombytes', () => ({
  randomBytes: (...args) => mockNativeRandomBytes(...args),
}));
const {randomBytes} = require('../../crypto/randomBytes');

describe('random byte policy', () => {
  beforeEach(() => {
    mockNativeRandomBytes.mockReset();
  });

  it('resolves exact-length buffers returned by the native RNG', async () => {
    const expected = Buffer.alloc(32, 0x5a);
    mockNativeRandomBytes.mockImplementation((length, callback) => {
      callback(null, expected);
    });

    await expect(randomBytes(32)).resolves.toEqual(expected);
    expect(mockNativeRandomBytes).toHaveBeenCalledWith(32, expect.any(Function));
  });

  it('propagates native RNG failures', async () => {
    const nativeError = {
      code: 'E_SEC_RANDOM_FAILURE',
      message: 'SecRandomCopyBytes failed',
    };
    mockNativeRandomBytes.mockImplementation((length, callback) => {
      callback(nativeError, null);
    });

    await expect(randomBytes(32)).rejects.toBe(nativeError);
  });

  it('rejects malformed native RNG results', async () => {
    mockNativeRandomBytes.mockImplementationOnce((length, callback) => {
      callback(null, 'not-a-buffer');
    });
    await expect(randomBytes(32)).rejects.toThrow('must be a Buffer');

    mockNativeRandomBytes.mockImplementationOnce((length, callback) => {
      callback(null, Buffer.alloc(length - 1));
    });
    await expect(randomBytes(32)).rejects.toThrow('did not match requested length');
  });

  it('rejects invalid lengths before calling the native RNG', async () => {
    await expect(randomBytes(-1)).rejects.toThrow('non-negative safe integer');
    await expect(randomBytes(1.5)).rejects.toThrow('non-negative safe integer');
    expect(mockNativeRandomBytes).not.toHaveBeenCalled();
  });

});

const mockDispatch = jest.fn();
const mockGetState = jest.fn();
const mockNetInfoFetch = jest.fn();
const mockRecordBadServer = jest.fn(server => ({
  type: "ADD_BAD_SERVER",
  payload: server,
}));
const mockRecordGoodServer = jest.fn(server => ({
  type: "ADD_GOOD_SERVER",
  payload: server,
}));

jest.mock("../../../store/index", () => ({
  __esModule: true,
  default: {
    dispatch: mockDispatch,
    getState: mockGetState,
  },
}));

jest.mock("../../../actions/actionCreators", () => ({
  recordBadServer: mockRecordBadServer,
  recordGoodServer: mockRecordGoodServer,
}));

jest.mock("@react-native-community/netinfo", () => ({
  __esModule: true,
  default: {
    fetch: mockNetInfoFetch,
  },
}));

const NetInfo = require("@react-native-community/netinfo").default;
const Store = require("../../../store/index").default;
const {
  getGoodServer,
} = require("../../api/channels/electrum/serverTester");

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return {promise, reject, resolve};
};

describe("Electrum server discovery cancellation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetState.mockReturnValue({
      electrum: {
        badServers: {},
        goodServers: {},
      },
    });
  });

  it("does not start a discovery attempt after its shared deadline expires", async () => {
    const tester = jest.fn();

    await expect(
      getGoodServer(
        tester,
        ["server-a"],
        [],
        null,
        null,
        () => true,
      ),
    ).rejects.toThrow("discovery was cancelled");

    expect(tester).not.toHaveBeenCalled();
    expect(mockGetState).not.toHaveBeenCalled();
    expect(Store.dispatch).not.toHaveBeenCalled();
  });

  it("does not cache a server whose successful test finishes after cancellation", async () => {
    const testResult = deferred();
    const tester = jest.fn(() => testResult.promise);
    let cancelled = false;
    const request = getGoodServer(
      tester,
      ["server-a"],
      [],
      null,
      null,
      () => cancelled,
    );

    cancelled = true;
    testResult.resolve({result: 123});

    await expect(request).rejects.toThrow("discovery was cancelled");
    expect(Store.dispatch).not.toHaveBeenCalled();
    expect(mockRecordGoodServer).not.toHaveBeenCalled();
  });

  it("does not start connectivity recovery when a failed test settles after cancellation", async () => {
    const testResult = deferred();
    const tester = jest.fn(() => testResult.promise);
    let cancelled = false;
    const request = getGoodServer(
      tester,
      ["server-a", "server-b"],
      [],
      0,
      null,
      () => cancelled,
    );

    cancelled = true;
    testResult.reject(new Error("server failed"));

    await expect(request).rejects.toThrow("discovery was cancelled");
    expect(NetInfo.fetch).not.toHaveBeenCalled();
    expect(Store.dispatch).not.toHaveBeenCalled();
    expect(tester).toHaveBeenCalledTimes(1);
  });

  it("does not strike or recurse after cancellation during the connectivity check", async () => {
    const networkResult = deferred();
    const tester = jest.fn(() => Promise.reject(new Error("server failed")));
    mockNetInfoFetch.mockReturnValue(networkResult.promise);
    let cancelled = false;
    const request = getGoodServer(
      tester,
      ["server-a", "server-b"],
      [],
      0,
      null,
      () => cancelled,
    );

    await Promise.resolve();
    expect(NetInfo.fetch).toHaveBeenCalledTimes(1);

    cancelled = true;
    networkResult.resolve({isConnected: true, isInternetReachable: true});

    await expect(request).rejects.toThrow("discovery was cancelled");
    expect(mockRecordBadServer).not.toHaveBeenCalled();
    expect(Store.dispatch).not.toHaveBeenCalled();
    expect(tester).toHaveBeenCalledTimes(1);
  });
});

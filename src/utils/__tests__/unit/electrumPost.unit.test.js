import axios from "axios";
import {
  getGoodServer,
} from "../../api/channels/electrum/serverTester";
import {getServerVersion} from "../../api/channels/electrum/requests/getServerVersion";
import {
  ELECTRUM_AMBIGUOUS_BROADCAST_CODE,
  ELECTRUM_REQUEST_TIMEOUT_CODE,
  electrumRequest,
  getElectrum,
  postElectrum,
} from "../../api/channels/electrum/callCreators";

jest.mock("axios", () => ({
  __esModule: true,
  default: {
    create: jest.fn(() => ({})),
    get: jest.fn(),
    post: jest.fn(),
  },
}));

jest.mock("../../api/channels/electrum/serverTester", () => ({
  getGoodServer: jest.fn(),
  testElectrum: jest.fn(),
  testProxy: jest.fn(),
}));

jest.mock("../../api/channels/electrum/requests/getServerVersion", () => ({
  getServerVersion: jest.fn(),
}));

const TXID = "a".repeat(64);
const SERVERS = ["electrum.example:50001:t"];
const OriginalAbortController = global.AbortController;

class MockAbortController {
  constructor() {
    this.signal = {aborted: false};
  }

  abort() {
    this.signal.aborted = true;
  }
}

const selectProxyAndElectrumServer = () => {
  getGoodServer
    .mockResolvedValueOnce({goodServer: "proxy.example", testResult: true})
    .mockResolvedValueOnce({
      goodServer: SERVERS[0],
      testResult: {result: 12345},
    });
};

describe("Electrum GET transport", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    global.AbortController = MockAbortController;
    getServerVersion.mockResolvedValue(1.4);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("applies a finite timeout and abort signal to previous-transaction GETs", async () => {
    selectProxyAndElectrumServer();
    axios.get.mockResolvedValue({data: {msg: "success", result: "raw-tx"}});

    const response = await getElectrum(
      {id: "VRSC", electrum_endpoints: SERVERS},
      "gettransaction",
      {txid: TXID},
      undefined,
      5000,
    );

    expect(response.result).toBe("raw-tx");
    expect(axios.get).toHaveBeenCalledWith(
      expect.stringContaining("/api/gettransaction?"),
      expect.objectContaining({
        timeout: 5000,
        signal: expect.any(Object),
      }),
    );
  });

  it("settles a stalled GET during server discovery at the overall deadline", async () => {
    jest.useFakeTimers();
    getGoodServer.mockImplementation(() => new Promise(() => {}));

    const request = getElectrum(
      {id: "VRSC", electrum_endpoints: SERVERS},
      "gettransaction",
      {txid: TXID},
      undefined,
      25,
    );
    jest.advanceTimersByTime(25);

    await expect(request).rejects.toMatchObject({
      code: ELECTRUM_REQUEST_TIMEOUT_CODE,
      timedOut: true,
    });
    expect(axios.get).not.toHaveBeenCalled();
  });

  it("does not continue discovery after a late proxy lookup resolves", async () => {
    jest.useFakeTimers();
    let resolveProxy;
    getGoodServer.mockImplementationOnce(
      () => new Promise(resolve => {
        resolveProxy = resolve;
      }),
    );

    const request = getElectrum(
      {id: "VRSC", electrum_endpoints: SERVERS},
      "gettransaction",
      {txid: TXID},
      undefined,
      25,
    );
    jest.advanceTimersByTime(25);
    await expect(request).rejects.toMatchObject({
      code: ELECTRUM_REQUEST_TIMEOUT_CODE,
    });

    resolveProxy({goodServer: "proxy.example"});
    await Promise.resolve();
    await Promise.resolve();

    expect(getGoodServer).toHaveBeenCalledTimes(1);
    expect(getServerVersion).not.toHaveBeenCalled();
    expect(axios.get).not.toHaveBeenCalled();
  });

  it("normalizes an Axios GET deadline into the Electrum timeout code", async () => {
    selectProxyAndElectrumServer();
    axios.get.mockRejectedValue(
      Object.assign(new Error("timeout of 25ms exceeded"), {
        code: "ECONNABORTED",
      }),
    );

    await expect(
      getElectrum(
        {id: "VRSC", electrum_endpoints: SERVERS},
        "gettransaction",
        {txid: TXID},
        undefined,
        25,
      ),
    ).rejects.toMatchObject({
      code: ELECTRUM_REQUEST_TIMEOUT_CODE,
      timedOut: true,
    });
  });

  it("preserves timeout details through the public Electrum wrapper", async () => {
    jest.useFakeTimers();
    getGoodServer.mockImplementation(() => new Promise(() => {}));

    const request = electrumRequest(
      {id: "VRSC", electrum_endpoints: SERVERS},
      "gettransaction",
      {txid: TXID},
      undefined,
      25,
    );
    jest.advanceTimersByTime(25);

    await expect(request).rejects.toMatchObject({
      code: ELECTRUM_REQUEST_TIMEOUT_CODE,
      message: expect.stringContaining("timed out"),
      timedOut: true,
    });
  });
});

describe("Electrum POST transport", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    global.AbortController = MockAbortController;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  afterAll(() => {
    global.AbortController = OriginalAbortController;
  });

  it("returns a valid response and configures finite timeout/abort semantics", async () => {
    selectProxyAndElectrumServer();
    axios.post.mockResolvedValue({data: {msg: "success", result: TXID}});

    const response = await postElectrum(
      SERVERS,
      "pushtx",
      {rawtx: "00"},
      undefined,
      5000,
    );

    expect(response.result).toBe(TXID);
    expect(axios.post).toHaveBeenCalledWith(
      "https://proxy.example/api/pushtx",
      expect.objectContaining({rawtx: "00"}),
      expect.objectContaining({
        timeout: 5000,
        signal: expect.any(Object),
      }),
    );
  });

  it("settles when server selection fails before dispatch", async () => {
    getGoodServer.mockRejectedValue(new Error("No valid server"));

    await expect(
      postElectrum(SERVERS, "pushtx", {rawtx: "00"}, undefined, 5000),
    ).rejects.toMatchObject({
      ambiguousBroadcast: false,
      message: "No valid server",
      requestDispatched: false,
    });
    expect(axios.post).not.toHaveBeenCalled();
  });

  it("marks transport loss after dispatch as an ambiguous broadcast", async () => {
    selectProxyAndElectrumServer();
    axios.post.mockRejectedValue(new Error("connection reset"));

    await expect(
      postElectrum(SERVERS, "pushtx", {rawtx: "00"}, undefined, 5000),
    ).rejects.toMatchObject({
      ambiguousBroadcast: true,
      code: ELECTRUM_AMBIGUOUS_BROADCAST_CODE,
      requestDispatched: true,
    });
  });

  it("marks malformed JSON after dispatch as an ambiguous broadcast", async () => {
    selectProxyAndElectrumServer();
    axios.post.mockResolvedValue({data: "not-json"});

    await expect(
      postElectrum(SERVERS, "pushtx", {rawtx: "00"}, undefined, 5000),
    ).rejects.toMatchObject({
      ambiguousBroadcast: true,
      code: ELECTRUM_AMBIGUOUS_BROADCAST_CODE,
      requestDispatched: true,
    });
  });

  it("settles an indefinitely pending server lookup at the overall deadline", async () => {
    jest.useFakeTimers();
    getGoodServer.mockImplementation(() => new Promise(() => {}));

    const request = postElectrum(
      SERVERS,
      "pushtx",
      {rawtx: "00"},
      undefined,
      25,
    );
    jest.advanceTimersByTime(25);

    await expect(request).rejects.toMatchObject({
      ambiguousBroadcast: false,
      code: ELECTRUM_REQUEST_TIMEOUT_CODE,
      requestDispatched: false,
      timedOut: true,
    });
  });

  it("does not dispatch after the deadline when AbortController is unavailable", async () => {
    jest.useFakeTimers();
    global.AbortController = undefined;
    let resolveProxyLookup;

    getGoodServer
      .mockImplementationOnce(
        () => new Promise(resolve => {
          resolveProxyLookup = resolve;
        }),
      )
      .mockResolvedValueOnce({
        goodServer: SERVERS[0],
        testResult: {result: 12345},
      });

    const request = postElectrum(
      SERVERS,
      "pushtx",
      {rawtx: "00"},
      undefined,
      25,
    );
    jest.advanceTimersByTime(25);

    await expect(request).rejects.toMatchObject({
      ambiguousBroadcast: false,
      code: ELECTRUM_REQUEST_TIMEOUT_CODE,
      requestDispatched: false,
      timedOut: true,
    });
    expect(getGoodServer.mock.calls[0][5]).toEqual(expect.any(Function));
    expect(getGoodServer.mock.calls[0][5]()).toBe(true);

    resolveProxyLookup({goodServer: "proxy.example", testResult: true});
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(getGoodServer).toHaveBeenCalledTimes(2);
    expect(axios.post).not.toHaveBeenCalled();
  });
});

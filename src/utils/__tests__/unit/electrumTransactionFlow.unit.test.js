import BigNumber from "bignumber.js";
import coinSelect from "coinselect";
import {Transaction} from "bitgo-utxo-lib";
import {getUnspentFormatted} from "../../api/channels/electrum/requests/getUnspent";
import {getOneTransaction} from "../../api/channels/electrum/requests/getTransaction";
import {buildSignedTx} from "../../crypto/buildTx";
import {
  ELECTRUM_AMBIGUOUS_BROADCAST_CODE,
  postElectrum,
} from "../../api/channels/electrum/callCreators";
import {
  ELECTRUM_BROADCAST_REJECTED_CODE,
  ELECTRUM_RECONCILIATION_PROPAGATION_DELAY_MS,
  pushTx,
  reconcileElectrumBroadcast,
  resetTraditionalSendGuards,
  sendRawTx,
  txPreflight,
} from "../../api/channels/electrum/requests/pushTx";

jest.mock("../../api/channels/electrum/callCreators", () => ({
  ELECTRUM_AMBIGUOUS_BROADCAST_CODE: "ELECTRUM_AMBIGUOUS_BROADCAST",
  postElectrum: jest.fn(),
}));

jest.mock("../../api/channels/electrum/requests/getUnspent", () => ({
  getUnspentFormatted: jest.fn(),
}));

jest.mock("../../api/channels/electrum/requests/getTransaction", () => ({
  getOneTransaction: jest.fn(),
}));

jest.mock("../../crypto/buildTx", () => ({
  buildSignedTx: jest.fn(),
}));

jest.mock("../../auth/authBox", () => ({
  requestPrivKey: jest.fn(() => Promise.resolve("mock-wif")),
}));

jest.mock("coinselect", () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock("bitgo-utxo-lib", () => ({
  networks: {
    default: {coin: "default"},
    ltc: {coin: "litecoin"},
  },
  Transaction: {
    fromHex: jest.fn(),
  },
}));

const TXID = "b".repeat(64);
const NETWORK = {coin: "litecoin"};
const COIN = {
  id: "LTC",
  decimals: 8,
  display_ticker: "LTC",
  electrum_endpoints: ["electrum.example:50001:t"],
  fee: 10000,
};
const USER = {
  id: "profile",
  keys: {
    LTC: {
      electrum: {
        addresses: ["LTC-address"],
      },
    },
  },
};
const VERIFIED_UTXO = {
  txid: TXID,
  vout: 0,
  amountSats: 100000,
  reportedValueSats: 100000,
  verifiedValueSats: 100000,
  verifiedTxid: true,
  verifiedMerkle: true,
  interestSats: 0,
};
const NO_RECONCILIATION_DELAY = {propagationDelayMs: 0};

describe("Electrum transaction flow security", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetTraditionalSendGuards();
    getUnspentFormatted.mockResolvedValue({
      utxoList: [VERIFIED_UTXO],
      unshieldedFunds: BigNumber(0),
    });
    coinSelect.mockImplementation(inputs => ({
      inputs,
      outputs: [{value: 100000}],
      fee: 0,
    }));
    buildSignedTx.mockReturnValue("00");
    getOneTransaction.mockRejectedValue(new Error("transaction not found"));
    Transaction.fromHex.mockReturnValue({
      getId: () => TXID,
      outs: [{value: 90000}],
      byteLength: () => 192,
    });
  });

  it("verifies previous transactions when txid verification is enabled", async () => {
    const result = await txPreflight(
      COIN,
      USER,
      "destination",
      BigNumber("0.0009"),
      {
        defaultFee: COIN.fee,
        network: NETWORK,
        verifyMerkle: false,
        verifyTxid: true,
      },
      true,
    );

    expect(getUnspentFormatted).toHaveBeenCalledWith(
      COIN,
      USER,
      false,
      true,
    );
    expect(coinSelect.mock.calls[0][0][0].value).toBe(100000);
    expect(buildSignedTx.mock.calls[0][4][0]).toEqual(
      expect.objectContaining({
        value: 100000,
        verifiedValueSats: 100000,
      }),
    );
    expect(result.err).toBe(false);
    expect(result.result.fee).toBe("0.0001");
  });

  it("uses reported UTXO values when txid verification is disabled", async () => {
    getUnspentFormatted.mockResolvedValue({
      utxoList: [
        {
          ...VERIFIED_UTXO,
          verifiedTxid: false,
          verifiedMerkle: false,
          verifiedValueSats: undefined,
        },
      ],
      unshieldedFunds: BigNumber(0),
    });

    const result = await txPreflight(
      COIN,
      USER,
      "destination",
      BigNumber("0.0009"),
      {
        defaultFee: COIN.fee,
        network: NETWORK,
        verifyMerkle: false,
        verifyTxid: false,
      },
      true,
    );

    expect(getUnspentFormatted).toHaveBeenCalledWith(
      COIN,
      USER,
      false,
      false,
    );
    expect(buildSignedTx.mock.calls[0][4][0]).toEqual(
      expect.objectContaining({
        value: 100000,
        verifiedTxid: false,
      }),
    );
    expect(buildSignedTx.mock.calls[0][4][0].verifiedValueSats).toBeUndefined();
    expect(result.err).toBe(false);
    expect(result.result.fee).toBe("0.0001");
  });

  it("rejects a signed transaction whose actual outputs change the planned fee", async () => {
    Transaction.fromHex.mockReturnValue({
      getId: () => TXID,
      outs: [{value: 80000}],
      byteLength: () => 192,
    });

    await expect(
      txPreflight(
        COIN,
        USER,
        "destination",
        BigNumber("0.0009"),
        {
          defaultFee: COIN.fee,
          network: NETWORK,
          verifyMerkle: false,
          verifyTxid: true,
        },
        true,
      ),
    ).rejects.toThrow("does not match the planned fee");
  });

  it("fails before coin selection when Electrum under-reports an input", async () => {
    getUnspentFormatted.mockResolvedValue({
      utxoList: [
        {
          ...VERIFIED_UTXO,
          amountSats: 100000,
          reportedValueSats: 1000,
        },
      ],
      unshieldedFunds: BigNumber(0),
    });

    await expect(
      txPreflight(
        COIN,
        USER,
        "destination",
        BigNumber("0.0009"),
        {
          defaultFee: COIN.fee,
          network: NETWORK,
          verifyMerkle: false,
          verifyTxid: true,
        },
        false,
      ),
    ).rejects.toThrow("does not match the hash-verified previous transaction");
    expect(coinSelect).not.toHaveBeenCalled();
  });

  it("returns a definite error for an explicit server rejection", async () => {
    postElectrum.mockResolvedValue({msg: "error", result: "mempool reject"});

    await expect(pushTx(COIN, "00", NO_RECONCILIATION_DELAY)).resolves.toMatchObject({
      ambiguous: false,
      code: ELECTRUM_BROADCAST_REJECTED_CODE,
      err: true,
      result: {message: "mempool reject"},
    });
  });

  it("recognizes a structured RPC rejection as definite", async () => {
    postElectrum.mockResolvedValue({
      result: {code: -26, message: "txn-mempool-conflict"},
    });

    await expect(pushTx(COIN, "00", NO_RECONCILIATION_DELAY)).resolves.toMatchObject({
      ambiguous: false,
      code: -26,
      err: true,
      result: {message: "txn-mempool-conflict"},
    });
  });

  it("returns an ambiguous state when a success response has no txid", async () => {
    postElectrum.mockResolvedValue({msg: "success", result: "not-a-txid"});

    await expect(pushTx(COIN, "00", NO_RECONCILIATION_DELAY)).resolves.toMatchObject({
      ambiguous: true,
      code: ELECTRUM_AMBIGUOUS_BROADCAST_CODE,
      err: true,
      localTxid: TXID,
    });
  });

  it("rejects a server txid that does not match the locally signed transaction", async () => {
    const wrongTxid = "c".repeat(64);
    postElectrum.mockResolvedValue({msg: "success", result: wrongTxid});

    await expect(pushTx(COIN, "00", NO_RECONCILIATION_DELAY)).resolves.toMatchObject({
      ambiguous: true,
      code: ELECTRUM_AMBIGUOUS_BROADCAST_CODE,
      err: true,
      localTxid: TXID,
      serverTxid: wrongTxid,
    });
  });

  it("returns an ambiguous state when the response is lost after dispatch", async () => {
    const error = new Error("connection reset");
    error.ambiguousBroadcast = true;
    postElectrum.mockRejectedValue(error);

    await expect(pushTx(COIN, "00", NO_RECONCILIATION_DELAY)).resolves.toMatchObject({
      ambiguous: true,
      code: ELECTRUM_AMBIGUOUS_BROADCAST_CODE,
      err: true,
      localTxid: TXID,
    });
  });

  it("safely reconciles response loss only when exact local tx lookup succeeds", async () => {
    const error = new Error("connection reset");
    error.ambiguousBroadcast = true;
    postElectrum.mockRejectedValue(error);
    getOneTransaction.mockResolvedValue({result: "00"});

    await expect(pushTx(COIN, "00", NO_RECONCILIATION_DELAY)).resolves.toEqual({
      err: false,
      reconciled: true,
      result: {
        params: {reconciled: true},
        txid: TXID,
      },
    });
    expect(getOneTransaction).toHaveBeenCalledWith(COIN, TXID);
  });

  it("keeps response loss ambiguous when lookup returns a different transaction", async () => {
    const error = new Error("connection reset");
    error.ambiguousBroadcast = true;
    postElectrum.mockRejectedValue(error);
    getOneTransaction.mockResolvedValue({result: "different-raw-transaction"});
    Transaction.fromHex.mockImplementation(rawTransaction => ({
      getId: () =>
        rawTransaction === "different-raw-transaction"
          ? "e".repeat(64)
          : TXID,
      outs: [{value: 90000}],
      byteLength: () => 192,
    }));

    await expect(pushTx(COIN, "00", NO_RECONCILIATION_DELAY)).resolves.toMatchObject({
      ambiguous: true,
      code: ELECTRUM_AMBIGUOUS_BROADCAST_CODE,
      err: true,
      localTxid: TXID,
    });
  });

  it("bounds an unavailable exact-transaction reconciliation lookup", async () => {
    jest.useFakeTimers();
    getOneTransaction.mockReturnValue(new Promise(() => {}));

    try {
      const reconciliation = reconcileElectrumBroadcast(
        COIN,
        TXID,
        NETWORK,
        {
          requestTimeoutMs: 25,
          propagationDelayMs: 0,
        },
      );
      jest.advanceTimersByTime(25);

      await expect(reconciliation).resolves.toBe(false);
    } finally {
      jest.useRealTimers();
    }
  });

  it("waits 30 seconds for propagation before querying another backend", async () => {
    let releaseDelay;
    const wait = jest.fn(
      () => new Promise(resolve => {
        releaseDelay = resolve;
      }),
    );
    getOneTransaction.mockResolvedValue({result: "00"});
    const onReconciliationStatus = jest.fn();

    const reconciliation = reconcileElectrumBroadcast(
      COIN,
      TXID,
      NETWORK,
      {wait, onReconciliationStatus},
    );

    await Promise.resolve();
    expect(wait).toHaveBeenCalledWith(
      ELECTRUM_RECONCILIATION_PROPAGATION_DELAY_MS,
    );
    expect(ELECTRUM_RECONCILIATION_PROPAGATION_DELAY_MS).toBe(30000);
    expect(getOneTransaction).not.toHaveBeenCalled();

    releaseDelay();

    await expect(reconciliation).resolves.toBe(true);
    expect(getOneTransaction).toHaveBeenCalledWith(COIN, TXID);
    expect(onReconciliationStatus.mock.calls).toEqual([
      [
        expect.objectContaining({
          phase: 'waiting',
          delayMs: ELECTRUM_RECONCILIATION_PROPAGATION_DELAY_MS,
          txid: TXID,
          coinId: COIN.id,
        }),
      ],
      [
        expect.objectContaining({
          phase: 'checking',
          delayMs: ELECTRUM_RECONCILIATION_PROPAGATION_DELAY_MS,
          txid: TXID,
          coinId: COIN.id,
        }),
      ],
    ]);
  });

  it("reads reconciliation options from params when the router passes channelId sixth", async () => {
    const error = new Error("connection reset");
    error.ambiguousBroadcast = true;
    postElectrum.mockRejectedValue(error);
    getOneTransaction.mockResolvedValue({result: "00"});
    const onReconciliationStatus = jest.fn();

    await expect(
      sendRawTx(
        COIN,
        USER,
        "destination",
        BigNumber("0.0009"),
        {
          defaultFee: COIN.fee,
          network: NETWORK,
          verifyMerkle: false,
          verifyTxid: false,
          reconciliationOptions: {
            propagationDelayMs: 0,
            onReconciliationStatus,
          },
        },
        "electrum",
      ),
    ).resolves.toMatchObject({
      reconciled: true,
      result: {txid: TXID},
    });
    expect(onReconciliationStatus.mock.calls).toEqual([
      [expect.objectContaining({phase: 'waiting', delayMs: 0, txid: TXID})],
      [expect.objectContaining({phase: 'checking', delayMs: 0, txid: TXID})],
    ]);
  });

  it("preserves ambiguous status and local txid through sendRawTx", async () => {
    const error = new Error("connection reset");
    error.ambiguousBroadcast = true;
    postElectrum.mockRejectedValue(error);

    await expect(
      sendRawTx(
        COIN,
        USER,
        "destination",
        BigNumber("0.0009"),
        {
          defaultFee: COIN.fee,
          network: NETWORK,
          verifyMerkle: false,
          verifyTxid: false,
        },
        NO_RECONCILIATION_DELAY,
      ),
    ).rejects.toMatchObject({
      ambiguousBroadcast: true,
      code: ELECTRUM_AMBIGUOUS_BROADCAST_CODE,
      localTxid: TXID,
    });
  });

  it("blocks a same-tick duplicate before it can preflight or broadcast", async () => {
    postElectrum.mockResolvedValue({msg: "success", result: TXID});
    const params = {
      defaultFee: COIN.fee,
      network: NETWORK,
      verifyMerkle: false,
      verifyTxid: false,
    };

    const firstSend = sendRawTx(
      COIN,
      USER,
      "destination",
      BigNumber("0.0009"),
      params,
      NO_RECONCILIATION_DELAY,
    );
    const duplicateSend = sendRawTx(
      COIN,
      USER,
      "destination",
      BigNumber("0.0009"),
      params,
      NO_RECONCILIATION_DELAY,
    );

    await expect(duplicateSend).rejects.toMatchObject({
      ambiguousBroadcast: true,
      pendingTraditionalSend: true,
    });
    await expect(firstSend).resolves.toMatchObject({
      result: {txid: TXID},
    });

    expect(getUnspentFormatted).toHaveBeenCalledTimes(1);
    expect(buildSignedTx).toHaveBeenCalledTimes(1);
    expect(postElectrum).toHaveBeenCalledTimes(1);

    await expect(
      sendRawTx(
        COIN,
        USER,
        "next-destination",
        BigNumber("0.0009"),
        params,
        NO_RECONCILIATION_DELAY,
      ),
    ).resolves.toMatchObject({result: {txid: TXID}});
    expect(postElectrum).toHaveBeenCalledTimes(2);
  });

  it("retries only the exact signed transaction after an ambiguous broadcast", async () => {
    const responseLoss = new Error("connection reset");
    responseLoss.ambiguousBroadcast = true;
    postElectrum
      .mockRejectedValueOnce(responseLoss)
      .mockResolvedValueOnce({msg: "success", result: TXID});
    const params = {
      defaultFee: COIN.fee,
      network: NETWORK,
      verifyMerkle: false,
      verifyTxid: false,
    };

    await expect(
      sendRawTx(
        COIN,
        USER,
        "destination",
        BigNumber("0.0009"),
        params,
        NO_RECONCILIATION_DELAY,
      ),
    ).rejects.toMatchObject({
      ambiguousBroadcast: true,
      pendingTraditionalSend: true,
      localTxid: TXID,
    });

    await expect(
      sendRawTx(
        COIN,
        USER,
        "destination",
        BigNumber("0.0009"),
        params,
        NO_RECONCILIATION_DELAY,
      ),
    ).resolves.toMatchObject({
      result: {
        txid: TXID,
        toAddress: "destination",
        fromAddress: "LTC-address",
        fee: "0.0001",
      },
    });

    expect(getUnspentFormatted).toHaveBeenCalledTimes(1);
    expect(buildSignedTx).toHaveBeenCalledTimes(1);
    expect(postElectrum).toHaveBeenCalledTimes(2);
    expect(postElectrum).toHaveBeenNthCalledWith(
      2,
      COIN.electrum_endpoints,
      "pushtx",
      {rawtx: "00"},
    );
  });

  it("blocks a changed intent while an earlier broadcast remains unresolved", async () => {
    const responseLoss = new Error("connection reset");
    responseLoss.ambiguousBroadcast = true;
    postElectrum.mockRejectedValueOnce(responseLoss);
    const params = {
      defaultFee: COIN.fee,
      network: NETWORK,
      verifyMerkle: false,
      verifyTxid: false,
    };

    await expect(
      sendRawTx(
        COIN,
        USER,
        "destination",
        BigNumber("0.0009"),
        params,
        NO_RECONCILIATION_DELAY,
      ),
    ).rejects.toMatchObject({ambiguousBroadcast: true, localTxid: TXID});

    await expect(
      sendRawTx(
        COIN,
        USER,
        "different-destination",
        BigNumber("0.0009"),
        params,
        NO_RECONCILIATION_DELAY,
      ),
    ).rejects.toMatchObject({
      ambiguousBroadcast: true,
      pendingTraditionalSend: true,
      localTxid: TXID,
    });

    expect(buildSignedTx).toHaveBeenCalledTimes(1);
    expect(postElectrum).toHaveBeenCalledTimes(1);
  });

  it("returns the original transaction and clears the guard when reconciliation succeeds", async () => {
    const responseLoss = new Error("connection reset");
    responseLoss.ambiguousBroadcast = true;
    postElectrum.mockRejectedValueOnce(responseLoss);
    getOneTransaction
      .mockRejectedValueOnce(new Error("transaction not found"))
      .mockResolvedValueOnce({result: "00"});
    const params = {
      defaultFee: COIN.fee,
      network: NETWORK,
      verifyMerkle: false,
      verifyTxid: false,
    };

    await expect(
      sendRawTx(
        COIN,
        USER,
        "destination",
        BigNumber("0.0009"),
        params,
        NO_RECONCILIATION_DELAY,
      ),
    ).rejects.toMatchObject({ambiguousBroadcast: true});

    await expect(
      sendRawTx(
        COIN,
        USER,
        "different-destination",
        BigNumber("0.0009"),
        params,
        NO_RECONCILIATION_DELAY,
      ),
    ).resolves.toMatchObject({
      reconciled: true,
      result: {
        txid: TXID,
        toAddress: "destination",
        fromAddress: "LTC-address",
        value: "0.0009",
        fee: "0.0001",
      },
    });

    expect(buildSignedTx).toHaveBeenCalledTimes(1);
    expect(postElectrum).toHaveBeenCalledTimes(1);
  });

  it("clears the guard after a definitive first-attempt rejection", async () => {
    postElectrum
      .mockResolvedValueOnce({
        msg: "error",
        error: {code: -26, message: "mandatory-script-verify-flag-failed"},
      })
      .mockResolvedValueOnce({msg: "success", result: TXID});
    const params = {
      defaultFee: COIN.fee,
      network: NETWORK,
      verifyMerkle: false,
      verifyTxid: false,
    };

    await expect(
      sendRawTx(
        COIN,
        USER,
        "destination",
        BigNumber("0.0009"),
        params,
        NO_RECONCILIATION_DELAY,
      ),
    ).rejects.toMatchObject({
      ambiguousBroadcast: false,
      code: -26,
    });

    await expect(
      sendRawTx(
        COIN,
        USER,
        "different-destination",
        BigNumber("0.0009"),
        params,
        NO_RECONCILIATION_DELAY,
      ),
    ).resolves.toMatchObject({result: {txid: TXID}});

    expect(buildSignedTx).toHaveBeenCalledTimes(2);
    expect(postElectrum).toHaveBeenCalledTimes(2);
  });

  it("retains an earlier ambiguous guard when its exact retry is rejected", async () => {
    const responseLoss = new Error("connection reset");
    responseLoss.ambiguousBroadcast = true;
    postElectrum
      .mockRejectedValueOnce(responseLoss)
      .mockResolvedValueOnce({
        msg: "error",
        error: {code: -27, message: "transaction rejected"},
      });
    const params = {
      defaultFee: COIN.fee,
      network: NETWORK,
      verifyMerkle: false,
      verifyTxid: false,
    };

    await expect(
      sendRawTx(
        COIN,
        USER,
        "destination",
        BigNumber("0.0009"),
        params,
        NO_RECONCILIATION_DELAY,
      ),
    ).rejects.toMatchObject({ambiguousBroadcast: true, localTxid: TXID});

    await expect(
      sendRawTx(
        COIN,
        USER,
        "destination",
        BigNumber("0.0009"),
        params,
        NO_RECONCILIATION_DELAY,
      ),
    ).rejects.toMatchObject({
      ambiguousBroadcast: true,
      pendingTraditionalSend: true,
      localTxid: TXID,
    });

    await expect(
      sendRawTx(
        COIN,
        USER,
        "different-destination",
        BigNumber("0.0009"),
        params,
        NO_RECONCILIATION_DELAY,
      ),
    ).rejects.toMatchObject({
      ambiguousBroadcast: true,
      pendingTraditionalSend: true,
      localTxid: TXID,
    });

    expect(buildSignedTx).toHaveBeenCalledTimes(1);
    expect(postElectrum).toHaveBeenCalledTimes(2);
  });

  it("drops an ambiguous guard when the process-local state is reset", async () => {
    const responseLoss = new Error("connection reset");
    responseLoss.ambiguousBroadcast = true;
    postElectrum
      .mockRejectedValueOnce(responseLoss)
      .mockResolvedValueOnce({msg: "success", result: TXID});
    const params = {
      defaultFee: COIN.fee,
      network: NETWORK,
      verifyMerkle: false,
      verifyTxid: false,
    };

    await expect(
      sendRawTx(
        COIN,
        USER,
        "destination",
        BigNumber("0.0009"),
        params,
        NO_RECONCILIATION_DELAY,
      ),
    ).rejects.toMatchObject({ambiguousBroadcast: true});

    resetTraditionalSendGuards();

    await expect(
      sendRawTx(
        COIN,
        USER,
        "different-destination",
        BigNumber("0.0009"),
        params,
        NO_RECONCILIATION_DELAY,
      ),
    ).resolves.toMatchObject({result: {txid: TXID}});

    expect(buildSignedTx).toHaveBeenCalledTimes(2);
    expect(postElectrum).toHaveBeenCalledTimes(2);
  });

  it("accepts only a valid transaction id as broadcast success", async () => {
    const wait = jest.fn(() => Promise.resolve());
    const onReconciliationStatus = jest.fn();
    postElectrum.mockResolvedValue({msg: "success", result: TXID});

    await expect(
      pushTx(COIN, "00", {wait, onReconciliationStatus}),
    ).resolves.toEqual({
      err: false,
      result: {params: {}, txid: TXID},
    });
    expect(wait).not.toHaveBeenCalled();
    expect(onReconciliationStatus).not.toHaveBeenCalled();
  });
});

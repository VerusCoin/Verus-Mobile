import BigNumber from "bignumber.js";
import {
  assertAndUseVerifiedInputValues,
  assertFeeWithinLimits,
  assertSanePotentialTransactionFee,
  calculatePotentialTransactionFee,
  estimateLegacyTransactionByteSize,
} from "../../api/channels/electrum/transactionFee";
import { getSingleSendCurrencyOutput } from "../../api/channels/vrpc/requests/sendCurrencyOutputValidation";

describe("transaction security validation", () => {
  describe("sendcurrency output validation", () => {
    it("accepts exactly one RPC-created output", () => {
      const output = { value: 1 };

      expect(getSingleSendCurrencyOutput({ outs: [output] })).toBe(output);
    });

    it("rejects an RPC-created transaction with an injected output", () => {
      expect(() =>
        getSingleSendCurrencyOutput({
          outs: [{ value: 1 }, { value: 999999 }],
        }),
      ).toThrow("exactly one output");
    });

    it("rejects an RPC-created transaction without an output", () => {
      expect(() => getSingleSendCurrencyOutput({ outs: [] })).toThrow(
        "exactly one output",
      );
    });
  });

  describe("Electrum transaction fee validation", () => {
    const inputs = [
      { verifiedValueSats: 70000 },
      { verifiedValueSats: 30000 },
    ];

    it("calculates the potential fee from verified previous outputs", () => {
      expect(
        calculatePotentialTransactionFee(inputs, 80000, 19000).toString(),
      ).toBe("1000");
    });

    it("accepts a potential transaction whose fee matches the plan", () => {
      expect(
        assertSanePotentialTransactionFee(inputs, 80000, 19000, 1000),
      ).toEqual(BigNumber(1000));
    });

    it("rejects a hidden fee caused by a falsified Electrum input value", () => {
      expect(() =>
        assertSanePotentialTransactionFee(
          [{ verifiedValueSats: 100000000 }],
          900000,
          99000,
          1000,
        ),
      ).toThrow("does not match the planned fee");
    });

    it("rejects fee calculation without verified previous outputs", () => {
      expect(() =>
        assertSanePotentialTransactionFee(
          [{ value: 100000 }],
          90000,
          9000,
          1000,
        ),
      ).toThrow("verified input values");
    });

    it("uses a hash-verified input value as the authoritative amount", () => {
      const [input] = assertAndUseVerifiedInputValues([
        {
          amountSats: "100000",
          reportedValueSats: "100000",
          verifiedTxid: true,
          verifiedValueSats: 100000,
        },
      ]);

      expect(input.value).toBe(100000);
      expect(input.amountSats).toBe(100000);
    });

    it("rejects an Electrum value that disagrees with the previous transaction", () => {
      expect(() =>
        assertAndUseVerifiedInputValues([
          {
            amountSats: 1000,
            reportedValueSats: 1000,
            verifiedTxid: true,
            verifiedValueSats: 100000,
          },
        ]),
      ).toThrow("does not match the hash-verified previous transaction");
    });

    it("rejects an input whose previous transaction was not hash verified", () => {
      expect(() =>
        assertAndUseVerifiedInputValues([
          {
            amountSats: 100000,
            verifiedTxid: false,
            verifiedValueSats: 100000,
          },
        ]),
      ).toThrow("hash-verified previous transactions");
    });

    it("accounts for independently calculated KMD interest in the fee", () => {
      expect(
        calculatePotentialTransactionFee(
          [{verifiedValueSats: 100000}],
          95000,
          14000,
          10000,
        ).toString(),
      ).toBe("1000");
    });

    it("rejects fees above configured absolute and fee-rate limits", () => {
      expect(() =>
        assertFeeWithinLimits(10001, 200, {
          maxAbsoluteFee: 10000,
          maxFeeRatePerByte: 1000,
        }),
      ).toThrow("absolute fee limit");

      expect(() =>
        assertFeeWithinLimits(10000, 100, {
          maxFeeRatePerByte: 99,
        }),
      ).toThrow("maximum fee rate");
    });

    it("estimates the legacy transaction size for pre-signing fee checks", () => {
      expect(estimateLegacyTransactionByteSize(1, 2)).toBe(226);
    });
  });
});

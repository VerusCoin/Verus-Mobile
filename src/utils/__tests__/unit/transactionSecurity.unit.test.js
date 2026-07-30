import BigNumber from "bignumber.js";
import {
  assertSanePotentialTransactionFee,
  calculatePotentialTransactionFee,
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
  });
});

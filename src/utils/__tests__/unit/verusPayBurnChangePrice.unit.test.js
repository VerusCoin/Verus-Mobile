import { Transaction, networks } from "@bitgo/utxo-lib";
import { unpackOutput } from "@bitgo/utxo-lib/dist/src/smart_transactions";

jest.mock("../../CoinData/CoinDirectory", () => ({
  CoinDirectory: {
    getBasicCoinObj: () => ({
      system_id: "i5w5MuNik5NtLcYmNzcvaoixooEebB6MGV",
      vrpc_endpoints: ["https://example.invalid"],
    }),
  },
}));
jest.mock("../../vrpc/vrpcInterface", () => ({
  __esModule: true,
  default: { initEndpoint: jest.fn() },
}));
jest.mock("../../api/channels/vrpc/callCreators", () => ({
  getInfo: jest.fn(async () => ({
    result: { longestchain: 100 },
  })),
}));
jest.mock("../../api/channels/verusid/callCreators", () => ({
  getCurrency: jest.fn(async () => ({
    result: {
      options: 0x20,
      systemid: "i5w5MuNik5NtLcYmNzcvaoixooEebB6MGV",
    },
  })),
}));

import {
  DEST_PKH,
  SmartTransactionScript,
  TxDestination,
  TransferDestination,
  fromBase58Check,
  toBase58Check,
} from "verus-typescript-primitives";
import {
  BURN_CHANGE_PRICE_PARENT_TRANSACTION_FEE,
  calculateBurnChangePriceTransferFeeSatoshis,
  createUnfundedBurnChangePriceTransaction,
  validateBurnChangePriceTransferOutput,
} from "../../api/channels/vrpc/requests/createBurnChangePriceTransaction";
import {
  getVerusPayInvoicePaymentDestination,
  validateVerusPayBurnChangePrice,
} from "../../deeplink/verusPayBurnChangePrice";
import { validateVerusPayInvoiceDetails } from "../../deeplink/validator/verusPayInvoiceDetailsValidator";
import { IS_GATEWAY_FLAG, IS_TOKEN_FLAG } from "../../constants/currencies";

const DEFAULT_SYSTEM_ID = "i5w5MuNik5NtLcYmNzcvaoixooEebB6MGV";
const TOKEN_ID = "iJhCezBExJHvtyH3fGhNnt2NhU4Ztkf2yq";
const OWN_ADDRESS = "RTqQe58LSj2yr5CrwYFwcsAQ1edQwmrkUU";
const VDXF_TAG_HASH = Buffer.alloc(20, 0x42);
const VDXF_TAG = toBase58Check(VDXF_TAG_HASH, 137);

const makeDetails = overrides => ({
  isBurnChangePrice: () => true,
  acceptsConversion: () => false,
  isPreconvert: () => false,
  excludesVerusBlockchain: () => false,
  acceptsNonVerusSystems: () => false,
  acceptsAnyDestination: () => true,
  isTestnet: () => false,
  expires: () => false,
  isTagged: () => false,
  destinationIsSaplingPaymentAddress: () => false,
  requestedcurrencyid: TOKEN_ID,
  acceptedsystems: [],
  ...overrides,
});

describe("VerusPay burn-change-price support", () => {
  describe("invoice validation", () => {
    const tokenDefinition = {
      options: IS_TOKEN_FLAG,
      systemid: DEFAULT_SYSTEM_ID,
    };

    it("accepts a token burn on the token's native accepted system", () => {
      expect(() =>
        validateVerusPayBurnChangePrice(
          makeDetails(),
          tokenDefinition,
          DEFAULT_SYSTEM_ID,
        ),
      ).not.toThrow();
    });

    it("rejects conversion and preconvert combinations", () => {
      expect(() =>
        validateVerusPayBurnChangePrice(
          makeDetails({ acceptsConversion: () => true }),
          tokenDefinition,
          DEFAULT_SYSTEM_ID,
        ),
      ).toThrow("cannot allow currency conversion");

      expect(() =>
        validateVerusPayBurnChangePrice(
          makeDetails({ isPreconvert: () => true }),
          tokenDefinition,
          DEFAULT_SYSTEM_ID,
        ),
      ).toThrow("cannot be preconverts");
    });

    it("rejects non-token currencies", () => {
      expect(() =>
        validateVerusPayBurnChangePrice(
          makeDetails(),
          { ...tokenDefinition, options: 0 },
          DEFAULT_SYSTEM_ID,
        ),
      ).toThrow("only burn token currencies");
    });

    it("rejects gateway currencies", () => {
      expect(() =>
        validateVerusPayBurnChangePrice(
          makeDetails(),
          {
            ...tokenDefinition,
            options: IS_TOKEN_FLAG | IS_GATEWAY_FLAG,
          },
          DEFAULT_SYSTEM_ID,
        ),
      ).toThrow("cannot burn gateway currencies");
    });

    // it("allows tagged burn invoices through generic-request validation", async () => {
    //   await expect(
    //     validateVerusPayInvoiceDetails(
    //       makeDetails({ isTagged: () => true }),
    //     ),
    //   ).resolves.toBeUndefined();

    //   await expect(
    //     validateVerusPayInvoiceDetails(
    //       makeDetails({
    //         isBurnChangePrice: () => false,
    //         isTagged: () => true,
    //       }),
    //     ),
    //   ).rejects.toThrow("Tagged invoices not yet supported");
    // });

    it("rejects non-transparent explicit burn destinations", () => {
      expect(() =>
        validateVerusPayBurnChangePrice(
          makeDetails({
            acceptsAnyDestination: () => false,
            destination: {
              isPKH: () => false,
              isIAddr: () => false,
            },
          }),
          tokenDefinition,
          DEFAULT_SYSTEM_ID,
        ),
      ).toThrow("transparent address or VerusID");
    });

    it("rejects an invoice that excludes the token's native system", () => {
      expect(() =>
        validateVerusPayBurnChangePrice(
          makeDetails({ excludesVerusBlockchain: () => true }),
          tokenDefinition,
          DEFAULT_SYSTEM_ID,
        ),
      ).toThrow("does not accept the currency's native system");
    });
  });

  describe("destination selection", () => {
    const sendChannel = "vrpc.own-address.system";
    const wallet = { api_channels: { send: sendChannel } };
    const coinObj = { id: "TOKEN" };
    const activeAccount = {
      keys: {
        TOKEN: {
          [sendChannel]: {
            addresses: [OWN_ADDRESS],
          },
        },
      },
    };

    it("keeps an explicit invoice destination", () => {
      const destination = "RExplicitBurnDestination";
      const details = makeDetails({
        acceptsAnyDestination: () => false,
        destination: { getAddressString: () => destination },
      });

      expect(
        getVerusPayInvoicePaymentDestination(
          details,
          activeAccount,
          coinObj,
          wallet,
        ),
      ).toBe(destination);
    });

    it("uses the selected wallet's own address when omitted", () => {
      expect(
        getVerusPayInvoicePaymentDestination(
          makeDetails(),
          activeAccount,
          coinObj,
          wallet,
        ),
      ).toBe(OWN_ADDRESS);
    });

    it("leaves a normal any-destination invoice editable", () => {
      expect(
        getVerusPayInvoicePaymentDestination(
          makeDetails({ isBurnChangePrice: () => false }),
          activeAccount,
          coinObj,
          wallet,
        ),
      ).toBe("");
    });

    it("fails closed when the selected wallet has no own address", () => {
      expect(() =>
        getVerusPayInvoicePaymentDestination(
          makeDetails(),
          { keys: {} },
          coinObj,
          wallet,
        ),
      ).toThrow("Unable to find your address");
    });
  });

  describe("reserve transfer construction", () => {
    it("rejects burn-change-weight and conflicting transfer modes", () => {
      expect(() =>
        validateBurnChangePriceTransferOutput({ burnweight: true }),
      ).toThrow("reserve weight is not supported");

      expect(() =>
        validateBurnChangePriceTransferOutput({
          burn: true,
          convertto: TOKEN_ID,
        }),
      ).toThrow("cannot be combined with conversion");
    });

    it("encodes a sendcurrency-compatible burn-change-price transfer", () => {
      const destination = new TransferDestination({
        type: DEST_PKH,
        destinationBytes: fromBase58Check(OWN_ADDRESS).hash,
      });
      const hex = createUnfundedBurnChangePriceTransaction(
        DEFAULT_SYSTEM_ID,
        {
          currency: TOKEN_ID,
          satoshis: "100000000",
          address: destination,
          burn: true,
        },
        100,
      );
      const transaction = Transaction.fromHex(hex, networks.verus);
      const unpacked = unpackOutput(transaction.outs[0], DEFAULT_SYSTEM_ID);
      const reserveTransfer = unpacked.params[0].data;

      expect(transaction.outs).toHaveLength(1);
      expect(transaction.outs[0].value).toBe(20000);
      expect(reserveTransfer.isBurnChangePrice()).toBe(true);
      expect(reserveTransfer.isBurnChangeWeight()).toBe(false);
      expect(reserveTransfer.isImportToSource()).toBe(true);
      expect(reserveTransfer.isConversion()).toBe(false);
      expect(reserveTransfer.isCrossSystem()).toBe(false);
      expect(reserveTransfer.feeCurrencyID).toBe(DEFAULT_SYSTEM_ID);
      expect(reserveTransfer.feeAmount.toString()).toBe("20000");
      expect(reserveTransfer.destCurrencyID).toBe(TOKEN_ID);
      expect(reserveTransfer.transferDestination.getAddressString()).toBe(
        OWN_ADDRESS,
      );
    });

    it("encodes a VDXF tag in the burn output's master index destinations", () => {
      const destination = new TransferDestination({
        type: DEST_PKH,
        destinationBytes: fromBase58Check(OWN_ADDRESS).hash,
      });
      const hex = createUnfundedBurnChangePriceTransaction(
        DEFAULT_SYSTEM_ID,
        {
          currency: TOKEN_ID,
          satoshis: "100000000",
          address: destination,
          burn: true,
          vdxftag: VDXF_TAG,
        },
        100,
      );
      const transaction = Transaction.fromHex(hex, networks.verus);
      const burnScript = new SmartTransactionScript();
      burnScript.fromBuffer(transaction.outs[0].script);
      const tagDestination = burnScript.masterOptCC.destinations[0];
      const unpacked = unpackOutput(transaction.outs[0], DEFAULT_SYSTEM_ID);

      expect(burnScript.masterOptCC.m.toNumber()).toBe(1);
      expect(burnScript.masterOptCC.n.toNumber()).toBe(1);
      expect(burnScript.masterOptCC.destinations).toHaveLength(1);
      expect(tagDestination.type.eq(TxDestination.TYPE_INDEX)).toBe(true);
      expect(tagDestination.data.toBuffer()).toEqual(VDXF_TAG_HASH);
      expect(unpacked.destinations).toContain(VDXF_TAG);
      expect(unpacked.params[0].data.isBurnChangePrice()).toBe(true);
      expect(unpacked.params[0].data.isImportToSource()).toBe(true);
    });

    it("rejects a non-X-address VDXF tag", () => {
      const destination = new TransferDestination({
        type: DEST_PKH,
        destinationBytes: fromBase58Check(OWN_ADDRESS).hash,
      });

      expect(() =>
        createUnfundedBurnChangePriceTransaction(
          DEFAULT_SYSTEM_ID,
          {
            currency: TOKEN_ID,
            satoshis: "100000000",
            address: destination,
            burn: true,
            vdxftag: TOKEN_ID,
          },
          100,
        ),
      ).toThrow("valid X-address");
    });

    it("matches sendcurrency fee calculation for burn output destinations", () => {
      const standardDestinationFee =
        calculateBurnChangePriceTransferFeeSatoshis({
          destinationBytes: Buffer.alloc(20),
        });
      const extendedDestinationFee =
        calculateBurnChangePriceTransferFeeSatoshis({
          destinationBytes: Buffer.alloc(128),
        });

      expect(standardDestinationFee).toBe("20000");
      expect(extendedDestinationFee).toBe("40000");
      expect(
        Number(standardDestinationFee) / 100000000 +
          BURN_CHANGE_PRICE_PARENT_TRANSACTION_FEE,
      ).toBeCloseTo(0.0003, 8);
    });
  });
});

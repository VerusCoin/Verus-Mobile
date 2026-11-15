import { toIAddress } from "verus-typescript-primitives";
import { validateLookupBinding } from "../../api/channels/verusid/requests/lookupBinding";

const mockGetBasicCoinObj = jest.fn();
jest.mock("../../CoinData/CoinDirectory", () => ({
  CoinDirectory: {getBasicCoinObj: (...args) => mockGetBasicCoinObj(...args)},
}));

const SYSTEM_ID = "i5w5MuNik5NtLcYmNzcvaoixooEebB6MGV";
const CHIPS_ID = "iJ3WZocnjG9ufv7GKUA4LijQno5gTMb7tP";
const TEST_CHAIN_ID = toIAddress("testchain", "VRSCTEST");

describe("Verus RPC lookup binding", () => {
  beforeEach(() => {
    mockGetBasicCoinObj.mockReset().mockImplementation(systemId => {
      if (systemId === CHIPS_ID) return {system_id: CHIPS_ID};
      if (systemId === TEST_CHAIN_ID) return {system_id: TEST_CHAIN_ID, testnet: true};
      throw new Error("Unknown system");
    });
  });

  it("accepts an identity response bound to the requested name", () => {
    const identityAddress = toIAddress("alice", "VRSC");

    expect(() =>
      validateLookupBinding(
        SYSTEM_ID,
        "alice@",
        identityAddress,
        "alice.VRSC@",
        "identity",
      ),
    ).not.toThrow();
  });

  it("rejects substitution of another valid identity", () => {
    expect(() =>
      validateLookupBinding(
        SYSTEM_ID,
        "alice@",
        toIAddress("mallory", "VRSC"),
        "mallory.VRSC@",
        "identity",
      ),
    ).toThrow("does not match the requested identifier");
  });

  it("requires an address lookup to return that exact identity", () => {
    expect(() =>
      validateLookupBinding(
        SYSTEM_ID,
        toIAddress("alice", "VRSC"),
        toIAddress("mallory", "VRSC"),
        "mallory.VRSC@",
        "identity",
      ),
    ).toThrow("does not match the requested identifier");
  });

  it("accepts a currency response bound to the requested name", () => {
    const currencyAddress = toIAddress("QG.Andromeda", "VRSC");

    expect(() =>
      validateLookupBinding(
        SYSTEM_ID,
        "QG.Andromeda",
        currencyAddress,
        "QG.Andromeda",
        "currency",
      ),
    ).not.toThrow();
  });

  it("rejects substitution of another valid currency", () => {
    expect(() =>
      validateLookupBinding(
        SYSTEM_ID,
        "DAI.vETH",
        toIAddress("MKR.vETH", "VRSC"),
        "MKR.vETH",
        "currency",
      ),
    ).toThrow("does not match the requested identifier");
  });

  it("requires a currency address lookup to return that exact currency", () => {
    expect(() =>
      validateLookupBinding(
        SYSTEM_ID,
        toIAddress("DAI.vETH", "VRSC"),
        toIAddress("MKR.vETH", "VRSC"),
        "MKR.vETH",
        "currency",
      ),
    ).toThrow("does not match the requested identifier");
  });

  it("accepts the CHIPS server's root-omitted currency name for its exact i-address", () => {
    expect(() =>
      validateLookupBinding(CHIPS_ID, CHIPS_ID, CHIPS_ID, "CHIPS", "currency"),
    ).not.toThrow();
    expect(mockGetBasicCoinObj).toHaveBeenCalledWith(CHIPS_ID);
  });

  it.each([
    [CHIPS_ID, "alice.CHIPS", "VRSC"],
    [TEST_CHAIN_ID, "alice.testchain", "VRSCTEST"],
  ])("validates a shortened identity name using local root metadata for %s", (systemId, name, root) => {
    const identityAddress = toIAddress(name, root);

    expect(() =>
      validateLookupBinding(systemId, identityAddress, identityAddress, `${name}@`, "identity"),
    ).not.toThrow();
  });

  it("still rejects another valid currency returned for a CHIPS address lookup", () => {
    expect(() =>
      validateLookupBinding(CHIPS_ID, CHIPS_ID, toIAddress("OTHER", "VRSC"), "OTHER", "currency"),
    ).toThrow("does not match the requested identifier");
  });

  it("does not accept the same currency name from the wrong root", () => {
    const testnetAddress = toIAddress("CHIPS", "VRSCTEST");

    expect(() =>
      validateLookupBinding(CHIPS_ID, testnetAddress, testnetAddress, "CHIPS", "currency"),
    ).toThrow("Unable to parse response currency address");
  });

  it("does not reinterpret an unqualified PBaaS lookup as a global-root name", () => {
    expect(() =>
      validateLookupBinding(CHIPS_ID, "alice@", toIAddress("alice", "VRSC"), "alice@", "identity"),
    ).toThrow("Cannot securely resolve an unqualified name");
  });

  it("does not infer a response root for an unknown chain", () => {
    expect(() =>
      validateLookupBinding("unknown-system", CHIPS_ID, CHIPS_ID, "CHIPS", "currency"),
    ).toThrow("Unable to parse response currency address");
  });

  it("does not use a token's metadata as native chain context", () => {
    mockGetBasicCoinObj.mockReturnValueOnce({system_id: SYSTEM_ID});

    expect(() =>
      validateLookupBinding(CHIPS_ID, CHIPS_ID, CHIPS_ID, "CHIPS", "currency"),
    ).toThrow("Unable to parse response currency address");
  });

  it("rejects unqualified names when the root system cannot be resolved", () => {
    expect(() =>
      validateLookupBinding(
        "unknown-system",
        "alice@",
        toIAddress("alice"),
        "alice@",
        "identity",
      ),
    ).toThrow("Cannot securely resolve an unqualified name");
  });
});

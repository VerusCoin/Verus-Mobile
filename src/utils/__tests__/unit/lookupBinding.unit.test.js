import { toIAddress } from "verus-typescript-primitives";
import { validateLookupBinding } from "../../api/channels/verusid/requests/lookupBinding";

const SYSTEM_ID = "i5w5MuNik5NtLcYmNzcvaoixooEebB6MGV";

describe("Verus RPC lookup binding", () => {
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

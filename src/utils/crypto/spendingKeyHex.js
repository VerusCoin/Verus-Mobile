import { SaplingExtendedSpendingKey } from "verus-typescript-primitives";

// Wallet keys and intermediate native results share the same 169-byte encoding.
export const spendingKeyHex = key => {
  if (typeof key === "string" && /^[0-9a-f]{338}$/i.test(key)) {
    return key.toLowerCase();
  }

  try {
    if (typeof key === "string" && /^secret-extended-key-(main|test)1/i.test(key)) {
      return SaplingExtendedSpendingKey.fromKeyString(key).toBuffer().toString("hex");
    }
  } catch (_) {
    // Decoder errors can contain secret input. Return only a fixed message.
  }

  throw new Error("Invalid Sapling extended spending key.");
};

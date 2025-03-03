import {
  DataByteKey,
  DataInt16Key,
  DataUint16Key,
  DataInt32Key,
  DataUint32Key,
  DataInt64Key,
  DataUint64Key,
  DataUint160Key,
  DataUint256Key,
  DataStringKey,
  DataVectorKey,
  DataByteVectorKey,
  DataInt32VectorKey,
  DataInt64VectorKey,
  DataCurrencyMapKey,
  DataRatingsKey,
  DataURLKey,
  DataTransferDestinationKey,
  UTXORefKey,
  CrossChainDataRefKey,
  EncryptionDescriptorKey,
  SaltedDataKey,
  DataDescriptorKey,
  SignatureDataKey,
  VectorUint256Key,
  MMRLinksKey,
  MMRDescriptorKey,
  TypeDefinitionKey,
  MultiMapKey,
  ContentMultiMapRemoveKey,
  ProfileMediaKey,
  ZMemoMessageKey,
  ZMemoSignatureKey,
  CurrencyStartNotarizationKey
} from 'verus-typescript-primitives';

export function getVDXFKeyLabel(key) {
  if (key === DataByteKey.vdxfid) return "byte";
  if (key === DataInt16Key.vdxfid) return "int16";
  if (key === DataUint16Key.vdxfid) return "uint16";
  if (key === DataInt32Key.vdxfid) return "int32";
  if (key === DataUint32Key.vdxfid) return "uint32";
  if (key === DataInt64Key.vdxfid) return "int64";
  if (key === DataUint64Key.vdxfid) return "uint64";
  if (key === DataUint160Key.vdxfid) return "uint160";
  if (key === DataUint256Key.vdxfid) return "uint256";
  if (key === DataStringKey.vdxfid) return "string";
  if (key === DataVectorKey.vdxfid) return "vector";
  if (key === DataByteVectorKey.vdxfid) return "byte vector";
  if (key === DataInt32VectorKey.vdxfid) return "int32 vector";
  if (key === DataInt64VectorKey.vdxfid) return "int64 vector";
  if (key === DataCurrencyMapKey.vdxfid) return "currency map";
  if (key === DataRatingsKey.vdxfid) return "ratings";
  if (key === DataURLKey.vdxfid) return "url";
  if (key === DataTransferDestinationKey.vdxfid) return "transfer destination";
  if (key === UTXORefKey.vdxfid) return "utxo ref";
  if (key === CrossChainDataRefKey.vdxfid) return "cross chain data ref";
  if (key === EncryptionDescriptorKey.vdxfid) return "encryption descriptor";
  if (key === SaltedDataKey.vdxfid) return "salted data";
  if (key === DataDescriptorKey.vdxfid) return "data descriptor";
  if (key === SignatureDataKey.vdxfid) return "signature data";
  if (key === VectorUint256Key.vdxfid) return "vector uint256";
  if (key === MMRLinksKey.vdxfid) return "mmr links";
  if (key === MMRDescriptorKey.vdxfid) return "mmr descriptor";
  if (key === TypeDefinitionKey.vdxfid) return "type definition";
  if (key === MultiMapKey.vdxfid) return "multi map";
  if (key === ContentMultiMapRemoveKey.vdxfid) return "content multi map remove";
  if (key === ProfileMediaKey.vdxfid) return "profile media";
  if (key === ZMemoMessageKey.vdxfid) return "z memo message";
  if (key === ZMemoSignatureKey.vdxfid) return "z memo signature";
  if (key === CurrencyStartNotarizationKey.vdxfid) return "currency start notarization";
  return "unknown";
}
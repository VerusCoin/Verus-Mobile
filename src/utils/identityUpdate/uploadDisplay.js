/** Display only. Native upload requests need not have a daemon JSON form. */
export const identityUploadToDisplayJson = upload => {
  if (!upload) return null;
  try {
    return upload.toCLIJson();
  } catch (_) {
    // Preserve the whole request, including typed VDXF and MMR data, and show
    // encryption/hash choices separately. Never use this view for construction.
    return {
      flags: upload.flags.toString(),
      datatype: upload.dataType?.toString(),
      hashtype: upload.hashType?.toString(),
      encrypttoaddress: upload.encryptToAddress?.toAddressString(),
      createmmr: upload.createMMR,
      binarydata: upload.toBuffer().toString('hex'),
    };
  }
};

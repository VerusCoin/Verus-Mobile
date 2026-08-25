export const getUserDataRequestedSignerID = details => {
  if (details == null || details.hasSigner?.() !== true) return null;

  if (
    details.signer == null ||
    typeof details.signer.toIAddress !== "function"
  ) {
    throw new Error("User data request contains an invalid requested signer.");
  }

  try {
    const requestedSignerID = details.signer.toIAddress();

    if (!requestedSignerID) {
      throw new Error("Missing requested signer.");
    }

    return requestedSignerID;
  } catch (_) {
    throw new Error("User data request contains an invalid requested signer.");
  }
};

export const userDataRequestedSignerMatchesIdentity = (
  requestedSignerID,
  identityID,
) => requestedSignerID == null || requestedSignerID === identityID;

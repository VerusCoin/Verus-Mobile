import { timeout } from '../../../../promises'
import { isJson } from '../../../../objectManip'

import { REQUEST_TIMEOUT_MS } from '../../../../../../env/main.json'
import { reformatAddress } from '../../../../crypto/addressFormatter';

export const getIdentity = (identity) => {
  return new Promise((resolve, reject) => {
    if (identity.length < 2 || identity[identity.length - 1] != "@")
      reject(new Error("Invalid identity, identities must end in '@'"));

    const identityName = identity.substring(0, identity.length - 1);

    if (
      identityName[0] === " " ||
      identityName[identityName.length - 1] === " "
    ) {
      reject(
        new Error(
          "Invalid identity, identities cannot contain leading or trailing spaces"
        )
      );
    }

    const bannedChars = ["\\", "/", ":", "*", "?", '"', "<", ">", "|", "@"];

    for (const bannedChar of bannedChars) {
      if (identityName.includes(bannedChar)) {
        reject(new Error("Invalid identity"));
      }
    }

    timeout(
      REQUEST_TIMEOUT_MS,
      fetch("https://verify.verus.io/id", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: `${identityName}@` }),
      })
    )
      .then((response) => {
        if (!isJson(response)) {
          throw new Error(
            "Invalid JSON in getIdentity.js, received: " + response
          );
        }

        return response.json();
      })
      .then((response) => {
        resolve(response)
      })
      .catch((error) => {
        reject(error);
      });
  });
};

export const extractIdentityAddress = async (identityAddressString, coinId = "vrsc") => {
  let identityArray = identityAddressString.split("@");

  if (identityArray.length !== 2) throw new Error("Invalid VerusID format.");

  if (identityArray[1] === ":private" || identityArray[1] === "") {
    try {
      let status, identity
      try {
        const idRes = await getIdentity(`${identityArray[0]}@`);

        status = idRes.status
        identity = idRes.identity
      } catch(e) {
        throw new Error(`Failed to fetch data for "${identityArray[0]}@".`)
      }
      

      if (status !== "active") {
        throw new Error(
          `${
            identity.name
          }@ is currently either revoked or unable to receive funds.`
        );
      }

      if (identityArray[1] === ":private") {
        if (identity.privateaddress != null) {
          return identity.privateaddress;
        } else {
          throw new Error(`${identity.name}@ has no private address.`);
        }
      } else {
        if (identity.primaryaddresses.length === 1) {
          
          return reformatAddress(identity.primaryaddresses[0], coinId);
        } else {
          throw new Error(
            `${identity.name}@ has more than one primary address.`
          );
        }
      }
    } catch (e) {
      console.warn(e);
      throw e
    }
  } else {
    throw new Error("Invalid VerusID format.");
  }
}
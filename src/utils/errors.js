import { UNKNOWN_ERROR } from "./constants/errors";

export const throwError = (message, name = UNKNOWN_ERROR) => {
  let error = new Error(message)
  error.name = name
  throw error
}

export const cleanEthersErrorMessage = (msg, body) => {
  try {
    if (body && typeof body === 'object') {
      const errorChars = [];

      for (const x of body) {
        errorChars.push(String.fromCharCode(Number(x)))
      }

      const errorString = errorChars.join('')

      try {
        const errorJson = JSON.parse(errorString);

        if (errorJson.error) {
          return cleanEthersErrorMessage(errorJson.error.message);
        } else return cleanEthersErrorMessage(errorString);
      } catch(r) {
        return cleanEthersErrorMessage(errorString);
      }
    }
  } catch(e) {}

  if (
    msg.includes('API_KEY') || 
    msg.includes('apiKey') || 
    msg.includes('projectId') ||
    msg.includes('etherscan') ||
    msg.includes('infura') ||
    msg.includes('cloudflare') || 
    msg.includes('alchemy')
  ) {
    return 'An error occurred'
  } else return msg;
}
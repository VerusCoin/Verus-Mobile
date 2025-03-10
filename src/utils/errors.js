import { UNKNOWN_ERROR } from "./constants/errors";

export const throwError = (message, name = UNKNOWN_ERROR) => {
  let error = new Error(message)
  error.name = name
  throw error
}

export const cleanEthersErrorMessage = (msg) => {
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
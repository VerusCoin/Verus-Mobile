import { UNKNOWN_ERROR } from "./constants/errors";

export const throwError = (message, name = UNKNOWN_ERROR) => {
  let error = new Error(message)
  error.name = name
  throw error
}
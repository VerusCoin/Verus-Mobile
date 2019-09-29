export const removeSpaces = (string) => {
  if (typeof string === "string") {
    return string.replace(/\s+/g, '')
  } else {
    console.warn("function removeSpaces expected string, given " + typeof string)
    return string
  }
}

export const spacesLeadOrTrail = (string) => {
  if (typeof string === "string") {
    if (string.trim() !== string) {
      return true
    } else {
      return false
    }
  } else {
    console.warn("function spacesLeadOrTrail expected string, given " + typeof string)
    return string
  }
}

export const hasSpecialCharacters = (str) => {
  return !/[~`!#$%\^&*+=\-\[\]\\';,/{}|\\":<>\?]/g.test(str);
}

export const isElectrumUrl = (str) => {
  return /^[\w\.]{1,100}:\d{1,100}:\w{1,100}$/.test(str)
}
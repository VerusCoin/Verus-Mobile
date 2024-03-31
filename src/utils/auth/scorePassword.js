// MIT License

// Copyright (c) 2018 Pritish

// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

function limitValue(value, minValue, maxValue) {
  let currentValue = 0;
  if (!Number.isNaN(value)) {
    currentValue = parseInt(value);
  }
  return Math.min(Math.max(currentValue, minValue), maxValue);
}

function scorePassword(pass, minLength, limit,) {
  const variations = {
    digits: /\d/,
    lower: /[a-z]/,
    upper: /[A-Z]/,
    nonWords: /\W/,
  };

  let score = 0;
  let variationCount = 0;
  const letters = {};

  if (!pass || pass.length < minLength) {
    return score;
  }

  /* Score unique letters until 5 repetitions */
  for (let i = 0; i < pass.length; i += 1) {
    letters[pass[i]] = (letters[pass[i]] || 0) + 1;
    score += 5.0 / letters[pass[i]];
  }

  /* Score character variation */
  Object.keys(variations).forEach((variation) => {
    const variationCheck = variations[variation].test(pass);
    variationCount += variationCheck === true ? 1 : 0;
  });
  score += (variationCount - 1) * 10;

  return limitValue(score, 0, limit);
}

export default scorePassword;
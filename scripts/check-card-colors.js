#!/usr/bin/env node
const assert = require('assert');
const palette = require('../src/utils/subwallet/cardPalette.json');
const rgb = hex =>
  [1, 3, 5].map(offset => parseInt(hex.slice(offset, offset + 2), 16));
const luminance = channels =>
  channels
    .map(value => {
      const c = value / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    })
    .reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i], 0);
const contrast = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
const fills = [
  palette.transparent,
  palette.private,
  palette.unassigned,
  ...palette.jewel.flat(),
];
let minimum = Infinity;
for (const stops of fills) {
  const fill = stops.map(rgb).sort((a, b) => luminance(b) - luminance(a))[0];
  for (const alpha of [1, 0.86]) {
    const text = fill.map(c => 255 * alpha + c * (1 - alpha));
    const ratio = contrast(luminance(fill), luminance(text));
    assert(
      ratio >= 4.5,
      `${stops[0]}: ${alpha * 100}% white has ${ratio.toFixed(3)}:1 contrast`,
    );
    minimum = Math.min(minimum, ratio);
  }
}
console.log(
  `Card color check passed (${
    fills.length
  } materials, white and 86% white; minimum ${minimum.toFixed(3)}:1).`,
);

import BigNumber from 'bignumber.js';

export const HOUR = 3600000;
export const DAY = 24 * HOUR;
export const RANGE_LABELS = {
  '1D': '1 day', '1W': '1 week', '1M': '1 month', '1Y': '1 year', All: 'All',
};

const midnight = (time, days = 0) => {
  const date = new Date(time);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date.getTime();
};

export const availableRanges = (start, now) => {
  const yearAgo = new Date(now);
  yearAgo.setFullYear(yearAgo.getFullYear() - 1);
  return ['1D', '1W', '1M', '1Y', ...(start < yearAgo.getTime() ? ['All'] : [])];
};

export const grid = (range, start, now) => {
  const points = [];
  const add = (t, kind = 'day') => { if (t < now) points.push({ t, kind }); };
  if (range === '1D') {
    const hour = new Date(now - (23 * HOUR));
    hour.setMinutes(0, 0, 0);
    if (hour.getTime() < now - (23 * HOUR)) hour.setHours(hour.getHours() + 1);
    for (let t = hour.getTime(); t < now; t += HOUR) add(t, 'hour');
  } else if (range === '1W' || range === '1M') {
    const count = range === '1W' ? 7 : 30;
    for (let day = count - 1; day >= 0; day--) add(midnight(now, -day));
    if (range === '1W') {
      [6, 12, 18].forEach((hour) => {
        const date = new Date(midnight(now));
        date.setHours(hour);
        add(date.getTime(), 'hour');
      });
    }
  } else if (range === '1Y') {
    for (let week = 52; week >= 0; week--) add(midnight(now, -7 * week));
  } else {
    // The first point is the record start itself, including its time of day.
    add(start);
    for (let day = 7; midnight(start, day) < now; day += 7) add(midnight(start, day));
  }
  points.push({ t: now, kind: 'now' });
  return points;
};

export const rangeStart = (range, start, now) => grid(range, start, now)[0].t;

// Sorted samples are interpolated for prices, and clamped outside their span.
export const interpolate = (samples, t, fallback = 0) => {
  if (!samples?.length) return fallback;
  let low = 0;
  let high = samples.length - 1;
  if (t <= samples[low][0]) return samples[low][1];
  if (t >= samples[high][0]) return samples[high][1];
  while (high - low > 1) {
    const mid = Math.floor((low + high) / 2);
    if (samples[mid][0] <= t) low = mid;
    else high = mid;
  }
  const [a, av] = samples[low];
  const [b, bv] = samples[high];
  return av + ((bv - av) * (t - a) / (b - a));
};

export const recordedAmount = (points, t) => {
  if (!points?.length || t < points[0][0]) return '0';
  let low = 0;
  let high = points.length;
  while (low + 1 < high) {
    const mid = Math.floor((low + high) / 2);
    if (points[mid][0] <= t) low = mid;
    else high = mid;
  }
  return points[low][1];
};

// FX uses the last available ECB day, including weekends, without interpolation.
export const rateOnDay = (samples, t, fallback = 1) => {
  if (!samples?.length) return fallback;
  const date = new Date(t);
  const day = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const value = recordedAmount(samples, day);
  return Number(value) > 0 ? Number(value) : samples[0][1];
};

export const visibility = (record, hasPrice, total, now) => {
  if (!hasPrice || !record || !Object.keys(record.coins).length) return 'none';
  const everFunded = Object.values(record.coins).some((points) => points.some(([, amount]) => BigNumber(amount).gt(0)));
  if (!everFunded && !(total > 0)) return 'none';
  return now - record.start < DAY ? 'day1' : 'chart';
};

export const buildSeries = ({
  record, coins, prices = {}, fx = [], fxFallback = 1, total, range, now,
}) => {
  const all = grid(range, record.start, now);
  const axisStart = all[0].t;
  const partial = record.start > axisStart;
  const points = all.filter((p) => p.t >= record.start);
  if (partial) points.unshift({ t: record.start, kind: 'day' });
  const series = points.map((p) => ({
    ...p,
    v: p.kind === 'now' ? total : coins.reduce((sum, coin) => sum.plus(
      BigNumber(recordedAmount(record.coins[coin.id], p.t))
        .times(interpolate(prices[coin.id], p.t, Number(coin.usd)))
        .times(rateOnDay(fx, p.t, fxFallback)),
    ), BigNumber(0)).toNumber(),
  }));
  return { points: series, axisStart, partial };
};

export const change = (points) => {
  const first = points[0]?.v;
  return first > 0 ? ((points[points.length - 1].v - first) / first) * 100 : null;
};

export const percentNumber = (value) => {
  const amount = Math.abs(value);
  return amount < 10 ? amount.toFixed(1) : Math.round(amount).toLocaleString('en-US');
};
export const pillText = (value) => (value == null ? null : `${value >= 0 ? '+' : '−'}${percentNumber(value)}%`);

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const dateText = (time, now) => {
  const date = new Date(time);
  return `${date.getDate()} ${MONTHS[date.getMonth()]}${date.getFullYear() === new Date(now).getFullYear()
    ? '' : ` ${date.getFullYear()}`}`;
};

export const label = (point, now) => {
  if (point.kind === 'now') return 'Now';
  const today = midnight(point.t) === midnight(now);
  const yesterday = midnight(point.t) === midnight(now, -1);
  if (point.kind === 'hour') {
    const time = new Date(point.t).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    let day = dateText(point.t, now);
    if (today) day = 'Today';
    else if (yesterday) day = 'Yesterday';
    return `${day}, ${time}`;
  }
  if (today) return 'Today';
  if (yesterday) return 'Yesterday';
  const date = new Date(point.t);
  return `${date.getFullYear() === new Date(now).getFullYear() ? `${WEEKDAYS[date.getDay()]} ` : ''}${dateText(point.t, now)}`;
};

export const spanText = (range, partial, start, now) => (range === 'All' || partial
  ? `since ${dateText(start, now)}` : `over ${RANGE_LABELS[range]}`);

// Port of the approved curve.js monotone cubic. Keep the same tangents and rounding.
const sign = (x) => (x < 0 ? -1 : 1);
const slope3 = (x0, y0, x1, y1, x2, y2) => {
  const h0 = x1 - x0;
  const h1 = x2 - x1;
  const s0 = (y1 - y0) / (h0 || (h1 < 0 && -0));
  const s1 = (y2 - y1) / (h1 || (h0 < 0 && -0));
  const p = ((s0 * h1) + (s1 * h0)) / (h0 + h1);
  return (sign(s0) + sign(s1)) * Math.min(Math.abs(s0), Math.abs(s1), 0.5 * Math.abs(p)) || 0;
};
const slope2 = (x0, y0, x1, y1, tangent) => {
  const h = x1 - x0;
  return h ? ((3 * (y1 - y0) / h) - tangent) / 2 : tangent;
};
const f = (n) => Math.round(n * 100) / 100;
// One path command per segment, so a part of the line keeps the exact curve of the whole line.
export const segments = (points) => {
  const n = points.length;
  if (n < 2) return [];
  if (n === 2) return [`L${f(points[1][0])},${f(points[1][1])}`];
  const tangents = new Array(n);
  for (let i = 1; i < n - 1; i++) tangents[i] = slope3(...points[i - 1], ...points[i], ...points[i + 1]);
  tangents[0] = slope2(...points[0], ...points[1], tangents[1]);
  tangents[n - 1] = slope2(...points[n - 2], ...points[n - 1], tangents[n - 2]);
  const result = [];
  for (let i = 0; i < n - 1; i++) {
    const dx = (points[i + 1][0] - points[i][0]) / 3;
    result.push(`C${f(points[i][0] + dx)},${f(points[i][1] + (dx * tangents[i]))},`
      + `${f(points[i + 1][0] - dx)},${f(points[i + 1][1] - (dx * tangents[i + 1]))},`
      + `${f(points[i + 1][0])},${f(points[i + 1][1])}`);
  }
  return result;
};
// The line from point `from` to point `to`, and the fill under it.
export const lineBetween = (points, segs, from, to) => (points.length
  ? `M${f(points[from][0])},${f(points[from][1])}${segs.slice(from, to).join('')}` : '');
export const areaBetween = (points, segs, from, to, bottom) => (to <= from ? ''
  : `${lineBetween(points, segs, from, to)}L${f(points[to][0])},${f(bottom)}L${f(points[from][0])},${f(bottom)}Z`);
export const line = (points) => lineBetween(points, segments(points), 0, points.length - 1);
export const area = (points, bottom) => (points.length < 2 ? ''
  : areaBetween(points, segments(points), 0, points.length - 1, bottom));
export const domain = (values) => {
  let min = Math.min(...values);
  let max = Math.max(...values);
  const need = Math.abs(max) * 0.02;
  if (max - min < need) {
    const mid = (max + min) / 2;
    min = mid - (need / 2);
    max = mid + (need / 2);
  }
  return [min, max];
};

export const geometry = (series, width, height, axisStart, top = 28, bottom = 32) => {
  const [min, max] = domain(series.map((p) => p.v));
  const now = series[series.length - 1].t;
  const points = series.map((p) => [
    ((p.t - axisStart) / (now - axisStart || 1)) * width,
    top + ((1 - ((p.v - min) / (max - min || 1))) * (height - top - bottom)),
  ]);
  const segs = segments(points);
  const last = points.length - 1;
  return {
    points,
    segs,
    top: Math.min(...points.map((p) => p[1])),
    line: lineBetween(points, segs, 0, last),
    area: areaBetween(points, segs, 0, last, height),
  };
};

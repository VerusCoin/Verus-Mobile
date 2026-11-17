// The notched outline that the gift card and the payment slips share: 20-point
// corners and two half-round cut-outs, centred at `notchY` (owner, 2026-10-22).
// The cut-outs are carved out of the path, not circles painted over it, so the
// page shows through them in both appearances. A small ticket, such as the one
// on the "Claiming funds" screen, passes a smaller corner and notch so its
// notches stay readable.
export const TICKET_CORNER = 20;
export const TICKET_NOTCH = 11;

export const getTicketOutline = (
  width,
  height,
  notchY,
  corner = TICKET_CORNER,
  notch = TICKET_NOTCH,
) => {
  const r = corner;
  const n = notch;
  const w = width;
  const h = height;
  return `M${r} 0H${w - r}Q${w} 0 ${w} ${r}V${notchY - n}A${n} ${n} 0 0 0 ${w} ${notchY + n}V${h - r}Q${w} ${h} ${w - r} ${h}H${r}Q0 ${h} 0 ${h - r}V${notchY + n}A${n} ${n} 0 0 0 0 ${notchY - n}V${r}Q0 0 ${r} 0Z`;
};

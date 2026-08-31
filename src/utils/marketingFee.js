// Reference-only Marketing / B2B-B2C Sales fee, shown alongside a Project
// Calculator estimate so whoever brings in the deal has a fair, objective
// starting point for their commission -- never added to the client-facing
// total itself.
//
// Progressive (marginal) tiers, like an income tax bracket -- each tier's
// rate only applies to the slice of the total that falls within that band,
// not the whole amount. A flat "hard cliff" tier system (rate applies to
// the WHOLE total once a threshold is crossed) was tried first and
// rejected: it produced a smaller Rupiah fee for a larger deal right at
// each boundary (e.g. Rp49.999.999 paid more commission than
// Rp50.000.000), which fails the "fair and objective" bar this exists
// for. This progressive version guarantees the fee amount only ever goes
// up as the total goes up.
const TIERS = [
  { limit: 50_000_000, percent: 10 },
  { limit: 200_000_000, percent: 7 },
  { limit: 500_000_000, percent: 5 },
  { limit: Infinity, percent: 3 },
];

/**
 * @param {number} total - the estimate's grand_total (pre-PPN)
 * @returns {{ percent: number, amount: number }} percent is the blended
 *   effective rate (amount / total), not any single tier's marginal rate.
 */
export const calculateMarketingFee = (total) => {
  let remaining = Math.max(Number(total) || 0, 0);
  if (remaining <= 0) return { percent: 0, amount: 0 };

  let amount = 0;
  let lowerBound = 0;
  for (const tier of TIERS) {
    if (remaining <= 0) break;
    const bandWidth = tier.limit - lowerBound;
    const taxableInBand = Math.min(remaining, bandWidth);
    amount += taxableInBand * (tier.percent / 100);
    remaining -= taxableInBand;
    lowerBound = tier.limit;
  }

  amount = Math.round(amount);
  const percent = Math.round((amount / total) * 1000) / 10;

  return { percent, amount };
};

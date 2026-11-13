const TIERS = [
  { limit: 50_000_000, percent: 10 },
  { limit: 200_000_000, percent: 7 },
  { limit: 500_000_000, percent: 5 },
  { limit: Infinity, percent: 3 },
];

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

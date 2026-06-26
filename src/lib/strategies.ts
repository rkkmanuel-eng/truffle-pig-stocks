export interface StrategyCriterion {
  metric: string;
  label: string;
  operator: "<" | ">" | "<=" | ">=";
  threshold: number;
  unit?: string;
}

export interface Strategy {
  slug: string;
  name: string;
  description: string;
  criteria: StrategyCriterion[];
}

export const STRATEGIES: Strategy[] = [
  {
    slug: "value-investing",
    name: "Value Investing",
    description:
      "Benjamin Graham-style value criteria: low P/E, low P/B, manageable debt, and strong liquidity.",
    criteria: [
      { metric: "peRatio", label: "P/E Ratio", operator: "<", threshold: 15 },
      {
        metric: "pbRatio",
        label: "P/B Ratio",
        operator: "<",
        threshold: 1.5,
      },
      {
        metric: "debtEquityRatio",
        label: "Debt/Equity",
        operator: "<",
        threshold: 0.5,
      },
      {
        metric: "currentRatio",
        label: "Current Ratio",
        operator: ">",
        threshold: 1.5,
      },
    ],
  },
  {
    slug: "dividend-yield",
    name: "Dividend Yield",
    description:
      "High-yield dividend stocks with sustainable payout ratios for income-focused investors.",
    criteria: [
      {
        metric: "dividendYield",
        label: "Dividend Yield",
        operator: ">",
        threshold: 3,
        unit: "%",
      },
      {
        metric: "payoutRatio",
        label: "Payout Ratio",
        operator: "<",
        threshold: 75,
        unit: "%",
      },
    ],
  },
  {
    slug: "momentum",
    name: "Momentum / Trend",
    description:
      "Stocks showing bullish momentum: trading above key moving averages with golden cross signals.",
    criteria: [
      {
        metric: "priceAbove200SMA",
        label: "Price > 200-day SMA",
        operator: ">",
        threshold: 0,
      },
      {
        metric: "sma50Above200",
        label: "50-day SMA > 200-day SMA",
        operator: ">",
        threshold: 0,
      },
    ],
  },
  {
    slug: "dogs-of-the-dow",
    name: "Dogs of the Dow",
    description:
      "The 10 highest dividend-yielding Dow Jones stocks — a classic contrarian income strategy.",
    criteria: [
      {
        metric: "dividendYield",
        label: "Dividend Yield (Top 10 Dow)",
        operator: ">",
        threshold: 0,
        unit: "%",
      },
    ],
  },
  {
    slug: "52-week-low",
    name: "52-Week Low Bargains",
    description:
      "Stocks trading near their 52-week low and well below their high — potential contrarian opportunities.",
    criteria: [
      {
        metric: "pctFrom52Low",
        label: "% From 52W Low",
        operator: "<",
        threshold: 10,
        unit: "%",
      },
      {
        metric: "pctBelow52High",
        label: "% Below 52W High",
        operator: ">",
        threshold: 20,
        unit: "%",
      },
    ],
  },
  {
    slug: "low-beta",
    name: "Low Beta Defensive",
    description:
      "Low-volatility stocks that move less than the market — ideal for risk-averse investors.",
    criteria: [
      {
        metric: "beta",
        label: "Beta",
        operator: "<",
        threshold: 1.0,
      },
      {
        metric: "currentRatio",
        label: "Current Ratio",
        operator: ">",
        threshold: 1.0,
      },
    ],
  },
];

export function getStrategy(slug: string): Strategy | undefined {
  return STRATEGIES.find((s) => s.slug === slug);
}

export function meetsThreshold(
  value: number,
  criterion: StrategyCriterion,
  bufferPercent: number
): boolean {
  const buffer = criterion.threshold * (bufferPercent / 100);
  switch (criterion.operator) {
    case "<":
      return value < criterion.threshold + buffer;
    case "<=":
      return value <= criterion.threshold + buffer;
    case ">":
      return value > criterion.threshold - buffer;
    case ">=":
      return value >= criterion.threshold - buffer;
  }
}

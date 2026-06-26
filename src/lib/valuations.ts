import { StockRow, getAllStocks } from "./db";

export type ValuationBucket = "undervalued" | "fair" | "overvalued";

export interface ValuatedStock {
  symbol: string;
  name: string;
  price: number | null;
  metricValue: number | null;
  displayValue: string;
  bucket: ValuationBucket;
  createdAt: string | null;
}

export interface ValuationMethodMeta {
  slug: string;
  name: string;
  description: string;
  undervaluedLabel: string;
  fairLabel: string;
  overvaluedLabel: string;
}

interface ValuationMethodInternal extends ValuationMethodMeta {
  evaluate: (stock: StockRow) => ValuatedStock | null;
}

const METHODS: ValuationMethodInternal[] = [
  {
    slug: "dcf",
    name: "DCF Valuation",
    description: "Compares market price to discounted cash flow intrinsic value.",
    undervaluedLabel: "Price < 80% of DCF",
    fairLabel: "80–120% of DCF",
    overvaluedLabel: "Price > 120% of DCF",
    evaluate(stock) {
      if (stock.price == null || stock.dcf_value == null || stock.dcf_value <= 0) return null;
      const ratio = stock.price / stock.dcf_value;
      let bucket: ValuationBucket;
      if (ratio < 0.8) bucket = "undervalued";
      else if (ratio <= 1.2) bucket = "fair";
      else bucket = "overvalued";
      return {
        symbol: stock.symbol,
        name: stock.name,
        price: stock.price,
        metricValue: ratio,
        displayValue: `$${stock.dcf_value.toFixed(0)} DCF (${(ratio * 100).toFixed(0)}%)`,
        bucket,
        createdAt: stock.created_at ?? null,
      };
    },
  },
  {
    slug: "pe-ratio",
    name: "P/E Valuation",
    description: "Price-to-earnings ratio relative to historical market averages.",
    undervaluedLabel: "P/E < 15",
    fairLabel: "P/E 15–25",
    overvaluedLabel: "P/E > 25",
    evaluate(stock) {
      if (stock.price == null || stock.pe_ratio == null || stock.pe_ratio <= 0) return null;
      let bucket: ValuationBucket;
      if (stock.pe_ratio < 15) bucket = "undervalued";
      else if (stock.pe_ratio <= 25) bucket = "fair";
      else bucket = "overvalued";
      return {
        symbol: stock.symbol,
        name: stock.name,
        price: stock.price,
        metricValue: stock.pe_ratio,
        displayValue: `P/E: ${stock.pe_ratio.toFixed(1)}`,
        bucket,
        createdAt: stock.created_at ?? null,
      };
    },
  },
  {
    slug: "peg-ratio",
    name: "PEG Valuation",
    description: "P/E-to-growth ratio — accounts for earnings growth rate.",
    undervaluedLabel: "PEG < 1",
    fairLabel: "PEG 1–2",
    overvaluedLabel: "PEG > 2",
    evaluate(stock) {
      if (stock.price == null || stock.peg_ratio == null || stock.peg_ratio <= 0) return null;
      let bucket: ValuationBucket;
      if (stock.peg_ratio < 1) bucket = "undervalued";
      else if (stock.peg_ratio <= 2) bucket = "fair";
      else bucket = "overvalued";
      return {
        symbol: stock.symbol,
        name: stock.name,
        price: stock.price,
        metricValue: stock.peg_ratio,
        displayValue: `PEG: ${stock.peg_ratio.toFixed(2)}`,
        bucket,
        createdAt: stock.created_at ?? null,
      };
    },
  },
];

export interface ValuationResult {
  meta: ValuationMethodMeta;
  buckets: Record<ValuationBucket, ValuatedStock[]>;
}

export function evaluateAll(): ValuationResult[] {
  const stocks = getAllStocks();

  return METHODS.map((method) => {
    const buckets: Record<ValuationBucket, ValuatedStock[]> = {
      undervalued: [],
      fair: [],
      overvalued: [],
    };

    for (const stock of stocks) {
      const evaluated = method.evaluate(stock);
      if (evaluated) {
        buckets[evaluated.bucket].push(evaluated);
      }
    }

    buckets.undervalued.sort((a, b) => (a.metricValue ?? 0) - (b.metricValue ?? 0));
    buckets.fair.sort((a, b) => (a.metricValue ?? 0) - (b.metricValue ?? 0));
    buckets.overvalued.sort((a, b) => (a.metricValue ?? 0) - (b.metricValue ?? 0));

    const { evaluate: _, ...meta } = method;
    return { meta, buckets };
  });
}

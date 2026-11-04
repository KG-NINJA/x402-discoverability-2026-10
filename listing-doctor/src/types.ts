export interface Env {
  PAYWALL_ENABLED: string;
  PAYWALL_PRICE_USDC: string;
  PAYWALL_PAY_TO: string;
  PAYWALL_NETWORK: string;
  PAYWALL_ASSET: string;
}

export interface CheckRequest {
  url: string;
}

export interface SignalResult {
  detected: boolean;
  details?: string;
}

export interface Fix {
  signal: string;
  en: string;
  ja: string;
}

export interface CheckResult {
  url: string;
  host: string;
  score: number;
  maxScore: number;
  percentile?: string;
  confirmed: ConfirmedSignal[];
  couldNotConfirm: UnconfirmedSignal[];
  fixes: Fix[];
  x402Validation?: X402ValidationResult;
  rawSignals: Record<string, SignalResult>;
  checkedAt: string;
  note: {
    en: string;
    ja: string;
  };
}

export interface X402ValidationResult {
  httpStatus: number;
  hasAcceptsArray: boolean;
  hasInputSchema: boolean;
  hasOutputSchema: boolean;
  hasDescription: boolean;
  networkValid: boolean;
  assetValid: boolean;
  payToValid: boolean;
  resourceUrlMatches: boolean;
  priceConsistency: PriceConsistencyResult;
  issues: X402Issue[];
  parsed402?: Partial<X402PaymentRequired>;
}

export interface PriceConsistencyResult {
  checked: boolean;
  consistent: boolean;
  sources: PriceSource[];
  details?: string;
}

export interface PriceSource {
  source: string;
  amount?: string;
  asset?: string;
  network?: string;
  payTo?: string;
  normalizedUrl?: string;
  method?: string;
}

export interface X402Issue {
  severity: 'high' | 'medium' | 'low';
  code: string;
  en: string;
  ja: string;
}

export interface ConfirmedSignal {
  signal: string;
  detected: boolean;
  details?: string;
}

export interface UnconfirmedSignal {
  signal: string;
  reason: {
    en: string;
    ja: string;
  };
}

export interface X402PaymentRequired {
  accepts?: Array<{
    scheme?: string;
    network?: string;
    asset?: string;
    payTo?: string;
    amount?: string | number;
    maxAmountRequired?: string | number;
    description?: string;
    outputSchema?: unknown;
    extra?: {
      outputSchema?: unknown;
    };
  }>;
  resource?: {
    resource?: string;
    description?: string;
  };
  extensions?: {
    bazaar?: {
      schema?: unknown;
      info?: {
        input?: unknown;
        output?: unknown;
      };
    };
  };
}

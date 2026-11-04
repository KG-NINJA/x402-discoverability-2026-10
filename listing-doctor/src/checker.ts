import type {
  SignalResult,
  X402PaymentRequired,
  CheckResult,
  X402ValidationResult,
  X402Issue,
  PriceSource,
} from './types';
import {
  calculateScore,
  getPercentile,
  buildConfirmed,
  buildUnconfirmed,
  buildFixes,
  CHECKABLE_SIGNALS,
} from './scoring';

const TIMEOUT_MS = 8000;
const UA = 'x402-listing-doctor/1.0 (read-only check; no payment)';

const KNOWN_NETWORKS = new Set([
  'eip155:1',
  'eip155:8453',
  'eip155:84531',
  'eip155:84532',
  'eip155:10',
  'eip155:42161',
  'eip155:137',
  'eip155:43114',
  'base-mainnet',
  'base-sepolia',
  'ethereum-mainnet',
  'optimism-mainnet',
  'arbitrum-mainnet',
  'polygon-mainnet',
]);

const USDC_CONTRACTS = new Set([
  '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  '0x0b2c639c533813f4aa9d7837caf62653d097ff85',
  '0xaf88d065e77c8cc2239327c5edb3a432268e5831',
  '0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
  '0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e',
]);

const VER_PATHS = [
  '/verification-results',
  '/verification',
  '/test-results',
  '/.well-known/verification.json',
];
const VER_LINK_PATTERN =
  /https?:\/\/[^\s)\]"'<>]+\/(?:[^\s)\]"'<>]*?)(verification|test-results|test_results|audit-results|proof)[^\s)\]"'<>]*/i;
const VER_CONTENT_PATTERN = /verif|test result|self-purchase|proof/i;

export interface FetchLike {
  (input: RequestInfo, init?: RequestInit): Promise<Response>;
}

async function safeFetch(
  fetchFn: FetchLike,
  url: string,
  options?: RequestInit
): Promise<Response | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const resp = await fetchFn(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'User-Agent': UA,
        ...options?.headers,
      },
      redirect: 'follow',
    });
    clearTimeout(timeoutId);
    return resp;
  } catch {
    clearTimeout(timeoutId);
    return null;
  }
}

async function getText(resp: Response | null, maxBytes = 512 * 1024): Promise<string> {
  if (!resp) return '';
  try {
    const reader = resp.body?.getReader();
    if (!reader) return '';
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (total < maxBytes) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      total += value.length;
      if (total >= maxBytes) break;
    }
    reader.releaseLock();
    const merged = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }
    return new TextDecoder('utf-8').decode(merged);
  } catch {
    return '';
  }
}

function isHtml(text: string): boolean {
  const t = text.trim().slice(0, 200).toLowerCase();
  return t.startsWith('<!doctype') || t.startsWith('<html') || t.includes('<head');
}

function parseJson(text: string): unknown | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function checkLlmsTxt(
  fetchFn: FetchLike,
  baseUrl: string,
  soft404Body: string | null
): Promise<SignalResult> {
  const resp = await safeFetch(fetchFn, `${baseUrl}/llms.txt`);
  if (!resp || resp.status !== 200) {
    return { detected: false, details: resp ? `HTTP ${resp.status} observed` : 'Request failed or timed out' };
  }
  const text = await getText(resp);
  if (soft404Body && text.trim() === soft404Body) {
    return { detected: false, details: 'Response matches soft-404 pattern' };
  }
  if (isHtml(text)) {
    return { detected: false, details: 'Response appears to be HTML, not plain text' };
  }
  if (text.trim().length < 50) {
    return { detected: false, details: `Content too short (${text.trim().length} chars, need >=50)` };
  }
  return { detected: true, details: `Found ${text.trim().length} chars of llms.txt content` };
}

export async function checkA2aCard(
  fetchFn: FetchLike,
  baseUrl: string,
  soft404Body: string | null
): Promise<{ result: SignalResult; cardText: string }> {
  for (const path of ['/.well-known/agent-card.json', '/.well-known/agent.json']) {
    const resp = await safeFetch(fetchFn, `${baseUrl}${path}`);
    if (!resp || resp.status !== 200) continue;
    const text = await getText(resp);
    if (soft404Body && text.trim() === soft404Body) continue;
    const json = parseJson(text);
    if (!json || typeof json !== 'object' || Array.isArray(json)) continue;
    const obj = json as Record<string, unknown>;
    if (
      obj.name &&
      (obj.skills !== undefined || obj.capabilities !== undefined || obj.url !== undefined)
    ) {
      return {
        result: { detected: true, details: `Found valid A2A card at ${path}` },
        cardText: text,
      };
    }
  }
  return {
    result: { detected: false, details: 'No valid A2A card observed at /.well-known/agent-card.json or agent.json' },
    cardText: '',
  };
}

export async function checkX402Wellknown(
  fetchFn: FetchLike,
  baseUrl: string,
  soft404Body: string | null
): Promise<SignalResult> {
  for (const path of ['/.well-known/x402', '/.well-known/x402.json']) {
    const resp = await safeFetch(fetchFn, `${baseUrl}${path}`);
    if (!resp || resp.status !== 200) continue;
    const text = await getText(resp);
    if (soft404Body && text.trim() === soft404Body) continue;
    const json = parseJson(text);
    if (json && ((typeof json === 'object' && Object.keys(json as object).length > 0) || (Array.isArray(json) && json.length > 0))) {
      return { detected: true, details: `Found non-empty JSON at ${path}` };
    }
  }
  return { detected: false, details: 'No non-empty x402 config observed at /.well-known/x402 or x402.json' };
}

export async function checkRobotsTxt(
  fetchFn: FetchLike,
  baseUrl: string,
  soft404Body: string | null
): Promise<{ result: SignalResult; robotsText: string }> {
  const resp = await safeFetch(fetchFn, `${baseUrl}/robots.txt`);
  if (!resp || resp.status !== 200) {
    return {
      result: { detected: false, details: resp ? `HTTP ${resp.status} observed` : 'Request failed or timed out' },
      robotsText: '',
    };
  }
  const text = await getText(resp);
  if (soft404Body && text.trim() === soft404Body) {
    return { result: { detected: false, details: 'Response matches soft-404 pattern' }, robotsText: '' };
  }
  if (isHtml(text)) {
    return { result: { detected: false, details: 'Response appears to be HTML' }, robotsText: '' };
  }
  if (!/^\s*user-agent\s*:/im.test(text)) {
    return { result: { detected: false, details: 'No User-agent directive observed in robots.txt' }, robotsText: '' };
  }
  return { result: { detected: true, details: 'Valid robots.txt with User-agent directive observed' }, robotsText: text };
}

export async function checkSitemapXml(
  fetchFn: FetchLike,
  baseUrl: string,
  soft404Body: string | null,
  robotsText: string
): Promise<SignalResult> {
  const sitemapMatch = robotsText.match(/^\s*sitemap\s*:\s*(\S+)/im);
  const sitemapUrl = sitemapMatch ? sitemapMatch[1] : `${baseUrl}/sitemap.xml`;

  const resp = await safeFetch(fetchFn, sitemapUrl);
  if (!resp || resp.status !== 200) {
    return { detected: false, details: resp ? `HTTP ${resp.status} observed for sitemap` : 'Request failed or timed out' };
  }
  const text = await getText(resp);
  if (soft404Body && text.trim() === soft404Body) {
    return { detected: false, details: 'Response matches soft-404 pattern' };
  }
  if (text.includes('<urlset') || text.includes('<sitemapindex')) {
    return { detected: true, details: 'Valid XML sitemap observed' };
  }
  return { detected: false, details: 'Sitemap response does not contain <urlset> or <sitemapindex>' };
}

export interface Live402Result {
  signal: SignalResult;
  httpStatus: number;
  parsed?: X402PaymentRequired;
  hasInputSchema: boolean;
  hasOutputSchema: boolean;
  hasDescription: boolean;
}

export async function checkLive402Metadata(
  fetchFn: FetchLike,
  targetUrl: string
): Promise<Live402Result> {
  const method = 'GET';
  const resp = await safeFetch(fetchFn, targetUrl, { method });

  if (!resp) {
    return {
      signal: { detected: false, details: 'Request failed or timed out' },
      httpStatus: 0,
      hasInputSchema: false,
      hasOutputSchema: false,
      hasDescription: false,
    };
  }
  if (resp.status !== 402) {
    return {
      signal: { detected: false, details: `HTTP ${resp.status} observed at ${targetUrl}, expected 402 Payment Required` },
      httpStatus: resp.status,
      hasInputSchema: false,
      hasOutputSchema: false,
      hasDescription: false,
    };
  }

  let pr: X402PaymentRequired | null = null;

  const paymentRequiredHeader =
    resp.headers.get('payment-required') || resp.headers.get('PAYMENT-REQUIRED');
  if (paymentRequiredHeader) {
    try {
      const padded =
        paymentRequiredHeader + '==='.slice(0, (4 - (paymentRequiredHeader.length % 4)) % 4);
      const decoded = atob(padded);
      pr = JSON.parse(decoded) as X402PaymentRequired;
    } catch {
      pr = null;
    }
  }

  if (!pr) {
    const text = await getText(resp);
    const parsed = parseJson(text);
    if (parsed && typeof parsed === 'object') {
      pr = parsed as X402PaymentRequired;
    }
  }

  if (!pr) {
    return {
      signal: { detected: false, details: '402 response observed but could not parse payment-required challenge' },
      httpStatus: 402,
      hasInputSchema: false,
      hasOutputSchema: false,
      hasDescription: false,
    };
  }

  const acc = pr.accepts || [];
  const acc0 = acc.length > 0 && typeof acc[0] === 'object' ? acc[0] : {};
  const resourceDesc =
    (pr.resource && typeof pr.resource === 'object'
      ? (pr.resource as Record<string, unknown>).description
      : null) || acc0.description;
  const hasDesc = Boolean(resourceDesc && String(resourceDesc).trim());

  const bazaar = pr.extensions?.bazaar || {};
  const hasInputSchema = Boolean(bazaar.info?.input || bazaar.schema);
  const hasOutputSchema = Boolean(
    bazaar.info?.output || bazaar.schema || acc0.outputSchema || acc0.extra?.outputSchema
  );

  const hasSchema = hasInputSchema || hasOutputSchema;

  if (hasDesc && hasSchema) {
    return {
      signal: { detected: true, details: '402 challenge includes description and schema' },
      httpStatus: 402,
      parsed: pr,
      hasInputSchema,
      hasOutputSchema,
      hasDescription: hasDesc,
    };
  }
  const missing: string[] = [];
  if (!hasDesc) missing.push('description');
  if (!hasInputSchema && !hasOutputSchema) missing.push('input/output schema');
  else if (!hasInputSchema) missing.push('input schema');
  else if (!hasOutputSchema) missing.push('output schema');

  return {
    signal: { detected: false, details: `402 challenge observed but missing: ${missing.join(', ')}` },
    httpStatus: 402,
    parsed: pr,
    hasInputSchema,
    hasOutputSchema,
    hasDescription: hasDesc,
  };
}

function isValidEthereumAddress(addr: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(addr);
}

function normalizeAmount(amount: string | number | undefined): string | undefined {
  if (amount === undefined) return undefined;
  return String(amount);
}

function extractPriceFromLlmsTxt(text: string): PriceSource[] {
  const sources: PriceSource[] = [];
  const pricePatterns = [
    /(\d+(?:\.\d+)?)\s*USDC/gi,
    /\$(\d+(?:\.\d+)?)/g,
    /price[:\s]+(\d+(?:\.\d+)?)/gi,
    /cost[:\s]+(\d+(?:\.\d+)?)/gi,
    /(\d+)\s*atomic\s*USDC/gi,
  ];

  for (const pattern of pricePatterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      const value = match[1];
      if (value) {
        const numVal = parseFloat(value);
        let amountAtomic: string;
        if (pattern.source.includes('atomic')) {
          amountAtomic = value;
        } else if (numVal < 1000) {
          amountAtomic = Math.round(numVal * 1_000_000).toString();
        } else {
          amountAtomic = value;
        }
        sources.push({ source: 'llms.txt', amount: amountAtomic });
      }
    }
  }

  const networkPatterns = [/eip155:\d+/gi, /base[-\s]?mainnet/gi, /ethereum[-\s]?mainnet/gi];
  for (const pattern of networkPatterns) {
    const match = text.match(pattern);
    if (match) {
      if (sources.length > 0) {
        sources[0].network = match[0].toLowerCase().replace(/\s/g, '-');
      } else {
        sources.push({ source: 'llms.txt', network: match[0].toLowerCase().replace(/\s/g, '-') });
      }
      break;
    }
  }

  const addressPattern = /0x[a-fA-F0-9]{40}/g;
  const addresses = text.match(addressPattern) || [];
  for (const addr of addresses) {
    const lowerAddr = addr.toLowerCase();
    if (USDC_CONTRACTS.has(lowerAddr)) {
      if (sources.length > 0 && !sources[0].asset) {
        sources[0].asset = lowerAddr;
      }
    }
  }

  return sources;
}

function extractPriceFromX402Wellknown(json: unknown): PriceSource[] {
  const sources: PriceSource[] = [];
  if (!json || typeof json !== 'object') return sources;

  const obj = json as Record<string, unknown>;
  const resources = (obj.resources as Array<Record<string, unknown>>) || [];

  for (const resource of resources) {
    const accepts = (resource.accepts as Array<Record<string, unknown>>) || [];
    for (const accept of accepts) {
      sources.push({
        source: '/.well-known/x402',
        amount: normalizeAmount(accept.amount as string | number),
        asset: (accept.asset as string)?.toLowerCase(),
        network: accept.network as string,
        payTo: (accept.payTo as string)?.toLowerCase(),
      });
    }
  }

  return sources;
}

async function fetchSkillMd(fetchFn: FetchLike, baseUrl: string): Promise<string> {
  const paths = ['/SKILL.md', '/skill.md', '/.well-known/SKILL.md'];
  for (const path of paths) {
    const resp = await safeFetch(fetchFn, `${baseUrl}${path}`);
    if (resp && resp.status === 200) {
      return await getText(resp);
    }
  }
  return '';
}

export function validate402Response(
  targetUrl: string,
  parsed: X402PaymentRequired | undefined,
  httpStatus: number,
  hasInputSchema: boolean,
  hasOutputSchema: boolean,
  hasDescription: boolean,
  priceSources: PriceSource[]
): X402ValidationResult {
  const issues: X402Issue[] = [];

  if (httpStatus !== 402) {
    return {
      httpStatus,
      hasAcceptsArray: false,
      hasInputSchema: false,
      hasOutputSchema: false,
      hasDescription: false,
      networkValid: false,
      assetValid: false,
      payToValid: false,
      resourceUrlMatches: false,
      priceConsistency: { checked: false, consistent: false, sources: [] },
      issues: [
        {
          severity: 'high',
          code: 'NO_402_RESPONSE',
          en: `Endpoint returned HTTP ${httpStatus}, not 402 Payment Required`,
          ja: `エンドポイントはHTTP ${httpStatus}を返しました。402 Payment Requiredが期待されます`,
        },
      ],
    };
  }

  if (!parsed) {
    return {
      httpStatus: 402,
      hasAcceptsArray: false,
      hasInputSchema: false,
      hasOutputSchema: false,
      hasDescription: false,
      networkValid: false,
      assetValid: false,
      payToValid: false,
      resourceUrlMatches: false,
      priceConsistency: { checked: false, consistent: false, sources: [] },
      issues: [
        {
          severity: 'high',
          code: 'UNPARSEABLE_402',
          en: '402 response could not be parsed as x402 PaymentRequired',
          ja: '402レスポンスをx402 PaymentRequiredとしてパースできませんでした',
        },
      ],
    };
  }

  const hasAcceptsArray = Array.isArray(parsed.accepts) && parsed.accepts.length > 0;
  if (!hasAcceptsArray) {
    issues.push({
      severity: 'high',
      code: 'MISSING_ACCEPTS',
      en: '402 response is missing accepts[] array',
      ja: '402レスポンスにaccepts[]配列がありません',
    });
  }

  if (!hasInputSchema) {
    issues.push({
      severity: 'high',
      code: 'MISSING_INPUT_SCHEMA',
      en: '402 response is missing input schema - agents cannot determine required request format',
      ja: '402レスポンスに入力スキーマがありません - エージェントはリクエスト形式を判断できません',
    });
  }

  if (!hasOutputSchema) {
    issues.push({
      severity: 'high',
      code: 'MISSING_OUTPUT_SCHEMA',
      en: '402 response is missing output schema - agents cannot verify response format before paying',
      ja: '402レスポンスに出力スキーマがありません - エージェントは支払い前にレスポンス形式を確認できません',
    });
  }

  if (!hasDescription) {
    issues.push({
      severity: 'medium',
      code: 'MISSING_DESCRIPTION',
      en: '402 response is missing description - agents cannot understand what the endpoint does',
      ja: '402レスポンスに説明がありません - エージェントはエンドポイントの機能を理解できません',
    });
  }

  const acc0 = hasAcceptsArray ? parsed.accepts![0] : null;
  const network = acc0?.network;
  const asset = acc0?.asset?.toLowerCase();
  const payTo = acc0?.payTo?.toLowerCase();
  const amount = normalizeAmount(acc0?.amount ?? acc0?.maxAmountRequired);

  const networkValid = network ? KNOWN_NETWORKS.has(network.toLowerCase()) : false;
  if (network && !networkValid) {
    issues.push({
      severity: 'medium',
      code: 'UNKNOWN_NETWORK',
      en: `Network "${network}" is not a recognized Base/EVM network identifier`,
      ja: `ネットワーク "${network}" は認識されたBase/EVMネットワーク識別子ではありません`,
    });
  }

  const assetValid = asset ? USDC_CONTRACTS.has(asset) : false;
  if (asset && !assetValid) {
    if (!isValidEthereumAddress(asset)) {
      issues.push({
        severity: 'high',
        code: 'INVALID_ASSET_ADDRESS',
        en: `Asset "${asset}" is not a valid Ethereum address`,
        ja: `アセット "${asset}" は有効なEthereumアドレスではありません`,
      });
    } else {
      issues.push({
        severity: 'low',
        code: 'UNRECOGNIZED_ASSET',
        en: `Asset "${asset}" is not a recognized USDC contract address`,
        ja: `アセット "${asset}" は認識されたUSDCコントラクトアドレスではありません`,
      });
    }
  }

  const payToValid = payTo ? isValidEthereumAddress(payTo) : false;
  if (payTo && !payToValid) {
    issues.push({
      severity: 'high',
      code: 'INVALID_PAYTO_ADDRESS',
      en: `payTo "${payTo}" is not a valid Ethereum address`,
      ja: `payTo "${payTo}" は有効なEthereumアドレスではありません`,
    });
  }

  let resourceUrlMatches = false;
  if (parsed.resource && typeof parsed.resource === 'object') {
    const resourceUrl = (parsed.resource as Record<string, unknown>).resource as string;
    if (resourceUrl) {
      try {
        const parsedTarget = new URL(targetUrl);
        const parsedResource = new URL(resourceUrl);
        resourceUrlMatches =
          parsedTarget.host === parsedResource.host &&
          parsedTarget.pathname === parsedResource.pathname;
        if (!resourceUrlMatches) {
          issues.push({
            severity: 'low',
            code: 'RESOURCE_URL_MISMATCH',
            en: `Resource URL "${resourceUrl}" does not match checked URL "${targetUrl}"`,
            ja: `リソースURL "${resourceUrl}" はチェック対象URL "${targetUrl}" と一致しません`,
          });
        }
      } catch {
        resourceUrlMatches = false;
      }
    }
  }

  let priceConsistent = true;
  const priceDetails: string[] = [];

  if (amount && priceSources.length > 0) {
    for (const source of priceSources) {
      if (source.amount && source.amount !== amount) {
        priceConsistent = false;
        priceDetails.push(
          `${source.source} advertises ${source.amount} but 402 shows ${amount}`
        );
      }
      if (source.network && network && source.network.toLowerCase() !== network.toLowerCase()) {
        priceConsistent = false;
        priceDetails.push(
          `${source.source} advertises network ${source.network} but 402 shows ${network}`
        );
      }
      if (source.asset && asset && source.asset !== asset) {
        priceConsistent = false;
        priceDetails.push(
          `${source.source} advertises asset ${source.asset} but 402 shows ${asset}`
        );
      }
      if (source.payTo && payTo && source.payTo !== payTo) {
        priceConsistent = false;
        priceDetails.push(
          `${source.source} advertises payTo ${source.payTo} but 402 shows ${payTo}`
        );
      }
    }
  }

  if (!priceConsistent) {
    issues.push({
      severity: 'medium',
      code: 'PRICE_MISMATCH',
      en: `Price/network/asset/payTo mismatch between 402 and advertised values: ${priceDetails.join('; ')}`,
      ja: `402と公開値の間で価格/ネットワーク/アセット/payToの不一致: ${priceDetails.join('; ')}`,
    });
  }

  return {
    httpStatus,
    hasAcceptsArray,
    hasInputSchema,
    hasOutputSchema,
    hasDescription,
    networkValid,
    assetValid,
    payToValid,
    resourceUrlMatches,
    priceConsistency: {
      checked: priceSources.length > 0,
      consistent: priceConsistent,
      sources: priceSources,
      details: priceDetails.length > 0 ? priceDetails.join('; ') : undefined,
    },
    issues,
    parsed402: parsed,
  };
}

export async function checkVerificationPage(
  fetchFn: FetchLike,
  baseUrl: string,
  soft404Body: string | null,
  llmsTxtContent: string,
  cardContent: string
): Promise<SignalResult> {
  const combined = llmsTxtContent + cardContent;
  if (VER_LINK_PATTERN.test(combined)) {
    return { detected: true, details: 'Verification/proof URL pattern observed in llms.txt or agent-card' };
  }

  for (const path of VER_PATHS) {
    const resp = await safeFetch(fetchFn, `${baseUrl}${path}`);
    if (!resp || resp.status !== 200) continue;
    const text = await getText(resp);
    if (soft404Body && text.trim() === soft404Body) continue;
    if (text.trim().length > 200 && VER_CONTENT_PATTERN.test(text)) {
      return { detected: true, details: `Verification page observed at ${path}` };
    }
  }
  return { detected: false, details: 'No verification/proof page observed at standard paths or linked from llms.txt/agent-card' };
}

async function getSoft404Body(fetchFn: FetchLike, baseUrl: string): Promise<string | null> {
  const resp = await safeFetch(fetchFn, `${baseUrl}/__x402_census_404_probe_7f3a`);
  if (resp && resp.status === 200) {
    const text = await getText(resp);
    return text.trim();
  }
  return null;
}

export async function checkX402WellknownWithContent(
  fetchFn: FetchLike,
  baseUrl: string,
  soft404Body: string | null
): Promise<{ result: SignalResult; content: unknown | null }> {
  for (const path of ['/.well-known/x402', '/.well-known/x402.json']) {
    const resp = await safeFetch(fetchFn, `${baseUrl}${path}`);
    if (!resp || resp.status !== 200) continue;
    const text = await getText(resp);
    if (soft404Body && text.trim() === soft404Body) continue;
    const json = parseJson(text);
    if (
      json &&
      ((typeof json === 'object' && Object.keys(json as object).length > 0) ||
        (Array.isArray(json) && json.length > 0))
    ) {
      return {
        result: { detected: true, details: `Found non-empty JSON at ${path}` },
        content: json,
      };
    }
  }
  return {
    result: {
      detected: false,
      details: 'No non-empty x402 config observed at /.well-known/x402 or x402.json',
    },
    content: null,
  };
}

export async function checkUrl(
  targetUrl: string,
  fetchFn: FetchLike = fetch
): Promise<CheckResult> {
  const urlObj = new URL(targetUrl);
  const host = urlObj.hostname.toLowerCase();
  const baseUrl = `${urlObj.protocol}//${urlObj.host}`;

  const soft404Body = await getSoft404Body(fetchFn, baseUrl);

  const signals: Record<string, SignalResult> = {};
  let llmsTxtContent = '';
  let cardContent = '';
  let robotsText = '';
  let x402WellknownContent: unknown | null = null;
  const priceSources: PriceSource[] = [];

  const llmsResult = await checkLlmsTxt(fetchFn, baseUrl, soft404Body);
  signals.llms_txt = llmsResult;
  if (llmsResult.detected) {
    const resp = await safeFetch(fetchFn, `${baseUrl}/llms.txt`);
    if (resp) {
      llmsTxtContent = await getText(resp);
      priceSources.push(...extractPriceFromLlmsTxt(llmsTxtContent));
    }
  }

  const a2aResult = await checkA2aCard(fetchFn, baseUrl, soft404Body);
  signals.a2a_card = a2aResult.result;
  cardContent = a2aResult.cardText;

  const x402Result = await checkX402WellknownWithContent(fetchFn, baseUrl, soft404Body);
  signals.x402_wellknown = x402Result.result;
  x402WellknownContent = x402Result.content;
  if (x402WellknownContent) {
    priceSources.push(...extractPriceFromX402Wellknown(x402WellknownContent));
  }

  const skillMdContent = await fetchSkillMd(fetchFn, baseUrl);
  if (skillMdContent) {
    priceSources.push(
      ...extractPriceFromLlmsTxt(skillMdContent).map((s) => ({ ...s, source: 'SKILL.md' }))
    );
  }

  const robotsResult = await checkRobotsTxt(fetchFn, baseUrl, soft404Body);
  signals.robots_txt = robotsResult.result;
  robotsText = robotsResult.robotsText;

  signals.sitemap_xml = await checkSitemapXml(fetchFn, baseUrl, soft404Body, robotsText);

  const live402Result = await checkLive402Metadata(fetchFn, targetUrl);
  signals.live402_metadata = live402Result.signal;

  signals.verification_page_heuristic = await checkVerificationPage(
    fetchFn,
    baseUrl,
    soft404Body,
    llmsTxtContent,
    cardContent
  );

  const x402Validation = validate402Response(
    targetUrl,
    live402Result.parsed,
    live402Result.httpStatus,
    live402Result.hasInputSchema,
    live402Result.hasOutputSchema,
    live402Result.hasDescription,
    priceSources
  );

  const score = calculateScore(signals);

  const fixes = buildFixes(signals);

  for (const issue of x402Validation.issues) {
    if (issue.severity === 'high') {
      const existingFix = fixes.find((f) => f.signal === 'live402_metadata');
      if (!existingFix) {
        fixes.unshift({
          signal: `402_validation:${issue.code}`,
          en: issue.en,
          ja: issue.ja,
        });
      }
    }
  }

  return {
    url: targetUrl,
    host,
    score,
    maxScore: CHECKABLE_SIGNALS.length,
    percentile: getPercentile(score),
    confirmed: buildConfirmed(signals),
    couldNotConfirm: buildUnconfirmed(),
    fixes,
    x402Validation,
    rawSignals: signals,
    checkedAt: new Date().toISOString(),
    note: {
      en: 'This check examines observable signals only. It does not verify content quality, pricing accuracy, or actual payment functionality. MCP Registry and x402scan listing status were not verified in this single-URL check.',
      ja: 'このチェックは観測可能なシグナルのみを検査します。コンテンツの品質、価格の正確性、実際の支払い機能は検証しません。MCPレジストリとx402scan掲載状況はこの単一URLチェックでは確認されていません。',
    },
  };
}

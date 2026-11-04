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

const REQUEST_TIMEOUT_MS = 8000;
const BODY_READ_TIMEOUT_MS = 5000;
const MAX_BODY_BYTES = 512 * 1024;
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

export interface FetchResult {
  response: Response | null;
  error?: string;
  timedOut?: boolean;
}

async function safeFetch(
  fetchFn: FetchLike,
  url: string,
  options?: RequestInit
): Promise<FetchResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
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
    return { response: resp };
  } catch (err) {
    clearTimeout(timeoutId);
    const isAbort = err instanceof Error && err.name === 'AbortError';
    return {
      response: null,
      error: isAbort ? 'Request timed out' : String(err),
      timedOut: isAbort,
    };
  }
}

async function getTextWithTimeout(
  resp: Response | null,
  maxBytes = MAX_BODY_BYTES,
  timeoutMs = BODY_READ_TIMEOUT_MS
): Promise<{ text: string; timedOut: boolean; error?: string }> {
  if (!resp) return { text: '', timedOut: false };

  const deadline = Date.now() + timeoutMs;

  try {
    const reader = resp.body?.getReader();
    if (!reader) return { text: '', timedOut: false };

    const chunks: Uint8Array[] = [];
    let total = 0;

    while (total < maxBytes) {
      if (Date.now() > deadline) {
        reader.releaseLock();
        return {
          text: new TextDecoder('utf-8').decode(mergeChunks(chunks, total)),
          timedOut: true,
          error: 'Body read timed out',
        };
      }

      const readPromise = reader.read();
      const timeoutPromise = new Promise<{ done: true; value: undefined }>((resolve) =>
        setTimeout(() => resolve({ done: true, value: undefined }), Math.max(0, deadline - Date.now()))
      );

      const result = await Promise.race([readPromise, timeoutPromise]);

      if (result.done) {
        if (Date.now() > deadline && total === 0) {
          reader.releaseLock();
          return { text: '', timedOut: true, error: 'Body read timed out' };
        }
        break;
      }

      if (result.value) {
        chunks.push(result.value);
        total += result.value.length;
      }

      if (total >= maxBytes) break;
    }

    reader.releaseLock();
    return { text: new TextDecoder('utf-8').decode(mergeChunks(chunks, total)), timedOut: false };
  } catch (err) {
    return { text: '', timedOut: false, error: String(err) };
  }
}

function mergeChunks(chunks: Uint8Array[], total: number): Uint8Array {
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }
  return merged;
}

function isHtml(text: string): boolean {
  const t = text.trim().slice(0, 200).toLowerCase();
  return t.startsWith('<!doctype') || t.startsWith('<html') || t.includes('<head');
}

function safeParseJson(text: string): { value: unknown | null; error?: string } {
  try {
    return { value: JSON.parse(text) };
  } catch (err) {
    return { value: null, error: String(err) };
  }
}

function isObject(val: unknown): val is Record<string, unknown> {
  return val !== null && typeof val === 'object' && !Array.isArray(val);
}

function isArray(val: unknown): val is unknown[] {
  return Array.isArray(val);
}

function safeString(val: unknown): string | undefined {
  if (typeof val === 'string') return val;
  if (typeof val === 'number') return String(val);
  return undefined;
}

function safeNumber(val: unknown): number | undefined {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const n = parseFloat(val);
    return isNaN(n) ? undefined : n;
  }
  return undefined;
}

function normalizeResourceUrl(url: string): string {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.host}${u.pathname}`.toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

export async function checkLlmsTxt(
  fetchFn: FetchLike,
  baseUrl: string,
  soft404Body: string | null
): Promise<SignalResult> {
  try {
    const { response, error, timedOut } = await safeFetch(fetchFn, `${baseUrl}/llms.txt`);
    if (timedOut) {
      return { detected: false, details: 'Could not confirm (request timed out)' };
    }
    if (!response) {
      return { detected: false, details: error || 'Request failed' };
    }
    if (response.status !== 200) {
      return { detected: false, details: `HTTP ${response.status} observed` };
    }
    const { text, timedOut: bodyTimedOut } = await getTextWithTimeout(response);
    if (bodyTimedOut) {
      return { detected: false, details: 'Could not confirm (body read timed out)' };
    }
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
  } catch (err) {
    return { detected: false, details: `Error checking llms.txt: ${String(err)}` };
  }
}

export async function checkA2aCard(
  fetchFn: FetchLike,
  baseUrl: string,
  soft404Body: string | null
): Promise<{ result: SignalResult; cardText: string }> {
  try {
    for (const path of ['/.well-known/agent-card.json', '/.well-known/agent.json']) {
      const { response, timedOut } = await safeFetch(fetchFn, `${baseUrl}${path}`);
      if (timedOut) continue;
      if (!response || response.status !== 200) continue;

      const { text, timedOut: bodyTimedOut } = await getTextWithTimeout(response);
      if (bodyTimedOut) continue;
      if (soft404Body && text.trim() === soft404Body) continue;

      const { value: json } = safeParseJson(text);
      if (!isObject(json)) continue;

      if (
        json.name &&
        (json.skills !== undefined || json.capabilities !== undefined || json.url !== undefined)
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
  } catch (err) {
    return {
      result: { detected: false, details: `Error checking A2A card: ${String(err)}` },
      cardText: '',
    };
  }
}

export interface X402WellknownResult {
  result: SignalResult;
  content: unknown | null;
  resources: X402Resource[];
}

export interface X402Resource {
  resource: string;
  method: string;
  normalizedUrl: string;
  accepts: X402Accept[];
}

export interface X402Accept {
  amount?: string;
  asset?: string;
  network?: string;
  payTo?: string;
}

function parseX402WellknownResources(json: unknown): X402Resource[] {
  const resources: X402Resource[] = [];
  if (!isObject(json)) return resources;

  const rawResources = json.resources;
  if (!isArray(rawResources)) return resources;

  for (const res of rawResources) {
    if (!isObject(res)) continue;
    const resourceUrl = safeString(res.resource);
    const method = safeString(res.method) || 'GET';
    if (!resourceUrl) continue;

    const accepts: X402Accept[] = [];
    const rawAccepts = res.accepts;
    if (isArray(rawAccepts)) {
      for (const acc of rawAccepts) {
        if (!isObject(acc)) continue;
        accepts.push({
          amount: safeString(acc.amount),
          asset: safeString(acc.asset)?.toLowerCase(),
          network: safeString(acc.network),
          payTo: safeString(acc.payTo)?.toLowerCase(),
        });
      }
    }

    resources.push({
      resource: resourceUrl,
      method: method.toUpperCase(),
      normalizedUrl: normalizeResourceUrl(resourceUrl),
      accepts,
    });
  }

  return resources;
}

export async function checkX402WellknownWithContent(
  fetchFn: FetchLike,
  baseUrl: string,
  soft404Body: string | null
): Promise<X402WellknownResult> {
  try {
    for (const path of ['/.well-known/x402', '/.well-known/x402.json']) {
      const { response, timedOut } = await safeFetch(fetchFn, `${baseUrl}${path}`);
      if (timedOut) continue;
      if (!response || response.status !== 200) continue;

      const { text, timedOut: bodyTimedOut } = await getTextWithTimeout(response);
      if (bodyTimedOut) continue;
      if (soft404Body && text.trim() === soft404Body) continue;

      const { value: json } = safeParseJson(text);
      if (json && (isObject(json) || isArray(json))) {
        const resources = parseX402WellknownResources(json);
        return {
          result: { detected: true, details: `Found non-empty JSON at ${path}` },
          content: json,
          resources,
        };
      }
    }
    return {
      result: { detected: false, details: 'No non-empty x402 config observed at /.well-known/x402 or x402.json' },
      content: null,
      resources: [],
    };
  } catch (err) {
    return {
      result: { detected: false, details: `Error checking x402 wellknown: ${String(err)}` },
      content: null,
      resources: [],
    };
  }
}

export async function checkRobotsTxt(
  fetchFn: FetchLike,
  baseUrl: string,
  soft404Body: string | null
): Promise<{ result: SignalResult; robotsText: string }> {
  try {
    const { response, error, timedOut } = await safeFetch(fetchFn, `${baseUrl}/robots.txt`);
    if (timedOut) {
      return { result: { detected: false, details: 'Could not confirm (request timed out)' }, robotsText: '' };
    }
    if (!response) {
      return { result: { detected: false, details: error || 'Request failed' }, robotsText: '' };
    }
    if (response.status !== 200) {
      return { result: { detected: false, details: `HTTP ${response.status} observed` }, robotsText: '' };
    }

    const { text, timedOut: bodyTimedOut } = await getTextWithTimeout(response);
    if (bodyTimedOut) {
      return { result: { detected: false, details: 'Could not confirm (body read timed out)' }, robotsText: '' };
    }
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
  } catch (err) {
    return { result: { detected: false, details: `Error checking robots.txt: ${String(err)}` }, robotsText: '' };
  }
}

export async function checkSitemapXml(
  fetchFn: FetchLike,
  baseUrl: string,
  soft404Body: string | null,
  robotsText: string
): Promise<SignalResult> {
  try {
    const sitemapMatch = robotsText.match(/^\s*sitemap\s*:\s*(\S+)/im);
    const sitemapUrl = sitemapMatch ? sitemapMatch[1] : `${baseUrl}/sitemap.xml`;

    const { response, error, timedOut } = await safeFetch(fetchFn, sitemapUrl);
    if (timedOut) {
      return { detected: false, details: 'Could not confirm (request timed out)' };
    }
    if (!response) {
      return { detected: false, details: error || 'Request failed' };
    }
    if (response.status !== 200) {
      return { detected: false, details: `HTTP ${response.status} observed for sitemap` };
    }

    const { text, timedOut: bodyTimedOut } = await getTextWithTimeout(response);
    if (bodyTimedOut) {
      return { detected: false, details: 'Could not confirm (body read timed out)' };
    }
    if (soft404Body && text.trim() === soft404Body) {
      return { detected: false, details: 'Response matches soft-404 pattern' };
    }
    if (text.includes('<urlset') || text.includes('<sitemapindex')) {
      return { detected: true, details: 'Valid XML sitemap observed' };
    }
    return { detected: false, details: 'Sitemap response does not contain <urlset> or <sitemapindex>' };
  } catch (err) {
    return { detected: false, details: `Error checking sitemap: ${String(err)}` };
  }
}

export interface Live402Result {
  signal: SignalResult;
  httpStatus: number;
  parsed?: X402PaymentRequired;
  hasInputSchema: boolean;
  hasOutputSchema: boolean;
  hasDescription: boolean;
  methodUsed: string;
  retriedWithPost: boolean;
}

function parse402Response(text: string, header: string | null): X402PaymentRequired | null {
  if (header) {
    try {
      const padded = header + '==='.slice(0, (4 - (header.length % 4)) % 4);
      const decoded = atob(padded);
      const parsed = JSON.parse(decoded);
      if (isObject(parsed)) return parsed as X402PaymentRequired;
    } catch {
      // Fall through to body parsing
    }
  }

  const { value } = safeParseJson(text);
  if (isObject(value)) return value as X402PaymentRequired;
  return null;
}

function extract402Metadata(pr: X402PaymentRequired): {
  hasInputSchema: boolean;
  hasOutputSchema: boolean;
  hasDescription: boolean;
} {
  let hasInputSchema = false;
  let hasOutputSchema = false;
  let hasDescription = false;

  try {
    const accepts = isArray(pr.accepts) ? pr.accepts : [];
    const acc0 = accepts.length > 0 && isObject(accepts[0]) ? accepts[0] : null;

    const resourceObj = isObject(pr.resource) ? pr.resource : null;
    const resourceDesc = safeString(resourceObj?.description) || safeString(acc0?.description);
    hasDescription = Boolean(resourceDesc && resourceDesc.trim());

    const extensions = isObject(pr.extensions) ? pr.extensions : null;
    const bazaar = isObject(extensions?.bazaar) ? extensions.bazaar : null;
    const bazaarInfo = isObject(bazaar?.info) ? bazaar.info : null;

    hasInputSchema = Boolean(bazaarInfo?.input || bazaar?.schema);
    hasOutputSchema = Boolean(
      bazaarInfo?.output ||
        bazaar?.schema ||
        acc0?.outputSchema ||
        (isObject(acc0?.extra) ? acc0.extra.outputSchema : null)
    );
  } catch {
    // Type errors are caught, return defaults
  }

  return { hasInputSchema, hasOutputSchema, hasDescription };
}

export async function checkLive402Metadata(
  fetchFn: FetchLike,
  targetUrl: string,
  declaredMethod?: string
): Promise<Live402Result> {
  const defaultResult = (
    details: string,
    status: number,
    method: string,
    retried: boolean
  ): Live402Result => ({
    signal: { detected: false, details },
    httpStatus: status,
    hasInputSchema: false,
    hasOutputSchema: false,
    hasDescription: false,
    methodUsed: method,
    retriedWithPost: retried,
  });

  try {
    const preferredMethod = declaredMethod?.toUpperCase() || 'GET';
    let methodUsed = preferredMethod;
    let retriedWithPost = false;

    let { response, error, timedOut } = await safeFetch(fetchFn, targetUrl, { method: preferredMethod });

    if (timedOut) {
      return defaultResult('Could not confirm (request timed out)', 0, methodUsed, false);
    }

    if (!response) {
      return defaultResult(error || 'Request failed', 0, methodUsed, false);
    }

    if (response.status === 405 && preferredMethod === 'GET') {
      retriedWithPost = true;
      methodUsed = 'POST';
      const retryResult = await safeFetch(fetchFn, targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });

      if (retryResult.timedOut) {
        return defaultResult('Could not confirm (POST retry timed out)', 0, methodUsed, true);
      }

      if (!retryResult.response) {
        return {
          signal: {
            detected: false,
            details: `GET returned 405 (method not allowed), POST retry failed: ${retryResult.error || 'unknown error'}`,
          },
          httpStatus: 405,
          hasInputSchema: false,
          hasOutputSchema: false,
          hasDescription: false,
          methodUsed,
          retriedWithPost: true,
        };
      }

      response = retryResult.response;
    }

    if (response.status === 405) {
      return {
        signal: {
          detected: false,
          details: `Could not confirm: endpoint returned 405 Method Not Allowed (tried ${methodUsed}). May require different HTTP method.`,
        },
        httpStatus: 405,
        hasInputSchema: false,
        hasOutputSchema: false,
        hasDescription: false,
        methodUsed,
        retriedWithPost,
      };
    }

    if (response.status !== 402) {
      return {
        signal: {
          detected: false,
          details: `HTTP ${response.status} observed at ${targetUrl}, expected 402 Payment Required`,
        },
        httpStatus: response.status,
        hasInputSchema: false,
        hasOutputSchema: false,
        hasDescription: false,
        methodUsed,
        retriedWithPost,
      };
    }

    const paymentRequiredHeader =
      response.headers.get('payment-required') || response.headers.get('PAYMENT-REQUIRED');

    const { text, timedOut: bodyTimedOut } = await getTextWithTimeout(response);
    if (bodyTimedOut) {
      return defaultResult('Could not confirm (body read timed out)', 402, methodUsed, retriedWithPost);
    }

    const pr = parse402Response(text, paymentRequiredHeader);

    if (!pr) {
      return {
        signal: { detected: false, details: '402 response observed but could not parse payment-required challenge' },
        httpStatus: 402,
        hasInputSchema: false,
        hasOutputSchema: false,
        hasDescription: false,
        methodUsed,
        retriedWithPost,
      };
    }

    const { hasInputSchema, hasOutputSchema, hasDescription } = extract402Metadata(pr);
    const hasSchema = hasInputSchema || hasOutputSchema;

    if (hasDescription && hasSchema) {
      const retryNote = retriedWithPost ? ' (after POST retry)' : '';
      return {
        signal: { detected: true, details: `402 challenge includes description and schema${retryNote}` },
        httpStatus: 402,
        parsed: pr,
        hasInputSchema,
        hasOutputSchema,
        hasDescription,
        methodUsed,
        retriedWithPost,
      };
    }

    const missing: string[] = [];
    if (!hasDescription) missing.push('description');
    if (!hasInputSchema && !hasOutputSchema) missing.push('input/output schema');
    else if (!hasInputSchema) missing.push('input schema');
    else if (!hasOutputSchema) missing.push('output schema');

    return {
      signal: { detected: false, details: `402 challenge observed but missing: ${missing.join(', ')}` },
      httpStatus: 402,
      parsed: pr,
      hasInputSchema,
      hasOutputSchema,
      hasDescription,
      methodUsed,
      retriedWithPost,
    };
  } catch (err) {
    return defaultResult(`Error checking 402: ${String(err)}`, 0, 'GET', false);
  }
}

function isValidEthereumAddress(addr: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(addr);
}

function normalizeAmount(amount: unknown): string | undefined {
  const s = safeString(amount);
  return s;
}

export interface PriceSourceForResource extends PriceSource {
  normalizedUrl?: string;
  method?: string;
}

function extractPriceSourcesFromX402Resources(resources: X402Resource[]): PriceSourceForResource[] {
  const sources: PriceSourceForResource[] = [];

  for (const resource of resources) {
    for (const accept of resource.accepts) {
      sources.push({
        source: '/.well-known/x402',
        amount: accept.amount,
        asset: accept.asset,
        network: accept.network,
        payTo: accept.payTo,
        normalizedUrl: resource.normalizedUrl,
        method: resource.method,
      });
    }
  }

  return sources;
}

async function fetchSkillMd(fetchFn: FetchLike, baseUrl: string): Promise<string> {
  const paths = ['/SKILL.md', '/skill.md', '/.well-known/SKILL.md'];
  for (const path of paths) {
    try {
      const { response, timedOut } = await safeFetch(fetchFn, `${baseUrl}${path}`);
      if (timedOut) continue;
      if (response && response.status === 200) {
        const { text, timedOut: bodyTimedOut } = await getTextWithTimeout(response);
        if (!bodyTimedOut) return text;
      }
    } catch {
      continue;
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
  priceSources: PriceSourceForResource[],
  methodUsed: string,
  retriedWithPost: boolean
): X402ValidationResult {
  const issues: X402Issue[] = [];

  if (httpStatus === 405) {
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
          severity: 'medium',
          code: 'METHOD_NOT_ALLOWED',
          en: `Endpoint returned 405 Method Not Allowed (tried ${methodUsed}${retriedWithPost ? ' after POST retry' : ''}). Check /.well-known/x402 for the correct method.`,
          ja: `エンドポイントが405 Method Not Allowedを返しました（${methodUsed}を試行${retriedWithPost ? '、POST再試行後' : ''}）。正しいメソッドは/.well-known/x402を確認してください。`,
        },
      ],
    };
  }

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

  const hasAcceptsArray = isArray(parsed.accepts) && parsed.accepts.length > 0;
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

  let acc0: Record<string, unknown> | null = null;
  if (hasAcceptsArray && isObject(parsed.accepts![0])) {
    acc0 = parsed.accepts![0] as Record<string, unknown>;
  }

  const network = safeString(acc0?.network);
  const asset = safeString(acc0?.asset)?.toLowerCase();
  const payTo = safeString(acc0?.payTo)?.toLowerCase();
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
  const resourceObj = isObject(parsed.resource) ? parsed.resource : null;
  const resourceUrl = safeString(resourceObj?.resource);
  if (resourceUrl) {
    try {
      const parsedTarget = new URL(targetUrl);
      const parsedResource = new URL(resourceUrl);
      resourceUrlMatches =
        parsedTarget.host === parsedResource.host && parsedTarget.pathname === parsedResource.pathname;
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

  const targetNormalized = normalizeResourceUrl(targetUrl);
  const matchingSources = priceSources.filter(
    (s) => s.normalizedUrl && s.normalizedUrl === targetNormalized
  );

  let priceConsistent = true;
  const priceDetails: string[] = [];

  if (amount && matchingSources.length > 0) {
    for (const source of matchingSources) {
      if (source.amount && source.amount !== amount) {
        priceConsistent = false;
        priceDetails.push(
          `${source.source} advertises amount ${source.amount} but 402 shows ${amount}`
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

  if (!priceConsistent && priceDetails.length > 0) {
    issues.push({
      severity: 'medium',
      code: 'PRICE_MISMATCH',
      en: `Price/network/asset/payTo mismatch for this resource: ${priceDetails.join('; ')}`,
      ja: `このリソースの価格/ネットワーク/アセット/payToの不一致: ${priceDetails.join('; ')}`,
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
      checked: matchingSources.length > 0,
      consistent: priceConsistent,
      sources: matchingSources,
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
  try {
    const combined = llmsTxtContent + cardContent;
    if (VER_LINK_PATTERN.test(combined)) {
      return { detected: true, details: 'Verification/proof URL pattern observed in llms.txt or agent-card' };
    }

    for (const path of VER_PATHS) {
      const { response, timedOut } = await safeFetch(fetchFn, `${baseUrl}${path}`);
      if (timedOut) continue;
      if (!response || response.status !== 200) continue;

      const { text, timedOut: bodyTimedOut } = await getTextWithTimeout(response);
      if (bodyTimedOut) continue;
      if (soft404Body && text.trim() === soft404Body) continue;
      if (text.trim().length > 200 && VER_CONTENT_PATTERN.test(text)) {
        return { detected: true, details: `Verification page observed at ${path}` };
      }
    }
    return {
      detected: false,
      details: 'No verification/proof page observed at standard paths or linked from llms.txt/agent-card',
    };
  } catch (err) {
    return { detected: false, details: `Error checking verification page: ${String(err)}` };
  }
}

async function getSoft404Body(fetchFn: FetchLike, baseUrl: string): Promise<string | null> {
  try {
    const { response, timedOut } = await safeFetch(fetchFn, `${baseUrl}/__x402_census_404_probe_7f3a`);
    if (timedOut) return null;
    if (response && response.status === 200) {
      const { text, timedOut: bodyTimedOut } = await getTextWithTimeout(response);
      if (!bodyTimedOut) return text.trim();
    }
    return null;
  } catch {
    return null;
  }
}

export async function checkUrl(
  targetUrl: string,
  fetchFn: FetchLike = fetch
): Promise<CheckResult> {
  const urlObj = new URL(targetUrl);
  const host = urlObj.hostname.toLowerCase();
  const baseUrl = `${urlObj.protocol}//${urlObj.host}`;
  const targetNormalized = normalizeResourceUrl(targetUrl);

  const soft404Body = await getSoft404Body(fetchFn, baseUrl);

  const signals: Record<string, SignalResult> = {};
  let llmsTxtContent = '';
  let cardContent = '';
  let robotsText = '';
  let x402Resources: X402Resource[] = [];
  const priceSources: PriceSourceForResource[] = [];

  signals.llms_txt = await checkLlmsTxt(fetchFn, baseUrl, soft404Body);
  if (signals.llms_txt.detected) {
    try {
      const { response, timedOut } = await safeFetch(fetchFn, `${baseUrl}/llms.txt`);
      if (!timedOut && response) {
        const { text } = await getTextWithTimeout(response);
        llmsTxtContent = text;
      }
    } catch {
      // Continue without llms.txt content
    }
  }

  const a2aResult = await checkA2aCard(fetchFn, baseUrl, soft404Body);
  signals.a2a_card = a2aResult.result;
  cardContent = a2aResult.cardText;

  const x402Result = await checkX402WellknownWithContent(fetchFn, baseUrl, soft404Body);
  signals.x402_wellknown = x402Result.result;
  x402Resources = x402Result.resources;
  priceSources.push(...extractPriceSourcesFromX402Resources(x402Resources));

  try {
    const skillMdContent = await fetchSkillMd(fetchFn, baseUrl);
    if (skillMdContent) {
      // SKILL.md is not URL-specific, don't add to price sources for comparison
    }
  } catch {
    // Continue without SKILL.md
  }

  const robotsResult = await checkRobotsTxt(fetchFn, baseUrl, soft404Body);
  signals.robots_txt = robotsResult.result;
  robotsText = robotsResult.robotsText;

  signals.sitemap_xml = await checkSitemapXml(fetchFn, baseUrl, soft404Body, robotsText);

  const matchingResource = x402Resources.find((r) => r.normalizedUrl === targetNormalized);
  const declaredMethod = matchingResource?.method;

  const live402Result = await checkLive402Metadata(fetchFn, targetUrl, declaredMethod);
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
    priceSources,
    live402Result.methodUsed,
    live402Result.retriedWithPost
  );

  const score = calculateScore(signals);
  const fixes = buildFixes(signals);

  for (const issue of x402Validation.issues) {
    if (issue.severity === 'high' || issue.severity === 'medium') {
      const existingFix = fixes.find(
        (f) => f.signal === 'live402_metadata' || f.signal === `402_validation:${issue.code}`
      );
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

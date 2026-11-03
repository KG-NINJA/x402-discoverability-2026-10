import type { SignalResult, X402PaymentRequired, CheckResult } from './types';
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

export async function checkLive402Metadata(
  fetchFn: FetchLike,
  targetUrl: string
): Promise<SignalResult> {
  const urlObj = new URL(targetUrl);
  const method = 'GET';
  const resp = await safeFetch(fetchFn, targetUrl, { method });
  
  if (!resp) {
    return { detected: false, details: 'Request failed or timed out' };
  }
  if (resp.status !== 402) {
    return { detected: false, details: `HTTP ${resp.status} observed, expected 402 Payment Required` };
  }

  let pr: X402PaymentRequired | null = null;

  const paymentRequiredHeader = resp.headers.get('payment-required') || resp.headers.get('PAYMENT-REQUIRED');
  if (paymentRequiredHeader) {
    try {
      const padded = paymentRequiredHeader + '==='.slice(0, (4 - (paymentRequiredHeader.length % 4)) % 4);
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
    return { detected: false, details: '402 response observed but could not parse payment-required challenge' };
  }

  const acc = pr.accepts || [];
  const acc0 = (acc.length > 0 && typeof acc[0] === 'object') ? acc[0] : {};
  const resourceDesc =
    (pr.resource && typeof pr.resource === 'object' ? (pr.resource as Record<string, unknown>).description : null) ||
    acc0.description;
  const hasDesc = Boolean(resourceDesc && String(resourceDesc).trim());

  const bazaar = pr.extensions?.bazaar || {};
  const hasSchema = Boolean(
    bazaar.schema ||
    bazaar.info?.output ||
    bazaar.info?.input ||
    acc0.outputSchema ||
    acc0.extra?.outputSchema
  );

  if (hasDesc && hasSchema) {
    return { detected: true, details: '402 challenge includes description and schema' };
  }
  const missing: string[] = [];
  if (!hasDesc) missing.push('description');
  if (!hasSchema) missing.push('input/output schema');
  return { detected: false, details: `402 challenge observed but missing: ${missing.join(', ')}` };
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

  const llmsResult = await checkLlmsTxt(fetchFn, baseUrl, soft404Body);
  signals.llms_txt = llmsResult;
  if (llmsResult.detected) {
    const resp = await safeFetch(fetchFn, `${baseUrl}/llms.txt`);
    if (resp) llmsTxtContent = await getText(resp);
  }

  const a2aResult = await checkA2aCard(fetchFn, baseUrl, soft404Body);
  signals.a2a_card = a2aResult.result;
  cardContent = a2aResult.cardText;

  signals.x402_wellknown = await checkX402Wellknown(fetchFn, baseUrl, soft404Body);

  const robotsResult = await checkRobotsTxt(fetchFn, baseUrl, soft404Body);
  signals.robots_txt = robotsResult.result;
  robotsText = robotsResult.robotsText;

  signals.sitemap_xml = await checkSitemapXml(fetchFn, baseUrl, soft404Body, robotsText);

  signals.live402_metadata = await checkLive402Metadata(fetchFn, targetUrl);

  signals.verification_page_heuristic = await checkVerificationPage(
    fetchFn,
    baseUrl,
    soft404Body,
    llmsTxtContent,
    cardContent
  );

  const score = calculateScore(signals);

  return {
    url: targetUrl,
    host,
    score,
    maxScore: CHECKABLE_SIGNALS.length,
    percentile: getPercentile(score),
    confirmed: buildConfirmed(signals),
    couldNotConfirm: buildUnconfirmed(),
    fixes: buildFixes(signals),
    rawSignals: signals,
    checkedAt: new Date().toISOString(),
    note: {
      en: 'This check examines observable signals only. It does not verify content quality, pricing accuracy, or actual payment functionality. MCP Registry and x402scan listing status were not verified in this single-URL check.',
      ja: 'このチェックは観測可能なシグナルのみを検査します。コンテンツの品質、価格の正確性、実際の支払い機能は検証しません。MCPレジストリとx402scan掲載状況はこの単一URLチェックでは確認されていません。',
    },
  };
}

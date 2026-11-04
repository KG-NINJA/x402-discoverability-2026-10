import type { SignalResult, Fix, ConfirmedSignal, UnconfirmedSignal } from './types';

export const SIGNALS = [
  'llms_txt',
  'a2a_card',
  'mcp_registry',
  'x402_wellknown',
  'robots_txt',
  'sitemap_xml',
  'live402_metadata',
  'x402scan_listed',
  'verification_page_heuristic',
] as const;

export type SignalName = (typeof SIGNALS)[number];

export const CHECKABLE_SIGNALS: SignalName[] = [
  'llms_txt',
  'a2a_card',
  'x402_wellknown',
  'robots_txt',
  'sitemap_xml',
  'live402_metadata',
  'verification_page_heuristic',
];

export const UNCHECKABLE_SIGNALS: SignalName[] = ['mcp_registry', 'x402scan_listed'];

export const SIGNAL_DESCRIPTIONS: Record<
  SignalName,
  { en: string; ja: string; fixEn: string; fixJa: string }
> = {
  llms_txt: {
    en: '/llms.txt present (200, non-HTML, >=50 chars)',
    ja: '/llms.txt が存在（200、非HTML、50文字以上）',
    fixEn:
      'Add /llms.txt with at least 50 characters describing your service for LLM discovery',
    fixJa:
      '/llms.txt を追加してください（LLM発見用にサービスを説明する50文字以上のテキスト）',
  },
  a2a_card: {
    en: '/.well-known/agent-card.json or agent.json present with name and skills/capabilities/url',
    ja: '/.well-known/agent-card.json または agent.json が存在（name と skills/capabilities/url を含む）',
    fixEn:
      'Add /.well-known/agent-card.json with { "name": "...", "skills": [...] } or similar A2A card',
    fixJa:
      '/.well-known/agent-card.json を追加してください（{ "name": "...", "skills": [...] } 形式のA2Aカード）',
  },
  mcp_registry: {
    en: 'Listed in MCP Registry (modelcontextprotocol.io)',
    ja: 'MCPレジストリ（modelcontextprotocol.io）に登録済み',
    fixEn: 'Register your MCP server at registry.modelcontextprotocol.io',
    fixJa: 'registry.modelcontextprotocol.io でMCPサーバーを登録してください',
  },
  x402_wellknown: {
    en: '/.well-known/x402 or x402.json present with non-empty JSON',
    ja: '/.well-known/x402 または x402.json が存在（空でないJSON）',
    fixEn: 'Add /.well-known/x402.json with your x402 endpoint configuration',
    fixJa:
      '/.well-known/x402.json を追加してください（x402エンドポイント設定を含む）',
  },
  robots_txt: {
    en: '/robots.txt present with User-agent directive',
    ja: '/robots.txt が存在（User-agent ディレクティブを含む）',
    fixEn: 'Add /robots.txt with at least "User-agent: *" directive',
    fixJa:
      '/robots.txt を追加してください（少なくとも "User-agent: *" ディレクティブを含む）',
  },
  sitemap_xml: {
    en: '/sitemap.xml present with urlset or sitemapindex',
    ja: '/sitemap.xml が存在（urlset または sitemapindex を含む）',
    fixEn: 'Add /sitemap.xml with <urlset> listing your endpoints',
    fixJa:
      '/sitemap.xml を追加してください（<urlset> でエンドポイント一覧を記載）',
  },
  live402_metadata: {
    en: '402 response includes description AND input/output schema',
    ja: '402レスポンスに説明（description）と入出力スキーマが含まれる',
    fixEn:
      'Ensure your 402 response includes a description and inputSchema/outputSchema in the bazaar extensions or accepts array',
    fixJa:
      '402レスポンスにdescriptionとinputSchema/outputSchemaを含めてください（bazaar拡張またはaccepts配列内）',
  },
  x402scan_listed: {
    en: 'Listed on x402scan.com for your payTo address',
    ja: 'payToアドレスでx402scan.comに掲載済み',
    fixEn:
      'Ensure your endpoint is discoverable via CDP Bazaar so it appears on x402scan.com',
    fixJa:
      'CDP Bazaarで発見可能にしてx402scan.comに表示されるようにしてください',
  },
  verification_page_heuristic: {
    en: 'Verification/proof page detected (linked from llms.txt/agent-card or at standard paths)',
    ja: '検証/証明ページを検出（llms.txt/agent-cardからリンク、または標準パスに存在）',
    fixEn:
      'Add a /verification-results or /.well-known/verification.json page documenting test results or self-purchase proofs',
    fixJa:
      '/verification-results または /.well-known/verification.json ページを追加してください（テスト結果や自己購入証明を記載）',
  },
};

export function calculateScore(signals: Record<string, SignalResult>): number {
  let score = 0;
  for (const sig of CHECKABLE_SIGNALS) {
    if (signals[sig]?.detected) {
      score += 1;
    }
  }
  return score;
}

export function getPercentile(score: number): string {
  const dist: Record<number, number> = {
    0: 36,
    1: 282,
    2: 383,
    3: 364,
    4: 349,
    5: 316,
    6: 387,
    7: 289,
    8: 301,
    9: 28,
  };
  const total = 2735;
  let above = 0;
  for (let s = score + 1; s <= 9; s++) {
    above += dist[s] ?? 0;
  }
  const equalOrHigher = total - above;
  const pct = Math.round((equalOrHigher / total) * 100);
  return `top ${100 - pct + 1}% (based on 2026-10-26 survey of ${total} hosts)`;
}

export function buildConfirmed(
  signals: Record<string, SignalResult>
): ConfirmedSignal[] {
  const result: ConfirmedSignal[] = [];
  for (const sig of CHECKABLE_SIGNALS) {
    const s = signals[sig];
    result.push({
      signal: sig,
      detected: s?.detected ?? false,
      details: s?.details,
    });
  }
  return result;
}

export function buildUnconfirmed(): UnconfirmedSignal[] {
  return UNCHECKABLE_SIGNALS.map((sig) => ({
    signal: sig,
    reason: {
      en:
        sig === 'mcp_registry'
          ? 'MCP Registry check requires authenticated API access or full snapshot; not performed in this single-URL check'
          : 'x402scan listing check requires fetching recipient pages for all payTo addresses; not performed in this single-URL check',
      ja:
        sig === 'mcp_registry'
          ? 'MCPレジストリ確認は認証済みAPIアクセスまたは完全なスナップショットが必要なため、この単一URLチェックでは実行されません'
          : 'x402scan掲載確認はすべてのpayToアドレスの受取人ページ取得が必要なため、この単一URLチェックでは実行されません',
    },
  }));
}

export function buildFixes(signals: Record<string, SignalResult>): Fix[] {
  const fixes: Fix[] = [];
  for (const sig of CHECKABLE_SIGNALS) {
    if (!signals[sig]?.detected) {
      const desc = SIGNAL_DESCRIPTIONS[sig];
      fixes.push({
        signal: sig,
        en: desc.fixEn,
        ja: desc.fixJa,
      });
    }
  }
  return fixes;
}

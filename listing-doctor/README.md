# x402 Listing Doctor

**x402エンドポイント発見可能性チェッカー / x402 Endpoint Discoverability Checker**

---

## 概要 / Overview

### 日本語

x402 Listing Doctorは、x402プロトコルを使用した有料エンドポイントの発見可能性と設定の正しさをチェックする単一URLチェッカーです。2026-10-26に実施された2,735ホストの調査と同じ9つのシグナルを使用してスコアリングします。

**注意**: これはプレビュー版（ローカル/テスト専用）です。ペイウォールはデフォルトでOFFに設定されています。

### English

x402 Listing Doctor is a single-URL checker that scores whether an x402 paid endpoint is discoverable and properly configured. It uses the same 9-signal scoring criteria from the 2026-10-26 survey of 2,735 hosts.

**Note**: This is a preview version (local/test only). The paywall is OFF by default.

---

## 使用方法 / Usage

### ローカル開発 / Local Development

```bash
cd listing-doctor
npm install
npm run dev
```

### エンドポイント / Endpoints

#### POST /check

URLをチェックしてスコアを取得します。

```bash
curl -X POST http://localhost:8787/check \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/api/paid-endpoint"}'
```

**リクエスト / Request:**
```json
{
  "url": "https://example.com/api/paid-endpoint"
}
```

**レスポンス / Response:**
```json
{
  "url": "https://example.com/api/paid-endpoint",
  "host": "example.com",
  "score": 5,
  "maxScore": 7,
  "percentile": "top 35% (based on 2026-10-26 survey of 2735 hosts)",
  "confirmed": [
    { "signal": "llms_txt", "detected": true, "details": "..." },
    ...
  ],
  "couldNotConfirm": [
    { "signal": "mcp_registry", "reason": { "en": "...", "ja": "..." } },
    ...
  ],
  "fixes": [
    { "signal": "...", "en": "...", "ja": "..." }
  ],
  "note": {
    "en": "This check examines observable signals only...",
    "ja": "このチェックは観測可能なシグナルのみを検査します..."
  },
  "checkedAt": "2026-11-03T12:00:00.000Z"
}
```

---

## チェックされるシグナル / Signals Checked

| シグナル / Signal | 説明 / Description | チェック可能 / Checkable |
|---|---|---|
| llms_txt | /llms.txt が存在（200、非HTML、50文字以上）| ✅ |
| a2a_card | A2Aエージェントカードが存在 | ✅ |
| x402_wellknown | /.well-known/x402 設定が存在 | ✅ |
| robots_txt | /robots.txt が存在 | ✅ |
| sitemap_xml | /sitemap.xml が存在 | ✅ |
| live402_metadata | 402レスポンスにスキーマと説明が含まれる | ✅ |
| verification_page_heuristic | 検証ページが存在 | ✅ |
| mcp_registry | MCPレジストリに登録済み | ❌ (未確認として報告) |
| x402scan_listed | x402scan.comに掲載済み | ❌ (未確認として報告) |

---

## 制限事項 / Limitations

### 日本語

1. **単一URLチェック**: MCPレジストリとx402scan.comの掲載状況は、外部APIアクセスが必要なため確認されません。
2. **品質は評価しない**: コンテンツの存在のみを確認し、品質や正確性は評価しません。
3. **スナップショット時点のパーセンタイル**: パーセンタイルは2026-10-26調査時点のスコア分布に基づきます。
4. **HTTPSのみ**: HTTPSのURLのみがサポートされます。
5. **読み取り専用**: 支払いは行わず、402チャレンジのみを読み取ります。

### English

1. **Single-URL check**: MCP Registry and x402scan.com listing status are not verified as they require external API access.
2. **Presence only, not quality**: Only checks for existence, not content quality or accuracy.
3. **Snapshot-based percentile**: Percentiles are based on the score distribution from the 2026-10-26 survey.
4. **HTTPS only**: Only HTTPS URLs are supported.
5. **Read-only**: No payments are made; only the 402 challenge is read.

---

## テスト / Testing

```bash
npm test
```

---

## ペイウォール設定 / Paywall Configuration

プレビュー版ではペイウォールはOFFです。有効にするには `wrangler.toml` を編集:

```toml
[vars]
PAYWALL_ENABLED = "true"
PAYWALL_PRICE_USDC = "0.01"
PAYWALL_PAY_TO = "0x4D7d842536De9Eb491AE2300126B3CDdE7B0aDE3"
PAYWALL_NETWORK = "base-mainnet"
PAYWALL_ASSET = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913"
```

---

## 本番デプロイに必要なもの / Production Deployment Requirements

本番環境へのデプロイには以下が必要です:

1. **ペイウォール統合**: x402 v2支払い検証の実装
2. **レート制限**: 悪用防止のためのレート制限
3. **監視**: Cloudflare Logsとエラー追跡
4. **DNS設定**: カスタムドメインの設定
5. **セキュリティレビュー**: 支払い処理のセキュリティ監査
6. **Bazaar登録**: CDP Bazaarへのリソース登録（オプション）

---

## ライセンス / License

MIT

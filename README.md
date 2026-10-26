# x402 エージェント発見可能性スナップショット調査 2026-10-26 / x402 Agent Discoverability Snapshot Survey 2026-10-26

**本リポジトリは2026-10-26時点の調査記録のみを収録しており、KGシステムの変更履歴ではありません。**

**This repository is a record of the 2026-10-26 discoverability survey only, not a change history of KG's systems.**

## ⚠️ 利益相反の開示 / Conflict of Interest Disclosure

**本調査の著者はkgninja.devホストの運営者であり、評価対象の9つのシグナルとその重み付けを自ら選定しました。これは利益相反に該当します。**

**The author of this study operates the kgninja.dev hosts and chose the 9 signals and their equal weights. This is a conflict of interest.**

---

## 日本語 / Japanese

### 概要

2026年10月26日（JST）に実施した、Coinbase CDP Bazaar上のx402ホストを対象としたエージェント発見可能性スナップショット調査のデータセットです。

スナップショット取得時点でBazaar APIは68,517リソースを報告しましたが、取得できたのは68,511件でした（完全な全数調査ではありません）。これらから抽出された2,735ホスト（1,624販売者）を対象に、9つの発見可能性シグナル（各1点、均等重み）をチェックし、0〜9点でスコアリングしました。

### 主な結果

- **agent-economy.kgninja.dev**: 9/9（28ホスト中の1つとして全シグナル合格）
- **si.kgninja.dev**: 8/9
- **api.kgninja.dev**: 7/9

### 重要な注意事項

1. **利益相反**: 著者はkgninja.devホストの運営者であり、シグナルと重み付けを自ら選定しています。
2. **不完全なカバレッジ**: Bazaar APIは68,517リソースを報告しましたが、スナップショットには68,511件のみ含まれています（完全な全数調査ではありません）。
3. **「verification page」シグナルはヒューリスティック**: 該当率わずか4.0%と稀少です。このシグナルを除いた8シグナル評価では、307ホストが8/8点を獲得（上位11.2%）。
4. **存在のみを測定**: ドキュメントの存在を確認するだけで、その品質は評価していません。売上・収益との相関は弱い（Spearman rho = 0.30）。kgninja.devの推定30日間収益は約$0.01〜0.06です。
5. **単一スナップショット**: 2026-10-26の一時点のみ。一時的なエラーは「不在」としてカウント。MCPマッチングはドメインレベル。x402scanはHTML解析による検出。CDP以外のファシリテーターのみを使用する販売者は対象外。

### シグナル別該当率

| シグナル | 全ホスト (%) | 上位50収益ホスト (%) |
|---|---|---|
| llms_txt | 64.5 | 68.0 |
| a2a_card | 31.8 | 30.0 |
| mcp_registry | 47.2 | 54.0 |
| x402_wellknown | 67.1 | 70.0 |
| robots_txt | 46.5 | 60.0 |
| sitemap_xml | 37.7 | 48.0 |
| live402_metadata | 91.6 | 98.0 |
| x402scan_listed | 52.8 | 74.0 |
| verification_page_heuristic | 4.0 | 6.0 |

### スコア分布

| スコア | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 |
|---|---|---|---|---|---|---|---|---|---|---|
| ホスト数 | 36 | 282 | 383 | 364 | 349 | 316 | 387 | 289 | 301 | 28 |

平均スコア: 4.43

### 調査日時 (JST)

- Bazaarスナップショット取得: 2026-10-26 15:50-15:51頃
- MCPレジストリ取得: 2026-10-26 16:05-16:18頃
- ホストチェック実行: 2026-10-26 16:02-16:06頃
- x402scanチェック実行: 2026-10-26 16:06-16:40頃

### 再現方法

```bash
python3 fetch_bazaar.py            # bazaar.jsonを出力（要slimming）
python3 fetch_mcp_registry.py      # mcp_registry_snapshot.jsonを出力
python3 check_discoverability.py   # raw_checks.json, x402scan_origins.json, hosts.csvを出力
python3 analyze.py                 # hosts_scored.csv (最終), summary.jsonを出力
```

大容量スナップショット（Bazaar 55MB, MCP Registry 194MB）はサイズの都合で含まれていません。SHA-256ハッシュは`snapshot_sha256.txt`に記録されており、fetchスクリプトで最新版を再取得できます。

---

## English

### Overview

Dataset from an agent discoverability snapshot survey of x402 hosts listed on Coinbase CDP Bazaar, conducted on 2026-10-26 (JST).

The Bazaar API reported 68,517 resources at fetch time, but the snapshot contains 68,511 items (not a complete census). The 2,735 hosts (1,624 sellers by payTo) extracted from this snapshot were checked against 9 discoverability signals (1 point each, equal weight), scored 0-9.

### Key Results

- **agent-economy.kgninja.dev**: 9/9 (one of 28 hosts meeting all 9 signals)
- **si.kgninja.dev**: 8/9
- **api.kgninja.dev**: 7/9

### Important Caveats

1. **Conflict of interest**: The author operates the kgninja.dev hosts and chose the signals and weights.
2. **Incomplete coverage**: The Bazaar API reported 68,517 resources, but the snapshot contains only 68,511 items (not a complete census).
3. **Verification page signal is heuristic and rare**: Only 4.0% prevalence. Without this signal, 307 hosts score 8/8 (top 11.2%).
4. **Measures presence only, not quality**: Does not evaluate document quality. Weak correlation with revenue (Spearman rho = 0.30). kgninja.dev's estimated 30-day revenue is roughly $0.01-0.06.
5. **Single snapshot**: One-time capture on 2026-10-26. Transient errors count as absent. MCP match is domain-level. x402scan parsed from public HTML. Sellers using only non-CDP facilitators are excluded.

### Signal Prevalence

| Signal | All Hosts (%) | Top-50 Revenue Hosts (%) |
|---|---|---|
| llms_txt | 64.5 | 68.0 |
| a2a_card | 31.8 | 30.0 |
| mcp_registry | 47.2 | 54.0 |
| x402_wellknown | 67.1 | 70.0 |
| robots_txt | 46.5 | 60.0 |
| sitemap_xml | 37.7 | 48.0 |
| live402_metadata | 91.6 | 98.0 |
| x402scan_listed | 52.8 | 74.0 |
| verification_page_heuristic | 4.0 | 6.0 |

### Score Distribution

| Score | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 |
|---|---|---|---|---|---|---|---|---|---|---|
| Hosts | 36 | 282 | 383 | 364 | 349 | 316 | 387 | 289 | 301 | 28 |

Mean score: 4.43

### Census Timestamps (JST)

- Bazaar snapshot: 2026-10-26 ~15:50-15:51
- MCP Registry snapshot: 2026-10-26 ~16:05-16:18
- Host checks: 2026-10-26 ~16:02-16:06
- x402scan checks: 2026-10-26 ~16:06-16:40

### Reproduction

```bash
python3 fetch_bazaar.py            # outputs bazaar.json (needs slimming)
python3 fetch_mcp_registry.py      # outputs mcp_registry_snapshot.json
python3 check_discoverability.py   # outputs raw_checks.json, x402scan_origins.json, hosts.csv
python3 analyze.py                 # outputs hosts_scored.csv (final), summary.json
```

Large raw snapshots (Bazaar 55MB, MCP Registry 194MB) are not included due to size. SHA-256 hashes are recorded in `snapshot_sha256.txt`; the fetch scripts regenerate fresh snapshots.

---

## ファイル一覧 / Files

| ファイル / File | 説明 / Description |
|---|---|
| `METHODOLOGY.md` | 詳細な調査方法 / Detailed methodology |
| `hosts_scored.csv` | 最終スコア付きホストデータ / Final scored host data |
| `hosts.csv` | MCP補正前のホストデータ / Pre-MCP-refinement host data |
| `summary.json` | 統計サマリー / Statistical summary |
| `raw_checks.json` | 生チェック結果 / Raw check results |
| `x402scan_origins.json` | x402scanのorigin検出結果 / x402scan origin detection |
| `check_discoverability.py` | メインチェックスクリプト / Main check script |
| `analyze.py` | 分析スクリプト / Analysis script |
| `fetch_bazaar.py` | Bazaar取得スクリプト / Bazaar fetch script |
| `fetch_mcp_registry.py` | MCPレジストリ取得スクリプト / MCP Registry fetch script |
| `snapshot_sha256.txt` | 大容量ファイルのハッシュ / Hashes of large files |

---

## ライセンス / License

- **データおよびドキュメント** (`*.md`, `*.json`, `*.csv`, `*.txt`): [CC BY 4.0](LICENSE-DATA) (Creative Commons Attribution 4.0 International)
- **スクリプト** (`*.py`): [MIT License](LICENSE)

著作権者 / Copyright holder: KGNINJA

---

## 比較対象 / Comparison Group

上位50ホスト（Bazaar 30日間推定収益 = 呼び出し数 × 価格、自己購入を含む）との比較も行っています。詳細は`METHODOLOGY.md`および`summary.json`を参照してください。

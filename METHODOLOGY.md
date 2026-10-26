# x402 seller agent-discoverability snapshot survey (2026-10-26, JST)

**This repository is a record of the 2026-10-26 discoverability survey only, not a change history of KG's systems.**

Read-only, reproducible survey. No payments, signatures, logins, posts or contact were made.
Paid endpoints were called once WITHOUT payment; only the HTTP 402 challenge was read.

## 1. Population and snapshots
| Item | Value |
|---|---|
| Source | CDP Bazaar discovery API `https://api.cdp.coinbase.com/platform/v2/x402/discovery/resources` (paged, limit=1000) |
| Bazaar pull time | 2026-10-26 approx. 15:50-15:51 JST (file written 15:51:18 JST); API reported total 68,517, 68,511 items retrieved |
| Unit of analysis | distinct hostname of the listed `resource` URL |
| Population | **2,735 hosts** in the snapshot fetched on 2026-10-26 (68,511 of 68,517 resources the API reported, so not a complete census; no sampling within the snapshot) |
| Sub-population | top 50 hosts by 30-day estimated revenue (sum over the host's listings of Bazaar `quality.l30DaysTotalCalls` x listed USDC price; includes self-traffic, CDP facilitator only) |
| Sellers (distinct primary payTo) | 1,624 |
| MCP Registry snapshot | `registry.modelcontextprotocol.io/v0/servers` full pagination, 2026-10-26 approx. 16:05-16:18 JST, 180,194 entries (all versions), 36,806 distinct remote/website hosts |
| Host checks | 2026-10-26 16:02-16:06 JST |
| x402scan checks | 2026-10-26 16:06-16:40 JST, one `x402scan.com/recipient/<payTo>` page per payTo (1,856 payTo) |

Slim Bazaar snapshot (`bazaar_snapshot_slim_2026-10-26.json`, ~55 MB) and MCP Registry snapshot (`mcp_registry_snapshot.json`, ~194 MB) are **not included** in this repository due to size. SHA-256 hashes of the original snapshots used for this survey are recorded in `snapshot_sha256.txt`. Use the fetch scripts to regenerate fresh snapshots (which will differ from the hashed originals).

## 2. Signals (equal weight, 1 point each, score 0-9)
A "soft-404" probe (`/__x402_census_404_probe_7f3a`) is fetched first; a page whose body equals the soft-404 body never counts.
Timeouts 8 s per request, 0.3 s minimum gap per host, redirects followed, HTTPS only.

1. **llms_txt**: `GET /llms.txt` = 200, not HTML, >= 50 chars.
2. **a2a_card**: `/.well-known/agent-card.json` or `/.well-known/agent.json` = 200, valid JSON object with `name` and one of `skills`/`capabilities`/`url`.
3. **mcp_registry**: host, or its registrable domain (shared hosting suffixes like workers.dev / vercel.app are treated host-by-host), equals a `remotes[].url` or `websiteUrl` host in the MCP Registry snapshot; OR the host's llms.txt / agent card links to a host that is a registry remote. Generic domains (github.com, x.com, etc.) excluded. Domain-level matching is lenient (see limitations).
4. **x402_wellknown**: `/.well-known/x402` or `/.well-known/x402.json` = 200 with non-empty JSON.
5. **robots_txt**: `/robots.txt` = 200, not HTML, contains a `User-agent:` line.
6. **sitemap_xml**: `/sitemap.xml` (or first `Sitemap:` URL in robots.txt) = 200 and contains `<urlset` or `<sitemapindex`.
7. **live402_metadata**: the host's first Bazaar listing, called with the listed method / example body / path params and no payment, returns 402 whose challenge (v2 `PAYMENT-REQUIRED` header or JSON body) has a non-empty description AND an input/output schema (bazaar extension or `outputSchema`).
8. **x402scan_listed**: the host appears as an `origin` on the x402scan recipient page of any of its payTo addresses.
9. **verification_page_heuristic** (HEURISTIC): llms.txt / agent card links a URL whose path contains verification / test-results / audit-results / proof, OR one of `/verification-results`, `/verification`, `/test-results`, `/.well-known/verification.json` returns a non-soft-404 200 page (>200 chars) mentioning verif / test result / self-purchase / proof. It does not judge the quality or honesty of the page.

Percentiles: for a host with score s, "top X%" = (hosts with score >= s) / N. Ties are reported explicitly.

## 3. Results
Score distribution (all 2,735 hosts): 0:36, 1:282, 2:383, 3:364, 4:349, 5:316, 6:387, 7:289, 8:301, 9:28. Mean 4.43.
Top-50-revenue hosts: mean 5.08, max 8 (none scored 9).

| Signal | All hosts % | Top-50 revenue % |
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

KGNINJA hosts:
| Host | Score | Missing | vs all 2,735 | vs top-50 revenue |
|---|---|---|---|---|
| agent-economy.kgninja.dev | 9/9 | none | tied 1st with 27 others (28 hosts = top 1.0%) | above all 50 (their max is 8) |
| si.kgninja.dev | 8/9 | x402_wellknown | 28 higher, 301 tied (top 12.0%) | tied with the 9 best |
| api.kgninja.dev | 7/9 | a2a_card, verification | 329 higher, 289 tied (top 22.6%) | 9 higher, 8 tied |

Seller level (best host per payTo): KG's payTo is one of 24 sellers (of 1,624) whose best host scores 9.

Sensitivity:
- Without the heuristic verification signal (8 signals): agent-economy 8/8, tied with 306 others (top 11.2%).
- Without verification and MCP signals (7 signals): 7/7, tied with 360 others (top 13.2%).
- Direct MCP host/domain match only: 9/9, one of 25 (top 0.9%).

Score vs 30-day estimated revenue, Spearman rho = 0.30 (all hosts): weak positive. KG's hosts earned USD 0.01-0.06 estimated in the window, so a high score does not imply sales.

## 4. Limitations
- **Incomplete coverage**: The Bazaar API reported 68,517 resources, but only 68,511 were retrieved in this snapshot. This is not a complete census.
- Signal set and equal weights were chosen by the requester (KGNINJA). The rarest signal (verification page, 4.0%) is one KG built; the "top 1%" result depends on it (see sensitivity). Any public claim should state the 9 criteria.
- Bazaar only covers CDP-facilitator listings; sellers not on Bazaar are excluded.
- One request per check per host; transient errors count as "absent". Checks ran once on 2026-10-26.
- live402 tests only the first listing per host. Templated paths without example params were filled with `example`.
- MCP matching at registrable-domain level can credit a host for a sibling subdomain's server (e.g. api.kgninja.dev is credited via kgninja.dev).
- x402scan detection parses public HTML, not a documented API.
- Presence is measured, not quality, accuracy or freshness of the documents.

## 5. Reproduce
```
python3 fetch_bazaar.py            # writes bazaar.json (full pull); slim it to bazaar_snapshot_slim_2026-10-26.json
python3 fetch_mcp_registry.py      # writes mcp_registry_snapshot.json
python3 check_discoverability.py   # writes raw_checks.json, x402scan_origins.json, hosts.csv
python3 analyze.py                 # writes hosts_scored.csv (final), summary.json
```

**Note**: Large raw snapshots (`bazaar_snapshot_slim_2026-10-26.json` ~55 MB, `mcp_registry_snapshot.json` ~194 MB) are **not included** in this repository. SHA-256 hashes of the originals used for this survey are in `snapshot_sha256.txt`. Running the fetch scripts generates fresh snapshots, which will differ from the hashed originals.

Output files in this repository: `hosts_scored.csv` (final per-host data, authoritative), `hosts.csv` (pre-MCP-refinement), `raw_checks.json`, `x402scan_origins.json`, `summary.json`.

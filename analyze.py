#!/usr/bin/env python3
"""Scores hosts and computes prevalence / percentile ranks from hosts.csv + raw_checks.json + mcp_registry_snapshot.json."""
import csv, json, collections
from urllib.parse import urlparse
import check_discoverability as C

GENERIC = {'github.com','gitlab.com','npmjs.com','pypi.org','huggingface.co','x.com','twitter.com','google.com','notion.site','medium.com','linkedin.com','youtube.com','discord.gg','discord.com','t.me','smithery.ai','glama.ai','modelcontextprotocol.io'}
SIG = ['llms_txt','a2a_card','mcp_registry','x402_wellknown','robots_txt','sitemap_xml','live402_metadata','x402scan_listed','verification_page_heuristic']
KG = ['si.kgninja.dev','agent-economy.kgninja.dev','api.kgninja.dev']

rows = list(csv.DictReader(open('hosts.csv')))
raw = json.load(open('raw_checks.json'))
reg = json.load(open('mcp_registry_snapshot.json'))
mh, md = set(), set()
for s in reg:
    sv = s.get('server', s)
    for u in [r.get('url','') for r in (sv.get('remotes') or [])] + [sv.get('websiteUrl') or '']:
        h = (urlparse(u).hostname or '').lower()
        if h and C.regdom(h) not in GENERIC: mh.add(h); md.add(C.regdom(h))
for r in rows:
    o = raw.get(r['host'], {})
    r['mcp_registry_direct'] = int(r['host'] in mh or C.regdom(r['host']) in md)
    r['mcp_registry_linked'] = int(bool(set(o.get('_linked', [])) & mh))
    r['mcp_registry'] = int(r['mcp_registry_direct'] or r['mcp_registry_linked'])
    for s in SIG: r[s] = int(r[s])
    r['score'] = sum(r[s] for s in SIG); r['rev30_est_usd'] = float(r['rev30_est_usd']); r['reachable'] = int(r['reachable'])
with open('hosts_scored.csv','w',newline='') as fh:
    w = csv.DictWriter(fh, list(rows[0].keys())); w.writeheader(); w.writerows(rows)

def pct(pop, sc):
    n = len(pop); lo = sum(1 for r in pop if r['score'] < sc); eq = sum(1 for r in pop if r['score'] == sc); hi = n - lo - eq
    return dict(n=n, lower=lo, equal=eq, higher=hi, pct_strictly_below=round(100*lo/n,1), top_pct=round(100*(hi+eq)/n,1), rank_best=hi+1)
def prev(pop): return {s: round(100*sum(r[s] for r in pop)/len(pop),1) for s in SIG}
def dist(pop): return dict(sorted(collections.Counter(r['score'] for r in pop).items()))

allh = rows
reach = [r for r in rows if r['reachable']]
top50 = sorted(rows, key=lambda r: -r['rev30_est_usd'])[:50]
out = dict(registry_entries=len(reg), mcp_hosts=len(mh), population=len(allh), reachable=len(reach))
for name, pop in [('all', allh), ('reachable', reach), ('top50_revenue', top50)]:
    out[name] = dict(prevalence=prev(pop), score_dist=dist(pop), mean=round(sum(r['score'] for r in pop)/len(pop),2))
by = {r['host']: r for r in rows}
out['kg'] = {}
for h in KG:
    r = by[h]
    out['kg'][h] = dict(score=r['score'], signals={s: r[s] for s in SIG}, rev30=r['rev30_est_usd'],
                        vs_all=pct(allh, r['score']), vs_reachable=pct(reach, r['score']), vs_top50=pct(top50, r['score']))
# Spearman rank correlation score vs revenue (all hosts)
def ranks(v):
    o = sorted(range(len(v)), key=lambda i: v[i]); rk = [0]*len(v); i = 0
    while i < len(o):
        j = i
        while j+1 < len(o) and v[o[j+1]] == v[o[i]]: j += 1
        for k in range(i, j+1): rk[o[k]] = (i+j)/2
        i = j+1
    return rk
def spearman(a, b):
    ra, rb = ranks(a), ranks(b); n = len(a); ma, mb = sum(ra)/n, sum(rb)/n
    num = sum((x-ma)*(y-mb) for x, y in zip(ra, rb)); den = (sum((x-ma)**2 for x in ra)*sum((y-mb)**2 for y in rb))**0.5
    return round(num/den, 3)
out['spearman_score_rev_all'] = spearman([r['score'] for r in allh], [r['rev30_est_usd'] for r in allh])
out['spearman_score_rev_reachable'] = spearman([r['score'] for r in reach], [r['rev30_est_usd'] for r in reach])
mx = max(r['score'] for r in rows)
out['max_score'] = mx; out['hosts_at_max'] = [r['host'] for r in rows if r['score'] == mx][:40]
out['top50_list'] = [(r['host'], round(r['rev30_est_usd'],2), r['score']) for r in top50]
json.dump(out, open('summary.json','w'), indent=1, ensure_ascii=False)
print(json.dumps({k: v for k, v in out.items() if k != 'top50_list'}, indent=1, ensure_ascii=False))

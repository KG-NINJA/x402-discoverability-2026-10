#!/usr/bin/env python3
"""x402 seller discoverability census (read-only).
Inputs : bazaar_snapshot_slim_2026-10-26.json (full CDP Bazaar discovery pull)
         mcp_registry_snapshot.json       (full official MCP Registry pull)
Output : hosts.csv (one row per host, all signals + score)
No payments, no auth, no writes. Only unauthenticated GET/POST requests that a
discovery crawler would make; paid endpoints are called WITHOUT payment and only
the 402 challenge is read.
"""
import json, csv, re, sys, time, base64, random, collections, concurrent.futures as cf
from urllib.parse import urlparse
import requests

UA = 'x402-discoverability-study/1.0 (read-only census; no payment)'
TO = 8           # seconds per request
GAP = 0.3        # seconds between requests to the same host
WORKERS = 48
USDC = {'0x833589fcd6edb6e08f4c7c32d4f71b54bda02913', 'epjfwdd5aufqssqem2qn1xzybapc8g4wegkzwytdt1v'}
SHARED = ('workers.dev','vercel.app','netlify.app','onrender.com','railway.app','herokuapp.com','pages.dev',
          'fly.dev','github.io','replit.app','replit.dev','deno.dev','modal.run','ngrok-free.app','ngrok.app',
          'trycloudflare.com','azurewebsites.net','cloudfunctions.net','run.app','amplifyapp.com','web.app',
          'firebaseapp.com','supabase.co','render.com','koyeb.app','up.railway.app','glitch.me','repl.co','lovable.app')

def regdom(h):
    h = (h or '').lower()
    for s in SHARED:
        if h == s or h.endswith('.'+s): return h   # shared suffix: whole host is the "domain"
    p = h.split('.')
    if len(p) >= 3 and len(p[-1]) == 2 and p[-2] in ('co','com','ne','or','ac','go','org','net'): return '.'.join(p[-3:])
    return '.'.join(p[-2:])

def load_population():
    it = json.load(open('bazaar_snapshot_slim_2026-10-26.json'))
    H = collections.OrderedDict()
    for x in it:
        h = (urlparse(x['resource']).hostname or '').lower()
        if not h: continue
        d = H.setdefault(h, dict(host=h, endpoints=0, rev30=0.0, calls30=0, max_payers=0, payTo=collections.Counter(), first=None))
        d['endpoints'] += 1
        a = (x.get('accepts') or [{}])[0]; q = x.get('quality') or {}
        try: amt = int(a.get('amount') or a.get('maxAmountRequired') or 0) / 1e6
        except Exception: amt = 0
        usdc = (a.get('asset') or '').lower() in USDC
        c = q.get('l30DaysTotalCalls') or 0
        if usdc and amt < 100000: d['rev30'] += c * amt
        d['calls30'] += c; d['max_payers'] = max(d['max_payers'], q.get('l30DaysUniquePayers') or 0)
        if a.get('payTo'): d['payTo'][a['payTo']] += 1
        if d['first'] is None: d['first'] = x
    return H

def mcp_index():
    reg = json.load(open('mcp_registry_snapshot.json'))
    hosts, doms = set(), set()
    for s in reg:
        sv = s.get('server', s)
        urls = [r.get('url','') for r in (sv.get('remotes') or [])] + [sv.get('websiteUrl') or '']
        for u in urls:
            h = (urlparse(u).hostname or '').lower()
            if h: hosts.add(h); doms.add(regdom(h))
    return hosts, doms

class Sess:
    def __init__(s, host): s.h = host; s.r = requests.Session(); s.r.headers['User-Agent'] = UA; s.t = 0; s.dead = False
    def get(s, path, method='GET', **kw):
        if s.dead: return None
        dt = time.time() - s.t
        if dt < GAP: time.sleep(GAP - dt)
        s.t = time.time()
        try:
            r = s.r.request(method, path if path.startswith('http') else f'https://{s.h}{path}', timeout=TO, allow_redirects=True, stream=True, **kw)
            body = r.raw.read(512*1024, decode_content=True); r._content = body; return r
        except requests.exceptions.ConnectionError as e:
            if path == '/__x402_census_404_probe_7f3a': s.dead = True
            return None
        except Exception: return None

def txt(r):
    try: return r.content.decode('utf-8', 'replace')
    except Exception: return ''
def is_html(t): t = t.lstrip()[:200].lower(); return t.startswith('<!doctype') or t.startswith('<html') or '<head' in t
def ok(r, soft): return r is not None and r.status_code == 200 and (soft is None or txt(r).strip() != soft)
def jparse(r):
    try: return json.loads(txt(r))
    except Exception: return None

def live402(S, ep):
    info = ((ep.get('extensions') or {}).get('bazaar') or {}).get('info') or {}
    inp = info.get('input') or {}
    method = (inp.get('method') or 'GET').upper()
    pp = inp.get('pathParams') if isinstance(inp.get('pathParams'), dict) else {}
    url = re.sub(r'/:([A-Za-z_]+)', lambda m: '/' + str(pp.get(m.group(1), 'example')), ep['resource'])
    kw = {}
    if method in ('POST','PUT','PATCH'):
        b = inp.get('body')
        kw['json'] = b if isinstance(b, (dict, list)) else {}
    elif inp.get('queryParams'):
        kw['params'] = {k: (v if isinstance(v, str) else json.dumps(v)) for k, v in inp['queryParams'].items()} if isinstance(inp['queryParams'], dict) else None
    r = S.get(url, method, **kw)
    res = dict(live402_status=r.status_code if r is not None else 'err', live402_desc=0, live402_schema=0)
    if r is None or r.status_code != 402: return res
    pr = None
    hv = r.headers.get('payment-required') or r.headers.get('PAYMENT-REQUIRED')
    if hv:
        try: pr = json.loads(base64.b64decode(hv + '==='))
        except Exception: pr = None
    if pr is None: pr = jparse(r)
    if not isinstance(pr, dict): return res
    acc = pr.get('accepts') or []
    acc0 = acc[0] if acc and isinstance(acc[0], dict) else {}
    desc = ((pr.get('resource') or {}).get('description') if isinstance(pr.get('resource'), dict) else None) or acc0.get('description')
    bz = (pr.get('extensions') or {}).get('bazaar') or {}
    schema = bool(bz.get('schema') or (bz.get('info') or {}).get('output') or (bz.get('info') or {}).get('input') or acc0.get('outputSchema') or (acc0.get('extra') or {}).get('outputSchema'))
    res['live402_desc'] = int(bool(desc and str(desc).strip())); res['live402_schema'] = int(schema)
    return res

VER_PATHS = ['/verification-results', '/verification', '/test-results', '/.well-known/verification.json']
VER_RE = re.compile(r'https?://[^\s)\]"\'<>]+/(?:[^\s)\]"\'<>]*?)(verification|test-results|test_results|audit-results|proof)[^\s)\]"\'<>]*', re.I)

def check(d, mcp_hosts, mcp_doms):
    h = d['host']; S = Sess(h); o = dict(host=h)
    soft = S.get('/__x402_census_404_probe_7f3a')
    soft_t = txt(soft).strip() if (soft is not None and soft.status_code == 200) else None
    o['reachable'] = int(not S.dead)
    o['soft404'] = int(soft_t is not None)
    r = S.get('/llms.txt'); t = txt(r) if r is not None else ''
    o['llms_txt'] = int(ok(r, soft_t) and not is_html(t) and len(t.strip()) >= 50); llms = t if o['llms_txt'] else ''
    card = ''
    o['a2a_card'] = 0
    for p in ('/.well-known/agent-card.json', '/.well-known/agent.json'):
        r = S.get(p); j = jparse(r) if ok(r, soft_t) else None
        if isinstance(j, dict) and j.get('name') and (j.get('skills') is not None or j.get('capabilities') is not None or j.get('url')):
            o['a2a_card'] = 1; card = txt(r); break
    o['x402_wellknown'] = 0
    for p in ('/.well-known/x402', '/.well-known/x402.json'):
        r = S.get(p); j = jparse(r) if ok(r, soft_t) else None
        if isinstance(j, (dict, list)) and j: o['x402_wellknown'] = 1; break
    r = S.get('/robots.txt'); t = txt(r) if r is not None else ''
    o['robots_txt'] = int(ok(r, soft_t) and not is_html(t) and re.search(r'(?im)^\s*user-agent\s*:', t) is not None)
    robots = t if o['robots_txt'] else ''
    r = S.get('/sitemap.xml'); t = txt(r) if r is not None else ''
    sm = ok(r, soft_t) and ('<urlset' in t or '<sitemapindex' in t)
    if not sm:
        m = re.search(r'(?im)^\s*sitemap\s*:\s*(\S+)', robots)
        if m:
            r = S.get(m.group(1)); t = txt(r) if r is not None else ''
            sm = r is not None and r.status_code == 200 and ('<urlset' in t or '<sitemapindex' in t)
    o['sitemap_xml'] = int(bool(sm))
    # MCP Registry: host or registrable domain is a registered remote/website, or host's llms.txt / agent card links a registry-listed remote host
    linked = {(urlparse(u).hostname or '').lower() for u in re.findall(r'https?://[^\s)\]"\'<>]+', llms + card)}
    o['_linked'] = sorted(x for x in linked if x)
    o.update(live402(S, d['first']))
    o['live402_metadata'] = int(o['live402_status'] == 402 and o['live402_desc'] and o['live402_schema'])
    # verification page (heuristic)
    v = 0
    if VER_RE.search(llms + card): v = 1
    else:
        for p in VER_PATHS:
            r = S.get(p); t = txt(r) if r is not None else ''
            if ok(r, soft_t) and len(t.strip()) > 200 and re.search(r'verif|test result|self-purchase|proof', t, re.I): v = 1; break
    o['verification_page_heuristic'] = v
    return o

def x402scan_origins(payto):
    try:
        r = requests.get(f'https://www.x402scan.com/recipient/{payto}', headers={'User-Agent': UA}, timeout=30)
        return {(urlparse(u).hostname or '').lower() for u in re.findall(r'\\"origin\\":\\"(https?://[^\\"]+)', r.text)}
    except Exception: return None

if __name__ == '__main__':
    H = load_population()
    mh, md = set(), set()
    print('hosts', len(H), flush=True)
    rows = {}
    with cf.ThreadPoolExecutor(WORKERS) as ex:
        fut = {ex.submit(check, d, mh, md): h for h, d in H.items()}
        for i, f in enumerate(cf.as_completed(fut)):
            h = fut[f]
            try: rows[h] = f.result()
            except Exception as e: rows[h] = dict(host=h, reachable=0, error=str(e)[:100])
            if i % 100 == 0: print(i, time.strftime('%H:%M:%S'), flush=True)
    # x402scan: one recipient page per payTo (sequential, 0.5 s apart)
    paytos = sorted({p for d in H.values() for p in d['payTo']})
    origins = {}
    for i, p in enumerate(paytos):
        origins[p] = x402scan_origins(p); time.sleep(0.5)
        if i % 200 == 0: print('x402scan', i, len(paytos), flush=True)
    json.dump({k: sorted(v) if v is not None else None for k, v in origins.items()}, open('x402scan_origins.json', 'w'))
    json.dump(rows, open('raw_checks.json', 'w'))
    while True:   # MCP Registry snapshot is fetched in parallel by fetch_mcp_registry.py
        try: mh, md = mcp_index(); break
        except FileNotFoundError: time.sleep(10)
    for h, o in rows.items():
        o['mcp_registry_direct'] = int(h in mh or regdom(h) in md)
        o['mcp_registry_linked'] = int(bool(set(o.get('_linked', [])) & mh))
        o['mcp_registry'] = int(o['mcp_registry_direct'] or o['mcp_registry_linked'])
    SIG = ['llms_txt','a2a_card','mcp_registry','x402_wellknown','robots_txt','sitemap_xml','live402_metadata','x402scan_listed','verification_page_heuristic']
    cols = ['host','payTo_primary','bazaar_endpoints','rev30_est_usd','calls30','max_payers_endpoint','reachable','soft404'] + SIG + ['score','mcp_registry_direct','mcp_registry_linked','live402_status','live402_desc','live402_schema']
    with open('hosts.csv', 'w', newline='') as fh:
        w = csv.DictWriter(fh, cols, extrasaction='ignore'); w.writeheader()
        for h, d in H.items():
            o = rows.get(h, {})
            pt = d['payTo'].most_common(1)[0][0] if d['payTo'] else ''
            og = set().union(*[origins.get(p) or set() for p in d['payTo']]) if d['payTo'] else set()
            o['x402scan_listed'] = int(h in og)
            for s in SIG: o[s] = int(o.get(s, 0) or 0)
            o['score'] = sum(o[s] for s in SIG)
            o.update(host=h, payTo_primary=pt, bazaar_endpoints=d['endpoints'], rev30_est_usd=round(d['rev30'], 4), calls30=d['calls30'], max_payers_endpoint=d['max_payers'])
            w.writerow(o)
    print('done', flush=True)

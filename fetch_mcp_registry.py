# Downloads the full official MCP Registry (registry.modelcontextprotocol.io) server list.
import json,urllib.request,urllib.parse,time,sys
out=[];cur=None;seen=set();page=0
while True:
    u='https://registry.modelcontextprotocol.io/v0/servers?limit=100'+('&cursor='+urllib.parse.quote(cur) if cur else '')
    d=json.load(urllib.request.urlopen(urllib.request.Request(u,headers={'user-agent':'x402-discoverability-study/1.0'}),timeout=60))
    out+=d.get('servers',[]); cur=(d.get('metadata') or {}).get('nextCursor'); page+=1
    if page%20==0: print(page,len(out),cur,flush=True)
    if not cur or cur in seen: break
    seen.add(cur); time.sleep(0.1)
json.dump(out,open('mcp_registry_snapshot.json','w'))
print('total',len(out),flush=True)

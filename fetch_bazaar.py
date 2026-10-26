import json,urllib.request,time,sys
items=[];off=0;lim=1000
while True:
    u=f"https://api.cdp.coinbase.com/platform/v2/x402/discovery/resources?limit={lim}&offset={off}"
    for i in range(4):
        try: d=json.load(urllib.request.urlopen(urllib.request.Request(u,headers={'user-agent':'curl/8'}),timeout=60));break
        except Exception as e: print('err',e,file=sys.stderr);time.sleep(3)
    it=d.get('items',[]); items+=it
    if off==0: print({k:v for k,v in d.items() if k!='items'},file=sys.stderr)
    if len(it)<lim: break
    off+=lim
json.dump(items,open('bazaar.json','w'))  # full CDP Bazaar pull
print(len(items))

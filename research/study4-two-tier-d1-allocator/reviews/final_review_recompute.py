# Independent recomputation of every chained Δ and the PROTOCOL §12 criteria from the sealed evaluation record,
# written by the final independent reviewer (reviews/FINAL_REVIEW.md), saved verbatim below this header.
# Reads only results/evaluation/RECORD.json. Run from the results directory:
#   cd research/study4-two-tier-d1-allocator/results && python3 -I ../reviews/final_review_recompute.py
import json, statistics
j=json.load(open('evaluation/RECORD.json'))
b5y=j['b5']['years']; Y=['2020','2021','2022','2023']
R=j['results']
def q(vals,p):
    s=sorted(vals); 
    if not s: return float('nan')
    pos=(len(s)-1)*p; lo=int(pos); hi=min(lo+1,len(s)-1)
    return s[lo]+(s[hi]-s[lo])*(pos-lo)
def rankavg(v):
    o=sorted(range(len(v)),key=lambda i:v[i]); r=[0]*len(v); i=0
    while i<len(o):
        k=i
        while k+1<len(o) and v[o[k+1]]==v[o[i]]: k+=1
        for m in range(i,k+1): r[o[m]]=(i+k)/2
        i=k+1
    return r
def pearson(a,b):
    n=len(a); ma=sum(a)/n; mb=sum(b)/n
    num=sum((x-ma)*(y-mb) for x,y in zip(a,b)); da=sum((x-ma)**2 for x in a); db=sum((y-mb)**2 for y in b)
    return num/(da*db)**.5 if da>0 and db>0 else float('nan')
def sp(a,b): return pearson(rankavg(a),rankavg(b))
def rankord(v):
    o=sorted(range(len(v)),key=lambda i:v[i]); r=[0]*len(v)
    for p,i in enumerate(o): r[i]=p
    return r
mine={}
for e,r in R.items():
    c=r['chained']
    d={y:c['years'][y]-b5y[y] for y in Y}; S=sum(d.values())
    assert all(abs(d[y]-c['delta'][y])<1e-6 for y in Y), e
    assert abs(S-c['sumDelta'])<1e-6
    # E1
    E1 = S>=20000 and all(v>=-10000 for v in d.values()) and sum(v>0 for v in d.values())>=3
    # E3 
    mdd=c['minuteDD']['maximum']; b5m=j['b5']['minuteDD']['maximum']; ddd=c['dailyDD']['maximum']
    E3 = mdd<=35000 and mdd<=b5m+5000 and ddd<=30000
    # E2 recompute from b5Trades
    b5lots={ (l['bookId'],l['tradeId']):l for l in j['b5']['lots']}
    prof=[t for t in c['b5Trades'] if b5lots[(t['bookId'],t['tradeId'])]['net']>0]
    P=sum(b5lots[(t['bookId'],t['tradeId'])]['net'] for t in prof)
    cw=sum(t['status'] in('exact','delayed') for t in prof)/len(prof)
    pw=sum(min(t['candidateNet'],b5lots[(t['bookId'],t['tradeId'])]['net']) for t in prof if t['status'] in ('exact','delayed'))/P
    top10=sorted(prof,key=lambda t:-b5lots[(t['bookId'],t['tradeId'])]['net'])[:10]
    topmissed=sum(t['status']=='missed' for t in top10)
    frozen = e in ('4B','4C','4D-A','4D-A0P')
    p=c['preservation']
    E2 = ((pw>=0.9 and cw>=0.85) if frozen else p['retention']>=0.75) and topmissed==0
    # E9 from lots
    sl=[l for l in c['lots'] if l['tier']=='shallow']
    yrs=set(l['entryDate'][:4] for l in sl)
    twoTier=len(sl)>0
    E9 = twoTier and len(sl)>=8 and len(yrs)>=3
    sby={y:sum(l['net'] for l in sl if l['entryDate'].startswith(y)) for y in Y}
    # E5 from rows
    rows=[x for x in r['perturbations']['rows'] if not x['ablation']]
    ev=[x['evalDelta'] for x in rows]
    share=sum(v>0 for v in ev)/len(ev) if ev else 0; med=q(ev,.5)
    E5 = share>=0.6 and med>0
    # E6
    ctrl={'4D-B':'4D-B0','4D-C':'4D-C0'}.get(e)
    e6a = (not twoTier) or sum(v>0 for v in sby.values())>=3
    e6b = True; marg=None
    if ctrl:
        cc=R[ctrl]['chained']; marg={y:d[y]-cc['delta'][y] for y in Y}
        e6b = S-cc['sumDelta']>=10000 and sum(v>0 for v in marg.values())>=3
    e6c = (S-r['ablations']['shallowOff']['sumDelta']>=10000) if e in ('4D-B','4D-C') else True
    E6=e6a and e6b and e6c
    E7 = r['costs']['0.14/10']>0
    E7b = all((r['stresses'][k] or -1e18)>0 for k in ('latency300','stopSlippage25','stopNextOpen'))
    # E8 (use record's paired figures; recheck shares)
    mys = max(d.values())/S if S>0 else None
    E8 = S-c['largestPaired']>0 and S-c['largestCluster']>0 and (mys if mys is not None else 9)<=0.7 and (c['maxSymbolShare'] if c['maxSymbolShare'] is not None else 9)<=0.7
    E10 = c['attribution']['idleClean']['net']>0 and c['attribution']['idleClean']['net']>=0.5*S
    p75=q(r['null']['sums'],.75)
    sk=r['skill']['rows']; best=[x for x in sk if x['set']=='best']; allr=sk
    rho_best_avg=sp([x['devDelta'] for x in best],[x['evalDelta'] for x in best])
    rho_best_ord=pearson(rankord([x['devDelta'] for x in best]),rankord([x['evalDelta'] for x in best]))
    rho_all=sp([x['devDelta'] for x in allr],[x['evalDelta'] for x in allr])
    ties=len(best)-len(set(x['evalDelta'] for x in best))
    E11 = S>=p75 and r['skill']['spearmanBest']>0
    E11alt = S>=p75 and rho_all>0
    crit=dict(E1=E1,E2=E2,E3=E3,E5=E5,E6=E6,E7=E7,E7b=E7b,E8=E8,E9=E9,E10=E10,E11=E11)
    lab='risk-incompatible' if not E3 else 'no demonstrated incremental benefit' if not E1 else 'descriptive improvement but insufficient evidence'
    rec=j['rubric'][e]
    diffs={k:(v,rec['criteria'][k]) for k,v in crit.items() if rec['criteria'][k]!=v}
    print(f"{e:7s} d={[round(d[y]) for y in Y]} S={S:,.0f} mDD={mdd:,.0f} dDD={ddd:,.0f} cw={cw:.4f} pw={pw:.4f} top10missed={topmissed} recTop={p['topMissed']} shallow={len(sl)}/{sorted(yrs)} share={share:.3f} med={med:,.0f} p75={p75:,.0f} recp75={r['null']['p75']:,.0f} rho_rec={r['skill']['spearmanBest']:.3f} rho_bestTieAvg={rho_best_avg:.3f} rho_bestOrd={rho_best_ord:.3f} rho_all={rho_all:.3f} tiesBest={ties}/{len(best)} label={lab} rec={rec['label']} diffs={diffs} E11alt={E11alt} ctrlMargin={ {k:round(v) for k,v in marg.items()} if marg else None} vsShallowOff={S-r['ablations']['shallowOff']['sumDelta']:,.0f}")
    assert abs(cw-p['countWeighted'])<1e-9 and abs(pw-p['pnlWeighted'])<1e-9, (e,cw,pw,p)
print('4D-A minus 4D-A0P', R['4D-A']['chained']['sumDelta']-R['4D-A0P']['chained']['sumDelta'])

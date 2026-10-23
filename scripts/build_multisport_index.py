#!/usr/bin/env python3
"""Lightweight multisport event index; football retains its existing history index."""
import json,os
from collections import defaultdict
from datetime import datetime
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]

def season(event):
    dt=datetime.fromisoformat(event["utcDate"].replace("Z","+00:00"))
    if event["sport"]=="Formule 1":
        return str(dt.year) # F1 championship is calendar-year based.
    start=dt.year-(dt.month<7)
    return f"{start}-{start+1}" # Basketball season inferred; verify league calendars individually.

def build(events):
    groups=defaultdict(lambda:defaultdict(lambda:defaultdict(set)))
    for e in events:
        if not isinstance(e,dict) or not all(e.get(k) for k in ("id","sport","competition","utcDate")):
            continue
        try: groups[e["sport"]][season(e)][e["competition"]].add(e["id"])
        except (ValueError,TypeError,KeyError):continue
    sports={}
    for sport in sorted(groups):
        seasons={}
        for year in sorted(groups[sport]):
            comps={}
            for comp in sorted(groups[sport][year]):
                ids=sorted(groups[sport][year][comp])
                comps[comp]={"count":len(ids),"eventIds":ids}
            seasons[year]={"count":sum(c["count"] for c in comps.values()),"competitions":comps}
        sports[sport]={"count":sum(s["count"] for s in seasons.values()),"seasons":seasons}
    return {"schemaVersion":1,"source":"SportPulseMultiSport","totalEvents":sum(x["count"] for x in sports.values()),"sports":sports,"seasonRule":{"Formule 1":"calendar year","Basketball":"July–June inferred; not official season metadata"}}

def collect(root=ROOT):
    src=root/"data/multisport_history.json"
    dst=root/"data/multisport_index.json"
    payload=json.loads(src.read_text(encoding="utf-8"))
    if payload.get("source")!="SportPulseMultiSport" or not isinstance(payload.get("events"),list):
        raise ValueError("Unrecognized multisport archive")
    index=build(payload["events"])
    if dst.exists() and json.loads(dst.read_text(encoding="utf-8"))==index:
        return False,index["totalEvents"]
    tmp=dst.with_suffix(".tmp")
    tmp.write_text(json.dumps(index,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    os.replace(tmp,dst)
    return True,index["totalEvents"]

if __name__=="__main__":
    print("Multisport index:",collect())

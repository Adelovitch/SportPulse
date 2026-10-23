#!/usr/bin/env python3
"""Build a deterministic season/competition index without changing history.json."""
import json
import os
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/"data/history.json"
OUTPUT=ROOT/"data/history_index.json"

def season_for(date_string):
    """European football season heuristic: July through June; not a provider season ID."""
    date=datetime.fromisoformat(date_string.replace("Z","+00:00"))
    start=date.year if date.month>=7 else date.year-1
    return f"{start}-{start+1}"

def build(matches):
    groups=defaultdict(lambda:defaultdict(list))
    for m in matches:
        if not isinstance(m,dict) or not m.get("id") or not m.get("competition"):
            continue
        try:
            season=season_for(m["utcDate"])
        except (ValueError,TypeError,KeyError):
            continue
        groups[season][m["competition"]].append(m["id"])
    seasons={}
    for season in sorted(groups):
        competitions={}
        for league in sorted(groups[season]):
            ids=sorted(set(groups[season][league]))
            competitions[league]={"count":len(ids),"matchIds":ids}
        seasons[season]={"count":sum(x["count"] for x in competitions.values()),"competitions":competitions}
    return {"schemaVersion":1,"source":"SportPulse","seasonRule":"July–June (inferred from match date; not official for all competitions)","totalMatches":sum(s["count"] for s in seasons.values()),"seasons":seasons}

def create(root=ROOT):
    src=root/"data/history.json"
    dest=root/"data/history_index.json"
    history=json.loads(src.read_text(encoding="utf-8"))
    if history.get("source")!="SportPulse" or not isinstance(history.get("matches"),list):
        raise ValueError("Invalid history source: index not replaced")
    result=build(history["matches"])
    if dest.exists():
        previous=json.loads(dest.read_text(encoding="utf-8"))
        if previous==result:
            return False,result
    dest.parent.mkdir(parents=True,exist_ok=True)
    tmp=dest.with_suffix(".tmp")
    tmp.write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    os.replace(tmp,dest)
    return True,result

if __name__=="__main__":
    changed,data=create()
    print("History season index:",data["totalMatches"],"results,",len(data["seasons"]),"seasons; changed:",changed)

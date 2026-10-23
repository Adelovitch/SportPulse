#!/usr/bin/env python3
"""Persist verified basketball results and F1 classifications alongside football history."""
import json,os,re
from datetime import datetime,timezone
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SCORE=re.compile(r"^\d+\s*[–-]\s*\d+$")

def verified(m):
    if not isinstance(m,dict) or not all(isinstance(m.get(k),str) and m[k].strip() for k in ("id","sport","competition","utcDate")):
        return False
    if m.get("status")!="FINISHED":return False
    try:
        if datetime.fromisoformat(m["utcDate"].replace("Z","+00:00")).year<1950:return False
    except ValueError:return False
    if m["sport"]=="Basketball":
        return all(m.get(k) for k in ("home","away")) and isinstance(m.get("score"),str) and bool(SCORE.fullmatch(m["score"]))
    if m["sport"]=="Formule 1":
        return m.get("eventType")=="race" and isinstance(m.get("classification"),list) and bool(m["classification"]) and any(x.get("position")=="1" and x.get("driverId") for x in m["classification"] if isinstance(x,dict))
    return False

def merge(old,new):
    out={m["id"]:m for m in old if verified(m)}
    for m in new:
        if not verified(m):continue
        if m["id"] in out and any(out[m["id"]].get(k)!=m.get(k) for k in ("sport","competition")):continue
        out[m["id"]]=m
    return sorted(out.values(),key=lambda m:(m["utcDate"],m["id"]))

def collect(root=ROOT):
    source=root/"data/extras.json";dest=root/"data/multisport_history.json"
    snap=json.loads(source.read_text(encoding="utf-8"))
    if snap.get("source")!="SportPulseExtras" or not isinstance(snap.get("matches"),list):raise ValueError("Invalid extras snapshot")
    previous=json.loads(dest.read_text(encoding="utf-8")) if dest.exists() else {"schemaVersion":1,"source":"SportPulseMultiSport","events":[]}
    if previous.get("schemaVersion")!=1 or previous.get("source")!="SportPulseMultiSport" or not isinstance(previous.get("events"),list):raise ValueError("Invalid archive")
    events=merge(previous["events"],snap["matches"])
    if events==previous["events"]:return False,len(events)
    payload={"schemaVersion":1,"source":"SportPulseMultiSport","updatedAt":datetime.now(timezone.utc).isoformat().replace("+00:00","Z"),"events":events}
    dest.parent.mkdir(parents=True,exist_ok=True)
    tmp=dest.with_suffix(".tmp");tmp.write_text(json.dumps(payload,ensure_ascii=False,indent=2)+"\n",encoding="utf-8");os.replace(tmp,dest)
    return True,len(events)

if __name__=="__main__":
    print("Multisport archive:",collect())

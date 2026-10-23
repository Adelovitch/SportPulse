#!/usr/bin/env python3
"""Append validated, finished football results to a persistent static archive."""
import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCES = (ROOT/"data/matches.json", ROOT/"data/football_data.json")
OUTPUT = ROOT/"data/history.json"
SCORE = re.compile(r"^(\d+)\s*[–-]\s*(\d+)$")

def valid_match(m):
    if not isinstance(m, dict) or m.get("sport") != "Football" or m.get("status") != "FINISHED":
        return False
    if not all(isinstance(m.get(k),str) and m[k].strip() for k in ("id","competition","home","away","utcDate")):
        return False
    if not isinstance(m.get("score"),str) or not SCORE.fullmatch(m["score"].strip()):
        return False
    try:
        date=datetime.fromisoformat(m["utcDate"].replace("Z","+00:00"))
        return date.tzinfo is not None
    except ValueError:
        return False

def merge(existing, snapshots):
    result={m["id"]:m for m in existing if valid_match(m)}
    for snapshot in snapshots:
        for m in snapshot:
            if not valid_match(m):
                continue
            old=result.get(m["id"])
            # An existing ID should not silently switch teams or competition.
            if old and any(old.get(k)!=m.get(k) for k in ("competition","home","away")):
                continue
            result[m["id"]]=m
    return sorted(result.values(),key=lambda m:(m["utcDate"],m["id"]))

def read_json(path):
    if not path.is_file():
        return None
    return json.loads(path.read_text(encoding="utf-8"))

def collect(root=ROOT):
    archive=root/"data/history.json"
    old=read_json(archive)
    if old is not None and (not isinstance(old,dict) or old.get("schemaVersion")!=1 or not isinstance(old.get("matches"),list)):
        raise ValueError("Invalid history format: preserve existing archive")
    feeds=[]
    for name,expected in (("matches.json","OpenLigaDB"),("football_data.json","football-data.org")):
        item=read_json(root/"data"/name)
        if item is None:
            continue
        if not isinstance(item,dict) or item.get("source")!=expected or not isinstance(item.get("matches"),list):
            raise ValueError("Unexpected source format: "+name)
        feeds.append(item["matches"])
    if not feeds:
        raise RuntimeError("No source snapshots available; keep last archive")
    matches=merge(old["matches"] if old else [],feeds)
    previous=old["matches"] if old else []
    if matches==previous:
        return False,len(matches)
    archive.parent.mkdir(parents=True,exist_ok=True)
    payload={"schemaVersion":1,"source":"SportPulse","updatedAt":datetime.now(timezone.utc).isoformat().replace("+00:00","Z"),"matches":matches}
    temp=archive.with_suffix(".tmp")
    temp.write_text(json.dumps(payload,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    os.replace(temp,archive)
    return True,len(matches)

if __name__=="__main__":
    changed,count=collect()
    print("Historical football results:",count,"changed:",changed)

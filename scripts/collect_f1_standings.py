#!/usr/bin/env python3
"""Retrieve official F1 driver/constructor standings from Jolpica. No estimates."""
import json,os
from datetime import datetime,timezone
from pathlib import Path
from urllib.request import Request,urlopen

OUTPUT=Path(__file__).resolve().parents[1]/"data"/"f1_standings.json"
BASE="https://api.jolpi.ca/ergast/f1"

def fetch(url):
    with urlopen(Request(url,headers={"User-Agent":"SportPulse/1.5","Accept":"application/json"}),timeout=25) as response:return json.load(response)

def normalize_rows(payload,kind):
    lists=payload.get("MRData",{}).get("StandingsTable",{}).get("StandingsLists",[])
    if not lists:return []
    rows=lists[0].get(kind+"Standings",[])
    result=[]
    for row in rows:
        person=row.get("Driver" if kind=="Driver" else "Constructor") or {}
        name=(str(person.get("givenName",""))+" "+str(person.get("familyName",""))).strip() if kind=="Driver" else person.get("name","")
        if not name or not row.get("position"):continue
        result.append({"position":str(row["position"]),"name":name,"points":str(row.get("points","")),"wins":str(row.get("wins","")),"team":", ".join(c.get("name","") for c in row.get("Constructors",[]) if c.get("name")) if kind=="Driver" else None})
    return result

def collect(now=None,get=fetch):
    now=now or datetime.now(timezone.utc)
    season=now.year
    out={"source":"Jolpica-F1","season":season,"updatedAt":now.isoformat().replace("+00:00","Z"),"drivers":[],"constructors":[],"warnings":[]}
    for kind,label in (("Driver","drivers"),("Constructor","constructors")):
        try:out[label]=normalize_rows(get(f"{BASE}/{season}/{kind.lower()}standings/?limit=100"),kind)
        except Exception as exc:out["warnings"].append(label+": "+type(exc).__name__)
    if not out["drivers"] and not out["constructors"]:raise RuntimeError("No standings returned; previous snapshot retained")
    return out

def main():
    data=collect()
    OUTPUT.parent.mkdir(parents=True,exist_ok=True)
    tmp=OUTPUT.with_suffix(".tmp")
    tmp.write_text(json.dumps(data,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    os.replace(tmp,OUTPUT)
    print("F1 standings:",len(data["drivers"]),"drivers,",len(data["constructors"]),"constructors")

if __name__=="__main__":main()

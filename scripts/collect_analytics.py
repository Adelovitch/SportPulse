#!/usr/bin/env python3
"""Compute football league tables and recent form from full-season OpenLigaDB data.

These are derived, provisional tables and not official tie-breaker rankings.
"""
import json
import os
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

from collect_openligadb import BASE, LEAGUES, fetch_league, full_time

DEST = Path(__file__).resolve().parents[1] / "data" / "analytics.json"

def make_tables(raw_matches, now):
    leagues = {}
    for shortcut, label in LEAGUES:
        games = raw_matches.get(shortcut, [])
        summary = defaultdict(lambda: {"played":0,"won":0,"drawn":0,"lost":0,"gf":0,"ga":0,"points":0,"history":[]})
        for g in games:
            if not isinstance(g,dict) or g.get("matchIsFinished") is not True:
                continue
            home = (g.get("team1") or {}).get("teamName")
            away = (g.get("team2") or {}).get("teamName")
            score = full_time(g.get("matchResults"))
            if not home or not away or not score:
                continue
            from_result = next((r for r in (g.get("matchResults") or []) if r.get("resultTypeID")==2), None)
            if not from_result:
                continue
            a,b = from_result.get("pointsTeam1"),from_result.get("pointsTeam2")
            if not isinstance(a,int) or not isinstance(b,int):
                continue
            date=g.get("matchDateTimeUTC") or ""
            for name,goals,against in ((home,a,b),(away,b,a)):
                rec=summary[name]
                rec["played"]+=1;rec["gf"]+=goals;rec["ga"]+=against
                rec["won"]+=int(goals>against);rec["drawn"]+=int(goals==against);rec["lost"]+=int(goals<against)
                rec["points"]+=3 if goals>against else (1 if goals==against else 0)
                rec["history"].append({"date":date,"opponent":away if name==home else home,"goalsFor":goals,"goalsAgainst":against,
                    "outcome":"V" if goals>against else ("N" if goals==against else "D")})
        table=[]
        for name,r in summary.items():
            history=sorted(r.pop("history"),key=lambda x:x["date"])
            table.append({"team":name,**r,"goalDifference":r["gf"]-r["ga"],"form":history[-5:],"avgGoalsFor":round(r["gf"]/r["played"],2) if r["played"] else 0})
        table.sort(key=lambda x:(-x["points"],-x["goalDifference"],-x["gf"],x["team"]))
        if not table:
            raise ValueError(f"No completed season matches for {label}")
        leagues[label]={"competition":label,"teams":table,"scope":"Classement calculé sur les matchs terminés disponibles (critères simplifiés, non officiel)"}
    return {"source":"OpenLigaDB","updatedAt":now.isoformat().replace("+00:00","Z"),"leagues":leagues}

def collect(now=None):
    now=now or datetime.now(timezone.utc)
    season=now.year if now.month>=7 else now.year-1
    return make_tables({code:fetch_league(code,season) for code,_ in LEAGUES},now)

def main():
    data=collect()
    DEST.parent.mkdir(parents=True,exist_ok=True)
    temp=DEST.with_suffix(".tmp")
    temp.write_text(json.dumps(data,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    os.replace(temp,DEST)
    print("Football tables:",", ".join(data["leagues"]))

if __name__=="__main__":
    main()

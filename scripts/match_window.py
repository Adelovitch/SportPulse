#!/usr/bin/env python3
"""Decide if the extra 20-minute sports refresh is worthwhile using saved schedules."""
import json
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
SOURCES=("matches.json","extras.json","football_data.json")

def should_refresh(now, files):
    """Coverage: 30 minutes before kickoff to 3 hours after, for football/basketball."""
    for path in files:
        try:
            payload=json.loads(Path(path).read_text(encoding="utf-8"))
        except (OSError,ValueError):
            continue
        for match in payload.get("matches",[]):
            if match.get("sport") not in ("Football","Basketball") or match.get("eventType")=="race":
                continue
            if match.get("status")=="FINISHED":
                continue
            try:
                kickoff=datetime.fromisoformat(match["utcDate"].replace("Z","+00:00"))
                if kickoff.tzinfo is None: kickoff=kickoff.replace(tzinfo=timezone.utc)
            except (TypeError,ValueError,KeyError):
                continue
            if kickoff-timedelta(minutes=30)<=now<=kickoff+timedelta(hours=3):
                return True
    return False

if __name__=="__main__":
    run=should_refresh(datetime.now(timezone.utc),[ROOT/"data"/s for s in SOURCES])
    print("Match window active:",run)
    if "--output" in sys.argv:
        with open(sys.argv[sys.argv.index("--output")+1],"a",encoding="utf-8") as f:
            f.write("active="+("true" if run else "false")+"\n")

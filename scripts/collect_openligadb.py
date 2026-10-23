#!/usr/bin/env python3
"""OpenLigaDB -> static JSON snapshot. No API key or dependency required."""
import json
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.request import Request, urlopen

BASE = "https://api.openligadb.de"
LEAGUES = (("bl1", "Bundesliga"), ("bl2", "2. Bundesliga"))
OUTPUT = Path(__file__).resolve().parents[1] / "data" / "matches.json"


def full_time(results):
    for result in results or []:
        if result.get("resultTypeID") == 2:
            a, b = result.get("pointsTeam1"), result.get("pointsTeam2")
            if isinstance(a, int) and isinstance(b, int):
                return f"{a} – {b}"
    return None


def normalize_match(raw, league):
    if not isinstance(raw, dict):
        return None
    mid = raw.get("matchID")
    if not isinstance(mid, int):
        return None
    home = (raw.get("team1") or {}).get("teamName")
    away = (raw.get("team2") or {}).get("teamName")
    kickoff = raw.get("matchDateTimeUTC")
    if not home or not away or not kickoff:
        return None
    score = full_time(raw.get("matchResults"))
    finished = raw.get("matchIsFinished") is True
    return {
        "id": f"openligadb:{mid}",
        "sport": "Football",
        "competition": league,
        "home": str(home),
        "away": str(away),\n        "homeLogo": (raw.get("team1") or {}).get("teamIconUrl"),\n        "awayLogo": (raw.get("team2") or {}).get("teamIconUrl"),
        "utcDate": kickoff,
        "status": "FINISHED" if finished else "SCHEDULED",
        "score": score if finished else None,
    }


def fetch_league(shortcut, season):
    url = f"{BASE}/getmatchdata/{shortcut}/{season}"
    req = Request(url, headers={"User-Agent": "SportPulse/1.0 (static public scoreboard)", "Accept": "application/json"})
    with urlopen(req, timeout=25) as res:
        data = json.load(res)
    if not isinstance(data, list):
        raise ValueError(f"Unexpected API response for {shortcut}")
    return data


def collect(now=None):
    now = now or datetime.now(timezone.utc)
    season = now.year if now.month >= 7 else now.year - 1
    matches = []
    errors = []
    for shortcut, label in LEAGUES:
        try:
            for raw in fetch_league(shortcut, season):
                item = normalize_match(raw, label)
                if item:
                    matches.append(item)
        except Exception as exc:
            errors.append(f"{shortcut}: {type(exc).__name__}: {exc}")
    if errors:
        raise RuntimeError("Collection incomplete; retaining last snapshot. " + "; ".join(errors))
    if not matches:
        raise RuntimeError("API returned no usable results; retaining last snapshot")
    lo, hi = now - timedelta(days=14), now + timedelta(days=14)
    def parse(iso):
        try:
            return datetime.fromisoformat(iso.replace("Z", "+00:00")).replace(tzinfo=timezone.utc) if "+" not in iso and not iso.endswith("Z") else datetime.fromisoformat(iso.replace("Z", "+00:00"))
        except (ValueError, TypeError):
            return None
    matches = [m for m in matches if (dt := parse(m["utcDate"])) is not None and lo <= dt <= hi]
    matches.sort(key=lambda x: x["utcDate"])
    return {
        "source": "OpenLigaDB",
        "updatedAt": now.isoformat().replace("+00:00", "Z"),
        "stale": False,
        "leagues": [x[1] for x in LEAGUES],
        "matches": matches[:160],
    }


def main():
    snapshot = collect()
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    tmp = OUTPUT.with_suffix(".tmp")
    tmp.write_text(json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    os.replace(tmp, OUTPUT)
    print(f"Published {len(snapshot['matches'])} OpenLigaDB games.")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Optional football-data.org v4 snapshot: free tier only, authenticated via Actions secret.

Never expose the token in generated data or logs. 7 seconds between requests
keeps throughput below 10 requests/minute. Non-authorized competitions are skipped.
"""
import json
import os
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen

BASE = "https://api.football-data.org/v4"
OUTPUT = Path(__file__).resolve().parents[1] / "data" / "football_data.json"
COMPETITIONS = {"FL1": "Ligue 1", "PL": "Premier League", "PD": "La Liga",
                "SA": "Serie A", "CL": "Ligue des champions", "DED": "Eredivisie", "PPL": "Primeira Liga", "BSA": "Série A brésilienne",
                "WC": "Coupe du monde", "EC": "Championnat d’Europe", "ELC": "Championship"}
PAUSE_SECONDS = 7


def normalize_match(raw, label):
    if not isinstance(raw, dict) or not isinstance(raw.get("id"), int):
        return None
    home, away = raw.get("homeTeam") or {}, raw.get("awayTeam") or {}
    date = raw.get("utcDate")
    if not home.get("name") or not away.get("name") or not date:
        return None
    status = raw.get("status") or "SCHEDULED"
    ft = (raw.get("score") or {}).get("fullTime") or {}
    h, a = ft.get("home"), ft.get("away")
    score = f"{h} – {a}" if status in ("FINISHED", "AWARDED") and isinstance(h,int) and isinstance(a,int) else None
    return {"id": "football-data:" + str(raw["id"]), "sport": "Football", "competition": label,
            "home": home["name"], "away": away["name"], "utcDate": date,
            "status": "FINISHED" if status in ("FINISHED", "AWARDED") else "SCHEDULED",
            "score": score, "provider": "football-data.org",
            "homeLogo": home.get("crest"), "awayLogo": away.get("crest")}


def normalize_standings(raw):
    result = []
    for standing in raw.get("standings") or []:
        if standing.get("type") != "TOTAL":
            continue
        for r in standing.get("table") or []:
            team = (r.get("team") or {}).get("name")
            if not team:
                continue
            result.append({"team": team, "rank": r.get("position"), "played": r.get("playedGames"),
                "logo": (r.get("team") or {}).get("crest"), "won": r.get("won"), "drawn": r.get("draw"), "lost": r.get("lost"),
                "gf": r.get("goalsFor"), "ga": r.get("goalsAgainst"), "points": r.get("points"),
                "goalDifference": r.get("goalDifference")})
    return result


def fetch_json(path, token):
    request = Request(BASE + path, headers={"X-Auth-Token": token, "Accept": "application/json",
        "User-Agent": "SportPulse/1.0"})
    with urlopen(request, timeout=25) as response:
        return json.load(response)


def collect(token, now=None, fetch=fetch_json, sleep=time.sleep):
    if not token:
        raise ValueError("FOOTBALL_DATA_TOKEN not configured")
    now = now or datetime.now(timezone.utc)
    lo, hi = now - timedelta(days=14), now + timedelta(days=21)
    matches, tables, enabled, warnings = [], {}, [], []
    first = True
    for code, label in COMPETITIONS.items():
        if not first:
            sleep(PAUSE_SECONDS)
        first = False
        try:
            payload = fetch(f"/competitions/{code}/matches", token)
            games = payload.get("matches") if isinstance(payload,dict) else None
            if not isinstance(games,list):
                raise ValueError("Invalid matches response")
            enabled.append(label)
            for raw in games:
                item = normalize_match(raw,label)
                if not item:
                    continue
                try:
                    dt = datetime.fromisoformat(item["utcDate"].replace("Z","+00:00"))
                except (ValueError,TypeError):
                    continue
                if lo <= dt <= hi:
                    matches.append(item)
        except HTTPError as err:
            # 403 = tier restriction, 429 = rate limit, never print tokens.
            warnings.append(f"{code}: HTTP {err.code}")
            if err.code == 429:
                break
            continue
        except Exception as err:
            warnings.append(f"{code}: {type(err).__name__}")
            continue
        # Tournament standings are not always exposed; avoid unnecessary requests.
        if code in ("WC","EC"):
            continue
        sleep(PAUSE_SECONDS)
        try:
            payload = fetch(f"/competitions/{code}/standings", token)
            if isinstance(payload,dict):
                table=normalize_standings(payload)
                if table:
                    tables[label]=table
        except HTTPError as err:
            warnings.append(f"{code} standings: HTTP {err.code}")
            if err.code == 429:
                break
        except Exception as err:
            warnings.append(f"{code} standings: {type(err).__name__}")
    if not enabled:
        raise RuntimeError("No authorized football-data competition returned matches; keep old snapshot")
    matches.sort(key=lambda m:m["utcDate"])
    return {"source":"football-data.org","updatedAt":now.isoformat().replace("+00:00","Z"),
            "competitions":enabled,"matches":matches[:600],"tables":tables,"warnings":warnings}


def main():
    token=os.environ.get("FOOTBALL_DATA_TOKEN","")
    if not token:
        print("Optional football-data collector skipped (FOOTBALL_DATA_TOKEN secret absent).")
        return
    snapshot=collect(token)
    OUTPUT.parent.mkdir(parents=True,exist_ok=True)
    tmp=OUTPUT.with_suffix(".tmp")
    tmp.write_text(json.dumps(snapshot,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    os.replace(tmp,OUTPUT)
    print("football-data.org competitions:",len(snapshot["competitions"]),"matches:",len(snapshot["matches"]))
    for warning in snapshot["warnings"]:
        print("Source limitation:",warning)


if __name__=="__main__":
    main()

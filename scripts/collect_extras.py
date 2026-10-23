#!/usr/bin/env python3
"""Collect optional public sports sources separately from OpenLigaDB.
No credentials. Errors keep the last verified snapshot intact.
"""
import json
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

OUTPUT = Path(__file__).resolve().parents[1] / "data" / "extras.json"


def get_json(url):
    request = Request(url, headers={"User-Agent": "SportPulse/1.1 (+https://github.com/Adelovitch/SportPulse)", "Accept": "application/json"})
    with urlopen(request, timeout=20) as response:
        return json.load(response)


def normalize_f1(race, season):
    date = race.get("date")
    if not date:
        return None
    when = date + "T" + (race.get("time") or "12:00:00Z")
    if not when.endswith("Z") and "+" not in when:
        when += "Z"
    circuit = race.get("Circuit") or {}
    return {
        "id": "jolpica:f1:" + str(season) + ":" + str(race.get("round")),
        "sport": "Formule 1",
        "competition": "Championnat du monde F1",
        "home": str(race.get("raceName") or "Grand Prix"),
        "away": str(circuit.get("circuitName") or "Circuit à préciser"),
        "utcDate": when,
        "status": "SCHEDULED",  # Schedule alone is not proof of a final result.
        "score": None,
        "eventType": "race",
        "provider": "Jolpica-F1"
    }


def collect_f1(now):
    season = now.year
    payload = get_json(f"https://api.jolpi.ca/ergast/f1/{season}/races/?limit=100")
    races = payload.get("MRData", {}).get("RaceTable", {}).get("Races", [])
    if not isinstance(races, list) or not races:
        raise ValueError("F1 schedule unavailable")
    result = [normalize_f1(r, season) for r in races]
    return attach_f1_results([m for m in result if m],now)



def attach_f1_results(matches, now, fetch=get_json):
    """Enrich only the two most recent past races; never fabricate a result."""
    completed=[m for m in matches if m.get("eventType")=="race" and datetime.fromisoformat(m["utcDate"].replace("Z","+00:00"))<now]
    completed.sort(key=lambda m:m["utcDate"],reverse=True)
    for event in completed[:2]:
        season,round_number=event["id"].split(":")[-2:]
        try:
            response=fetch(f"https://api.jolpi.ca/ergast/f1/{season}/{round_number}/results/?limit=100")
            races=response.get("MRData",{}).get("RaceTable",{}).get("Races",[])
            if not races or not isinstance(races[0].get("Results"),list) or not races[0]["Results"]:
                continue
            classified=[]
            for result in races[0]["Results"]:
                driver=result.get("Driver") or {}
                if not result.get("position") or not driver.get("driverId"):
                    continue
                classified.append({"position":str(result["position"]),"driver":str(driver.get("givenName","")+" "+driver.get("familyName","")).strip(),"driverId":driver["driverId"],"team":(result.get("Constructor") or {}).get("name",""),"points":result.get("points")})
            if not classified:
                continue
            event["status"]="FINISHED"
            event["classification"]=classified
            event["winner"]=next((x["driver"] for x in classified if x["position"]=="1"),None)
        except (ValueError,KeyError,TypeError):
            continue
        except Exception:
            continue # Best-effort enrichment, schedule remains safe if results unavailable.
    return matches


def normalize_sportsdb(event):
    if not isinstance(event, dict):
        return None
    home, away = event.get("strHomeTeam"), event.get("strAwayTeam")
    date = event.get("strTimestamp")
    if not home or not away or not date or not event.get("idEvent"):
        return None
    score_a, score_b = event.get("intHomeScore"), event.get("intAwayScore")
    completed = str(event.get("strStatus") or "").lower() in ("match finished", "finished", "ft")
    score = f"{score_a} – {score_b}" if completed and score_a is not None and score_b is not None else None
    return {
        "id": "thesportsdb:" + str(event["idEvent"]),
        "sport": "Basketball",
        "competition": str(event.get("strLeague") or "Basketball"),
        "home": str(home), "away": str(away),
        "utcDate": date,
        "status": "FINISHED" if completed else "SCHEDULED",
        "score": score,
        "provider": "TheSportsDB",
        "homeLogo": event.get("strHomeTeamBadge"),
        "awayLogo": event.get("strAwayTeamBadge"),
        "eventImage": event.get("strThumb")
    }


def collect_basketball():
    # NBA league ID in TheSportsDB; the free key can yield only 1 event per endpoint.
    matches = []
    for endpoint in ("eventsnextleague.php", "eventspastleague.php"):
        url = "https://www.thesportsdb.com/api/v1/json/123/" + endpoint + "?" + urlencode({"id": "4387"})
        payload = get_json(url)
        records = payload.get("events") if isinstance(payload, dict) else None
        if records is None:
            continue
        if not isinstance(records, list):
            raise ValueError("Invalid TheSportsDB response")
        for event in records:
            match = normalize_sportsdb(event)
            if match:
                matches.append(match)
    return matches


def collect(now=None):
    now = now or datetime.now(timezone.utc)
    sources = []
    matches = []
    warnings = []
    for name, method in (("Jolpica-F1", lambda: collect_f1(now)), ("TheSportsDB", collect_basketball)):
        try:
            rows = method()
            if rows:
                matches.extend(rows)
                sources.append(name)
            else:
                warnings.append(name + ": no eligible matches")
        except Exception as exc:
            warnings.append(name + ": " + type(exc).__name__ + ": " + str(exc))
    if not sources:
        raise RuntimeError("No auxiliary provider succeeded; previous snapshot preserved: " + "; ".join(warnings))
    lo, hi = now - timedelta(days=14), now + timedelta(days=60)
    results = []
    seen = set()
    for match in matches:
        try:
            dt = datetime.fromisoformat(match["utcDate"].replace("Z", "+00:00"))
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
        except (ValueError, TypeError):
            continue
        if lo <= dt <= hi and match["id"] not in seen:
            seen.add(match["id"])
            results.append(match)
    results.sort(key=lambda m: m["utcDate"])
    return {"source": "SportPulseExtras", "providers": sources, "updatedAt": now.isoformat().replace("+00:00", "Z"),
            "matches": results[:100], "warnings": warnings}


def main():
    data = collect()
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    temp = OUTPUT.with_suffix(".tmp")
    temp.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    os.replace(temp, OUTPUT)
    print("Auxiliary sources:", ", ".join(data["providers"]), "| Events:", len(data["matches"]))
    for warning in data["warnings"]:
        print("WARNING:", warning)


if __name__ == "__main__":
    main()

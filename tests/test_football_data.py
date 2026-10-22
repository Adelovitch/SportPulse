import sys
import unittest
from datetime import datetime, timezone
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"scripts"))
from collect_football_data import normalize_match, normalize_standings, collect, COMPETITIONS

class InternationalFootballTests(unittest.TestCase):
    def test_score_from_finished_only(self):
        game={"id":19,"homeTeam":{"name":"Paris"},"awayTeam":{"name":"Lyon"},"utcDate":"2026-10-25T20:00:00Z","status":"SCHEDULED","score":{"fullTime":{"home":2,"away":1}}}
        self.assertIsNone(normalize_match(game,"Ligue 1")["score"])
        game["status"]="FINISHED"
        self.assertEqual(normalize_match(game,"Ligue 1")["score"],"2 – 1")
    def test_standings_total_only(self):
        data={"standings":[{"type":"HOME","table":[{"team":{"name":"Wrong"}}]},{"type":"TOTAL","table":[{"position":1,"team":{"name":"Paris"},"points":18}]}]}
        self.assertEqual(normalize_standings(data)[0]["team"],"Paris")
        self.assertEqual(len(normalize_standings(data)),1)
    def test_missing_secret(self):
        with self.assertRaises(ValueError):collect("",datetime(2026,10,22,tzinfo=timezone.utc))
    def test_collector_does_not_require_real_network(self):
        def fake_fetch(path,token):
            if path.endswith("/matches"):
                return {"matches":[{"id":51,"homeTeam":{"name":"A"},"awayTeam":{"name":"B"},"utcDate":"2026-10-25T20:00:00Z","status":"FINISHED","score":{"fullTime":{"home":1,"away":1}}}]}
            return {"standings":[{"type":"TOTAL","table":[{"position":1,"team":{"name":"A"},"points":6}]}]}
        result=collect("dummy",datetime(2026,10,22,tzinfo=timezone.utc),fetch=fake_fetch,sleep=lambda _:None)
        self.assertEqual(len(result["competitions"]),len(COMPETITIONS))
        self.assertEqual(len(result["matches"]),len(COMPETITIONS))
if __name__=="__main__":unittest.main()

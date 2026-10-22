import sys
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from collect_extras import normalize_f1, normalize_sportsdb

class ExtraTests(unittest.TestCase):
    def test_f1_schedule_not_score(self):
        m = normalize_f1({"date":"2026-10-25","time":"19:00:00Z","round":"18","raceName":"Grand Prix Test","Circuit":{"circuitName":"Circuit Test"}},2026)
        self.assertEqual(m["sport"],"Formule 1")
        self.assertIsNone(m["score"])
        self.assertEqual(m["eventType"],"race")
    def test_basketball_pending_score_not_fabricated(self):
        m=normalize_sportsdb({"idEvent":"12","strHomeTeam":"A","strAwayTeam":"B","strTimestamp":"2026-10-25T20:00:00+00:00","intHomeScore":"88","intAwayScore":"87","strLeague":"NBA"})
        self.assertIsNone(m["score"])
    def test_basketball_missing_teams(self):
        self.assertIsNone(normalize_sportsdb({"idEvent":"1"}))

if __name__=="__main__":
    unittest.main()

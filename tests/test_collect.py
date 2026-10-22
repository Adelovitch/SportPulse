import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from collect_openligadb import full_time, normalize_match

class CollectorTests(unittest.TestCase):
    def test_full_time_not_half_time(self):
        r = [{"resultTypeID": 1, "pointsTeam1": 1, "pointsTeam2": 0},
             {"resultTypeID": 2, "pointsTeam1": 2, "pointsTeam2": 1}]
        self.assertEqual(full_time(r), "2 – 1")
    def test_no_unplayed_score(self):
        r = {"matchID": 42, "team1": {"teamName": "A"},
             "team2": {"teamName": "B"}, "matchDateTimeUTC": "2026-10-22T18:00:00Z",
             "matchIsFinished": False,
             "matchResults": [{"resultTypeID": 2, "pointsTeam1": 1, "pointsTeam2": 0}]}
        m = normalize_match(r, "Bundesliga")
        self.assertIsNone(m["score"])
        self.assertEqual(m["status"], "SCHEDULED")
    def test_invalid_match(self):
        self.assertIsNone(normalize_match({"matchID": 2}, "Bundesliga"))

if __name__ == "__main__":
    unittest.main()

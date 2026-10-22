import sys
import unittest
from datetime import datetime, timezone
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"scripts"))
from collect_analytics import make_tables
def game(a,b,sa,sb,date="2026-10-20T15:00:00Z"):
    return {"matchIsFinished":True,"matchDateTimeUTC":date,"team1":{"teamName":a},"team2":{"teamName":b},
            "matchResults":[{"resultTypeID":2,"pointsTeam1":sa,"pointsTeam2":sb}]}
class RankingTests(unittest.TestCase):
    def test_points_and_form(self):
        rows=[game("A","B",2,1),game("B","A",0,0,"2026-10-21T15:00:00Z")]
        d=make_tables({"bl1":rows,"bl2":rows},datetime(2026,10,22,tzinfo=timezone.utc))
        first=d["leagues"]["Bundesliga"]["teams"][0]
        self.assertEqual(first["team"],"A")
        self.assertEqual(first["points"],4)
        self.assertEqual([m["outcome"] for m in first["form"]],["V","N"])
    def test_ignore_unfinished(self):
        rows=[game("A","B",1,0),dict(game("A","B",1,0),matchIsFinished=False)]
        d=make_tables({"bl1":rows,"bl2":rows},datetime(2026,10,22,tzinfo=timezone.utc))
        self.assertEqual(d["leagues"]["Bundesliga"]["teams"][0]["played"],1)
if __name__=="__main__":unittest.main()

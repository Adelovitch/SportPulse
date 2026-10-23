import unittest,sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"scripts"))
from build_multisport_index import season,build

class MultisportIndexTests(unittest.TestCase):
 def test_f1_calendar_year(self):
  self.assertEqual(season({"sport":"Formule 1","utcDate":"2026-03-01T12:00:00Z"}),"2026")
 def test_basketball_july_june(self):
  self.assertEqual(season({"sport":"Basketball","utcDate":"2026-01-22T12:00:00Z"}),"2025-2026")
 def test_dedup_and_sport_separation(self):
  a={"id":"a","sport":"Basketball","competition":"NBA","utcDate":"2026-10-23T10:00:00Z"}
  b={"id":"b","sport":"Formule 1","competition":"F1","utcDate":"2026-10-23T10:00:00Z"}
  out=build([a,a,b])
  self.assertEqual(out["totalEvents"],2)
  self.assertEqual(out["sports"]["Basketball"]["seasons"]["2026-2027"]["count"],1)
  self.assertEqual(out["sports"]["Formule 1"]["seasons"]["2026"]["count"],1)

if __name__=="__main__":unittest.main()

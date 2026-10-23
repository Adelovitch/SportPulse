import sys,unittest
from datetime import datetime,timezone
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"scripts"))
from collect_f1_standings import normalize_rows,collect
from collect_football_data import COMPETITIONS
class WorldCoverageTests(unittest.TestCase):
 def test_world_football_catalog(self):
  for code in ("WC","EC","BSA","ELC"):self.assertIn(code,COMPETITIONS)
 def test_f1_driver_and_constructor_rows(self):
  rows={"MRData":{"StandingsTable":{"StandingsLists":[{"DriverStandings":[{"position":"1","points":"230","wins":"6","Driver":{"givenName":"Test","familyName":"Driver"},"Constructors":[{"name":"Test Team"}]}],"ConstructorStandings":[{"position":"1","points":"300","wins":"7","Constructor":{"name":"Test Team"}}]}]}}}
  self.assertEqual(normalize_rows(rows,"Driver")[0]["team"],"Test Team")
  self.assertEqual(normalize_rows(rows,"Constructor")[0]["points"],"300")
 def test_f1_no_fabricated_standings(self):
  with self.assertRaises(RuntimeError):collect(datetime(2026,10,23,tzinfo=timezone.utc),get=lambda url:{"MRData":{}})
 def test_f1_partial_api_failure(self):
  def fake(url):
   if "driverstandings" in url:raise OSError("offline")
   return {"MRData":{"StandingsTable":{"StandingsLists":[{"ConstructorStandings":[{"position":"1","points":"1","Constructor":{"name":"Example"}}]}]}}}
  data=collect(datetime(2026,10,23,tzinfo=timezone.utc),get=fake)
  self.assertEqual(len(data["constructors"]),1)
  self.assertTrue(data["warnings"])
if __name__=="__main__":unittest.main()

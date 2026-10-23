import json,tempfile,unittest,sys
from datetime import datetime,timezone
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"scripts"))
from collect_multisport_history import verified,merge,collect
from collect_extras import attach_f1_results,normalize_f1

def basketball(mid="nba:1",status="FINISHED"):
    return {"id":mid,"sport":"Basketball","competition":"NBA","home":"A","away":"B","utcDate":"2026-10-23T18:00:00Z","status":status,"score":"96 – 84"}

def race(status="FINISHED"):
    return {"id":"jolpica:f1:2026:10","sport":"Formule 1","competition":"F1","utcDate":"2026-10-20T18:00:00Z","eventType":"race","status":status,"classification":[{"position":"1","driverId":"racer","driver":"Driver"}]}

class MultiSportTests(unittest.TestCase):
    def test_only_verified_results(self):
        self.assertTrue(verified(basketball()))
        self.assertFalse(verified(basketball(status="SCHEDULED")))
        self.assertTrue(verified(race()))
        self.assertFalse(verified(race("SCHEDULED")))
    def test_merge_preserves_and_updates(self):
        old=basketball()
        newer={**old,"score":"101 – 97"}
        self.assertEqual(merge([old],[newer])[0]["score"],"101 – 97")
        self.assertEqual(merge([old],[]),[old])
    def test_f1_requires_classification(self):
        raw=normalize_f1({"date":"2026-10-20","round":"10","raceName":"GP","Circuit":{"circuitName":"Track"}},2026)
        def good(url):return {"MRData":{"RaceTable":{"Races":[{"Results":[{"position":"1","Driver":{"driverId":"racer","givenName":"Test","familyName":"Driver"},"Constructor":{"name":"A"},"points":"25"}]}]}}}
        result=attach_f1_results([raw],datetime(2026,10,23,tzinfo=timezone.utc),fetch=good)
        self.assertTrue(verified(result[0]))
        self.assertEqual(result[0]["winner"],"Test Driver")
        raw2=normalize_f1({"date":"2026-10-20","round":"10","raceName":"GP"},2026)
        attach_f1_results([raw2],datetime(2026,10,23,tzinfo=timezone.utc),fetch=lambda url:{"MRData":{}})
        self.assertEqual(raw2["status"],"SCHEDULED")
    def test_archive_no_erase_on_empty_snapshot(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp);(root/"data").mkdir()
            f=root/"data/extras.json"
            f.write_text(json.dumps({"source":"SportPulseExtras","matches":[basketball()]}))
            self.assertEqual(collect(root),(True,1))
            f.write_text(json.dumps({"source":"SportPulseExtras","matches":[]}))
            self.assertEqual(collect(root),(False,1))

if __name__=="__main__":unittest.main()

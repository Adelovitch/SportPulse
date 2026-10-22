import json
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"scripts"))
from match_window import should_refresh

class MatchWindowTests(unittest.TestCase):
    def check(self, matches, offset):
        now=datetime(2026,10,22,18,tzinfo=timezone.utc)
        with tempfile.TemporaryDirectory() as tmp:
            path=Path(tmp)/"matches.json"
            for m in matches:
                m["utcDate"]=(now+timedelta(minutes=offset)).isoformat()
            path.write_text(json.dumps({"matches":matches}),encoding="utf-8")
            return should_refresh(now,[path])
    def test_before_match(self):
        self.assertTrue(self.check([{"sport":"Football","status":"SCHEDULED"}],20))
    def test_during_match(self):
        self.assertTrue(self.check([{"sport":"Basketball","status":"SCHEDULED"}],-75))
    def test_finished_not_trigger(self):
        self.assertFalse(self.check([{"sport":"Football","status":"FINISHED"}],-75))
    def test_far_future_not_trigger(self):
        self.assertFalse(self.check([{"sport":"Football","status":"SCHEDULED"}],180))
    def test_race_does_not_trigger(self):
        self.assertFalse(self.check([{"sport":"Formule 1","status":"SCHEDULED","eventType":"race"}],-10))

if __name__=="__main__":unittest.main()

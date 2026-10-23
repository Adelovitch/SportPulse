import json
import tempfile
import unittest
from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"scripts"))
from build_history_index import build,create,season_for

def match(id,date,league="Ligue 1"):
    return {"id":id,"competition":league,"utcDate":date}

class HistoryIndexTests(unittest.TestCase):
    def test_season_boundaries(self):
        self.assertEqual(season_for("2026-06-30T12:00:00Z"),"2025-2026")
        self.assertEqual(season_for("2026-07-01T12:00:00Z"),"2026-2027")
    def test_group_counts_and_deduplication(self):
        x=build([match("a","2026-10-22T18:00:00Z"),match("a","2026-10-22T18:00:00Z"),match("b","2026-11-01T18:00:00Z","Bundesliga")])
        self.assertEqual(x["totalMatches"],2)
        self.assertEqual(x["seasons"]["2026-2027"]["competitions"]["Ligue 1"]["matchIds"],["a"])
    def test_index_does_not_rewrite_history_and_is_idempotent(self):
        with tempfile.TemporaryDirectory() as td:
            d=Path(td)/"data";d.mkdir()
            src=d/"history.json"
            src.write_text(json.dumps({"source":"SportPulse","matches":[match("a","2026-10-22T18:00:00Z")]}),encoding="utf-8")
            original=src.read_bytes()
            self.assertTrue(create(Path(td))[0])
            self.assertFalse(create(Path(td))[0])
            self.assertEqual(src.read_bytes(),original)
    def test_invalid_input_fails_safely(self):
        with tempfile.TemporaryDirectory() as td:
            d=Path(td)/"data";d.mkdir()
            (d/"history.json").write_text(json.dumps({"source":"Other","matches":[]}),encoding="utf-8")
            with self.assertRaises(ValueError):create(Path(td))
            self.assertFalse((d/"history_index.json").exists())

if __name__=="__main__":unittest.main()

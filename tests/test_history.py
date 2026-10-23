import json
import tempfile
import unittest
from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"scripts"))
from collect_history import valid_match,merge,collect

def game(id,score="2 – 1",status="FINISHED"):
    return {"id":id,"sport":"Football","competition":"Ligue 1","home":"Équipe A","away":"Équipe B","utcDate":"2026-10-22T18:00:00Z","status":status,"score":score}

class HistoryTests(unittest.TestCase):
    def test_finished_validated(self):
        self.assertTrue(valid_match(game("x")))
        self.assertFalse(valid_match(game("x",status="SCHEDULED")))
        self.assertFalse(valid_match(game("x",score=None)))
        self.assertFalse(valid_match(game("x",score="2 – ?")))
    def test_deduplicate_and_correct(self):
        a=game("x")
        newer=game("x","3 – 1")
        result=merge([a],[[newer]])
        self.assertEqual(len(result),1)
        self.assertEqual(result[0]["score"],"3 – 1")
    def test_never_erase_on_empty_window(self):
        self.assertEqual(merge([game("old")],[]),[game("old")])
    def test_conflicting_ids_preserved(self):
        g=game("x")
        changed={**game("x"),"home":"Other"}
        self.assertEqual(merge([g],[[changed]]),[g])
    def test_persistence_and_idempotence(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);(root/"data").mkdir()
            (root/"data/matches.json").write_text(json.dumps({"source":"OpenLigaDB","matches":[game("old"),game("unfinished",status="SCHEDULED")]}),encoding="utf-8")
            self.assertEqual(collect(root),(True,1))
            self.assertEqual(collect(root),(False,1))
            (root/"data/matches.json").write_text(json.dumps({"source":"OpenLigaDB","matches":[game("new")]}),encoding="utf-8")
            self.assertEqual(collect(root),(True,2))
            self.assertEqual(len(json.loads((root/"data/history.json").read_text())["matches"]),2)

if __name__=="__main__":unittest.main()

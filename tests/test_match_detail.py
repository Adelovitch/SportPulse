from pathlib import Path
import unittest

ROOT=Path(__file__).resolve().parents[1]

class MatchDetailTests(unittest.TestCase):
    def test_dialog_wiring(self):
        html=(ROOT/"index.html").read_text(encoding="utf-8")
        for needle in ('id="matchDetail"','id="matchDetailContent"','id="matchDetailClose"','src="match-detail.js"'):
            self.assertIn(needle,html)
    def test_each_match_exposes_detail_button(self):
        js=(ROOT/"live.js").read_text(encoding="utf-8")
        self.assertIn("sportpulse:open-match",js)
        self.assertIn("detailButton.type='button'",js)
    def test_real_history_only_and_no_external_fetch(self):
        js=(ROOT/"match-detail.js").read_text(encoding="utf-8")
        self.assertIn("data/history.json",js)
        self.assertIn("data/multisport_history.json",js)
        self.assertIn("Array.isArray(m.classification)",js)
        self.assertIn("validScore(x)",js)
        self.assertNotIn("innerHTML",js)
        self.assertNotIn("api.jolpi.ca",js)
    def test_responsive_dialog(self):
        css=(ROOT/"styles.css").read_text(encoding="utf-8")
        self.assertIn(".sportDetail",css)
        self.assertIn(".sportDetail::backdrop",css)

if __name__=="__main__":
    unittest.main()

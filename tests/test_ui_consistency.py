"""Guard DOM wiring of dependent sport / competition controls.
Browser interactions still require a manual smoke test.
"""
from pathlib import Path
import unittest
from html.parser import HTMLParser

ROOT=Path(__file__).resolve().parents[1]

class Collector(HTMLParser):
    def __init__(self):
        super().__init__()
        self.stack=[]
        self.parent={}
    def handle_starttag(self,tag,attrs):
        attrs=dict(attrs)
        ident=attrs.get("id")
        if ident:self.parent[ident]=tuple(self.stack)
        if tag not in {"area","base","br","col","embed","hr","img","input","link","meta","param","source","track","wbr"}:
            self.stack.append(ident or tag)
    def handle_endtag(self,tag):
        if self.stack:self.stack.pop()

class UIConsistencyTests(unittest.TestCase):
    def test_f1_standings_live_inside_standings_section(self):
        parser=Collector()
        parser.feed((ROOT/"index.html").read_text(encoding="utf-8"))
        self.assertIn("classements",parser.parent["f1-championnat"])
        self.assertIn("classements",parser.parent["basketStandingsContent"])
        self.assertIn("classements",parser.parent["footballStandingsContent"])
    def test_comparison_has_separate_sport_and_competition(self):
        html=(ROOT/"index.html").read_text(encoding="utf-8")
        for ident in ("standingsSport","standingsLeague","compareSport","compareLeague","compareOtherPanel"):
            self.assertIn('id="'+ident+'"',html)
    def test_filter_dispatch_and_dependent_choices(self):
        live=(ROOT/"live.js").read_text(encoding="utf-8")
        standings=(ROOT/"standings.js").read_text(encoding="utf-8")
        compare=(ROOT/"compare.js").read_text(encoding="utf-8")
        self.assertIn("sportpulse:filters",live)
        for script in (standings,compare):
            self.assertIn("sportpulse:filters",script)
            self.assertIn("'Championnat du monde F1'",script)
            self.assertIn("'NBA'",script)
    def test_css_respects_hidden(self):
        self.assertIn("[hidden]{display:none!important}",(ROOT/"styles.css").read_text(encoding="utf-8"))

if __name__=="__main__":unittest.main()

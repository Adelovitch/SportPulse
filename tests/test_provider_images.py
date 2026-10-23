import sys,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"scripts"))
from collect_football_data import normalize_match,normalize_standings
from collect_openligadb import normalize_match as normalize_german
from collect_extras import normalize_sportsdb

class ImagesFromProvidersTests(unittest.TestCase):
 def test_football_data_crest(self):
  raw={"id":11,"utcDate":"2026-10-25T12:00:00Z","homeTeam":{"name":"A","crest":"https://example.org/a.png"},"awayTeam":{"name":"B","crest":"https://example.org/b.png"}}
  m=normalize_match(raw,"Ligue 1")
  self.assertEqual(m["homeLogo"],"https://example.org/a.png")
  self.assertEqual(m["awayLogo"],"https://example.org/b.png")
  row=normalize_standings({"standings":[{"type":"TOTAL","table":[{"team":{"name":"A","crest":"https://example.org/a.png"}}]}]})[0]
  self.assertEqual(row["logo"],"https://example.org/a.png")
 def test_openligadb_team_icon(self):
  raw={"matchID":12,"matchDateTimeUTC":"2026-10-25T12:00:00Z","team1":{"teamName":"A","teamIconUrl":"https://example.org/a.png"},"team2":{"teamName":"B","teamIconUrl":None}}
  m=normalize_german(raw,"Bundesliga")
  self.assertEqual(m["homeLogo"],"https://example.org/a.png")
  self.assertIsNone(m["awayLogo"])
 def test_nba_provider_badges(self):
  raw={"idEvent":"123","strHomeTeam":"A","strAwayTeam":"B","strTimestamp":"2026-10-25T20:00:00Z","strHomeTeamBadge":"https://example.org/a.png"}
  m=normalize_sportsdb(raw)
  self.assertEqual(m["homeLogo"],"https://example.org/a.png")
  self.assertIsNone(m["awayLogo"])
 def test_absence_keeps_no_fake_image(self):
  raw={"id":11,"utcDate":"2026-10-25T12:00:00Z","homeTeam":{"name":"A"},"awayTeam":{"name":"B"}}
  self.assertIsNone(normalize_match(raw,"Ligue 1")["homeLogo"])

if __name__=="__main__":unittest.main()

"""Convert author-supplied MacRoman text into browser-ready data."""
import json
import re
from pathlib import Path

SOURCE = Path('/Users/julia/Desktop/67')
DEST = Path(__file__).parent / 'dist' / 'content' / 'publication.json'

FILES = {
    'what': 'whatis67?.txt',
    'belonging': 'languageforbelonging.txt',
    'bleaching': 'semanticbleaching.txt',
    'bleaching_cont': 'semanticbleaching-cont.txt',
    'kaitlyn': 'interview-kaitlyn.txt',
    'yui': 'interview-yui.txt',
    'audrey': 'interview-audrey.txt',
    'madhu': 'interview-madhu.txt',
    'colophon': 'colophon.txt',
    'bibliography': 'bibliography.txt',
}

def clean(value):
    value = value.replace('\r\n', '\r').replace('\n', '\r')
    value = re.sub(r'-\r(?=[a-z])', '', value)
    value = re.sub(r'(?<!\r)\r(?!\r)', ' ', value)
    value = re.sub(r'[ \t]+', ' ', value)
    return [part.strip() for part in re.split(r'\r+', value) if part.strip()]

data = {key: clean((SOURCE / name).read_bytes().decode('mac_roman')) for key, name in FILES.items()}
for speaker in ('kaitlyn', 'yui', 'audrey', 'madhu'):
    joined = ' '.join(data[speaker])
    data[speaker] = [part.strip() for part in re.split(r'(?=\b[A-Z]{1,3}: )', joined) if part.strip()]

terms = [
    '1337 (leet)', '1738', '21', '322', '420', '6-7', '6-7 Weekend', '69',
    'AAVE', 'Accent', 'Actually', 'Brain rot', 'Cynthia Gordon', 'Dab',
    'Demure', 'Doh', 'Doot Doot (6 7)', 'Drill rap', 'Fad', 'Floss',
    'Gangnam Style', 'Gaslighting', 'Gen Alpha', 'Gen Z', 'Griddy', 'Grody',
    'Homer Simpson', 'In-joke', 'Influencer', 'Instagram', 'Instagram Reels',
    'Internet', 'Internet meme', 'Intrusive thoughts', 'JD Vance',
    'Keir Starmer', 'Lamelo Ball', 'Language', 'Like', 'Linguistics',
    'Literally', 'Maverick Trevillian', 'New York accent', 'Overtime Elite',
    'Pope Leo XIV', 'Really', 'Renegade dance', 'Rizz', 'Scuba',
    'Semantic bleaching', 'Shaquille O’Neal', 'Skrilla', 'Slang', 'SNL',
    'Social media', 'Social phenomenon', 'Sociolinguistics', 'Taylen Kinney',
    'Ten-code', 'The Simpsons', 'Tiktok', 'Tuff', 'Ultimately', 'Unc',
    'Valley girl', 'Very',
]

raw = (SOURCE / 'glossary.txt').read_bytes().decode('mac_roman')
chunks = re.split(r'https?://[^\r]+\r?', raw)
chunks = [chunk for chunk in chunks if chunk.strip() and not chunk.startswith('ster.com')]
glossary = []
for term, chunk in zip(terms, chunks):
    normalized = ' '.join(clean(chunk))
    definition = normalized[len(term):].strip() if normalized.startswith(term) else normalized
    glossary.append({'term': term, 'definition': definition})
data['glossary'] = glossary

DEST.parent.mkdir(parents=True, exist_ok=True)
DEST.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
DEST.with_suffix('.js').write_text('window.SIX_SEVEN_PUBLICATION = ' + json.dumps(data, ensure_ascii=False) + ';\n', encoding='utf-8')
print(f'Wrote {DEST} with {len(glossary)} glossary entries')

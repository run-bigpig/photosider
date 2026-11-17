"""Fetch verified OFL fonts and losslessly package complete upstream fonts as WOFF2.

Requires: pip install fonttools brotli
Run from the project root: python scripts/fetch-curated-fonts.py
No glyph subsetting or outline changes are performed.
"""
import concurrent.futures
import hashlib
import io
import json
from pathlib import Path
from urllib.request import urlopen

from fontTools.ttLib import TTFont

ROOT = Path('public/fonts/curated')
ROOT.mkdir(parents=True, exist_ok=True)
ADOBE = 'https://raw.githubusercontent.com/adobe-fonts/'
GOOGLE = 'https://raw.githubusercontent.com/google/fonts/main/ofl/'
FONTS = [
    ('source-han-sans', '思源黑体', ADOBE + 'source-han-sans/release/', 'SubsetOTF/CN/SourceHanSansCN-Regular.otf', 'LICENSE.txt'),
    ('source-han-serif', '思源宋体', ADOBE + 'source-han-serif/release/', 'SubsetOTF/CN/SourceHanSerifCN-Regular.otf', 'LICENSE.txt'),
    ('zcool-xiaowei', '站酷小微 Logo 体', GOOGLE + 'zcoolxiaowei/', 'ZCOOLXiaoWei-Regular.ttf', 'OFL.txt'),
    ('zcool-huangyou', '站酷庆科黄油体', GOOGLE + 'zcoolqingkehuangyou/', 'ZCOOLQingKeHuangYou-Regular.ttf', 'OFL.txt'),
    ('zcool-kuaile', '站酷快乐体', GOOGLE + 'zcoolkuaile/', 'ZCOOLKuaiLe-Regular.ttf', 'OFL.txt'),
    ('zhi-mang-xing', '钟齐志莽行书', GOOGLE + 'zhimangxing/', 'ZhiMangXing-Regular.ttf', 'OFL.txt'),
]


def fetch_font(font):
    key, name, root, file, license_file = font
    license_data = urlopen(root + license_file, timeout=90).read()
    assert b'SIL OPEN FONT LICENSE' in license_data.upper(), f'Missing OFL: {key}'
    original = urlopen(root + file, timeout=90).read()
    face = TTFont(io.BytesIO(original))
    face.flavor = 'woff2'
    target = ROOT / f'{key}.woff2'
    face.save(target)
    (ROOT / f'{key}-OFL.txt').write_bytes(license_data)
    packaged = target.read_bytes()
    print(f'{name}: {len(original):,} → {len(packaged):,} bytes', flush=True)
    return dict(id=key, name=name, file=target.name, source=root + file,
                license='SIL Open Font License 1.1', licenseSource=root + license_file,
                licenseFile=f'{key}-OFL.txt', bytes=len(packaged),
                sourceSha256=hashlib.sha256(original).hexdigest(),
                sha256=hashlib.sha256(packaged).hexdigest(),
                packaging='WOFF2 lossless format conversion; all upstream glyphs retained')


with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
    records = list(executor.map(fetch_font, FONTS))
(ROOT / 'sources.json').write_text(json.dumps(records, ensure_ascii=False, indent=2) + '\n')
print(f'Bundled {len(records)} fonts, {sum(r["bytes"] for r in records):,} bytes.')

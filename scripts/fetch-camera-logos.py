"""Bundle Camera Vision's public logo assets. Requires Pillow (python3 -m pip install Pillow)."""
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from hashlib import sha256
from io import BytesIO
import json
from pathlib import Path
import re
from urllib.request import urlopen
from PIL import Image

BASE = 'https://lookcv.com/'
OUT = Path(__file__).resolve().parents[1] / 'public/logos/camera'
OUT.mkdir(parents=True, exist_ok=True)


def get(url):
    with urlopen(url, timeout=30) as response:
        return response.read()


def download(name):
    url = f'{BASE}static/imgs/logo/{name}.png'
    original = get(url)
    image = Image.open(BytesIO(original)).convert('RGBA')
    # Transparent padding varies widely on the source site. Trim it for consistent sizing.
    bounds = image.getbbox()
    if not bounds:
        raise ValueError(f'Empty logo: {name}')
    image = image.crop(bounds)
    destination = OUT / f'{name}.png'
    image.save(destination, optimize=True)
    return {
        'file': destination.name, 'source': url,
        'sourceSha256': sha256(original).hexdigest(),
        'sha256': sha256(destination.read_bytes()).hexdigest(),
        'width': image.width, 'height': image.height,
    }


if __name__ == '__main__':
    script = get(BASE + 'static/js/index.js').decode('utf-8')
    match = re.search(r'const LOGO_FILENAMES\s*=\s*(\[.*?\])', script, re.S)
    if not match:
        raise ValueError('Source logo catalog not found')
    names = json.loads(match.group(1))
    if not names or any(not re.fullmatch(r'[A-Za-z0-9_-]+', name) for name in names):
        raise ValueError('Invalid logo filename')
    with ThreadPoolExecutor(max_workers=6) as pool:
        assets = list(pool.map(download, names))
    (OUT / 'LICENSE.txt').write_bytes(get(
        'https://raw.githubusercontent.com/printlin/OnlineImageWatermark/main/LICENSE'))
    (OUT / 'sources.json').write_text(json.dumps({
        'source': BASE,
        'repository': 'https://github.com/printlin/OnlineImageWatermark',
        'retrievedAt': datetime.now(timezone.utc).isoformat(),
        'processing': 'Trimmed transparent padding; original logo colors retained.',
        'assets': assets,
    }, ensure_ascii=False, indent=2) + '\n')
    print(f'Bundled {len(assets)} logos in {OUT}')

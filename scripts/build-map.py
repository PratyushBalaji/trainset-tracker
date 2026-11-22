"""Build the web copy of the Inkscape route map.

Usage:  python scripts/build-map.py "path/to/metro map.svg"

Writes static/maps/namma-metro-layers.svg plus small PNGs in static/maps/assets/ (for the page),
and static/maps/namma-metro-download.svg with those PNGs embedded (one standalone file to download).
- Every Inkscape layer keeps its id and gains data-layer="<layer name>", which the
  Route Map page uses for its show/hide toggles. Rename a layer in Inkscape and the
  toggle follows; add a layer and it appears in the "Other layers" group.
- Hidden layers/images (display:none, e.g. the traced "Original map") are dropped.
- Embedded PNGs are de-duplicated and downscaled to 4x their largest drawn size,
  which takes the file from ~18 MB to a few hundred KB.
- Inkscape/Sodipodi editor metadata is stripped.
"""
import base64
import hashlib
import io
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

from PIL import Image

SVG = 'http://www.w3.org/2000/svg'
XLINK = 'http://www.w3.org/1999/xlink'
INK = 'http://www.inkscape.org/namespaces/inkscape'
SODI = 'http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd'
ET.register_namespace('', SVG)
ET.register_namespace('xlink', XLINK)

root_dir = Path(__file__).resolve().parent.parent
out_svg = root_dir / 'static' / 'maps' / 'namma-metro-layers.svg'
out_download = root_dir / 'static' / 'maps' / 'namma-metro-download.svg'
asset_dir = root_dir / 'static' / 'maps' / 'assets'


def hidden(el: ET.Element) -> bool:
    return 'display:none' in (el.get('style') or '').replace(' ', '')


def main(src: str) -> None:
    tree = ET.parse(src)
    root = tree.getroot()
    parent = {c: p for p in root.iter() for c in p}

    # Drop editor-only and hidden elements.
    for el in list(root.iter()):
        tag = el.tag.split('}')[-1]
        if el is root:
            continue
        if el.tag.startswith('{%s}' % SODI) or tag in ('metadata',) or hidden(el):
            p = parent.get(el)
            if p is not None and el in list(p):
                p.remove(el)

    # Tag layers for the page.
    layers = []
    for el in root.iter('{%s}g' % SVG):
        if el.get('{%s}groupmode' % INK) == 'layer':
            name = el.get('{%s}label' % INK) or el.get('id')
            el.set('data-layer', name)
            layers.append(name)

    # De-duplicate and downscale embedded images.
    asset_dir.mkdir(parents=True, exist_ok=True)
    largest: dict[str, tuple[float, float]] = {}
    images = list(root.iter('{%s}image' % SVG))
    for im in images:
        href = im.get('{%s}href' % XLINK) or im.get('href') or ''
        if href.startswith('data:image'):
            key = hashlib.sha1(href.encode()).hexdigest()[:12]
            w, h = float(im.get('width') or 16), float(im.get('height') or 16)
            pw, ph = largest.get(key, (0, 0))
            largest[key] = (max(pw, w), max(ph, h))
    written = {}
    embedded = {}
    for im in images:
        href = im.get('{%s}href' % XLINK) or im.get('href') or ''
        if not href.startswith('data:image'):
            continue
        key = hashlib.sha1(href.encode()).hexdigest()[:12]
        if key not in written:
            data = base64.b64decode(href.split(',', 1)[1])
            img = Image.open(io.BytesIO(data)).convert('RGBA')
            w, h = largest[key]
            target = (max(1, round(w * 4)), max(1, round(h * 4)))
            if img.width > target[0] or img.height > target[1]:
                img.thumbnail(target, Image.LANCZOS)
            path = asset_dir / f'{key}.png'
            img.save(path, optimize=True)
            embedded[key] = 'data:image/png;base64,' + base64.b64encode(path.read_bytes()).decode()
            written[key] = f'/maps/assets/{key}.png'
        for attr in ('{%s}href' % XLINK, 'href'):
            if attr in im.attrib:
                del im.attrib[attr]
        im.set('href', written[key])

    # Strip editor attributes.
    for el in root.iter():
        for attr in list(el.attrib):
            if attr.startswith('{%s}' % INK) or attr.startswith('{%s}' % SODI):
                del el.attrib[attr]

    text = ET.tostring(root, encoding='unicode')
    text = re.sub(r'\s*-inkscape-[a-z-]+:[^;"]*;?', '', text)
    text = re.sub(r'>\s+<', '><', text)
    out_svg.write_text(text, encoding='utf-8')
    # Standalone copy for download: same drawing, images inlined, licence noted.
    notice = '<!-- Namma Metro map by Pratyush Balaji. CC BY-NC 4.0: free to share and modify, not for commercial use. https://creativecommons.org/licenses/by-nc/4.0/ -->'
    standalone = text
    for key, url in written.items():
        standalone = standalone.replace(f'href="{url}"', f'href="{embedded[key]}"')
    out_download.write_text(notice + standalone, encoding='utf-8')
    print(f'{out_download.relative_to(root_dir)}: {out_download.stat().st_size // 1024} KB')
    print(f'{out_svg.relative_to(root_dir)}: {out_svg.stat().st_size // 1024} KB, {len(written)} images')
    print('Layers:', ', '.join(layers))


if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])

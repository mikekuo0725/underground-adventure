import json, base64, io, os
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.dirname(HERE)

def main():
    with open(os.path.join(HERE, 'manifest.json'), encoding='utf-8') as f:
        manifest = json.load(f)

    lines = ['// 自動產生,勿手動編輯 — 執行 crop_sprites.py 重新產生', 'const SPRITES = {']
    for item in manifest:
        src_path = os.path.join(ASSETS, item['src'])
        im = Image.open(src_path).convert('RGBA')
        box = (item['x'], item['y'], item['x'] + item['w'], item['y'] + item['h'])
        crop = im.crop(box)
        buf = io.BytesIO()
        crop.save(buf, format='PNG')
        b64 = base64.b64encode(buf.getvalue()).decode('ascii')
        lines.append(f"  {item['name']}: 'data:image/png;base64,{b64}',")
        out_preview = os.path.join(HERE, f"preview_{item['name']}.png")
        crop.save(out_preview)
        print(f"  {item['name']}: {item['w']}x{item['h']} <- {item['src']} @({item['x']},{item['y']})  [{len(b64)} base64 chars]  preview: {out_preview}")
    lines.append('};')

    out_path = os.path.join(HERE, 'generated-sprites.js')
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines) + '\n')
    print(f"\n輸出: {out_path}")

if __name__ == '__main__':
    main()

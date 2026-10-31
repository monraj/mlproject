"""Build a photo test set from the Accra Photographic Food Atlas (Folson et al. 2022, CC-BY-4.0).

Each atlas page shows one dish at four weighed portion sizes (S, M, L, X). Under every photo is a
code like "WS-M" (Waakye + Shito, medium); a legend at the bottom gives each code's weight and
foods. This keeps the photos of a single food, so a scan can be scored per food.

    <venv with pymupdf>/bin/python eval/atlas_photos.py path/to/atlas.pdf

Writes eval/atlas/<n>.jpg and eval/atlas/manifest.json (both gitignored: the atlas is large; cite
it if you publish results). Needs PyMuPDF, which the app itself doesn't use.
"""

import json
import re
import sys
from pathlib import Path

import pymupdf  # type: ignore[import-not-found]

OUT = Path(__file__).with_name("atlas")
CODE = re.compile(r"^([A-Z]+)-([SMLX])$")
WEIGHT = re.compile(r"^(\d+)\s?g$")
COUNT = re.compile(r"^\d+\s+(piece|pieces|ball|balls|slice|slices)$", re.I)


def spans(page: "pymupdf.Page") -> list[tuple[str, tuple[float, float, float, float]]]:
    out = []
    for b in page.get_text("dict")["blocks"]:
        for line in b.get("lines", []):
            for s in line["spans"]:
                t = s["text"].strip()
                if t:
                    out.append((t, tuple(s["bbox"])))
    return out


def legend(sp: list[tuple[str, tuple[float, float, float, float]]], top: float) -> dict[str, dict[str, tuple[int, list[str]]]]:
    """prefix -> size -> (grams, foods), read from the legend table below `top`."""
    below = [(t, b) for t, b in sp if b[1] > top]
    # Column headers: "W", "WS-X", "WSTS-X" at the left of each legend column.
    heads = sorted(((t.split("-")[0], b) for t, b in below if re.fullmatch(r"[A-Z]+(-X)?", t) and len(t) > 0 and t not in "SMLX"), key=lambda x: x[1][0])
    letters = [(t, b) for t, b in below if t in ("S", "M", "L", "X")]
    weights = [(int(WEIGHT.match(t).group(1)), b) for t, b in below if WEIGHT.match(t)]  # type: ignore[union-attr]
    names = [(t, b) for t, b in below if not WEIGHT.match(t) and not CODE.match(t) and t not in ("S", "M", "L", "X") and not re.fullmatch(r"[A-Z]+(-X)?|\d+", t)]
    out: dict[str, dict[str, tuple[int, list[str]]]] = {}
    for i, (prefix, hb) in enumerate(heads):
        x0, x1 = hb[0] - 5, (heads[i + 1][1][0] - 5) if i + 1 < len(heads) else 10_000
        col_letters = [(t, b) for t, b in letters if x0 <= b[0] < x1]
        sizes: dict[str, tuple[int, list[str]]] = {}
        for g, wb in weights:
            if not (x0 <= wb[0] < x1) or not col_letters:
                continue
            size = min(col_letters, key=lambda lb: abs((lb[1][0] + lb[1][2]) / 2 - (wb[0] + wb[2]) / 2))[0]
            foods = [t for t, nb in names if x0 <= nb[0] < x1 and nb[0] < wb[0] - 20 and abs(nb[1] - wb[1]) < 14]
            sizes[size] = (g, foods)
        if sizes:
            out[prefix] = sizes
    return out


def main(pdf: Path) -> None:
    OUT.mkdir(exist_ok=True)
    doc = pymupdf.open(pdf)
    manifest = []
    for pno, page in enumerate(doc):
        sp = spans(page)
        codes = [(CODE.match(t), b) for t, b in sp if CODE.match(t)]
        if not codes:
            continue
        rects = [(img[0], r) for img in page.get_images(full=True) for r in page.get_image_rects(img[0])]
        if not rects:
            continue
        bottom = max(r.y1 for _, r in rects)
        table = legend(sp, bottom + 5)
        for xref, r in rects:
            # The code label sits just under its photo.
            near = [(m, b) for m, b in codes if b[1] >= r.y1 - 2 and b[1] - r.y1 < 25 and r.x0 - 5 <= b[0] <= r.x1]
            if not near:
                continue
            m = near[0][0]
            prefix, size = m.group(1), m.group(2)
            entry = table.get(prefix, {}).get(size)
            if not entry:
                continue
            grams, foods = entry
            foods = [f for f in foods if not COUNT.match(f)]
            if len(foods) != 1:
                continue  # single-food photos only
            img = doc.extract_image(xref)
            name = f"{len(manifest):04d}.{img['ext']}"
            (OUT / name).write_bytes(img["image"])
            manifest.append({"file": name, "food": foods[0], "size": size, "grams": grams, "page": pno + 1, "code": f"{prefix}-{size}"})
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=1))
    print(f"{len(manifest)} single-food photos from {len({m['food'] for m in manifest})} foods")


if __name__ == "__main__":
    main(Path(sys.argv[1]))

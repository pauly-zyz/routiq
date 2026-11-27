"""Assemble rendered PNG frames into a small, smooth, looping GIF.

- One global 255-colour palette for all frames (no flicker between frames).
- Ordered (Bayer) dithering: smooth gradients, and pixels that do not change stay identical frame to frame.
- Only changed pixels are stored per frame; the rest are transparent (index 255) over the previous frame.

Usage: python3 make_gif.py <frames_dir> <out.gif> <frame_ms> [dither_strength]
"""
import glob
import os
import sys

import numpy as np
from PIL import Image, features

frames_dir, out, frame_ms = sys.argv[1], sys.argv[2], int(sys.argv[3])
strength = float(sys.argv[4]) if len(sys.argv) > 4 else 8.0

paths = sorted(glob.glob(f"{frames_dir}/f*.png"))
frames = [np.asarray(Image.open(p).convert("RGB"), dtype=np.float32) for p in paths]
h, w, _ = frames[0].shape

# Global palette from a sample of frames.
sample = np.concatenate([f[::2, ::2] for f in frames[:: max(1, len(frames) // 8)]], axis=0)
# Small accents (status green, brand violet/cyan, white) cover few pixels, so give them weight in the palette:
# blend each with the dark background at several strengths and add those swatches to the sample.
BG = np.array([5, 11, 10], dtype=np.float32)
accents = [(52, 211, 153), (124, 92, 255), (94, 139, 255), (56, 217, 245), (255, 255, 255), (155, 133, 255), (151, 252, 228), (14, 46, 40)]
swatches = []
for c in accents:
    for a in np.linspace(0.15, 1.0, 12):
        swatches.append(np.full((24, sample.shape[1], 3), BG + (np.array(c, dtype=np.float32) - BG) * a))
sample = np.concatenate([sample, *swatches], axis=0).astype(np.uint8)
method = Image.Quantize.LIBIMAGEQUANT if features.check("libimagequant") else Image.Quantize.MEDIANCUT
pal_img = Image.fromarray(sample).quantize(colors=255, method=method, dither=Image.Dither.NONE)
palette = pal_img.getpalette()[: 255 * 3] + [0, 0, 0]  # index 255 = transparent
pal_ref = Image.new("P", (1, 1))
pal_ref.putpalette(palette)

# 8x8 Bayer threshold map in [-0.5, 0.5).
b = np.array([[0, 2], [3, 1]])
for _ in range(2):
    b = np.block([[4 * b, 4 * b + 2], [4 * b + 3, 4 * b + 1]])
bayer = (b / 64.0 - 0.5)[..., None]
tile = np.tile(bayer, (h // 8 + 1, w // 8 + 1, 1))[:h, :w]

def to_index(rgb):
    dithered = np.clip(rgb + tile * strength, 0, 255).astype(np.uint8)
    q = Image.fromarray(dithered).quantize(palette=pal_ref, dither=Image.Dither.NONE)
    idx = np.asarray(q).copy()
    idx[idx == 255] = 254  # never emit the transparent index from real pixels
    return idx

indexed = [to_index(f) for f in frames]
out_frames = []
prev = None
for idx in indexed:
    if prev is None:
        data = idx
    else:
        data = idx.copy()
        data[idx == prev] = 255
    im = Image.fromarray(data, mode="P")
    im.putpalette(palette)
    out_frames.append(im)
    prev = idx

out_frames[0].save(
    out, save_all=True, append_images=out_frames[1:], duration=frame_ms, loop=0,
    transparency=255, disposal=1, optimize=False,
)

# Verify: decode the GIF and compare every composited frame with the intended indexed frame.
check = Image.open(out)
worst = 0
for i, idx in enumerate(indexed):
    check.seek(i)
    got = np.asarray(check.convert("RGB"), dtype=np.int16)
    exp = np.array(palette, dtype=np.int16).reshape(-1, 3)[idx]
    worst = max(worst, int(np.abs(got - exp).max()))
print(f"{out}: {len(frames)} frames, {w}x{h}, {os.path.getsize(out) / 1e6:.2f} MB, max pixel error after decode = {worst}")

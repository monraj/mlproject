"""Makes the picker preview for PlateWise Flip from a screenshot of the face on a watch.

The calories flap is repainted with a sample number, so no one's own data ships in the app.

Run: python3 gen_preview.py screenshot.png src/main/res/drawable-nodpi/preview.png
"""
import sys
from PIL import Image, ImageDraw, ImageFont

F = "src/main/res/font/"
shot = Image.open(sys.argv[1]).convert("RGBA")
s = shot.width / 450  # screenshots are 480 px; the face is designed at 450
d = ImageDraw.Draw(shot)
x0, y0, x1, y1 = (int(v * s) for v in (230, 72, 322, 114))
d.rounded_rectangle((x0, y0, x1, y1), radius=int(10 * s), fill=(45, 41, 36))
d.rectangle((x0, (y0 + y1) // 2 - 1, x1, (y0 + y1) // 2 + 1), fill=(5, 5, 5))
d.text(((x0 + x1) / 2, y0 + 13 * s), "1,240", font=ImageFont.truetype(F + "jakarta_extrabold.ttf", int(20 * s)), fill=(243, 233, 210), anchor="mm")
d.text(((x0 + x1) / 2, y0 + 33 * s), "left", font=ImageFont.truetype(F + "jakarta_semibold.ttf", int(11 * s)), fill=(50, 213, 131), anchor="mm")
mask = Image.new("L", shot.size, 0)
ImageDraw.Draw(mask).ellipse((0, 0, shot.width - 1, shot.height - 1), fill=255)
out = Image.new("RGBA", shot.size, (0, 0, 0, 0))
out.paste(shot, mask=mask)
out.resize((450, 450), Image.LANCZOS).save(sys.argv[2])

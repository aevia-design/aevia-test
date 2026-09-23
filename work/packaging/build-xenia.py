"""Build envelope-xenia.html from its template, inlining the real vector lockup.

The lockup SVG is Xenia's `logotype 1 - aevia - vector.svg` with its two hardcoded
inks swapped for `currentColor`, so one file serves both stock colours and both
treatments: the CSS sets `color` and the shape follows.
"""
import pathlib
import re

here = pathlib.Path(__file__).parent
repo = here.parent.parent

svg = (repo / 'assets/images/logotype 1 - aevia - vector.svg').read_text(encoding='utf-8')
svg = svg.replace('rgb(35,31,32)', 'currentColor').replace('rgb(38,38,38)', 'currentColor')
# drop the XML prolog and DOCTYPE so it can be inlined into HTML
svg = svg[svg.index('<svg'):]
# the source sets width/height to 100%; let the wrapper's width drive it instead
svg = re.sub(r'<svg width="100%" height="100%"', '<svg', svg, count=1)

PARAGRAPH = [
    'In a world made to be scrolled past, we still believe in things worth holding.',
    'Inside is a piece of your life, gathered gently into pages.',
    'Created with artists. Drawn by hand, not generated.',
    'Made with responsibly sourced paper.',
    'You bring the memories. We make the book.',
]

STOCKS = [
    ('#8b6649', 'Warm sienna', 'Lighter, redder. The lockup reads at a glance; the printed lines have room.'),
    ('#654b41', 'Deep umber', 'Darker, cooler. More object than paper, and it swallows tone-on-tone print.'),
]


def envelope(hex_code, name, note):
    lines = '\n'.join('        <p>{}</p>'.format(line) for line in PARAGRAPH)
    return f"""  <figure>
    <div class="env" style="--stock:{hex_code}">
      <div class="flap"></div>
      <div class="string"></div><div class="string b"></div><div class="tail"></div>
      <div class="washer w-top"><i></i></div>
      <div class="washer w-bot"><i></i></div>

      <div class="el url small deb">aevia.at</div>
      <div class="el origin small deb">est. 2026<br>Vienna</div>
      <div class="el lock r-deb">{svg}</div>
      <div class="el para small deb">
{lines}
      </div>
    </div>
    <figcaption><b>{name}</b><span>{hex_code.upper()}</span></figcaption>
    <figcaption style="margin-top:6px;display:block;line-height:1.5;">{note}</figcaption>
  </figure>"""


tpl = (here / 'envelope-xenia.tpl.html').read_text(encoding='utf-8')
out = tpl.replace('{{ENVELOPES}}', '\n'.join(envelope(*s) for s in STOCKS))
(here / 'envelope-xenia.html').write_text(out, encoding='utf-8')
print('wrote envelope-xenia.html', len(out), 'chars')

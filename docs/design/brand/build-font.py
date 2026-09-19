"""Builds apps/web/src/fonts/fraunces-toli.woff2, the display face.

One static instance of Fraunces (OFL), subset to the Latin the UI uses. Add code points to UNICODES when
copy needs them, then rerun:

    pip install fonttools brotli
    curl -L -o Fraunces.ttf 'https://github.com/google/fonts/raw/main/ofl/fraunces/Fraunces%5BSOFT%2CWONK%2Copsz%2Cwght%5D.ttf'
    python docs/design/brand/build-font.py Fraunces.ttf apps/web/src/fonts/fraunces-toli.woff2
"""
import sys

from fontTools.subset import Options, Subsetter
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

INSTANCE = dict(opsz=72, wght=450, SOFT=100, WONK=0)
# Basic Latin, nbsp, middle dot, en and em dash, curly quotes, ellipsis, rupee.
UNICODES = [*range(0x20, 0x7F), 0xA0, 0xB7, 0x2013, 0x2014, 0x2018, 0x2019, 0x201C, 0x201D, 0x2026, 0x20B9]

src, out = sys.argv[1], sys.argv[2]
font = instantiateVariableFont(TTFont(src), INSTANCE, inplace=False)
options = Options()
options.flavor = 'woff2'
options.layout_features = ['kern', 'liga', 'calt', 'ccmp', 'locl', 'mark', 'mkmk']
subsetter = Subsetter(options)
subsetter.populate(unicodes=UNICODES)
subsetter.subset(font)
font.flavor = 'woff2'
font.save(out)

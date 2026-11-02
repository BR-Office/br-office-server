# PKT-0069: patch a COPY of sdkjs/cell/sdk-all.js with a memo cache on FragmentShaper.shapeFragment,
# keyed by (font name, size, bold/italic, PPI, code points). On a hit it replays what
# private_HandleItem wrote (grapheme, width, char per index) instead of shaping with HarfBuzz.
# Usage: python3 -I sdkjs-shape-cache.py <copy of sdk-all.js>   (never the installed file)
# Stats: set env SHAPE_CACHE_STATS=1 is not possible in x2t; hits/misses are kept on FragmentShaper.__s.
import sys
p = sys.argv[1]; s = open(p, encoding='utf-8').read()
old = 'FragmentShaper.prototype.shapeFragment=function(chars,font,stringRenderer,beginIndex){'
assert s.count(old) == 1, 'anchor not found'
new = ('FragmentShaper.prototype.shapeFragment=function(chars,font,sr,b){'
 'var C=FragmentShaper.__c||(FragmentShaper.__c=new Map),S=FragmentShaper.__s||(FragmentShaper.__s={h:0,m:0});'
 'var k=font.getName()+"\\u0001"+font.getSize()+"\\u0001"+((font.getBold()?1:0)|(font.getItalic()?2:0))+"\\u0001"+sr.drawingCtx.getPPIY()+"\\u0001"+chars.join(",");'
 'var e=C.get(k);if(e){S.h++;this.font=font;this.stringRenderer=sr;for(var i=0;i<e.length;i+=3){var idx=b+e[i],pr=sr._getCharPropAt(idx);pr.grapheme=e[i+1];pr.idx=idx;sr.charWidths[idx]=e[i+2];sr.chars[idx]=chars[e[i]]}return}'
 'S.m++;var rec=[],orig=this.private_HandleItem;this.private_HandleItem=function(o,g,w){rec.push(o.idx-b,g,w);orig.call(this,o,g,w)};'
 'try{this.__raw(chars,font,sr,b)}finally{delete this.private_HandleItem}if(C.size<200000)C.set(k,rec)};'
 'FragmentShaper.prototype.__raw=function(chars,font,stringRenderer,beginIndex){')
open(p, 'w', encoding='utf-8').write(s.replace(old, new)); print('patched', p)

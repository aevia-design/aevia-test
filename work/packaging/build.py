import io, pathlib
here = pathlib.Path(__file__).parent
logo = (here/'logo_full.b64').read_text()
mark = (here/'logo_mark.b64').read_text()
tpl = (here/'packaging.tpl.html').read_text(encoding='utf-8')
out = tpl.replace('{{LOGO}}', logo).replace('{{MARK}}', mark)
(here/'packaging.html').write_text(out, encoding='utf-8')
print('wrote', len(out))

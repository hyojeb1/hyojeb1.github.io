"""Check local references and the exact GitHub Pages artifact allowlist."""
from html.parser import HTMLParser
from pathlib import Path
from tempfile import TemporaryDirectory
from urllib.parse import urlsplit, unquote
import re
from runpy import run_path

ROOT = Path(__file__).resolve().parent.parent
packager = run_path(str(ROOT / 'scripts/build-site.py'))


class References(HTMLParser):
    def __init__(self):
        super().__init__()
        self.urls = []
        self.ids = set()

    def handle_starttag(self, tag, attrs):
        for name, value in attrs:
            if name in ('href', 'src', 'poster') and value:
                self.urls.append(value)
            if name == 'id':
                self.ids.add(value)


def check(output):
    errors = []
    count = 0

    def reference(source, url):
        nonlocal count
        parsed = urlsplit(url)
        if parsed.scheme or parsed.netloc or not parsed.path:
            return
        path = unquote(parsed.path)
        target = (output / path.lstrip('/') if path.startswith('/') else source.parent / path).resolve()
        if not target.is_relative_to(output):
            errors.append(f'{source.relative_to(output)} escapes artifact: {url}')
            return
        if target.is_dir():
            target /= 'index.html'
        count += 1
        if not target.is_file():
            errors.append(f'{source.relative_to(output)} missing: {url}')

    for page in output.rglob('*.html'):
        parser = References()
        parser.feed(page.read_text(encoding='utf-8'))
        for url in parser.urls:
            reference(page, url)
    for css in output.rglob('*.css'):
        for url in re.findall(r'url\(\s*[\'\"]?([^\)\'\"]+)', css.read_text(encoding='utf-8')):
            reference(css, url.strip())
    for script in (output / 'home').glob('*.js'):
        for url in re.findall(r'from\s+[\'\"]([^\'\"]+)', script.read_text(encoding='utf-8')):
            reference(script, url)
    assert {p.name for p in output.iterdir()} == set(packager['PUBLIC_PATHS']), 'Unexpected top-level deployment files'
    for name in ('Playground', 'data', 'docs', 'scripts', '.git', 'AGENTS.md', 'DESIGN.md', 'README.md'):
        assert not (output / name).exists(), f'Private/source path in deployment: {name}'
    portfolio = (output / 'portfolio/index.html').read_text(encoding='utf-8')
    assert portfolio.count('<article ') == 6, 'All six portfolio cards must survive'
    assert 'href="../style.css"' in portfolio
    for detail in (output / 'works').glob('*.html'):
        assert '../index.html#works' not in detail.read_text(encoding='utf-8'), 'Stale portfolio return link'
    assert not errors, '\n'.join(errors)
    print(f'PASS: {count} local references; six portfolio cards; exact public artifact allowlist')


if __name__ == '__main__':
    with TemporaryDirectory(prefix='hyoje-site-check-') as scratch:
        output = packager['package_site'](Path(scratch) / 'site')
        check(output)

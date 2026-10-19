"""Package the explicit public allowlist, never the repository root."""
from pathlib import Path
import argparse
import shutil

ROOT = Path(__file__).resolve().parent.parent
PUBLIC_PATHS = ('index.html', 'style.css', 'home', 'portfolio', 'assets', 'works', 'chess', 'travel')


def package_site(output):
    output = Path(output).resolve()
    if output == ROOT or ROOT.is_relative_to(output):
        raise ValueError('Output must not contain the source repository')
    if any(output == ROOT / name or output.is_relative_to(ROOT / name) for name in PUBLIC_PATHS):
        raise ValueError('Output must not be inside a public source directory')
    if output.exists() and any(output.iterdir()):
        raise ValueError('Choose an empty output directory; existing files are never deleted')
    output.mkdir(parents=True, exist_ok=True)
    for name in PUBLIC_PATHS:
        source = ROOT / name
        if source.is_dir():
            shutil.copytree(source, output / name)
        else:
            shutil.copy2(source, output / name)
    return output


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', default=str(ROOT / '_site'))
    args = parser.parse_args()
    print(f'Packaged public site: {package_site(args.output)}')

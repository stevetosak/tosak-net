"""Build the reference page: inline base.css and the generated model parts into page.html.

Run: python3 -I reference/build.py   (from any directory; writes reference/index.html)
"""
import importlib.util
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent


def load_parts():
    spec = importlib.util.spec_from_file_location('parts', ROOT / 'parts.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.parts()


def main():
    page = (ROOT / 'page.html').read_text()
    page = page.replace('/*BASE*/', (ROOT / 'base.css').read_text())
    for marker, markup in load_parts().items():
        page = page.replace(marker, markup)
    (ROOT / 'index.html').write_text(page)
    print('built reference/index.html', len(page) // 1024, 'KB')


if __name__ == '__main__':
    main()

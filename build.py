#!/usr/bin/env python3
"""Render the astrolol landing page for every configured language.

Reads content/shared.json (structural data common to every language) and
content/<code>.json (per-language copy), merges them, and renders
templates/page.html.j2 once per language into dist/.

Usage: python3 build.py [--out dist]
"""
import argparse
import json
import shutil
from pathlib import Path

from jinja2 import Environment, FileSystemLoader

ROOT = Path(__file__).resolve().parent


def load_json(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def merge_by_id(shared_items, translations):
    """shared_items: list of dicts with an 'id'. translations: dict keyed by id."""
    merged = []
    for item in shared_items:
        row = dict(item)
        row.update(translations.get(item["id"], {}))
        merged.append(row)
    return merged


def build(out_dir):
    shared = load_json(ROOT / "content" / "shared.json")
    languages = shared["languages"]
    lang_codes = {l["code"] for l in languages}

    env = Environment(loader=FileSystemLoader(str(ROOT / "templates")), autoescape=False)
    template = env.get_template("page.html.j2")

    out_dir = Path(out_dir)
    if out_dir.exists():
        shutil.rmtree(out_dir)
    out_dir.mkdir(parents=True)

    for lang in languages:
        code = lang["code"]
        content = load_json(ROOT / "content" / f"{code}.json")

        if content["html_lang"] != code:
            raise ValueError(f"content/{code}.json html_lang does not match its language code")

        slides = merge_by_id(shared["slides"], content["slides"])
        gallery_items = merge_by_id(shared["gallery"], content["gallery"]["items"])

        page_dir = out_dir if lang["url"] == "/" else out_dir / lang["url"].strip("/")
        page_dir.mkdir(parents=True, exist_ok=True)

        html = template.render(
            lang=code,
            html_lang=content["html_lang"],
            languages=languages,
            site_url=shared["site_url"],
            github_url=shared["github_url"],
            github_install_url=shared["github_install_url"],
            github_readme_url=shared["github_readme_url"],
            current_path=lang["url"],
            languages_json=json.dumps([{"code": l["code"], "url": l["url"]} for l in languages]),
            plugin_chips=shared["plugin_chips"],
            slides=slides,
            gallery_items=gallery_items,
            meta=content["meta"],
            nav=content["nav"],
            hero=content["hero"],
            features=content["features"],
            start=content["start"],
            gallery=content["gallery"],
            plugins=content["plugins"],
            footer=content["footer"],
            lightbox_close=content["lightbox_close"],
        )
        (page_dir / "index.html").write_text(html, encoding="utf-8")
        print(f"wrote {page_dir / 'index.html'}")

    # Static assets, copied as-is alongside the generated pages.
    for name in ("css", "assets", "screenshots", "js"):
        shutil.copytree(ROOT / name, out_dir / name)
    cname = ROOT / "CNAME"
    if cname.exists():
        shutil.copy(cname, out_dir / "CNAME")

    print(f"\nBuilt {len(languages)} language(s) into {out_dir}/")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default="dist")
    args = parser.parse_args()
    build(ROOT / args.out)

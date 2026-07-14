#!/usr/bin/env python3
"""Structural slide operations on an UNPACKED .pptx (no external skill needed).

A .pptx is a zip. Unpack it first:
    python -m zipfile -e deck.pptx unpacked/
then operate on the folder, then repack:
    python -m zipfile -c out.pptx unpacked/.

Subcommands
-----------
  list       unpacked/                         show slide order + slide parts on disk
  duplicate  unpacked/ slide3.xml [--after slide7.xml | --end]
                                                copy a slide with all bookkeeping
  keep       unpacked/ --order s1.xml,s5.xml,s9.xml
                                                set the final deck to exactly these slides,
                                                in this order, and delete every other slide

Standard library + defusedxml only. No LibreOffice, no admin.
The <p:sldIdLst> is edited as text on purpose: minidom drops an unprefixed `id`
attribute on a prefixed element, and etree rewrites namespace prefixes — both corrupt
the deck. Content-Types and .rels (default-namespace, no such quirk) use minidom.
"""
import argparse
import os
import re
import shutil
import sys
from defusedxml.minidom import parse

SLIDE_CT = "application/vnd.openxmlformats-officedocument.presentationml.slide+xml"
SLIDE_REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide"


def _p(*a):
    return os.path.join(*a)


def _slides_dir(u):
    return _p(u, "ppt", "slides")


def _pres_path(u):
    return _p(u, "ppt", "presentation.xml")


def _pres_rels_path(u):
    return _p(u, "ppt", "_rels", "presentation.xml.rels")


def _ct_path(u):
    return _p(u, "[Content_Types].xml")


def _load(path):
    return parse(path)


def _save(doc, path):
    with open(path, "wb") as f:
        f.write(doc.toxml(encoding="UTF-8"))


def _slide_files(u):
    d = _slides_dir(u)
    return sorted(
        [f for f in os.listdir(d) if re.fullmatch(r"slide\d+\.xml", f)],
        key=lambda f: int(re.search(r"\d+", f).group()),
    )


def _next_slide_index(u):
    nums = [int(re.search(r"\d+", f).group()) for f in _slide_files(u)]
    return (max(nums) + 1) if nums else 1


def _rel_map(u):
    """rId -> slide filename (basename) for slide relationships (read-only)."""
    doc = _load(_pres_rels_path(u))
    return {r.getAttribute("Id"): os.path.basename(r.getAttribute("Target"))
            for r in doc.getElementsByTagName("Relationship")
            if r.getAttribute("Type") == SLIDE_REL}


def _next_rid(u):
    doc = _load(_pres_rels_path(u))
    ids = [int(m.group(1)) for r in doc.getElementsByTagName("Relationship")
           if (m := re.fullmatch(r"rId(\d+)", r.getAttribute("Id")))]
    return f"rId{(max(ids) + 1) if ids else 1}"


# ---- <p:sldIdLst> handled as text -----------------------------------------
def _get_sldidlst(u):
    """Return ordered [(id, rid)] from presentation.xml."""
    text = open(_pres_path(u), encoding="utf-8").read()
    m = re.search(r"<p:sldIdLst\b[^>]*>(.*?)</p:sldIdLst>", text, re.S)
    entries = []
    if m:
        for sm in re.finditer(r"<p:sldId\b([^>]*?)/?>", m.group(1)):
            a = sm.group(1)
            i = re.search(r'\bid="([^"]*)"', a)
            r = re.search(r'r:id="([^"]*)"', a)
            if r:
                entries.append((i.group(1) if i else "", r.group(1)))
    return entries


def _set_sldidlst(u, entries):
    """Rewrite <p:sldIdLst> to exactly `entries` (list of (id, rid))."""
    path = _pres_path(u)
    text = open(path, encoding="utf-8").read()
    inner = "".join(f'<p:sldId id="{i}" r:id="{r}"/>' for i, r in entries)
    block = f"<p:sldIdLst>{inner}</p:sldIdLst>"
    new, n = re.subn(r"<p:sldIdLst\s*/>|<p:sldIdLst\b[^>]*>.*?</p:sldIdLst>",
                     block, text, count=1, flags=re.S)
    if n != 1:
        sys.exit("error: could not locate <p:sldIdLst> in presentation.xml")
    with open(path, "w", encoding="utf-8") as f:
        f.write(new)


# --------------------------------------------------------------------------- list
def cmd_list(args):
    rmap = _rel_map(args.unpacked)
    order = _get_sldidlst(args.unpacked)
    print("Deck order (sldIdLst):")
    for idx, (sid, rid) in enumerate(order, 1):
        print(f"  {idx:>2}. {rmap.get(rid, '??'):<16} (sldId={sid}, {rid})")
    on_disk = set(_slide_files(args.unpacked))
    in_order = {rmap.get(rid) for _, rid in order}
    extra = sorted(on_disk - in_order)
    if extra:
        print("On disk but NOT in order:", ", ".join(extra))


# ---------------------------------------------------------------------- duplicate
def cmd_duplicate(args):
    u = args.unpacked
    src = os.path.basename(args.source)
    sdir = _slides_dir(u)
    if not os.path.exists(_p(sdir, src)):
        sys.exit(f"error: {src} not found in ppt/slides/")
    new = f"slide{_next_slide_index(u)}.xml"

    # 1. copy slide xml + rels (duplicated slide shares source media/chart parts)
    shutil.copyfile(_p(sdir, src), _p(sdir, new))
    src_rels = _p(sdir, "_rels", src + ".rels")
    if os.path.exists(src_rels):
        os.makedirs(_p(sdir, "_rels"), exist_ok=True)
        shutil.copyfile(src_rels, _p(sdir, "_rels", new + ".rels"))

    # 2. content types: Override
    ct = _load(_ct_path(u))
    ov = ct.createElement("Override")
    ov.setAttribute("PartName", f"/ppt/slides/{new}")
    ov.setAttribute("ContentType", SLIDE_CT)
    ct.getElementsByTagName("Types")[0].appendChild(ov)
    _save(ct, _ct_path(u))

    # 3. presentation rels: relationship
    rid = _next_rid(u)
    rels = _load(_pres_rels_path(u))
    rel = rels.createElement("Relationship")
    rel.setAttribute("Id", rid)
    rel.setAttribute("Type", SLIDE_REL)
    rel.setAttribute("Target", f"slides/{new}")
    rels.getElementsByTagName("Relationships")[0].appendChild(rel)
    _save(rels, _pres_rels_path(u))

    # 4. sldIdLst: insert (text-based)
    entries = _get_sldidlst(u)
    ids = [int(i) for i, _ in entries if i.isdigit()]
    new_id = str(max(ids + [255]) + 1)
    pos = len(entries)
    if args.after and not args.end:
        rmap = _rel_map(u)
        anchor = os.path.basename(args.after)
        for k, (_, r) in enumerate(entries):
            if rmap.get(r) == anchor:
                pos = k + 1
                break
    entries.insert(pos, (new_id, rid))
    _set_sldidlst(u, entries)
    print(f"Created ppt/slides/{new} from {src}  ({rid}, sldId={new_id})")


# --------------------------------------------------------------------------- keep
def cmd_keep(args):
    u = args.unpacked
    order = [os.path.basename(x.strip()) for x in args.order.split(",") if x.strip()]
    file_to_rid = {v: k for k, v in _rel_map(u).items()}
    for f in order:
        if f not in file_to_rid:
            sys.exit(f"error: {f} has no relationship in presentation.xml.rels")

    # rewrite sldIdLst (text-based)
    _set_sldidlst(u, [(str(256 + i), file_to_rid[f]) for i, f in enumerate(order)])

    # delete non-kept slides: files, rels, Override, presentation relationship
    keep = set(order)
    to_delete = [f for f in _slide_files(u) if f not in keep]
    sdir = _slides_dir(u)
    for f in to_delete:
        os.remove(_p(sdir, f))
        r = _p(sdir, "_rels", f + ".rels")
        if os.path.exists(r):
            os.remove(r)

    ct = _load(_ct_path(u))
    for ov in list(ct.getElementsByTagName("Override")):
        pn = ov.getAttribute("PartName")
        if pn.startswith("/ppt/slides/") and os.path.basename(pn) in to_delete:
            ov.parentNode.removeChild(ov)
    _save(ct, _ct_path(u))

    rels = _load(_pres_rels_path(u))
    for rel in list(rels.getElementsByTagName("Relationship")):
        if rel.getAttribute("Type") == SLIDE_REL and \
                os.path.basename(rel.getAttribute("Target")) in to_delete:
            rel.parentNode.removeChild(rel)
    _save(rels, _pres_rels_path(u))

    print(f"Kept {len(order)} slide(s); deleted {len(to_delete)}: "
          f"{', '.join(to_delete) if to_delete else '(none)'}")
    print("Note: unreferenced media parts are left in place (harmless).")


def main():
    ap = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    p = sub.add_parser("list"); p.add_argument("unpacked"); p.set_defaults(func=cmd_list)
    p = sub.add_parser("duplicate")
    p.add_argument("unpacked"); p.add_argument("source")
    p.add_argument("--after"); p.add_argument("--end", action="store_true")
    p.set_defaults(func=cmd_duplicate)
    p = sub.add_parser("keep")
    p.add_argument("unpacked"); p.add_argument("--order", required=True)
    p.set_defaults(func=cmd_keep)
    args = ap.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()

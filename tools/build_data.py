#!/usr/bin/env python3
"""
Build data/records.json from your student list (Excel or CSV).

    python tools/build_data.py path/to/students.xlsx

- Reads every sheet. Each row needs a Name and a SAP ID (9 digits, e.g. 590012345).
- Fixes swapped Name/SAP columns and pulls a SAP ID out of messy cells.
- Removes exact duplicates (ignoring upper/lower case and extra spaces).
- Writes ONLY salted PBKDF2 hashes of "SAPID|normalised name" -- no names or SAP IDs
  ever appear in the published site.
- Writes tools/needs_review.csv (git-ignored) listing rows that could not be used.
"""
import sys, re, csv, json, os, hashlib, secrets, unicodedata
from multiprocessing import Pool

ITER = 100_000
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'data', 'records.json')

def norm_name(s):
    s = unicodedata.normalize('NFKC', str(s)).lower()
    s = ''.join(ch for ch in s if unicodedata.category(ch)[0] in 'LN' or ch.isspace())
    return ' '.join(s.split())

def norm_sap(s):
    return re.sub(r'\s+', '', str(s)).upper()

def read_rows(path):
    ext = os.path.splitext(path)[1].lower()
    if ext in ('.xlsx', '.xlsm'):
        import openpyxl
        wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
        for ws in wb:
            for i, r in enumerate(ws.iter_rows(values_only=True)):
                if i == 0 or not r or all(c is None for c in r):
                    continue
                yield ws.title, [('' if c is None else str(c).strip()) for c in r[:2]]
    else:
        with open(path, newline='', encoding='utf-8-sig') as f:
            for i, r in enumerate(csv.reader(f)):
                if i == 0 or not r:
                    continue
                yield 'csv', [c.strip() for c in r[:2]]

SAP_RE = re.compile(r'(?<!\d)(\d{9})(?!\d)')

def clean(name, sap):
    """Return (name, sap, note) or (None, None, reason)."""
    name, sap = name.strip(), sap.strip()
    # swapped columns
    if re.fullmatch(r'\d{6,}', name) and not re.search(r'\d', sap):
        name, sap = sap, name
    m = SAP_RE.search(sap)
    if not m:
        return None, None, 'SAP ID is not a 9-digit number'
    if re.search(r'\d', name) or not norm_name(name):
        return None, None, 'Name is empty or contains digits'
    return name, m.group(1), ''

def h(args):
    key, salt = args
    return hashlib.pbkdf2_hmac('sha256', key.encode(), salt, ITER).hex()

def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    seen, keep, review = set(), [], []
    for sheet, (n, s) in read_rows(sys.argv[1]):
        name, sap, why = clean(n, s)
        if not name:
            review.append((sheet, n, s, why)); continue
        k = (sap, norm_name(name))
        if k in seen: continue
        seen.add(k); keep.append(k)
    salt = secrets.token_bytes(16)
    with Pool() as p:
        hashes = p.map(h, [(f'{s}|{n}', salt) for s, n in keep], chunksize=50)
    hashes.sort()  # order must not reveal the spreadsheet order
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w') as f:
        json.dump({'v': 1, 'iter': ITER, 'salt': salt.hex(), 'count': len(hashes), 'hashes': hashes}, f, separators=(',', ':'))
    with open(os.path.join(HERE, 'needs_review.csv'), 'w', newline='') as f:
        w = csv.writer(f); w.writerow(['Sheet', 'Name (as in file)', 'SAP ID (as in file)', 'Problem']); w.writerows(review)
    saps = {}
    for s, n in keep: saps.setdefault(s, []).append(n)
    shared = {s: v for s, v in saps.items() if len(v) > 1}
    print(f'Wrote {len(hashes)} certificate records -> data/records.json')
    print(f'{len(review)} rows could not be used -> tools/needs_review.csv')
    print(f'{len(shared)} SAP IDs are shared by 2+ different names (all kept; each person still needs their own name + ID to match)')
    with open(os.path.join(HERE, 'shared_sap_ids.csv'), 'w', newline='') as f:
        w = csv.writer(f); w.writerow(['SAP ID', 'Names sharing it'])
        for s_, v in sorted(shared.items()): w.writerow([s_, ' | '.join(v)])

if __name__ == '__main__':
    main()

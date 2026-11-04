# SIH 2026 – Certificate Portal (GitHub Pages)

Students enter **Name + SAP ID** → if the pair is on the participant list, their name is printed onto your template in the browser and they can download it as **PDF** or **PNG**.
No server, no database, free hosting on GitHub Pages.

## Put it live (5 minutes)
1. Create a new **public** GitHub repo and upload everything in this folder (keep `.gitignore`).
2. Repo → **Settings → Pages → Build and deployment → Source: "Deploy from a branch"**, branch `main`, folder `/ (root)` → Save.
3. After a minute your site is at `https://<username>.github.io/<repo>/`. Share that link.

## Is the student list exposed?
No. `data/records.json` holds only salted, slow (PBKDF2 × 100,000) hashes of `SAPID|name`. Names and SAP IDs are never published, and the file can't be browsed as a list. A student can only get a certificate by already knowing their own name **and** SAP ID. **Never commit your Excel file** — `.gitignore` blocks `.xlsx/.csv`.

## Updating the student list
```bash
pip install openpyxl
python tools/build_data.py path/to/students.xlsx
git add data/records.json && git commit -m "Update list" && git push
```
The script fixes swapped Name/SAP columns, pulls a SAP ID out of messy cells, removes case/space duplicates, and writes `tools/needs_review.csv` (rows with invalid SAP IDs) for you to fix. Different students sharing one SAP ID are all kept; each still needs their own name + ID to match.

## Changing the certificate
- The certificate is your own template image: `assets/certificate-template.jpg`. To use a sharper export (e.g. 2560×1808 from Canva), just replace that file — the name position is stored as percentages, so any size works.
- Name position, size and colour: `js/config.js` (`name.yPct` moves it up/down).
- Website look (dark theme): `css/style.css`.

## Test locally
Browsers block `fetch` from `file://`, so run: `python -m http.server 8000` and open http://localhost:8000

## Limits of a static site (be aware)
- No admin dashboard, no download counts, no "one download per student" — GitHub Pages cannot store anything. (Your original Node/SQLite system does those, but needs a paid/always-on host.)
- Anyone who knows a classmate's name and SAP ID can generate that certificate. That's inherent to name+SAP verification.
- Names print as typed (Title Case). Latin-script names only (Alegreya).

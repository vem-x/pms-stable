"""
Upload Marketing Directorate competency framework to review_traits.
Source: docs/competency framework for ERP (MARKETING DIRECTORATE).xlsx
Target org: 0ba26bae-d1fe-45a5-9d87-cebe7df421c6 (Marketing and Business Development, DIRECTORATE)
"""

import uuid
import openpyxl
import psycopg2

XLSX_PATH = "../docs/competency framework for ERP (MARKETING DIRECTORATE.xlsx"
ORG_ID = "0ba26bae-d1fe-45a5-9d87-cebe7df421c6"
CREATED_BY = "e14ddf17-f88d-46f5-a9f2-7fda6973ccdf"  # admin@nigcomsat.gov.ng

# Competency column indices (0-based)
COMP_COLS = [3, 6, 8, 11, 12]

# ── 1. Parse spreadsheet ─────────────────────────────────────────────────────

wb = openpyxl.load_workbook(XLSX_PATH)
ws = wb["Sheet1"]

competencies = {}  # normalized_name -> (display_name, employees[])

for i, row in enumerate(ws.iter_rows(values_only=True)):
    if i < 3:
        continue  # skip title, header, numbering rows
    employee_name = row[0]
    if not employee_name:
        continue
    employee_name = " ".join(employee_name.strip().split())

    for col in COMP_COLS:
        val = row[col]
        if not val:
            continue
        display = " ".join(val.strip().split())
        key = display.upper()
        if key not in competencies:
            competencies[key] = {"display": display, "employees": []}
        competencies[key]["employees"].append(employee_name)

print(f"Parsed {len(competencies)} unique competencies from spreadsheet.")

# ── 2. Upload to DB ───────────────────────────────────────────────────────────

conn = psycopg2.connect(
    host="160.226.0.67",
    dbname="pms_db",
    user="pms_user",
    password="pms_password",
)
cur = conn.cursor()

# Check existing to avoid duplicates
cur.execute(
    "SELECT UPPER(name) FROM review_traits WHERE organization_id = %s",
    (ORG_ID,),
)
already_exists = {r[0] for r in cur.fetchall()}

inserted = 0
skipped = 0

for order, (key, meta) in enumerate(sorted(competencies.items()), start=1):
    if key in already_exists:
        print(f"  SKIP (exists): {meta['display']}")
        skipped += 1
        continue

    trait_id = str(uuid.uuid4())
    cur.execute(
        """
        INSERT INTO review_traits
            (id, name, description, is_active, display_order,
             scope_type, organization_id, applicable_levels, created_by)
        VALUES
            (%s, %s, %s, TRUE, %s,
             'directorate', %s, NULL, %s)
        """,
        (
            trait_id,
            meta["display"],
            f"Competency for Marketing Directorate. Assigned to: {', '.join(sorted(set(meta['employees'])))}",
            order,
            ORG_ID,
            CREATED_BY,
        ),
    )
    print(f"  INSERT [{order:02d}]: {meta['display']}")
    inserted += 1

conn.commit()
cur.close()
conn.close()

print(f"\nDone. Inserted: {inserted}, Skipped (already existed): {skipped}")

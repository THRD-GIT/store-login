import time
from pymongo import MongoClient

from google_sheets import get_data, authenticate

client = MongoClient(
    "mongodb+srv://Hardik:D2aURpiYd9Pjf6g7@thrdverification.d57u9gh.mongodb.net/?retryWrites=true&w=majority"
)

MAX_RETRIES = 3

def retry(op, label: str, max_retries: int = MAX_RETRIES, sleep_s: float = 1.0):
    attempt = 0
    while True:
        try:
            return op()
        except Exception as e:
            attempt += 1
            print(f"{label} failed (attempt {attempt}/{max_retries}): {e}")
            if attempt >= max_retries:
                raise
            time.sleep(sleep_s)

def main():
    db = client["test"]
    collection = db["earlyaccessmembers"]

    # 1) Bulk remove all records first
    delete_result = retry(
        lambda: collection.delete_many({}),
        label="delete_many({})",
    )
    print(f"Deleted {delete_result.deleted_count} documents from MongoDB")

    # 2) Read Google Sheet
    CREDS = authenticate()
    sheet_id = "15pcOKhASnh3ZjR0OejIkb6rgQfj5MiqPK1xGg4_NGxY"  # Members Database
    rows = get_data(sheet_id, CREDS, "EarlyAccess!A1:G100000")

    if not rows or len(rows) < 2:
        print("Sheet is empty (or only header). Nothing to insert.")
        return

    header = rows[0]
    data_rows = rows[1:]

    # Map column names to indices once
    try:
        name_idx = header.index("Name")
        phone_idx = header.index("Phone")
    except ValueError as e:
        raise ValueError(f"Missing required column in header: {e}. Header was: {header}")

    # 3) Build docs from sheet (dedupe by Phone) and bulk insert
    docs_by_phone = {}
    for row in data_rows:
        row += [""] * (len(header) - len(row))

        name = (row[name_idx] or "").strip()
        phone = (row[phone_idx] or "").strip()

        if not phone:
            continue  # skip blank phone rows

        # Deduplicate by phone (keeps the last occurrence; change if you want "first wins")
        docs_by_phone[phone] = {"Name": name, "Phone": phone}

    docs = list(docs_by_phone.values())

    if not docs:
        print("No valid rows found in the sheet. Nothing to insert.")
        return

    insert_result = retry(
        lambda: collection.insert_many(docs, ordered=False),
        label="insert_many(docs)",
    )
    print(f"Inserted {len(insert_result.inserted_ids)} documents into MongoDB")

if __name__ == "__main__":
    main()

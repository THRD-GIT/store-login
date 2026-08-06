import random
import csv
from datetime import datetime
from pymongo import MongoClient

from thrd_utils import IST, clean_phone
from google_sheets import authenticate, get_data, name2sheetId

CRED = authenticate()

DROP_DATE_SHEET_ID = name2sheetId["drop-dates"]
ORDER_PACKING_SHEET_ID = name2sheetId["order-packing"]

EARLY_ACCESS_TYPE = ["Cancelled", "Partial Found", ""]


CLIENT = MongoClient("mongodb+srv://Hardik:D2aURpiYd9Pjf6g7@thrdverification.d57u9gh.mongodb.net/?retryWrites=true&w=majority")
DB = CLIENT["test"]
COLLECTION = DB["earlyaccessmembers"]

def generate_random_phone_number():
    first_digit = random.choice(["8", "9"])
    remaining_digits = "".join(random.choice("0123456789") for _ in range(9))

    return first_digit + remaining_digits

def get_last_drop_date():
    today = datetime.now(IST).date()
    data = get_data(DROP_DATE_SHEET_ID, CRED, "Sheet1")

    header = data[0]
    drop_idx = header.index("Drop")
    date_idx = header.index("Date (dd/mm/yyyy)")

    latest_date = None

    for row in data[1:]:
        row += [""] * (len(header) - len(row))

        drop = str(row[drop_idx]).strip()
        date_str = str(row[date_idx]).strip()

        # condition 1: drop should be integer type
        if not drop.isdigit():
            continue

        drop_date = datetime.strptime(date_str, "%d/%m/%Y").date()


        # condition 2: date should be less than current date
        if drop_date >= today:
            continue

        if latest_date is None or drop_date > latest_date:
            latest_date = drop_date

    return latest_date


def main():
    last_drop_date = get_last_drop_date()

    print(f"Last drop date: {last_drop_date}")

    if last_drop_date is None:
        print("No valid last drop date found")
        return set()

    data = get_data(ORDER_PACKING_SHEET_ID, CRED, "AppSkipped v2")

    header = data[0]

    date_formats = [
        "%d/%m/%Y, %H:%M:%S",     # 07/10/2025, 18:16:25
        "%d/%m/%Y %H:%M:%S", 
        "%d/%m/%Y, %H:%M:%S %p",  # 07/10/2025, 18:16:25 PM
        "%d/%m/%Y %H:%M:%S %p",
    ]

    phone_docs = [{"Name": "Sudo User", "Phone":"5555599999"}]
    

    phone_set = set()
    phone_set.add("5555599999")

    for row in data[1:]:
        row = row + [""] * (len(header) - len(row))

        order_id = row[header.index("Order ID")]
        ordered_date_str = row[header.index("Ordered Date")]
        resolution = row[header.index("Resolution")].strip()
        phone_number = clean_phone(row[header.index("Phone Number")])

        if not order_id or not ordered_date_str:
            continue

        ordered_date = None

        for date_format in date_formats:
            try:
                ordered_date = datetime.strptime(
                    ordered_date_str,
                    date_format
                ).date()
                break
            except ValueError:
                continue

        if ordered_date is None:
            print(f"  Date format not matched: {ordered_date_str}")
            continue

        if ordered_date >= last_drop_date and resolution in EARLY_ACCESS_TYPE and phone_number not in phone_set:
            phone_docs.append({
                "Phone": phone_number
            })
            phone_set.add(phone_number)
    
    additional_phone = generate_random_phone_number()
    while additional_phone in phone_set:
        additional_phone = generate_random_phone_number()
    
    phone_docs.insert(1, {
        "Name": "Additional User",
        "Phone": additional_phone
    })


    if not phone_docs:
        print("   No phone numbers to insert")
        CLIENT.close()
        return
    
    COLLECTION.delete_many({})
    print("\nOld early access members deleted")
    
    result = COLLECTION.insert_many(phone_docs)
    print(f"\nInserted {len(result.inserted_ids)} phone numbers")
    CLIENT.close()

    with open("early_access.csv", "w", newline="") as f:
        writer = csv.writer(f)

        writer.writerow(["Phone Number", "Country Code"])

        for row in phone_docs[2:]:
            phone = row.get("Phone", "")

            if not phone:
                continue

            writer.writerow([phone, "91"])

    print("\nearly_access.csv created")

    return phone_docs


if __name__ == "__main__":
    phone_docs = main()
    print(f"\nEarly Access to {len(phone_docs)} phone numbers")
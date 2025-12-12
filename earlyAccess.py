import time
from pymongo import MongoClient

from google_sheets import get_data, authenticate

client = MongoClient('mongodb+srv://Hardik:D2aURpiYd9Pjf6g7@thrdverification.d57u9gh.mongodb.net/?retryWrites=true&w=majority')

max_retries = 3

def main():
    db = client['test'] 
    collection = db['earlyaccessmembers']
    db_members = set()
    for x in collection.find():
        db_members.add(x['Phone'])
        
    CREDS = authenticate()
    
    sheet_id = '15pcOKhASnh3ZjR0OejIkb6rgQfj5MiqPK1xGg4_NGxY' # Members Database
    sheetsMember = get_data(sheet_id, CREDS, f"EarlyAccess!A1:G100000")
    header = sheetsMember.pop(0)

    sheetsPhone = set()
    for row in sheetsMember:
        row += [''] * (len(header) - len(row))
        sheetsPhone.add(row[header.index('Phone')])

    
    for phone in db_members:
        if phone not in sheetsPhone:
            attempt = 0
            while attempt < max_retries:
                try:
                    result = collection.delete_one({"Phone": phone})
                    if result.deleted_count > 0:
                        print(f"Successfully removed {phone} from MongoDB")
                    else:
                        print(f"Phone number {phone} not found in MongoDB")
                    break
                except Exception as e:
                    attempt += 1
                    print(f"Attempt {attempt} failed: {e}")
                    if attempt < max_retries:
                        print("Retrying...")
                        time.sleep(1)
                    else:
                        print(f"Failed to remove {phone} from MongoDB after {max_retries} attempts")

    
    newMember = []
    for row in sheetsMember:
        row += [''] * (len(header) - len(row))
        
        if row[header.index('Phone')] in db_members:
            continue
        else:
            newMember.append({
				"Name": row[header.index('Name')],
				"Phone": row[header.index('Phone')],
			})
            print(f"\nAdding {row[0],row[1]} to mongodb")
    
    if(len(newMember)==0):
        print("No new members")
        return
    
    collection.insert_many(newMember)
    print(f"Number of members added : {len(newMember)}")

    
if __name__ == '__main__':
	main()

    


# Thrd Login Service Documentation

### GitHub Repository
**Repository:** [Link](https://github.com/THRD-GIT/store-login.git)  
**Hosted On:** Render

---

## Overview

The **Thrd Login** service provides a simple API that users interact with when accessing the store. This service handles user authentication, stores login information, and manages access to the store based on the user’s status and the current store state (online/offline).

**Note:** This API is called in the `main-password-header.liquid` file within Shopify's Liquid code.

---

## Local Setup Instructions

### Prerequisites
- **Node.js** installed on your machine
- **MongoDB** or access to a test MongoDB database

### Setup Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/hardiktemp/thrdLogin.git
   ```

2. **Install dependencies**
   Navigate to the project directory and install required packages:
   ```bash
   cd thrdLogin
   npm install
   ```

3. **Configure MongoDB URL**
   - Open the `index.js` file.
   - Update the MongoDB URL to a test database to avoid impacting production data.

4. **Run the application**
   Start the application:
   ```bash
   node index.js
   ```

---

## Database Structure

The application uses a MongoDB database with **four collections** to manage users, login records, early access members, and blacklisted members.

### 1. Users Collection
Stores details of all users.
| Field Name      | Data Type       | Description                             |
|-----------------|-----------------|-----------------------------------------|
| **Name**        | String          | User's full name                        |
| **Phone**       | String          | User's phone number                     |
| **Email**       | String          | User's email address                    |
| **Country_Code**| Integer         | User's phone country code               |
| **Tag**         | String          | Custom tag for user categorization      |
| **Member_ID**   | Integer         | Unique member identifier                |
| **Referral_ID** | String          | ID of the user who referred this member |
| **loginTime**   | Array of Dates  | Records of login times (deprecated)     |

### 2. UserLogin Collection
Logs each user login event.
| Field Name | Data Type | Description                      |
|------------|-----------|----------------------------------|
| **phone**  | String    | User's phone number             |
| **time**   | Date      | Timestamp of the login event    |

### 3. EarlyAccessMembers Collection
Contains phone numbers of users who can access the store during offline hours.
| Field Name | Data Type | Description                          |
|------------|-----------|--------------------------------------|
| **Phone**  | String    | Phone number of the early access member |
| **Name**   | String    | Name of the early access member      |

### 4. BlacklistedMembers Collection
Stores information about blacklisted members.
| Field Name | Data Type | Description                           |
|------------|-----------|---------------------------------------|
| **Phone**  | String    | Phone number of the blacklisted member|
| **Name**   | String    | Name of the blacklisted member        |
| **Email**  | String    | Email address of the blacklisted member |
| **RTOCount**| String   | Count of Return To Origin (RTO) instances|

---

## API Endpoints

### 1. **POST `/api/data`**
Handles user access requests based on store state (online/offline) and user status, returning either the store password or an error code.

#### **Request:**
- **phone**: 10-digit phone number (required)

#### **Response:**
- **status**: Status of the request
- **message**: Descriptive message
- **code**: Status code
  - **1** – Success
  - **2, 3** – User not found
  - **4** – Blacklisted user
  - **5** – Store is offline, and the user is not an early access member
- **password** (if applicable): Store password

#### Store States:
- **Online**:
  - If the current time is after the configured opening time, the store is considered online.
  - If the phone number exists in the **Users** collection:
    1. The current time is appended to the **loginTime** array (deprecated).
    2. A new entry is created in the **UserLogin** collection with the phone number and current time.
    3. The store password (`revolution`) and a success status are returned.
  - If the phone number is not found, an error code is returned.

- **Offline**:
  - If the store is offline, it checks if the user is listed in the **EarlyAccessMembers** collection.
  - If found, the store password (`revolution@123`) is returned.

#### Error Codes:
- **2, 3** – User not found in the **Users** collection
- **4** – User is blacklisted
- **5** – Store is offline, and the user is not in the **EarlyAccessMembers** collection

### 2. **GET `/*`**
Returns the time remaining until the store opens, useful for verifying the store's opening time configuration.

#### Example:
- **URL**: [https://thrdlogin-slz2.onrender.com](https://thrdlogin-slz2.onrender.com)
  - Use this URL to check if the store’s opening time is configured correctly.

---

## Store Opening Time Configuration

The store opening time is set directly in **IST (Indian Standard Time)**.

Example configuration for opening at **6:30 PM IST on 24th September 2024**:
```js
const year = 2024;
const month = 9;
const day = 24;

const hours = 18; // 6:30 PM IST
const minutes = 30;
```

No timezone conversion is required, as the time is handled directly in IST.

---

## Deployment Notes

- The service is hosted on **Render**.
- On high-traffic days, such as store drops at **6:30 PM**, scale up to **5 instances**.
- After peak periods (e.g., by **8 PM**), reduce back to **1 instance** to optimize resources.
- Any new commits to the GitHub repository automatically trigger an updated deployment on Render.
now if further adjustments are needed!

# Customer Deployment Guide — Make a Copy to Another Gmail Account

Complete step-by-step instructions to clone the **Permohonan Jadual Tugas PPP U5** Google Sheet, Google Apps Script (`Code.gs` & `Index.html`), Google Drive upload folder, and Web App deployment into a **new customer Gmail account** so that all form submissions, staff directory lookups (`Senarai Nama PPPU5`), settings (`SETTINGS`), and uploaded approval files are stored exclusively in the **customer's own Google Sheet and Google Drive**.

---

## Before Starting (On the Original Owner Account)

1. Open the master Google Sheet in the original Google account.
2. Click **Share**.
3. Grant **Viewer** access to the customer's Gmail address (or set **General access → Anyone with the link → Viewer**).
   - *Note: Do not grant Editor access on your master sheet. Viewer access is sufficient for the customer to use **File → Make a copy**, which automatically duplicates both the spreadsheet tabs and the bound Google Apps Script project.*

---

## Step 1: Make a Copy in the Customer's Gmail Account

1. Sign in to Chrome/browser using **only the customer's Gmail account** (use a separate Chrome profile or Incognito window to avoid multi-account Google Apps Script authorization conflicts).
2. Open the shared master Google Sheet link.
3. Click **File → Make a copy**.
4. Enter a new file name (e.g., `PERMOHONAN JADUAL TUGAS PPP U5 - [Unit / Hospital Name]`), choose a destination folder in the **customer's Google Drive**, and click **Make a copy**.
5. From the browser address bar of the newly copied Google Sheet, copy the **New Spreadsheet ID**:
   - URL format: `https://docs.google.com/spreadsheets/d/`**`<NEW_SHEET_ID>`**`/edit`
6. *(Optional cleanup for a fresh customer start)*:
   - In any existing duty period sheets (`TUGAS PPPU5 ...`), delete old applicant data rows while **keeping Row 1 headers intact**.
   - In **`Senarai Nama PPPU5`**, keep Row 1 headers (`Email`, `Nama`, `No Telefon`) and update/clear sample staff rows as needed.
   - **Do not delete the `SETTINGS` tab.**

---

## Step 2: Open Apps Script & Update `Code.gs` + `Index.html`

1. In the newly copied Google Sheet, open **Extensions → Apps Script**.
2. Verify both project files exist in the left sidebar:
   - **`Code.gs`**: Ensure it contains the latest script code (can be copied from **Admin Panel → Kod Script G.A.S → Salin Code.gs**).
   - **`Index.html`**: If hosting directly from Google Apps Script (`HtmlService`), ensure an HTML file named **`Index`** (displayed as `Index.html`) exists (`+` → **HTML** → name it `Index`) with the contents of `web-index.html` or the downloaded `Index.html` from Admin Panel.
3. At the top of **`Code.gs`**, update the fallback Spreadsheet ID and leave `DEFAULT_SPREADSHEET_URL` empty so the script automatically binds to the active copied spreadsheet:

   ```javascript
   var DEFAULT_SPREADSHEET_ID = "<PASTE_NEW_SHEET_ID_HERE>";
   var DEFAULT_SPREADSHEET_URL = "";
   ```

4. *(Optional)* Verify `DEFAULT_BANNER_LOGO_URL` at the top of `Code.gs` uses your desired direct image URL (for example, `https://lh3.googleusercontent.com/d/15c2eJL4l4EfpeJn-ggnHZxgympVvtR1b`).
5. Click **Save** (`Ctrl + S`).

---

## Step 3: Create the Customer's Drive Folder & Authorize Permissions

1. In the Apps Script Editor top toolbar, click the **function selector dropdown** (next to *Debug*).
2. Select **`setupFolderBaruDiDrive`** and click **Run**.
3. When Google prompts for authorization:
   - Click **Review permissions**.
   - Choose the **customer's Gmail account**.
   - If the unverified app warning appears, click **Advanced → Go to [Project Name] (unsafe) → Allow**.
   - This grants permissions for Google Sheets, Google Drive (read/write), and MailApp.
4. Inspect the **Execution Log** at the bottom of the Apps Script Editor and copy the generated Google Drive folder URL (`https://drive.google.com/drive/folders/...`).
   - *What `setupFolderBaruDiDrive()` does automatically:*
     - Creates a folder named **`Surat Kelulusan PPP U5`** inside the **customer's own Google Drive**.
     - Updates row 2 of the **`SETTINGS`** tab in the customer's copied Sheet (`spreadsheetUrl`, `recordSpreadsheetUrl`, and `approvalFolderUrl`) so it no longer points to the original owner's Sheet or Drive folder.
5. Paste the copied Drive folder URL into **`Code.gs`**:

   ```javascript
   var DEFAULT_APPROVAL_FOLDER_URL = "<PASTE_NEW_DRIVE_FOLDER_URL_HERE>";
   ```

6. Click **Save** (`Ctrl + S`).
7. *(Recommended verification)* Run these two helper functions from the same dropdown and inspect the **Execution Log**:
   - **`authorizeDriveAndSheets`** — verifies full Google Drive write & delete permissions, Spreadsheet access, and folder validation.
   - **`setupSenaraiNamaPPPU5`** — verifies or auto-creates the `Senarai Nama PPPU5` directory sheet with formatted headers (`Email`, `Nama`, `No Telefon`).

---

## Step 4: Deploy the New Web App (`/exec`)

1. In Apps Script Editor, click **Deploy → New deployment**.
2. Click the gear icon beside *Select type* and choose **Web app**.
3. Set the deployment options **exactly** as follows:
   - **Description**: e.g., `Customer v3.0 Deployment`
   - **Execute as**: **Me** *(must be the customer's new Gmail account so submissions write to the customer's Sheet and upload files to the customer's Drive)*
   - **Who has access**: **Anyone** *(required so staff and external web clients can access and submit without permission errors)*
4. Click **Deploy** (complete any authorization prompt if asked).
5. Copy the generated **Web app URL** (`https://script.google.com/macros/s/.../exec`).

---

## Step 5: Lock the New `/exec` URL into `Code.gs` & Redeploy

1. Return to **`Code.gs`** in Apps Script Editor and update:

   ```javascript
   var DEFAULT_GAS_WEB_APP_URL = "<PASTE_NEW_EXEC_URL_HERE>";
   ```

2. Click **Save** (`Ctrl + S`).
3. Click **Deploy → Manage deployments → Edit (pencil icon)**.
4. Under **Version**, select **New version**, then click **Deploy**.
   - *Important: Every time you modify `Code.gs` or `Index.html` in the future, saving alone does NOT update the live `/exec` link—you must always create a **New version** via **Manage deployments → Edit → New version**.*

---

## Step 6: Connect the Web Frontend (Choose Option A or Option B)

### Option A: Serve Directly from Google Apps Script (`Index.html` inside GAS)
- Share the customer's **new `/exec` URL** directly with staff.
- Because `doGet()` prioritizes `HtmlService.createHtmlOutputFromFile("Index")`, the interface runs directly from Google Apps Script using `google.script.run` against the customer's Sheet and Drive.

### Option B: Host `web-index.html` / Build on GitHub + Netlify
1. Update the GAS endpoint so the hosted frontend points to the customer's `/exec` URL (not the original account's URL):
   - Either replace `gasWebAppUrl` in `src/data/rosterData.ts` (or in `web-index.html`) before pushing to GitHub/Netlify, **or**
   - Append `?gasUrl=<NEW_EXEC_URL>` to the Netlify URL, **or**
   - Update **URL Web App Google Apps Script (/exec)** inside **Admin Panel → Tetapan Sistem** and click **Simpan Semua Tetapan Sistem**.

---

## Step 7: Final Verification in Admin Panel

1. Open the customer's live Web App URL.
2. Click the **Settings (gear)** icon in the top-right corner and log in (default Admin code: `ADMIN007`).
3. Open the **Tetapan Sistem** tab and confirm:
   - **Pautan URL Rekod Google Sheets** points to the **customer's copied Sheet**.
   - **URL Web App Google Apps Script (/exec)** is the **customer's new `/exec` URL**.
   - **Pautan Folder Google Drive Surat Kelulusan** is the **customer's new Drive folder URL**.
4. Run both diagnostic checks:
   - Click **Semak Folder** → confirm green status (validates real Drive write access to the customer's folder).
   - Click **Uji Sambungan** → confirm green status: `Sambungan aktif ke Google Sheet & helaian "Senarai Nama PPPU5" (... rekod PPP)`.
5. Click **Simpan Semua Tetapan Sistem** so row 2 of the `SETTINGS` tab is cleanly saved and formatted.
6. Open the **Tetapan Borang** tab, set the active duty period (`Tarikh Mula`, `Tarikh Tamat`, `Penyelia (SV) Incaj`, `Tarikh Tutup`), and save (this auto-creates the corresponding `TUGAS PPPU5 ...` sheet in the customer's spreadsheet if it does not yet exist).
7. Submit **one test application** with a sample approval file upload and verify:
   - The new row appears in the customer's `TUGAS PPPU5 ...` sheet.
   - The uploaded file is saved inside a period subfolder inside the customer's **`Surat Kelulusan PPP U5`** Google Drive folder.
   - **Log History** records green success entries for `Senarai Nama PPPU5` and form submission.

---

## Troubleshooting Quick Reference

| Issue | Root Cause | Solution |
| :--- | :--- | :--- |
| Uploaded files go to old Drive or show `Permission denied` | `DEFAULT_APPROVAL_FOLDER_URL` or `SETTINGS` still points to original owner's folder | Run `setupFolderBaruDiDrive()` in Step 3, update `DEFAULT_APPROVAL_FOLDER_URL` in `Code.gs`, and deploy a **New version**. |
| `Respons bukan JSON (text/html)` or `Authorization required` | Web App deployed with *Who has access: Only myself*, or multi-Gmail session conflict | Set **Execute as: Me** and **Who has access: Anyone** in Deployment settings; authorize in an Incognito window with only the customer Gmail signed in. |
| Edits to `Code.gs` or `Index.html` do not take effect | Saved script without publishing a new deployment version | Go to **Deploy → Manage deployments → Edit → New version → Deploy**. |
| Web app still writes to the original Sheet | Hosted `web-index.html` / Netlify still points to the old `/exec` URL | Update `URL Web App Google Apps Script (/exec)` in Admin Panel and in `web-index.html` / `rosterData.ts`. |

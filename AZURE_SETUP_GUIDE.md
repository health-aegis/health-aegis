# Aegis Health — Azure Function OCR Setup Guide

Follow these steps **in order** to get the full OCR pipeline working.

---

## Step 1 — Provision Azure Resources

You need to create **4 Azure resources** in the Azure Portal (portal.azure.com):

### 1.1 Azure Storage Account
- Go to: **Create a resource → Storage Account**
- Settings:
  - **Name**: `aegishealthstorage` (or your choice)
  - **Redundancy**: LRS (Locally Redundant - cheapest)
- After creating, go to the Storage Account → **Containers** → **+ Container**
  - Name: `health-records`
  - **Public access level**: `Blob (anonymous read access for blobs only)` ✅

### 1.2 Azure AI Document Intelligence (Form Recognizer)
- Go to: **Create a resource → Document Intelligence**
- Settings:
  - **Pricing tier**: `Free (F0)` — 500 pages/month free
- After creating, go to **Keys and Endpoint**
  - Copy: **Endpoint** and **Key 1**

### 1.3 Azure Cosmos DB (MongoDB API) — You already have this! ✅

Since your Cosmos DB uses the **MongoDB API**, just verify the following:

1. Go to your Cosmos DB account in the Azure Portal
2. Click **Data Explorer** and confirm:
   - Your database (`aegisdb`) is present
   - The `medicalrecords` collection exists inside it (it does — visible in your screenshot)
3. Go to **Settings → Connection String**
   - Copy the **Primary Connection String** — it will look like:
     ```
     mongodb://aegisdb:YOURKEY==@aegisdb.mongo.cosmos.azure.com:10255/?ssl=true&replicaSet=globaldb...
     ```
   - Paste this into `local.settings.json` as `COSMOS_MONGODB_URI`

### 1.4 Azure Function App
- Go to: **Create a resource → Function App**
- Settings:
  - **Runtime stack**: `Node.js`
  - **Version**: `22 LTS` (or whatever is the latest LTS available — 22 or 24 both work fine)
  - **Operating System**: `Windows`
  - **Hosting plan**: `Consumption (Serverless)`
- Link it to the Storage Account you created in Step 1.1

---

## Step 2 — Get Your Connection String

1. Go to your **Storage Account** → **Security + networking → Access keys**
2. Copy **Connection string** under `key1`

---

## Step 3 — Fill in `local.settings.json`

Open `infra/azure-function/local.settings.json` and replace all placeholder values:

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "DefaultEndpointsProtocol=https;AccountName=aegishealthstorage;AccountKey=...;EndpointSuffix=core.windows.net",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "AZURE_STORAGE_CONNECTION_STRING": "DefaultEndpointsProtocol=https;AccountName=aegishealthstorage;AccountKey=...;EndpointSuffix=core.windows.net",
    "FORM_RECOGNIZER_ENDPOINT": "https://YOUR_RESOURCE.cognitiveservices.azure.com/",
    "FORM_RECOGNIZER_KEY": "abc123...",
    "COSMOS_MONGODB_URI": "mongodb://aegisdb:YOUR_KEY==@aegisdb.mongo.cosmos.azure.com:10255/test?ssl=true&replicaSet=globaldb&retrywrites=false",
    "SENDGRID_API_KEY": "SG.xxxxx",
    "NOTIFICATION_FROM_EMAIL": "noreply@aegishealth.io",
    "TEST_NOTIFICATION_EMAIL": "your-personal@email.com",
    "APP_BASE_URL": "http://localhost:3000"
  }
}
```

> ⚠️ **Never commit `local.settings.json` to git.** It's already in `.gitignore`.

---

## Step 4 — Fill in API Gateway `.env`

Add these to `services/api-gateway/.env`:

```env
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=aegishealthstorage;AccountKey=...
AZURE_CONTAINER_NAME=health-records
# NOTE: Your existing MONGODB_URI already points to Cosmos DB — no extra Cosmos keys needed!
```

---

## Step 5 — Set Up Azure Communication Services Email

Your ACS Email is already provisioned and verified! ✅

1. Go to your **Email Communication Services** resource (`emailaswin`) in the Azure Portal
2. Go to **Settings → Keys**
3. Copy the **Primary connection string** — it looks like:
   ```
   endpoint=https://emailaswin.communication.azure.com/;accesskey=xxxx==
   ```
4. Paste it in `local.settings.json` as `ACS_CONNECTION_STRING`
5. Your sender address is already filled in:
   ```
   DoNotReply@27b1128f-4e89-4282-8d78-fc52fb65d148.azurecomm.net
   ```
6. Set `TEST_NOTIFICATION_EMAIL` to your personal email address for testing

> ⚠️ **Important**: You also need to **link** your Email Communication Service to your main Communication Services resource.
> - Go to your **Communication Services** resource → **Email → Domains → Connect domain**
> - Select the verified domain from `emailaswin`

---

## Step 6 — Install Azure Functions Core Tools

This lets you run the Azure Function locally:

```powershell
# Install with npm
npm install -g azure-functions-core-tools@4 --unsafe-perm true
```

---

## Step 7 — Install Dependencies & Run Locally

```powershell
# Navigate to the Azure Function folder
cd infra/azure-function

# Install npm packages
npm install

# Start the function locally
func start
```

You should see:
```
Functions:
  health-record-processor: blobTrigger
  
Host lock lease acquired by instance ID ...
```

---

## Step 8 — Test the Full Pipeline

1. Open your app at `http://localhost:3000`
2. Log in as a patient
3. Go to **Medical Records**
4. Click **Browse & Upload** and upload any PDF or image
5. The file goes to Azure Blob Storage → the Azure Function triggers automatically
6. Wait ~10-30 seconds, then click **🔄 Refresh** on the **AI-Processed Documents** panel
7. Your document should appear with:
   - ✅ Processed status
   - The full extracted text (click to expand)
   - A link to view the original file
8. Check your email — you'll receive an HTML notification from Aegis Health

---

## Step 9 — Deploy to Azure

Once everything works locally:

```powershell
# Deploy the function from the azure-function folder
cd infra/azure-function
func azure functionapp publish <YOUR_FUNCTION_APP_NAME>
```

Then go to your **Function App → Configuration → Application Settings** and add all the same key-value pairs from your `local.settings.json`.

---

## Troubleshooting

| Problem | Solution |
|---|---|
| `func` command not found | Run `npm install -g azure-functions-core-tools@4` |
| Function doesn't trigger | Make sure the Storage Account connection string is correct and the container is named `health-records` |
| OCR returns empty | The file may be a scanned image — try with a text-based PDF first |
| Cosmos DB records not appearing in UI | Check that `COSMOS_DB_ENDPOINT` and `COSMOS_DB_KEY` are set in `api-gateway/.env` and restart the backend |
| Email not received | Check SendGrid sender verification and spam folder |
| `403 Forbidden` on blob URL | Re-check that the container has **Blob** public access, not **Private** |

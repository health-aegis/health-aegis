#!/bin/bash

RG="aswin-rg"
MONGO="YOUR_COSMOS_DB_CONNECTION_STRING"
JWT="MyInsuranceJwtSecret2026"
VERSION="v1.0.6"

echo "Updating api-gateway..."
az containerapp update --name api-gateway --resource-group $RG --image insurancecr.azurecr.io/aegis-api-gateway:$VERSION --set-env-vars MONGODB_URI="$MONGO" JWT_SECRET="$JWT" PORT="5000"

echo "Updating notification-worker..."
az containerapp update --name notification-worker --resource-group $RG --image insurancecr.azurecr.io/aegis-notification-worker:$VERSION --set-env-vars MONGODB_URI="$MONGO"

echo "Updating client..."
az containerapp update --name client --resource-group $RG --image insurancecr.azurecr.io/aegis-client:$VERSION

echo "All containers successfully updated to $VERSION"

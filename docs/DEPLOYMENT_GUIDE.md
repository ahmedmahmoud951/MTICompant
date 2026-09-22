# MTI Engineering Solutions - Production Deployment & Operations Guide

## 1. Architecture Overview
- **Backend**: ASP.NET Core 8 Web API with SignalR WebSockets (`/hubs/project`).
- **Frontend**: Next.js 14 React Enterprise Application.
- **Database**: Microsoft SQL Server (Public cloud endpoint or on-premise clustered instance).
- **Object Storage**: Backblaze B2 Private Cloud Storage (`MTICompany` bucket, region `us-east-005`).
- **Reverse Proxy**: NGINX or IIS with full WebSocket upgrade and SSL/TLS termination.

---

## 2. Environment Variables Configuration

### Backend API (Environment or Azure App Settings / AWS Secrets Manager)
```bash
# Database Connection
ConnectionStrings__DefaultConnection="Server=db69544.public.databaseasp.net;Database=db69544;User Id=db69544;Password=mF?76nB_!5dZ;Encrypt=True;TrustServerCertificate=True;MultipleActiveResultSets=True;"

# JWT Authentication
Jwt__SecretKey="MTI_ENGINEERING_SOLUTIONS_SUPER_SECURE_JWT_KEY_2026_PRODUCTION_READY_AUTHENTICATION_TOKEN"
Jwt__Issuer="MTI.ProjectManagement.Api"
Jwt__Audience="MTI.ProjectManagement.Client"
Jwt__ExpiryMinutes="60"
Jwt__RefreshTokenExpiryDays="7"

# Backblaze B2 Private Storage (Kept Strictly on Backend - NEVER in Frontend)
BackblazeB2__KeyId="005bc9fb11d7d470000000001"
BackblazeB2__ApplicationKey="K005HsOSzl/nxjJq3k7Pit0160P2U2w"
BackblazeB2__BucketName="MTICompany"
BackblazeB2__ServiceUrl="https://s3.us-east-005.backblazeb2.com"
BackblazeB2__DownloadUrl="https://f005.backblazeb2.com"

# CORS Configuration
Cors__AllowedOrigins__0="https://mti.engineeringsolutions.com"
Cors__AllowedOrigins__1="http://localhost:3000"
```

### Frontend Web Application (`.env.production`)
```bash
# Public Non-sensitive URL Only
NEXT_PUBLIC_API_URL="https://api.mti.engineeringsolutions.com"
```

---

## 3. SQL Server Backup & Disaster Recovery Strategy

### A. Backup Schedule
1. **Full Backup**: Daily at 01:00 UTC (Retained for 30 days).
   ```sql
   BACKUP DATABASE [db69544]
   TO DISK = 'C:\Backups\MTI_Full_Daily.bak'
   WITH INIT, COMPRESSION, CHECKSUM;
   ```
2. **Differential Backup**: Every 6 hours at 07:00, 13:00, 19:00 UTC (Retained for 7 days).
   ```sql
   BACKUP DATABASE [db69544]
   TO DISK = 'C:\Backups\MTI_Diff.bak'
   WITH DIFFERENTIAL, COMPRESSION;
   ```
3. **Transaction Log Backup**: Every 15 minutes (RPO < 15 minutes).
   ```sql
   BACKUP LOG [db69544]
   TO DISK = 'C:\Backups\MTI_Log.trn'
   WITH COMPRESSION;
   ```

### B. Recovery Procedure (RTO < 30 minutes)
1. Restore most recent Full Backup `WITH NORECOVERY`.
2. Restore most recent Differential Backup `WITH NORECOVERY`.
3. Restore sequential Transaction Log backups up to point-in-time `WITH RECOVERY`.

---

## 4. Backblaze B2 Lifecycle & Retention Policies
1. **Bucket Privacy**: Bucket `MTICompany` is configured as **All Private**.
2. **Direct Pre-signed Uploads**: Generated on backend with 15-minute expiration.
3. **Download Links**: Short-lived (1 to 2 hours maximum) with HMAC signatures (`X-Amz-Signature`).
4. **Lifecycle Rules**:
   - Keep only the latest version of files unless specific version retention is enabled.
   - Delete hidden/deleted markers after 30 days.
   - Abort incomplete multipart uploads after 7 days to eliminate orphaned chunks.

---

## 5. Reverse Proxy & SignalR WebSockets Configuration

### NGINX Requirements
- Ensure `proxy_http_version 1.1;` is enabled.
- Set `proxy_set_header Upgrade $http_upgrade;` and `proxy_set_header Connection "Upgrade";`.
- Configure `proxy_read_timeout 3600s;` for long-lived real-time connections.

### IIS Requirements
- Install the **WebSocket Protocol** role in Windows Server Manager.
- Ensure `<webSocket enabled="true" receiveBufferLimit="4194304" />` is in `web.config`.

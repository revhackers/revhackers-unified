# Cloudflare Pages Migration Guide

## Overview
Migrate **revhackers.com.br** from Hostinger (Apache) to Cloudflare Pages with 7-day rollback window.

---

## Phase 1: GitHub Secrets Configuration

Before deploying, add these secrets to GitHub (Settings → Secrets → Actions):

```
CLOUDFLARE_API_TOKEN          = [Get from Cloudflare dashboard: My Profile → API Tokens → Create Token]
CLOUDFLARE_ACCOUNT_ID         = [Get from Cloudflare dashboard: Home → right sidebar → Account ID]
CLOUDFLARE_PROJECT_NAME       = revhackers-pages
VITE_GCP_API_URL              = https://revhackers-api-staging-3na73syj5a-rj.a.run.app
VITE_FIREBASE_API_KEY         = AIzaSyDrdt32oOHC86aXqGxm7QC1HpbmH4H2VJk
VITE_FIREBASE_AUTH_DOMAIN     = revhackers-staging.firebaseapp.com
VITE_FIREBASE_PROJECT_ID      = revhackers-staging
```

### Getting Cloudflare API Token (Step-by-Step)
1. Log in to [dash.cloudflare.com](https://dash.cloudflare.com)
2. Click your avatar (bottom-left) → **My Profile**
3. Go to **API Tokens** tab
4. Click **Create Token**
5. Select template: **"Edit Cloudflare Workers"**
6. Name: `revhackers-deploy`
7. Permissions:
   - `Account` → `Cloudflare Pages` → `Edit`
   - `Account` → `Workers KV Storage` → `Edit` (if needed)
8. Copy the token, paste into GitHub secret

---

## Phase 2: Cloudflare Pages Project Setup

### A. Create Pages Project (if not exists)
```bash
# Via Cloudflare Dashboard:
1. Home → Pages
2. Create a project
3. Name: revhackers-pages
4. Connect Git repository: revhackers/revhackers-unified
5. Production branch: main
6. Build command: npm run build
7. Build output directory: dist/
8. Environment variables:
   - VITE_GCP_API_URL: [from secrets above]
   - VITE_FIREBASE_API_KEY: [from secrets above]
   - etc.
```

### B. Note the Account ID & Project Name
- Go to revhackers-pages in Cloudflare Pages
- Right sidebar shows **Account ID** and **Project Name**
- Save to GitHub secrets

---

## Phase 3: DNS Configuration

### A. Export Current DNS Records (from Hostinger)
```bash
# Hostinger Control Panel → Domain → DNS Zone
# Export or screenshot all A/AAAA/MX/TXT/CNAME records
# Save to: docs/dns-hostinger-export-YYYYMMDD.txt
```

**Key records to preserve:**
- `@` (A record) → Points to Cloudflare IPs (will change)
- `mail` (MX records) → Keep for email routing
- `txt` records (SPF/DKIM) → Keep for authentication

### B. Import to Cloudflare DNS
1. Log in to [dash.cloudflare.com](https://dash.cloudflare.com)
2. Go to **revhackers.com.br** domain (or add it)
3. DNS → Records
4. Add records from Hostinger export:
   - Keep exact names and values
   - Change nameservers **last** (after all records imported)

### C. Configure Email (if applicable)
```
MX Records:
  Priority 10: mail.revhackers.com.br (or your mail provider)
TXT Records:
  v=spf1 include:_spf.google.com ~all
  [DKIM records from Google Workspace/similar]
```

---

## Phase 4: Nameserver Switch (DNS Go-Live)

### A. Get Cloudflare Nameservers
From **revhackers.com.br** domain in Cloudflare dashboard:
```
Nameserver 1: ns-xxx.ns.cloudflare.com
Nameserver 2: ns-xxx.ns.cloudflare.com
```

### B. Update at Registrar (Hostinger)
1. Hostinger Control Panel → Domains → revhackers.com.br
2. Name Servers → Change
3. Set to Cloudflare nameservers (above)
4. **Save**
5. **Wait 12-48 hours** for propagation (check with `dig revhackers.com.br NS`)

### C. Verify Propagation
```bash
# Check when Cloudflare nameservers are live:
dig revhackers.com.br NS
nslookup revhackers.com.br

# Expected output: Should list Cloudflare nameservers
```

---

## Phase 5: Deployment Workflow

### A. Staging Deployment
```bash
# Via GitHub Actions:
1. Go to Actions → Deploy Cloudflare Pages (Fail-Closed)
2. Run workflow
3. Inputs:
   - Environment: staging
   - Reason: "Test deployment on staging."
4. Wait for completion
5. Test at: https://staging.revhackers.com.br (or similar staging URL)
```

### B. Production Deployment
```bash
# Via GitHub Actions:
1. Go to Actions → Deploy Cloudflare Pages (Fail-Closed)
2. Run workflow
3. Inputs:
   - Environment: production
   - Confirm: DEPLOY_REVHACKERS (required)
   - Reason: "Production cutover - Hostinger → Cloudflare"
4. Wait for completion
5. Verify: curl https://revhackers.com.br
```

---

## Phase 6: Post-Deployment Validation

### A. HTTP/HTTPS Check
```bash
# Should return 200 OK
curl -I https://revhackers.com.br
curl -I https://www.revhackers.com.br

# Redirect check
curl -I http://revhackers.com.br  # Should redirect to HTTPS
```

### B. Core Web Vitals & Performance
```bash
# Lighthouse check
lighthouse https://revhackers.com.br --output-path=lighthouse.html

# CDN cache test
curl -I https://revhackers.com.br | grep -i "cf-cache"
```

### C. Email Delivery
```bash
# Test email sender (if you host mail)
echo "Test" | mail -s "Cloudflare DNS Test" test@revhackers.com.br

# Check SPF/DKIM
dig revhackers.com.br TXT
dig txt default._domainkey.revhackers.com.br
```

### D. Analytics & Monitoring
- Cloudflare Dashboard → revhackers.com.br → Analytics
- Monitor traffic, errors, cache hit ratio
- Verify no 5xx errors

---

## Phase 7: Rollback Window (7 Days)

**Keep Hostinger LIVE for 7 days** in case rollback is needed:

### A. During Rollback Window
- **Cloudflare**: Primary DNS (live)
- **Hostinger**: Secondary (standby)
- **Nameservers**: Point to Cloudflare
- **Hostinger A record**: Keep unchanged (will not be used)

### B. If Rollback Needed
1. **STOP** Cloudflare Pages deployment
2. Change nameservers back to **Hostinger**
3. Propagation: 12-48 hours
4. Test: `dig revhackers.com.br` should show Hostinger IPs

### C. After 7 Days: Cancel Hostinger
1. Confirm Cloudflare is stable (no issues)
2. Cancel Hostinger hosting (keep domain registration if needed)
3. Update documentation with new DNS provider

---

## Phase 8: Documentation Updates

After successful cutover, update:
- `README.md` → Hosting provider
- `DEPLOY-STAGING.md` → Deployment instructions
- `.github/workflows/deploy-hostinger.yml` → Mark as deprecated
- Add this guide to project repository

---

## Troubleshooting

### DNS Not Propagating
```bash
# Check nameserver propagation
dig @8.8.8.8 revhackers.com.br NS
dig @1.1.1.1 revhackers.com.br NS

# Should show Cloudflare nameservers
```

### Pages Deployment Fails
- Check GitHub Actions logs: Actions → Deploy Cloudflare Pages
- Verify `dist/` builds locally: `npm run build`
- Check Cloudflare API token has correct permissions

### Content Not Updating
- Clear browser cache: `Ctrl+Shift+Delete` or Cloudflare dashboard → Caching → Purge Cache
- Check build output: `npm run build && ls -la dist/`
- Verify Pages deployment was successful

### Email Stops Working
- Check MX records in Cloudflare: DNS → Records → Filter "MX"
- Verify SPF/DKIM TXT records are present
- Test: `dig revhackers.com.br MX`

---

## Checklist Before Go-Live

- [ ] GitHub secrets configured (all 7 required)
- [ ] Cloudflare Pages project created
- [ ] DNS records imported from Hostinger
- [ ] Cloudflare SSL/TLS enabled (automatic)
- [ ] Staging deployment tested
- [ ] Nameservers ready to switch
- [ ] Rollback plan documented
- [ ] Team notified of maintenance window
- [ ] Monitoring set up (Cloudflare Analytics, uptime checker)

---

## Support & Escalation

**Issue**: Pages deployment stuck  
→ Check wrangler logs: `npx wrangler pages deployments list`

**Issue**: Domain not resolving  
→ Check DNS propagation: https://www.whats-dns.net

**Issue**: SSL certificate error  
→ Wait 5 mins (Cloudflare auto-provisions HTTPS)

---

**Last Updated**: 2026-11-05  
**Status**: Ready for Fase 3 execution

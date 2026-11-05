# Owner Action Checklist - GHL + Cloudflare Migration

**Date Started**: 2026-11-05  
**Estimated Duration**: 5-7 business days  
**Status**: 🟡 In Progress (Fase 2 complete; Fase 0 & 3 pending owner actions)

---

## 🔒 Critical: Manual Owner Actions

These tasks **cannot be automated** and require the owner's direct browser access:

### ✅ **Fase 0: Pre-requisites (Manual Browser)**

#### 0.1: Create PIT `revhackers-migracao` in S7HE
**Status**: ⏳ BLOCKED - Requires Owner  
**Time**: ~5 minutes

**Steps**:
1. Open [app.gohighlevel.com](https://app.gohighlevel.com) → Sign in as **giulliano@usefunnels.io**
2. Switch location: **RevHackers** (S7HEFAz97UKuC8NLHMmI)
3. Go to: **Settings** → **Private Integrations** → **Create**
4. **Name**: `revhackers-migracao`
5. **Scopes**: Select:
   - ✓ `contacts.readonly`
   - ✓ `contacts.write`
   - ✓ `locations/customFields.readonly`
   - ✓ `locations/tags.write`
6. Click **Create**
7. Copy the **Token** (appears in popup)
8. Run this in terminal to save securely:
   ```bash
   read -s REVHACKERS_PIT_MIGRACAO
   # Paste token, press Enter
   # Don't close terminal until step 10
   ```
9. This token will be used in Fase 4.1 (lead export script)

#### 0.2: Create PIT `revhackers-export-readonly` in oFTw
**Status**: ⏳ IN PROGRESS  
**Time**: ~5 minutes

**Steps**:
1. Go to [app.gohighlevel.com](https://app.gohighlevel.com) → Sign in as same user
2. Switch location: **OrbitFlow** (oFTwB7UKuC8NLHMmI - adjust ID per memory)
3. Go to: **Settings** → **Private Integrations** → **Create**
4. **Name**: `revhackers-export-readonly`
5. **Scopes**: Select only:
   - ✓ `contacts.readonly`
   - ✓ `locations/tags.readonly`
   - ✓ `funnels.readonly`
6. Click **Create**
7. Copy the **Token**
8. Run:
   ```bash
   read -s REVHACKERS_PIT_EXPORT_READONLY
   # Paste token, press Enter
   ```

#### 0.3: Cloudflare API Token & GitHub Secrets
**Status**: ⏳ PENDING  
**Time**: ~10 minutes

**Steps**:
1. Go to [dash.cloudflare.com](https://dash.cloudflare.com) → Sign in
2. Click your avatar (bottom-left) → **My Profile**
3. Go to **API Tokens** tab → **Create Token**
4. Select template: **"Edit Cloudflare Workers"**
5. **Name**: `revhackers-deploy`
6. Keep defaults, click **Create**
7. Copy the token (appears once, can't be retrieved later!)
8. Go to GitHub: **revhackers/revhackers-unified** → **Settings** → **Secrets → Actions**
9. Click **New repository secret**
10. Add these secrets:

| Secret Name | Value | Source |
|------------|-------|--------|
| `CLOUDFLARE_API_TOKEN` | [From Cloudflare] | Cloudflare API Tokens page |
| `CLOUDFLARE_ACCOUNT_ID` | [Your account ID] | Cloudflare Dashboard → Home (right sidebar) |
| `CLOUDFLARE_PROJECT_NAME` | `revhackers-pages` | Fixed value |
| `VITE_GCP_API_URL` | From existing secrets | Copy from current deploy-hostinger.yml env |
| `VITE_FIREBASE_API_KEY` | From existing secrets | Copy from current deploy-hostinger.yml env |
| `VITE_FIREBASE_AUTH_DOMAIN` | From existing secrets | Copy from current deploy-hostinger.yml env |
| `VITE_FIREBASE_PROJECT_ID` | From existing secrets | Copy from current deploy-hostinger.yml env |

#### 0.4: Export DNS Records from Hostinger
**Status**: ⏳ PENDING  
**Time**: ~5 minutes

**Steps**:
1. Go to [hostinger.com](https://hostinger.com) → Dashboard
2. Go to: **Domains** → **revhackers.com.br** → **DNS Zone** (or **Manage**)
3. Screenshot or export all records:
   - A records (IPv4 addresses)
   - AAAA records (IPv6, if any)
   - CNAME records
   - MX records (for email)
   - TXT records (SPF, DKIM)
4. Save to: `docs/dns-hostinger-export-20261105.txt`
5. Commit to branch

#### 0.5: Inventory Read-Only of oFTw
**Status**: ⏳ PENDING  
**Time**: ~15 minutes (note-taking)

**Steps**:
1. Log in to [app.gohighlevel.com](https://app.gohighlevel.com)
2. Switch to **OrbitFlow** location
3. Document:
   - **Workflows**: Note key automation names/IDs (Automation tab)
   - **Calendars**: Note calendar IDs (Calendar settings)
   - **Funnels**: List main funnels (Funnels tab)
   - **Domains**: List custom domains in use (Funnels → Domain settings)
4. Save to: `docs/oftw-inventory-20261105.md`
5. Example format:
   ```markdown
   ## OrbitFlow Inventory
   
   ### Workflows
   - "Follow-up Cadence" (ID: ...)
   - "Booking Confirmations" (ID: ...)
   
   ### Calendars
   - Calendar ID: [...]
   
   ### Funnels
   - Funnel: "Lead Magnet" (domain: pages.usefunnels.io)
   
   ### Domains
   - pages.usefunnels.io (CNAME to GHL)
   ```

---

### 🚀 **Fase 1: GHL S7HE Setup (Manual Owner)**

These are GHL dashboard tasks that require owner approval/knowledge:

#### 1.1-1.6: Custom Fields, Pipeline, Forms, Template, Domain, Calendar
**Status**: ⏳ PENDING  
**Owner Action Required**: YES

Each step involves:
- Creating fields/forms in GHL native interface
- Configuring email template
- Setting up domain/calendar

**Estimated Time**: 2-3 hours total

**Prerequisites**:
- Complete Fase 0.1 (PIT token obtained)
- Review `docs/PLANO-MESTRE.md` for field specifications

---

### 📋 **Fase 3: Cloudflare Deployment (Owner + Automated)**

#### 3.1-3.2: Configuration Files ✅ DONE
**Status**: ✅ Complete

**What was done**:
- Created `wrangler.toml` for Pages deployment
- Created `.github/workflows/deploy-cloudflare.yml` (fail-closed)
- Created `docs/CLOUDFLARE_SETUP.md` (full guide)

#### 3.3: Staging Deployment (Automated)
**Status**: ⏳ PENDING  
**Time**: ~10 minutes (GitHub Actions)

**Prerequisites**:
- Fase 0.3: GitHub secrets configured
- Cloudflare Pages project created

**How to Trigger**:
1. Go to GitHub: **Actions** → **Deploy Cloudflare Pages (Fail-Closed)**
2. Click **Run workflow**
3. Inputs:
   - **Environment**: `staging`
   - **Reason**: "Test deployment"
4. Click **Run workflow**
5. Wait for completion (~3-5 minutes)
6. Check artifact for deployment URL

#### 3.4: DNS Records Import (Manual Owner)
**Status**: ⏳ PENDING  
**Time**: ~15 minutes

**Steps**:
1. Go to [dash.cloudflare.com](https://dash.cloudflare.com)
2. Add domain: **revhackers.com.br** (if not already added)
3. Go to **DNS** tab
4. Import records from Fase 0.4 export
5. **Critical**: Keep existing records:
   - Mail (MX records)
   - SPF/DKIM (TXT records)

#### 3.5: Nameserver Switch (Manual Owner)
**Status**: ⏳ PENDING  
**Time**: ~5 minutes (+ 12-48 hours propagation)

**Steps**:
1. In Cloudflare, find nameservers for revhackers.com.br (will be shown when domain added)
2. Go to **Hostinger** → **Domains** → **revhackers.com.br** → **Nameservers**
3. Change to Cloudflare nameservers
4. **Save**
5. **Wait 12-48 hours** for DNS propagation
6. Verify with: `dig revhackers.com.br NS` (should show Cloudflare nameservers)

#### 3.6-3.7: Validation & Rollback Window (Automated + Owner)
**Status**: ⏳ PENDING  
**Time**: ~30 minutes validation + 7 days monitoring

**Automated checks**:
```bash
# Run after DNS propagates:
curl -I https://revhackers.com.br  # Should be 200 OK
dig revhackers.com.br              # Should resolve via Cloudflare
```

**Owner's role**:
- Monitor for 7 days
- Keep Hostinger active (for rollback)
- Cancel Hostinger after 7 days if stable

---

## 🎯 **Critical Decision Points**

### **Before Fase 3.3 (Staging)**
- [ ] Fase 0.3 secrets added to GitHub
- [ ] Cloudflare Pages project created
- [ ] Team notified

### **Before Fase 3.5 (Nameserver Switch)**
- [ ] Staging deployment tested (Fase 3.3)
- [ ] Production deployment ready (Fase 3.3 with prod env)
- [ ] All team members aware of maintenance window
- [ ] Rollback plan reviewed

### **Before Fase 3.7 (Cancel Hostinger)**
- [ ] 7 days of monitoring complete
- [ ] No issues reported
- [ ] Cloudflare analytics show healthy traffic

---

## 📞 **Escalation Path**

| Issue | Action |
|-------|--------|
| GHL PIT creation fails | Check location ID in GHL dashboard |
| GitHub secrets error | Verify all 7 secrets exist in Settings → Secrets |
| Cloudflare deploy fails | Check wrangler.toml, check GitHub Actions logs |
| DNS not propagating | Wait 12-48h, use https://www.whats-dns.net to check |
| Website not loading after cutover | Rollback: Change nameservers back to Hostinger |

---

## 📋 **Handoff Deliverables**

Once owner completes all manual tasks:

1. **Fase 0 Completion**:
   - ✅ 2 PIT tokens secured (in password manager)
   - ✅ DNS records exported
   - ✅ oFTw inventory documented

2. **Fase 1 Completion**:
   - ✅ S7HE configured (fields, forms, workflows)
   - ✅ Email domain active
   - ✅ Test email sent/received

3. **Fase 3 Completion**:
   - ✅ Cloudflare Pages live
   - ✅ DNS migrated to Cloudflare
   - ✅ HTTPS working
   - ✅ 7-day rollback window active

4. **Final Documentation**:
   - ✅ Updated README.md with new provider
   - ✅ Updated DEPLOY-STAGING.md
   - ✅ Logged decision to archive: `00-CONTROLE/DECISAO_CRM_UNICO_S7HE_<date>.md`

---

## 🔔 **Notifications Needed**

Before each major phase:
- [ ] Team: New forms/domains going live
- [ ] Support: Update contact form instructions if domain changes
- [ ] Email: Notify subscribers of new contact methods (if domain changes)

---

**Last Updated**: 2026-11-05  
**Next Action**: Owner starts Fase 0.1 (PIT creation)

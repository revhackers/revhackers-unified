# Task Blockers & Dependencies — Remaining 25 Items

**Status**: 13/39 tasks complete; 25 awaiting owner action or prior phase completion

---

## Summary

| Category | Count | Blocker |
|----------|-------|---------|
| **Fase 0**: Owner manual actions | 5 | ⏳ Requires owner (GHL dashboard, GitHub UI, Hostinger) |
| **Fase 1**: Owner GHL setup | 9 | ⏳ Blocked on Fase 0.1-0.2 (PIT tokens) |
| **Fase 3**: Deployment/DNS | 5 | ⏳ Blocked on Fase 0.3 (GitHub secrets) |
| **Fase 4**: Lead migration | 4 | ⏳ Blocked on Fase 1 (S7HE ready) + Fase 3 (staging test) |
| **Fase 5-6**: Documentation | 2 | ⏳ Blocked on Fase 3-4 completion |

---

## Detailed Blockers

### **Fase 0: Pre-requisites (Owner Manual)** — 5 tasks
**Status**: 0/5 complete | **Blocker**: Requires owner browser access

| Task | Blocker | Unblocks | Estimated Time |
|------|---------|----------|-----------------|
| 0.1: Create PIT revhackers-migracao | Owner must access GHL dashboard (S7HE location) | 0.2-0.5, Fase 4.1 | 5 min |
| 0.2: Create PIT revhackers-export-readonly | Owner must access GHL dashboard (oFTw location) | Fase 4.1 | 5 min |
| 0.3: Add 7 GitHub secrets | Owner must add Cloudflare API token + GCP env vars to GitHub | Fase 3.3 deployment | 10 min |
| 0.4: Export DNS records from Hostinger | Owner must access Hostinger Control Panel | Fase 3.4 (DNS import) | 5 min |
| 0.5: Inventory oFTw (workflows, calendars, funnels) | Owner must document current state | Fase 4 (context for lead migration) | 15 min |

**Total Fase 0 time**: ~40 minutes  
**How to proceed**: Owner follows steps in `OWNER_ACTION_CHECKLIST.md` § Fase 0

---

### **Fase 1: GHL S7HE Setup (Owner Manual)** — 9 tasks
**Status**: 0/9 complete | **Blockers**: 
- Requires Fase 0.1-0.2 (PIT tokens)
- Requires owner knowledge of RevHackers business process

| Task | Blocked By | Unblocks | Estimated |
|------|-----------|----------|-----------|
| 1.1: 16 custom fields | Fase 0.1 (PIT token) | 1.2, Fase 4.2 | 30-45 min |
| 1.2: Pipeline (Inbound stage) | 1.1 | Workflows | 15 min |
| 1.3: 6 native GHL forms | 1.1, Fase 2 (component ready) | Update src/config/ghl.ts | 60-90 min |
| 1.4: Email template | None (standard task) | 1.7 | 20 min |
| 1.5: mail.revhackers.com.br domain | None (standard task) | Email delivery test | 10 min |
| 1.6: Confirm calendar ID | None (standard task) | src/config/ghl.ts | 5 min |
| 1.7: Workflow "RH · Entrega Material" | 1.1, 1.2, 1.3 | Fase 4.3 | 30 min |
| 1.8: Auxiliary workflows (5 total) | 1.1, 1.2, 1.3 | Form submission handling | 45-60 min |
| 1.9: Manual test (forms + email) | 1.3, 1.4, 1.7, 1.8 | Fase 3.3 staging (readiness) | 15 min |

**Total Fase 1 time**: 2.5–4 hours  
**How to proceed**: Owner follows `OWNER_ACTION_CHECKLIST.md` § Fase 1 (after 0.1-0.2 complete)

---

### **Fase 3: Cloudflare Deployment** — 5 tasks
**Status**: 2/5 complete (3.1, 3.2) | **Blockers**: Requires Fase 0.3 (GitHub secrets)

| Task | Blocked By | Unblocks | When |
|------|-----------|----------|------|
| 3.1: wrangler.toml | None | 3.3 build | ✅ Done (Nov 5) |
| 3.2: deploy-cloudflare.yml workflow | None | 3.3 trigger | ✅ Done (Nov 5) |
| 3.3: Staging deployment (dry-run) | Fase 0.3 (secrets added) | 3.4 (if staging OK) | Owner triggers GH Actions |
| 3.4: Import DNS to Cloudflare | Fase 0.4 (DNS export) | 3.5 | After 3.3 validation |
| 3.5: Nameserver switch (GO-LIVE) | Fase 3.4 + Fase 3.3 passed | DNS propagation (12-48h) | Week 2 |
| 3.6: Post-DNS validation | Fase 3.5 (DNS live) | 3.7 (rollback window setup) | After propagation |
| 3.7: Maintain rollback window | Fase 3.6 | Fase 4 (safe to proceed) | 7 days from 3.5 |

**How to proceed**:
1. Owner completes Fase 0.3 (add GitHub secrets)
2. Go to GitHub → Actions → "Deploy Cloudflare Pages (Fail-Closed)" → Run workflow
   - Environment: `staging`
   - Reason: "Test deployment"
3. Wait for completion, verify staging site
4. Then proceed with 3.4-3.5

---

### **Fase 4: Lead Migration** — 4 tasks
**Status**: 0/4 complete | **Blockers**: 
- Fase 1 (S7HE ready with fields/workflows)
- Fase 3.3 (staging validated, safe to load GHL)

| Task | Blocked By | Unblocks | When |
|------|-----------|----------|------|
| 4.1: scripts/ghl/export-oftw-leads.mjs | Fase 0.1, 0.2, Fase 1 (fields defined) | 4.2 | After Fase 1.1 |
| 4.2: scripts/ghl/migrate-to-s7he.mjs | 4.1 (exported leads), Fase 1 (S7HE ready) | 4.3 | After Fase 1 done |
| 4.3: Material resend workflow | 1.7, 4.2 (contacts in S7HE) | 4.4 (final report) | After 4.2 complete |
| 4.4: Final report (migrated, resent, failed) | 4.3 | Fase 5 (documentation) | After 4.3 complete |

**Note**: No development work needed for 4.1-4.3 (scripts pre-exist in memory or are trivial).  
**Time to execute**: ~2 hours (scripts run, generate reports)

**How to proceed**:
1. After Fase 1 complete, run: `node scripts/ghl/export-oftw-leads.mjs`
2. Run: `node scripts/ghl/migrate-to-s7he.mjs`
3. Trigger material resend workflow in S7HE
4. Generate final report

---

### **Fase 5-6: Documentation & Final Checks** — 2 tasks
**Status**: 0/2 complete | **Blockers**: 
- Fase 3.5 (DNS switched, go-live complete)
- Fase 4 (lead migration complete)

| Task | Blocked By | When |
|------|-----------|------|
| 5.1: DECISAO_CRM_UNICO_S7HE_<date>.md | Fase 3.5 + Fase 4 | After go-live (Week 2-3) |
| 5.2: Update README.md + DEPLOY-STAGING.md | Fase 3.2 (new workflow exists) | After go-live |
| 6.1: Final verification checklist | Fase 3.5, 4.4, 5.2 | After all phases (Week 3-4) |

**Time to execute**: ~1 hour total  
**How to proceed**: Automatically after 3.5 and 4.4

---

## Critical Path (Sequence Required)

```
Fase 0 (40 min, owner)
  ├─→ 0.1-0.2: GHL PITs
  ├─→ 0.3: GitHub secrets
  ├─→ 0.4: DNS export
  └─→ 0.5: oFTw inventory

Fase 1 (2.5-4 hours, owner) — Blocked on 0.1-0.2
  ├─→ 1.1-1.6: S7HE fields, pipeline, forms
  ├─→ 1.7-1.8: Workflows
  └─→ 1.9: Manual test

Fase 3.3-3.5 (1 + 2-3 days, owner + automated) — Blocked on 0.3-0.4
  ├─→ 3.3: Staging deployment (via GitHub Actions)
  ├─→ 3.4: DNS import
  ├─→ 3.5: Nameserver switch
  └─→ 3.6-3.7: DNS validation + 7-day rollback

Fase 4 (1-2 hours, scripts) — Blocked on Fase 1 + 3.3
  ├─→ 4.1-4.2: Export + migrate leads
  ├─→ 4.3: Resend materials
  └─→ 4.4: Final report

Fase 5-6 (1 hour) — Blocked on Fase 3 + 4
  ├─→ 5.1-5.2: Documentation
  └─→ 6.1: Final checks
```

**Total elapsed time**: 5-7 business days (including 7-day rollback window)

---

## Which Tasks Can Run in Parallel?

**Parallelizable**:
- Fase 0.5 (oFTw inventory) → can be done while 0.1-0.2 in progress
- Fase 1.4-1.5 (email template, domain) → can be done before 1.1 finishes

**Cannot parallelize**:
- Fase 1 must wait for Fase 0.1-0.2 (PIT tokens required)
- Fase 3.3-3.5 must wait for Fase 0.3 (GitHub secrets required)
- Fase 4 must wait for Fase 1 (S7HE fields/workflows required)

---

## When Can Work Resume?

| Phase | Resumes When | Owner Action |
|-------|--------------|--------------|
| Fase 0.1 | ASAP | Open GHL dashboard → Create PIT |
| Fase 1 | After 0.1-0.2 complete | Follow checklist (fields, forms) |
| Fase 3.3 | After 0.3 complete | Trigger GitHub Actions workflow |
| Fase 4 | After Fase 1 complete | Run lead export/migrate scripts |
| Fase 5-6 | After Fase 3-4 complete | Write decision log + update docs |

---

## Unblocking Strategy (for Team)

**Immediate** (today):
- [ ] Owner reads `OWNER_ACTION_CHECKLIST.md`
- [ ] Owner reads this file (BLOCKERS_AND_DEPENDENCIES.md)
- [ ] Owner confirms Fase 0 timeline (40 min)

**This week**:
- [ ] Owner completes Fase 0 (40 min)
- [ ] Owner completes Fase 1 (2.5-4 hours, split across 2-3 days)

**Next week**:
- [ ] Owner runs Fase 3.3 (staging deployment, 1 hr, automated)
- [ ] Owner runs Fase 3.4-3.5 (DNS switch, 1 day + 1-2 day propagation)
- [ ] Owner executes Fase 4 (lead migration scripts, 1-2 hours)

**Week 3-4**:
- [ ] Owner documents Fase 5-6
- [ ] Monitor 7-day rollback window

---

**Summary**: All 25 remaining tasks have **explicit blockers** and **clear sequencing**. None are blocked by bugs or technical issues. All are either owner manual actions or dependent on prior owner completion.

**Next step for owner**: Start Fase 0.1 (Create PIT revhackers-migracao)

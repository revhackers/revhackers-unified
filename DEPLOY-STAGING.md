# Guia de Deploy para Staging

> **Fase 3 (frontend Hostinger) substituída.** O deploy do site agora é `deploy-cloudflare.yml` (manual, Cloudflare Workers). As Fases 1, 2 e 4 (API Cloud Run) seguem válidas.

## Pré-requisitos

1. **Autenticação GCP**
   ```bash
   gcloud auth login
   gcloud config set project revhackers-staging
   ```

2. **Variáveis de ambiente**
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_GOOGLE_AUTH_ENABLED`
   - `VITE_GCP_API_URL` (ex: `https://revhackers-api-staging-3na73syj5a-rj.a.run.app`)
   - `VITE_GCP_ENABLED`
   - `VITE_CLIENTS_GCP_ENABLED`
   - `VITE_GROWTHMAP_GCP_ENABLED`

3. **SSH para Hostinger**
   - `SSH_HOST`: 151.106.98.30
   - `SSH_PORT`: 65002
   - `SSH_USERNAME`: u139274360
   - `SSH_PRIVATE_KEY`: (em secrets)

---

## Fase 1: Aplicar Migrations (Cloud SQL)

**Script**: `scripts/deploy-staging-migrations.sh`

Este script:
- Aplica todas as migrations em ordem
- Valida o schema final
- Testa isolamento RLS cross-tenant

```bash
chmod +x scripts/deploy-staging-migrations.sh
./scripts/deploy-staging-migrations.sh
```

**Migrations incluídas**:
- `0001` a `0018`: Foundation + features anteriores
- `0019` a `0022`: Content domain (blog, materiais, cases)
- `0023`: GrowthMap shares (compartilhamento público)
- `0024`: REI expansion opportunities (upsell tracking)

**Validação**:
```sql
-- Deve retornar ~25 tabelas com RLS habilitado
SELECT COUNT(*) 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE';
```

---

## Fase 2: Deploy Cloud Run (API)

**Pré-requisito**: Migrations aplicadas com sucesso

### Opção A: Cloud Build (recomendado)

```bash
# Build e push da imagem
gcloud builds submit --tag gcr.io/revhackers-staging/revhackers-api:latest \
  --config=cloudbuild-api.yaml

# Deploy para Cloud Run
gcloud run deploy revhackers-api-staging \
  --image gcr.io/revhackers-staging/revhackers-api:latest \
  --region southamerica-east1 \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --concurrency 80 \
  --timeout 300 \
  --set-env-vars="NODE_ENV=production,DB_HOST=$(gcloud sql instances describe revhackers-staging --format='value(ipAddresses[0].ipAddress)')"
```

### Opção B: Docker local + push

```bash
# Build local
docker build -f api/Dockerfile -t gcr.io/revhackers-staging/revhackers-api:latest .

# Push para GCR
docker push gcr.io/revhackers-staging/revhackers-api:latest

# Deploy
gcloud run deploy revhackers-api-staging \
  --image gcr.io/revhackers-staging/revhackers-api:latest \
  --region southamerica-east1 \
  --allow-unauthenticated
```

**Validação**:
```bash
# Health check
curl -f https://revhackers-api-staging-3na73syj5a-rj.a.run.app/health

# Testar endpoint de intelligence
curl -X POST https://revhackers-api-staging-3na73syj5a-rj.a.run.app/v1/intelligence/share \
  -H "Content-Type: application/json" \
  -d '{"tenant_id":"test","project_id":"test","created_by":"deploy"}'
```

---

## Fase 3: Deploy Hostinger (Frontend)

**Pré-requisito**: API Cloud Run rodando

### Opção A: GitHub Actions (automático)

1. Fazer push para branch `main`:
   ```bash
   git push origin main
   ```

2. Workflow `.github/workflows/deploy-hostinger.yml` executa:
   - Build com Vite
   - Deploy via SFTP para Hostinger

### Opção B: Manual

```bash
# Build
npm run build

# Deploy via rsync
rsync -avz --delete \
  -e "ssh -i ~/.ssh/hostinger_key -p 65002" \
  dist/ \
  u139274360@151.106.98.30:/home/u139274360/domains/revhackers.com.br/public_html/
```

**Validação**:
```bash
# Verificar se site está no ar
curl -f https://revhackers.com.br

# Verificar se GrowthMap preview carrega
curl -f https://revhackers.com.br/diagnostico/resultado/demo
```

---

## Fase 4: Smoke Tests

### Testes manuais

1. **GrowthMap sharing**
   - Acessar: `https://revhackers.com.br/admin/intelligence/demo-project`
   - Clicar em "Compartilhar"
   - Copiar link público
   - Abrir em nova aba (deve mostrar growthmap sem login)

2. **Diagnostic preview**
   - Acessar: `https://revhackers.com.br/diagnostico/resultado/demo`
   - Verificar se preview de 3 frameworks aparece
   - Verificar se CTA para GrowthMap completo aparece

3. **Expansion opportunities**
   - Acessar: `https://revhackers.com.br/admin/rei-cockpit/demo-project`
   - Verificar se badge de expansão aparece
   - Clicar para ver oportunidades

### Testes automatizados (Playwright)

```bash
# Rodar todos os testes E2E
npm run test:e2e

# Ou testes específicos
npx playwright test tests/growthmap-e2e.spec.ts
npx playwright test tests/rei-onboarding-e2e.spec.ts
npx playwright test tests/intelligence-dashboard-e2e.spec.ts
```

---

## Rollback

Se algo der errado:

### Migrations
```bash
# Restaurar backup do Cloud SQL
gcloud sql instances restore revhackers-staging \
  --restore-instance=revhackers-staging-backup-$(date +%Y%m%d)
```

### API
```bash
# Rollback para versão anterior
gcloud run services update-traffic revhackers-api-staging \
  --to-revisions=revhackers-api-staging-00001-abc=100 \
  --region=southamerica-east1
```

### Frontend
```bash
# Restaurar backup do Hostinger
ssh u139274360@151.106.98.30 -p 65002 \
  "cd /home/u139274360/domains/revhackers.com.br && \
   rm -rf public_html && \
   tar -xzf backups/public_html-$(date -d 'yesterday' +%Y%m%d).tar.gz"
```

---

## Checklist Final

- [ ] Migrations aplicadas com sucesso
- [ ] API Cloud Run respondendo em `/health`
- [ ] Frontend Hostinger carregando
- [ ] GrowthMap sharing funcionando
- [ ] Diagnostic preview mostrando 3 frameworks
- [ ] Expansion opportunities aparecendo
- [ ] Testes E2E passando

---

## Monitoramento

- **Logs Cloud Run**: `gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=revhackers-api-staging" --limit=50`
- **Logs Hostinger**: Acessar painel > Logs > Error log
- **Métricas**: Cloud Monitoring > Cloud Run > revhackers-api-staging

---

## Próximos Passos

Após deploy em staging:

1. Validar com stakeholders
2. Coletar feedback de usuários beta
3. Ajustar thresholds de expansion opportunities se necessário
4. Preparar deploy para produção

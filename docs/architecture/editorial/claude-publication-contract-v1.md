# Proposta de contrato editorial — revisão B1A.3 (não acordada)

**DESIGN ONLY.** O contrato final de exportação do Claude ainda não existe. Não há importador, verificador autenticado de P5 ou autorização de publicação implementados no site. Nenhum exemplo neste documento constitui aprovação ou evidência. Não há sincronização Drive/GitHub ou OAuth/Python no browser.

## Campos propostos para discussão (não constituem schema final)

| Grupo | Informação proposta |
|---|---|
| Identidade | job_id, ID imutável do artigo, ID/versão do artefato, versão do contrato |
| Snapshot | bytes/serialização acordados, SHA-256 do snapshot e referência da versão imutável |
| Aprovação editorial | referência verificável da decisão humana P5, identidade autenticada, revisão aprovada, data e pendências editoriais |
| Publicação separada | identidade e autorização explícita do publicador, versão autorizada, destino e published inicialmente false |
| Conteúdo | autoria real, título, resumo, tópico, corpo e blocos editoriais, fontes e claims individualizados |
| SEO | slug, canonical, metadados e datas reais |
| Assets | origem, licença, titular, permissão de uso e alt de cada imagem |

**Digest não é assinatura.** Um SHA-256 digitado, nome de aprovador ou status APPROVED não prova identidade, permissão, decisão humana nem verificação de claims. O adapter local mantém claimsVerified=false e não concede APPROVED, inclusive quando recebe esses campos.

## Validação futura proposta: fail-closed

Antes de qualquer publicação futura, uma implementação separadamente autorizada deverá verificar autoridade/identidade e permissão da decisão P5, correspondência de snapshot/versão/hash, ausência de sugestões pendentes, autoria e licenças, schema e URLs, além da autorização distinta de publicação. published ausente/false não será elegível. Nada disso equivale ao verificador autenticado já existir.

## Questões para Claude / dependências

- Qual componente autenticado exportará/verificará a decisão P5 e sua revisão? Qual modelo de confiança e revogação?
- Quais bytes são objeto do hash (conteúdo, metadados e assets), e qual serialização/canonicalização?
- Como sugestões pendentes, retomadas e mudanças posteriores invalidam uma aprovação?
- Como representar autorização de publicação distinta da aprovação editorial?
- Qual schema final, transporte e política de licenças serão acordados? Até lá, nenhuma importação ou publicação automática.

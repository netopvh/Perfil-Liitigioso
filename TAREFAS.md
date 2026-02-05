# Tarefas de implementação – API Perfil Litigioso

Lista de tarefas conforme o plano de ação. Marque com `[x]` ao concluir.

## 1. Infraestrutura

- [x] Docker Compose com MySQL e Redis
- [x] `.env.example` com variáveis `DB_*` e `REDIS_*`
- [x] Documentar no README a necessidade de `docker compose up -d`

## 2. Setup NestJS

- [x] Projeto NestJS com estrutura de pastas (companies, cases, generators, common)
- [x] Swagger em `/api`
- [x] Dependências: TypeORM, MySQL, Redis (ioredis), cache, faker, seedrandom, class-validator, class-transformer
- [x] ConfigModule e variáveis de ambiente
- [x] DatabaseModule (TypeORM) e RedisModule (RedisService)

## 3. Modelo de dados

- [x] Entidade TypeORM `Company` (tabela `companies`)
- [x] Entidade TypeORM `Case` (tabela `cases`)
- [x] Entidade TypeORM `CaseMovement` (tabela `case_movements`)
- [x] DTOs para query, body e respostas (Swagger)

## 4. Common

- [x] `common/pagination.ts` (PaginationResult, paginate)
- [x] `common/filters.ts` (CaseFilterParams, hashFilters)

## 5. Geradores

- [x] `generators/seed.ts` (getSeed, getSeedFromString)
- [x] `generators/company.generator.ts` (generateCompany, generateCompaniesForQuery)
- [x] `generators/cnj.ts` (formato CNJ, tribunais por UF, movimentações)
- [x] `generators/case.generator.ts` (generateCases com distribuição por ramo)
- [x] `generators/score.calculator.ts` (computeKpisFromCases, calculateScore, drivers)

## 6. Módulo Companies

- [x] CompaniesService: search, getByCnpj, getLitigationProfile, simulateRecompute
- [x] Fluxo Redis → MySQL → gerar e persistir
- [x] ensureCasesForCompany (persistir casos e movimentações)
- [x] CompaniesController com validação e Swagger

## 7. Módulo Cases

- [x] CasesService: listByCompany (filtros, paginação, cache), getById
- [x] Mascaramento para processos em segredo de justiça
- [x] CompaniesCasesController (GET /companies/:cnpj/cases)
- [x] CasesController (GET /cases/:processId)

## 8. Ajustes finais

- [x] Número CNJ no formato NNNNNNN-DD.AAAA.J.TR.OOOO
- [x] Tribunais compatíveis com UF e ramo
- [x] Tipos de movimentação realistas
- [x] Segredo de justiça (5–10% dos processos, campos mascarados)

## 9. Documentação

- [x] README com como rodar e resumo dos endpoints
- [x] TAREFAS.md (este arquivo)

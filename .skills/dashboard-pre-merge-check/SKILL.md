---
name: dashboard-pre-merge-check
description: Revisa una rama del dashboard financiero antes de fusionarla (comprobaciones por tipo de cambio, reglas del repo, memory bank y commits). Úsala cuando vayas a abrir o fusionar un pull request en este repositorio.
---

# Revisión previa a la fusión del dashboard

## Objetivo

Comprobar que una rama cumple las reglas de `.agents/rules/` y dejar por escrito qué se ejecutó y qué no. Una afirmación de "funciona" sin comando ejecutado no cuenta.

## Inputs

- La rama a revisar y `main` como base (`git diff --stat main...HEAD`).
- Qué herramientas hay: ¿`npm` y `pytest` funcionan en este entorno? (Si no, ver el paso 3.)

## Pasos

1. **Leer el contexto.** `AGENTS.md`, `.agents/rules/*.md` y `memory-bank/` (lo exige `AGENTS.md`).
2. **Clasificar los archivos tocados** con `git diff --name-only main...HEAD`: `frontend/src/lib` (¿lee fechas?), `frontend/src/components`, `backend/`, documentación (`README.md`, `README.es.md`, `memory-bank/`).
3. **Ejecutar lo que corresponda** y anotar el resultado de cada comando como ✅ / ❌ / ❓:
   - Frontend: `cd frontend && npm run lint && npm run build && npm test`.
   - Si se toca código que lee `create_date`: además `TZ=America/New_York npm test` (en UTC o Madrid el fallo de fechas no se ve; ver `frontend-dates.md`).
   - Backend: `cd backend && pytest`.
   - Si el comando no se puede ejecutar, escribe ❓ y di qué se usó en su lugar (por ejemplo `tsc --noEmit` o un script de Node). No lo marques ✅.
4. **Comprobaciones rápidas de reglas** (cada una debe salir vacía, salvo lo indicado):
   - `git grep -n "new Date(" -- frontend/src`: solo `formatMonthYearLabel` en `financial-utils.ts` y archivos de test.
   - `git grep -nE "#[0-9a-fA-F]{3,8}\b" -- 'frontend/src/*.ts' 'frontend/src/*.tsx'`: vacío (colores con variables de `index.css`).
   - `git grep -nE ": any\b|as any" -- frontend/src`: vacío.
   - `git grep -n "Full Year" -- frontend/src`: si sigue apareciendo y se tocó la cabecera, es un fallo de `frontend-dates.md`.
5. **Documentación.** Si cambia el comportamiento, el archivo de `memory-bank/` afectado se actualiza en el mismo commit; `README.md` y `README.es.md` se editan juntos.
6. **Commits.** Un commit por unidad coherente. El mensaje dice qué cambia, cómo se comprobó y qué no se pudo ejecutar, y nombra la skill o regla que lo motivó.

## Output

Un informe corto (en las notas del PR o en `memory-bank/progress.md`) con:

| Comprobación | Comando | Resultado |
|---|---|---|

más una línea final con lo que queda sin verificar.

## Criterios de aceptación

- Cada comprobación de los pasos 3 y 4 aparece en el informe con su resultado real; ninguna está inventada.
- Lo no ejecutado figura como ❓ con el motivo.
- No quedan hallazgos ❌ sin resolver ni justificar.
- Si se tocaron fechas, hay resultado en `TZ=America/New_York`.
- El memory bank y los dos READMEs son coherentes con el cambio.

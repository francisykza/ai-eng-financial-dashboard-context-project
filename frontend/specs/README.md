# Contrato de datos del frontend (SDD) — Dashboard financiero

Documento para un agente o desarrollador que **no ha visto nada más** del proyecto. Describe, para cada funcionalidad nueva, qué endpoints se usan, con qué tipos, qué valores son válidos y qué hace la interfaz en los casos límite. El comportamiento de componentes está en [`components.md`](./components.md); los tipos, en [`api-types.ts`](./api-types.ts) y [`param-types.ts`](./param-types.ts).

Alcance de esta rama: **solo especificaciones**. No hay componentes React, llamadas `fetch` ni cambios de backend.

## Leyenda de verificación

- ✅ comprobado contra el backend (`backend/app/routes.py`) ejecutando sus modelos pydantic y funciones reales con los datos mock (semilla 42, 12 meses móviles) el 2026-10-14.
- ❌ el enunciado del PM **no coincide** con la API; se documenta la API real y la decisión tomada.
- ❓ no comprobado (requiere el servidor HTTP en marcha, p. ej. códigos 422 o `/openapi.json`).

Traza detallada de la exploración: `verification.md` (secciones "Ejercicio specs, Fase 1").

## Convenciones comunes

- Base: `/api` (el proxy de Vite lo reenvía a `http://backend:8000`).
- Fechas: texto `YYYY-MM-DD`, inclusivas en ambos extremos. Nunca `new Date("YYYY-MM-DD")`.
- Parámetros opcionales: se **omiten** si no tienen valor; nunca se envía una cadena vacía.
- Un array vacío `[]` es respuesta válida, no un error.
- Datos mock: del 2025-10-02 al 2026-09-28 (ventana móvil; cambia con la fecha).

## Discrepancias PM ↔ API

| Tema | PM dice | API real | Decisión |
|---|---|---|---|
| Media de la alerta | media móvil de 3 períodos ❌ | `baseline_average` = media de todos los períodos anteriores | columna "Media de períodos anteriores" |
| % de aumento | porcentaje ❌ | `increase_ratio` razón (1.0201 = +102,01 %) | multiplicar por 100 |
| Umbral | 0.01–1.0 ❌ | `threshold ≥ 0`, sin máximo, defecto 0.3 | limitar en el input (0.01–1.0) |
| Top por grupo | % del total y negocio ❌ | solo `category`, `operation_type`, `total_amount`; sin % | dos llamadas con `business_type` y `limit=20`; % en cliente |
| Tipo de operación | ingresos ❌ | defecto `outcome` | enviar siempre `operation_type=income` |
| Categorías | "desde facets" ❌ | `facets.categories` es global | usar las devueltas por `categories/top` |
| Ingresos | "top 5" ❌ | solo 2 categorías de ingreso (`sales`, `others`) | mostrar las que haya |

## F1 · Filtro de rango de fechas

**Endpoint**: `GET /api/metrics/facets` (sin parámetros) ✅ → `FacetsResponse`.
Ejemplo: `{ "operation_types": ["income","outcome"], "business_types": ["B2B","B2C"], "categories": [...], "min_date": "2025-10-02", "max_date": "2026-09-28" }`.

**Parámetros que luego se reenvían** (`DateRangeFilter`): `start_date?`, `end_date?` a `/api/metrics`, `/api/metrics/alerts` y `/api/metrics/categories/top` ✅ (ambos opcionales, inclusivos).

| Campo | Válido | Notas |
|---|---|---|
| `start_date`, `end_date` | `YYYY-MM-DD` o ausente | `/api/metrics` no acepta `business_type` ✅ |

**Casos límite y comportamiento de la UI**
1. Solo una fecha informada ⇒ se envía solo esa; el otro extremo queda abierto.
2. `start_date > end_date` ⇒ la API responde `[]` ✅; la UI lo impide antes con mensaje "La fecha inicial no puede ser posterior a la final" y no consulta.
3. Rango fuera de los datos ⇒ respuesta vacía; KPIs en 0 y estados vacíos en F2/F3.
4. Facets falla ⇒ se oculta "Datos disponibles", el filtro sigue funcionando.
5. Fecha con formato inválido ⇒ ❓ (422 esperado, no verificado por HTTP); la UI nunca la envía porque usa `<input type="date">`.

## F2 · Alertas de anomalías

**Endpoint**: `GET /api/metrics/alerts` ✅ → `AlertsResponse = AlertEntry[]`.
Parámetros (`AlertsParams`): `threshold` (número ≥ 0, defecto 0.3), `group_by` (`day|week|month`, defecto `month` — ❓ comportamiento de `day`/`week` no verificado por la UI, que usa solo `month`), `start_date`, `end_date`, `business_type`.

Ejemplo: `[{ "period": "2026-05", "outcome_total": 12345.67, "baseline_average": 6110.0, "increase_ratio": 1.0201 }]`.

| Campo | Significado |
|---|---|
| `period` | `YYYY-MM` con `group_by=month` ✅ |
| `outcome_total` | gasto del período |
| `baseline_average` | media de TODOS los períodos anteriores (no 3) ❌ |
| `increase_ratio` | razón; 0.3 = 30 % |

Valores válidos en la UI: umbral 0.01–1.0 (paso 0.01). Resultados comprobados: umbral 0 ⇒ 6 alertas, 0.01 ⇒ 5, 0.3 ⇒ 4, 1.0 ⇒ 1, 5.0 ⇒ 0 ✅. El primer período nunca alerta ✅.

**Casos límite**
1. **Sin anomalías** (`[]`): estado vacío explícito "No se detectaron anomalías con un umbral de X % en el rango seleccionado." — no una tabla vacía.
2. Umbral vacío o fuera de 0.01–1.0 ⇒ error de campo, sin petición, se conserva la tabla anterior.
3. Rango de un único período ⇒ siempre vacío (no hay histórico).
4. Error de red ⇒ mensaje con "Reintentar"; el resto del dashboard sigue visible.
5. Cambia el rango de F1 ⇒ se vuelve a pedir con el mismo `threshold`.

## F3 · Página B2B vs B2C

**Endpoints**:
- `GET /api/metrics/categories/top` ✅ → `TopCategoriesResponse = CategoryEntry[]`. Parámetros (`TopCategoriesParams`): `operation_type` (`income|outcome`, **defecto `outcome`**), `limit` (1–20, defecto 5), `business_type` (`B2B|B2C`), `start_date`, `end_date`.
- `GET /api/metrics/facets` (solo para el rango de fechas).

Ejemplo: `[{ "category": "sales", "operation_type": "income", "total_amount": 98765.4 }]`.

**Llamadas**: dos en paralelo con `operation_type=income`, `limit=20` y `business_type` = `B2B` / `B2C`. Con la respuesta de cada una, el cliente calcula `groupTotal` (suma), ordena por `total_amount` desc, conserva 5 y calcula `percentOfGroup = total_amount / groupTotal * 100`. Los ingresos solo tienen 2 categorías ✅.

**Casos límite**
1. **Top 5 vacío** en un panel (o en ambos) ⇒ "Sin ingresos B2B/B2C en el rango seleccionado."; sin tabla vacía ni división por cero; cada panel decide por sí mismo.
2. Menos de 5 categorías ⇒ solo las existentes, sin filas de relleno.
3. Una sola llamada falla ⇒ solo ese panel muestra error y "Reintentar"; el gráfico muestra "Comparativa no disponible".
4. Ambos totales 0 ⇒ el gráfico muestra "No hay ingresos en el rango seleccionado".
5. Una sola fecha informada ⇒ ver F1 (se reenvía solo la presente).

## Cuestiones abiertas (❓)

- Respuestas 422 y esquema `/openapi.json` por HTTP: no verificados (solo se ejecutó el código del backend, sin servidor).
- Moneda: la API no la indica; se mantiene el formato actual de `formatCurrency`.
- Resultados de `pytest` / `npm test` del Codespace: no registrados.

## Comprobación de tipos

`tsc --noEmit` dentro de `frontend/` **no** revisa esta carpeta (`tsconfig.app.json` incluye solo `src`). Para comprobarla en modo estricto:

```bash
cd frontend
npx tsc --noEmit --ignoreConfig --strict --skipLibCheck --target es2023 --module esnext --moduleResolution bundler specs/api-types.ts specs/param-types.ts
```
Resultado el 2026-10-14: sin errores; sin `any` ni `object`.

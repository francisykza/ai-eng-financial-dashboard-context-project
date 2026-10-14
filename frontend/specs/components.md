# Especificación de componentes

Rama `feature/frontend-specs`. Esto es una especificación: **no hay código React ni llamadas `fetch` en esta rama**.
Los tipos citados están en [`api-types.ts`](./api-types.ts) y [`param-types.ts`](./param-types.ts); el contrato de datos completo, en [`README.md`](./README.md).
Reglas del repositorio que aplican: `.agents/rules/` (fechas sin `new Date("YYYY-MM-DD")`, imports `import { type X }`, ficheros en kebab-case, alias `@/`).

## Decisiones sobre ambigüedades del enunciado (PM)

| # | Ambigüedad | Decisión | Base |
|---|---|---|---|
| D1 | "Media móvil de 3 períodos" | La API devuelve `baseline_average` = media de **todos** los períodos anteriores, no de 3. La columna se titula **"Media de períodos anteriores"** y no se promete ventana de 3. | Fase 1 ❌ |
| D2 | "% de aumento" | `increase_ratio` es una razón (`1.0201` = +102,01 %). Se muestra con `formatPercent(increase_ratio * 100)`. | Fase 1 ❌ |
| D3 | Umbral 0.01–1.0 | El input limita a 0.01–1.0 (paso 0.01), aunque la API acepta ≥ 0 sin máximo. Valor inválido ⇒ no se llama a la API y se muestra error de campo. | Fase 1 ❌ |
| D4 | "% del total del grupo" | La API no devuelve porcentajes ni negocio por categoría: se hacen **dos llamadas** (B2B y B2C) con `limit=20` (máximo), se suma el total del grupo en cliente y se muestran las 5 primeras ordenadas por `total_amount` desc. | Fase 1 ❌ |
| D5 | `operation_type` por defecto | La API usa `outcome` por defecto; la Funcionalidad 3 envía siempre `operation_type=income`. | Fase 1 ❌ |
| D6 | Categorías "desde facets" | `facets.categories` es global (incluye categorías solo de gasto). Las tablas se construyen con lo que **devuelve** `categories/top`, no con facets; facets solo aporta el rango de fechas. | Fase 1 ❌ |
| D7 | Una sola fecha informada | Se envía solo el parámetro presente (la API admite uno solo). Ver F1. | Fase 1 ✅ |
| D8 | Moneda | No indicada por la API; se usa `formatCurrency` existente sin cambiar. | Fase 1 ❓ |
| D9 | Cabecera fija "2024 - Full Year" | Se sustituye por el rango activo (o `min_date – max_date` si no hay filtro). | código actual |

## Estado compartido

`DateRangeFilter` (`param-types.ts`) vive en el estado de la página y se pasa a F1, F2 y F3. Aplicar el filtro de F1 provoca que `/api/metrics`, `/api/metrics/alerts` se vuelvan a pedir con el mismo rango. Cada componente gestiona sus propios estados de carga y error de forma independiente (el fallo de uno no oculta los demás).

## F1 · Filtro de rango de fechas

### `DateRangeFilter` (componente de UI)

```ts
import { type DateRangeFilter } from '../param-types'
import { type FacetsResponse } from '../api-types'

interface DateRangeFilterProps {
  /** Valor actual del filtro. Ambos campos opcionales. */
  value: DateRangeFilter
  /** Rango disponible de facets; `null` mientras carga o si falló. */
  available: Pick<FacetsResponse, 'min_date' | 'max_date'> | null
  /** Se llama solo cuando el valor resultante es válido. */
  onChange: (next: DateRangeFilter) => void
  /** Deshabilita los inputs mientras se recargan los datos. */
  disabled?: boolean
}
```

Renderizado:
- Dos `<input type="date">` ("Desde", "Hasta"), cada uno opcional, con `min`/`max` = `available.min_date`/`max_date` cuando existan.
- Texto "Datos disponibles: {min_date} – {max_date}" si `available !== null`; si `null`, se omite (los inputs siguen funcionando).
- Botón "Limpiar" visible solo si `value.start_date` o `value.end_date` están definidos.
- Las fechas se tratan como texto `YYYY-MM-DD` (nada de `new Date(texto)`).

Comportamiento:
- **Solo una fecha**: se envía solo ese parámetro (`start_date` ⇒ desde esa fecha hasta el final; `end_date` ⇒ desde el inicio hasta esa fecha). Ambos límites son inclusivos.
- **Campo vacío**: se omite el parámetro (nunca se envía `""`).
- **`start_date > end_date`**: la API devuelve `[]` sin error; la UI lo evita antes: muestra "La fecha inicial no puede ser posterior a la final", no dispara petición y conserva los datos anteriores.
- **Rango fuera de los datos / sin movimientos**: el filtro es válido; los dashboards muestran su estado vacío (ver F2/F3 y KPIs en cero).
- **Facets no disponible**: sin texto de rango ni `min`/`max`; el filtro sigue operativo.

## F2 · Alertas de anomalías

### `AlertsPanel` (contenedor, bajo los gráficos)

```ts
import { type DateRangeFilter } from '../param-types'

interface AlertsPanelProps {
  /** Rango activo de F1; se reenvía a la API. */
  dateRange: DateRangeFilter
}
```

Estado interno: `threshold: number` (por defecto `0.3`), `status: 'loading' | 'error' | 'ready'`, `alerts: AlertsResponse`. Pide `GET /api/metrics/alerts` con `AlertsParams = { ...dateRange, threshold }` cuando cambia el umbral válido o el rango.

### `ThresholdInput`

```ts
interface ThresholdInputProps {
  value: number
  onChange: (next: number) => void   // solo valores válidos
}
```
- `<input type="number" min="0.01" max="1" step="0.01">`, etiqueta "Umbral de aumento (0,01–1,0)". Se interpreta como razón (0.3 = 30 %).
- Valor vacío, no numérico o fuera de [0.01, 1.0]: mensaje de error bajo el campo, **no** se llama a la API y se mantiene la tabla anterior.

### `AlertsTable`

```ts
import { type AlertEntry } from '../api-types'

interface AlertsTableProps {
  alerts: AlertEntry[]
  threshold: number   // para el texto del estado vacío
}
```

Columnas: **Período** (`period`, tal cual: `YYYY-MM`), **Gasto** (`outcome_total`, moneda), **Media de períodos anteriores** (`baseline_average`, moneda), **% de aumento** (`increase_ratio * 100`, un decimal, con signo `+`). Orden: el devuelto por la API (cronológico).

Renderizado condicional:
- `loading` ⇒ skeleton de tabla (componente `ui/skeleton`).
- `error` ⇒ mensaje en español "No se pudieron cargar las alertas" con botón "Reintentar"; el resto del dashboard no se ve afectado.
- `ready` y `alerts.length === 0` ⇒ **estado vacío explícito** (no una tabla sin filas): "No se detectaron anomalías con un umbral de {threshold*100} % en el rango seleccionado." Se muestra igual para umbral alto (p. ej. 5.0 ⇒ `[]`) y para un rango sin datos.
- `ready` y `alerts.length > 0` ⇒ tabla.

Casos límite: el primer período nunca genera alerta (no hay histórico); un rango de un solo período siempre da estado vacío; umbral 0.01 devuelve más filas que 1.0 (valores comprobados: 0.3⇒4, 0.01⇒5, 1.0⇒1 con datos de 2026-10-14).

## F3 · Página B2B vs B2C

Navegación: sin librería de rutas. Estado `view: 'dashboard' | 'b2b-b2c'` en `App` con pestañas/botones; el rango de F1 se conserva al cambiar de vista.

### `BusinessComparisonPage` (contenedor)

```ts
import { type DateRangeFilter } from '../param-types'

interface BusinessComparisonPageProps {
  dateRange: DateRangeFilter
  onDateRangeChange: (next: DateRangeFilter) => void
}
```

Datos: dos peticiones en paralelo, `TopCategoriesParams` = `{ ...dateRange, operation_type: 'income', limit: 20, business_type: 'B2B' | 'B2C' }` (D4). Cada panel tiene su propio estado (`loading | error | ready`).

### Modelo derivado (cliente)

```ts
import { type BusinessType, type Category } from '../src/lib/financial-types'

interface CategoryShare {
  category: Category
  totalAmount: number
  /** 0–100, sobre el total del grupo (suma de TODAS las categorías devueltas). */
  percentOfGroup: number
}

interface GroupSummary {
  businessType: BusinessType
  /** Suma de total_amount de todas las categorías devueltas. 0 si no hay datos. */
  groupTotal: number
  /** Máximo 5, orden total_amount descendente. */
  top: CategoryShare[]
}
```

### `TopCategoriesTable`

```ts
interface TopCategoriesTableProps {
  title: string                 // "B2B" | "B2C"
  summary: GroupSummary | null  // null mientras carga
  status: 'loading' | 'error' | 'ready'
  onRetry: () => void
}
```

Columnas: **Categoría**, **Total** (moneda), **% del total del grupo** (un decimal; el `percentOfGroup` se calcula con `groupTotal`, nunca con el total de las 5 filas).

Renderizado:
- `loading` ⇒ skeleton; `error` ⇒ mensaje + "Reintentar" solo en ese panel.
- `ready` con `top.length === 0` ⇒ **top 5 vacío**: "Sin ingresos {B2B|B2C} en el rango seleccionado." en ese panel, **sin** tabla vacía y **sin** dividir por cero. Se aplica a **ambos paneles de forma independiente** (puede estar vacío solo uno).
- `ready` con menos de 5 categorías (hoy ingresos solo tienen `sales` y `others`) ⇒ se muestran las que haya, sin filas de relleno.

### `BusinessTotalsChart`

```ts
interface BusinessTotalsChartProps {
  b2b: GroupSummary | null
  b2c: GroupSummary | null
}
```
Un único gráfico de barras (Recharts, tokens Tailwind existentes) con dos barras: `groupTotal` de B2B y de B2C.
- Cualquiera de los dos `null` o en error ⇒ el gráfico no se pinta y muestra "Comparativa no disponible".
- Ambos con `groupTotal === 0` ⇒ mensaje "No hay ingresos en el rango seleccionado" en lugar de un gráfico plano.
- Solo uno a 0 ⇒ se pinta con esa barra a 0.

### Filtro de fechas en la página
Reutiliza `DateRangeFilter` (F1) con los mismos comportamientos (una sola fecha, `start > end`). Cambiar el rango recarga ambos paneles y el gráfico a la vez.

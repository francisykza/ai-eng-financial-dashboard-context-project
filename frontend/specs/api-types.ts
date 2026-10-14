/**
 * Tipos de las RESPUESTAS de la API usadas por las tres funcionalidades nuevas.
 *
 * Fuente: modelos pydantic de `backend/app/routes.py` (`MetricsFacets`,
 * `MetricsAlert`, `TopCategoryItem`), comprobados el 2026-10-14. Los tipos
 * `OperationType`, `Category` y `BusinessType` ya existen en el frontend y se
 * reutilizan para que no puedan desalinearse.
 */
import {
  type BusinessType,
  type Category,
  type OperationType,
} from '../src/lib/financial-types'

/**
 * Fecha de calendario en formato ISO `YYYY-MM-DD`, por ejemplo `2026-09-28`.
 * No lleva hora ni zona horaria. No se debe convertir con `new Date(texto)`:
 * se interpreta como UTC y puede cambiar de día (regla `frontend-dates`).
 */
export type IsoDate = string

/**
 * Respuesta de `GET /api/metrics/facets` (sin parámetros).
 * Se usa en la Funcionalidad 1 (rango de fechas disponible) y en la
 * Funcionalidad 3 (rango de fechas del filtro).
 */
export interface FacetsResponse {
  /**
   * Tipos de operación presentes en los datos, ordenados alfabéticamente.
   * Valores posibles: `'income'` o `'outcome'`.
   */
  operation_types: OperationType[]
  /**
   * Líneas de negocio presentes en los datos, ordenadas alfabéticamente.
   * Valores posibles: `'B2B'` o `'B2C'`.
   */
  business_types: BusinessType[]
  /**
   * Categorías presentes en los datos, ordenadas alfabéticamente. Es una lista
   * GLOBAL: incluye categorías que solo existen en gastos (por ejemplo
   * `'suppliers'`). No sirve para saber qué categorías de ingreso tiene cada
   * línea de negocio.
   */
  categories: Category[]
  /** Fecha del movimiento más antiguo, formato `YYYY-MM-DD`. Cambia con el tiempo (ventana móvil de 12 meses). */
  min_date: IsoDate
  /** Fecha del movimiento más reciente, formato `YYYY-MM-DD`. Es igual o posterior a `min_date`. */
  max_date: IsoDate
}

/**
 * Una alerta de la tabla de anomalías: un período cuyo gasto superó el umbral.
 * Es un elemento de la respuesta de `GET /api/metrics/alerts` (Funcionalidad 2).
 */
export interface AlertEntry {
  /**
   * Período de la alerta. Depende del parámetro `group_by`:
   * `'2026-03'` (`month`, por defecto), `'2026-W10'` (`week`, semana ISO) o
   * `'2026-03-02'` (`day`).
   */
  period: string
  /** Gasto total (`outcome`) del período, en la unidad monetaria de los datos (la API no indica la moneda). Redondeado a 2 decimales. */
  outcome_total: number
  /**
   * Media del gasto de TODOS los períodos anteriores dentro del rango consultado
   * (no una media móvil de 3 períodos). Siempre mayor que 0. Redondeada a
   * 2 decimales.
   */
  baseline_average: number
  /**
   * Incremento relativo respecto a `baseline_average`, como RATIO: `0.56`
   * significa +56 %. Siempre mayor que el `threshold` pedido. Redondeado a
   * 4 decimales.
   */
  increase_ratio: number
}

/**
 * Respuesta de `GET /api/metrics/alerts`: lista de alertas ordenada por período
 * ascendente. Puede estar vacía (ninguna anomalía para ese umbral o rango); eso
 * no es un error. El primer período del rango nunca aparece, porque aún no tiene
 * histórico.
 */
export type AlertsResponse = AlertEntry[]

/**
 * Una categoría con su total. Es un elemento de la respuesta de
 * `GET /api/metrics/categories/top` (Funcionalidad 3).
 */
export interface CategoryEntry {
  /** Categoría. Valores posibles: `'suppliers'`, `'sales'`, `'operational'`, `'administrative'` o `'others'`. */
  category: Category
  /** Tipo de operación pedido. Es igual en todos los elementos de la respuesta. */
  operation_type: OperationType
  /**
   * Suma de los importes de la categoría en el rango y la línea de negocio
   * pedidos. Redondeada a 2 decimales. No hay porcentaje: se calcula en el
   * cliente.
   */
  total_amount: number
}

/**
 * Respuesta de `GET /api/metrics/categories/top`: categorías ordenadas por
 * `total_amount` de mayor a menor. Tiene como máximo `limit` elementos y puede
 * tener menos: con `operation_type=income` solo existen 2 categorías
 * (`'sales'` y `'others'`). Puede estar vacía si no hay datos en el rango. La
 * respuesta no indica la línea de negocio: se sabe por el parámetro enviado.
 */
export type TopCategoriesResponse = CategoryEntry[]

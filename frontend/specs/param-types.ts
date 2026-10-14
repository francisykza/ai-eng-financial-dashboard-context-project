/**
 * Tipos de los PARÁMETROS DE CONSULTA (query string) de los endpoints usados por
 * las tres funcionalidades nuevas.
 *
 * Fuente: firmas de `backend/app/routes.py`, comprobadas el 2026-10-14. Todos
 * los parámetros son opcionales. Un parámetro sin valor NO se envía: no se debe
 * mandar una cadena vacía (por ejemplo `start_date=`).
 */
import {
  type BusinessType,
  type OperationType,
} from '../src/lib/financial-types'

/** Agrupación temporal de `GET /api/metrics/alerts`. Valores posibles: `'day'`, `'week'` o `'month'`. */
export type GroupBy = 'day' | 'week' | 'month'

/**
 * Filtro de rango de fechas. Lo comparten el endpoint de métricas, el de alertas
 * y el de categorías (Funcionalidad 1).
 */
export interface DateRangeFilter {
  /**
   * Primera fecha incluida, formato `YYYY-MM-DD` (por ejemplo `2026-01-01`).
   * Opcional: si falta, no hay límite inferior. Se compara con `>=`.
   */
  start_date?: string
  /**
   * Última fecha incluida, formato `YYYY-MM-DD` (por ejemplo `2026-03-31`).
   * Opcional: si falta, no hay límite superior. Se compara con `<=`. Si es
   * anterior a `start_date`, la API responde una lista vacía, no un error.
   */
  end_date?: string
}

/** Parámetros de `GET /api/metrics/alerts` (Funcionalidad 2). */
export interface AlertsParams extends DateRangeFilter {
  /**
   * Umbral de alerta, como ratio: `0.3` significa +30 % sobre la media de los
   * períodos anteriores. La API acepta cualquier número mayor o igual que 0, sin
   * máximo. Por defecto `0.3`. El producto limita la interfaz a `0.01`-`1.0`
   * (ver `frontend/specs/README.md`).
   */
  threshold?: number
  /** Agrupación temporal. Por defecto `'month'`. La interfaz usa siempre `'month'`. */
  group_by?: GroupBy
  /** Línea de negocio. Si falta, se incluyen ambas. La Funcionalidad 2 no la usa. */
  business_type?: BusinessType
}

/** Parámetros de `GET /api/metrics/categories/top` (Funcionalidad 3). */
export interface TopCategoriesParams extends DateRangeFilter {
  /**
   * Tipo de operación. Por defecto la API usa `'outcome'` (gastos), así que la
   * comparativa de ingresos DEBE enviar `'income'` siempre.
   */
  operation_type?: OperationType
  /** Número máximo de categorías. Entero de 1 a 20. Por defecto 5. */
  limit?: number
  /** Línea de negocio, `'B2B'` o `'B2C'`. Si falta, se suman ambas. */
  business_type?: BusinessType
}

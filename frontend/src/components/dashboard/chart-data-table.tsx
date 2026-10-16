interface ChartDataTableProps {
  caption: string
  columns: string[]
  /** Cada fila empieza por su etiqueta (p. ej. el mes), que se usa como cabecera de fila. */
  rows: string[][]
}

/**
 * Alternativa en texto de una gráfica (WCAG 1.1.1): tabla solo visible para lectores de pantalla.
 * Skill `accessibility`, sección "Text alternatives".
 */
export function ChartDataTable({ caption, columns, rows }: ChartDataTableProps) {
  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <thead>
        <tr>
          {columns.map((column) => (
            <th key={column} scope="col">
              {column}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map(([label, ...cells]) => (
          <tr key={label}>
            <th scope="row">{label}</th>
            {cells.map((cell, index) => (
              <td key={columns[index + 1]}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

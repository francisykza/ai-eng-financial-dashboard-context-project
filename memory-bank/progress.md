# Progreso: skills de agente (rama `feature/agent-skills`)

Sesión del 2026-10-16, sobre `main` (`2fb2c94`). Leyenda: ✅ comprobado ejecutando · ❌ hallazgo sin resolver · ❓ no ejecutado. Los commits se citan por hash.

## Comprobación en Codespaces (2026-10-16)

Copia limpia de la rama en el commit `3e92e18`, en un Codespace con red: ✅ `npm install`, ✅ `npm run lint`, ✅ `npm run build`, ✅ `npm test` (10 tests) y ✅ `TZ=America/New_York npm test` (10 tests), todos con código de salida 0. El build avisa de que un paquete supera los 500 kB; el mismo aviso sale en `main`, y el paquete pasa de 175,16 kB a 175,44 kB (gzip), +0,28 kB.

Seguía sin ejecutarse en esa sesión: `npx skills find`, Lighthouse y la prueba con teclado y lector de pantalla. La mayor parte del trabajo de las secciones de abajo se hizo antes de esta comprobación, sin acceso a npm, y esas notas conservan el método que se usó entonces.

## Skills cargadas y aplicadas

| Skill | Origen | Dónde | Commit |
|---|---|---|---|
| `accessibility` | `addyosmani/web-quality-skills` | `.agents/skills/accessibility` | `1618b89` (carga), `722b191` (aplicación) |
| `vercel-react-best-practices` | `vercel-labs/agent-skills` (carpeta `react-best-practices`) | `.agents/skills/vercel-react-best-practices` | `1618b89`, `65d9f6a` |
| `tdd` (adicional) | `mattpocock/skills` | `.agents/skills/tdd` | `c4fa345` |
| `dashboard-pre-merge-check` (interna) | este repo | `.skills/dashboard-pre-merge-check` | `55ccb73` |

Las dos primeras se copiaron sin cambios, que es lo que hace `npx skills add`. `AGENTS.md` ahora menciona `.skills/`.

## `accessibility` (`722b191`)

Cambios, cada uno ligado a una instrucción de `.agents/skills/accessibility/SKILL.md`:

- `frontend/index.html`: título `Financial Overview` en lugar de `frontend` (2.4.2).
- `App.tsx`: `role="alert"` y `lang="es"` en el aviso de error (3.3.1, 4.1.3, 3.1.2); `aria-busy` en las secciones mientras carga.
- Gráficas: `role="heading" aria-level={2}` en los títulos de tarjeta y tabla solo para lectores de pantalla con los datos mensuales (nuevo `chart-data-table.tsx`) como alternativa en texto (1.1.1, 1.3.1).
- Iconos decorativos con `aria-hidden` (`kpi-card.tsx`, `dashboard-header.tsx`).
- `ui/skeleton.tsx`: `motion-safe:animate-pulse` (2.3).

Verificación:
- ✅ Contraste calculado desde las variables OKLCH de `index.css` (tema `.dark`, el que usa la app): texto ≥ 5,17:1 y líneas de gráfica ≥ 5,08:1 (mínimos 4,5:1 y 3:1). Sin cambios necesarios.
- ✅ Sintaxis TS/TSX de los archivos tocados (`transpileModule`) y ✅ `tsc -b`, `eslint` y `vite build` pasan en Codespaces.
- ✅ No hay elementos interactivos (botones, enlaces, formularios) en la interfaz actual, así que no hay orden de tabulación ni foco propio que corregir.
- ❓ Teclado y lector de pantalla con la app en marcha, Lighthouse/axe, y qué ofrece Recharts (`accessibilityLayer`) en esta versión: no ejecutados.
- ❓ Que lucide-react ponga `aria-hidden` por defecto: no comprobado; se añadió explícito.
- ❌ Las animaciones de Recharts (JS) no respetan `prefers-reduced-motion`; queda pendiente.

## `vercel-react-best-practices` (`65d9f6a`)

El proyecto es Vite, no Next.js: no aplican `next/image`, `next/font`, metadatos por página ni las reglas `server-*`. Se aplicó lo que sí encaja:

- `js-combine-iterations`: `computeKPIs` recorre los movimientos una vez.
- `js-hoist-regexp` / `js-cache-function-results` (mismo principio): `Intl.NumberFormat` de `formatCurrency` se crea una vez a nivel de módulo.

Verificación: ✅ `computeKPIs`, `computeMonthlyData` y `formatCurrency` dan salidas idénticas a las anteriores en 2000 casos aleatorios (Node). ✅ `npm run build` y `npm run lint` pasan (ver arriba).

Descartado sin medir (no hay build para medir): carga diferida de Recharts (`bundle-dynamic-imports`) y sacar objetos de props de las gráficas.

## Exploración del ecosistema

`npx skills find` no se pudo ejecutar. Se exploró el ranking de skills.sh y GitHub para dos temas:

- **testing**: `tdd` (`mattpocock/skills`) y `test-driven-development` (`obra/superpowers`).
- **typescript / flujo de commits**: `setup-ts-deep-modules`, `setup-pre-commit` y `git-guardrails-claude-code` (`mattpocock/skills`), `caveman-commit` (`juliusbrussee/caveman`).

Solo `tdd` se descargó y se leyó entera; el resto se conoce por el ranking.

**Elegida: `tdd`.** Motivo: el hueco documentado en `current-state.md` es que los tests solo cubren `src/lib`. Se aplicó con los seams que ya existen en `financial-utils.test.ts` y se añadieron 4 tests con valores literales (lista vacía, margen negativo, cero y negativos en `formatCurrency`). Son tests de caracterización que protegen el refactor de `65d9f6a`; no hubo fase roja.
- ✅ Los 10 tests del archivo pasan con un sustituto mínimo de vitest en `UTC`, `Europe/Madrid` y `America/New_York`.
- ✅ `npm test` real: 10 tests pasan, también con `TZ=America/New_York` (ver arriba). ❓ La skill pide confirmar los seams con el equipo antes de escribir tests: aquí se tomaron de los tests existentes y nadie los ha confirmado.

**No elegidas:** `setup-pre-commit` añade dependencias (husky, lint-staged), y la regla `frontend-tests` pide avisar antes de cambiar dependencias.

## Skill interna: `dashboard-pre-merge-check` (`55ccb73`)

Cubre el flujo de revisión previa a la fusión propio de este repo: comandos por tipo de cambio, `TZ=America/New_York` para fechas, los greps de `.agents/rules`, memory bank y commits. Sigue la estructura objetivo / inputs / pasos / output / criterios de aceptación.

Probada sobre esta rama (paso 4): ✅ `new Date(` solo aparece en `formatMonthYearLabel`; ✅ sin colores hexadecimales; ✅ sin `any`; ❌ `Full Year` sigue en `App.tsx` y `dashboard-header.tsx`. Es el hueco ya listado en `current-state.md` y su corrección depende de una decisión pendiente (prioridad 2); no se tocó. Esta rama sí modifica `dashboard-header.tsx` (solo `aria-hidden`).

## Pendiente

1. (Hecho) `npm run lint`, `npm run build` y `npm test`, también con `TZ=America/New_York`.
2. Probar teclado y lector de pantalla con la app en marcha y pasar Lighthouse.
3. Decidir la etiqueta de periodo (`Full Year`).

# Project memory

## Product intent & audience

- Inventory and configuration management app, likely for 3D printing (references electricity cost, consumption, wear, alert thresholds, materials with price per kilo).
- Spanish-language UI for end users managing materials, cost parameters, and stock.

## Brand personality & voice

- Practical, utility-focused tone. Spanish throughout the interface.
- Clear, direct labels (e.g. "Exportar CSV", "Configuración", "Inventario").

## Visual design & UX direction

- Tab-based navigation: at least **Inventario** and **Configuración** tabs.
- Export buttons placed top-right within each tab.
- CSV as the export format.
- Built with Vite + React (JSX), Tailwind CSS, React hooks, Lucide React icons.
- Aesthetic goal: beautiful, production-worthy, non-cookie-cutter — per `.bolt/prompt`.
- No extra UI/icon packages beyond template defaults.

## Decisions, constraints & rationale

- Inventory export already existed and remains unchanged.
- Configuration export added: downloads **two CSV files** — one for cost parameters (electricity, consumption, wear, alert), one for materials and variants with price per kilo.
- Export kept as separate downloads rather than a single combined file to preserve data clarity.

## Open questions & assumptions

- Assumed 3D printing domain based on parameter names; not yet confirmed by user.
- Import / restore functionality for configuration not yet requested — unknown if needed.
- No confirmation on whether other export formats (JSON, Excel) are desired.
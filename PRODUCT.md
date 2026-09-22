# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

- Frontend: Vite + React in `web/`, with Recharts for charts (Plotly remains an option if a chart type needs it).
- Backend: FastAPI in `api/`, serving the processed NCUA Call Report panel.
- Data pipeline: Python — pandas for ingestion/transformation, statsmodels and/or scikit-learn for forecasting.
- Deploy target: undecided.

## Users

- **Primary user (the scene the product is designed for):** a credit union financial analyst doing forecasting, reporting, or peer benchmarking work — looking up an institution, reading its trend history, checking where it's headed, and judging it against comparable peers.
- **Actual evaluators:** hiring managers and interviewers for a financial forecasting & reporting role. CU Pulse is a portfolio/application project; it succeeds when an evaluator believes it is a tool an analyst would genuinely use, and can see the analytical rigor behind it.

## Product Purpose

CU Pulse lets a user select any U.S. federally insured credit union and understand its financial health in one place:

1. **Historical trends** — loan growth, deposit growth, net worth ratio, delinquency rate, ROA.
2. **Forecast** — a 4-quarter-ahead forecast of key balance sheet metrics.
3. **Peer comparison** — the institution benchmarked against similarly sized credit unions.

Success: an analyst can go from "which credit union?" to a defensible read on its health, trajectory, and peer standing quickly, and an evaluator comes away convinced of the builder's forecasting and reporting competence.

## Positioning

Built directly on NCUA's public quarterly Call Report filings, covering every federally insured credit union, and combining history, a forward-looking forecast, and size-matched peer benchmarking in a single view — the three things a CU analyst otherwise assembles by hand from raw 5300 data.

## Operating Context

- Source data: NCUA quarterly Call Report (Form 5300) public filings, pulled live by the pipeline. Cadence is quarterly, so data is always as of the latest filed quarter.
- Usage resembles an internal analytics tool: desk work, focused sessions, comparing numbers across quarters and institutions.
- Evaluators will likely view it via a demo link or walkthrough during an application or interview.

## Capabilities and Constraints

- Institution selection across all U.S. federally insured credit unions.
- Metrics in scope: loan growth, deposit growth, net worth ratio, delinquency rate, ROA; forecast covers key balance sheet metrics 4 quarters ahead.
- Terminology should follow NCUA/industry usage (e.g. "net worth ratio", "delinquency rate", Call Report quarters).
- Forecast: total assets, loans, shares & deposits, and net worth ratio, 4 quarters ahead; drift vs damped seasonal ETS vs ARIMA(1,1,0), selected by an 8-origin rolling backtest; 50/80/95% intervals with backtest coverage reported.
- Peers: the 25 active credit unions nearest in log total assets at the latest quarter, held fixed through history (NCUA's own peer groups top out at "over $500M").
- Data is snapshotted: the pipeline downloads quarterly zips (2018Q1 onward) and builds a local panel; rerun it when NCUA publishes a new quarter.
- Default institution: Navy Federal Credit Union (charter 5536).

## Brand Commitments

- Name: **CU Pulse**. No existing logo or copy voice; visual direction is delegated.
- Stated feel (user's words, binding as intent): "a professional internal analytics tool a credit union analyst would actually use, not a consumer app. Clean, data-dense, trustworthy — think Bloomberg terminal energy but approachable, not a flashy consumer SaaS look."

## Evidence on Hand

- Real NCUA 5300 Call Report data, 2018Q1–2026Q2, every federally insured credit union (api/data/processed/call_reports.csv.gz).
- No testimonials, users, or case studies exist. Do not fabricate institution figures, forecasts, accuracy claims, or usage stats. The app must not imply affiliation with NCUA or any credit union, including Navy Federal.

## Product Principles

1. **Analyst-grade, not consumer-grade.** Density, precision, and scanability beat friendliness and decoration.
2. **Trust through traceability.** Every number is tied to its source quarter and definition; forecasts are clearly distinguished from reported actuals.
3. **Context is the insight.** A metric means little alone — show it against its own history and against size-matched peers.
4. **Show the rigor.** Forecast method and assumptions should be inspectable; this is what the evaluating audience is judging.

## Accessibility & Inclusion

No product-specific requirements beyond good defaults (WCAG AA contrast, keyboard access, charts not relying on color alone).

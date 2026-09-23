# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

- Frontend: Vite + React in `web/`, with Recharts for charts.
- Backend: FastAPI in `api/`, serving the processed NCUA Call Report panel and, in production, the built frontend as a single service.
- Data pipeline: Python — pandas for ingestion and transformation, statsmodels for forecasting.
- Tests: pytest (API, pipeline, forecasting) and Vitest (frontend logic), run by GitHub Actions on every push.
- Deployment: Docker on Render (free tier, redeploys on every push to `main`) at https://cu-pulse.onrender.com; UptimeRobot checks `/api/health` every 5 minutes so the service never sleeps.

## Users

- **Primary user (the scene the product is designed for):** a credit union financial analyst doing forecasting, reporting, or peer benchmarking work — looking up an institution, reading its trend history, checking where it's headed, and judging it against comparable peers.
- **Secondary user:** someone new to credit union analysis (a student or career-changer). The product must stay approachable for them: plain-language summaries, definitions at the point of use, and a clear path through the pages, without diluting the analyst depth.
- **Actual evaluators:** hiring managers and interviewers for financial forecasting & reporting roles. CU Pulse is a portfolio project; it succeeds when an evaluator believes it is a tool an analyst would genuinely use, and can see the analytical rigor behind it.

## Product Purpose

CU Pulse lets a user pick any U.S. federally insured credit union and understand its financial health in one place:

1. **Historical trends** — net worth ratio, loan and deposit growth, delinquency, net charge-offs, ROA, loan-to-share.
2. **Forecast** — four quarters ahead for key balance sheet and capital metrics, with the model's tested accuracy.
3. **Peer comparison** — against the 25 closest credit unions by size.
4. **Stress test** — how much loss capital can absorb before NCUA's 7% well-capitalized line.

Success: an analyst goes from "which credit union?" to a defensible read on health, trajectory, and peer standing quickly; a newcomer understands the picture in plain terms; an evaluator comes away convinced of the builder's forecasting and reporting competence.

## Positioning

Built directly on NCUA's public quarterly Call Report filings, covering every federally insured credit union, and combining history, an honestly tested forecast, size-matched peer benchmarking, and a capital stress test in a single view — work a credit union analyst otherwise assembles by hand from raw 5300 data.

## Operating Context

- Source data: NCUA quarterly Call Report (Form 5300) public files. The API checks ncua.gov daily for the next quarter and for amendments to the last two, merges changes, and reloads without a restart; NCUA usually publishes about two months after quarter end.
- Usage resembles an internal analytics tool: desk work, focused sessions, comparing numbers across quarters and institutions.
- Evaluators view it through the live link or a walkthrough during an application or interview; links can carry a specific view (a stress scenario, a peer sort).

## Capabilities and Constraints

- Landing page with institution search, a live featured read-out (Navy Federal Credit Union, charter 5536), the largest credit unions, and industry trends.
- Per-institution pages: Overview (plain-language summary, vital signs with peer percentiles, net worth fan, computed reading), Trends, Forecast (with backtest), Peers, Stress test, Method; plus a printable one-page report.
- Site-wide pages: a Navy Federal case study, forecast accuracy across all credit unions, and a glossary.
- Net worth ratio is NCUA's reported figure (ACCT_998), with net worth ÷ assets shown when the two differ; other ratios follow Financial Performance Report conventions and are labeled as derived.
- Forecast: total assets, loans, shares & deposits (in logs) and net worth ratio (in levels), four quarters ahead; drift vs damped seasonal ETS vs ARIMA(1,1,0), chosen by an 8-origin rolling backtest; 50/80/95% ranges with measured coverage; volatile histories are labeled low confidence rather than forecast.
- Peers: the 25 active credit unions nearest in log total assets at the latest quarter, held fixed through history.
- Stress test: illustrative four-quarter capital arithmetic (charge-offs, pre-loss ROA, asset growth), with a charge-off breakeven to 7%; not a supervisory stress test, and no interest-rate or risk-based-capital modeling.
- Terminology follows NCUA and industry usage; every term has a plain definition available in place.

## Brand Commitments

- Name: **CU Pulse**. No logo; visual direction was delegated and is recorded in DESIGN.md.
- Stated feel (user's words, binding as intent): "a professional internal analytics tool a credit union analyst would actually use, not a consumer app. Clean, data-dense, trustworthy — think Bloomberg terminal energy but approachable, not a flashy consumer SaaS look."
- Builder line (approved): "Built by Damola Akinyemi as a portfolio project for financial forecasting & reporting roles", linking to the GitHub repository. Target-employer specifics stay out of the public product and repo.
- Not affiliated with NCUA or any credit union, stated on every page.

## Evidence on Hand

- Real NCUA 5300 Call Report data, 2018Q1–2026Q2, every federally insured credit union (`api/data/processed/call_reports.csv.gz`).
- Industry-wide out-of-sample backtest across all active credit unions (`api/data/processed/backtest_summary.json`): the model is chosen on the earliest 4 origins and scored on the last 4. Loans: 21% lower median error than drift (4.09% vs 5.17%); 80% ranges held 72% of outcomes.
- Navy Federal case study, generated from the data (`CASE_STUDY.md`, and the live Case study page).
- No testimonials, users, or customers exist. Do not fabricate institution figures, forecasts, accuracy claims, or usage stats.

## Product Principles

1. **Analyst-grade, not consumer-grade.** Density, precision, and scanability beat friendliness and decoration.
2. **Trust through traceability.** Every number names its source account and quarter; figures are labeled as filed, derived, or model output; forecasts are always visually distinct from reported values.
3. **Context is the insight.** A metric means little alone — show it against its own history and against size-matched peers.
4. **Show the rigor, including where it falls short.** Forecast method, accuracy, and limits are inspectable; weak results are reported, not hidden.
5. **Plain terms first, depth one step away.** Every page answers its question in plain language before the detail, so a newcomer can follow without the analyst losing anything.

## Accessibility & Inclusion

No product-specific requirements beyond good defaults: WCAG AA contrast, keyboard access (charts included), and charts that do not rely on color alone.

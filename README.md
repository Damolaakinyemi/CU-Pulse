# CU Pulse

Financial health, four-quarter forecasts, and size-matched peer benchmarks for every U.S. federally insured credit union, built on NCUA's public 5300 Call Report data. Opens on Navy Federal Credit Union (charter 5536).

Product context lives in [PRODUCT.md](PRODUCT.md).

## What it does

- **Overview:** headline ratios with peer percentiles, the net worth ratio with a 50/80/95% forecast fan over NCUA capital tiers, a reading generated from the numbers, and as-filed balances with their account codes.
- **Trends:** seven ratios against the peer median and middle 50%, over 3 years, 5 years or all history. Hovering one chart moves the cursor on all of them.
- **Forecast:** total assets, loans, shares & deposits and the net worth ratio four quarters ahead. For each series, three models (random walk with drift, damped seasonal exponential smoothing, ARIMA) compete in an 8-origin rolling backtest. The page shows each model's error by horizon, how often its ranges contained the actual value, and a predicted-versus-reported table.
- **Peers:** the 25 credit unions nearest in total assets, in a sortable table with the subject pinned, plus per-metric distribution strips.
- **Stress test:** one severity control moves charge-offs, pre-loss ROA and asset growth together; each lever can also be set by hand. Shows the four-quarter capital path against the 7% well-capitalized line and the extra charge-off rate the institution could absorb before crossing it.
- **Method:** data lineage, formulas and account codes, peer and forecast methodology, limitations.
- **One-page report:** a printable read-out of any institution (Print or save as PDF).

## Run

```bash
# 1. API dependencies. A prebuilt data panel (api/data/processed/call_reports.csv.gz) is committed.
cd api
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
# Optional: refresh the panel from ncua.gov (34 quarterly zips, ~280 MB)
.venv/bin/python -m pipeline.ncua --download

# 2. API (http://127.0.0.1:8000, docs at /docs)
.venv/bin/uvicorn app.main:app --reload

# 3. Web (http://localhost:5173, proxies /api to :8000)
cd ../web
npm install
npm run dev
```

## Staying current with NCUA

While the API runs, it checks ncua.gov every 24 hours for the next quarter's Call Report file, and re-checks the two most recent quarters for amendments. When anything changed, it rebuilds the panel and swaps it in without a restart. Open pages show a banner offering to load the new quarter. NCUA usually publishes about two months after quarter end.

- Change the interval with `CUPULSE_UPDATE_HOURS` (e.g. `CUPULSE_UPDATE_HOURS=6`); `0` turns checks off.
- Run a check by hand: `.venv/bin/python -m pipeline.ncua --update`.
- Status (last check, the quarter it is waiting for, any error) is in `/api/meta` under `updates` and on the Method page.

## Accuracy

- **As filed:** balances and the net worth ratio (NCUA's reported `ACCT_998`, the figure prompt corrective action uses).
- **Derived:** growth, delinquency, ROA, net charge-offs and loan-to-share, calculated with FPR conventions; they can differ slightly from NCUA's own FPR.
- **Model output:** forecasts, the generated reading, peer percentiles and stress results.

The Method page's Data notes cover names, extreme values and mergers.

## Layout

- `api/pipeline/ncua.py`: downloads and parses the Call Report zips (`FOICU`, `FS220`, `FS220A`) into `data/processed/call_reports.csv.gz`
- `api/pipeline/metrics.py`: ratio definitions (FPR conventions), capital (PCA) tiers, peer selection and statistics
- `api/pipeline/forecast.py`: candidate models, rolling-origin backtest, interval coverage
- `api/app/main.py`: FastAPI routes `/api/meta`, `/api/credit-unions?q=`, `/api/credit-unions/{charter}`, `/peers`, `/forecast`
- `web/src/`: React app (Vite, Recharts, Public Sans). `views/` has one file per section; `lib/analysis.js` holds the generated reading and the stress-test math.

Not affiliated with NCUA or any credit union.

// Plain-language definitions for newcomers. Each entry: what it is, and why it matters.
export const GLOSSARY = {
  net_worth_ratio: {
    term: 'Net worth ratio',
    what: 'The share of a credit union’s assets funded by its own capital (retained earnings) rather than by members’ deposits.',
    why: 'It is the cushion that absorbs losses. NCUA calls 7% or more “well capitalized”; below 6% it starts to step in.',
  },
  well_capitalized: {
    term: 'Well capitalized',
    what: 'NCUA’s top capital category: a net worth ratio of 7% or more. Lower tiers are adequately capitalized (6–7%), undercapitalized (4–6%) and below.',
    why: 'Falling below a tier triggers regulatory action, so the distance to 7% is a key safety margin.',
  },
  loan_growth_yoy: {
    term: 'Loan growth',
    what: 'How much the credit union’s total loans grew compared with the same quarter a year earlier.',
    why: 'Fast growth can mean strong demand, or taking on risk; very fast jumps often mean a merger.',
  },
  deposit_growth_yoy: {
    term: 'Share & deposit growth',
    what: 'Growth in members’ savings over the past year. Credit unions call deposits “shares” because members are part-owners.',
    why: 'Deposits fund the loans. If loans grow much faster than deposits, the credit union needs other funding.',
  },
  delinquency_rate: {
    term: 'Delinquency rate',
    what: 'The share of loans that are 60 or more days behind on payments.',
    why: 'An early warning: today’s late payments are often tomorrow’s losses. Lower is better.',
  },
  net_charge_off_rate: {
    term: 'Net charge-off rate',
    what: 'Loans written off as unrecoverable this year, minus anything later recovered, as a share of all loans.',
    why: 'These are actual credit losses. They come straight out of earnings. Lower is better.',
  },
  roa: {
    term: 'Return on assets (ROA)',
    what: 'Net income for the year divided by total assets: how much the credit union earns on everything it holds.',
    why: 'Earnings are how a credit union builds capital. Higher is generally stronger.',
  },
  loan_to_share: {
    term: 'Loan-to-share ratio',
    what: 'Total loans divided by total deposits.',
    why: 'Shows how much of members’ savings is lent back out. Very high can strain liquidity; very low can mean weak lending.',
  },
  percentile: {
    term: 'Percentile of peers',
    what: 'Where the credit union ranks among 25 similar-sized ones. 80th percentile means it is higher than 80% of them.',
    why: 'Whether a high rank is good depends on the measure: good for ROA, bad for delinquency. Each figure says which way is stronger.',
  },
  peers: {
    term: 'Peers',
    what: 'The 25 active credit unions closest in total assets.',
    why: 'Numbers only mean something in context. Comparing with similar-sized credit unions shows what is normal.',
  },
  forecast_fan: {
    term: 'Forecast fan',
    what: 'The shaded area to the right of the “Last filing” line: the model’s projection for the next four quarters. The darkest band is the most likely range (50%), then 80%, then 95%.',
    why: 'A wider fan means more uncertainty. The middle dashed line is the single best guess.',
  },
  range80: {
    term: '80% range',
    what: 'The span the model expects the real value to fall inside four times out of five.',
    why: 'It shows how much to trust a projection. CU Pulse checks these ranges against what actually happened.',
  },
  backtest: {
    term: 'Backtest',
    what: 'Re-running the forecast as if it were an earlier date, then comparing it with what the credit union actually reported later.',
    why: 'It is how you find out whether a model is any good before trusting it.',
  },
  drift: {
    term: 'Drift benchmark',
    what: 'The simplest possible forecast: assume the recent trend continues in a straight line.',
    why: 'A fancier model has to beat this to be worth using.',
  },
  stress_test: {
    term: 'Stress test',
    what: 'A “what if” calculation: raise loan losses, cut earnings, or speed up growth, and see what happens to capital.',
    why: 'Shows how much bad news a credit union can absorb before it drops below 7%.',
  },
  call_report: {
    term: 'Call Report (Form 5300)',
    what: 'The financial report every federally insured credit union files with NCUA each quarter.',
    why: 'It is the source of every number in CU Pulse, and it is public.',
  },
  ncua: {
    term: 'NCUA',
    what: 'The National Credit Union Administration, the federal agency that regulates and insures credit unions.',
    why: 'It sets the capital rules and publishes the data this app uses.',
  },
  pts: {
    term: 'pts and bp',
    what: 'A “pt” (percentage point) is the gap between two percentages: 11% to 12% is +1 pt. A basis point (bp) is a hundredth of a point: +25 bp is +0.25 pts.',
    why: 'Analysts use them to describe small changes in rates precisely.',
  },
}

export const GLOSSARY_ORDER = [
  'call_report', 'ncua', 'net_worth_ratio', 'well_capitalized', 'loan_growth_yoy', 'deposit_growth_yoy',
  'loan_to_share', 'delinquency_rate', 'net_charge_off_rate', 'roa', 'peers', 'percentile', 'pts',
  'forecast_fan', 'range80', 'backtest', 'drift', 'stress_test',
]

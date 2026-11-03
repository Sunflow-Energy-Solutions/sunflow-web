# Sunflow plan comparison tool (offline)

Internal tool for comparing a customer's electricity plan, battery and solar. It is **not** part of the public website:
it is one self-contained file that runs in a browser with no internet.

## Using it
Open `dist/plan-comparison.html` in Chrome or Edge (double-click). To share with Cristian, copy that one file.
Everything typed in or uploaded stays in that browser on that computer. Nothing is sent anywhere.

1. **Customer bill** - upload the bill PDF (or type it in). The tool reads the retailer, plan, days, supply charge, usage and
   export lines, and hours where the bill states them. Check the values it shows against the bill.
2. **Plans to compare** - the plan library (add retailers' current plans here).
3. **Systems & pricing** - choose brands and phase. Prices come from the Sunflow package price list.
4. **Results** - best plan, battery-only and solar+battery options with payback, and a customer report.

### Sending results to a customer
On the Results step, tick the options to include ("In report"), then **Download customer report**. It is a single HTML page that
reads well on a phone: email it as an attachment, or use **Preview / print to PDF** and save a PDF. It contains only customer prices,
rebates and savings - no costs or margins.

## Updating prices
Prices come from `output/Sunflow_Package_Pricing_*.xlsx` (the "(Customer)" sheets only - the Internal sheets are never read).
After changing the workbooks:
```bash
cd offline-tools/plan-comparison
npm run import-prices   # rewrites src/lib/energy/catalogue.generated.ts
npm run build           # rewrites dist/plan-comparison.html
```
(First time on a computer: `npm install`.)

## Notes on bill reading
- Works from itemised "kWh x rate" lines, so it copes with different retailers, but layouts vary: always check the figures.
- Tested on GloBird, Powershop and Origin bills (all three reconcile to the bill total). Scanned or photographed bills have no
  readable text and must be typed in.
- When a bill doesn't state the hours of peak / off-peak rates, typical hours are assumed and flagged.

## Code
- Calculations: `src/lib/energy/engine.ts` (runs in background workers via `src/lib/engine.worker.ts`)
- Bill reading: `src/lib/billParser.ts`, `src/lib/pdfText.ts`
- Report: `src/lib/report.ts`
- Seeded plans and sample bills: `src/lib/energy/samples.ts`

Plan rates in the library are as current as whoever last entered them. Check Victorian Energy Compare before quoting.

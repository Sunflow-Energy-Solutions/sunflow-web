# Sunflow plan comparison tool (offline)

Internal tool for comparing a customer's electricity plan, battery size and extra solar.
It is **not** part of the public website: it is one self-contained file that runs in a browser with no internet.

## Using it
Open `dist/plan-comparison.html` in Chrome or Edge (double-click). To share with Cristian, copy that one file.
Everything typed in is saved only in that browser on that computer (localStorage). Nothing is sent anywhere.

## Updating it
```bash
cd offline-tools/plan-comparison
npm install   # first time only
npm run build # rewrites dist/plan-comparison.html
```
- Calculations: `src/lib/energy/engine.ts`
- Seeded plans and sample bills: `src/lib/energy/samples.ts`
- Screens: `src/components/`

Plan rates in the library are as current as whoever last entered them. Check Victorian Energy Compare before quoting.

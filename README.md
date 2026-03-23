# degens_mlb

Static frontend for the MLB score prediction board.

## Contents

- `index.html`: page shell
- `styles.css`: UI styling
- `app.js`: client rendering logic
- `data/current-board.json`: exported board snapshot
- `delly.png`: header logo

## Local preview

```bash
cd /Users/jonnyrosero/Desktop/score_prediction/degens_mlb
python3 -m http.server 4180
```

Open:

```text
http://127.0.0.1:4180/
```

## Refresh the board snapshot

From the project root:

```bash
cd /Users/jonnyrosero/Desktop/score_prediction
bash run_ui_refresh.sh
```

That updates:

```text
degens_mlb/data/current-board.json
```

## Vercel

This is a static site. For Vercel:

- Framework preset: `Other`
- Build command: leave blank
- Output directory: leave blank

Deploy the contents of this folder as-is.

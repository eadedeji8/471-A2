# CMSC471 Assignment 2: white hat / black hat

By Emmanuel Adedeji, Ricky Chen and Jonathan Solomon.

Two D3 visualizations of ProPublica's
[Civilian Complaints Against New York City Police Officers](https://www.propublica.org/datastore/dataset/civilian-complaints-against-new-york-city-police-officers)
data. The white hat one shows how the review board ruled and says who the data leaves out. The
black hat one uses the same file to suggest that complaints rarely hold up and are falling. The
buttons under the black hat chart undo its tricks one at a time.

## Run it

The page loads its data with `d3.csv`, so it needs a web server. Opening `index.html` from disk
does not work.

```bash
python3 -m http.server 8472
```

Then open <http://localhost:8472>.

## Files

| Path | What it holds |
|---|---|
| `index.html` | The page: both charts, both write-ups, references, process and AI usage |
| `css/styles.css` | Page and chart styles |
| `js/script.js` | Loads the data. Holds the colors, the tooltip and the counting helpers both charts use |
| `js/whitehat.js` | Outcome by type, and allegations by year |
| `js/blackhat.js` | The misleading pair and the buttons that undo it |
| `data/allegations.csv` | 5 of ProPublica's 27 columns, all 33,358 rows |
| `data/prepare.py` | Rebuilds `allegations.csv` from ProPublica's download |

## Rebuild the data

Download the dataset from ProPublica, then:

```bash
python3 data/prepare.py path/to/allegations_202007271729.csv > data/allegations.csv
```

The script copies rows unchanged. It drops officer names, shield numbers and the other columns the
charts do not read.

## Publish

Push to GitHub, then turn on Pages for the `main` branch root under Settings, Pages. The site has
no build step.

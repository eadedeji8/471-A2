"""Trim ProPublica's raw CCRB download to the five columns the charts read.

Usage: python3 data/prepare.py path/to/allegations_202007271729.csv > data/allegations.csv

Rows are copied unchanged and none are dropped. Officer names and shield numbers
stay out of the published file because neither chart needs them.
"""

import csv
import sys

KEPT_COLUMNS = [
    "complaint_id",
    "unique_mos_id",
    "year_received",
    "fado_type",
    "board_disposition",
]


def main() -> None:
    if len(sys.argv) != 2:
        sys.exit("usage: python3 data/prepare.py path/to/allegations_202007271729.csv > data/allegations.csv")

    with open(sys.argv[1], newline="") as raw_file:
        writer = csv.DictWriter(sys.stdout, fieldnames=KEPT_COLUMNS, extrasaction="ignore", lineterminator="\n")
        writer.writeheader()
        writer.writerows(csv.DictReader(raw_file))


if __name__ == "__main__":
    main()

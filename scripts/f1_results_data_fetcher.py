"""F1 2025 レース結果を取得して JSON に保存するスクリプト。

- Jolpica Ergast API 互換エンドポイントを使用
- 指定したドライバーのみ抽出して races_2025.json を生成
"""

from __future__ import annotations

import argparse
import json
import time
from typing import Any, Dict, List

import requests

# 取得対象ドライバー（APIの driverId -> 表示名）
TARGET_DRIVERS: Dict[str, str] = {
    "norris": "Lando Norris",
    "max_verstappen": "Max Verstappen",
}

BASE_URL = "https://api.jolpi.ca/ergast/f1"
DEFAULT_SEASON = 2025

TIMEOUT_SEC = 20
MAX_RETRIES = 3


def fetch_json(url: str, session: requests.Session) -> Dict[str, Any]:
    """HTTP GET を行い、JSON を dict として返す。失敗時はリトライする。"""

    last_err: Exception | None = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            res = session.get(url, timeout=TIMEOUT_SEC)
            res.raise_for_status()
            return res.json()
        except Exception as e:  # noqa: BLE001（サンプルのため簡潔に）
            last_err = e
            if attempt < MAX_RETRIES:
                time.sleep(0.8 * attempt)

    raise RuntimeError(f"Request failed after {MAX_RETRIES} tries: {url}\n{last_err}") from last_err


def parse_target_driver_rows(round_no: int, payload: Dict[str, Any]) -> List[Dict[str, Any]]:
    """APIレスポンスから対象ドライバー行を抽出する。"""

    races = payload.get("MRData", {}).get("RaceTable", {}).get("Races", [])
    if not races:
        return []

    race = races[0]
    race_name = race.get("raceName", f"Round {round_no}")
    results = race.get("Results", [])

    rows: List[Dict[str, Any]] = []
    for res in results:
        driver_id = res.get("Driver", {}).get("driverId")
        if driver_id not in TARGET_DRIVERS:
            continue

        rows.append(
            {
                "season": DEFAULT_SEASON,
                "round": round_no,
                "race": race_name,
                "driver": TARGET_DRIVERS[driver_id],
                "position": int(res.get("position", 0) or 0),
                "points": int(float(res.get("points", 0) or 0)),
            }
        )

    return rows


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--season", type=int, default=DEFAULT_SEASON, help="対象シーズン（例：2025）")
    parser.add_argument("--out", default="races_2025.json", help="出力ファイル名")
    args = parser.parse_args()

    season = args.season
    out_path = args.out

    session = requests.Session()
    session.headers.update({"User-Agent": "Mozilla/5.0"})

    out: List[Dict[str, Any]] = []
    round_no = 1

    while True:
        url = f"{BASE_URL}/{season}/{round_no}/results.json"
        payload = fetch_json(url, session)

        rows = parse_target_driver_rows(round_no, payload)
        if not rows:
            # レースが存在しない（またはシーズン未確定）と判断して終了
            break

        out.extend(rows)
        round_no += 1

    if not out:
        raise RuntimeError("No data generated. Network / API availability / season setting may be wrong.")

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)

    print(f"✅ Generated {out_path} with {len(out)} rows ({', '.join(TARGET_DRIVERS.values())})")


if __name__ == "__main__":
    main()

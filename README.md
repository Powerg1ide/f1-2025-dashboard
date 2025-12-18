# F1 2025 Race Results Dashboard

## 概要
F1観戦が趣味であることをきっかけに、興味のある題材を用いた開発テーマを設定した。
F1 2025シーズンのレース結果を可視化するWebダッシュボードです。  
Pythonで取得したレースデータをJSON形式で保存し、  
JavaScriptで読み込み・表示します。

---

## 使用技術
- HTML / CSS / JavaScript（Vanilla）
- Python 3
- Git / GitHub

---

## 構成
```
├─ index.html
├─ style.css
├─ dashboard.js        # 表示ロジック
├─ data/
│  └─ races_2025.json  # レース結果データ
└─ scripts/
   └─ f1_results_data_fetcher.py  # データ取得
```

---

## 実行方法
```bash
python -m http.server 8000
```

---

## 工夫点
- 見やすさを重視し、情報構造が直感的に分かるよう工夫
- 第三者の視点を意識し、ファイル構成や命名を整理
- 実務利用を想定し、動作確認しやすい構成とした

---


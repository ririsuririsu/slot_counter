# 攻殻機動隊 画面キャプチャ

画面選択ピッカーのサムネイル。`<画面ID>.webp` を置くと文字カードが画像に差し替わります。
**設定は不要**です（読み込みに失敗したら文字カードに戻るだけ）。

20枚すべて配置済み・合計 244KB。`vite.config.ts` の `globPatterns` に `webp` を入れてあるので
サービスワーカーがプリキャッシュし、ホールで電波が悪くても画面選択が使えます。

元画像は 250×241 のほぼ正方形。サムネイル枠も `aspect-ratio: 1/1` にしてあり、
**枠の色が示唆そのもの**なので切り取らずに全体を表示します。

## 差し替え・追加する場合

PNG を置いてから変換:

```bash
npx --yes sharp-cli@latest -i "public/kokaku-screens/*.png" -o public/kokaku-screens -f webp -q 82
rm public/kokaku-screens/*.png
```

権利表記は ©Sammy です。個人用のツール内での参照にとどめ、再配布はしないでください。

## ファイル名一覧

画面IDは [src/data/kokakuDefinitions.ts](../../src/data/kokakuDefinitions.ts) の
`KOKAKU_WINDOW_SCREENS` / `KOKAKU_CZ_END_SCREENS` と対です。

### ウインドウ（CZ終了時のPUSH／AT終了／裏コマンド）

| ファイル名 | 画面 | 示唆 |
|---|---|---|
| `motoko.webp` | 素子 | 基本パターン |
| `motokoBattle.webp` | 素子（戦闘中） | 高設定示唆（弱） |
| `togusa.webp` | トグサ | 奇数設定示唆 |
| `batou.webp` | バトー | 偶数設定示唆 |
| `poker.webp` | ポーカー | 高モード示唆 |
| `motokoBack.webp` | 素子（後姿） | モードB以上濃厚!? |
| `koan9.webp` | 公安9課（赤枠） | モードC以上濃厚!? |
| `cyberMotoko.webp` | 電脳素子（紫枠） | モードC以上濃厚!?（強） |
| `aoi.webp` | アオイ（金枠） | モードD濃厚!? ＋ 設定4以上濃厚!? |
| `secondGig.webp` | 2ndGIG | 白の境界 権利保有時の専用画面 |

### CZ終了画面（そのまま出る方）

| ファイル名 | 画面 | 示唆 |
|---|---|---|
| `czSky.webp` | 青空 | 基本パターン |
| `czSkyLaughingMan.webp` | 青空＋笑い男マーク | 復活期待度 50% |
| `czSkyKoan9.webp` | 青空＋公安9課 | 設定2以上濃厚!? |
| `czOpeko.webp` | オペ子 | 奇数設定示唆 |
| `czTachikoma.webp` | タチコマ | 偶数設定示唆 |
| `czTogusa.webp` | トグサ | 高設定示唆（弱） |
| `czIshikawa.webp` | イシカワ | 高設定示唆（強）／出現頻度 9.4〜18.8% |
| `czMotoko.webp` | 素子 | 設定1・4・5・6濃厚!? ＋ 高設定示唆（強） |
| `czVacance.webp` | バカンス | 設定4以上濃厚!? |
| `czAllStars.webp` | 全員集合 | 設定6濃厚!? |

同名キャラでも系統で示唆が違うので、`togusa` と `czTogusa` は別ファイルです。

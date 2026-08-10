# SKDG v1.3.20 ログイン背景・添付2固定

## 修正内容
- ログイン背景は `assets/images/login-business-background-4k.png` の1枚だけを使用します。
- 背景はユーザー指定の「明るい白〜淡青系／左右下にコンテナヤード／中央が薄い」従来イラストです。
- 朝・昼・夕方・夜の時間帯別切替を廃止しました。
- `login-port-morning.jpg` / `login-port-day.jpg` / `login-port-evening.jpg` / `login-port-night.jpg` / `login-port-background.jpg` へのCSS参照を完全に削除しました。
- `data-login-time` の値に関係なく同じ背景を表示します。
- 暗い港湾写真へ切り替わるフォールバック処理も使用しません。
- SKロゴ、ログインフォーム、ログイン機能は変更していません。

## 更新方法
既存 v1.3.19 に上書きしてください。表示上のバージョンは `Version 1.0 試作版` のままです。DBマイグレーションはありません。

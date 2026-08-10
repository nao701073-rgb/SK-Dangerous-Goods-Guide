# SKDG v1.3.64 空枠原因特定修正

## 原因
- v1.3.63でも `v1356-ctu-card-layout.css` と `v1357-ctu-card-polish.css` が別表記のlinkタグとして残っていた。
- 特に v1356 の `.ctu-numbered-step-card[hidden]{display:block!important}` が、非表示の旧ステップ/空要素を強制表示し、Step 1上部・Step 1/2間・Step 2下部などに細い空カード枠を作っていた。

## 対処
- CTU画面から v1348〜v1363 の旧CTU上書きCSSリンクを正規表現で完全除去。
- `v1364-ctu-canonical-layout.css` だけを最後に読み込む構成へ変更。
- hidden/廃止カードは `display:none!important` とし、レイアウト領域を一切持たないよう固定。
- 旧JSが空要素を残した場合にも最終段で検出して非表示にする cleanup JS を追加。

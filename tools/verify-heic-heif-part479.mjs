import fs from "node:fs";
import path from "node:path";
const root=path.resolve(import.meta.dirname,"..");
const ctu=fs.readFileSync(path.join(root,"pages/ctu-securing-calculator.html"),"utf8");
const apps=fs.readFileSync(path.join(root,"pages/applications.html"),"utf8");
const photos=fs.readFileSync(path.join(root,"assets/js/photos.js"),"utf8");
const helper=fs.readFileSync(path.join(root,"assets/js/image-format-support.js"),"utf8");
const checks=[
 [ctu.includes('.heic,.heif'),"CTU写真入力がHEIC/HEIFを受け付ける"],
 [ctu.includes('image-format-support.js?v=479'),"CTU画面が形式変換ヘルパーを読み込む"],
 [ctu.includes('HEIC／HEIF画像を端末内でJPEGへ変換'),"CTU画面に変換完了表示がある"],
 [apps.includes('.heic,.heif'),"申請番号管理の写真入力がHEIC/HEIFを受け付ける"],
 [photos.includes('prepareImageFile(file'),"写真管理がHEIC/HEIF変換処理を利用する"],
 [helper.includes('hasHeicSignature'),"拡張子・MIMEに依存しないHEIC判定がある"],
 [helper.includes('type:"image/jpeg"'),"HEIC/HEIFをJPEGへ変換する"],
];
const failed=checks.filter(([ok])=>!ok);
checks.forEach(([ok,label])=>console.log(`${ok?'OK':'NG'} ${label}`));
if(failed.length)process.exit(1);

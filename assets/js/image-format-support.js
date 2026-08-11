(function(global){
  "use strict";

  const HEIC_EXTENSION = /\.(heic|heif)$/i;
  const IMAGE_EXTENSION = /\.(jpe?g|png|gif|webp|bmp|heic|heif)$/i;
  const HEIC_MIME = /image\/(heic|heif|heic-sequence|heif-sequence)/i;

  function extensionOf(file){
    const name = String(file?.name || "");
    const match = name.match(/\.([^.]+)$/);
    return match ? match[1].toLowerCase() : "";
  }

  function isSupportedImageFile(file){
    if (!file) return false;
    const mime = String(file.type || "");
    return mime.startsWith("image/") || IMAGE_EXTENSION.test(String(file.name || ""));
  }

  async function hasHeicSignature(file){
    try{
      const bytes = new Uint8Array(await file.slice(0, 32).arrayBuffer());
      if (bytes.length < 12) return false;
      const ascii = new TextDecoder("ascii").decode(bytes);
      if (!ascii.includes("ftyp")) return false;
      return ["heic","heix","hevc","hevx","mif1","msf1"].some(brand => ascii.includes(brand));
    }catch{
      return false;
    }
  }

  async function isHeicFile(file){
    if (!file) return false;
    if (HEIC_EXTENSION.test(String(file.name || "")) || HEIC_MIME.test(String(file.type || ""))) return true;
    try{
      if (global.HeicTo?.isHeic && await global.HeicTo.isHeic(file)) return true;
    }catch{
      // ヘッダー判定へフォールバック
    }
    return hasHeicSignature(file);
  }

  function canRenderNatively(blob){
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(blob);
      const image = new Image();
      const cleanup = () => URL.revokeObjectURL(url);
      image.onload = () => { cleanup(); resolve(true); };
      image.onerror = () => { cleanup(); reject(new Error("このブラウザでは画像を直接表示できません。")); };
      image.src = url;
    });
  }

  function convertedFileName(file){
    const original = String(file?.name || "photo.heic");
    return HEIC_EXTENSION.test(original) ? original.replace(HEIC_EXTENSION, ".jpg") : `${original}.jpg`;
  }

  async function prepareImageFile(file, options={}){
    if (!isSupportedImageFile(file)) throw new Error("JPEG、PNG、WebP、HEICまたはHEIF形式の画像を選択してください。");
    const heic = await isHeicFile(file);
    if (!heic) return { file, converted:false, sourceFormat:extensionOf(file) || file.type || "image" };

    const quality = Math.min(1, Math.max(0.5, Number(options.quality ?? 0.92)));
    const converter = typeof global.HeicTo === "function"
      ? global.HeicTo
      : typeof global.HeicTo?.heicTo === "function"
        ? global.HeicTo.heicTo
        : null;

    if (converter){
      try{
        let output = await converter({ blob:file, type:"image/jpeg", quality });
        if (Array.isArray(output)) output = output[0];
        if (!(output instanceof Blob)) throw new Error("変換結果を取得できませんでした。");
        const converted = new File([output], convertedFileName(file), {
          type:"image/jpeg",
          lastModified:Number(file.lastModified || Date.now())
        });
        return { file:converted, converted:true, sourceFormat:"HEIC/HEIF" };
      }catch(error){
        try{
          await canRenderNatively(file);
          return { file, converted:false, sourceFormat:"HEIC/HEIF（ブラウザ標準表示）" };
        }catch{
          throw new Error(`HEIC／HEIF画像をJPEGへ変換できませんでした。${error?.message ? `（${error.message}）` : ""}`);
        }
      }
    }

    try{
      await canRenderNatively(file);
      return { file, converted:false, sourceFormat:"HEIC/HEIF（ブラウザ標準表示）" };
    }catch{
      throw new Error("HEIC／HEIF変換機能を読み込めませんでした。通信状態を確認して再度お試しください。");
    }
  }

  global.ISSImageFormats = Object.freeze({
    isSupportedImageFile,
    isHeicFile,
    prepareImageFile
  });
})(window);

import { useEffect, useRef, useState } from 'react';

/**
 * 넥슨 캐릭터 이미지(300×300 캔버스, 캐릭터는 원래 도트 크기)에서 빈 공간을 잘라내고
 * 정수 배율로 선명하게 키워 그린다. 이미지 서버가 CORS 를 허용해서 픽셀을 읽을 수 있다.
 * 실패하면 원본 이미지를 그대로 보여 준다.
 * local 이 있으면 사이트에 같이 올린 사본(public/chars)을 먼저 쓴다. 넥슨 이미지 서버가 막히는 환경이 있어서.
 */
export default function CharacterSprite({
  src,
  local,
  scale = 2,
  className,
}: {
  src: string;
  /** public/chars 안의 파일 이름 (확장자 빼고) */
  local?: string;
  scale?: number;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);
  const [gone, setGone] = useState(false);
  const [useRemote, setUseRemote] = useState(!local);
  const localUrl = local ? `chars/${encodeURIComponent(local)}.png` : null;
  const url = useRemote || !localUrl ? src : localUrl;

  useEffect(() => {
    setUseRemote(!local);
  }, [local, src]);

  useEffect(() => {
    setFailed(false);
    setGone(false);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const work = document.createElement('canvas');
        work.width = img.width;
        work.height = img.height;
        const wctx = work.getContext('2d')!;
        wctx.drawImage(img, 0, 0);
        const { data } = wctx.getImageData(0, 0, img.width, img.height);
        let [x0, y0, x1, y1] = [img.width, img.height, -1, -1];
        for (let y = 0; y < img.height; y++) {
          for (let x = 0; x < img.width; x++) {
            if (data[(y * img.width + x) * 4 + 3] === 0) continue;
            if (x < x0) x0 = x;
            if (x > x1) x1 = x;
            if (y < y0) y0 = y;
            if (y > y1) y1 = y;
          }
        }
        if (x1 < 0) throw new Error('빈 이미지');
        const w = x1 - x0 + 1;
        const h = y1 - y0 + 1;
        const canvas = ref.current!;
        canvas.width = w * scale;
        canvas.height = h * scale;
        const ctx = canvas.getContext('2d')!;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, x0, y0, w, h, 0, 0, w * scale, h * scale);
      } catch {
        setFailed(true);
      }
    };
    img.onerror = () => (url !== src ? setUseRemote(true) : setFailed(true));
    img.src = url;
  }, [url, src, scale]);

  // 원본은 300×300 캔버스라 그대로 두면 너무 크다. 원본마저 못 불러오면 깨진 그림 대신 아무것도 안 보인다
  if (gone) return null;
  if (failed)
    return (
      <img
        className={`sprite ${className ?? ''}`}
        src={url}
        alt=""
        width={100 * scale}
        height={100 * scale}
        onError={() => setGone(true)}
      />
    );
  return <canvas ref={ref} className={`sprite ${className ?? ''}`} role="img" aria-label="캐릭터 이미지" />;
}

function loadImageFromUrl(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(new Error("Não foi possível carregar a moldura do evento."));
    image.src = src;
  });
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Não foi possível carregar a foto capturada."));
    };

    image.src = objectUrl;
  });
}

function drawImageCover(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  width: number,
  height: number,
) {
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  const offsetX = (width - drawWidth) / 2;
  const offsetY = (height - drawHeight) / 2;

  context.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);
}

/** Compõe foto + moldura PNG no navegador (Canvas HTML5). */
export async function composePhotoWithFrame(
  photoFile: File,
  frameUrl: string,
): Promise<File> {
  const [photo, frame] = await Promise.all([
    loadImageFromFile(photoFile),
    loadImageFromUrl(frameUrl),
  ]);

  const width = frame.naturalWidth || photo.naturalWidth;
  const height = frame.naturalHeight || photo.naturalHeight;

  if (width <= 0 || height <= 0) {
    throw new Error("Dimensões inválidas para aplicar a moldura.");
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas não disponível neste dispositivo.");
  }

  drawImageCover(context, photo, width, height);
  context.drawImage(frame, 0, 0, width, height);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (!result) {
          reject(new Error("Não foi possível gerar a imagem final."));
          return;
        }

        resolve(result);
      },
      "image/jpeg",
      0.92,
    );
  });

  const baseName = photoFile.name.replace(/\.[^.]+$/, "") || "cabine-bolso";

  return new File([blob], `${baseName}.jpg`, {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}

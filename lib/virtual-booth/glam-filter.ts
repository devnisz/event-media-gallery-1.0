export type GlamFilterConfig = {
  enabled: boolean;
};

export const ALWAYS_ON_GLAM_FILTER: GlamFilterConfig = {
  enabled: true,
};

function clampChannel(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
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
      reject(new Error("Não foi possível carregar a foto para aplicar o filtro Glam."));
    };

    image.src = objectUrl;
  });
}

function canvasToJpegFile(
  canvas: HTMLCanvasElement,
  sourceFile: File,
): Promise<File> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Não foi possível gerar a foto com filtro Glam."));
          return;
        }

        const baseName = sourceFile.name.replace(/\.[^.]+$/, "") || "cabine-virtual";

        resolve(
          new File([blob], `${baseName}-glam.jpg`, {
            type: "image/jpeg",
            lastModified: Date.now(),
          }),
        );
      },
      "image/jpeg",
      0.92,
    );
  });
}

function applyGlamTone(data: Uint8ClampedArray): void {
  for (let index = 0; index < data.length; index += 4) {
    let red = data[index];
    let green = data[index + 1];
    let blue = data[index + 2];
    const luma = red * 0.299 + green * 0.587 + blue * 0.114;
    const shadowLift = Math.max(0, (118 - luma) / 118);

    red += 5 + shadowLift * 10;
    green += 4 + shadowLift * 8;
    blue += 1 + shadowLift * 6;

    red += 3;
    green += 1;
    blue -= 2;

    red = (red - 128) * 1.055 + 128;
    green = (green - 128) * 1.055 + 128;
    blue = (blue - 128) * 1.055 + 128;

    const gray = red * 0.299 + green * 0.587 + blue * 0.114;
    red = gray + (red - gray) * 1.04;
    green = gray + (green - gray) * 1.04;
    blue = gray + (blue - gray) * 1.04;

    data[index] = clampChannel(red);
    data[index + 1] = clampChannel(green);
    data[index + 2] = clampChannel(blue);
  }
}

function applySoftSharpen(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): void {
  const source = new Uint8ClampedArray(data);
  const strength = 0.16;

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const pixelIndex = (y * width + x) * 4;

      for (let channel = 0; channel < 3; channel += 1) {
        const index = pixelIndex + channel;
        const center = source[index];
        const blur =
          (source[index - 4] +
            source[index + 4] +
            source[index - width * 4] +
            source[index + width * 4] +
            center * 4) /
          8;

        data[index] = clampChannel(center + (center - blur) * strength);
      }
    }
  }
}

export function applyGlamToCanvas(
  canvas: HTMLCanvasElement,
  config: GlamFilterConfig = ALWAYS_ON_GLAM_FILTER,
): void {
  if (!config.enabled) {
    return;
  }

  const width = canvas.width;
  const height = canvas.height;

  if (width <= 0 || height <= 0) {
    throw new Error("Dimensões inválidas para aplicar o filtro Glam.");
  }

  const context = canvas.getContext("2d", { willReadFrequently: true });

  if (!context) {
    throw new Error("Canvas não disponível neste dispositivo.");
  }

  const imageData = context.getImageData(0, 0, width, height);
  applyGlamTone(imageData.data);
  applySoftSharpen(imageData.data, width, height);
  context.putImageData(imageData, 0, 0);
}

export async function applyGlamFilter(
  sourceFile: File,
  config: GlamFilterConfig = ALWAYS_ON_GLAM_FILTER,
): Promise<File> {
  if (!config.enabled) {
    return sourceFile;
  }

  const image = await loadImageFromFile(sourceFile);
  const width = image.naturalWidth;
  const height = image.naturalHeight;

  if (width <= 0 || height <= 0) {
    throw new Error("Dimensões inválidas para aplicar o filtro Glam.");
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d", { willReadFrequently: true });

  if (!context) {
    throw new Error("Canvas não disponível neste dispositivo.");
  }

  context.drawImage(image, 0, 0, width, height);
  applyGlamToCanvas(canvas, config);

  return canvasToJpegFile(canvas, sourceFile);
}

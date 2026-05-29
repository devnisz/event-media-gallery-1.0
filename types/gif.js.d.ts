declare module "gif.js" {
  export default class GIF {
    constructor(options: {
      workers?: number;
      quality?: number;
      workerScript?: string;
      width?: number;
      height?: number;
      repeat?: number;
    });

    addFrame(
      element: CanvasImageSource,
      options?: { delay?: number; copy?: boolean },
    ): void;

    render(): void;

    on(event: "finished", callback: (blob: Blob) => void): void;
    on(event: "progress", callback: (progress: number) => void): void;
    on(event: "error", callback: (error: Error) => void): void;
  }
}

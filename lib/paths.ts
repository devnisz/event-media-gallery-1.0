import path from "path";

/** Caminhos estáveis para filesystem (dev, Node, futuro Electron empacotado). */
export function galleryDataPath(...segments: string[]) {
  return path.join(process.cwd(), "data", ...segments);
}

export function galleryPublicPath(...segments: string[]) {
  return path.join(process.cwd(), "public", ...segments);
}

import {
  MAX_GUEST_UPLOAD_BYTES,
  normalizeGuestUploadMimeType,
  resolveGuestUploadTypeInfo,
} from "@/lib/guest-upload/validation";

export const CABINE_GALLERY_PHOTO_ACCEPT =
  "image/jpeg,image/png,image/webp";

export const CABINE_GALLERY_VIDEO_ACCEPT =
  "video/mp4,video/webm,video/quicktime";

export function validateGalleryPhotoFile(file: File): string | null {
  const mimeType = normalizeGuestUploadMimeType(file.type);
  const typeInfo = resolveGuestUploadTypeInfo(mimeType);

  if (!typeInfo || typeInfo.mediaType !== "image") {
    return "Escolha uma foto em JPG, PNG ou WebP.";
  }

  if (file.size <= 0 || file.size > MAX_GUEST_UPLOAD_BYTES) {
    return "A foto excede o limite de 100 MB.";
  }

  return null;
}

export function validateGalleryVideoFile(file: File): string | null {
  const mimeType = normalizeGuestUploadMimeType(file.type);
  const typeInfo = resolveGuestUploadTypeInfo(mimeType);

  if (!typeInfo || typeInfo.mediaType !== "video") {
    return "Escolha um vídeo em MP4, WebM ou MOV.";
  }

  if (file.size <= 0 || file.size > MAX_GUEST_UPLOAD_BYTES) {
    return "O vídeo excede o limite de 100 MB.";
  }

  return null;
}

/** Garante MIME aceito pelo fluxo de upload de convidado. */
export function normalizeGalleryImportFile(file: File): File {
  const mimeType = normalizeGuestUploadMimeType(file.type);

  if (mimeType === file.type) {
    return file;
  }

  return new File([file], file.name, {
    type: mimeType,
    lastModified: file.lastModified,
  });
}

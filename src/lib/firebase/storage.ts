import { getFirebaseStorage } from './config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { compressImageFile } from '@/lib/utils/imageCompressor';

/**
 * Uploads a store logo to Firebase Storage after in-browser compression
 * @param file The original image file from user input
 * @param businessId Unique business identifier
 * @returns Public download URL and size stats
 */
export async function uploadStoreLogoToStorage(
  file: File,
  businessId = 'biz_default'
): Promise<{ url: string; originalSize: number; compressedSize: number }> {
  // 1. Compress image in browser (Max 512x512, webp, 82% quality)
  const { blob, originalSize, compressedSize } = await compressImageFile(file, {
    maxWidth: 512,
    maxHeight: 512,
    quality: 0.82,
    mimeType: 'image/webp',
  });

  const storage = getFirebaseStorage();
  if (!storage) {
    throw new Error('Firebase Storage is not configured. Please check your environment variables.');
  }

  // 2. Upload to Firebase Storage bucket under businesses/{id}/logo.webp
  const storageRef = ref(storage, `businesses/${businessId}/logo_${Date.now()}.webp`);
  const snapshot = await uploadBytes(storageRef, blob, {
    contentType: 'image/webp',
    cacheControl: 'public, max-age=31536000',
  });

  // 3. Get permanent download URL
  const url = await getDownloadURL(snapshot.ref);

  return { url, originalSize, compressedSize };
}

/**
 * Uploads a product catalog photo to Firebase Storage with in-browser compression
 */
export async function uploadProductImageToStorage(
  file: File,
  productId: string,
  businessId = 'biz_default'
): Promise<{ url: string; compressedSize: number }> {
  const { blob, compressedSize } = await compressImageFile(file, {
    maxWidth: 400,
    maxHeight: 400,
    quality: 0.8,
    mimeType: 'image/webp',
  });

  const storage = getFirebaseStorage();
  if (!storage) {
    throw new Error('Firebase Storage is not configured.');
  }

  const storageRef = ref(storage, `businesses/${businessId}/products/${productId}.webp`);
  const snapshot = await uploadBytes(storageRef, blob, {
    contentType: 'image/webp',
    cacheControl: 'public, max-age=31536000',
  });

  const url = await getDownloadURL(snapshot.ref);
  return { url, compressedSize };
}

/**
 * Uploads a generated PDF invoice to Firebase Storage
 */
export async function uploadInvoicePdfToStorage(
  pdfBlob: Blob,
  invoiceNumber: string,
  businessId = 'biz_default'
): Promise<string> {
  const storage = getFirebaseStorage();
  if (!storage) {
    throw new Error('Firebase Storage is not configured.');
  }

  const sanitizedInvoice = invoiceNumber.replace(/[^a-zA-Z0-9_-]/g, '_');
  const storageRef = ref(storage, `businesses/${businessId}/invoices/${sanitizedInvoice}.pdf`);

  const snapshot = await uploadBytes(storageRef, pdfBlob, {
    contentType: 'application/pdf',
    cacheControl: 'public, max-age=86400',
  });

  return await getDownloadURL(snapshot.ref);
}

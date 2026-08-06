"use server";

import { API_URL } from "@/lib/api/client";
import { getAccessToken } from "@/lib/api/session";

export interface UploadedImage {
  _type: "image";
  asset: {
    _type: "reference";
    _ref: string;
  };
}

/**
 * Upload listing images through the Nest BFF (Sanity write token stays on API).
 */
export async function uploadImageToSanity(
  formData: FormData,
): Promise<UploadedImage> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new Error("Not authenticated");
  }

  const file = formData.get("file");
  if (!file) {
    throw new Error("No file provided");
  }

  const body = new FormData();
  body.append("file", file);

  const res = await fetch(`${API_URL}/properties/media/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Upload failed");
  }

  const data = (await res.json()) as {
    asset?: { _ref?: string };
    assetId?: string;
  };

  const ref = data.asset?._ref || data.assetId;
  if (!ref) throw new Error("Upload returned no asset id");

  return {
    _type: "image",
    asset: {
      _type: "reference",
      _ref: ref,
    },
  };
}

export async function uploadMultipleImagesToSanity(
  formData: FormData,
): Promise<UploadedImage[]> {
  const files = formData.getAll("files") as File[];
  if (!files.length) {
    throw new Error("No files provided");
  }

  const uploads = files.map(async (file) => {
    const single = new FormData();
    single.append("file", file);
    return uploadImageToSanity(single);
  });

  return Promise.all(uploads);
}

export async function deleteImageFromSanity(_assetId: string): Promise<void> {
  // Asset cleanup can be added as a Nest endpoint later; ignore for now.
}

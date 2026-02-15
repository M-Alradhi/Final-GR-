// ImgBB API Integration for image uploads
// Images are uploaded through our API route to keep API key secure

export interface ImgBBUploadResponse {
  data: {
    id: string
    title: string
    url_viewer: string
    url: string
    display_url: string
    width: number
    height: number
    size: number
    time: number
    expiration: number
    image: {
      filename: string
      name: string
      mime: string
      extension: string
      url: string
    }
    thumb: {
      filename: string
      name: string
      mime: string
      extension: string
      url: string
    }
    medium?: {
      filename: string
      name: string
      mime: string
      extension: string
      url: string
    }
    delete_url: string
  }
  success: boolean
  status: number
}

/**
 * Upload an image to ImgBB through our secure API route
 * @param file - The image file to upload
 * @param name - Optional name for the image
 * @returns Promise with the upload response
 */
export async function uploadToImgBB(file: File, name?: string): Promise<ImgBBUploadResponse> {
  try {
    // Convert file to base64
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        // Remove the data URL prefix (e.g., "data:image/png;base64,")
        const base64String = result.split(",")[1]
        resolve(base64String)
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })

    // Create form data
    const formData = new FormData()
    formData.append("image", base64)
    if (name) {
      formData.append("name", name)
    }

    // Upload through our API route (keeps API key secure on server)
    const response = await fetch("/api/upload-image", {
      method: "POST",
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Failed to upload image")
    }

    const data: ImgBBUploadResponse = await response.json()

    if (!data.success) {
      throw new Error("ImgBB upload failed")
    }

    return data
  } catch (error) {
    console.error("Error uploading to ImgBB:", error)
    throw error
  }
}

/**
 * Check if a file is an image
 */
export function isImageFile(file: File): boolean {
  return file.type.startsWith("image/")
}

/**
 * Validate image file size (max 32MB for ImgBB free tier)
 */
export function validateImageSize(file: File, maxSizeMB = 32): boolean {
  const maxSizeBytes = maxSizeMB * 1024 * 1024
  return file.size <= maxSizeBytes
}

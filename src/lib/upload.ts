/**
 * Imgbb Integration Service
 * Uploads client browser files directly to Imgbb CDN
 */
export async function uploadToImgbb(file: File): Promise<string> {
  const apiKey = "4578a8ffe1beb8fa3581d0513c69dc10";
  const formData = new FormData();
  formData.append("image", file);

  try {
    const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
      method: "POST",
      body: formData,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Host rejected upload: ${response.status} - ${errorText}`);
    }
    
    const resPayload = await response.json();
    if (resPayload?.success && resPayload?.data?.url) {
      return resPayload.data.url;
    } else {
      throw new Error(resPayload?.error?.message || "Invalid payload format from Imgbb CDN");
    }
  } catch (error) {
    console.error("Imgbb connection failed:", error);
    throw error;
  }
}

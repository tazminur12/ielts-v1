// src/lib/uploadFile.ts

export async function uploadFile(file: File): Promise<string> {
  try {
    // Send file as FormData — server handles the S3 upload (no CORS issues)
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || "Failed to upload file");
    }

    const { fileUrl } = await res.json();
    return fileUrl;
  } catch (error) {
    console.error("Upload error details:", error);
    throw error;
  }
}

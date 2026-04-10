import html2canvas from "html2canvas";

/**
 * Captures a DOM element and either downloads or shares it.
 * @param {HTMLElement} element - The DOM element to capture.
 * @param {Object} options - { fileName, action: 'download' | 'share', title, text }
 */
export async function handleCapture(element, { fileName = "squad", action = "download", title = "My IPL Squad", text = "Check out my final IPL squad!" }) {
  if (!element) {
    console.error("No element provided to capture");
    return { ok: false, message: "No element found" };
  }

  try {
    // Basic html2canvas capture with settings optimized for high quality
    const canvas = await html2canvas(element, {
      scale: 3, // Retain sharpness even for minimal sizes
      useCORS: true, // Handle images from different domains (like logos)
      backgroundColor: "#0f172a", // Match the slate-900 background
      logging: false,
      onclone: (clonedDoc) => {
        // You can use this to make temporary UI adjustments before capture
        // e.g., expanding sections or hiding scrollbars
      }
    });

    if (action === "download") {
      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `${fileName}.png`;
      link.click();
      return { ok: true };
    }

    if (action === "share") {
      // Create a blob from the canvas
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
      
      const file = new File([blob], `${fileName}.png`, { type: "image/png" });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title,
          text,
        });
        return { ok: true };
      } else {
        // Fallback for browsers that don't support file sharing
        return { ok: false, message: "Sharing not supported in this browser. Try downloading instead." };
      }
    }

    return { ok: false, message: "Invalid action" };
  } catch (error) {
    console.error("Capture failed:", error);
    return { ok: false, message: "Capture failed" };
  }
}

// Source image URLs are bare, full-resolution Pexels links (often 4000px+/several MB). On the canvas every node renders small, yet useTexture was decoding the full image and uploading it to the GPU via texSubImage2D — ~24% of a drag profile (texSubImage2D + Image decode), and far worse on mobile (bandwidth + decode + upload on a weak GPU).
// Pexels' CDN resizes on the fly through query params, so we just ask for a small variant. Non-Pexels URLs (local /assets, avatars, etc.) pass straight through. Use a larger width on detail pages where the image fills the screen.

export function sizedImage(url, width = 512) {
  if (!url || !url.includes("images.pexels.com")) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}auto=compress&cs=tinysrgb&w=${width}`;
}

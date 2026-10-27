/** Spoonacular serves each recipe at several sizes; 636x393 is the largest, so use it rather than upscaling a smaller one. */
export const RECIPE_IMAGE_SIZE = "636x393";

export function recipeImage(url: string, size: string = RECIPE_IMAGE_SIZE): string {
  if (!url.includes("img.spoonacular.com")) return url;
  return url.replace(/-\d+x\d+(\.\w+)(\?.*)?$/, `-${size}$1$2`);
}

# GitHub Pages GeoTIFF overlay

A serverless Leaflet map that displays `classified.tif` over Esri World Imagery Wayback release `18691` and reports clicked coordinates in WGS 84 and EPSG:32643.

## Publish on GitHub Pages

1. Create a new GitHub repository.
2. Upload every file in this folder to the repository root.
3. Open **Settings → Pages**.
4. Under **Build and deployment**, select **Deploy from a branch**.
5. Select the `main` branch and `/ (root)`, then save.

GitHub will provide the public Pages URL after deployment.

## Test locally

Browsers do not normally allow JavaScript to fetch a TIFF from a `file://` URL. Run a small local server instead:

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000`.

## Files

- `index.html` — page and third-party CDN imports
- `app.js` — map, GeoTIFF rendering, opacity, and click coordinates
- `styles.css` — responsive layout
- `classified.tif` — raster displayed by the app
- `.nojekyll` — tells GitHub Pages to serve the files directly

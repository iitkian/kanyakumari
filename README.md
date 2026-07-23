# Classified raster over Esri Wayback imagery

Static Leaflet app for GitHub Pages.

## Files

- `index.html` – page markup
- `styles.css` – page styling
- `app.js` – map, Wayback tiles, ROI restriction, opacity and coordinate clicks
- `classified.png` – transparent browser-ready rendering of the source GeoTIFF
- `classified.tif` – original raster, retained for reference

## Why PNG is used in the browser

The classified GeoTIFF is pre-rendered to a transparent PNG. This avoids slow or unreliable client-side GeoTIFF parsing while preserving the class colors. The image is positioned using the GeoTIFF's exact geographic bounds.

## Region restriction

The map is fitted and constrained to the raster footprint:

- West: 77.1534774822
- South: 8.1437161246
- East: 77.6209454451
- North: 8.6092415854

## GitHub Pages

Upload all files to the repository root, commit, and enable GitHub Pages from the `main` branch and `/ (root)` folder.

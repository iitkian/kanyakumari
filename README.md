# ROI GeoTIFF + KML Leaflet viewer

A static GitHub Pages project that displays:

- `roi.tif` as a classified raster
- `roi.kml` as the ROI boundary and clipping mask
- Esri World Imagery Wayback tiles for **2026-05-28**, clipped to the KML region
- Clicked latitude/longitude and WGS 84 / UTM zone 43N coordinates
- A raster transparency slider
- A four-class legend

## Legend

| Value | Class | Color |
|---:|---|---|
| 0 | Scrub / Non Forest | `#ff0000` |
| 1 | Open Forest | `#ffff00` |
| 2 | Moderately Dense Forest | `#66e67a` |
| 3 | Very Dense Forest | `#006b00` |

All other raster values are transparent.

## Files

- `index.html` — app markup and CDN dependencies
- `styles.css` — responsive layout
- `app.js` — KML/TIFF loading, Wayback lookup, clipping, legend, transparency, and coordinates
- `roi.tif` — sample GeoTIFF copied from the supplied raster
- `roi.kml` — ROI polygon generated from the valid-data footprint of the sample GeoTIFF

Replace `roi.tif` and `roi.kml` with your own files while retaining these exact filenames. The raster must be georeferenced. The coordinate readout currently assumes EPSG:32643 for UTM output; change `RASTER_CRS` and `UTM43N` in `app.js` for another zone.

## Run locally

Browsers block `fetch()` from local `file://` pages. Start a local server in this folder:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

## GitHub Pages

Upload all files to the repository root, commit, then enable GitHub Pages from the `main` branch and `/ (root)` folder.

## Wayback date behavior

The app downloads Esri's WMTS capabilities and looks for an exact release dated `2026-05-28`. If Esri has no release on that exact publication date, it uses the nearest available Wayback release and reports the selected date in the status panel. Wayback publication dates are not necessarily the imagery acquisition dates.

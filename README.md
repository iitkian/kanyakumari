# ROI GeoTIFF + KML Leaflet viewer

A static GitHub Pages project that displays:

- `roi.tif` as a classified raster
- `roi.kml` as the ROI boundary and clipping mask
- Satellite imagery clipped to the KML region
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
- `app.js` — KML/TIFF loading, satellite imagery lookup, clipping, legend, transparency, and coordinates
- `roi.tif` — sample GeoTIFF copied from the supplied raster
- `roi.kml` — ROI polygon generated from the valid-data footprint of the sample GeoTIFF

Replace `roi.tif` and `roi.kml` with your own files while retaining these exact filenames. The raster must be georeferenced.

## GeoTIFF Preprocessing & Compression

To prevent the browser from freezing or running out of memory when loading high-resolution rasters (e.g., several billion pixels or non-standard bit depths like 2-bit), you should downsample and compress the GeoTIFF before placing it in the repository.

You can use GDAL to convert your raster to an 8-bit, compressed, and downsampled file:

```bash
gdal_translate -ot Byte -co COMPRESS=DEFLATE -outsize 4216 4555 input_raw.tif roi.tif
```

- `-ot Byte`: Converts pixel values to standard 8-bit unsigned integers, resolving parsing hangs in browser JS engines.
- `-co COMPRESS=DEFLATE`: Applies lossless deflate compression.
- `-outsize 4216 4555`: Downsamples the image dimensions (approx. 6.25% of a 73k x 73k original raster) so that it parses instantly in browser memory.


## Run locally

Browsers block `fetch()` from local `file://` pages. Start a local server in this folder:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

## GitHub Pages

Upload all files to the repository root, commit, then enable GitHub Pages from the `main` branch and `/ (root)` folder.

## Satellite date behavior

The app downloads satellite capabilities and looks for the release closest to the target date configured in `app.js`. If there is no release on that exact publication date, it uses the nearest available release. Publication dates are not necessarily the imagery acquisition dates.

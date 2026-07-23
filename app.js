const WAYBACK_URL =
  "https://wayback.maptiles.arcgis.com/arcgis/rest/services/World_Imagery/WMTS/1.0.0/default028mm/MapServer/tile/18691/{z}/{y}/{x}";

const TIFF_URL = "classified.tif";
const RASTER_CRS = "EPSG:32643";
const UTM43N = "+proj=utm +zone=43 +datum=WGS84 +units=m +no_defs +type=crs";

const CLASS_COLORS = {
  0: [181, 101, 29, 255],
  1: [154, 205, 50, 255],
  2: [34, 139, 34, 255],
  3: [0, 100, 0, 255],
  4: [210, 180, 140, 255],
  5: [0, 102, 204, 255],
  6: [124, 252, 0, 255],
  7: [211, 211, 211, 0]
};

proj4.defs(RASTER_CRS, UTM43N);

const map = L.map("map", {
  zoomControl: true,
  preferCanvas: true
});

const wayback = L.tileLayer(WAYBACK_URL, {
  minZoom: 0,
  maxZoom: 23,
  maxNativeZoom: 23,
  tileSize: 256,
  attribution:
    "Imagery © Esri and contributors | Wayback release 18691"
}).addTo(map);

map.setView([8.38, 77.5], 9);

let rasterLayer;
let clickMarker;

const statusEl = document.getElementById("status");
const opacityEl = document.getElementById("opacity");
const opacityValueEl = document.getElementById("opacity-value");

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.classList.toggle("error", isError);
}

function rgba([r, g, b, a]) {
  return `rgba(${r}, ${g}, ${b}, ${a / 255})`;
}

async function addGeoTiff() {
  try {
    const response = await fetch(TIFF_URL);
    if (!response.ok) throw new Error(`GeoTIFF request failed (${response.status})`);

    const arrayBuffer = await response.arrayBuffer();
    const georaster = await parseGeoraster(arrayBuffer);

    rasterLayer = new GeoRasterLayer({
      georaster,
      opacity: Number(opacityEl.value),
      resolution: 256,
      pixelValuesToColorFn: values => {
        const value = Math.round(values[0]);
        return rgba(CLASS_COLORS[value] || [0, 0, 0, 0]);
      }
    });

    rasterLayer.addTo(map);
    rasterLayer.bringToFront();
    map.fitBounds(rasterLayer.getBounds(), { padding: [20, 20] });

    L.control.layers(
      { "Esri Wayback imagery": wayback },
      { "Classified GeoTIFF": rasterLayer },
      { collapsed: true }
    ).addTo(map);

    setStatus("GeoTIFF loaded. Click the map for coordinates.");
  } catch (error) {
    console.error(error);
    setStatus(
      "Could not load classified.tif. Open this app through a web server or GitHub Pages, not as a local file.",
      true
    );
  }
}

opacityEl.addEventListener("input", event => {
  const opacity = Number(event.target.value);
  opacityValueEl.textContent = `${Math.round(opacity * 100)}%`;
  if (rasterLayer) rasterLayer.setOpacity(opacity);
});

map.on("click", event => {
  const { lat, lng } = event.latlng;
  const [easting, northing] = proj4("EPSG:4326", RASTER_CRS, [lng, lat]);

  document.getElementById("latitude").textContent = lat.toFixed(7);
  document.getElementById("longitude").textContent = lng.toFixed(7);
  document.getElementById("easting").textContent = `${easting.toFixed(2)} m`;
  document.getElementById("northing").textContent = `${northing.toFixed(2)} m`;

  const popupHtml = `
    <strong>Clicked coordinates</strong><br>
    Lat, Lon: ${lat.toFixed(7)}, ${lng.toFixed(7)}<br>
    UTM 43N: ${easting.toFixed(2)}, ${northing.toFixed(2)}
  `;

  if (!clickMarker) {
    clickMarker = L.marker(event.latlng).addTo(map);
  } else {
    clickMarker.setLatLng(event.latlng);
  }
  clickMarker.bindPopup(popupHtml).openPopup();
});

addGeoTiff();

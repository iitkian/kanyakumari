const WAYBACK_URL =
  "https://wayback.maptiles.arcgis.com/arcgis/rest/services/World_Imagery/WMTS/1.0.0/default028mm/MapServer/tile/18691/{z}/{y}/{x}";

const OVERLAY_URL = "classified.png";
const RASTER_CRS = "EPSG:32643";
const UTM43N = "+proj=utm +zone=43 +datum=WGS84 +units=m +no_defs +type=crs";

// GeoTIFF footprint transformed from EPSG:32643 to EPSG:4326.
// Leaflet expects [[south, west], [north, east]].
const ROI_BOUNDS = L.latLngBounds(
  [8.143716124564987, 77.15347748215864],
  [8.609241585358792, 77.62094544512861]
);

proj4.defs(RASTER_CRS, UTM43N);

const map = L.map("map", {
  zoomControl: false,
  preferCanvas: true,
  maxBounds: ROI_BOUNDS.pad(0.03),
  maxBoundsViscosity: 1.0,
  minZoom: 15,
  maxZoom: 15
});

const wayback = L.tileLayer(WAYBACK_URL, {
  minZoom: 0,
  maxZoom: 23,
  maxNativeZoom: 23,
  tileSize: 256,
  attribution: "Imagery © Esri and contributors | Wayback release 18691"
}).addTo(map);

const opacityEl = document.getElementById("opacity");
const opacityValueEl = document.getElementById("opacity-value");
const statusEl = document.getElementById("status");
let clickMarker;

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.classList.toggle("error", isError);
}

const overlay = L.imageOverlay(OVERLAY_URL, ROI_BOUNDS, {
  opacity: Number(opacityEl.value),
  interactive: false,
  crossOrigin: false,
  alt: "Classified raster overlay"
});

overlay.on("load", () => {
  setStatus("Overlay loaded. Click the map for coordinates.");
});

overlay.on("error", () => {
  setStatus("Could not load classified.png. Confirm it is in the repository root.", true);
});

overlay.addTo(map);
map.setView(ROI_BOUNDS.getCenter(), 15, { animate: false });

L.control.layers(
  { "Esri Wayback imagery": wayback },
  { "Classified raster": overlay },
  { collapsed: true }
).addTo(map);

opacityEl.addEventListener("input", event => {
  const opacity = Number(event.target.value);
  opacityValueEl.textContent = `${Math.round(opacity * 100)}%`;
  overlay.setOpacity(opacity);
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

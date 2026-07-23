const TARGET_WAYBACK_DATE = "2026-05-28";
const ROI_KML_URL = "roi.kml";
const ROI_TIF_URL = "roi.tif";
const RASTER_CRS = "EPSG:32643";
const UTM43N = "+proj=utm +zone=43 +datum=WGS84 +units=m +no_defs +type=crs";
const WAYBACK_CAPABILITIES =
  "https://wayback.maptiles.arcgis.com/arcgis/rest/services/World_Imagery/MapServer/WMTS/1.0.0/WMTSCapabilities.xml";

const CLASS_COLORS = {
  0: "#ff0000",
  1: "#ffff00",
  2: "#66e67a",
  3: "#006b00"
};

proj4.defs(RASTER_CRS, UTM43N);
proj4.defs("32643", UTM43N);

const map = L.map("map", {
  zoomControl: true,
  preferCanvas: true,
  attributionControl: false,
  minZoom: 3,
  maxZoom: 23
});

L.control.attribution({ prefix: false, position: "bottomright" })
  .addAttribution("Powered by Leaflet, Meta, hf, ESRI, esa, GitHub")
  .addTo(map);

const opacityEl = document.getElementById("opacity");
const opacityValueEl = document.getElementById("opacity-value");
const statusEl = document.getElementById("status");
let rasterLayer;
let clickMarker;
let roiGeoJSON;

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.classList.toggle("error", isError);
}

function transparencyToOpacity() {
  return 1 - Number(opacityEl.value);
}

function setTransparencyLabel() {
  opacityValueEl.textContent = `${Math.round(Number(opacityEl.value) * 100)}%`;
}

function extractDate(text) {
  const match = String(text || "").match(/20\d{2}[-_/]\d{2}[-_/]\d{2}/);
  return match ? match[0].replaceAll("_", "-").replaceAll("/", "-") : null;
}

async function resolveWaybackLayer(targetDate) {
  const response = await fetch(WAYBACK_CAPABILITIES);
  if (!response.ok) throw new Error(`Wayback capabilities returned ${response.status}`);

  const xml = new DOMParser().parseFromString(await response.text(), "application/xml");
  if (xml.querySelector("parsererror")) throw new Error("Could not parse Wayback capabilities");

  const layers = [...xml.getElementsByTagNameNS("*", "Layer")].map(layer => {
    const identifier = layer.getElementsByTagNameNS("*", "Identifier")[0]?.textContent?.trim();
    const title = layer.getElementsByTagNameNS("*", "Title")[0]?.textContent?.trim() || "";
    const abstract = layer.getElementsByTagNameNS("*", "Abstract")[0]?.textContent?.trim() || "";
    
    const resourceUrl = layer.getElementsByTagNameNS("*", "ResourceURL")[0];
    const template = resourceUrl?.getAttribute("template") || "";
    const match = template.match(/\/tile\/(\d+)\//);
    const numericId = match ? match[1] : identifier;

    return { identifier, numericId, title, date: extractDate(`${title} ${abstract} ${identifier}`) };
  }).filter(item => item.identifier && item.date);

  if (!layers.length) throw new Error("No dated Wayback layers were found");

  const target = Date.parse(`${targetDate}T00:00:00Z`);
  let selected = layers.find(item => item.date === targetDate);
  let exact = true;

  if (!selected) {
    exact = false;
    selected = layers.reduce((best, item) => {
      const distance = Math.abs(Date.parse(`${item.date}T00:00:00Z`) - target);
      return !best || distance < best.distance ? { ...item, distance } : best;
    }, null);
  }

  return {
    ...selected,
    exact,
    url: `https://wayback.maptiles.arcgis.com/arcgis/rest/services/World_Imagery/WMTS/1.0.0/default028mm/MapServer/tile/${selected.numericId}/{z}/{y}/{x}`
  };
}

function loadKml() {
  return new Promise((resolve, reject) => {
    const layer = omnivore.kml(ROI_KML_URL, null, L.geoJSON(null, {
      style: { color: "#ffffff", weight: 2, fillOpacity: 0 }
    }))
      .on("ready", function () {
        resolve({ layer: this, geojson: this.toGeoJSON(), bounds: this.getBounds() });
      })
      .on("error", () => reject(new Error("Could not load roi.kml")));
  });
}

function extractPolygons(geojson) {
  const polygons = [];
  const traverse = (geom) => {
    if (!geom) return;
    if (geom.type === "Polygon") {
      polygons.push(geom.coordinates);
    } else if (geom.type === "MultiPolygon") {
      polygons.push(...geom.coordinates);
    } else if (geom.type === "GeometryCollection" && geom.geometries) {
      geom.geometries.forEach(traverse);
    }
  };
  
  if (geojson.type === "FeatureCollection" && geojson.features) {
    geojson.features.forEach(f => traverse(f.geometry));
  } else if (geojson.type === "Feature") {
    traverse(geojson.geometry);
  } else {
    traverse(geojson);
  }
  return polygons;
}

function reprojectGeometry(geometry, fromCRS, toCRS) {
  const reprojectCoords = (coords) => {
    if (!coords) return coords;
    if (typeof coords[0] === "number") {
      return proj4(fromCRS, toCRS, coords);
    }
    return coords.map(reprojectCoords);
  };
  return {
    type: geometry.type,
    coordinates: reprojectCoords(geometry.coordinates)
  };
}

async function loadRaster(maskGeoJSON) {
  const response = await fetch(ROI_TIF_URL);
  if (!response.ok) throw new Error(`Could not load roi.tif (${response.status})`);

  const georaster = await parseGeoraster(await response.arrayBuffer());
  
  const multiPolygonCoords = extractPolygons(maskGeoJSON);
  const multiPolygon = {
    type: "MultiPolygon",
    coordinates: multiPolygonCoords
  };

  const georasterCRS = "EPSG:" + georaster.projection;
  const reprojectedMask = reprojectGeometry(multiPolygon, "EPSG:4326", georasterCRS);

  rasterLayer = new GeoRasterLayer({
    georaster,
    opacity: transparencyToOpacity(),
    resolution: 256,
    resampleMethod: "nearest",
    mask: reprojectedMask,
    mask_srs: georasterCRS,
    mask_strategy: "outside",
    pixelValuesToColorFn: values => CLASS_COLORS[values[0]] || null
  });
  rasterLayer.addTo(map);
  return rasterLayer;
}

function addClickInspector() {
  map.on("click", event => {
    const { lat, lng } = event.latlng;
    const point = { type: "Point", coordinates: [lng, lat] };

    // Leaflet's bounds check keeps clicks near the ROI sensible; the KML border remains visible.
    if (!L.geoJSON(roiGeoJSON).getBounds().contains(event.latlng)) return;

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

    if (!clickMarker) clickMarker = L.marker(event.latlng).addTo(map);
    else clickMarker.setLatLng(event.latlng);
    clickMarker.bindPopup(popupHtml).openPopup();
  });
}

async function init() {
  try {
    setTransparencyLabel();
    const roi = await loadKml();
    roiGeoJSON = roi.geojson;

    map.fitBounds(roi.bounds, { padding: [18, 18] });
    map.setMaxBounds(roi.bounds.pad(0.08));

    let waybackMessage = "";
    try {
      const waybackInfo = await resolveWaybackLayer(TARGET_WAYBACK_DATE);
      const wayback = new L.TileLayer.BoundaryCanvas(waybackInfo.url, {
        boundary: roiGeoJSON,
        minZoom: 0,
        maxZoom: 23,
        maxNativeZoom: 23,
        tileSize: 256,
        crossOrigin: true
      }).addTo(map);
      waybackMessage = waybackInfo.exact
        ? `Esri Wayback ${TARGET_WAYBACK_DATE}`
        : `nearest Esri Wayback release ${waybackInfo.date} (no exact ${TARGET_WAYBACK_DATE} release)`;
    } catch (error) {
      console.warn(error);
      waybackMessage = "Wayback imagery could not be resolved";
    }

    await loadRaster(roiGeoJSON);
    roi.layer.addTo(map).bringToFront();
    addClickInspector();

    setStatus(`Loaded roi.tif and roi.kml with ${waybackMessage}.`);
  } catch (error) {
    console.error(error);
    setStatus(`${error.message}. Serve the folder over HTTP; do not open index.html directly.`, true);
  }
}

opacityEl.addEventListener("input", () => {
  setTransparencyLabel();
  if (rasterLayer) rasterLayer.setOpacity(transparencyToOpacity());
});

init();

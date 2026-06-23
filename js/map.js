const map = L.map('map', { zoomControl: true });

const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 20,
  attribution: '&copy; OpenStreetMap contributors'
});

const esriImagery = L.tileLayer(
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  { maxZoom: 20, attribution: 'Tiles &copy; Esri' }
);

const usgsTopo = L.tileLayer(
  'https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}',
  { maxZoom: 16, attribution: 'USGS The National Map' }
);

esriImagery.addTo(map);

const memberStyle = { color: '#1f5fbf', weight: 1.3, opacity: 0.9, fillColor: '#4f9aff', fillOpacity: 0.12 };
const boundaryStyle = { color: '#d7191c', weight: 4, opacity: 0.95, fillOpacity: 0 };
const commonStyle = { color: '#238b45', weight: 1.6, opacity: 0.9, fillColor: '#74c476', fillOpacity: 0.32 };
const highlightStyle = { color: '#ff9900', weight: 4, opacity: 1, fillOpacity: 0.35 };

let memberLotsLayer, boundaryLayer, commonAreasLayer;
let memberFeatures = [];
let highlightedLayer = null;

function val(props, keys) {
  for (const k of keys) {
    if (props && props[k] !== undefined && props[k] !== null && String(props[k]).trim() !== '') return props[k];
  }
  return '';
}

function labelFor(props) {
  const address = val(props, ['Situs_Addr', 'ADDRESS', 'Address']);
  const pin = val(props, ['PIN_STRING', 'PIN']);
  return address || pin || 'Parcel';
}

function popupHtml(props, layerName) {
  const fields = [
    ['Layer', layerName],
    ['Address', val(props, ['Situs_Addr', 'ADDRESS', 'Address'])],
    ['PIN', val(props, ['PIN_STRING', 'PIN'])],
    ['Owner', val(props, ['Owner_Name', 'OWNER'])],
    ['Subdivision', val(props, ['Subdv_Desc', 'SUBDIVISION'])],
    ['Land use', val(props, ['LU_Desc', 'Land_Use'])],
    ['Acres', val(props, ['Ttl_Acres', 'ACRES'])],
    ['Legal', val(props, ['Legal_Desc', 'LEGAL'])]
  ].filter(row => row[1] !== '');
  return `<strong>${labelFor(props)}</strong><table class="popup-table">` +
    fields.map(([k,v]) => `<tr><th>${k}</th><td>${String(v)}</td></tr>`).join('') +
    '</table>';
}

function featureSearchText(feature) {
  const p = feature.properties || {};
  return [
    p.Situs_Addr, p.PIN_STRING, p.PIN, p.Owner_Name, p.Subdv_Desc,
    p.Legal_Desc, p.LU_Desc, p.Situs_City
  ].filter(Boolean).join(' ').toLowerCase();
}

function clearHighlight() {
  if (highlightedLayer && highlightedLayer.setStyle) highlightedLayer.setStyle(memberStyle);
  highlightedLayer = null;
}

function zoomToLayer(layer) {
  clearHighlight();
  highlightedLayer = layer;
  layer.setStyle(highlightStyle);
  map.fitBounds(layer.getBounds(), { padding: [30, 30], maxZoom: 19 });
  layer.openPopup();
}

function makeResultItem(feature, layer) {
  const p = feature.properties || {};
  const div = document.createElement('div');
  div.className = 'result-item';
  div.innerHTML = `<div class="result-title">${labelFor(p)}</div>
    <div class="result-sub">PIN ${val(p, ['PIN_STRING','PIN']) || '—'}<br>${val(p, ['Subdv_Desc']) || ''}</div>`;
  div.onclick = () => zoomToLayer(layer);
  return div;
}

function doSearch() {
  const q = document.getElementById('searchBox').value.trim().toLowerCase();
  const resultList = document.getElementById('resultList');
  resultList.innerHTML = '';
  clearHighlight();
  if (!q) {
    resultList.textContent = 'Enter an address, parcel number, owner, or subdivision.';
    return;
  }
  const matches = memberFeatures.filter(x => x.searchText.includes(q)).slice(0, 50);
  if (!matches.length) {
    resultList.textContent = 'No matching member lots found.';
    return;
  }
  matches.forEach(x => resultList.appendChild(makeResultItem(x.feature, x.layer)));
}

async function addGeoJson(url, options) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not load ${url}`);
  const data = await response.json();
  return L.geoJSON(data, options);
}

Promise.all([
  addGeoJson('data/HOA_Member_Lots.geojson', {
    style: memberStyle,
    onEachFeature: (feature, layer) => {
      layer.bindPopup(popupHtml(feature.properties || {}, 'HOA Member Lots'));
      memberFeatures.push({ feature, layer, searchText: featureSearchText(feature) });
    }
  }),
  addGeoJson('data/HOA_District_Boundary.geojson', {
    style: boundaryStyle,
    onEachFeature: (feature, layer) => layer.bindPopup(popupHtml(feature.properties || {}, 'HOA District Boundary'))
  }),
  addGeoJson('data/HOA_Common_Areas.geojson', {
    style: commonStyle,
    onEachFeature: (feature, layer) => layer.bindPopup(popupHtml(feature.properties || {}, 'HOA Common Areas'))
  })
]).then(([members, boundary, commons]) => {
  memberLotsLayer = members.addTo(map);
  boundaryLayer = boundary.addTo(map);
  commonAreasLayer = commons.addTo(map);

  const bounds = L.featureGroup([memberLotsLayer, boundaryLayer, commonAreasLayer]).getBounds();
  map.fitBounds(bounds, { padding: [20, 20] });

  L.control.layers(
    { 'Esri World Imagery': esriImagery, 'OpenStreetMap': osm, 'USGS Topo': usgsTopo },
    { 'HOA Member Lots': memberLotsLayer, 'District Boundary Candidate': boundaryLayer, 'Common Areas / Context': commonAreasLayer },
    { collapsed: false }
  ).addTo(map);

  document.getElementById('resultList').textContent = `${memberFeatures.length} member lots loaded. Search by address, PIN, owner, or subdivision.`;
}).catch(err => {
  document.getElementById('resultList').textContent = err.message;
  console.error(err);
});

document.getElementById('searchButton').addEventListener('click', doSearch);
document.getElementById('searchBox').addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });
document.getElementById('clearButton').addEventListener('click', () => {
  document.getElementById('searchBox').value = '';
  doSearch();
  if (memberLotsLayer) map.fitBounds(memberLotsLayer.getBounds(), { padding: [20,20] });
});

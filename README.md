# Cape George HOA GIS Prototype

This is a static GitHub Pages prototype using Leaflet and GeoJSON.

## Contents

- `index.html` - web map page
- `css/style.css` - page styling
- `js/map.js` - Leaflet map logic
- `data/HOA_Member_Lots.geojson` - member-lot layer
- `data/HOA_District_Boundary.geojson` - candidate dissolved boundary
- `data/HOA_Common_Areas.geojson` - common-area/context parcels

## Publish on GitHub Pages

1. Create a new GitHub repository, for example `CapeGeorgeGIS`.
2. Upload all files and folders from this package to the repository root.
3. Go to repository **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Branch: `main`; folder: `/root`.
6. Save.
7. After GitHub publishes, open the URL shown on the Pages settings screen.

## Local testing

Because browsers often block local file loading, use a simple local web server:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Data note

The district boundary is a candidate boundary generated from selected parcel geometry and should be verified against plats and governing documents before legal or operational reliance.

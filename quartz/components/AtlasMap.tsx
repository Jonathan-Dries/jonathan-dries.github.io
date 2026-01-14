import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

const AtlasMap: QuartzComponent = ({ fileData, allFiles, displayClass }: QuartzComponentProps) => {
  
  // 1. Determine Context
  const isCountryPage = fileData.frontmatter?.tags?.includes("country")
  const isAtlasPage = fileData.frontmatter?.tags?.includes("atlas")

  // Only render if we are on the Atlas or a Country page
  if (!isCountryPage && !isAtlasPage) return null

  // 2. Filter Data
  let mapPins = []
  
  if (isAtlasPage) {
    mapPins = allFiles.filter((file) => 
      file.frontmatter?.tags?.includes("country") && 
      file.frontmatter?.mapView
    ).map((file) => ({
      lat: file.frontmatter!.mapView!.lat,
      lng: file.frontmatter!.mapView!.lng,
      title: file.frontmatter!.title,
      link: `/${file.slug}`,
      type: "country"
    }))
  } else if (isCountryPage) {
    const currentCountryTag = fileData.frontmatter?.title?.toLowerCase()
    mapPins = allFiles.filter((file) => 
      file.frontmatter?.tags?.includes(currentCountryTag) && 
      file.frontmatter?.location
    ).map((file) => ({
      lat: file.frontmatter!.location![0],
      lng: file.frontmatter!.location![1],
      title: file.frontmatter!.title,
      link: `/${file.slug}`,
      type: "note"
    }))
  }

  // 3. Set View Settings
  const center = isCountryPage 
    ? [fileData.frontmatter?.mapView?.lat, fileData.frontmatter?.mapView?.lng] 
    : [20, 0] 
  const zoom = isCountryPage 
    ? fileData.frontmatter?.mapView?.zoom 
    : 2

  // 4. The Logic
  return (
    <div class={`vintage-map-wrapper ${displayClass ?? ""}`}>
      <div id="lofi-map" style="height: 450px; width: 100%; z-index: 1;"></div>
      
      <script dangerouslySetInnerHTML={{__html: `
        // Pass server-side data to window
        window.currentMapData = ${JSON.stringify(mapPins)};
        window.currentMapView = { center: [${center}], zoom: ${zoom} };

        function loadMap() {
          const mapContainer = document.getElementById('lofi-map');
          if (!mapContainer) return;

          // Cleanup: If a map already exists, destroy it before making a new one
          if (window.leafletMap) {
            window.leafletMap.remove();
            window.leafletMap = null;
          }

          // Initialize Map
          const map = L.map('lofi-map', {
            center: window.currentMapView.center,
            zoom: window.currentMapView.zoom,
            scrollWheelZoom: false,
            attributionControl: false
          });
          
          window.leafletMap = map; // Save reference for cleanup later

          // 1. RAW WATERCOLOR (Stamen via Stadia)
          L.tileLayer('https://tiles.stadiamaps.com/tiles/stamen_watercolor/{z}/{x}/{y}.jpg?api_key=ebce596a-b266-4693-ad6c-6695c5f7e623', {
            maxZoom: 16,
          }).addTo(map);

          // 2. LABELS (So you can read it)
          L.tileLayer('https://tiles.stadiamaps.com/tiles/stamen_toner_labels/{z}/{x}/{y}.png?api_key=ebce596a-b266-4693-ad6c-6695c5f7e623', {
            maxZoom: 16,
            zIndex: 20,
            opacity: 0.7 
          }).addTo(map);

          // 3. PINS (Fixing the path: /assets/ instead of /content/assets/)
          const inkIcon = L.icon({
            iconUrl: '/assets/ink-pin.png', 
            iconSize: [28, 28], 
            iconAnchor: [14, 14],
            popupAnchor: [0, -10]
          });

          window.currentMapData.forEach(pin => {
            const marker = L.marker([pin.lat, pin.lng], {icon: inkIcon}).addTo(map);
            marker.bindPopup(\`<b><a href="\${pin.link}" class="internal" style="font-family: serif; color: #5a4a42; text-decoration: none;">\${pin.title}</a></b>\`);
          });
        }

        // RESOURCE LOADER: Only load Leaflet CSS/JS once
        if (!document.getElementById('leaflet-css')) {
          const link = document.createElement('link');
          link.id = 'leaflet-css';
          link.rel = 'stylesheet';
          link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
          document.head.appendChild(link);
          
          const script = document.createElement('script');
          script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
          script.onload = loadMap; // Load map when script is ready
          document.head.appendChild(script);
        } else {
          loadMap(); // Script already there? Just load map.
        }

        // NAVIGATION EVENT LISTENER (Crucial for Quartz SPA)
        // This listens for when you click a link and re-runs the map logic
        document.addEventListener('nav', () => {
          loadMap();
        });

      `}}></script>
    </div>
  )
}

export default (() => AtlasMap) satisfies QuartzComponentConstructor
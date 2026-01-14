import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

const AtlasMap: QuartzComponent = ({ fileData, allFiles, displayClass }: QuartzComponentProps) => {
  
  // 1. Determine Context
  const isCountryPage = fileData.frontmatter?.tags?.includes("country")
  const isAtlasPage = fileData.frontmatter?.tags?.includes("atlas")

  // Only render on Atlas or Country pages
  if (!isCountryPage && !isAtlasPage) return null

  // 2. Filter Data
  let mapPins = []
  
  if (isAtlasPage) {
    // Show only Countries on the main Atlas page
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
    // Show Notes on specific Country pages
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

  // 4. Render HTML & Script
  return (
    <div class={`vintage-map-wrapper ${displayClass ?? ""}`}>
      <div id="lofi-map" style="height: 450px; width: 100%;"></div>
      {/* The Vintage Paper Overlay */}
      <div class="vintage-overlay"></div>
      
      <script dangerouslySetInnerHTML={{__html: `
        window.currentMapData = ${JSON.stringify(mapPins)};
        window.currentMapView = { center: [${center}], zoom: ${zoom} };

        function loadMap() {
          const mapContainer = document.getElementById('lofi-map');
          if (!mapContainer) return;

          // Cleanup existing map
          if (window.leafletMap) {
            window.leafletMap.remove();
            window.leafletMap = null;
          }

          // Initialize Map
          const map = L.map('lofi-map', {
            center: window.currentMapView.center,
            zoom: window.currentMapView.zoom,
            scrollWheelZoom: true, 
            zoomControl: true,
            attributionControl: false
          });
          
          window.leafletMap = map;

          // Force zoom control to top-right
          map.zoomControl.setPosition('topright');

          // TILE LAYER: Esri World Physical (The Vintage Atlas Look)
          L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Physical_Map/MapServer/tile/{z}/{y}/{x}', {
            maxZoom: 8,
            subdomains: 'abcd'
          }).addTo(map);

          // PINS: Your custom image
          const inkIcon = L.icon({
            iconUrl: '/assets/ink.png', 
            iconSize: [28, 28],        
            iconAnchor: [14, 14],      
            popupAnchor: [0, -10]
          });

          window.currentMapData.forEach(pin => {
            const marker = L.marker([pin.lat, pin.lng], {icon: inkIcon}).addTo(map);
            marker.bindPopup(\`<b><a href="\${pin.link}" class="internal" style="font-family: serif; color: #5a4a42; text-decoration: none;">\${pin.title}</a></b>\`);
          });
        }

        // LOAD RESOURCES
        if (!document.getElementById('leaflet-css')) {
          const link = document.createElement('link');
          link.id = 'leaflet-css';
          link.rel = 'stylesheet';
          link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
          document.head.appendChild(link);
          
          const script = document.createElement('script');
          script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
          script.onload = loadMap;
          document.head.appendChild(script);
        } else {
          loadMap();
        }

        // SPA NAVIGATION FIX
        document.addEventListener('nav', () => {
          loadMap();
        });

      `}}></script>
    </div>
  )
}

export default (() => AtlasMap) satisfies QuartzComponentConstructor
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

const AtlasMap: QuartzComponent = ({ fileData, allFiles, displayClass }: QuartzComponentProps) => {
  
  // 1. Context Logic
  const isCountryPage = fileData.frontmatter?.tags?.includes("country")
  const isAtlasPage = fileData.frontmatter?.tags?.includes("atlas")

  if (!isCountryPage && !isAtlasPage) return null

  // 2. Data Filtering
  let mapPins = []
  
  if (isAtlasPage) {
    // ATLAS PAGE: Show only Countries
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
    // COUNTRY PAGE: Show Field Notes (exclude self)
    const currentCountryTag = fileData.frontmatter?.title?.toLowerCase()
    const currentSlug = fileData.slug
    
    mapPins = allFiles.filter((file) => {
      const tags = file.frontmatter?.tags?.map((t: string) => t.toLowerCase()) || []
      return (
        tags.includes(currentCountryTag) && 
        file.frontmatter?.location && 
        file.slug !== currentSlug
      )
    }).map((file) => ({
      lat: file.frontmatter!.location![0],
      lng: file.frontmatter!.location![1],
      title: file.frontmatter!.title,
      link: `/${file.slug}`,
      type: "note"
    }))
  }

  // 3. View Settings
  const center = isCountryPage 
    ? [fileData.frontmatter?.mapView?.lat, fileData.frontmatter?.mapView?.lng] 
    : [20, 0] 
  const zoom = isCountryPage 
    ? fileData.frontmatter?.mapView?.zoom 
    : 2

  // 4. The HTML & Script
  return (
    <div class={`vintage-map-wrapper ${displayClass ?? ""}`}>
      <div id="lofi-map" style="height: 450px; width: 100%;"></div>
      {/* Texture Overlay */}
      <div class="vintage-overlay"></div>
      
      <script dangerouslySetInnerHTML={{__html: `
        // 1. Setup Data
        window.currentMapData = ${JSON.stringify(mapPins)};
        window.currentMapView = { center: [${center}], zoom: ${zoom} };

        // 2. Define Renderer
        function renderAtlasMap() {
          const container = document.getElementById('lofi-map');
          if (!container) return;

          // NUCLEAR CLEANUP: Kill old map instance
          if (window.leafletMap) {
            window.leafletMap.remove();
            window.leafletMap = null;
          }
          container.innerHTML = ""; // Wipe DOM
          container._leaflet_id = null;

          // 3. Initialize (Next Frame)
          requestAnimationFrame(() => {
            // DEFINE BOUNDS: Lock the map to the world, no grey void.
            const southWest = L.latLng(-85, -180);
            const northEast = L.latLng(85, 180);
            const worldBounds = L.latLngBounds(southWest, northEast);

            const map = L.map('lofi-map', {
              center: window.currentMapView.center,
              zoom: window.currentMapView.zoom,
              // CONSTRAINTS
              minZoom: 2,           
              maxBounds: worldBounds, 
              maxBoundsViscosity: 1.0, 
              // CONTROLS
              scrollWheelZoom: true,
              zoomControl: true,
              attributionControl: false,
              fadeAnimation: false,
              zoomAnimation: false
            });
            
            window.leafletMap = map;
            map.zoomControl.setPosition('topright');

            // Esri Physical Map
            L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Physical_Map/MapServer/tile/{z}/{y}/{x}', {
              maxZoom: 8,
              subdomains: 'abcd',
              bounds: worldBounds
            }).addTo(map);

            // Pins (with CSS Class for Multiply effect)
            const inkIcon = L.icon({
              iconUrl: '/assets/ink.png', 
              iconSize: [28, 28],        
              iconAnchor: [14, 14],      
              popupAnchor: [0, -10],
              className: 'lofi-pin-icon' // <--- CSS targets this
            });

            window.currentMapData.forEach(pin => {
              const marker = L.marker([pin.lat, pin.lng], {icon: inkIcon}).addTo(map);
              marker.bindPopup(\`<b><a href="\${pin.link}" class="internal" style="font-family: serif; color: #5a4a42; text-decoration: none;">\${pin.title}</a></b>\`);
            });

            setTimeout(() => { map.invalidateSize(); }, 100);
          });
        }

        // 3. Execution Logic (SPA Friendly)
        if (!window.hasAtlasListener) {
          document.addEventListener('nav', renderAtlasMap);
          window.hasAtlasListener = true;
        }

        if (!document.getElementById('leaflet-css')) {
          const link = document.createElement('link');
          link.id = 'leaflet-css';
          link.rel = 'stylesheet';
          link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
          document.head.appendChild(link);
          
          const script = document.createElement('script');
          script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
          script.onload = renderAtlasMap;
          document.head.appendChild(script);
        } else {
          renderAtlasMap();
        }
      `}}></script>
    </div>
  )
}

export default (() => AtlasMap) satisfies QuartzComponentConstructor
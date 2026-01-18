import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

const AtlasMap: QuartzComponent = ({ fileData, allFiles, displayClass }: QuartzComponentProps) => {
  
  // 1. Context Logic
  const isCountryPage = fileData.frontmatter?.tags?.includes("country")
  const isAtlasPage = fileData.frontmatter?.tags?.includes("atlas")

  if (!isCountryPage && !isAtlasPage) return null

  // 2. Data Filtering
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

  // Generate a unique ID to prevent caching collisions between page loads
  const mapId = `lofi-map-${Math.random().toString(36).substring(7)}`

  // 4. The HTML & Script
  return (
    <div class={`vintage-map-wrapper ${displayClass ?? ""}`}>
      <div id={mapId} style="height: 450px; width: 100%;"></div>
      <div class="vintage-overlay"></div>
      
      <script dangerouslySetInnerHTML={{__html: `
        // Scope variables to this execution context
        (function() {
          const mapData = ${JSON.stringify(mapPins)};
          const mapView = { center: [${center}], zoom: ${zoom} };
          const containerId = "${mapId}";

          function initMap() {
            const container = document.getElementById(containerId);
            if (!container) return;

            // NUCLEAR CLEANUP: If a global map instance exists, destroy it.
            // This handles the SPA transition leftovers.
            if (window.leafletMap) {
              window.leafletMap.remove();
              window.leafletMap = null;
            }

            // Ensure container is clean
            container.innerHTML = "";

            // Wait for next frame to ensure DOM is ready
            requestAnimationFrame(() => {
              if (!window.L) return; // Safety check

              const southWest = L.latLng(-85, -180);
              const northEast = L.latLng(85, 180);
              const worldBounds = L.latLngBounds(southWest, northEast);

              const map = L.map(containerId, {
                center: mapView.center,
                zoom: mapView.zoom,
                minZoom: 2,           
                maxBounds: worldBounds, 
                maxBoundsViscosity: 1.0, 
                scrollWheelZoom: true,
                zoomControl: true,
                attributionControl: false,
                fadeAnimation: false,
                zoomAnimation: false
              });
              
              // Store globally so we can clean it up next time
              window.leafletMap = map;
              map.zoomControl.setPosition('topright');

              L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Physical_Map/MapServer/tile/{z}/{y}/{x}', {
                maxZoom: 8,
                subdomains: 'abcd',
                bounds: worldBounds
              }).addTo(map);

              const inkIcon = L.icon({
                iconUrl: '/assets/ink.png', 
                iconSize: [28, 28],        
                iconAnchor: [14, 14],      
                popupAnchor: [0, -10],
                className: 'lofi-pin-icon' 
              });

              mapData.forEach(pin => {
                const marker = L.marker([pin.lat, pin.lng], {icon: inkIcon}).addTo(map);
                marker.bindPopup(\`<b><a href="\${pin.link}" class="internal" style="font-family: serif; color: #5a4a42; text-decoration: none;">\${pin.title}</a></b>\`);
              });

              setTimeout(() => { map.invalidateSize(); }, 100);
            });
          }

          // LOAD LOGIC
          // Check if Leaflet is loaded. If not, load it. If yes, run init.
          if (!document.getElementById('leaflet-css')) {
            const link = document.createElement('link');
            link.id = 'leaflet-css';
            link.rel = 'stylesheet';
            link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
            document.head.appendChild(link);
            
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
            script.onload = initMap;
            document.head.appendChild(script);
          } else {
            // If Leaflet is already there, just run init
            initMap();
          }
        })();
      `}}></script>
    </div>
  )
}

export default (() => AtlasMap) satisfies QuartzComponentConstructor
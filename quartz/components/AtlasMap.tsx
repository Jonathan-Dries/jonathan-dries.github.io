import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

const AtlasMap: QuartzComponent = ({ fileData, allFiles, displayClass }: QuartzComponentProps) => {
  
  // 1. Determine Context
  const isCountryPage = fileData.frontmatter?.tags?.includes("country")
  const isAtlasPage = fileData.frontmatter?.tags?.includes("atlas")

  if (!isCountryPage && !isAtlasPage) return null

  // 2. Filter Data
  let mapPins = []
  
  if (isAtlasPage) {
    // ATLAS PAGE: Show only files tagged "country"
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
    // COUNTRY PAGE: Show files tagged with this country (e.g. "china")
    // BUT exclude the country page itself.
    
    // Normalize the current title to lowercase for tag matching (e.g. "China" -> "china")
    const currentCountryTag = fileData.frontmatter?.title?.toLowerCase()
    const currentSlug = fileData.slug

    mapPins = allFiles.filter((file) => {
      // Get tags of the potential note (lowercase them to be safe)
      const tags = file.frontmatter?.tags?.map((t: string) => t.toLowerCase()) || []
      
      return (
        tags.includes(currentCountryTag) && // Must have tag "china"
        file.frontmatter?.location &&       // Must have coordinates
        file.slug !== currentSlug           // Must NOT be the China page itself
      )
    }).map((file) => ({
      lat: file.frontmatter!.location![0],
      lng: file.frontmatter!.location![1],
      title: file.frontmatter!.title,
      link: `/${file.slug}`,
      type: "note"
    }))
  }

  // 3. Set View Settings
  // If we are on a Country page, use its specific mapView coordinates
  const center = isCountryPage 
    ? [fileData.frontmatter?.mapView?.lat, fileData.frontmatter?.mapView?.lng] 
    : [20, 0] 
  const zoom = isCountryPage 
    ? fileData.frontmatter?.mapView?.zoom 
    : 2

  // 4. Render
  return (
    <div class={`vintage-map-wrapper ${displayClass ?? ""}`}>
      <div id="lofi-map" style="height: 450px; width: 100%;"></div>
      <div class="vintage-overlay"></div>
      
      <script dangerouslySetInnerHTML={{__html: `
        window.currentMapData = ${JSON.stringify(mapPins)};
        window.currentMapView = { center: [${center}], zoom: ${zoom} };

        window.initAtlasMap = function() {
          const mapContainer = document.getElementById('lofi-map');
          if (!mapContainer) return;

          // CLEANUP
          if (window.leafletMap) {
            window.leafletMap.off();
            window.leafletMap.remove();
            window.leafletMap = null;
          }
          if (mapContainer.classList.contains('leaflet-container')) {
            mapContainer.innerHTML = "";
            mapContainer.classList.remove('leaflet-container');
          }

          setTimeout(() => {
              const map = L.map('lofi-map', {
                center: window.currentMapView.center,
                zoom: window.currentMapView.zoom,
                scrollWheelZoom: true, 
                zoomControl: true,
                attributionControl: false
              });
              
              window.leafletMap = map;
              map.zoomControl.setPosition('topright');

              // Esri Physical Map
              L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Physical_Map/MapServer/tile/{z}/{y}/{x}', {
                maxZoom: 8,
                subdomains: 'abcd'
              }).addTo(map);

              // Pins
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

              map.invalidateSize();
          }, 50);
        }

        if (window.atlasNavHandler) {
          document.removeEventListener('nav', window.atlasNavHandler);
        }
        window.atlasNavHandler = () => {
           window.initAtlasMap();
        };
        document.addEventListener('nav', window.atlasNavHandler);

        if (!document.getElementById('leaflet-css')) {
          const link = document.createElement('link');
          link.id = 'leaflet-css';
          link.rel = 'stylesheet';
          link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
          document.head.appendChild(link);
          
          const script = document.createElement('script');
          script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
          script.onload = window.initAtlasMap;
          document.head.appendChild(script);
        } else {
          window.initAtlasMap();
        }

      `}}></script>
    </div>
  )
}

export default (() => AtlasMap) satisfies QuartzComponentConstructor
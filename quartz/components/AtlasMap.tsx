import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
// Note: Leaflet must be imported dynamically in Next/Quartz usually, 
// but for this snippet, we will handle the logic in the script that gets emitted.

const AtlasMap: QuartzComponent = ({ fileData, allFiles, displayClass }: QuartzComponentProps) => {
  
  // 1. Determine Context: Are we on the World Map (Index) or a Country Page?
  const isCountryPage = fileData.frontmatter?.tags?.includes("country")
  const isWorldPage = fileData.slug === "index" || fileData.frontmatter?.tags?.includes("atlas")

  if (!isCountryPage && !isWorldPage) return null

  // 2. Filter Data based on Context
  let mapPins = []
  
  if (isWorldPage) {
    // Show only Countries
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
    // Show Field Notes related to this country
    // (Assuming the country page title matches the tag in the note, e.g., "China")
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

  // 3. Set Initial View
  const center = isCountryPage 
    ? [fileData.frontmatter?.mapView?.lat, fileData.frontmatter?.mapView?.lng] 
    : [20, 0] // World Center
  const zoom = isCountryPage 
    ? fileData.frontmatter?.mapView?.zoom 
    : 2

  // 4. Emit HTML + Script
  // We serialize the data to pass it to the client-side script
  return (
    <div class={`vintage-map-wrapper ${displayClass ?? ""}`}>
      <div id="lofi-map" style="height: 500px; width: 100%; z-index: 1;"></div>
      <div class="vintage-overlay"></div>
      <script dangerouslySetInnerHTML={{__html: `
        window.mapData = ${JSON.stringify(mapPins)};
        window.mapView = { center: [${center}], zoom: ${zoom} };
        
        // Lazy load Leaflet CSS and JS from CDN to avoid build issues
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
          initMap();
        }

        function initMap() {
          const map = L.map('lofi-map', {
            center: window.mapView.center,
            zoom: window.mapView.zoom,
            scrollWheelZoom: false, // Keep it calm
            attributionControl: false
          });

          // THE AESTHETIC TILE LAYER (Esri World Physical)
          L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Physical_Map/MapServer/tile/{z}/{y}/{x}', {
            maxZoom: 8,
            subdomains: 'abcd'
          }).addTo(map);

          // Custom Icon
          const inkIcon = L.icon({
            iconUrl: '/content/assets/ink-pin.png', // Ensure this path is correct
            iconSize: [24, 24], // Adjust based on your PNG
            iconAnchor: [12, 12],
            popupAnchor: [0, -10]
          });

          // Add Pins
          window.mapData.forEach(pin => {
            const marker = L.marker([pin.lat, pin.lng], {icon: inkIcon}).addTo(map);
            marker.bindPopup(\`<b><a href="\${pin.link}" style="font-family: serif;">\${pin.title}</a></b>\`);
          });
        }
      `}}></script>
    </div>
  )
}

export default (() => AtlasMap) satisfies QuartzComponentConstructor
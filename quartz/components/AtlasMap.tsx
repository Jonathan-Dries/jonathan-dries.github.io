import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

const AtlasMap: QuartzComponent = ({ fileData, allFiles, displayClass }: QuartzComponentProps) => {
  
  // 1. Determine Context
  const isCountryPage = fileData.frontmatter?.tags?.includes("country")
  const isWorldPage = fileData.slug === "index" || fileData.frontmatter?.tags?.includes("atlas")

  if (!isCountryPage && !isWorldPage) return null

  // 2. Filter Data
  let mapPins = []
  
  if (isWorldPage) {
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

  // 3. Set Initial View
  const center = isCountryPage 
    ? [fileData.frontmatter?.mapView?.lat, fileData.frontmatter?.mapView?.lng] 
    : [20, 0] 
  const zoom = isCountryPage 
    ? fileData.frontmatter?.mapView?.zoom 
    : 2

  // 4. Emit HTML + Script
  return (
    <div class={`vintage-map-wrapper ${displayClass ?? ""}`}>
      <div id="lofi-map" style="height: 500px; width: 100%; z-index: 1;"></div>
      <div class="vintage-overlay"></div>
      <script dangerouslySetInnerHTML={{__html: `
        window.mapData = ${JSON.stringify(mapPins)};
        window.mapView = { center: [${center}], zoom: ${zoom} };
        
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
            scrollWheelZoom: false,
            attributionControl: false
          });

          // LAYER 1: Stamen Watercolor (The Art)
          L.tileLayer('https://tiles.stadiamaps.com/tiles/stamen_watercolor/{z}/{x}/{y}.jpg?api_key=ebce596a-b266-4693-ad6c-6695c5f7e623', {
            maxZoom: 16,
          }).addTo(map);

          // LAYER 2: Stamen Toner Labels (The Text)
          // We add this on top so you can actually read the country names
          L.tileLayer('https://tiles.stadiamaps.com/tiles/stamen_toner_labels/{z}/{x}/{y}.png?api_key=ebce596a-b266-4693-ad6c-6695c5f7e623', {
            maxZoom: 16,
            zIndex: 20,
            opacity: 0.6 // Slightly faded labels to match the lo-fi vibe
          }).addTo(map);

          const inkIcon = L.icon({
            iconUrl: '/content/assets/pin.png', 
            iconSize: [24, 24], 
            iconAnchor: [12, 12],
            popupAnchor: [0, -10]
          });

          window.mapData.forEach(pin => {
            const marker = L.marker([pin.lat, pin.lng], {icon: inkIcon}).addTo(map);
            marker.bindPopup(\`<b><a href="\${pin.link}" style="font-family: serif; color: #5a4a42;">\${pin.title}</a></b>\`);
          });
        }
      `}}></script>
    </div>
  )
}

export default (() => AtlasMap) satisfies QuartzComponentConstructor
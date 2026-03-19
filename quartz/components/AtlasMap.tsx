import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

const AtlasMap: QuartzComponent = ({ fileData, allFiles, displayClass }: QuartzComponentProps) => {
  // 1. Context Logic
  const isCountryPage = fileData.frontmatter?.tags?.includes("country")
  const isAtlasPage = fileData.frontmatter?.tags?.includes("atlas")

  if (!isCountryPage && !isAtlasPage) return null

  // 2. Data Filtering
  let mapPins = []

  if (isCountryPage) {
    const currentCountryTag = fileData.frontmatter?.title?.toLowerCase()
    const currentSlug = fileData.slug

    mapPins = allFiles
      .filter((file) => {
        const tags = file.frontmatter?.tags?.map((t: string) => t.toLowerCase()) || []
        return (
          tags.includes(currentCountryTag) &&
          file.frontmatter?.location &&
          file.slug !== currentSlug
        )
      })
      .map((file) => ({
        lat: file.frontmatter!.location![0],
        lng: file.frontmatter!.location![1],
        title: file.frontmatter!.title,
        link: `/${file.slug}`,
        type: "note",
      }))
  } else if (isAtlasPage) {
    mapPins = allFiles
      .filter(
        (file) =>
          file.frontmatter?.tags?.includes("country") && file.frontmatter?.mapView,
      )
      .map((file) => ({
        lat: file.frontmatter!.mapView!.lat,
        lng: file.frontmatter!.mapView!.lng,
        title: file.frontmatter!.title,
        link: `/${file.slug}`,
        type: "country",
      }))
  }

  // 3. View Settings
  const center = isCountryPage
    ? [fileData.frontmatter?.mapView?.lat, fileData.frontmatter?.mapView?.lng]
    : [20, 0]
  const zoom = isCountryPage ? fileData.frontmatter?.mapView?.zoom : 2

  // 4. Serialize data as a JSON blob in a hidden element + use nav event for SPA safety
  return (
    <div class={`vintage-map-wrapper ${displayClass ?? ""}`}>
      <div
        class="atlas-map-container"
        data-map-pins={JSON.stringify(mapPins)}
        data-map-center={JSON.stringify(center)}
        data-map-zoom={String(zoom)}
        style="height: 450px; width: 100%;"
      ></div>
      <div class="vintage-overlay"></div>
    </div>
  )
}

AtlasMap.afterDOMLoaded = `
  function initAtlasMap() {
    const container = document.querySelector(".atlas-map-container");
    if (!container) return;

    const mapPins = JSON.parse(container.getAttribute("data-map-pins") || "[]");
    const center = JSON.parse(container.getAttribute("data-map-center") || "[20,0]");
    const zoom = parseInt(container.getAttribute("data-map-zoom") || "2", 10);

    // Clean up any previous map instance
    if (window.__leafletMap) {
      window.__leafletMap.remove();
      window.__leafletMap = null;
    }
    container.innerHTML = "";

    function createMap() {
      if (!window.L) return;

      const southWest = L.latLng(-85, -180);
      const northEast = L.latLng(85, 180);
      const worldBounds = L.latLngBounds(southWest, northEast);

      const map = L.map(container, {
        center: center,
        zoom: zoom,
        minZoom: 2,
        maxBounds: worldBounds,
        maxBoundsViscosity: 1.0,
        scrollWheelZoom: true,
        zoomControl: true,
        attributionControl: false,
        fadeAnimation: false,
        zoomAnimation: false,
      });

      window.__leafletMap = map;
      map.zoomControl.setPosition("topright");

      // Stamen Watercolor tiles via Stadia Maps
      L.tileLayer(
        "https://tiles.stadiamaps.com/tiles/stamen_watercolor/{z}/{x}/{y}.jpg",
        { maxZoom: 16, bounds: worldBounds }
      ).addTo(map);

      // Stamen Terrain Labels overlay for readability
      L.tileLayer(
        "https://tiles.stadiamaps.com/tiles/stamen_terrain_labels/{z}/{x}/{y}{r}.png",
        { maxZoom: 16, bounds: worldBounds, opacity: 0.6 }
      ).addTo(map);

      const inkIcon = L.icon({
        iconUrl: "/assets/ink.png",
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        popupAnchor: [0, -10],
        className: "lofi-pin-icon",
      });

      mapPins.forEach(function (pin) {
        const marker = L.marker([pin.lat, pin.lng], { icon: inkIcon }).addTo(map);
        marker.bindPopup(
          '<b><a href="' + pin.link + '" class="internal" style="font-family: serif; color: #5a4a42; text-decoration: none;">' + pin.title + '</a></b>'
        );
      });

      setTimeout(function () { map.invalidateSize(); }, 100);
    }

    // Load Leaflet if needed, then create the map
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);

      const script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.onload = createMap;
      document.head.appendChild(script);
    } else {
      createMap();
    }
  }

  // Run on initial load
  initAtlasMap();
  // Re-run on SPA navigation
  document.addEventListener("nav", initAtlasMap);
`

export default (() => AtlasMap) satisfies QuartzComponentConstructor
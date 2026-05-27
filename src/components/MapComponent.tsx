import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface MapComponentProps {
  defaultCenter?: { lat: number; lng: number };
  defaultZoom?: number;
  center?: { lat: number; lng: number };
  zoom?: number;
  children?: React.ReactNode;
  disableDefaultUI?: boolean;
  routeCoordinates?: Array<{ lat: number; lng: number }>;
}

export default function MapComponent({
  defaultCenter,
  defaultZoom = 13,
  center,
  zoom,
  children,
  routeCoordinates,
}: MapComponentProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const polylineRef = useRef<L.Polyline | null>(null);
  const polylineOuterRef = useRef<L.Polyline | null>(null);

  const mapCenterRaw = center || defaultCenter || { lat: -33.9249, lng: 18.4241 };
  const mapCenter = (mapCenterRaw && typeof mapCenterRaw.lat === 'number' && typeof mapCenterRaw.lng === 'number' && !isNaN(mapCenterRaw.lat) && !isNaN(mapCenterRaw.lng))
    ? mapCenterRaw
    : { lat: -33.9249, lng: 18.4241 };
  const mapZoom = zoom || defaultZoom;

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    let isDestroyed = false;

    // Create Leaflet map instance
    const leafletMap = L.map(mapContainerRef.current, {
      center: [mapCenter.lat, mapCenter.lng],
      zoom: mapZoom,
      zoomControl: false, // Disables standard controls to match clean design
      attributionControl: false, // Hides OpenStreetMap copyright bar to look like native app
    });

    // Add CartoDB Dark Matter tile layer for an elegant, premium dark mode matching the design
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(leafletMap);

    mapRef.current = leafletMap;

    // Invalidate size immediately and register resize listener
    setTimeout(() => {
      if (isDestroyed) return;
      try {
        leafletMap.invalidateSize();
      } catch (e) {
        console.warn('Silent warning invalidating Leaflet size', e);
      }
    }, 100);

    const resizeObserver = new ResizeObserver(() => {
      if (isDestroyed) return;
      try {
        leafletMap.invalidateSize();
      } catch (e) {
        console.warn('Silent warning updating Leaflet size', e);
      }
    });
    
    resizeObserver.observe(mapContainerRef.current);

    return () => {
      isDestroyed = true;
      try {
        resizeObserver.disconnect();
      } catch (e) {
        // Safe ignore
      }
      try {
        leafletMap.remove();
      } catch (e) {
        console.warn('Silent warning removing Leaflet map instance', e);
      }
      mapRef.current = null;
    };
  }, []);

  // Update center & zoom if they change
  useEffect(() => {
    if (mapRef.current) {
      try {
        mapRef.current.setView([mapCenter.lat, mapCenter.lng], mapZoom);
      } catch (e) {
        console.warn('Silent warning changing Leaflet view', e);
      }
    }
  }, [mapCenter.lat, mapCenter.lng, mapZoom]);

  // Draw route polyline dynamically if provided
  useEffect(() => {
    const mapInstance = mapRef.current;
    if (!mapInstance) return;

    // Clear previous polylines
    if (polylineRef.current) {
      try { polylineRef.current.remove(); } catch (e) {}
      polylineRef.current = null;
    }
    if (polylineOuterRef.current) {
      try { polylineOuterRef.current.remove(); } catch (e) {}
      polylineOuterRef.current = null;
    }

    if (routeCoordinates && routeCoordinates.length > 1) {
      const latlngs = routeCoordinates
        .filter(p => p && typeof p.lat === 'number' && typeof p.lng === 'number' && !isNaN(p.lat) && !isNaN(p.lng))
        .map(p => [p.lat, p.lng] as L.LatLngExpression);
      
      try {
        if (latlngs.length > 1) {
          // Broad black road outline for gorgeous contrast
          const outerPoly = L.polyline(latlngs, {
            color: '#000000',
            weight: 7,
            opacity: 0.65,
            lineJoin: 'round',
            lineCap: 'round'
          }).addTo(mapInstance);
          polylineOuterRef.current = outerPoly;

          // Custom vibrant yellow road path matching the design screenshots
          const innerPoly = L.polyline(latlngs, {
            color: '#f5b400',
            weight: 4.2,
            opacity: 1.0,
            lineJoin: 'round',
            lineCap: 'round'
          }).addTo(mapInstance);
          polylineRef.current = innerPoly;

          // Auto fly/fit map bounds to perfectly show entire province route exactly like Uber
          const bounds = L.latLngBounds(latlngs);
          mapInstance.fitBounds(bounds, {
            padding: [50, 50],
            maxZoom: 15
          });
        }
      } catch (e) {
        console.warn('Error drawing route polylines', e);
      }
    }
  }, [routeCoordinates]);

  // Update markers dynamically
  useEffect(() => {
    const mapInstance = mapRef.current;
    if (!mapInstance) return;

    try {
      // Clear existing leaflet markers safely
      markersRef.current.forEach((marker) => {
        try {
          marker.remove();
        } catch (e) {
          // Ignore if already removed
        }
      });
      markersRef.current = [];

      // Parse children to extract custom marker coordinates & attributes
      const markersData: Array<{ lat: number; lng: number; color?: string; type?: string; rotation?: number }> = [];

      React.Children.forEach(children, (child) => {
        if (!child || !React.isValidElement(child)) return;

        const props = child.props as any;
        if (props && props.position) {
          const lat = parseFloat(props.position.lat);
          const lng = parseFloat(props.position.lng);
          
          if (isNaN(lat) || isNaN(lng)) return; // Prevents invalid coordinate states from breaking Leaflet's positioning

          const type = props.type || 'default';
          let pinColor = props.color || '#EAB308'; // Default gold
          const rotation = props.rotation || 0;
          
          // Traverse to find inner child (e.g., Pin) background colors
          if (props.children && React.isValidElement(props.children)) {
            const pinProps = props.children.props as any;
            if (pinProps && pinProps.background) {
              pinColor = pinProps.background;
            }
          }
          
          markersData.push({
            lat,
            lng,
            color: pinColor,
            type: type,
            rotation: rotation
          });
        }
      });

      // Add marker instances with stylized glowing pulse effect
      markersData.forEach((markerData) => {
        try {
          let iconHtml = '';
          let iconSize: [number, number] = [24, 24];
          let iconAnchor: [number, number] = [12, 12];
          
          if (markerData.type === 'pickup') {
            iconSize = [48, 48];
            iconAnchor = [24, 24];
            iconHtml = `
              <div style="
                position: relative;
                width: 18px;
                height: 18px;
                background-color: #3b82f6;
                border: 3px solid #ffffff;
                border-radius: 50%;
                box-shadow: 0 0 15px rgba(59, 130, 246, 0.95);
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 15px; /* Offset to center within 48x48 icon rect */
              ">
                <div class="marker-glowing-halo" style="
                  position: absolute;
                  width: 38px;
                  height: 38px;
                  border-radius: 50%;
                  background-color: rgba(59, 130, 246, 0.28);
                  animation: map-custom-ping-anim 2.0s infinite ease-out;
                  pointer-events: none;
                  top: -13px;
                  left: -13px;
                "></div>
              </div>
              <style>
                @keyframes map-custom-ping-anim {
                  0% { transform: scale(0.6); opacity: 1; }
                  100% { transform: scale(1.6); opacity: 0; }
                }
              </style>
            `;
          } else if (markerData.type === 'dropoff') {
            iconSize = [32, 32];
            iconAnchor = [16, 16];
            iconHtml = `
              <div style="
                position: relative;
                width: 14px;
                height: 14px;
                background-color: #ff3b30;
                border: 2.5px solid #ffffff;
                border-radius: 50%;
                box-shadow: 0 0 12px rgba(255, 59, 48, 0.8);
                margin: 9px;
              "></div>
            `;
          } else if (markerData.type === 'car') {
            iconSize = [40, 40];
            iconAnchor = [20, 20];
            iconHtml = `
              <div style="
                display: flex;
                align-items: center;
                justify-content: center;
                width: 40px;
                height: 40px;
              ">
                <svg width="34" height="18" viewBox="0 0 34 18" fill="none" xmlns="http://www.w3.org/2000/svg" style="transform: rotate(${markerData.rotation || 0}deg); filter: drop-shadow(0px 3px 5px rgba(0,0,0,0.6));">
                  <rect x="2" y="1" width="30" height="16" rx="5" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="1"/>
                  <rect x="8" y="3" width="5" height="12" rx="1.5" fill="#111111" />
                  <rect x="15" y="3" width="8" height="12" rx="1.5" fill="#111111" />
                  <rect x="25" y="4" width="3" height="10" rx="1" fill="#111111" />
                  <rect x="10" y="0" width="2" height="1" rx="0.5" fill="#FFFFFF" />
                  <rect x="10" y="17" width="2" height="1" rx="0.5" fill="#FFFFFF" />
                  <rect x="31" y="2" width="1" height="3" rx="0.5" fill="#F8FAFC" />
                  <rect x="31" y="13" width="1" height="3" rx="0.5" fill="#F8FAFC" />
                  <rect x="2" y="2" width="1" height="3" rx="0.5" fill="#EF4444" />
                  <rect x="2" y="13" width="1" height="3" rx="0.5" fill="#EF4444" />
                </svg>
              </div>
            `;
          } else {
            const pulseColor = markerData.color === '#EAB308' 
              ? 'rgba(234, 179, 8, 0.4)' 
              : 'rgba(59, 130, 246, 0.4)';
            const innerColor = markerData.color === '#EAB308' ? '#000000' : '#FFFFFF';
            
            iconSize = [24, 24];
            iconAnchor = [12, 12];
            iconHtml = `
              <div style="
                width: 24px;
                height: 24px;
                background-color: ${markerData.color};
                border: 3px solid #FFFFFF;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 4px 12px rgba(0,0,0,0.4);
                animation: pulse-marker 1.6s infinite ease-in-out;
                transform-origin: center;
              ">
                <div style="
                  width: 6px;
                  height: 6px;
                  background-color: ${innerColor};
                  border-radius: 50%;
                "></div>
              </div>
              <style>
                @keyframes pulse-marker {
                  0% { box-shadow: 0 0 0 0px ${pulseColor}; }
                  70% { box-shadow: 0 0 0 10px rgba(0,0,0,0); }
                  100% { box-shadow: 0 0 0 0px rgba(0,0,0,0); }
                }
              </style>
            `;
          }

          const customIcon = L.divIcon({
            className: `custom-leaflet-marker-${markerData.type || 'default'}`,
            html: iconHtml,
            iconSize: iconSize,
            iconAnchor: iconAnchor,
          });

          const leafletMarker = L.marker([markerData.lat, markerData.lng], {
            icon: customIcon,
          }).addTo(mapInstance);

          markersRef.current.push(leafletMarker);
        } catch (e) {
          console.warn('Silent warning creating Leaflet marker', e);
        }
      });
    } catch (e) {
      console.warn('Silent warning updating markers list', e);
    }

  }, [children]);

  return (
    <div 
      ref={mapContainerRef} 
      className="w-full h-full relative" 
      style={{ minHeight: '100%', width: '100%' }}
    />
  );
}

// Export drop-in replacements for standard Google Maps components
export function AdvancedMarker({ children }: any) {
  return null;
}

export function Pin({ children }: any) {
  return null;
}

import { useEffect, useRef, useState } from 'react';
import { APIProvider, Map, AdvancedMarker, Pin, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';

const API_KEY = process.env.GOOGLE_MAPS_PLATFORM_KEY || '';
const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY';

interface DriverMapProps {
  origin?: google.maps.LatLngLiteral;
  destination?: string | google.maps.LatLngLiteral;
  restaurantLocation?: string | google.maps.LatLngLiteral;
  status: 'accepted' | 'picked_up' | 'en_route' | 'delivered' | 'delivery_started';
}

function RouteDisplay({ origin, destination, travelMode = 'DRIVING' }: {
  origin: google.maps.LatLngLiteral;
  destination: string | google.maps.LatLngLiteral;
  travelMode?: string;
}) {
  const map = useMap();
  const routesLib = useMapsLibrary('routes');
  const polylinesRef = useRef<google.maps.Polyline[]>([]);

  useEffect(() => {
    if (!routesLib || !map || !origin || !destination) return;

    // Clear previous routes
    polylinesRef.current.forEach(p => p.setMap(null));
    polylinesRef.current = [];

    routesLib.Route.computeRoutes({
      origin,
      destination,
      travelMode: travelMode as any,
      fields: ['path', 'viewport'],
    }).then(({ routes }) => {
      if (routes?.[0]) {
        const newPolylines = routes[0].createPolylines();
        newPolylines.forEach(p => {
          p.setOptions({
            strokeColor: '#3b82f6',
            strokeWeight: 6,
            strokeOpacity: 0.8
          });
          p.setMap(map);
        });
        polylinesRef.current = newPolylines;
        if (routes[0].viewport) map.fitBounds(routes[0].viewport, 50);
      }
    }).catch(err => console.error("Routing error:", err));

    return () => polylinesRef.current.forEach(p => p.setMap(null));
  }, [routesLib, map, origin, destination, travelMode]);

  return null;
}

function MapReCenter({ origin }: { origin?: google.maps.LatLngLiteral }) {
  const map = useMap();
  useEffect(() => {
    if (map && origin) {
      map.setCenter(origin);
    }
  }, [map, origin]);
  return null;
}

export default function DriverMap({ origin, destination, restaurantLocation, status }: DriverMapProps) {
  if (!hasValidKey) {
    return (
      <div className="w-full h-full bg-zinc-900 rounded-[32px] flex items-center justify-center p-8 text-center">
        <div className="max-w-xs">
          <h3 className="text-xl font-bold mb-2">Maps Key Required</h3>
          <p className="text-sm text-neutral-500 mb-4">Please add GOOGLE_MAPS_PLATFORM_KEY to secrets to enable live navigation.</p>
        </div>
      </div>
    );
  }

  // Determine current target based on status
  // if accepted -> go to restaurant
  // if picked_up -> go to delivery address
  const currentDestination = (status === 'delivery_started' || status === 'accepted') ? restaurantLocation : destination;

  return (
    <div className="w-full h-full rounded-[32px] overflow-hidden">
      <APIProvider apiKey={API_KEY} version="weekly">
        <Map
          defaultCenter={origin || { lat: 0, lng: 0 }}
          defaultZoom={15}
          mapId="DRIVER_NAV_MAP"
          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
          className="w-full h-full"
          disableDefaultUI={true}
        >
          <MapReCenter origin={origin} />
          {origin && (
            <AdvancedMarker position={origin}>
              <Pin background="#3b82f6" glyphColor="#fff" borderColor="#1e3a8a" />
            </AdvancedMarker>
          )}

          {currentDestination && typeof currentDestination !== 'string' && (
            <AdvancedMarker position={currentDestination}>
              <Pin background="#ef4444" glyphColor="#fff" />
            </AdvancedMarker>
          )}

          {origin && currentDestination && (
            <RouteDisplay origin={origin} destination={currentDestination} />
          )}
        </Map>
      </APIProvider>
    </div>
  );
}

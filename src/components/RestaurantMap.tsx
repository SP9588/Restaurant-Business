import { useEffect, useState } from 'react';
import { APIProvider, Map, AdvancedMarker, Pin, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';

const API_KEY = process.env.GOOGLE_MAPS_PLATFORM_KEY || '';
const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY';

interface RestaurantMapProps {
  address: string;
  restaurantName: string;
}

function GeocoderHandler({ address, setLocation }: { address: string, setLocation: (loc: google.maps.LatLngLiteral) => void }) {
  const map = useMap();
  const geocodingLib = useMapsLibrary('geocoding');

  useEffect(() => {
    if (!geocodingLib || !address) return;

    const geocoder = new geocodingLib.Geocoder();
    geocoder.geocode({ address }, (results, status) => {
      if (status === 'OK' && results?.[0]) {
        const location = results[0].geometry.location.toJSON();
        setLocation(location);
        if (map) {
          map.setCenter(location);
          map.setZoom(16);
        }
      } else {
        console.error('Geocode was not successful for the following reason: ' + status);
      }
    });
  }, [geocodingLib, address, map, setLocation]);

  return null;
}

export default function RestaurantMap({ address, restaurantName }: RestaurantMapProps) {
  const [location, setLocation] = useState<google.maps.LatLngLiteral | null>(null);

  if (!hasValidKey) {
    return (
      <div className="w-full h-48 bg-slate-100 dark:bg-zinc-800 rounded-3xl flex items-center justify-center p-6 text-center border-2 border-dashed border-slate-200">
        <div>
          <p className="text-xs font-black uppercase text-slate-400">Map Interface Offline</p>
          <p className="text-[10px] text-slate-500 italic mt-1">Configure Maps Key to visualize coordinates.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-64 rounded-3xl overflow-hidden shadow-inner bg-slate-100 border border-slate-200 dark:border-zinc-800">
      <APIProvider apiKey={API_KEY}>
        <Map
          defaultCenter={{ lat: 0, lng: 0 }}
          defaultZoom={2}
          mapId="RESTAURANT_DETAIL_MAP"
          className="w-full h-full"
          disableDefaultUI={true}
          gestureHandling="cooperative"
          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
        >
          <GeocoderHandler address={address} setLocation={setLocation} />
          {location && (
            <AdvancedMarker position={location} title={restaurantName}>
              <Pin background="#e11d48" glyphColor="#fff" borderColor="#881337" />
            </AdvancedMarker>
          )}
        </Map>
      </APIProvider>
    </div>
  );
}

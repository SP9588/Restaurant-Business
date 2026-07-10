import React, { useEffect } from 'react';
import usePlacesAutocomplete, {
  getGeocode,
  getLatLng,
} from 'use-places-autocomplete';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from './ui/dropdown-menu';
import { Input } from './ui/input';
import { MapPin, Loader2 } from 'lucide-react';

interface AddressAutocompleteProps {
  onAddressSelect: (address: string, lat?: number, lng?: number) => void;
  defaultValue?: string;
  placeholder?: string;
  className?: string;
}

export default function AddressAutocomplete({
  onAddressSelect,
  defaultValue = '',
  placeholder = 'Enter delivery address...',
  className = '',
}: AddressAutocompleteProps) {
  const {
    ready,
    value,
    suggestions: { status, data },
    setValue,
    clearSuggestions,
  } = usePlacesAutocomplete({
    requestOptions: {
      /* Define search scope here */
    },
    debounce: 300,
    defaultValue,
  });

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
  };

  const handleSelect = async (prediction: google.maps.places.AutocompletePrediction) => {
    const address = prediction.description;
    setValue(address, false);
    clearSuggestions();

    try {
      const results = await getGeocode({ address: address });
      const { lat, lng } = await getLatLng(results[0]);
      onAddressSelect(address, lat, lng);
    } catch (error) {
      console.error('Error selecting address:', error);
      onAddressSelect(address);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <div className="relative group">
        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-blue-600 transition-colors" />
        <Input
          value={value}
          onChange={handleInput}
          disabled={!ready}
          placeholder={placeholder}
          className="pl-12 h-14 rounded-2xl border-slate-200 focus-visible:ring-blue-600"
        />
        {!ready && (
          <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 animate-spin" />
        )}
      </div>

      {status === 'OK' && (
        <div className="absolute z-50 w-full mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-top-2">
          {data.map((suggestion) => (
            <button
              key={suggestion.place_id}
              onClick={() => handleSelect(suggestion)}
              className="w-full text-left px-5 py-4 hover:bg-slate-50 transition-colors flex items-start gap-3 border-b border-slate-50 last:border-none"
            >
              <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-1" />
              <div>
                <p className="font-bold text-slate-900 text-sm">
                  {suggestion.structured_formatting.main_text}
                </p>
                <p className="text-xs text-slate-500">
                  {suggestion.structured_formatting.secondary_text}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

import axios from "axios";

export async function geocodeAddress(address: string, apiKey: string) {

  const url =
    `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;

  const res = await axios.get(url);

  if (!res.data.results.length) {
    throw new Error("Address not found");
  }

  if (res.data.status !== "OK") {
    throw new Error(`Geocoding API error: ${res.data.status}`);
  }

  if (!res.data.results[0].geometry || !res.data.results[0].geometry.location) {
    throw new Error("invalid response from Geocoding API: missing geometry or location");
  }


  const location = res.data.results[0].geometry.location;

  return {
    lat: location.lat,
    lng: location.lng,
  };
}
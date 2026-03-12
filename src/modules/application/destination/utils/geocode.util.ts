import axios from "axios";

export async function geocodeAddress(address: string, apiKey: string) {

  const url =
    `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;

  const res = await axios.get(url);

  if (!res.data.results.length) {
    throw new Error("Address not found");
  }

  const location = res.data.results[0].geometry.location;

  return {
    lat: location.lat,
    lng: location.lng,
  };
}
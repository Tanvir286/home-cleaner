import axios from 'axios';

type LatLng = {
  lat: number;
  lng: number;
};

export async function getDrivingDistance(
  origin: LatLng,
  destination: LatLng,
  apiKey: string,
) {

  const url =
    `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin.lat},${origin.lng}&destinations=${destination.lat},${destination.lng}&mode=driving&key=${apiKey}`;

  const res = await axios.get(url);

  const row = res.data?.rows?.[0];
  const element = row?.elements?.[0];

  if (!element || element.status !== 'OK') {
    const status = element?.status ?? 'UNKNOWN_ERROR';
    throw new Error(`Unable to calculate distance: ${status}`);
  }

  if (!element.distance || !element.duration) {
    throw new Error('Distance or duration data is missing from Google response');
  }

  return {
    distance_text: element.distance.text,
    distance_km: element.distance.value / 1000,
    duration_text: element.duration.text,
    duration_seconds: element.duration.value,
  };
}
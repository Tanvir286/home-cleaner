import axios from "axios";

export async function getDrivingDistance(origin, destination, apiKey: string) {

  const url =
    `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin.lat},${origin.lng}&destinations=${destination.lat},${destination.lng}&mode=driving&key=${apiKey}`;

  const res = await axios.get(url);

  const element = res.data.rows[0].elements[0];

  return {
    distance_text: element.distance.text,
    distance_km: element.distance.value / 1000,
    duration_text: element.duration.text,
    duration_seconds: element.duration.value,
  };
}
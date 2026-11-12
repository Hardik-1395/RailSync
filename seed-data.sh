#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_BASE_URL="${API_BASE_URL:-http://localhost:4000}"
SEED_ADMIN_EMAIL="${SEED_ADMIN_EMAIL:-local.admin@example.test}"
SEED_ADMIN_PASSWORD="${SEED_ADMIN_PASSWORD:-LocalDevOnly123!}"

if [[ "${NODE_ENV:-development}" == "production" ]]; then
  echo "Refusing to seed demo data when NODE_ENV=production." >&2
  exit 1
fi

ROOT_DIR="$ROOT_DIR" \
API_BASE_URL="$API_BASE_URL" \
SEED_ADMIN_EMAIL="$SEED_ADMIN_EMAIL" \
SEED_ADMIN_PASSWORD="$SEED_ADMIN_PASSWORD" \
node <<'NODE'
const path = require('path');
const { createRequire } = require('module');

const root = process.env.ROOT_DIR;
const userRequire = createRequire(path.join(root, 'user-service/package.json'));
userRequire('dotenv').config({ path: path.join(root, 'user-service/.env') });
const bcrypt = userRequire('bcrypt');
const prisma = require(path.join(root, 'user-service/src/config/prisma'));

const apiBase = process.env.API_BASE_URL.replace(/\/$/, '');
const email = process.env.SEED_ADMIN_EMAIL;
const password = process.env.SEED_ADMIN_PASSWORD;
const demoStations = [
  { name: 'New Delhi', code: 'NDLS', city: 'Delhi', state: 'Delhi' },
  { name: 'Mumbai Central', code: 'MMCT', city: 'Mumbai', state: 'Maharashtra' },
  { name: 'Howrah Junction', code: 'HWH', city: 'Kolkata', state: 'West Bengal' },
  { name: 'Chennai Central', code: 'MAS', city: 'Chennai', state: 'Tamil Nadu' },
  { name: 'KSR Bengaluru', code: 'SBC', city: 'Bengaluru', state: 'Karnataka' },
  { name: 'Patna Junction', code: 'PNBE', city: 'Patna', state: 'Bihar' },
  { name: 'Jaipur Junction', code: 'JP', city: 'Jaipur', state: 'Rajasthan' },
  { name: 'Lucknow Charbagh', code: 'LKO', city: 'Lucknow', state: 'Uttar Pradesh' },
  { name: 'Ahmedabad Junction', code: 'ADI', city: 'Ahmedabad', state: 'Gujarat' },
  { name: 'Kanpur Central', code: 'CNB', city: 'Kanpur', state: 'Uttar Pradesh' },
];

const demoTrains = [
  { trainNumber: '12301', trainName: 'Howrah Rajdhani Express', coachName: '3A', route: ['NDLS', 'PNBE', 'HWH'] },
  { trainNumber: '12002', trainName: 'Jaipur Shatabdi Express', coachName: 'CC', route: ['NDLS', 'JP'] },
  { trainNumber: '12213', trainName: 'Chennai Duronto Express', coachName: '3A', route: ['MAS', 'SBC'] },
  { trainNumber: '22439', trainName: 'Lucknow Vande Bharat Express', coachName: 'CC', route: ['LKO', 'CNB', 'NDLS'] },
  { trainNumber: '12951', trainName: 'Mumbai Rajdhani Express', coachName: '3A', route: ['MMCT', 'ADI', 'JP', 'NDLS'] },
];

const seatTypes = ['LOWER', 'MIDDLE', 'UPPER', 'SIDE_LOWER', 'SIDE_UPPER'];

async function parseResponse(response) {
  const raw = await response.text();
  let data;
  try { data = raw ? JSON.parse(raw) : {}; }
  catch { data = { message: raw }; }
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${data.message || JSON.stringify(data)}`);
  }
  return data;
}

async function apiRequest(route, { method = 'GET', body, token } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${apiBase}${route}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { response, data: await parseResponse(response) };
}

async function ensureSeedUser() {
  const hashedPassword = await bcrypt.hash(password, 12);
  await prisma.user.upsert({
    where: { email },
    update: { firstName: 'Local', lastName: 'Admin', password: hashedPassword, emailVerified: true },
    create: { firstName: 'Local', lastName: 'Admin', email, password: hashedPassword, emailVerified: true },
  });
  console.log(`Local seed account ready: ${email}`);
}

async function login() {
  const { response, data } = await apiRequest('/api/users/auth/login', {
    method: 'POST',
    body: { email, password },
  });
  const cookies = typeof response.headers.getSetCookie === 'function'
    ? response.headers.getSetCookie()
    : [response.headers.get('set-cookie') || ''];
  const accessCookie = cookies.find((cookie) => /^accessToken=/.test(cookie || ''));
  const match = accessCookie && accessCookie.match(/^accessToken=([^;]+)/);
  const token = match && decodeURIComponent(match[1]);
  if (!token) throw new Error('Login succeeded but the API gateway did not return an accessToken cookie.');
  console.log(`Logged in as ${data.loggedInUser?.email || email}.`);
  return token;
}

async function getArray(route, token) {
  const { data } = await apiRequest(route, { token });
  if (!Array.isArray(data.data)) throw new Error(`Expected an array from ${route}.`);
  return data.data;
}

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to seed demo data when user-service/.env sets NODE_ENV=production.');
  }
  if (!email || !password || password.length < 8) {
    throw new Error('Set SEED_ADMIN_EMAIL and a SEED_ADMIN_PASSWORD of at least 8 characters.');
  }

  await ensureSeedUser();
  const token = await login();

  const stationRoute = '/api/admins/stations/station?page=1&limit=100';
  const existingStations = await getArray(stationRoute, token);
  const stationsByCode = new Map(existingStations.map((station) => [station.code, station]));
  for (const station of demoStations) {
    if (stationsByCode.has(station.code)) continue;
    const { data } = await apiRequest('/api/admins/stations/station', { method: 'POST', body: station, token });
    stationsByCode.set(data.data.code, data.data);
    console.log(`Created station ${station.code}.`);
  }

  const trainRoute = '/api/admins/trains/train';
  const existingTrains = await getArray(trainRoute, token);
  const trainsByNumber = new Map(existingTrains.map((train) => [train.trainNumber, train]));
  for (const demoTrain of demoTrains) {
    if (trainsByNumber.has(demoTrain.trainNumber)) continue;
    const seats = seatTypes.map((seatType, index) => ({
      seatNumber: index + 1,
      seatType,
      price: 500 - index * 25,
    }));
    const { data } = await apiRequest(trainRoute, {
      method: 'POST',
      body: {
        trainNumber: demoTrain.trainNumber,
        trainName: demoTrain.trainName,
        coachName: demoTrain.coachName,
        seats,
      },
      token,
    });
    trainsByNumber.set(data.data.trainNumber, data.data);
    console.log(`Created train ${demoTrain.trainNumber}.`);
  }

  // Re-read so existing trains include their route relation and seat metadata.
  const refreshedTrains = await getArray(trainRoute, token);
  for (const demoTrain of demoTrains) {
    const train = refreshedTrains.find((item) => item.trainNumber === demoTrain.trainNumber);
    if (!train) throw new Error(`Could not find train ${demoTrain.trainNumber} after creation.`);
    trainsByNumber.set(train.trainNumber, train);
    if (train.route) continue;
    const stations = demoTrain.route.map((code, index) => {
      const station = stationsByCode.get(code);
      if (!station) throw new Error(`Missing station ${code} for train ${demoTrain.trainNumber}.`);
      return {
        stationId: station.id,
        sequenceNumber: index + 1,
        arrivalTime: index === 0 ? null : `${String(5 + index).padStart(2, '0')}:00`,
        departureTime: index === demoTrain.route.length - 1 ? null : `${String(5 + index).padStart(2, '0')}:10`,
        distanceFromOrigin: index * 250,
      };
    });
    await apiRequest('/api/admins/trains/route', {
      method: 'POST',
      body: { trainId: train.id, stations },
      token,
    });
    console.log(`Created route for train ${demoTrain.trainNumber}.`);
  }

  const schedules = await getArray('/api/admins/schedules/schedule', token);
  const tomorrow = new Date();
  tomorrow.setUTCHours(0, 0, 0, 0);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const dates = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(tomorrow);
    date.setUTCDate(date.getUTCDate() + index);
    return date.toISOString().slice(0, 10);
  });

  for (const demoTrain of demoTrains) {
    const train = trainsByNumber.get(demoTrain.trainNumber);
    for (const date of dates) {
      const exists = schedules.some((schedule) => {
        const existingDate = new Date(schedule.departureDate).toISOString().slice(0, 10);
        return schedule.trainId === train.id && existingDate === date;
      });
      if (exists) continue;
      await apiRequest('/api/admins/schedules/schedule', {
        method: 'POST',
        body: { trainId: train.id, departureDate: date },
        token,
      });
      schedules.push({ trainId: train.id, departureDate: date });
    }
  }
  console.log(`Schedules ready for ${dates[0]} through ${dates.at(-1)}.`);

  let indexedStations = 0;
  let indexedTrains = 0;
  for (let attempt = 0; attempt < 30; attempt++) {
    const [stationResponse, trainResponse] = await Promise.all([
      fetch('http://localhost:4002/debug/stations'),
      fetch('http://localhost:4002/debug/trains'),
    ]);
    if (stationResponse.ok && trainResponse.ok) {
      const [stationData, trainData] = await Promise.all([stationResponse.json(), trainResponse.json()]);
      indexedStations = stationData.count;
      indexedTrains = trainData.count;
      if (indexedStations >= demoStations.length && indexedTrains >= demoTrains.length) break;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  if (indexedStations < demoStations.length || indexedTrains < demoTrains.length) {
    throw new Error(`Kafka indexing is still pending: Elasticsearch has ${indexedStations} stations and ${indexedTrains} trains. Check search-service logs.`);
  }

  const search = await apiRequest(`/api/search/trains?from=NDLS&to=PNBE&date=${dates[0]}`);
  const searchCount = search.data.data?.count || 0;
  if (searchCount < 1) throw new Error(`Seed data indexed, but the sample search returned ${searchCount} trains.`);

  console.log(`Elasticsearch ready: ${indexedStations} stations, ${indexedTrains} trains.`);
  console.log(`Sample search NDLS → PNBE on ${dates[0]} returned ${searchCount} train(s).`);
  console.log(`Seed login: ${email} / ${password}`);
  console.log('Development seed complete. Change this password before sharing the local environment.');
}

main()
  .catch((error) => {
    console.error(`Seed failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
NODE

// Handgebaute Auszüge mit der Struktur der amtlichen Dateien (Stand 2026-10-09).
const sq = (lon, lat, d = 0.01) => [[
  [lon, lat], [lon + d, lat], [lon + d, lat + d], [lon, lat + d], [lon, lat],
]];
const vol = (coords, extra = {}) => ({
  uomDimensions: 'M', lowerLimit: 0, lowerVerticalReference: 'AGL',
  upperLimit: 120, upperVerticalReference: 'AGL',
  horizontalProjection: { type: 'Polygon', coordinates: coords }, ...extra,
});

// Luxemburg: { title, description, features[] }, in der echten Datei mit UTF-8-BOM.
export const LU_RAW = '﻿' + JSON.stringify({
  title: 'UAS Geographical Zones', description: 'x',
  features: [
    { identifier: 'SPECI16', country: 'LUX', name: 'EL-UAS-S16', type: 'COMMON',
      restriction: 'REQ_AUTHORISATION', reason: ['SENSITIVE'],
      applicability: [{ startDateTime: '2023-01-01T01:00:00+01:00', endDateTime: '2031-01-01T00:59:59+01:00', permanent: 'NO' }],
      zoneAuthority: [{ name: 'Armée Luxembourgeoise', email: 'opscell@armee.etat.lu', phone: '', purpose: 'AUTHORIZATION' }],
      geometry: [vol(sq(6.15976471234, 49.87168871234))],
      message: 'Please consult https://g-o.lu/uas' },
    { identifier: 'P1', country: 'LUX', name: 'EL-UAS-P1', type: 'COMMON',
      restriction: 'PROHIBITED', reason: ['AIR_TRAFFIC'], zoneAuthority: [],
      geometry: [vol(sq(6.2, 49.62))], message: 'Prohibited' },
    { identifier: 'NOGEO', country: 'LUX', name: 'no-geometry', restriction: 'PROHIBITED', geometry: [] },
  ],
});

// Norwegen: reines Array; befristete NOTAM-Zonen tragen applicability.permanent === 'NO'.
export const NO_RAW = JSON.stringify([
  { type: 'COMMON', identifier: '666927C', country: 'NOR', name: 'Sandane lufthamn, Anda',
    restriction: 'REQ_AUTHORISATION', reason: ['AIR_TRAFFIC'],
    message: '5 km-sone rundt lufthavn.',
    zoneAuthority: [{ name: 'Avinor AS', purpose: 'AUTHORIZATION', siteURL: 'https://avinor.no/drone' }],
    geometry: [vol(sq(6.1, 61.83, 0.09), { upperLimit: 300 })] },
  { type: 'COMMON', identifier: 'ENR413', country: 'NOR', name: 'ENR413 Storbukt 1',
    restriction: 'REQ_AUTHORISATION', reason: ['OTHER'], message: 'NOTAM',
    zoneAuthority: [], geometry: [vol(sq(25.0, 70.9, 0.2))],
    applicability: [{ permanent: 'NO', startDateTime: '2026-10-07T15:00:00.00Z', endDateTime: '2026-10-11T18:00:00.00Z' }] },
  { type: 'COMMON', identifier: 'NAT1', country: 'NOR', name: 'Hardangervidda',
    restriction: 'CONDITIONAL', reason: ['NATURE'], message: 'Verneområde', zoneAuthority: [],
    // L-förmiges Polygon: Bounding-Box 7.0..8.0 / 60.0..61.0, die Ecke oben rechts ist leer.
    geometry: [vol([[[7.0, 60.0], [8.0, 60.0], [8.0, 60.2], [7.2, 60.2], [7.2, 61.0], [7.0, 61.0], [7.0, 60.0]]])] },
]);

// Estland: GeoJSON-FeatureCollection, ED-269-Felder in properties, geometry dort ein OBJEKT.
const eeFeat = (props) => ({
  type: 'Feature',
  geometry: props.geometry.horizontalProjection,
  properties: props,
});
export const EE_RAW = JSON.stringify({
  type: 'FeatureCollection',
  features: [
    eeFeat({ identifier: 'EEGZ24S', country: 'EST', name: 'EEGZ24', type: 'COMMON',
      restriction: 'REQ_AUTHORISATION', restrictionConditions: '', reason: 'Air traffic',
      message: 'Operations higher than 50 metres require authorisation.',
      extendedProperties: { localizedMessages: [
        { language: 'en-GB', message: 'Operations higher than 50 metres require authorisation.' },
        { language: 'et-EE', message: 'Lennud kõrgemal kui 50 meetrit vajavad luba.' }] },
      geometry: vol(sq(24.70288843994658, 59.4017744157903), { lowerLimit: 51 }),
      zoneAuthority: [{ name: 'EANS', siteURL: 'https://transpordiamet.ee/en/flying', purpose: 'AUTHORIZATION' }],
      metaData: {}, airspacetype: 'x', airspaceclass: 'G', lower: '51 m', lowerMeters: 51,
      upper: '120 m', upperMeters: 120, hidden: false, strokeColor: '#f00', fillColor: '#f00' }),
    eeFeat({ identifier: 'FREE1', country: 'EST', name: 'EEGZ-FREE', type: 'COMMON',
      restriction: 'NO_RESTRICTION', reason: 'Other', message: 'No restriction',
      extendedProperties: {}, geometry: vol(sq(26.0, 58.5)), zoneAuthority: [], hidden: false }),
    eeFeat({ identifier: 'HID1', country: 'EST', name: 'hidden-zone', type: 'COMMON',
      restriction: 'PROHIBITED', reason: 'Other', message: 'x',
      extendedProperties: {}, geometry: vol(sq(27.0, 58.0)), zoneAuthority: [], hidden: true }),
  ],
});

// dronesoner.no/data/forbud_notam.geojson
export const NOTAM_RAW = JSON.stringify({
  type: 'FeatureCollection',
  features: [
    { type: 'Feature',
      properties: { id: 'ENR412', navn: 'ENR412 Kobbholmen', name: 'Kobbholmen',
        upper_limit: '5000FT AMSL', lower_limit: 'GND', remarks: 'AMC Manageable.' },
      geometry: { type: 'Polygon', coordinates: sq(30.0, 69.7, 0.2) } },
    { type: 'Feature',
      properties: { id: 'ENR413', navn: 'ENR413 Storbukt 1', name: 'Storbukt 1',
        upper_limit: '5000FT AMSL', lower_limit: 'GND', remarks: 'Two parts.' },
      geometry: { type: 'MultiPolygon', coordinates: [sq(25.0, 70.9, 0.1), sq(25.5, 70.9, 0.1)] } },
  ],
});

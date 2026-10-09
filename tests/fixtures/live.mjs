// Auszüge der Live-Dienste für die NOTAM-Proxys (Stand 2026-10-09, Koordinaten gekürzt).
// SE_NOTAM_RAW: dynais:NOTAM — zwei Zonen ab Boden (R-Code und W-Code), eine R-Zone mit LOWER 70 (entfällt),
//   ein Feature ohne Geometrie. Die amtliche Filterung (R/W, ohne TT) macht der Dienst per CQL_FILTER.
// SE_SUP_RAW: DAIM_TOPO:SUP — gültig (MultiPolygon mit zwei Teilen), abgelaufen, noch nicht gültig, Flugfläche.
// BE_LIVE_RAW: Droneguide — NOTAM (762 m), Kreis-Zone ab Boden mit mehrsprachigem Namen, Zone ab 142 m (entfällt).

const tri = (x, y) => [[[x, y], [x + 0.1, y], [x + 0.1, y + 0.1], [x, y]]];

const notam = (over, geometry) => ({
  type: 'Feature', id: `NOTAM.${over.NO}`,
  geometry: geometry === undefined ? { type: 'Polygon', coordinates: tri(17.0, 59.7) } : geometry,
  properties: { NOF: 'ESSA', SERIES: 'A', NO: 1000, YEAR: 26, TYPE: 'N', CODE23: 'RT', CODE45: 'CA', FIR: 'ESAA',
    LOWER: 0, UPPER: 35, STARTVALIDITY: '2026-10-15T09:00:00Z', ENDVALIDITY: '2026-10-18T12:00:00Z',
    ITEM_E: 'TEMPORARY RESTRICTED AREA ESR532 MELLBERG ESTABLISHED FOR MILITARY AVIATION OPERATIONS.',
    ITEM_F: 'SFC', ITEM_G: '3500FT AMSL', ...over },
});

export const SE_NOTAM_RAW = JSON.stringify({ type: 'FeatureCollection', features: [
  notam({ NO: 1079, SERIES: 'A', CODE23: 'RT', ITEM_F: 'GND', ITEM_G: '2000FT AMSL' }),
  notam({ NO: 1070, SERIES: 'A', CODE23: 'WO', CODE45: 'LW', UPPER: 30, ITEM_E: 'LASER EMISSION WILL TAKE PLACE OVER SALA.',
    ITEM_F: 'GND', ITEM_G: '2948FT AMSL' }, { type: 'Polygon', coordinates: tri(16.6, 59.8) }),
  notam({ NO: 1200, SERIES: 'B', CODE23: 'RD', LOWER: 2, ITEM_F: '260FT AGL', ITEM_G: '800FT AMSL' }),
  notam({ NO: 1300, SERIES: 'B', CODE23: 'RT' }, null),
] });

const sup = (over, geometry) => ({
  type: 'Feature', id: `SUP.${over.ID}`,
  geometry: geometry || { type: 'MultiPolygon', coordinates: [tri(16.5, 57.7)] },
  properties: { NAME: 'HJORTEN', ID: 'ESR833_1', DESIG: 'ESR833', LOWER: 'GND', UPPER: '2100',
    FROM: '2025-11-10T06:00Z', TO: '2027-08-31T21:00Z',
    SCHEDULE: '10 NOV 2025 – 31 AUG 2027 MON – FRI 0600 – 2100 (0500 – 2000)',
    COM_SE: 'Tillfälliga restriktionsområdena upprättade för flygverksamhet med UAS.',
    COM_EN: 'Temporary restricted areas established for aviation operations with UAS with special permission.',
    URL: 'https://aro.lfv.se/content/eaip/eSUP/ES-SUP-en-GB.html#SUP', LOW_UOM: '', UP_UOM: 'ft AMSL', ...over },
});

export const SE_SUP_RAW = JSON.stringify({ type: 'FeatureCollection', features: [
  sup({ ID: 'ESR833_1' }, { type: 'MultiPolygon', coordinates: [tri(16.5, 57.7), tri(16.8, 57.9)] }),
  sup({ ID: 'ESR900_1', NAME: 'OLD', DESIG: 'ESR900', FROM: '2025-01-01T00:00Z', TO: '2025-12-31T23:59Z' }),
  sup({ ID: 'ESR901_1', NAME: 'LATER', DESIG: 'ESR901', FROM: '2027-01-01T00:00Z', TO: '2027-12-31T23:59Z' }),
  sup({ ID: 'ESR902_1', NAME: 'HIGH', DESIG: 'ESR902', LOWER: 'FL520', UPPER: 'FL660', UP_UOM: '', COM_EN: '', URL: '' }),
] });

const be = (over, geometry) => ({
  type: 'Feature', id: `geo_zone_fast.${over.unique_identifier}`,
  geometry: geometry || { type: 'Polygon', coordinates: tri(2.33, 51.1) },
  properties: { unique_identifier: 'x', external_reference: null, name: 'x', code: 'x', description: null,
    lower_limit_altitude_meter_agl: 0, upper_limit_altitude_meter_agl: 100, type_code: 'NOTAM',
    restriction: 'PROHIBITED', original_geometry: null, ...over },
});

export const BE_LIVE_RAW = JSON.stringify({ type: 'FeatureCollection', features: [
  be({ unique_identifier: '1a146ca7', name: 'F1207/26', code: 'F1207/26',
    description: "TEMPO SEGREGATED AREA (TSA) OVER NORTH SEA 'AREA 6 HIGH' FOR UAS BEYOND VISUAL LINE OF SIGHT. REF AIP SUP 011/2026",
    lower_limit_altitude_meter_agl: 0, upper_limit_altitude_meter_agl: 120, restriction: 'PROHIBITED' }),
  be({ unique_identifier: 'ca4ef46b', type_code: 'TEMPORARY-NO-FLY-ZONE', code: 'G25-195',
    name: '{"de":"Polizei","en":"Police activities","fr":"Activités de police","nl":"Politie"}',
    description: '{"de":"Keine Flüge","en":"No flights","fr":"Vols interdits","nl":"Geen vluchten"}',
    lower_limit_altitude_meter_agl: null, upper_limit_altitude_meter_agl: 121.92, restriction: 'CONDITIONAL' },
  { type: 'Polygon', coordinates: tri(4.4, 51.2) }),
  be({ unique_identifier: 'high1', name: 'F2000/26', code: 'F2000/26', description: 'High area',
    lower_limit_altitude_meter_agl: 142.9, upper_limit_altitude_meter_agl: 424.8, restriction: 'REQ_AUTHORISATION' }),
  be({ unique_identifier: 'nofin', name: 'Only fr', code: 'F3000/26', description: null,
    lower_limit_altitude_meter_agl: 120, upper_limit_altitude_meter_agl: null, restriction: 'REQ_AUTHORISATION' },
  { type: 'MultiPolygon', coordinates: [tri(5.0, 50.5), tri(5.3, 50.6)] }),
] });

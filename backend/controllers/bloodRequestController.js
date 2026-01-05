const BloodRequest = require('../models/bloodRequestModel');

// Create a new blood request
// helper: simple https GET that returns parsed JSON with headers
const https = require('https');
function fetchJson(url, timeout = 8000, headers = {}) {
  return new Promise((resolve, reject) => {
    try {
      const options = Object.assign(new URL(url), { timeout, headers });
      const req = https.get(options, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve(parsed);
          } catch (e) {
            reject(e);
          }
        });
      });
      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy(new Error('Request timed out'));
      });
    } catch (e) {
      reject(e);
    }
  });
}

async function tryReverseGeocode(lat, lon) {
  try {
    // Build Nominatim reverse geocode URL. Include address details and optionally an email
    const base = 'https://nominatim.openstreetmap.org/reverse';
    const params = new URLSearchParams({ format: 'jsonv2', lat: String(lat), lon: String(lon), addressdetails: '1' });
    if (process.env.NOMINATIM_EMAIL) params.set('email', process.env.NOMINATIM_EMAIL);
    const url = `${base}?${params.toString()}`;
    // Set polite headers per Nominatim policy
    const headers = {
      'User-Agent': process.env.NOMINATIM_USER_AGENT || 'MensConnect/1.0 (+https://example.com)',
      'Accept-Language': 'en',
      'Accept': 'application/json',
    };
    console.log('tryReverseGeocode ->', { url });
    const resp = await fetchJson(url, 10000, headers);
    if (resp && (resp.display_name || (resp.address && Object.keys(resp.address).length))) {
      // prefer display_name but fall back to building one from address parts
      if (resp.display_name) return resp.display_name;
      const addr = resp.address;
      const parts = [addr.road, addr.suburb, addr.city, addr.state, addr.country].filter(Boolean);
      if (parts.length) return parts.join(', ');
    }
  } catch (e) {
    // ignore
  }
  return '';
}

async function tryIpGeo(ip) {
  try {
    // ip-api is simple and doesn't require a key; results are limited but OK for fallback
    const cleaned = ip && ip.split(',')[0].trim();
    const url = `http://ip-api.com/json/${cleaned}?fields=status,message,lat,lon,city,regionName,country`;
    // ip-api uses http; use http(s) via https module is not possible — use http
    return new Promise((resolve) => {
      const http = require('http');
      const req = http.get(url, { timeout: 5000 }, (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (parsed && parsed.status === 'success') {
              const text = [parsed.city, parsed.regionName, parsed.country].filter(Boolean).join(', ');
              resolve({ lat: parsed.lat, lon: parsed.lon, text });
            } else {
              resolve(null);
            }
          } catch (e) {
            resolve(null);
          }
        });
      });
      req.on('error', () => resolve(null));
      req.on('timeout', () => {
        req.destroy();
        resolve(null);
      });
    });
  } catch (e) {
    return null;
  }
}

exports.create = async (req, res) => {
  try {
    const { name, bloodGroup, hospital, contact, location, postedBy } = req.body;
    if (!name || !bloodGroup || !contact) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const payload = { name, bloodGroup, hospital, contact };
    if (postedBy) payload.postedBy = postedBy;

    // Accept coordinates from client: latitude/longitude or lat/lng
    const maybeLat = req.body.latitude ?? req.body.lat;
    const maybeLon = req.body.longitude ?? req.body.lng ?? req.body.lon;
    let resolvedText = '';
    if (maybeLat !== undefined && maybeLon !== undefined && !Number.isNaN(Number(maybeLat)) && !Number.isNaN(Number(maybeLon))) {
      const lat = Number(maybeLat);
      const lon = Number(maybeLon);
      payload.locationGeo = { type: 'Point', coordinates: [lon, lat] };
      resolvedText = await tryReverseGeocode(lat, lon);
      if (resolvedText) {
        payload.locationText = resolvedText;
        // keep legacy field too
        payload.location = resolvedText;
      } else {
        // fallback: store coordinates so admin can see a location even if reverse-geocoding failed
        const coordsStr = `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
        payload.locationText = '';
        payload.location = `Coordinates: ${coordsStr}`;
        console.log('bloodRequest.create - reverse geocode returned empty, saved coords fallback ->', coordsStr);
      }
    } else {
      // fallback: try IP-based geolocation
      const ip = req.headers['x-forwarded-for'] || req.ip || req.connection?.remoteAddress || '';
      const ipGeo = await tryIpGeo(ip);
      if (ipGeo) {
        payload.locationGeo = { type: 'Point', coordinates: [ipGeo.lon, ipGeo.lat] };
        payload.locationText = ipGeo.text;
        payload.location = ipGeo.text;
      } else if (location) {
        // if client provided a free-text location, keep it
        payload.location = location;
      }
    }

    const doc = new BloodRequest(payload);
    await doc.save();
    const out = doc.toObject ? doc.toObject() : doc;
    // prefer human-readable locationText, but expose as `location` only
    out.location = out.locationText || out.location || '';
    delete out.locationText;
    res.json({ success: true, data: out });
  } catch (err) {
    console.error('bloodRequest.create', err);
    res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

// List all blood requests
exports.listAll = async (req, res) => {
  try {
    const docs = await BloodRequest.find().sort({ createdAt: -1 });
    // sanitize docs: prefer locationText and remove duplicate field
    const out = docs.map(d => {
      const o = d.toObject ? d.toObject() : d;
      o.location = o.locationText || o.location || '';
      delete o.locationText;
      return o;
    });
    res.json({ success: true, data: out });
  } catch (err) {
    console.error('bloodRequest.listAll', err);
    res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

// Get by id
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await BloodRequest.findById(id);
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
    const out = doc.toObject ? doc.toObject() : doc;
    out.location = out.locationText || out.location || '';
    delete out.locationText;
    res.json({ success: true, data: out });
  } catch (err) {
    console.error('bloodRequest.getById', err);
    res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

// Update by id
exports.updateById = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await BloodRequest.findById(id);
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });

    const { name, bloodGroup, hospital, contact, location, active } = req.body;
    if (name !== undefined) doc.name = name;
    if (bloodGroup !== undefined) doc.bloodGroup = bloodGroup;
    if (hospital !== undefined) doc.hospital = hospital;
    if (contact !== undefined) doc.contact = contact;
    if (active !== undefined) doc.active = active;

    // allow updating coordinates: latitude/longitude or lat/lng
    const maybeLat = req.body.latitude ?? req.body.lat;
    const maybeLon = req.body.longitude ?? req.body.lng ?? req.body.lon;
    if (maybeLat !== undefined && maybeLon !== undefined && !Number.isNaN(Number(maybeLat)) && !Number.isNaN(Number(maybeLon))) {
      const lat = Number(maybeLat);
      const lon = Number(maybeLon);
      doc.locationGeo = { type: 'Point', coordinates: [lon, lat] };
      try {
        const text = await tryReverseGeocode(lat, lon);
        if (text) {
          doc.locationText = text;
          doc.location = text;
        } else {
          const coordsStr = `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
          doc.locationText = '';
          doc.location = `Coordinates: ${coordsStr}`;
          console.log('bloodRequest.updateById - reverse geocode empty, saved coords fallback ->', coordsStr);
        }
      } catch (e) {
        // ignore
      }
    } else if (location !== undefined) {
      // legacy free-text location
      doc.location = location;
    }

    await doc.save();
    const out = doc.toObject ? doc.toObject() : doc;
    out.location = out.locationText || out.location || '';
    delete out.locationText;
    res.json({ success: true, data: out });
  } catch (err) {
    console.error('bloodRequest.updateById', err);
    res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

// Delete by id
exports.deleteById = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await BloodRequest.findById(id);
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });

    await BloodRequest.deleteOne({ _id: id });
    res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    console.error('bloodRequest.deleteById', err);
    res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

// Mark request as sent to admin (sets flag and timestamp)
exports.sendToAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminNote } = req.body;
    const doc = await BloodRequest.findById(id);
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });

    doc.sentToAdmin = true;
    doc.sentToAdminAt = new Date();
    if (adminNote) doc.adminNote = adminNote; // will be ignored unless schema allows it
    await doc.save();
    // Placeholder: integrate notification/email to admin here
    console.log(`Blood request ${id} sent to admin`);
    const out = doc.toObject ? doc.toObject() : doc;
    out.location = out.locationText || out.location || '';
    delete out.locationText;
    res.json({ success: true, data: out });
  } catch (err) {
    console.error('bloodRequest.sendToAdmin', err);
    res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

// Reverse-geocode coordinates for a given blood request id and update the doc
exports.reverseGeocodeById = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await BloodRequest.findById(id);
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });

    // Prefer explicit geo field
    const coords = doc.locationGeo && Array.isArray(doc.locationGeo.coordinates) ? doc.locationGeo.coordinates : null;
    if (!coords || coords.length < 2) {
      // Try to parse legacy 'Coordinates: lat, lon' string
      if (doc.location && String(doc.location).toLowerCase().startsWith('coordinates:')) {
        const parts = String(doc.location).split(':')[1] || '';
        const nums = parts.split(',').map(s => parseFloat(s.trim())).filter(n => !Number.isNaN(n));
        if (nums.length === 2) {
          const lat = nums[0];
          const lon = nums[1];
          const text = await tryReverseGeocode(lat, lon);
          if (text) {
            doc.locationText = text;
            doc.location = text;
            // ensure locationGeo stored correctly (lon, lat)
            doc.locationGeo = { type: 'Point', coordinates: [lon, lat] };
            await doc.save();
            const out = doc.toObject ? doc.toObject() : doc;
            out.location = out.locationText || out.location || '';
            delete out.locationText;
            return res.json({ success: true, data: out });
          }
        }
      }
      return res.status(400).json({ success: false, message: 'No coordinates available' });
    }

    // coordinates stored as [lon, lat]
    const lon = Number(coords[0]);
    const lat = Number(coords[1]);
    if (Number.isNaN(lat) || Number.isNaN(lon)) return res.status(400).json({ success: false, message: 'Invalid coordinates' });

    const text = await tryReverseGeocode(lat, lon);
    if (!text) return res.status(502).json({ success: false, message: 'Reverse geocoding failed' });

    doc.locationText = text;
    doc.location = text;
    await doc.save();
    const out = doc.toObject ? doc.toObject() : doc;
    out.location = out.locationText || out.location || '';
    delete out.locationText;
    res.json({ success: true, data: out });
  } catch (err) {
    console.error('bloodRequest.reverseGeocodeById', err);
    res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

const fs = require('fs');
const topojson = require('topojson-client');

function normalizeRegion(str) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const topoData = JSON.parse(fs.readFileSync('./public/data/vietnam-topo.json'));
const provincesData = JSON.parse(fs.readFileSync('./src/data/vietnam-provinces-2025.json'));

const topoGeoms = topoData.objects['default'].geometries;

const features = provincesData.provinces.map(customProv => {
  // Find all topo geometries that match this custom province
  const matchingGeoms = topoGeoms.filter(g => {
    let topoName = g.properties.name || g.properties['woe-name'] || g.properties['alt-name'];
    if (!topoName) return false;
    
    if (topoName === 'Southeast') topoName = 'Đồng Nai';
    if (topoName === 'Hồ Chí Minh city') topoName = 'TP. Hồ Chí Minh';
    if (topoName === 'Haiphong') topoName = 'Hải Phòng';
    
    const norm = normalizeRegion(topoName);
    return customProv.merged.some(m => {
      const nm = normalizeRegion(m);
      return nm === norm || nm.includes(norm) || norm.includes(nm);
    });
  });

  if (matchingGeoms.length === 0) {
    console.warn('No matching geometries for:', customProv.name);
  }

  // Merge them into a single GeoJSON geometry (Polygon or MultiPolygon)
  // topojson.merge takes (topology, objects)
  const mergedGeom = topojson.merge(topoData, matchingGeoms);

  // Calculate average longitude and latitude for the label
  let sumLon = 0, sumLat = 0, count = 0;
  matchingGeoms.forEach(g => {
    if (g.properties['hc-middle-lon'] && g.properties['hc-middle-lat']) {
      sumLon += g.properties['hc-middle-lon'];
      sumLat += g.properties['hc-middle-lat'];
      count++;
    }
  });

  const centerLon = count > 0 ? sumLon / count : 106;
  const centerLat = count > 0 ? sumLat / count : 16;

  return {
    type: "Feature",
    properties: {
      id: customProv.id,
      name: customProv.name,
      centerLon,
      centerLat
    },
    geometry: mergedGeom
  };
});

const geojson = {
  type: "FeatureCollection",
  features
};

fs.writeFileSync('./public/data/vietnam-merged.geojson', JSON.stringify(geojson));
console.log('Merged GeoJSON saved to vietnam-merged.geojson with', features.length, 'features.');

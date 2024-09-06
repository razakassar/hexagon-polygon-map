import React, { useState } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { geoToH3, h3ToGeoBoundary } from 'h3-js/legacy';
import { Button, Form, Offcanvas, ToggleButtonGroup, ToggleButton } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import { saveAs } from 'file-saver';
import Papa from 'papaparse';

const App = () => {
  const [zoomLevel] = useState(11);
  const [resolution, setResolution] = useState(6);
  const [boundary, setBoundary] = useState({
    north: 40.9176,
    south: 40.4774,
    west: -74.2591,
    east: -73.7004
  });
  const [hexagons, setHexagons] = useState([]);
  const [showDrawer, setShowDrawer] = useState(false);
  const [showIndexes, setShowIndexes] = useState(false); // State to control visibility of indexes

  const handleBoundaryChange = (e) => {
    setBoundary({
      ...boundary,
      [e.target.name]: parseFloat(e.target.value)
    });
  };

  const handleResolutionChange = (e) => {
    setResolution(parseInt(e.target.value));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newHexagons = generateHexagons(boundary, resolution);
    setHexagons(newHexagons);
    setShowDrawer(false);
  };

  const generateHexagons = (bbox, resolution) => {
    const hexagons = [];
    const latStep = 0.01;
    const lngStep = 0.01;

    for (let lat = bbox.south; lat <= bbox.north; lat += latStep) {
      for (let lng = bbox.west; lng <= bbox.east; lng += lngStep) {
        const h3Index = geoToH3(lat, lng, resolution);
        if (!hexagons.includes(h3Index)) {
          hexagons.push(h3Index);
        }
      }
    }
    return hexagons;
  };

  const getColor = (h3Index) => 'blue';

  const hexagonPolygons = hexagons.map((h3Index, i) => {
    const boundary = h3ToGeoBoundary(h3Index);
    const center = [boundary.reduce((sum, [lat]) => sum + lat, 0) / boundary.length,
                    boundary.reduce((sum, [, lng]) => sum + lng, 0) / boundary.length];
    return {
      id: i+1,
      h3Index,
      polygon: boundary.map(([lat, lng]) => [lat, lng]),
      color: getColor(h3Index),
      center
    };
  });

  const exportCSV = () => {
    const csvData = hexagonPolygons.map(({ id, h3Index, polygon }) => ({
      polygonId: id,
      h3Index,
      polygon: polygon.map(([lat, lng]) => `[${lat}, ${lng}]`).join('; ')
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'hexagons.csv');
  };

  return (
    <div>
      <Button variant="primary" onClick={() => setShowDrawer(true)}>
        Open Settings
      </Button>
      <Button variant="secondary" onClick={exportCSV} style={{ marginLeft: '10px' }}>
        Export CSV
      </Button>

      <Offcanvas show={showDrawer} onHide={() => setShowDrawer(false)} placement="start">
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>Map Settings</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          <Form onSubmit={handleSubmit}>
            <Form.Group>
              <Form.Label>North</Form.Label>
              <Form.Control type="number" name="north" value={boundary.north} onChange={handleBoundaryChange} step="0.0001" />
            </Form.Group>
            <Form.Group>
              <Form.Label>South</Form.Label>
              <Form.Control type="number" name="south" value={boundary.south} onChange={handleBoundaryChange} step="0.0001" />
            </Form.Group>
            <Form.Group>
              <Form.Label>West</Form.Label>
              <Form.Control type="number" name="west" value={boundary.west} onChange={handleBoundaryChange} step="0.0001" />
            </Form.Group>
            <Form.Group>
              <Form.Label>East</Form.Label>
              <Form.Control type="number" name="east" value={boundary.east} onChange={handleBoundaryChange} step="0.0001" />
            </Form.Group>
            <Form.Group>
              <Form.Label>Resolution</Form.Label>
              <Form.Control as="select" value={resolution} onChange={handleResolutionChange}>
                {[...Array(5).keys()].map(i => <option key={i} value={i + 4}>{i + 4}</option>)}
              </Form.Control>
            </Form.Group>
            {/* Toggle for showing indexes */}
            <Form.Group>
              <Form.Check
                type="switch"
                id="toggle-indexes"
                label="Show Hexagon Indexes"
                checked={showIndexes}
                onChange={(e) => setShowIndexes(e.target.checked)}
              />
            </Form.Group>
            <Button variant="success" type="submit">
              Apply
            </Button>
          </Form>
        </Offcanvas.Body>
      </Offcanvas>

      <MapContainer center={[boundary.south + (boundary.north - boundary.south) / 2, boundary.west + (boundary.east - boundary.west) / 2]} zoom={zoomLevel} style={{ height: '100vh', width: '100%' }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {hexagonPolygons.map(({ id, h3Index, polygon, color, center }, index) => (
          <React.Fragment key={index}>
            <Polygon positions={polygon} color={color} weight={1} />
            {showIndexes && <Marker position={center} opacity={0}>
              <Tooltip
                permanent
                direction="center"
              >
                {id}
              </Tooltip>
            </Marker>}
          </React.Fragment>
        ))}
      </MapContainer>
    </div>
  );
};

export default App;
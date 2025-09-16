import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './MapView.css';

// Fix for default markers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const MapView = ({ data, userRole, loading }) => {
  const [selectedSensor, setSelectedSensor] = useState(null);
  const [mapData, setMapData] = useState({ sensors: [], alerts: [] });

  // Default city center coordinates (New York City)
  const cityCenter = [40.7128, -74.0060];
  
  useEffect(() => {
    if (data) {
      setMapData(data);
    }
  }, [data]);

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return '#ef4444';
      case 'high': return '#f59e0b';
      case 'medium': return '#eab308';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getSensorColor = (sensorType) => {
    switch (sensorType) {
      case 'air_quality': return '#10b981';
      case 'traffic': return '#f59e0b';
      case 'energy': return '#8b5cf6';
      case 'waste': return '#ef4444';
      case 'weather': return '#3b82f6';
      default: return '#6b7280';
    }
  };

  const createCustomIcon = (color, type) => {
    return L.divIcon({
      className: 'custom-marker',
      html: `<div style="background-color: ${color}; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });
  };

  if (loading) {
    return (
      <div className="map-view loading">
        <div className="loading-spinner">Loading map...</div>
      </div>
    );
  }

  return (
    <div className="map-view">
      <div className="map-header">
        <h3>City Overview Map</h3>
        <div className="map-legend">
          <div className="legend-item">
            <span className="legend-color" style={{ backgroundColor: '#10b981' }}></span>
            Air Quality
          </div>
          <div className="legend-item">
            <span className="legend-color" style={{ backgroundColor: '#f59e0b' }}></span>
            Traffic
          </div>
          <div className="legend-item">
            <span className="legend-color" style={{ backgroundColor: '#8b5cf6' }}></span>
            Energy
          </div>
          <div className="legend-item">
            <span className="legend-color" style={{ backgroundColor: '#ef4444' }}></span>
            Waste
          </div>
        </div>
      </div>

      <MapContainer
        center={cityCenter}
        zoom={13}
        style={{ height: '400px', width: '100%' }}
        className="leaflet-container"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        {/* Render sensor markers */}
        {mapData.sensors && mapData.sensors.map((sensor, index) => (
          <Marker
            key={`sensor-${index}`}
            position={sensor.location?.coordinates || cityCenter}
            icon={createCustomIcon(getSensorColor(sensor.sensorType), sensor.sensorType)}
            eventHandlers={{
              click: () => setSelectedSensor(sensor)
            }}
          >
            <Popup>
              <div className="sensor-popup">
                <h4>{sensor.sensorType.replace('_', ' ').toUpperCase()}</h4>
                <p><strong>ID:</strong> {sensor.sensorId}</p>
                <p><strong>Status:</strong> {sensor.status}</p>
                <p><strong>Value:</strong> {sensor.data?.value} {sensor.data?.unit}</p>
                <p><strong>Last Update:</strong> {new Date(sensor.timestamp).toLocaleString()}</p>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Render alert circles */}
        {mapData.alerts && mapData.alerts.map((alert, index) => {
          if (alert.source?.location?.coordinates) {
            return (
              <Circle
                key={`alert-${index}`}
                center={alert.source.location.coordinates}
                radius={500}
                pathOptions={{
                  color: getSeverityColor(alert.severity),
                  fillColor: getSeverityColor(alert.severity),
                  fillOpacity: 0.2
                }}
              >
                <Popup>
                  <div className="alert-popup">
                    <h4>{alert.title}</h4>
                    <p><strong>Severity:</strong> {alert.severity}</p>
                    <p><strong>Category:</strong> {alert.category}</p>
                    <p>{alert.description}</p>
                  </div>
                </Popup>
              </Circle>
            );
          }
          return null;
        })}
      </MapContainer>

      {selectedSensor && (
        <div className="sensor-details">
          <h4>Selected Sensor Details</h4>
          <p><strong>Type:</strong> {selectedSensor.sensorType}</p>
          <p><strong>ID:</strong> {selectedSensor.sensorId}</p>
          <p><strong>Status:</strong> {selectedSensor.status}</p>
          <button onClick={() => setSelectedSensor(null)}>Close</button>
        </div>
      )}
    </div>
  );
};

export default MapView;
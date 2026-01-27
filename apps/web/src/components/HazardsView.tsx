import { useRef, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, ZoomControl } from 'react-leaflet'
import { Box } from '@mantine/core'
import L from 'leaflet'
import 'leaflet.markercluster'
import MarkerClusterGroup from 'react-leaflet-markercluster'
import type { Hazard } from '../types/weather'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'

delete (L.Icon.Default.prototype as L.Icon.Default & { _getIconUrl?: () => string })._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

interface HazardsViewProps {
  hazards?: Hazard[]
  selectedHazardId?: number | null
  eventTitle?: string
  onHazardSelect?: (hazardId: number) => void
}

const HazardsView = ({ hazards = [], selectedHazardId = null, eventTitle }: HazardsViewProps) => {
  const mapRef = useRef<L.Map>(null)

  const createClusterCustomIcon = (cluster: L.MarkerCluster) => {
    const count = cluster.getChildCount()
    
    return L.divIcon({
      html: `<div style="
        background-color: #00bcd4;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        font-weight: bold;
        color: white;
      ">${count}</div>`,
      className: 'custom-cluster-icon',
      iconSize: L.point(40, 40, true),
    })
  }

  const getMarkerIcon = (isSelected: boolean) => {
    const backgroundColor = isSelected ? '#00bcd4' : 'white'
    
    return L.divIcon({
      className: 'custom-marker',
      html: `<div style="
        background-color: ${backgroundColor};
        width: 36px;
        height: 36px;
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
      ">🌪️</div>`,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    })
  }

  const renderPopupContent = (hazard: Hazard) => (
    <div style={{ cursor: 'pointer', minWidth: '200px' }}>
      <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 600 }}>
        {eventTitle || 'Weather Hazard'}
      </h3>
      <p style={{ margin: '4px 0', fontSize: '12px' }}>
        <strong>Hazard:</strong> {hazard.hazard_type}
      </p>
      <p style={{ margin: '4px 0', fontSize: '12px' }}>
        <strong>Region:</strong> {hazard.region}
      </p>
      {hazard.location_name && (
        <p style={{ margin: '4px 0', fontSize: '12px' }}>
          <strong>Location:</strong> {hazard.location_name}
        </p>
      )}
      {hazard.impacts && hazard.impacts.length > 0 && (
        <div style={{ marginTop: '8px' }}>
          <p style={{ margin: '4px 0', fontSize: '12px', fontWeight: 600 }}>
            Impacts:
          </p>
          <ul style={{ margin: '4px 0', paddingLeft: '16px', fontSize: '11px' }}>
            {hazard.impacts.slice(0, 3).map((impact, idx) => (
              <li key={idx} style={{ marginBottom: '2px' }}>
                {impact.value && impact.unit 
                  ? `${impact.impact_type}: ${impact.value} ${impact.unit}`
                  : impact.description.substring(0, 60) + (impact.description.length > 60 ? '...' : '')}
              </li>
            ))}
            {hazard.impacts.length > 3 && (
              <li style={{ fontStyle: 'italic', color: '#666' }}>
                ...and {hazard.impacts.length - 3} more
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  )

  useEffect(() => {
    if (mapRef.current && selectedHazardId) {
      const selectedHazard = hazards.find(h => h.id === selectedHazardId)
      if (selectedHazard && selectedHazard.latitude && selectedHazard.longitude) {
        mapRef.current.setView([selectedHazard.latitude, selectedHazard.longitude], 13, { animate: true })
      }
    }
  }, [selectedHazardId, hazards])

  const validHazards = hazards.filter(h => h.latitude !== null && h.longitude !== null)

  return (
    <Box style={{ height: '100%', width: '100%', position: 'relative', zIndex: 0 }}>
      <MapContainer
        center={[-43.5321, 172.6362]}
        zoom={11}
        style={{ height: '100%', width: '100%' }}
        ref={mapRef}
        zoomControl={false}
        attributionControl={false}
      >
        <ZoomControl position="topright" />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MarkerClusterGroup
          iconCreateFunction={createClusterCustomIcon}
          maxClusterRadius={80}
          spiderfyOnMaxZoom={true}
          showCoverageOnHover={false}
          zoomToBoundsOnClick={true}
        >
          {validHazards.map((hazard) => {
            const isSelected = hazard.id === selectedHazardId
            
            return (
              <Marker
                key={hazard.id}
                position={[hazard.latitude!, hazard.longitude!]}
                icon={getMarkerIcon(isSelected)}
              >
                <Popup>
                  {renderPopupContent(hazard)}
                </Popup>
              </Marker>
            )
          })}
        </MarkerClusterGroup>
      </MapContainer>
    </Box>
  )
}

export default HazardsView

import { useRef, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, ZoomControl, Polygon } from 'react-leaflet'
import { Box } from '@mantine/core'
import L from 'leaflet'
import 'leaflet.markercluster'
import MarkerClusterGroup from 'react-leaflet-markercluster'
import type { Outage } from '../types/outage'
import { formatTimeRange } from '../utils/dateFormat'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'

delete (L.Icon.Default.prototype as L.Icon.Default & { _getIconUrl?: () => string })._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

interface MapViewProps {
  outages?: Outage[]
  selectedOutageId?: string | null
}

const MapView = ({ outages = [], selectedOutageId = null }: MapViewProps) => {
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

  const getCategoryIcon = (category: string) => {
    const categoryLower = category.toLowerCase()
    if (categoryLower.includes('power')) {
      return '⚡'
    } else if (categoryLower.includes('road')) {
      return '🚧'
    } else if (categoryLower.includes('school')) {
      return '🏫'
    } else if (categoryLower.includes('water')) {
      return '💧'
    }
    return '⚡'
  }

  const getMarkerIcon = (category: string, isSelected: boolean) => {
    const icon = getCategoryIcon(category)
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
      ">${icon}</div>`,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    })
  }

  const getOutageCenter = (outage: Outage): [number, number] => {
    if (outage.location_geometry.type === 'Point') {
      const coords = outage.location_geometry.coordinates as [number, number]
      return [coords[1], coords[0]]
    } else {
      const polygonCoords = outage.location_geometry.coordinates as [number, number][][]
      const ring = polygonCoords[0]
      const lats = ring.map(coord => coord[1])
      const lngs = ring.map(coord => coord[0])
      const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2
      const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2
      return [centerLat, centerLng]
    }
  }

  const renderPopupContent = (outage: Outage) => (
    <div style={{ cursor: 'pointer' }}>
      <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 600 }}>
        Power Outage - {outage.provider.toUpperCase()}
      </h3>
      <p style={{ margin: '4px 0', fontSize: '12px' }}>
        <strong>Location:</strong> {outage.location_description}
      </p>
      <p style={{ margin: '4px 0', fontSize: '12px' }}>
        <strong>Affected:</strong>{' '}
        {outage.affected_customers !== null 
          ? `${outage.affected_customers} customers` 
          : 'Unknown'}
      </p>
      <p style={{ margin: '4px 0', fontSize: '12px' }}>
        <strong>Time:</strong> {formatTimeRange(outage.start_time, outage.end_time)}
      </p>
      <p style={{ margin: '4px 0', fontSize: '12px' }}>
        <strong>Status:</strong>{' '}
        <span style={{ 
          fontWeight: 600,
          textTransform: 'capitalize'
        }}>
          {outage.status}
        </span>
      </p>
      <p style={{ margin: '4px 0', fontSize: '12px' }}>
        <strong>Type:</strong> {outage.schedule_type === 'planned' ? 'Planned' : 'Unplanned'}
      </p>
    </div>
  )

  useEffect(() => {
    if (mapRef.current && selectedOutageId) {
      const selectedOutage = outages.find(o => o.id === selectedOutageId)
      if (selectedOutage) {
        const center = getOutageCenter(selectedOutage)
        mapRef.current.setView(center, 13, { animate: true })
      }
    }
  }, [selectedOutageId, outages])

  return (
    <Box style={{ height: '100%', width: '100%', position: 'relative', zIndex: 0 }}>
      <MapContainer
        center={[-43.5321, 172.6362]} // Christchurch, Canterbury
        zoom={11} // Regional view for Canterbury
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
          {outages
            .filter(outage => outage.location_geometry.type === 'Point')
            .map((outage) => {
              const isSelected = outage.id === selectedOutageId
              const coords = outage.location_geometry.coordinates as [number, number]
              
              return (
                <Marker
                  key={outage.id}
                  position={[coords[1], coords[0]]}
                  icon={getMarkerIcon(outage.category, isSelected)}
                >
                  <Popup>
                    {renderPopupContent(outage)}
                  </Popup>
                </Marker>
              )
            })}
        </MarkerClusterGroup>

        {outages
          .filter(outage => outage.location_geometry.type === 'Polygon')
          .map((outage) => {
            const isSelected = outage.id === selectedOutageId
            const polygonCoords = outage.location_geometry.coordinates as [number, number][][]
            const positions = polygonCoords[0].map(coord => [coord[1], coord[0]] as [number, number])
            
            return (
              <Polygon
                key={outage.id}
                positions={positions}
                pathOptions={{
                  color: isSelected ? '#00bcd4' : '#ff4757',
                  fillColor: isSelected ? '#00bcd4' : '#ff4757',
                  fillOpacity: 0.3,
                  weight: 2,
                }}
              >
                <Popup>
                  {renderPopupContent(outage)}
                </Popup>
              </Polygon>
            )
          })}
      </MapContainer>
    </Box>
  )
}

export default MapView

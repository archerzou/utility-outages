import { IconBolt, IconRoad, IconSchool, IconDroplet, IconCloudStorm } from '@tabler/icons-react'

export interface EventType {
  id: string
  name: string
  icon: typeof IconBolt
  color: string
}

export const eventTypes: EventType[] = [
  {
    id: 'power-outages',
    name: 'Power Outages',
    icon: IconBolt,
    color: '#ff4757',
  },
  {
    id: 'road-closures',
    name: 'Road closures',
    icon: IconRoad,
    color: '#ffa502',
  },
  {
    id: 'school-closures',
    name: 'School closures',
    icon: IconSchool,
    color: '#5352ed',
  },
  {
    id: 'boil-water-notices',
    name: 'boil water notices',
    icon: IconDroplet,
    color: '#00bcd4',
  },
  {
    id: 'historic-weather-hazards',
    name: 'Historic Weather Hazards',
    icon: IconCloudStorm,
    color: '#ff6b6b',
  },
]

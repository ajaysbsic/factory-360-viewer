export interface Hotspot {
  id?: string;
  label?: string;
  x: number;
  y: number;
  z: number;
  targetSceneId?: string;
  type?: 'scene' | 'info';
  description?: string;
}

export interface Scene {
  id: string;
  image: string;
  hotspots: Hotspot[];
  initialLon?: number;
  initialLat?: number;
}

export interface Project {
  id: number;
  name: string;
  rootScene: string;
  scenes: Scene[];
}

export interface CapturedCoordinate {
  x: number;
  y: number;
  z: number;
}

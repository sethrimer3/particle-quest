export enum ParticleType {
  AIR = 0,
  DIRT = 1,
  GRASS = 2,
  PLANT = 3,
  PLAYER = 4,
  SLIME = 5,
  SWORD = 6,
  BAT = 7,
}

export interface Particle {
  type: ParticleType
  updated: boolean
  velocity?: { x: number; y: number }
  health?: number
}

export const PARTICLE_COLORS: Record<ParticleType, string> = {
  [ParticleType.AIR]: 'transparent',
  [ParticleType.DIRT]: '#8B6F47',
  [ParticleType.GRASS]: '#4CAF50',
  [ParticleType.PLANT]: '#66BB6A',
  [ParticleType.PLAYER]: '#2196F3',
  [ParticleType.SLIME]: '#76FF03',
  [ParticleType.SWORD]: '#B0B0B0',
  [ParticleType.BAT]: '#8B008B',
}

export const PARTICLE_SIZE = 8

export class ParticleGrid {
  width: number
  height: number
  grid: Particle[][]

  constructor(width: number, height: number) {
    this.width = width
    this.height = height
    this.grid = []
    this.initializeGrid()
  }

  initializeGrid() {
    for (let x = 0; x < this.width; x++) {
      this.grid[x] = []
      for (let y = 0; y < this.height; y++) {
        this.grid[x][y] = { type: ParticleType.AIR, updated: false }
      }
    }
  }

  get(x: number, y: number): Particle | null {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return null
    return this.grid[x][y]
  }

  set(x: number, y: number, particle: Particle) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return
    this.grid[x][y] = particle
  }

  swap(x1: number, y1: number, x2: number, y2: number) {
    if (
      x1 < 0 || x1 >= this.width || y1 < 0 || y1 >= this.height ||
      x2 < 0 || x2 >= this.width || y2 < 0 || y2 >= this.height
    ) return

    const temp = this.grid[x1][y1]
    this.grid[x1][y1] = this.grid[x2][y2]
    this.grid[x2][y2] = temp
  }

  isEmpty(x: number, y: number): boolean {
    const particle = this.get(x, y)
    return particle ? particle.type === ParticleType.AIR : false
  }

  isSolid(x: number, y: number): boolean {
    const particle = this.get(x, y)
    if (!particle) return true
    return particle.type !== ParticleType.AIR
  }

  resetUpdated() {
    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        this.grid[x][y].updated = false
      }
    }
  }

  updatePhysics() {
    this.resetUpdated()

    for (let y = this.height - 2; y >= 0; y--) {
      for (let x = 0; x < this.width; x++) {
        const particle = this.grid[x][y]
        
        if (particle.updated) continue
        
        if (particle.type === ParticleType.DIRT) {
          this.updateDirt(x, y)
        } else if (particle.type === ParticleType.GRASS) {
          this.updateGrass(x, y)
        }
      }
    }
  }

  updateDirt(x: number, y: number) {
    const below = this.get(x, y + 1)
    
    if (below && below.type === ParticleType.AIR) {
      this.swap(x, y, x, y + 1)
      this.grid[x][y + 1].updated = true
    } else {
      const left = Math.random() < 0.5 ? -1 : 1
      const right = -left
      
      const belowLeft = this.get(x + left, y + 1)
      if (belowLeft && belowLeft.type === ParticleType.AIR) {
        this.swap(x, y, x + left, y + 1)
        this.grid[x + left][y + 1].updated = true
      } else {
        const belowRight = this.get(x + right, y + 1)
        if (belowRight && belowRight.type === ParticleType.AIR) {
          this.swap(x, y, x + right, y + 1)
          this.grid[x + right][y + 1].updated = true
        }
      }
    }
  }

  updateGrass(x: number, y: number) {
    const below = this.get(x, y + 1)
    
    if (below && below.type === ParticleType.AIR) {
      this.set(x, y, { type: ParticleType.DIRT, updated: false })
      this.swap(x, y, x, y + 1)
      this.grid[x][y + 1].updated = true
    }
  }
}

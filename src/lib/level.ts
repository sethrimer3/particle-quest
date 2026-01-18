import { ParticleGrid, ParticleType } from './particles'

export function generateLevel(grid: ParticleGrid) {
  const groundLevel = Math.floor(grid.height * 0.7)
  
  // Generate base terrain
  for (let x = 0; x < grid.width; x++) {
    const variation = Math.floor(Math.sin(x * 0.1) * 3)
    const height = groundLevel + variation
    
    for (let y = height; y < grid.height; y++) {
      if (y === height) {
        grid.set(x, y, { type: ParticleType.GRASS, updated: false })
      } else if (y > height + 8 && Math.random() < 0.3) {
        // Add stone deep underground
        grid.set(x, y, { type: ParticleType.STONE, updated: false })
      } else {
        grid.set(x, y, { type: ParticleType.DIRT, updated: false })
      }
    }
    
    // Add plants
    if (Math.random() < 0.1 && height > 0) {
      const plantHeight = 1 + Math.floor(Math.random() * 3)
      for (let i = 0; i < plantHeight; i++) {
        if (height - 1 - i >= 0) {
          grid.set(x, height - 1 - i, { type: ParticleType.PLANT, updated: false })
        }
      }
    }
  }
  
  // Add floating platforms for variety
  const platformCount = 3 + Math.floor(Math.random() * 3)
  for (let i = 0; i < platformCount; i++) {
    const platformX = 10 + Math.floor(Math.random() * (grid.width - 30))
    const platformY = 20 + Math.floor(Math.random() * 25)
    const platformWidth = 5 + Math.floor(Math.random() * 8)
    
    for (let x = platformX; x < platformX + platformWidth && x < grid.width; x++) {
      if (grid.get(x, platformY)?.type === ParticleType.AIR) {
        grid.set(x, platformY, { type: ParticleType.GRASS, updated: false })
        // Add dirt layer below
        if (platformY + 1 < grid.height) {
          grid.set(x, platformY + 1, { type: ParticleType.DIRT, updated: false })
        }
      }
    }
  }
  
  // Add stone pillars
  const pillarCount = 2 + Math.floor(Math.random() * 2)
  for (let i = 0; i < pillarCount; i++) {
    const pillarX = 15 + Math.floor(Math.random() * (grid.width - 30))
    const pillarHeight = 8 + Math.floor(Math.random() * 12)
    const pillarWidth = 2 + Math.floor(Math.random() * 2)
    
    for (let y = groundLevel - pillarHeight; y < groundLevel; y++) {
      for (let x = pillarX; x < pillarX + pillarWidth && x < grid.width; x++) {
        if (y >= 0) {
          grid.set(x, y, { type: ParticleType.STONE, updated: false })
        }
      }
    }
  }
}

export function findSpawnPosition(grid: ParticleGrid, width: number): { x: number; y: number } | null {
  for (let attempt = 0; attempt < 100; attempt++) {
    const x = Math.floor(Math.random() * (grid.width - width))
    
    for (let y = 0; y < grid.height - 10; y++) {
      let hasFloor = false
      let hasSpace = true
      
      for (let checkX = 0; checkX < width; checkX++) {
        const below = grid.get(x + checkX, y + 1)
        if (below && below.type !== ParticleType.AIR && below.type !== ParticleType.PLANT) {
          hasFloor = true
        }
        
        const current = grid.get(x + checkX, y)
        if (current && current.type !== ParticleType.AIR && current.type !== ParticleType.PLANT) {
          hasSpace = false
          break
        }
      }
      
      if (hasFloor && hasSpace) {
        return { x, y }
      }
    }
  }
  
  return { x: Math.floor(grid.width / 2) - Math.floor(width / 2), y: 10 }
}

import { ParticleGrid, ParticleType } from './particles'

export interface Entity {
  x: number
  y: number
  vx: number
  vy: number
  width: number
  height: number
  onGround: boolean
  health: number
  maxHealth: number
}

export interface Player extends Entity {
  attackCooldown: number
  attackFrame: number
}

export interface Slime extends Entity {
  jumpCooldown: number
  targetX: number
}

export interface Bat extends Entity {
  hoverOffset: number
  hoverSpeed: number
  diveCooldown: number
  isDiving: boolean
}

export interface Spider extends Entity {
  climbCooldown: number
  isClimbing: boolean
  targetY: number
}

export function createPlayer(x: number, y: number): Player {
  return {
    x,
    y,
    vx: 0,
    vy: 0,
    width: 3,
    height: 3,
    onGround: false,
    health: 100,
    maxHealth: 100,
    attackCooldown: 0,
    attackFrame: 0,
  }
}

export function createSlime(x: number, y: number): Slime {
  return {
    x,
    y,
    vx: 0,
    vy: 0,
    width: 2,
    height: 2,
    onGround: false,
    health: 30,
    maxHealth: 30,
    jumpCooldown: 0,
    targetX: x,
  }
}

export function createBat(x: number, y: number): Bat {
  return {
    x,
    y,
    vx: 0,
    vy: 0,
    width: 2,
    height: 2,
    onGround: false,
    health: 20,
    maxHealth: 20,
    hoverOffset: 0,
    hoverSpeed: 0.05,
    diveCooldown: 0,
    isDiving: false,
  }
}

export function createSpider(x: number, y: number): Spider {
  return {
    x,
    y,
    vx: 0,
    vy: 0,
    width: 2,
    height: 2,
    onGround: false,
    health: 25,
    maxHealth: 25,
    climbCooldown: 0,
    isClimbing: false,
    targetY: y,
  }
}

export function checkCollision(
  entity: Entity,
  grid: ParticleGrid,
  dx: number,
  dy: number
): boolean {
  const newX = Math.floor(entity.x + dx)
  const newY = Math.floor(entity.y + dy)

  for (let x = 0; x < entity.width; x++) {
    for (let y = 0; y < entity.height; y++) {
      const checkX = newX + x
      const checkY = newY + y
      
      if (checkX < 0 || checkX >= grid.width || checkY < 0 || checkY >= grid.height) {
        return true
      }
      
      const particle = grid.get(checkX, checkY)
      if (
        particle &&
        particle.type !== ParticleType.AIR &&
        particle.type !== ParticleType.PLANT &&
        particle.type !== ParticleType.PLAYER &&
        particle.type !== ParticleType.SLIME &&
        particle.type !== ParticleType.SWORD
      ) {
        return true
      }
    }
  }
  
  return false
}

export function applyGravity(entity: Entity, gravity: number) {
  entity.vy += gravity
  if (entity.vy > 5) entity.vy = 5
}

export function updatePlayerPhysics(player: Player, grid: ParticleGrid, dt: number) {
  applyGravity(player, 0.5)

  const steps = Math.ceil(Math.abs(player.vy))
  const stepY = player.vy / steps

  for (let i = 0; i < steps; i++) {
    if (checkCollision(player, grid, 0, stepY)) {
      if (player.vy > 0) {
        player.onGround = true
        player.vy = 0
      } else {
        player.vy = 0
      }
      break
    } else {
      player.y += stepY
      player.onGround = false
    }
  }

  const stepsX = Math.ceil(Math.abs(player.vx))
  const stepX = player.vx > 0 ? 1 : -1

  for (let i = 0; i < stepsX; i++) {
    if (checkCollision(player, grid, stepX, 0)) {
      player.vx = 0
      break
    } else {
      player.x += stepX
    }
  }

  player.vx *= 0.8

  if (Math.abs(player.vx) < 0.1) player.vx = 0

  if (player.attackCooldown > 0) {
    player.attackCooldown--
  }
  if (player.attackFrame > 0) {
    player.attackFrame--
  }
}

export function updateSlimeAI(slime: Slime, player: Player, grid: ParticleGrid) {
  const distToPlayer = player.x - slime.x

  if (slime.jumpCooldown > 0) {
    slime.jumpCooldown--
  }

  if (slime.onGround && slime.jumpCooldown === 0) {
    if (Math.abs(distToPlayer) < 30) {
      slime.vy = -4
      slime.vx = distToPlayer > 0 ? 2 : -2
      slime.jumpCooldown = 60 + Math.floor(Math.random() * 40)
    }
  }

  applyGravity(slime, 0.5)

  const steps = Math.ceil(Math.abs(slime.vy))
  const stepY = slime.vy / steps

  for (let i = 0; i < steps; i++) {
    if (checkCollision(slime, grid, 0, stepY)) {
      if (slime.vy > 0) {
        slime.onGround = true
        slime.vy = 0
      } else {
        slime.vy = 0
      }
      break
    } else {
      slime.y += stepY
      slime.onGround = false
    }
  }

  const stepsX = Math.ceil(Math.abs(slime.vx))
  const stepX = slime.vx > 0 ? 1 : -1

  for (let i = 0; i < stepsX; i++) {
    if (checkCollision(slime, grid, stepX, 0)) {
      slime.vx = 0
      break
    } else {
      slime.x += stepX
    }
  }

  slime.vx *= 0.9

  if (Math.abs(slime.vx) < 0.1) slime.vx = 0
}

export function updateBatAI(bat: Bat, player: Player, grid: ParticleGrid) {
  const distToPlayerX = player.x - bat.x
  const distToPlayerY = player.y - bat.y
  const distance = Math.sqrt(distToPlayerX * distToPlayerX + distToPlayerY * distToPlayerY)

  // Hover motion
  bat.hoverOffset += bat.hoverSpeed
  
  if (bat.diveCooldown > 0) {
    bat.diveCooldown--
  }

  // Decide whether to dive
  if (!bat.isDiving && bat.diveCooldown === 0 && distance < 40) {
    bat.isDiving = true
    bat.diveCooldown = 120
  }

  if (bat.isDiving) {
    // Dive towards player
    bat.vx = distToPlayerX > 0 ? 3 : -3
    bat.vy = distToPlayerY > 0 ? 3 : -3
    
    // Stop diving if close to ground
    const checkY = Math.floor(bat.y + bat.height + 1)
    if (checkY < grid.height) {
      const below = grid.get(Math.floor(bat.x), checkY)
      if (below && below.type !== ParticleType.AIR) {
        bat.isDiving = false
        bat.vy = -4 // Fly back up
      }
    }
  } else {
    // Hover and follow player horizontally
    const targetY = 20 + Math.sin(bat.hoverOffset) * 5
    bat.vy = (targetY - bat.y) * 0.05
    bat.vx = distToPlayerX > 0 ? 1.5 : -1.5
  }

  // Update position
  bat.x += bat.vx
  bat.y += bat.vy

  // Keep in bounds
  if (bat.x < 0) bat.x = 0
  if (bat.x > grid.width - bat.width) bat.x = grid.width - bat.width
  if (bat.y < 0) bat.y = 0

  bat.vx *= 0.95
  bat.vy *= 0.95
}

export function checkPlayerSlimeCollision(player: Player, slime: Slime): boolean {
  return !(
    player.x + player.width <= slime.x ||
    player.x >= slime.x + slime.width ||
    player.y + player.height <= slime.y ||
    player.y >= slime.y + slime.height
  )
}

export function checkPlayerBatCollision(player: Player, bat: Bat): boolean {
  return !(
    player.x + player.width <= bat.x ||
    player.x >= bat.x + bat.width ||
    player.y + player.height <= bat.y ||
    player.y >= bat.y + bat.height
  )
}

export function checkSwordBatCollision(
  swordHitbox: { x: number; y: number; width: number; height: number },
  bat: Bat
): boolean {
  return !(
    swordHitbox.x + swordHitbox.width <= bat.x ||
    swordHitbox.x >= bat.x + bat.width ||
    swordHitbox.y + swordHitbox.height <= bat.y ||
    swordHitbox.y >= bat.y + bat.height
  )
}

export function getSwordHitbox(player: Player, attackFrame: number) {
  const maxFrames = 15
  const progress = 1 - attackFrame / maxFrames
  const angle = -Math.PI / 2 + progress * Math.PI
  const distance = 5
  const swordLength = 4

  const centerX = player.x + player.width / 2
  const centerY = player.y + player.height / 2

  const tipX = centerX + Math.cos(angle) * (distance + swordLength)
  const tipY = centerY + Math.sin(angle) * (distance + swordLength)

  return {
    x: tipX - 2,
    y: tipY - 2,
    width: 4,
    height: 4,
  }
}

export function checkSwordSlimeCollision(
  swordHitbox: { x: number; y: number; width: number; height: number },
  slime: Slime
): boolean {
  return !(
    swordHitbox.x + swordHitbox.width <= slime.x ||
    swordHitbox.x >= slime.x + slime.width ||
    swordHitbox.y + swordHitbox.height <= slime.y ||
    swordHitbox.y >= slime.y + slime.height
  )
}

export function updateSpiderAI(spider: Spider, player: Player, grid: ParticleGrid) {
  const distToPlayerX = player.x - spider.x
  const distToPlayerY = player.y - spider.y
  const MIN_CLIMB_DISTANCE = 2
  
  if (spider.climbCooldown > 0) {
    spider.climbCooldown--
  }

  // Check if spider is next to a wall
  const leftWall = checkCollision(spider, grid, -1, 0)
  const rightWall = checkCollision(spider, grid, 1, 0)
  
  // Spider can climb walls
  if ((leftWall || rightWall) && Math.abs(distToPlayerY) > MIN_CLIMB_DISTANCE) {
    spider.isClimbing = true
    spider.vy = distToPlayerY > 0 ? 1 : -1
    spider.vx = 0
  } else {
    spider.isClimbing = false
    
    // Ground movement
    if (spider.onGround && spider.climbCooldown === 0) {
      if (Math.abs(distToPlayerX) < 35) {
        // Jump towards player
        spider.vy = -3.5
        spider.vx = distToPlayerX > 0 ? 2.5 : -2.5
        spider.climbCooldown = 50 + Math.floor(Math.random() * 30)
      }
    }
    
    if (!spider.isClimbing) {
      applyGravity(spider, 0.5)
    }
  }

  // Update position
  if (spider.isClimbing) {
    spider.y += spider.vy
    // Keep on wall
    if (spider.y < 0) spider.y = 0
    if (spider.y > grid.height - spider.height) spider.y = grid.height - spider.height
  } else {
    // Normal physics
    const steps = Math.ceil(Math.abs(spider.vy))
    const stepY = spider.vy / steps

    for (let i = 0; i < steps; i++) {
      if (checkCollision(spider, grid, 0, stepY)) {
        if (spider.vy > 0) {
          spider.onGround = true
          spider.vy = 0
        } else {
          spider.vy = 0
        }
        break
      } else {
        spider.y += stepY
        spider.onGround = false
      }
    }

    const stepsX = Math.ceil(Math.abs(spider.vx))
    const stepX = spider.vx > 0 ? 1 : -1

    for (let i = 0; i < stepsX; i++) {
      if (checkCollision(spider, grid, stepX, 0)) {
        spider.vx = 0
        break
      } else {
        spider.x += stepX
      }
    }

    spider.vx *= 0.9
    if (Math.abs(spider.vx) < 0.1) spider.vx = 0
  }
}

export function checkPlayerSpiderCollision(player: Player, spider: Spider): boolean {
  return !(
    player.x + player.width <= spider.x ||
    player.x >= spider.x + spider.width ||
    player.y + player.height <= spider.y ||
    player.y >= spider.y + spider.height
  )
}

export function checkSwordSpiderCollision(
  swordHitbox: { x: number; y: number; width: number; height: number },
  spider: Spider
): boolean {
  return !(
    swordHitbox.x + swordHitbox.width <= spider.x ||
    swordHitbox.x >= spider.x + spider.width ||
    swordHitbox.y + swordHitbox.height <= spider.y ||
    swordHitbox.y >= spider.y + spider.height
  )
}

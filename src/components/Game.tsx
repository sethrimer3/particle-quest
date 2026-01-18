import { useEffect, useRef, useState } from 'react'
import { ParticleGrid, ParticleType, PARTICLE_COLORS, PARTICLE_SIZE } from '@/lib/particles'
import {
  Player,
  Slime,
  Bat,
  createPlayer,
  createSlime,
  createBat,
  updatePlayerPhysics,
  updateSlimeAI,
  updateBatAI,
  checkPlayerSlimeCollision,
  checkPlayerBatCollision,
  getSwordHitbox,
  checkSwordSlimeCollision,
  checkSwordBatCollision,
} from '@/lib/entities'
import { generateLevel, findSpawnPosition } from '@/lib/level'
import { Heart, Sword } from '@phosphor-icons/react'
import { Progress } from '@/components/ui/progress'
import { useKV } from '@github/spark/hooks'

const GRID_WIDTH = 120
const GRID_HEIGHT = 80

export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [keys, setKeys] = useState<Set<string>>(new Set())
  const [score, setScore] = useKV<number>('rpg-score', 0)
  const [highScore, setHighScore] = useKV<number>('rpg-high-score', 0)
  const [gameOver, setGameOver] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [playerHealth, setPlayerHealth] = useState(100)
  const [screenShake, setScreenShake] = useState({ x: 0, y: 0 })
  const [combo, setCombo] = useState(0)
  const [comboTimer, setComboTimer] = useState(0)

  const gridRef = useRef<ParticleGrid | null>(null)
  const playerRef = useRef<Player | null>(null)
  const slimesRef = useRef<Slime[]>([])
  const batsRef = useRef<Bat[]>([])
  const healthPickupsRef = useRef<Array<{ x: number; y: number; pulse: number }>>([])
  const animationRef = useRef<number | null>(null)
  const particleEffectsRef = useRef<Array<{ x: number; y: number; vx: number; vy: number; life: number; color: string }>>([])
  const lastDamageTimeRef = useRef(0)
  const gameTimeRef = useRef(0)
  const lastSpawnTimeRef = useRef(0)

  useEffect(() => {
    const grid = new ParticleGrid(GRID_WIDTH, GRID_HEIGHT)
    generateLevel(grid)

    const playerSpawn = findSpawnPosition(grid, 3)
    if (playerSpawn) {
      playerRef.current = createPlayer(playerSpawn.x, playerSpawn.y)
      setPlayerHealth(100)
    }

    for (let i = 0; i < 3; i++) {
      const slimeSpawn = findSpawnPosition(grid, 2)
      if (slimeSpawn) {
        slimesRef.current.push(createSlime(slimeSpawn.x, slimeSpawn.y))
      }
    }

    // Add 2 bats
    for (let i = 0; i < 2; i++) {
      const batX = Math.random() * (grid.width - 2)
      const batY = 15 + Math.random() * 10
      batsRef.current.push(createBat(batX, batY))
    }

    gridRef.current = grid
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'escape' || e.key.toLowerCase() === 'p') {
        setIsPaused(prev => !prev)
      } else {
        setKeys((prev) => new Set(prev).add(e.key.toLowerCase()))
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      setKeys((prev) => {
        const next = new Set(prev)
        next.delete(e.key.toLowerCase())
        return next
      })
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let lastTime = performance.now()
    let physicsAccumulator = 0
    const physicsStep = 1000 / 30

    const gameLoop = (currentTime: number) => {
      const deltaTime = currentTime - lastTime
      lastTime = currentTime
      physicsAccumulator += deltaTime

      while (physicsAccumulator >= physicsStep) {
        update(physicsStep / 1000)
        physicsAccumulator -= physicsStep
      }

      render(ctx)
      animationRef.current = requestAnimationFrame(gameLoop)
    }

    animationRef.current = requestAnimationFrame(gameLoop)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [keys, gameOver, isPaused])

  const update = (dt: number) => {
    if (gameOver || isPaused) return
    if (!gridRef.current || !playerRef.current) return

    const grid = gridRef.current
    const player = playerRef.current

    // Update game time for difficulty scaling
    gameTimeRef.current += dt

    // Combo timer countdown
    if (comboTimer > 0) {
      setComboTimer(comboTimer - dt)
      if (comboTimer <= 0) {
        setCombo(0)
      }
    }

    const sprint = keys.has('shift')
    const moveSpeed = sprint ? 4 : 2

    if (keys.has('a')) {
      player.vx = -moveSpeed
    } else if (keys.has('d')) {
      player.vx = moveSpeed
    }

    if (keys.has('w') && player.onGround) {
      player.vy = -7
      player.onGround = false
    }

    if (keys.has(' ') && player.attackCooldown === 0) {
      player.attackCooldown = 30
      player.attackFrame = 15
    }

    updatePlayerPhysics(player, grid, dt)

    grid.updatePhysics()

    // Update particle effects
    particleEffectsRef.current = particleEffectsRef.current.filter(p => {
      p.x += p.vx
      p.y += p.vy
      p.vy += 0.2 // gravity
      p.life--
      return p.life > 0
    })

    // Update screen shake
    if (screenShake.x !== 0 || screenShake.y !== 0) {
      setScreenShake({ x: screenShake.x * 0.7, y: screenShake.y * 0.7 })
      if (Math.abs(screenShake.x) < 0.1 && Math.abs(screenShake.y) < 0.1) {
        setScreenShake({ x: 0, y: 0 })
      }
    }

    slimesRef.current.forEach((slime, index) => {
      updateSlimeAI(slime, player, grid)

      const currentTime = performance.now()
      if (checkPlayerSlimeCollision(player, slime) && currentTime - lastDamageTimeRef.current > 500) {
        player.health -= 5
        setPlayerHealth(player.health)
        lastDamageTimeRef.current = currentTime
        
        // Screen shake on damage
        setScreenShake({ x: (Math.random() - 0.5) * 8, y: (Math.random() - 0.5) * 8 })
        
        // Damage particle effects
        for (let i = 0; i < 8; i++) {
          particleEffectsRef.current.push({
            x: (player.x + player.width / 2) * PARTICLE_SIZE,
            y: (player.y + player.height / 2) * PARTICLE_SIZE,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4 - 2,
            life: 30,
            color: '#FF0000'
          })
        }
        
        if (player.health <= 0) {
          setGameOver(true)
          if ((score ?? 0) > (highScore ?? 0)) {
            setHighScore((score ?? 0))
          }
        }
      }

      if (player.attackFrame > 0) {
        const swordHitbox = getSwordHitbox(player, player.attackFrame)
        if (checkSwordSlimeCollision(swordHitbox, slime)) {
          slime.health -= 2
          if (slime.health <= 0) {
            // Death particle effects
            for (let i = 0; i < 15; i++) {
              particleEffectsRef.current.push({
                x: (slime.x + slime.width / 2) * PARTICLE_SIZE,
                y: (slime.y + slime.height / 2) * PARTICLE_SIZE,
                vx: (Math.random() - 0.5) * 6,
                vy: (Math.random() - 0.5) * 6 - 3,
                life: 40,
                color: PARTICLE_COLORS[ParticleType.SLIME]
              })
            }
            
            slimesRef.current.splice(index, 1)
            
            // Update combo
            setCombo(prev => prev + 1)
            setComboTimer(3) // 3 seconds to keep combo
            
            const comboMultiplier = Math.min(combo + 1, 5)
            const points = 10 * comboMultiplier
            setScore((current) => (current ?? 0) + points)

            const spawnPos = findSpawnPosition(grid, 2)
            if (spawnPos) {
              slimesRef.current.push(createSlime(spawnPos.x, spawnPos.y))
            }
          }
        }
      }
    })

    // Update bats
    batsRef.current.forEach((bat, index) => {
      updateBatAI(bat, player, grid)

      const currentTime = performance.now()
      if (checkPlayerBatCollision(player, bat) && currentTime - lastDamageTimeRef.current > 500) {
        player.health -= 3
        setPlayerHealth(player.health)
        lastDamageTimeRef.current = currentTime
        
        // Screen shake on damage
        setScreenShake({ x: (Math.random() - 0.5) * 6, y: (Math.random() - 0.5) * 6 })
        
        // Damage particle effects
        for (let i = 0; i < 6; i++) {
          particleEffectsRef.current.push({
            x: (player.x + player.width / 2) * PARTICLE_SIZE,
            y: (player.y + player.height / 2) * PARTICLE_SIZE,
            vx: (Math.random() - 0.5) * 3,
            vy: (Math.random() - 0.5) * 3 - 1,
            life: 25,
            color: '#FF6666'
          })
        }
        
        if (player.health <= 0) {
          setGameOver(true)
          if ((score ?? 0) > (highScore ?? 0)) {
            setHighScore((score ?? 0))
          }
        }
      }

      if (player.attackFrame > 0) {
        const swordHitbox = getSwordHitbox(player, player.attackFrame)
        if (checkSwordBatCollision(swordHitbox, bat)) {
          bat.health -= 2
          if (bat.health <= 0) {
            // Death particle effects
            for (let i = 0; i < 12; i++) {
              particleEffectsRef.current.push({
                x: (bat.x + bat.width / 2) * PARTICLE_SIZE,
                y: (bat.y + bat.height / 2) * PARTICLE_SIZE,
                vx: (Math.random() - 0.5) * 5,
                vy: (Math.random() - 0.5) * 5 - 2,
                life: 35,
                color: PARTICLE_COLORS[ParticleType.BAT]
              })
            }
            
            batsRef.current.splice(index, 1)
            
            // Update combo
            setCombo(prev => prev + 1)
            setComboTimer(3) // 3 seconds to keep combo
            
            const comboMultiplier = Math.min(combo + 1, 5)
            const points = 15 * comboMultiplier
            setScore((current) => (current ?? 0) + points)

            // 30% chance to spawn health pickup at bat location
            if (Math.random() < 0.3 && player.health < 100) {
              const spawnPos = findSpawnPosition(grid, 2)
              if (spawnPos) {
                healthPickupsRef.current.push({
                  x: spawnPos.x,
                  y: spawnPos.y,
                  pulse: 0
                })
              }
            }

            // Spawn new bat in the air
            const batX = Math.random() * (grid.width - 2)
            const batY = 10 + Math.random() * 15
            batsRef.current.push(createBat(batX, batY))
          }
        }
      }
    })

    // Update and check health pickups
    healthPickupsRef.current = healthPickupsRef.current.filter(pickup => {
      pickup.pulse += 0.1
      
      // Check if player collects it
      const distX = Math.abs(player.x - pickup.x)
      const distY = Math.abs(player.y - pickup.y)
      
      if (distX < player.width && distY < player.height) {
        // Collect health
        player.health = Math.min(100, player.health + 25)
        setPlayerHealth(player.health)
        
        // Healing particle effects
        for (let i = 0; i < 10; i++) {
          particleEffectsRef.current.push({
            x: (pickup.x + 1) * PARTICLE_SIZE,
            y: (pickup.y + 1) * PARTICLE_SIZE,
            vx: (Math.random() - 0.5) * 3,
            vy: (Math.random() - 0.5) * 3 - 2,
            life: 30,
            color: PARTICLE_COLORS[ParticleType.HEALTH_PICKUP]
          })
        }
        
        return false // Remove pickup
      }
      
      return true // Keep pickup
    })

    // Difficulty progression - spawn more enemies over time
    const currentTime = gameTimeRef.current
    const spawnInterval = Math.max(10, 20 - Math.floor(currentTime / 30)) // Spawn faster over time
    
    if (currentTime - lastSpawnTimeRef.current > spawnInterval) {
      lastSpawnTimeRef.current = currentTime
      
      // Spawn additional enemy
      if (Math.random() < 0.5) {
        // Spawn slime
        const spawnPos = findSpawnPosition(grid, 2)
        if (spawnPos && slimesRef.current.length < 6) {
          slimesRef.current.push(createSlime(spawnPos.x, spawnPos.y))
        }
      } else {
        // Spawn bat
        const batX = Math.random() * (grid.width - 2)
        const batY = 10 + Math.random() * 15
        if (batsRef.current.length < 4) {
          batsRef.current.push(createBat(batX, batY))
        }
      }
    }
  }

  const render = (ctx: CanvasRenderingContext2D) => {
    if (!gridRef.current || !playerRef.current) return

    const grid = gridRef.current
    const player = playerRef.current

    // Apply screen shake
    ctx.save()
    ctx.translate(screenShake.x, screenShake.y)

    ctx.fillStyle = PARTICLE_COLORS[ParticleType.AIR]
    ctx.fillRect(-screenShake.x, -screenShake.y, ctx.canvas.width, ctx.canvas.height)

    const gradient = ctx.createLinearGradient(0, 0, 0, ctx.canvas.height)
    gradient.addColorStop(0, '#87CEEB')
    gradient.addColorStop(1, '#B0E0E6')
    ctx.fillStyle = gradient
    ctx.fillRect(-screenShake.x, -screenShake.y, ctx.canvas.width, ctx.canvas.height)

    for (let x = 0; x < grid.width; x++) {
      for (let y = 0; y < grid.height; y++) {
        const particle = grid.get(x, y)
        if (particle && particle.type !== ParticleType.AIR) {
          ctx.fillStyle = PARTICLE_COLORS[particle.type]
          ctx.fillRect(x * PARTICLE_SIZE, y * PARTICLE_SIZE, PARTICLE_SIZE, PARTICLE_SIZE)
        }
      }
    }

    ctx.fillStyle = PARTICLE_COLORS[ParticleType.PLAYER]
    ctx.fillRect(
      player.x * PARTICLE_SIZE,
      player.y * PARTICLE_SIZE,
      player.width * PARTICLE_SIZE,
      player.height * PARTICLE_SIZE
    )

    slimesRef.current.forEach((slime) => {
      ctx.fillStyle = PARTICLE_COLORS[ParticleType.SLIME]
      ctx.fillRect(
        slime.x * PARTICLE_SIZE,
        slime.y * PARTICLE_SIZE,
        slime.width * PARTICLE_SIZE,
        slime.height * PARTICLE_SIZE
      )
    })

    // Draw bats with wing animation
    batsRef.current.forEach((bat) => {
      ctx.fillStyle = PARTICLE_COLORS[ParticleType.BAT]
      
      // Body
      ctx.fillRect(
        bat.x * PARTICLE_SIZE,
        bat.y * PARTICLE_SIZE,
        bat.width * PARTICLE_SIZE,
        bat.height * PARTICLE_SIZE
      )
      
      // Animated wings
      const wingFlap = Math.sin(performance.now() * 0.01) * 3
      ctx.fillRect(
        (bat.x - 0.5) * PARTICLE_SIZE,
        (bat.y + 0.5) * PARTICLE_SIZE,
        PARTICLE_SIZE / 2,
        PARTICLE_SIZE / 2 + wingFlap
      )
      ctx.fillRect(
        (bat.x + bat.width) * PARTICLE_SIZE,
        (bat.y + 0.5) * PARTICLE_SIZE,
        PARTICLE_SIZE / 2,
        PARTICLE_SIZE / 2 + wingFlap
      )
    })

    // Draw health pickups with pulse animation
    healthPickupsRef.current.forEach(pickup => {
      const pulseScale = 1 + Math.sin(pickup.pulse) * 0.2
      const size = 2 * PARTICLE_SIZE * pulseScale
      
      ctx.fillStyle = PARTICLE_COLORS[ParticleType.HEALTH_PICKUP]
      ctx.globalAlpha = 0.8 + Math.sin(pickup.pulse) * 0.2
      
      // Draw cross shape for health
      const centerX = (pickup.x + 1) * PARTICLE_SIZE
      const centerY = (pickup.y + 1) * PARTICLE_SIZE
      
      // Horizontal bar
      ctx.fillRect(
        centerX - size / 2,
        centerY - size / 6,
        size,
        size / 3
      )
      
      // Vertical bar
      ctx.fillRect(
        centerX - size / 6,
        centerY - size / 2,
        size / 3,
        size
      )
      
      ctx.globalAlpha = 1
    })

    if (player.attackFrame > 0) {
      const maxFrames = 15
      const progress = 1 - player.attackFrame / maxFrames
      const angle = -Math.PI / 2 + progress * Math.PI
      const distance = 5
      const swordLength = 4

      const centerX = (player.x + player.width / 2) * PARTICLE_SIZE
      const centerY = (player.y + player.height / 2) * PARTICLE_SIZE

      const baseX = centerX + Math.cos(angle) * distance * PARTICLE_SIZE
      const baseY = centerY + Math.sin(angle) * distance * PARTICLE_SIZE
      const tipX = centerX + Math.cos(angle) * (distance + swordLength) * PARTICLE_SIZE
      const tipY = centerY + Math.sin(angle) * (distance + swordLength) * PARTICLE_SIZE

      // Sword trail effect
      ctx.strokeStyle = PARTICLE_COLORS[ParticleType.SWORD]
      ctx.lineWidth = 3
      ctx.globalAlpha = 0.3
      for (let i = 0; i < 3; i++) {
        const trailProgress = progress - i * 0.1
        if (trailProgress > 0) {
          const trailAngle = -Math.PI / 2 + trailProgress * Math.PI
          const trailBaseX = centerX + Math.cos(trailAngle) * distance * PARTICLE_SIZE
          const trailBaseY = centerY + Math.sin(trailAngle) * distance * PARTICLE_SIZE
          const trailTipX = centerX + Math.cos(trailAngle) * (distance + swordLength) * PARTICLE_SIZE
          const trailTipY = centerY + Math.sin(trailAngle) * (distance + swordLength) * PARTICLE_SIZE
          
          ctx.beginPath()
          ctx.moveTo(trailBaseX, trailBaseY)
          ctx.lineTo(trailTipX, trailTipY)
          ctx.stroke()
        }
      }
      
      ctx.globalAlpha = 1
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(baseX, baseY)
      ctx.lineTo(tipX, tipY)
      ctx.stroke()
    }

    // Draw particle effects
    particleEffectsRef.current.forEach(p => {
      ctx.fillStyle = p.color
      ctx.globalAlpha = p.life / 40
      ctx.fillRect(p.x - 2, p.y - 2, 4, 4)
    })
    ctx.globalAlpha = 1

    ctx.restore()
  }

  const resetGame = () => {
    const currentScore = score ?? 0
    const currentHighScore = highScore ?? 0
    
    if (currentScore > currentHighScore) {
      setHighScore(currentScore)
    }
    setScore(0)
    setGameOver(false)
    setPlayerHealth(100)
    setScreenShake({ x: 0, y: 0 })
    setCombo(0)
    setComboTimer(0)
    particleEffectsRef.current = []
    lastDamageTimeRef.current = 0
    gameTimeRef.current = 0
    lastSpawnTimeRef.current = 0

    const grid = new ParticleGrid(GRID_WIDTH, GRID_HEIGHT)
    generateLevel(grid)

    const playerSpawn = findSpawnPosition(grid, 3)
    if (playerSpawn) {
      playerRef.current = createPlayer(playerSpawn.x, playerSpawn.y)
    }

    slimesRef.current = []
    for (let i = 0; i < 3; i++) {
      const slimeSpawn = findSpawnPosition(grid, 2)
      if (slimeSpawn) {
        slimesRef.current.push(createSlime(slimeSpawn.x, slimeSpawn.y))
      }
    }

    batsRef.current = []
    for (let i = 0; i < 2; i++) {
      const batX = Math.random() * (grid.width - 2)
      const batY = 15 + Math.random() * 10
      batsRef.current.push(createBat(batX, batY))
    }

    healthPickupsRef.current = []
    setIsPaused(false)

    gridRef.current = grid
  }

  return (
    <div className="relative w-full h-screen bg-background flex items-center justify-center overflow-hidden">
      <canvas
        ref={canvasRef}
        width={GRID_WIDTH * PARTICLE_SIZE}
        height={GRID_HEIGHT * PARTICLE_SIZE}
        className="border-4 border-border"
        style={{ imageRendering: 'pixelated' }}
      />

      <div className="absolute top-4 left-4 bg-card/90 border-2 border-border p-3 min-w-[200px]">
        <div className="flex items-center gap-2 mb-2">
          <Heart size={16} weight="fill" className="text-destructive" />
          <span className="text-xs text-card-foreground">
            HP: {playerHealth}
          </span>
        </div>
        <Progress value={(playerHealth / 100) * 100} className="h-2" />
      </div>

      <div className="absolute top-4 right-4 bg-card/90 border-2 border-border p-3 text-card-foreground">
        <div className="flex items-center gap-2 mb-1">
          <Sword size={16} weight="fill" />
          <span className="text-xs">Score: {score ?? 0}</span>
        </div>
        <div className="text-xs text-muted-foreground mb-1">High: {highScore ?? 0}</div>
        {combo > 1 && comboTimer > 0 && (
          <div className="text-xs font-bold text-yellow-400 animate-pulse">
            x{combo} COMBO!
          </div>
        )}
      </div>

      <div className="absolute bottom-4 left-4 bg-card/90 border-2 border-border p-2 text-card-foreground text-[8px] leading-tight">
        <div>A/D: Move</div>
        <div>Shift: Sprint</div>
        <div>W: Jump</div>
        <div>Space: Attack</div>
        <div className="mt-1 pt-1 border-t border-border">ESC/P: Pause</div>
      </div>

      {isPaused && !gameOver && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
          <div className="bg-card border-4 border-border p-8 text-center">
            <h2 className="text-3xl text-card-foreground mb-6">⏸ Paused</h2>
            <p className="text-muted-foreground mb-4">Press ESC or P to resume</p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => setIsPaused(false)}
                className="bg-primary hover:bg-primary/80 text-primary-foreground px-6 py-3 text-xs border-2 border-border active:translate-y-[2px]"
              >
                Resume
              </button>
              <button
                onClick={resetGame}
                className="bg-secondary hover:bg-secondary/80 text-secondary-foreground px-6 py-3 text-xs border-2 border-border active:translate-y-[2px]"
              >
                Restart
              </button>
            </div>
          </div>
        </div>
      )}

      {gameOver && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
          <div className="bg-card border-4 border-border p-8 text-center">
            <h2 className="text-2xl text-destructive mb-4">Game Over</h2>
            <p className="text-card-foreground mb-2">Score: {score ?? 0}</p>
            <p className="text-muted-foreground mb-6">High Score: {highScore ?? 0}</p>
            <button
              onClick={resetGame}
              className="bg-primary hover:bg-primary/80 text-primary-foreground px-6 py-3 text-xs border-2 border-border active:translate-y-[2px]"
            >
              Play Again
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

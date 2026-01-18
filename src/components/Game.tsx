import { useEffect, useRef, useState } from 'react'
import { ParticleGrid, ParticleType, PARTICLE_COLORS, PARTICLE_SIZE } from '@/lib/particles'
import {
  Player,
  Slime,
  createPlayer,
  createSlime,
  updatePlayerPhysics,
  updateSlimeAI,
  checkPlayerSlimeCollision,
  getSwordHitbox,
  checkSwordSlimeCollision,
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

  const gridRef = useRef<ParticleGrid | null>(null)
  const playerRef = useRef<Player | null>(null)
  const slimesRef = useRef<Slime[]>([])
  const animationRef = useRef<number | null>(null)

  useEffect(() => {
    const grid = new ParticleGrid(GRID_WIDTH, GRID_HEIGHT)
    generateLevel(grid)

    const playerSpawn = findSpawnPosition(grid, 3)
    if (playerSpawn) {
      playerRef.current = createPlayer(playerSpawn.x, playerSpawn.y)
    }

    for (let i = 0; i < 3; i++) {
      const slimeSpawn = findSpawnPosition(grid, 2)
      if (slimeSpawn) {
        slimesRef.current.push(createSlime(slimeSpawn.x, slimeSpawn.y))
      }
    }

    gridRef.current = grid
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      setKeys((prev) => new Set(prev).add(e.key.toLowerCase()))
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
  }, [keys, gameOver])

  const update = (dt: number) => {
    if (gameOver) return
    if (!gridRef.current || !playerRef.current) return

    const grid = gridRef.current
    const player = playerRef.current

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

    slimesRef.current.forEach((slime, index) => {
      updateSlimeAI(slime, player, grid)

      if (checkPlayerSlimeCollision(player, slime)) {
        player.health -= 1
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
            slimesRef.current.splice(index, 1)
            setScore((current) => (current ?? 0) + 10)

            const spawnPos = findSpawnPosition(grid, 2)
            if (spawnPos) {
              slimesRef.current.push(createSlime(spawnPos.x, spawnPos.y))
            }
          }
        }
      }
    })
  }

  const render = (ctx: CanvasRenderingContext2D) => {
    if (!gridRef.current || !playerRef.current) return

    const grid = gridRef.current
    const player = playerRef.current

    ctx.fillStyle = PARTICLE_COLORS[ParticleType.AIR]
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)

    const gradient = ctx.createLinearGradient(0, 0, 0, ctx.canvas.height)
    gradient.addColorStop(0, '#87CEEB')
    gradient.addColorStop(1, '#B0E0E6')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)

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

      ctx.strokeStyle = PARTICLE_COLORS[ParticleType.SWORD]
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(baseX, baseY)
      ctx.lineTo(tipX, tipY)
      ctx.stroke()
    }
  }

  const resetGame = () => {
    const currentScore = score ?? 0
    const currentHighScore = highScore ?? 0
    
    if (currentScore > currentHighScore) {
      setHighScore(currentScore)
    }
    setScore(0)
    setGameOver(false)

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
            HP: {playerRef.current?.health || 0}
          </span>
        </div>
        <Progress value={((playerRef.current?.health || 0) / 100) * 100} className="h-2" />
      </div>

      <div className="absolute top-4 right-4 bg-card/90 border-2 border-border p-3 text-card-foreground">
        <div className="flex items-center gap-2 mb-1">
          <Sword size={16} weight="fill" />
          <span className="text-xs">Score: {score ?? 0}</span>
        </div>
        <div className="text-xs text-muted-foreground">High: {highScore ?? 0}</div>
      </div>

      <div className="absolute bottom-4 left-4 bg-card/90 border-2 border-border p-2 text-card-foreground text-[8px] leading-tight">
        <div>A/D: Move</div>
        <div>Shift: Sprint</div>
        <div>W: Jump</div>
        <div>Space: Attack</div>
      </div>

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

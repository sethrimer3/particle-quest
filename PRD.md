# Planning Guide

A physics-driven RPG where the entire world is made of falling sand particles, featuring a player character navigating a dynamic particle landscape, fighting particle-based enemies with melee combat.

**Experience Qualities**:
1. **Tactile** - Every interaction with the particle world should feel physical and satisfying, with sand shifting underfoot and combat causing particles to react
2. **Playful** - The falling sand mechanics create emergent gameplay where the environment is constantly reactive and surprising
3. **Challenging** - Precise platforming on unstable terrain combined with timing-based combat creates engaging difficulty

**Complexity Level**: Light Application (multiple features with basic state)
This is a focused game experience with core mechanics (particle physics, player movement, enemy AI, combat) that work together but remain relatively self-contained.

## Essential Features

**Particle Physics System**
- Functionality: Simulates falling sand physics where dirt particles fall and settle, grass stays on top of dirt, and plants grow upward
- Purpose: Creates the core interactive environment that makes the game unique
- Trigger: Runs continuously every frame, updates when particles are moved or destroyed
- Progression: Initialize grid → Update particle positions based on physics rules → Render to canvas → Repeat
- Success criteria: Particles fall realistically, dirt piles naturally, grass layer maintains integrity

**Player Character**
- Functionality: 3x3 particle character controlled with WASD, sprint, jump, and attack
- Purpose: Core player avatar for navigating the world and engaging in combat
- Trigger: Keyboard input (A/D walk, Shift+A/D sprint, W jump, Space attack)
- Progression: Input detected → Apply physics (gravity, velocity) → Check collisions → Update position → Render
- Success criteria: Responsive controls, smooth movement, proper jumping arc, collision with terrain

**Slime Enemy**
- Functionality: 2x2 particle enemy that moves by jumping around the terrain
- Purpose: First enemy type providing combat challenge
- Trigger: AI loop checks position relative to player
- Progression: AI decision → Jump toward player → Apply gravity → Check collisions → Update position → Render
- Success criteria: Enemies move believably, pathfind toward player, can be defeated by sword attacks

**Sword Combat**
- Functionality: Wooden sword swings in overhead arc when Space is pressed
- Purpose: Primary combat mechanic for defeating enemies
- Trigger: Space bar press
- Progression: Attack input → Play swing animation → Check hitbox overlap with enemies → Deal damage → Return to idle
- Success criteria: Satisfying swing animation, clear hit feedback, enemies take damage and die appropriately

**Level Environment**
- Functionality: Generated terrain with dirt base, grass layer on top, growing plants
- Purpose: Creates the playable space and visual environment
- Trigger: Level initialization, ongoing plant growth
- Progression: Generate base terrain → Place grass layer → Spawn plants → Grow plants over time
- Success criteria: Visually distinct layers, plants grow realistically, terrain is playable

## Edge Case Handling

- **Player Falls Through Floor**: Collision detection ensures player doesn't phase through settled particles even when they shift
- **Enemy Stuck in Terrain**: Enemies check if stuck and can jump vertically to escape
- **Particles Overflow**: Grid boundaries prevent particles from going out of bounds
- **Rapid Input Mashing**: Attack cooldown prevents animation breaking from repeated space presses
- **No Valid Enemy Spawn**: Level generator ensures flat areas exist for enemy placement

## Design Direction

The design should evoke a nostalgic, retro game feeling reminiscent of early pixel art games mixed with the satisfying tactility of powder games. The particle aesthetic should feel chunky and readable, with clear visual distinction between material types. The overall mood is adventurous but approachable - challenging gameplay wrapped in a charming pixel aesthetic.

## Color Selection

Pixel art color palette with high contrast and clear material distinction.

- **Primary Color**: Rich Earth Brown (oklch(0.45 0.08 70)) - Represents the dirt particles that make up the majority of the terrain
- **Secondary Colors**: 
  - Grass Green (oklch(0.55 0.15 130)) - Vibrant top layer that contrasts with dirt
  - Plant Green (oklch(0.60 0.18 135)) - Slightly brighter for growing plants
  - Sky Blue (oklch(0.75 0.12 240)) - Clean background representing sky
- **Accent Color**: Sword Silver (oklch(0.70 0.02 260)) - Metallic highlight for weapon, draws attention during combat
- **Foreground/Background Pairings**: 
  - Background (Sky Blue oklch(0.75 0.12 240)): Black text (oklch(0.2 0 0)) - Ratio 5.2:1 ✓
  - Primary (Earth Brown oklch(0.45 0.08 70)): White text (oklch(0.95 0 0)) - Ratio 5.8:1 ✓
  - Accent (Sword Silver oklch(0.70 0.02 260)): Black text (oklch(0.2 0 0)) - Ratio 4.6:1 ✓

## Font Selection

The typeface should be bold, pixelated, and evoke retro gaming while remaining highly readable for UI elements and any on-screen text.

- **Typographic Hierarchy**: 
  - H1 (Game Title): Press Start 2P Bold/32px/tight letter spacing
  - UI Text (Health/Score): Press Start 2P Regular/14px/normal spacing
  - Instructions: Press Start 2P Regular/10px/slightly loose spacing for readability

## Animations

Animations should enhance the retro game feel with snappy, frame-based movements rather than smooth tweens. The sword swing should have 3-4 distinct frames creating a satisfying arc. Player movement is frame-stepped (every few pixels) rather than perfectly smooth. Enemy jump has a brief squat anticipation before launching. Particle movements are immediate and physics-based, creating cascading effects when disturbed.

## Component Selection

- **Components**: 
  - Card (for game container with pixel-art borders)
  - Button (for any menu/restart functionality with pixel styling)
  - Progress bar (for health display with chunky pixel aesthetic)
- **Customizations**: 
  - Canvas component for entire game rendering (particle grid, player, enemies, effects)
  - Pixel-style borders using repeated small square patterns
  - Chunky rounded corners (--radius: 0px) for authentic pixel feel
- **States**: 
  - Buttons have distinct pressed state with 2px offset
  - Health bar uses color transitions (green → yellow → red) at thresholds
  - Canvas cursor changes during attack (crosshair → sword icon)
- **Icon Selection**: 
  - Sword (PhosphorIcons) for weapon indicator
  - Heart (PhosphorIcons) for health display
  - Play/Pause (PhosphorIcons) for game controls
- **Spacing**: 
  - Tight spacing throughout (space-1, space-2) for compact retro feel
  - Canvas takes full available space with minimal padding
  - UI overlays positioned at screen edges with 8px (space-2) margins
- **Mobile**: 
  - Canvas scales to fit viewport while maintaining aspect ratio
  - Virtual button controls overlay bottom corners for touch input
  - Health/score UI positioned at top with larger touch targets

const canvas = new myCanvas();
canvas.draw();

// Early declarations for values used by menu wiring
let gameStartTs = 0;
let gameStarted = false;
let spawnIntervalMs = (window.CONFIG && window.CONFIG.spawn && window.CONFIG.spawn.intervalMs) || 800; // overridden by difficulty

// SFX
const cometSound = new Audio('comet.wav');
cometSound.volume = 0.6;
const explosionSound = new Audio('explosion.wav');
explosionSound.volume = 0.7;
const zapSound = new Audio('zap.mp3');
zapSound.volume = 0.8;
const finalSound = new Audio('final.mp3');
finalSound.volume = 0.9;

// Menu wiring
const menuEl = document.getElementById('menu');
const startBtn = document.getElementById('start-btn');
const restartOverlay = document.getElementById('restart-overlay');
const restartBtn = document.getElementById('restart-btn');
const diffSel = document.getElementById('difficulty');
// Restart logic (after elements exist)
if (restartBtn) {
    restartBtn.addEventListener('click', () => {
        // reset entities and timers
        enemies.length = 0;
        centerHeal = null;
        comet = null;
        explosion = null;
        lastSpawn = 0;
        lastFrameTs = 0;
        finalDurationMs = 0;
        healsConsumed = 0;
        speedBonusHeals = 0;
        worldDistance = 0;
        lastCometHealTrigger = 0;
        nextCometAt = 0;
        shakeTimeMs = 0;
        hurtFlashMs = 0;
        // reset car
        car.posX = carConfig.pos.x;
        car.posY = carConfig.pos.y;
        car.velocityX = 0;
        car.velocityY = 0;
        car.health = car.maxHealth;
        car.hitCount = 0;
        car.baseMaxSpeed = (window.CONFIG && window.CONFIG.speed && window.CONFIG.speed.base) || car.baseMaxSpeed || car.maxSpeed;
        car.maxSpeed = car.baseMaxSpeed;
        car.speedBoostTimerMs = 0;
        if (car.spaceMusic) { try { car.spaceMusic.pause(); } catch (e) {} car.spaceMusicPlaying = false; car.spaceMusic.currentTime = 0; }

        gameOver = false;
        gameStarted = true;
        gameStartTs = performance.now();
        if (restartOverlay) restartOverlay.style.display = 'none';
    });
}

function applyDifficulty(value) {
    // Adjust spawn rate and maybe asteroid speed in future
    if (value === 'easy') {
        spawnIntervalMs = 1200;
    } else if (value === 'hard') {
        spawnIntervalMs = 500;
    } else {
        spawnIntervalMs = 800;
    }
}

if (diffSel) {
    applyDifficulty(diffSel.value);
    diffSel.addEventListener('change', (e) => applyDifficulty(e.target.value));
}

if (startBtn) {
    startBtn.addEventListener('click', () => {
        gameStarted = true;
        gameStartTs = performance.now();
        if (menuEl) menuEl.style.display = 'none';
        if (restartOverlay) restartOverlay.style.display = 'none';
        // Unlock/prime audio on first user gesture
        [cometSound, explosionSound, zapSound, finalSound].forEach(a => {
            try { a.play().then(() => { a.pause(); a.currentTime = 0; }).catch(() => {}); } catch (e) {}
        });
    });
}

const carConfig = {
    pos: { x: 100, y: 100 },
    size: (window.CONFIG && window.CONFIG.player && window.CONFIG.player.size) || { w: 52, h: 26 },
    color: '#9C27B0'
}
// Position car at bottom-center at start
carConfig.pos = {
    x: Math.floor((canvas.width - carConfig.size.w) / 2),
    y: canvas.height - carConfig.size.h - 20
}

const car = new Car(carConfig.pos, carConfig.size, carConfig.color);
car.setControls();

// Enemies setup
const enemies = [];
let lastSpawn = 0;
let lastFrameTs = 0;
const targetDelta = 1000 / 100; // ~100 FPS

// Rare center heal orb state
let centerHeal = null; // instance of CenterHeal or null
let centerHealCooldownUntil = 0; // ms timestamp when it can spawn again

// Game timing and state
let gameOver = false;
let finalDurationMs = 0;
let healsConsumed = 0;
let speedBonusHeals = 0; // cumulative heals that increase ship speed
let worldDistance = 0; // in world px
let lastCometHealTrigger = 0;

// Comets (visual only)
let comet = null;
let nextCometAt = 0;
// Explosion particles
let explosion = null;
// Hit feedback
let shakeTimeMs = 0;
let hurtFlashMs = 0;
// Shockwave visuals
const shockwaves = [];

function run(ts) {
    // Throttle to target FPS
    if (!lastFrameTs) lastFrameTs = ts || performance.now();
    const elapsed = (ts || performance.now()) - lastFrameTs;
    const dt = elapsed / 1000; // seconds
    if (elapsed < targetDelta) {
        requestAnimationFrame(run);
        return;
    }
    lastFrameTs = ts || performance.now();

    canvas.clear();
    // Advance camera based on car movement (parallax follow)
    if (gameStarted && !gameOver) {
        // Parallax follow: match screen displacement of the ship
        // Ship screen delta uses velocity * dt * 60 in Car.update()
        const dx = car.velocityX * dt * 60;
        const dy = car.velocityY * dt * 60;
        const parallax = (window.CONFIG && window.CONFIG.parallax && window.CONFIG.parallax.factor) || 0.5; // increase for faster background motion
        canvas.cameraX += dx * parallax;
        canvas.cameraY += dy * parallax;
        worldDistance += Math.hypot(dx, dy) * parallax;
    }
    canvas.draw();

    const ctx = canvas.getContext();

    if (gameStarted && !gameStartTs) gameStartTs = ts || performance.now();

    if (gameStarted && !gameOver) {
        car.controls.update(dt);
        car.update(dt);
    }

    // Apply screen shake
    if (shakeTimeMs > 0) {
        const t = Math.min(1, shakeTimeMs / 300);
        const intensity = 6 * t; // px
        const ox = (Math.random() - 0.5) * 2 * intensity;
        const oy = (Math.random() - 0.5) * 2 * intensity;
        ctx.save();
        ctx.translate(ox, oy);
    } else {
        ctx.save();
    }

    car.draw(ctx);

    // Spawn enemies
    const nowTs = ts || performance.now();
    if (gameStarted && !gameOver && (nowTs - lastSpawn > spawnIntervalMs)) {
        const burstMin = (window.CONFIG && window.CONFIG.spawn && window.CONFIG.spawn.burstMin) || 1;
        const burstMax = (window.CONFIG && window.CONFIG.spawn && window.CONFIG.spawn.burstMax) || 3;
        const batch = Math.floor(burstMin + Math.random() * (burstMax - burstMin + 1));
        for (let i = 0; i < batch; i++) {
            enemies.push(new Enemy(canvas.width, canvas.height));
        }
        lastSpawn = nowTs;
    }

    // Spawn rare center heal orb
    if (gameStarted && !centerHeal && nowTs > centerHealCooldownUntil) {
        const moonChance = (window.CONFIG && window.CONFIG.moon && window.CONFIG.moon.spawnChance) || 0.003;
        if (Math.random() < moonChance) {
            centerHeal = new CenterHeal(canvas.width, canvas.height);
        }
    }

    // Spawn a comet every so often (purely visual)
    if (gameStarted && !comet && nowTs >= nextCometAt) {
        const winChance = (window.CONFIG && window.CONFIG.comet && window.CONFIG.comet.windowChance) || 0.01;
        if (Math.random() < winChance) {
            comet = new Comet(canvas.width, canvas.height);
            try { cometSound.currentTime = 0; cometSound.play().catch(() => {}); } catch (e) {}
        }
        // schedule next window 5–15s later
        if (!comet) {
            const range = (window.CONFIG && window.CONFIG.comet && window.CONFIG.comet.windowDelayRange) || [5000, 15000];
            nextCometAt = nowTs + (range[0] + Math.random() * (range[1] - range[0]));
        }
    }

    // Update and draw enemies; remove those off-screen or on collision
    for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        if (!gameOver) e.update();
        e.draw(ctx);
        // Off-screen check (beyond any edge)
        if (
            e.posY > canvas.height + e.height ||
            e.posY + e.height < -e.height ||
            e.posX > canvas.width + e.width ||
            e.posX + e.width < -e.width
        ) {
            enemies.splice(i, 1);
            continue;
        }

        // Collision: circle (enemy) vs axis-aligned rectangle (car bounds)
        const circleX = e.posX;
        const circleY = e.posY;
        const radius = e.radius;
        const rectX = car.posX;
        const rectY = car.posY;
        const rectW = car.width;
        const rectH = car.height;
        const closestX = Math.max(rectX, Math.min(circleX, rectX + rectW));
        const closestY = Math.max(rectY, Math.min(circleY, rectY + rectH));
        const dx = circleX - closestX;
        const dy = circleY - closestY;
        const intersects = (dx * dx + dy * dy) <= (radius * radius);
        if (intersects) {
            // Handle dark/light enemy effects
            if (e.isSpeedBoost) {
                // Configurable, size-scaled speed boost
                car.applySpeedBoost();
                car.triggerFeedback('heal');
            } else if (e.isDark) {
                car.hitCount++;
                car.health = Math.max(0, car.health - 1 / 3);
                try { zapSound.currentTime = 0; zapSound.play().catch(() => {}); } catch (e) {}
                car.triggerFeedback('hit');
                // hit feedback
                shakeTimeMs = 250;
                hurtFlashMs = 180;
                if (car.hitCount >= 3 || car.health <= 0) {
                    // Game over: record final duration and stop gameplay updates
                    gameOver = true;
                    finalDurationMs = nowTs - gameStartTs;
                    // Final SFX
                    try { finalSound.currentTime = 0; finalSound.play().catch(() => {}); } catch (e) {}
                    // Stop background music
                    if (car.spaceMusic && car.spaceMusicPlaying) {
                        try { car.spaceMusic.pause(); } catch (e) {}
                        car.spaceMusicPlaying = false;
                    }
                    // Trigger explosion particles
                    startExplosion(car.posX + car.width / 2, car.posY + car.height / 2);
                    // Show restart button
                    if (restartOverlay) restartOverlay.style.display = 'flex';
                }
            } else {
                // Light enemies heal a bit
                car.health = Math.min(car.maxHealth, car.health + 0.1);
                car.triggerFeedback('heal');
                healsConsumed += 1;
                speedBonusHeals += 1;
                applySpeedScaling();
                // Spawn a comet immediately on normal heal pickup (if none active)
                if (!comet) {
                    comet = new Comet(canvas.width, canvas.height);
                    nextCometAt = (ts || performance.now()) + (5000 + Math.random() * 10000);
                    lastCometHealTrigger = healsConsumed;
                }
                // Trigger comet on every N heals
                const everyN = (window.CONFIG && window.CONFIG.comet && window.CONFIG.comet.healTriggerEvery) || 5;
                if (!comet && healsConsumed > 0 && healsConsumed % everyN === 0 && lastCometHealTrigger !== healsConsumed) {
                    comet = new Comet(canvas.width, canvas.height);
                    lastCometHealTrigger = healsConsumed;
                    const range = (window.CONFIG && window.CONFIG.comet && window.CONFIG.comet.windowDelayRange) || [5000, 15000];
                    nextCometAt = nowTs + (range[0] + Math.random() * (range[1] - range[0]));
                }
            }
            enemies.splice(i, 1);
        }
    }

    // Draw and collide center heal orb
    if (centerHeal) {
        centerHeal.update(nowTs);
        centerHeal.draw(ctx, nowTs);
        // Collision circle (centerHeal) vs rect (car)
        const circleX = centerHeal.posX;
        const circleY = centerHeal.posY;
        const radius = centerHeal.radius;
        const rectX = car.posX;
        const rectY = car.posY;
        const rectW = car.width;
        const rectH = car.height;
        const closestX = Math.max(rectX, Math.min(circleX, rectX + rectW));
        const closestY = Math.max(rectY, Math.min(circleY, rectY + rectH));
        const dx = circleX - closestX;
        const dy = circleY - closestY;
        const intersects = (dx * dx + dy * dy) <= (radius * radius);
        if (intersects) {
            // Heal scales with current moon phase
            const phase = centerHeal.getPhase(nowTs); // 0..1
            const healAmount = phase; // up to full heal at full moon
            car.health = Math.min(car.maxHealth, car.health + healAmount);
            car.hitCount = Math.max(0, Math.floor(car.hitCount * (1 - phase))); // partial reset by phase
            car.triggerFeedback('heal');
            healsConsumed += 1;
            speedBonusHeals += 1;
            applySpeedScaling();
            // Trigger comet on every N heals (moon)
            const everyN2 = (window.CONFIG && window.CONFIG.comet && window.CONFIG.comet.healTriggerEvery) || 5;
            if (!comet && healsConsumed > 0 && healsConsumed % everyN2 === 0 && lastCometHealTrigger !== healsConsumed) {
                comet = new Comet(canvas.width, canvas.height);
                lastCometHealTrigger = healsConsumed;
                const range2 = (window.CONFIG && window.CONFIG.comet && window.CONFIG.comet.windowDelayRange) || [5000, 15000];
                nextCometAt = nowTs + (range2[0] + Math.random() * (range2[1] - range2[0]));
            }
            centerHeal = null;
            centerHealCooldownUntil = nowTs + (10000 + Math.random() * 10000); // 10–20s
        } else if (centerHeal.dead) {
            centerHeal = null;
            centerHealCooldownUntil = nowTs + (10000 + Math.random() * 10000); // 10–20s
        }
    }

    // Restore post-shake transform
    ctx.restore();

    // UI / HUD - Horizontal neon stats
    const pad = 16;
    // Survival time (mm:ss)
    const elapsedMs = gameOver ? finalDurationMs : (gameStarted ? (nowTs - gameStartTs) : 0);
    const minsHud = Math.max(0, Math.floor(elapsedMs / 60000));
    const secsHud = Math.max(0, Math.floor((elapsedMs % 60000) / 1000));

    const stats = [
        `Health: ${(car.health * 100).toFixed(0)}%`,
        `Hits: ${car.hitCount}/3`,
        `Heals: ${healsConsumed}`,
        `Time: ${String(minsHud).padStart(2, '0')}:${String(secsHud).padStart(2, '0')}`
    ];

    ctx.save();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const hudFontSize = (window.CONFIG && window.CONFIG.hud && window.CONFIG.hud.fontSizePx) || 14;
    const neonColor = (window.CONFIG && window.CONFIG.hud && window.CONFIG.hud.neonColor) || '#00E5FF';
    ctx.font = `bold ${hudFontSize}px sans-serif`;
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = neonColor;
    ctx.shadowBlur = 12;
    ctx.strokeStyle = 'rgba(0,229,255,0.6)';
    ctx.lineWidth = 2;

    let x = pad;
    const y = pad;
    const gap = 24; // px between items
    for (let i = 0; i < stats.length; i++) {
        const text = stats[i];
        ctx.strokeText(text, x, y);
        ctx.fillText(text, x, y);
        x += ctx.measureText(text).width + gap;
    }
    ctx.restore();

    // Bottom-left health percent in different color with critical change
    const showBL = (window.CONFIG && window.CONFIG.hud && window.CONFIG.hud.health && window.CONFIG.hud.health.showBottomLeft) !== false;
    if (showBL) {
        const critThresh = (window.CONFIG && window.CONFIG.hud && window.CONFIG.hud.health && window.CONFIG.hud.health.criticalThreshold) || 0.25;
        const normalColor = (window.CONFIG && window.CONFIG.hud && window.CONFIG.hud.health && window.CONFIG.hud.health.normalColor) || '#80FFEA';
        const criticalColor = (window.CONFIG && window.CONFIG.hud && window.CONFIG.hud.health && window.CONFIG.hud.health.criticalColor) || '#FF5252';
        const healthText = `${Math.max(0, Math.min(100, Math.round(car.health * 100)))}%`;
        const color = (car.health <= critThresh) ? criticalColor : normalColor;
        ctx.save();
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        ctx.font = `bold ${hudFontSize}px sans-serif`;
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        const padBL = 16;
        const xBL = padBL;
        const yBL = canvas.height - padBL;
        ctx.strokeText(healthText, xBL, yBL);
        ctx.fillText(healthText, xBL, yBL);
        ctx.restore();
    }

    // Game Over overlay with flashing final score (centered)
    if (gameOver) {
        const mins = Math.floor(finalDurationMs / 60000);
        const secs = Math.floor((finalDurationMs % 60000) / 1000);
        const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        const title = 'GAME OVER';
        const subtitle = `Survival Time: ${timeStr}  |  Heals: ${healsConsumed}`;

        // Flash alpha between 0.3 and 1.0
        const flash = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin((nowTs - (gameStartTs + finalDurationMs)) / 200));

        ctx.save();
        // dimmed panel behind text
        const panelW = Math.min(460, canvas.width - 40);
        const panelH = 120;
        const panelX = (canvas.width - panelW) / 2;
        const panelY = (canvas.height - panelH) / 2 - 20;
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.lineWidth = 2;
        ctx.roundRect ? ctx.roundRect(panelX, panelY, panelW, panelH, 12) : ctx.fillRect(panelX, panelY, panelW, panelH);
        if (!ctx.roundRect) {
            ctx.strokeRect(panelX, panelY, panelW, panelH);
        } else {
            ctx.stroke();
            ctx.fill();
        }

        // animated title/subtitle
        ctx.globalAlpha = flash;
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold 36px sans-serif';
        ctx.fillText(title, canvas.width / 2, canvas.height / 2 - 28);
        ctx.font = '20px sans-serif';
        ctx.fillText(subtitle, canvas.width / 2, canvas.height / 2 + 4);
        ctx.restore();
    }

    // Draw/update comet after UI (it appears above background but below overlay)
    if (comet) {
        comet.update(canvas.width, canvas.height);
        comet.draw(ctx);
        // Check comet collision with enemies (explode on hit)
        const angle = Math.atan2(comet.vy, comet.vx);
        const tx = comet.x - Math.cos(angle) * comet.length;
        const ty = comet.y - Math.sin(angle) * comet.length;
        for (let i = enemies.length - 1; i >= 0; i--) {
            const e = enemies[i];
            // approximate enemy as circle at (posX,posY) with radius e.radius (asteroids/heals/boosters)
            const collided = lineCircleIntersect(comet.x, comet.y, tx, ty, e.posX, e.posY, (e.radius || 12) + comet.thickness);
            if (collided) {
                startExplosion(e.posX, e.posY);
                try { explosionSound.currentTime = 0; explosionSound.play().catch(() => {}); } catch (e) {}
                // Shockwave: push nearby asteroids (isDark) and show ring
                applyShockwave(e.posX, e.posY, 200, 8);
                triggerShockwave(e.posX, e.posY, 220);
                enemies.splice(i, 1);
            }
        }
        if (!comet.alive) {
            comet = null;
            nextCometAt = nowTs + (5000 + Math.random() * 10000);
        }
    }

    // Draw explosion particles if active
    if (explosion) {
        explosion.update();
        explosion.draw(ctx);
        if (explosion.done) explosion = null;
    }

    // Red hurt overlay
    if (hurtFlashMs > 0) {
        const alpha = Math.max(0, Math.min(0.35, hurtFlashMs / 300 * 0.35));
        ctx.save();
        ctx.fillStyle = `rgba(255,0,0,${alpha})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
    }

    // Timers decay
    if (shakeTimeMs > 0) shakeTimeMs = Math.max(0, shakeTimeMs - elapsed);
    if (hurtFlashMs > 0) hurtFlashMs = Math.max(0, hurtFlashMs - elapsed);

    // Draw/update shockwaves
    if (shockwaves.length) {
        for (let i = shockwaves.length - 1; i >= 0; i--) {
            const s = shockwaves[i];
            s.update();
            s.draw(ctx);
            if (s.done) shockwaves.splice(i, 1);
        }
    }

    requestAnimationFrame(run);
}

requestAnimationFrame(run);

// Simple particle explosion system
function startExplosion(x, y) {
    const parts = [];
    const count = 80;
    for (let i = 0; i < count; i++) {
        const ang = Math.random() * Math.PI * 2;
        const sp = 2 + Math.random() * 5;
        parts.push({
            x,
            y,
            vx: Math.cos(ang) * sp,
            vy: Math.sin(ang) * sp,
            life: 40 + Math.floor(Math.random() * 30),
            color: i % 3 === 0 ? '#FFEB3B' : (i % 3 === 1 ? '#FF5722' : '#FFFFFF'),
            size: 2 + Math.random() * 3
        });
    }
    explosion = {
        update() {
            for (const p of parts) {
                if (p.life <= 0) continue;
                p.x += p.vx;
                p.y += p.vy;
                p.vx *= 0.98;
                p.vy *= 0.98;
                p.vy += 0.02; // slight drift
                p.life--;
            }
            this.done = parts.every(p => p.life <= 0);
        },
        draw(ctx) {
            ctx.save();
            for (const p of parts) {
                if (p.life <= 0) continue;
                ctx.globalAlpha = Math.max(0, p.life / 60);
                ctx.fillStyle = p.color;
                ctx.shadowColor = p.color;
                ctx.shadowBlur = 10;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        },
        done: false
    };
}

// Geometry helper: distance from circle to line segment <= radius
function lineCircleIntersect(x1, y1, x2, y2, cx, cy, r) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const l2 = dx * dx + dy * dy;
    if (l2 === 0) {
        const dist2 = (cx - x1) ** 2 + (cy - y1) ** 2;
        return dist2 <= r * r;
    }
    let t = ((cx - x1) * dx + (cy - y1) * dy) / l2;
    t = Math.max(0, Math.min(1, t));
    const px = x1 + t * dx;
    const py = y1 + t * dy;
    const dist2 = (cx - px) ** 2 + (cy - py) ** 2;
    return dist2 <= r * r;
}

// Apply radial shockwave to enemies around (x,y)
function applyShockwave(x, y, radius, strength) {
    for (const e of enemies) {
        if (!e.isDark) continue; // only push asteroids
        const dx = e.posX - x;
        const dy = e.posY - y;
        const dist = Math.hypot(dx, dy);
        if (dist === 0 || dist > radius) continue;
        const falloff = 1 - dist / radius; // linear falloff
        const push = strength * falloff;
        const nx = dx / dist;
        const ny = dy / dist;
        // add impulse
        e.vx = (e.vx || 0) + nx * push;
        e.vy = (e.vy || 0) + ny * push;
    }
}

// Gradual speed scaling per heal
function applySpeedScaling() {
    // Each heal adds a small bonus to baseMaxSpeed, capped
    const base = 10; // matches car initial maxSpeed
    const perHeal = 0.3; // +0.3 speed per heal
    const cap = 18; // soft cap
    const newBase = Math.min(cap, base + speedBonusHeals * perHeal);
    car.baseMaxSpeed = newBase;
    // Reflect immediately if not boosting
    if ((car.speedBoostTimerMs || 0) <= 0) car.maxSpeed = newBase;
}

// Visual shockwave ring
function triggerShockwave(x, y, maxRadius) {
    const ring = {
        x, y,
        r: 0,
        max: maxRadius,
        done: false,
        update() {
            this.r += 6; // expansion speed
            if (this.r >= this.max) this.done = true;
        },
        draw(ctx) {
            const alpha = Math.max(0, 1 - this.r / this.max);
            ctx.save();
            ctx.globalAlpha = alpha * 0.8;
            ctx.strokeStyle = 'rgba(255,255,255,0.9)';
            ctx.lineWidth = 3;
            ctx.shadowColor = '#90CAF9';
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }
    };
    shockwaves.push(ring);
}
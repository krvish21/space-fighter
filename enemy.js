class Enemy {
    constructor(canvasWidth, canvasHeight) {
        this.radius = 10 + Math.floor(Math.random() * 16);
        this.shadowBlur = 15;

        // Explicit type and color:
        // isDark = asteroid (rock), healer = bright yellow, speedBoost = pink
        // Bias toward more asteroids and fewer boosters
        const roll = Math.random();
        this.isSpeedBoost = roll < 0.12;
        this.isDark = !this.isSpeedBoost && Math.random() < 0.9;
        this.isHeal = !this.isSpeedBoost && !this.isDark;

        if (this.isSpeedBoost) {
            this.color = '#FF69B4'; // pink
        } else if (this.isDark) {
            // asteroid rock color (brownish)
            this.color = '#8D6E63'; // brown
        } else {
            this.color = '#FFEA00'; // bright yellow
        }

        // Size variation: diversify asteroid sizes
        if (this.isDark) {
            const bucket = Math.random();
            if (bucket < 0.5) {
                this.radius = 8 + Math.floor(Math.random() * 8);   // small
            } else if (bucket < 0.85) {
                this.radius = 16 + Math.floor(Math.random() * 14); // medium
            } else {
                this.radius = 30 + Math.floor(Math.random() * 20); // large
            }
        }

        const side = Math.floor(Math.random() * 8); // 0..3 edges, 4..7 corners
        let speed = 1.5 + Math.random() * 2.2;
        if (this.isDark) {
            const sizeFactor = Math.max(0.6, 22 / (this.radius || 22));
            speed *= 2 * sizeFactor;
        }
        if (side === 0) {
            // Top
            this.posX = Math.floor(Math.random() * Math.max(1, canvasWidth - this.radius * 2));
            this.posY = -this.radius * 2;
            this.vx = 0;
            this.vy = speed;
        } else if (side === 1) {
            // Bottom
            this.posX = Math.floor(Math.random() * Math.max(1, canvasWidth - this.radius * 2));
            this.posY = canvasHeight + this.radius * 2;
            this.vx = 0;
            this.vy = -speed;
        } else if (side === 2) {
            // Left
            this.posX = -this.radius * 2;
            this.posY = Math.floor(Math.random() * Math.max(1, canvasHeight - this.radius * 2));
            this.vx = speed;
            this.vy = 0;
        } else if (side === 3) {
            // Right
            this.posX = canvasWidth + this.radius * 2;
            this.posY = Math.floor(Math.random() * Math.max(1, canvasHeight - this.radius * 2));
            this.vx = -speed;
            this.vy = 0;
        } else if (side === 4) {
            // Top-left corner
            this.posX = -this.radius * 2;
            this.posY = -this.radius * 2;
            const d = speed * 0.70710678; // sqrt(1/2)
            this.vx = d;
            this.vy = d;
        } else if (side === 5) {
            // Top-right corner
            this.posX = canvasWidth + this.radius * 2;
            this.posY = -this.radius * 2;
            const d = speed * 0.70710678;
            this.vx = -d;
            this.vy = d;
        } else if (side === 6) {
            // Bottom-left corner
            this.posX = -this.radius * 2;
            this.posY = canvasHeight + this.radius * 2;
            const d = speed * 0.70710678;
            this.vx = d;
            this.vy = -d;
        } else {
            // Bottom-right corner
            this.posX = canvasWidth + this.radius * 2;
            this.posY = canvasHeight + this.radius * 2;
            const d = speed * 0.70710678;
            this.vx = -d;
            this.vy = -d;
        }
    }

    update() {
        this.posX += this.vx;
        this.posY += this.vy;
        if (this.isDark && this.rotSpeed !== undefined) {
            this.rot += this.rotSpeed;
        }
    }

    draw(ctx) {
        ctx.shadowColor = this.color;
        ctx.shadowBlur = this.shadowBlur;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        if (this.isDark) {
            // Draw irregular asteroid polygon
            if (!this.verts) {
                const vertexCount = 8 + Math.floor(Math.random() * 5); // 8-12 vertices
                this.verts = [];
                for (let i = 0; i < vertexCount; i++) {
                    const angle = (i / vertexCount) * Math.PI * 2;
                    const jitter = 0.6 + Math.random() * 0.6; // 0.6 - 1.2
                    this.verts.push({ angle, radius: this.radius * jitter });
                }
                this.rot = Math.random() * Math.PI * 2;
                this.rotSpeed = (Math.random() * 0.02 - 0.01); // -0.01 to 0.01 rad/frame
            }
            ctx.save();
            ctx.translate(this.posX, this.posY);
            ctx.rotate(this.rot);
            ctx.fillStyle = this.color;
            ctx.strokeStyle = '#6D4C41'; // darker brown stroke
            ctx.lineWidth = 1;
            ctx.beginPath();
            for (let i = 0; i < this.verts.length; i++) {
                const v = this.verts[i];
                const x = Math.cos(v.angle) * v.radius;
                const y = Math.sin(v.angle) * v.radius;
                if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            // crater dots
            ctx.globalAlpha = 0.25;
            ctx.fillStyle = '#5D4037'; // crater brown
            for (let i = 0; i < 3; i++) {
                const a = Math.random() * Math.PI * 2;
                const rr = this.radius * (0.2 + Math.random() * 0.5);
                const cx = Math.cos(a) * (this.radius * 0.4 * Math.random());
                const cy = Math.sin(a) * (this.radius * 0.4 * Math.random());
                ctx.beginPath();
                ctx.arc(cx, cy, rr * 0.15, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
            ctx.restore();
        } else {
            if (this.isSpeedBoost) {
                // Pink lightning bolt with glow
                const angle = Math.atan2(this.vy, this.vx);
                ctx.save();
                ctx.translate(this.posX, this.posY);
                ctx.rotate(angle);
                ctx.shadowColor = '#FF69B4';
                ctx.shadowBlur = 20;
                ctx.fillStyle = '#FF69B4';
                ctx.strokeStyle = '#FFFFFF';
                ctx.lineWidth = 1;
                const s = Math.max(10, this.radius * 1.6);
                ctx.beginPath();
                ctx.moveTo(-s * 0.3, -s * 0.6);
                ctx.lineTo(s * 0.1, -s * 0.1);
                ctx.lineTo(-s * 0.05, -s * 0.1);
                ctx.lineTo(s * 0.3, s * 0.6);
                ctx.lineTo(-s * 0.1, s * 0.1);
                ctx.lineTo(s * 0.05, s * 0.1);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                ctx.restore();
            } else if (this.isHeal) {
                // Gold ring with plus icon
                ctx.save();
                ctx.shadowColor = '#FFD54F';
                ctx.shadowBlur = 12;
                ctx.strokeStyle = '#FFC107';
                ctx.lineWidth = Math.max(3, this.radius * 0.4);
                ctx.beginPath();
                ctx.arc(this.posX, this.posY, this.radius, 0, Math.PI * 2);
                ctx.stroke();
                // inner thin ring highlight
                ctx.shadowBlur = 0;
                ctx.strokeStyle = '#FFECB3';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(this.posX, this.posY, this.radius * 0.7, 0, Math.PI * 2);
                ctx.stroke();
                // plus sign
                ctx.strokeStyle = '#FFF59D';
                ctx.lineWidth = Math.max(2, this.radius * 0.2);
                const p = this.radius * 0.5;
                ctx.beginPath();
                ctx.moveTo(this.posX - p, this.posY);
                ctx.lineTo(this.posX + p, this.posY);
                ctx.moveTo(this.posX, this.posY - p);
                ctx.lineTo(this.posX, this.posY + p);
                ctx.stroke();
                ctx.restore();
            } else {
                // fallback circle
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.arc(this.posX, this.posY, this.radius, 0, Math.PI * 2);
                ctx.closePath();
                ctx.fill();
            }
        }

        // reset shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
    }
}

// Special green heal that spawns at center, does not move
class CenterHeal {
    constructor(canvasWidth, canvasHeight) {
        this.radius = 40; // bigger moon
        this.color = '#FDD835'; // deeper moon yellow (no white look)
        this.shadowBlur = 0; // no glow
        // spawn at random on-screen position with padding for full visibility
        const padX = this.radius + 4;
        const padY = this.radius + 4;
        this.posX = Math.floor(padX + Math.random() * Math.max(1, canvasWidth - padX * 2));
        this.posY = Math.floor(padY + Math.random() * Math.max(1, canvasHeight - padY * 2));

        // Waning mask color (edge/cover tint)
        this.maskColor = '#0F1020';

        // Phase timing
        this.spawnTs = 0; // set on first update call
        this.lifetimeMs = 8000 + Math.floor(Math.random() * 6000); // 8-14s
        this.dead = false;
    }

    update(nowTs) {
        if (!this.spawnTs) this.spawnTs = nowTs;
        const elapsed = nowTs - this.spawnTs;
        if (elapsed >= this.lifetimeMs) {
            this.dead = true;
        }
    }

    // Phase [0..1], 1 = full moon, 0 = no moon
    getPhase(nowTs) {
        if (!this.spawnTs) return 1;
        const remaining = Math.max(0, this.lifetimeMs - (nowTs - this.spawnTs));
        return remaining / this.lifetimeMs;
    }

    draw(ctx, nowTs) {
        // Use offscreen buffer so masking only affects the moon, not background
        if (!this.buf) {
            this.buf = document.createElement('canvas');
            this.buf.width = this.radius * 2 + 2;
            this.buf.height = this.radius * 2 + 2;
            this.bctx = this.buf.getContext('2d');
        }
        const bctx = this.bctx;
        // Resize buffer if radius changed
        const targetW = this.radius * 2 + 2;
        const targetH = this.radius * 2 + 2;
        if (this.buf.width !== targetW || this.buf.height !== targetH) {
            this.buf.width = targetW;
            this.buf.height = targetH;
        }

        // Clear buffer
        bctx.clearRect(0, 0, this.buf.width, this.buf.height);

        // Draw full moon disc into buffer
        bctx.fillStyle = this.color;
        bctx.beginPath();
        bctx.arc(this.radius + 1, this.radius + 1, this.radius, 0, Math.PI * 2);
        bctx.closePath();
        bctx.fill();
        // subtle outline
        bctx.strokeStyle = '#F9A825';
        bctx.lineWidth = 2;
        bctx.stroke();

        // Mask with waning circle in buffer only
        const phase = this.getPhase(nowTs);
        // Start fully off to the left at full moon (-2R), approach center (0) as it wanes
        let offset = -this.radius * 2 * phase; // range [-2R, 0]
        if (offset < -this.radius * 2) offset = -this.radius * 2;
        if (offset > 0) offset = 0;
        bctx.save();
        bctx.globalCompositeOperation = 'destination-out';
        bctx.beginPath();
        bctx.arc(this.radius + 1 + offset, this.radius + 1, this.radius, 0, Math.PI * 2);
        bctx.closePath();
        bctx.fillStyle = this.maskColor;
        bctx.fill();
        bctx.restore();

        // Draw buffer onto main canvas at moon position
        ctx.drawImage(this.buf, Math.round(this.posX - this.radius - 1), Math.round(this.posY - this.radius - 1));

        // reset shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
    }
}

// Visual-only comet shooting across the sky
class Comet {
    constructor(canvasWidth, canvasHeight) {
        // Visual sizing first (so margins can account for size)
        this.length = 180 + Math.random() * 120; // more natural
        this.thickness = 3 + Math.random() * 2;  // slimmer core
        this.color = 'rgba(255,255,255,0.98)';
        this.glow = 18; // subtler glow
        const speed = 9 + Math.random() * 6; // fast but not arcade-fast

        // Choose a start point on screen edge and a target on the opposite edge
        const side = Math.floor(Math.random() * 4);
        const margin = Math.max(40, this.thickness * 5 + this.glow); // ensure on-screen head
        let x0, y0, x1, y1;
        if (side === 0) { // top -> bottom
            x0 = margin + Math.random() * (canvasWidth - margin * 2);
            y0 = margin;
            x1 = margin + Math.random() * (canvasWidth - margin * 2);
            y1 = canvasHeight - margin;
        } else if (side === 1) { // bottom -> top
            x0 = margin + Math.random() * (canvasWidth - margin * 2);
            y0 = canvasHeight - margin;
            x1 = margin + Math.random() * (canvasWidth - margin * 2);
            y1 = margin;
        } else if (side === 2) { // left -> right
            x0 = margin;
            y0 = margin + Math.random() * (canvasHeight - margin * 2);
            x1 = canvasWidth - margin;
            y1 = margin + Math.random() * (canvasHeight - margin * 2);
        } else { // right -> left
            x0 = canvasWidth - margin;
            y0 = margin + Math.random() * (canvasHeight - margin * 2);
            x1 = margin;
            y1 = margin + Math.random() * (canvasHeight - margin * 2);
        }
        this.x = x0;
        this.y = y0;
        const dirx = x1 - x0;
        const diry = y1 - y0;
        const len = Math.hypot(dirx, diry) || 1;
        this.vx = (dirx / len) * speed;
        this.vy = (diry / len) * speed;
        this.alive = true;
        this.life = 160 + Math.floor(Math.random() * 80); // frames
        // dust particles along the trail (subtle)
        this.sparkles = [];
    }

    update(canvasWidth, canvasHeight) {
        this.x += this.vx;
        this.y += this.vy;
        this.life--;
        // emit sparkles
        if (this.life % 3 === 0) {
            this.sparkles.push({
                x: this.x,
                y: this.y,
                vx: -this.vx * 0.1 + (Math.random() - 0.5) * 0.4,
                vy: -this.vy * 0.1 + (Math.random() - 0.5) * 0.4,
                size: 1 + Math.random() * 2,
                life: 18 + Math.floor(Math.random() * 14),
                hue: 205 + Math.random() * 15 // pale cyan-blue
            });
        }
        // update sparkles
        for (const s of this.sparkles) {
            s.x += s.vx;
            s.y += s.vy;
            s.vx *= 0.98; s.vy *= 0.98;
            s.life--;
        }
        // remove dead sparkles
        this.sparkles = this.sparkles.filter(s => s.life > 0);
        if (this.life <= 0 || this.x < -200 || this.x > canvasWidth + 200 || this.y < -200 || this.y > canvasHeight + 200) {
            this.alive = false;
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.lineCap = 'round';
        // Realistic trail: faint bluish plume with bright white core
        const angle = Math.atan2(this.vy, this.vx);
        const tx = this.x - Math.cos(angle) * this.length;
        const ty = this.y - Math.sin(angle) * this.length;
        const gradSoft = ctx.createLinearGradient(this.x, this.y, tx, ty);
        gradSoft.addColorStop(0, 'rgba(255,255,255,0.85)');
        gradSoft.addColorStop(0.35, 'rgba(173,216,230,0.45)'); // light blue
        gradSoft.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.shadowColor = '#FFFFFF';
        ctx.shadowBlur = this.glow;
        ctx.strokeStyle = gradSoft;
        ctx.lineWidth = this.thickness * 2.0;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(tx, ty);
        ctx.stroke();

        // Bright core stroke (white to transparent)
        const gradCore = ctx.createLinearGradient(this.x, this.y, tx, ty);
        gradCore.addColorStop(0, 'rgba(255,255,255,1)');
        gradCore.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.shadowBlur = this.glow * 0.5;
        ctx.strokeStyle = gradCore;
        ctx.lineWidth = this.thickness;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(tx, ty);
        ctx.stroke();

        // Comet head (bright nucleus glow)
        const headGrad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.thickness * 2.2);
        headGrad.addColorStop(0, 'rgba(255,255,255,1)');
        headGrad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = headGrad;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.thickness * 2.2, 0, Math.PI * 2);
        ctx.fill();

        // Dust sparkles (additive blend, subtle)
        ctx.globalCompositeOperation = 'lighter';
        for (const s of this.sparkles) {
            const alpha = Math.max(0, s.life / 28);
            ctx.fillStyle = `hsla(${s.hue}, 90%, 75%, ${alpha})`;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';

        ctx.restore();
    }
}



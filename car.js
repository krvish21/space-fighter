class Car {
    constructor(pos, size, color) {
        this.posX = pos.x;
        this.posY = pos.y;
        this.width = size.w;
        this.height = size.h;
        this.color = color;
        this.glowColor = '';
        this.glowBlur = 3;

        this.velocityX = 0;
        this.velocityY = 0;
        this.maxSpeed = 25; // higher base speed
        this.acceleration = 1; // snappier acceleration
        this.deceleration = 0.2;
        this.rotation = 0;
        this.targetRotation = 0;
        this.rotationSpeed = 0.1;

        this.isDriving = false;
        this.drivingSound = new Audio('drive-sound.mp3');
        this.drivingSound.loop = true;
        this.drivingSound.volume = 0.5;
        this.audioPlaying = false;

		// Background space music
		this.spaceMusic = new Audio('space.mp3');
		this.spaceMusic.loop = true;
		this.spaceMusic.volume = 0.4;
		this.spaceMusicPlaying = false;

        // Spaceship render state
        this.thrustPhase = 0;

        // Feedback visuals
        this.feedbackTimer = 0; // frames remaining
        this.feedbackColor = 'transparent';

        // Health system
        this.maxHealth = 1.0; // normalized 0..1
        this.health = this.maxHealth;
        this.hitCount = 0;
        this.healthDecayPerFrame = 0.0001; // slow drain per frame

        // Speed boost
		this.baseMaxSpeed = (window.CONFIG && window.CONFIG.speed && window.CONFIG.speed.base) || this.maxSpeed;
		this.speedBoostTimerMs = 0; // milliseconds remaining
		this.speedBoostAmount = 0; // computed extra speed during boost
    }

    draw(ctx) {
        ctx.save();

        ctx.translate(this.posX + this.width / 2, this.posY + this.height / 2);
        ctx.rotate(this.rotation);

        ctx.shadowColor = this.glowColor;
        ctx.shadowBlur = this.glowBlur;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        // Draw fighter-jet style spaceship
        const w = this.width;
        const h = this.height;

        // Main fuselage (sleek arrow with spine)
        ctx.fillStyle = '#CFD8DC';
        ctx.strokeStyle = '#90A4AE';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(w * 0.55, 0);               // sharp nose
        ctx.lineTo(w * 0.15, -h * 0.22);
        ctx.lineTo(-w * 0.35, -h * 0.28);      // aft taper top
        ctx.lineTo(-w * 0.35, h * 0.28);       // aft taper bottom
        ctx.lineTo(w * 0.15, h * 0.22);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Canopy (cockpit bubble)
        ctx.fillStyle = '#64B5F6';
        ctx.strokeStyle = '#1E88E5';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(w * 0.05, -h * 0.08, w * 0.16, h * 0.18, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Swept wings
        ctx.fillStyle = '#B0BEC5';
        ctx.strokeStyle = '#90A4AE';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(w * 0.05, -h * 0.18);
        ctx.lineTo(-w * 0.15, -h * 0.05);
        ctx.lineTo(-w * 0.45, -h * 0.30);
        ctx.lineTo(-w * 0.2, -h * 0.38);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(w * 0.05, h * 0.18);
        ctx.lineTo(-w * 0.15, h * 0.05);
        ctx.lineTo(-w * 0.45, h * 0.30);
        ctx.lineTo(-w * 0.2, h * 0.38);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Tail fins (vertical stabilizers)
        ctx.fillStyle = '#B0BEC5';
        ctx.beginPath();
        ctx.moveTo(-w * 0.30, -h * 0.16);
        ctx.lineTo(-w * 0.42, -h * 0.04);
        ctx.lineTo(-w * 0.30, -h * 0.00);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-w * 0.30, h * 0.16);
        ctx.lineTo(-w * 0.42, h * 0.04);
        ctx.lineTo(-w * 0.30, h * 0.00);
        ctx.closePath();
        ctx.fill();

        // Thruster flame (animated)
        const speed = Math.hypot(this.velocityX, this.velocityY);
        const thrust = Math.min(1, speed / (this.maxSpeed || 1)) * 1.1 + (this.speedBoostTimer > 0 ? 0.4 : 0);
        const flameLen = w * (0.4 + thrust * 0.8);
        const flicker = (Math.sin(this.thrustPhase) + 1) * 0.5; // 0..1
        const len = flameLen * (0.8 + 0.2 * flicker);
        ctx.save();
        ctx.translate(-w * 0.42, 0); // rear origin
        const grad = ctx.createLinearGradient(-len, 0, 0, 0);
        grad.addColorStop(0, 'rgba(255,140,0,0.0)');
        grad.addColorStop(0.4, 'rgba(255,87,34,0.8)');
        grad.addColorStop(1, 'rgba(255,235,59,0.9)');
        ctx.fillStyle = grad;
        ctx.shadowColor = '#FFEB3B';
        ctx.shadowBlur = 15 + 10 * thrust;
        ctx.beginPath();
        ctx.moveTo(-len, 0);
        ctx.quadraticCurveTo(-len * 0.5, -h * 0.2, 0, -h * 0.12);
        ctx.lineTo(0, h * 0.12);
        ctx.quadraticCurveTo(-len * 0.5, h * 0.2, -len, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

		// Feedback rectangle removed

        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'transparent';

        ctx.restore();
    }

    update(dt) {
        // Time-based acceleration and friction integration
        const accel = this.acceleration * 60; // scale to per-second feel
        const friction = 0.88; // velocity retention per second
        const fx = Math.pow(friction, dt * 60);

        // Desired acceleration from input axes
        const ax = (this.inputAxisX || 0) * accel * dt;
        const ay = (this.inputAxisY || 0) * accel * dt;

        this.velocityX += ax;
        this.velocityY += ay;

        // Clamp max speed smoothly
        const speed = Math.hypot(this.velocityX, this.velocityY);
        const max = this.maxSpeed;
        if (speed > max) {
            const k = max / (speed || 1);
            this.velocityX *= k;
            this.velocityY *= k;
        }

        // Apply friction
        this.velocityX *= fx;
        this.velocityY *= fx;

        this.posX += this.velocityX * dt * 60;
        this.posY += this.velocityY * dt * 60;
        this.thrustPhase += 0.3;

        // Clamp by center using half-diagonal so rotated sprite never clips out
        const canvasW = window.innerWidth;
        const canvasH = window.innerHeight;
        const halfDiagonal = Math.sqrt(this.width * this.width + this.height * this.height) / 2;
        let centerX = this.posX + this.width / 2;
        let centerY = this.posY + this.height / 2;
        if (centerX < halfDiagonal) centerX = halfDiagonal;
        if (centerX > canvasW - halfDiagonal) centerX = canvasW - halfDiagonal;
        if (centerY < halfDiagonal) centerY = halfDiagonal;
        if (centerY > canvasH - halfDiagonal) centerY = canvasH - halfDiagonal;
        this.posX = centerX - this.width / 2;
        this.posY = centerY - this.height / 2;

        let angleDiff = this.targetRotation - this.rotation;

        while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
        while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

        this.rotation += angleDiff * this.rotationSpeed;

        if (this.velocityX > 0) {
            this.velocityX = Math.max(0, this.velocityX - this.deceleration);
        } else if (this.velocityX < 0) {
            this.velocityX = Math.min(0, this.velocityX + this.deceleration);
        }

        if (this.velocityY > 0) {
            this.velocityY = Math.max(0, this.velocityY - this.deceleration);
        } else if (this.velocityY < 0) {
            this.velocityY = Math.min(0, this.velocityY + this.deceleration);
        }

        // Passive health decay
        if (this.health > 0) {
            this.health = Math.max(0, this.health - this.healthDecayPerFrame);
        }

        if (this.feedbackTimer > 0) {
            this.feedbackTimer -= 1;
        }

		// Speed boost countdown and effect (ms-based)
		if (this.speedBoostTimerMs > 0) {
			this.speedBoostTimerMs = Math.max(0, this.speedBoostTimerMs - dt * 1000);
			this.maxSpeed = this.baseMaxSpeed + this.speedBoostAmount;
		} else {
			this.maxSpeed = this.baseMaxSpeed;
		}

		const isMoving = Math.abs(this.velocityX) > 0.1 || Math.abs(this.velocityY) > 0.1;
		if (isMoving && !this.spaceMusicPlaying) {
			this.spaceMusic.play().then(() => {
				this.spaceMusicPlaying = true;
			}).catch(() => { /* ignore autoplay errors */ });
		} else if (!isMoving && this.spaceMusicPlaying) {
			this.spaceMusic.pause();
			this.spaceMusicPlaying = false;
		}
    }

    setControls() {
        this.controls = new Controls(this);
    }

	applySpeedBoost() {
		const cfg = (window.CONFIG && window.CONFIG.player && window.CONFIG.player.speedBoost) || {};
		const durationMs = cfg.durationMs != null ? cfg.durationMs : 3500;
		const factor = cfg.amountFactor != null ? cfg.amountFactor : 0.5;
		const ref = cfg.sizeReference || { w: 52, h: 26 };
		const useDiag = cfg.useDiagonal !== false; // default true

		// Scale factor based on size
		const sizeScale = useDiag
			? (Math.hypot(this.width, this.height) / Math.hypot(ref.w, ref.h))
			: ((this.width * this.height) / (ref.w * ref.h));

		// Relative boost amount from base
		const base = this.baseMaxSpeed || this.maxSpeed;
		const amount = base * factor * sizeScale;

		this.speedBoostAmount = amount;
		this.speedBoostTimerMs = Math.max(this.speedBoostTimerMs || 0, durationMs);
	}

    triggerFeedback(type) {
        // type: 'hit' | 'heal'
        this.feedbackColor = type === 'hit' ? '#ff5252' : '#69f0ae';
        this.feedbackTimer = 12; // ~200ms at 60fps
    }
}
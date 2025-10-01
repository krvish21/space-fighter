class Controls {
    constructor(obj) {
        this.obj = obj;
        this.keysPressed = new Set();
        // Touch state
        this.touchActive = false;
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.touchAxisX = 0;
        this.touchAxisY = 0;
        this.touchRadius = 60; // px displacement for full input

		// Pointer state (covers mouse + touch)
		this.pointerActive = false;
		this.pointerId = null;
		this.pointerStartX = 0;
		this.pointerStartY = 0;
		this.pointerAxisX = 0;
		this.pointerAxisY = 0;
        this.#eventHandler();
    }

    moveUp = () => {
        this.obj.velocityY = Math.max(-this.obj.maxSpeed, this.obj.velocityY - this.obj.acceleration);
        this.obj.targetRotation = -Math.PI / 2; // Face up
    }

    moveDown = () => {
        this.obj.velocityY = Math.min(this.obj.maxSpeed, this.obj.velocityY + this.obj.acceleration);
        this.obj.targetRotation = Math.PI / 2; // Face down
    }

    moveLeft = () => {
        this.obj.velocityX = Math.max(-this.obj.maxSpeed, this.obj.velocityX - this.obj.acceleration);
        this.obj.targetRotation = Math.PI; // Face left
    }

    moveRight = () => {
        this.obj.velocityX = Math.min(this.obj.maxSpeed, this.obj.velocityX + this.obj.acceleration);
        this.obj.targetRotation = 0; // Face right
    }

    keys = new Map([
        ['ArrowUp', this.moveUp],
        ['ArrowDown', this.moveDown],
        ['ArrowLeft', this.moveLeft],
        ['ArrowRight', this.moveRight]
    ])

    update(dt) {
		// Aggregate input axes (pointer > touch > keys)
        let ax = 0, ay = 0;
		if (this.pointerActive) {
			ax = this.pointerAxisX;
			ay = this.pointerAxisY;
		} else if (this.touchActive) {
            ax = this.touchAxisX;
            ay = this.touchAxisY;
        } else {
            if (this.keysPressed.has('ArrowLeft')) ax -= 1;
            if (this.keysPressed.has('ArrowRight')) ax += 1;
            if (this.keysPressed.has('ArrowUp')) ay -= 1;
            if (this.keysPressed.has('ArrowDown')) ay += 1;
        }
        // Normalize diagonal
        if (ax !== 0 && ay !== 0) { ax *= Math.SQRT1_2; ay *= Math.SQRT1_2; }
        this.obj.inputAxisX = ax;
        this.obj.inputAxisY = ay;
        // Update facing
        if (ax !== 0 || ay !== 0) {
            this.obj.targetRotation = Math.atan2(ay, ax);
        }
    }

    #eventHandler() {
        document.addEventListener('keydown', (e) => {
            const pressedKey = e.key;
            if (this.keys.has(pressedKey) && !this.keysPressed.has(pressedKey)) {
                this.keysPressed.add(pressedKey);
            }
        });

        document.addEventListener('keyup', (e) => {
            const releasedKey = e.key;
            if (this.keysPressed.has(releasedKey)) {
                this.keysPressed.delete(releasedKey);
            }
        });

		// Touch + Pointer controls: drag anywhere to steer
        const canvasEl = document.getElementById('myCanvas');
        if (!canvasEl) return;
		try { canvasEl.style.touchAction = 'none'; } catch (e) {}

        const getTouch = (ev) => (ev.touches && ev.touches[0]) || (ev.changedTouches && ev.changedTouches[0]);
        const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

        canvasEl.addEventListener('touchstart', (ev) => {
            const t = getTouch(ev);
            if (!t) return;
            ev.preventDefault();
            this.touchActive = true;
            this.touchStartX = t.clientX;
            this.touchStartY = t.clientY;
            this.touchAxisX = 0;
            this.touchAxisY = 0;
        }, { passive: false });

        canvasEl.addEventListener('touchmove', (ev) => {
            if (!this.touchActive) return;
            const t = getTouch(ev);
            if (!t) return;
            ev.preventDefault();
            const dx = t.clientX - this.touchStartX;
            const dy = t.clientY - this.touchStartY;
            const ax = clamp(dx / this.touchRadius, -1, 1);
            const ay = clamp(dy / this.touchRadius, -1, 1);
            this.touchAxisX = ax;
            this.touchAxisY = ay;
        }, { passive: false });

        const endTouch = (ev) => {
            if (!this.touchActive) return;
            ev.preventDefault();
            this.touchActive = false;
            this.touchAxisX = 0;
            this.touchAxisY = 0;
        };
        canvasEl.addEventListener('touchend', endTouch, { passive: false });
        canvasEl.addEventListener('touchcancel', endTouch, { passive: false });

		// Pointer Events (covers modern mobile + desktop)
		canvasEl.addEventListener('pointerdown', (ev) => {
			// Only capture primary pointer
			if (this.pointerActive) return;
			this.pointerActive = true;
			this.pointerId = ev.pointerId;
			this.pointerStartX = ev.clientX;
			this.pointerStartY = ev.clientY;
			this.pointerAxisX = 0;
			this.pointerAxisY = 0;
			try { canvasEl.setPointerCapture(ev.pointerId); } catch (e) {}
			if (ev.cancelable) ev.preventDefault();
		}, { passive: false });

		canvasEl.addEventListener('pointermove', (ev) => {
			if (!this.pointerActive || ev.pointerId !== this.pointerId) return;
			const dx = ev.clientX - this.pointerStartX;
			const dy = ev.clientY - this.pointerStartY;
			this.pointerAxisX = clamp(dx / this.touchRadius, -1, 1);
			this.pointerAxisY = clamp(dy / this.touchRadius, -1, 1);
			if (ev.cancelable) ev.preventDefault();
		}, { passive: false });

		const endPointer = (ev) => {
			if (!this.pointerActive || ev.pointerId !== this.pointerId) return;
			this.pointerActive = false;
			this.pointerId = null;
			this.pointerAxisX = 0;
			this.pointerAxisY = 0;
			if (ev.cancelable) ev.preventDefault();
		};
		canvasEl.addEventListener('pointerup', endPointer, { passive: false });
		canvasEl.addEventListener('pointercancel', endPointer, { passive: false });
    }
}
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
        // Aggregate input axes (touch takes priority over keys)
        let ax = 0, ay = 0;
        if (this.touchActive) {
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

        // Touch controls: drag anywhere to steer
        const canvasEl = document.getElementById('myCanvas');
        if (!canvasEl) return;

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
    }
}
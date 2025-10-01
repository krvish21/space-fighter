class Controls {
    constructor(obj) {
        this.obj = obj;
        this.keysPressed = new Set();
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
        // Aggregate input axes
        let ax = 0, ay = 0;
        if (this.keysPressed.has('ArrowLeft')) ax -= 1;
        if (this.keysPressed.has('ArrowRight')) ax += 1;
        if (this.keysPressed.has('ArrowUp')) ay -= 1;
        if (this.keysPressed.has('ArrowDown')) ay += 1;
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
    }
}
class myCanvas {
    constructor() {
        this.canvas = document.querySelector('#myCanvas');
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.ctx = this.canvas.getContext('2d');

        // Starfield setup
        this.stars = [];
        this.starCount = Math.floor((this.width * this.height) / 15000); // density based on area
        for (let i = 0; i < this.starCount; i++) {
            this.stars.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                r: Math.random() * 1.5 + 0.3, // radius 0.3 - 1.8
                a: Math.random() * Math.PI * 2, // phase for twinkle
                s: 0.002 + Math.random() * 0.004, // twinkle speed
                parallax: 0.3 + Math.random() * 0.7 // depth factor 0.3 - 1.0
            });
        }

        // Camera (parallax scroll)
        this.cameraX = 0;
        this.cameraY = 0;
        this.scrollSpeed = 0.4; // baseline for auto-scroll if desired
    }

    draw() {
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        const ctx = this.ctx;
        ctx.fillStyle = '#0F1020';
        ctx.fillRect(0, 0, this.width, this.height);

        // Draw and twinkle stars
        ctx.save();
        for (const star of this.stars) {
            star.a += star.s; // advance phase
            const alpha = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(star.a)); // 0.4 - 1.0
            ctx.globalAlpha = alpha;
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            const sx = (star.x - this.cameraX * star.parallax) % this.width;
            const drawX = sx < 0 ? sx + this.width : sx;
            const sy = (star.y - this.cameraY * star.parallax) % this.height;
            const drawY = sy < 0 ? sy + this.height : sy;
            ctx.arc(drawX, drawY, star.r, 0, Math.PI * 2);
            ctx.closePath();
            ctx.fill();
        }
        ctx.restore();
        ctx.globalAlpha = 1;
    }

    clear() {
        this.ctx.clearRect(0, 0, this.width, this.height);
    }

    getContext() {
        return this.ctx;
    }

    // Advance camera; positive dy scrolls background downward (player feels moving up)
    advanceCamera(dy) {
        this.cameraY += dy;
    }

    getCameraY() {
        return this.cameraY;
    }
}
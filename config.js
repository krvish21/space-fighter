// Global game configuration
window.CONFIG = {
    player: {
        size: { w: 52, h: 26 },
        speedBoost: {
            durationMs: 3500, // boost duration in milliseconds
            amountFactor: 0.5, // fraction of base speed added at reference size
            sizeReference: { w: 52, h: 26 }, // reference ship size for scaling
            useDiagonal: true // scale by diagonal (true) or area (false)
        },
    },
    parallax: {
        factor: 0.5, // background movement relative to ship movement
    },
    spawn: {
        intervalMs: 800, // base spawn interval
        burstMin: 1,
        burstMax: 3,
    },
    comet: {
        windowChance: 0.01, // chance when window opens
        windowDelayRange: [5000, 15000], // ms
        healTriggerEvery: 5, // also triggered every N heals
    },
    moon: {
        spawnChance: 0.003, // per-frame when eligible
        cooldownMsRange: [10000, 20000],
    },
    fx: {
        shockwaveRadius: 200,
        shockwaveStrength: 8,
        hurtFlashMaxAlpha: 0.35,
        shakeIntensityPx: 6,
        shakeDurationMs: 250,
        hurtFlashDurationMs: 180,
    },
    hud: {
        fontSizePx: 14,
        neonColor: '#00E5FF',
        health: {
            showBottomLeft: false,
            normalColor: '#80FFEA',
            criticalColor: '#FF5252',
            criticalThreshold: 0.25
        }
    },
    speed: {
        base: 25, // matches current ship base maxSpeed
        perHeal: 0.3,
        cap: 35,
    }
};



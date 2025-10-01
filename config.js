// Global game configuration
window.CONFIG = {
    player: {
        size: { w: 52, h: 26 },
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
    speed: {
        base: 25, // matches current ship base maxSpeed
        perHeal: 0.3,
        cap: 35,
    }
};



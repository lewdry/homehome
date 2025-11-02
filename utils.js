// Shared utility functions

// Solarized color palette (shared across bonk, bump, draw)
const SOLARIZED_COLORS = [
    '#268bd2', // blue
    '#2aa198', // cyan
    '#859900', // green
    '#b58900', // yellow
    '#cb4b16', // orange
    '#dc322f', // red
    '#d33682', // magenta
    '#6c71c4', // violet
    '#268bd2', // blue (brighter variant)
    '#2aa198', // cyan (brighter variant)
    '#719e07', // green variant
    '#b58900', // yellow variant
    '#cb4b16', // orange variant
    '#dc322f', // red variant
    '#d33682', // magenta variant
    '#6c71c4', // violet variant
    '#3294c2', // lighter blue
    '#35b1a8', // lighter cyan
    '#95a900', // lighter green
    '#c59900', // lighter yellow
    '#db5b26', // lighter orange
    '#ec423f', // lighter red
    '#e34692', // lighter magenta
    '#7c81d4', // lighter violet
    '#1e7bb2', // darker blue
    '#1a9188', // darker cyan
    '#617900', // darker green
    '#a57900', // darker yellow
    '#bb3b06', // darker orange
    '#cc221f', // darker red
];

// Shared color utilities
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
}

function getDarkerShade(rgb, factor) {
    const r = Math.floor(rgb.r * factor);
    const g = Math.floor(rgb.g * factor);
    const b = Math.floor(rgb.b * factor);
    return `rgb(${r}, ${g}, ${b})`;
}

// Shared canvas resize utility
function resizeCanvas(canvas, ctx) {
    if (!canvas || !ctx) {
        console.error('Canvas or context not provided to resizeCanvas');
        return;
    }
    
    try {
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
        
        // Reset transform before scaling to prevent accumulation
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr, dpr);
        
        // Disable anti-aliasing for crisp pixel art
        ctx.imageSmoothingEnabled = false;
    } catch (error) {
        console.error('Error resizing canvas:', error);
    }
}

// Double-tap detector utility
function createDoubleTapDetector(options = {}) {
    const timeout = options.timeout || 300;
    const distanceThreshold = options.distanceThreshold || 20;
    
    let lastTapTime = 0;
    let lastTapX = 0;
    let lastTapY = 0;
    
    return {
        /**
         * Check if the current tap is a double tap
         * @param {number} x - Current tap X coordinate
         * @param {number} y - Current tap Y coordinate
         * @returns {boolean} - True if this is a double tap
         */
        isDoubleTap: function(x, y) {
            const now = Date.now();
            const timeSinceLastTap = now - lastTapTime;
            
            // Calculate distance from last tap
            const distance = Math.sqrt(
                Math.pow(x - lastTapX, 2) + Math.pow(y - lastTapY, 2)
            );
            
            const isDouble = timeSinceLastTap < timeout && distance < distanceThreshold;
            
            // Update last tap position and time
            lastTapX = x;
            lastTapY = y;
            lastTapTime = now;
            
            return isDouble;
        },
        
        /**
         * Reset the detector state
         */
        reset: function() {
            lastTapTime = 0;
            lastTapX = 0;
            lastTapY = 0;
        }
    };
}


// Retro click sound implementation that prefers an external CC0 file (`/sounds/click.wav`)
// and falls back to a small synthesized click if the file is unavailable.
;(function() {
    let audioCtx = null;
    let externalBuffer = null; // AudioBuffer for sounds/click.wav if loaded
    let loadingPromise = null; // Track the loading promise

    function getAudioContext() {
        if (!audioCtx) {
            const Ctx = window.AudioContext || window.webkitAudioContext;
            if (!Ctx) return null;
            audioCtx = new Ctx();
        }
        return audioCtx;
    }

    // Synth fallback (kept small and quiet) ---------------------------------
    function playSynthClick() {
        const ctx = getAudioContext();
        if (!ctx) return;
        if (ctx.state === 'suspended' && typeof ctx.resume === 'function') {
            ctx.resume().catch(() => {});
        }

        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.setValueAtTime(1400, now);
        osc.frequency.exponentialRampToValueAtTime(700, now + 0.03);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.12, now + 0.004);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);

        const lpf = ctx.createBiquadFilter();
        lpf.type = 'lowpass';
        lpf.frequency.setValueAtTime(6000, now);
        lpf.Q.setValueAtTime(0.7, now);

        osc.connect(lpf);
        lpf.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.12);

        osc.onended = function() {
            try { osc.disconnect(); } catch (e) {}
            try { lpf.disconnect(); } catch (e) {}
            try { gain.disconnect(); } catch (e) {}
        };
    }

    // Play decoded external buffer if available ------------------------------
    function playBufferClick() {
        const ctx = getAudioContext();
        if (!ctx || !externalBuffer) return false;
        if (ctx.state === 'suspended' && typeof ctx.resume === 'function') {
            ctx.resume().catch(() => {});
        }

        const src = ctx.createBufferSource();
        src.buffer = externalBuffer;
        const gain = ctx.createGain();
        // Keep external file volume modest
        gain.gain.setValueAtTime(0.18, ctx.currentTime);
        src.connect(gain);
        gain.connect(ctx.destination);
        src.start();
        src.onended = function() {
            try { src.disconnect(); } catch (e) {}
            try { gain.disconnect(); } catch (e) {}
        };
        return true;
    }

    // Primary play function - prefer external buffer, fall back to synth -------
    async function playRetroClick() {
        // Check global mute state
        if (window.isMuted) return;
        
        const ctx = getAudioContext();
        if (!ctx) return;
        
        // Resume AudioContext if suspended (required for mobile browsers)
        if (ctx.state === 'suspended') {
            try {
                await ctx.resume();
            } catch (e) {
                // Resume failed, try to play anyway
            }
        }
        
        if (externalBuffer) {
            // If buffer has been loaded, play it
            try {
                if (playBufferClick()) return;
            } catch (e) {
                // fall through to synth
            }
        }
        // If still loading or not available, play synth immediately (no waiting)
        playSynthClick();
    }

    // Try to load /sounds/click.wav asynchronously. If not found or decoding
    // fails, we silently keep the synth fallback.
    (function loadExternalClick() {
        // Use a relative path that works when the app is served from project root
        const path = 'sounds/click.wav';
        const ctx = getAudioContext();
        if (!ctx) return;

        // Attempt fetch + decode. Fail quietly.
        loadingPromise = fetch(path, {cache: 'no-cache'})
            .then(resp => {
                if (!resp.ok) throw new Error('failed to fetch');
                return resp.arrayBuffer();
            })
            .then(buf => ctx.decodeAudioData(buf))
            .then(decoded => {
                externalBuffer = decoded;
                loadingPromise = null; // Clear loading promise once loaded
            })
            .catch(() => {
                // ignore: external buffer not available, synth will be used
                loadingPromise = null;
            });
    })();

    // Expose globally for the rest of the app (available after utils.js loads)
    try {
        window.playRetroClick = playRetroClick;
    } catch (e) {
        // ignore
    }
})();

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


// Shared AudioContext for the entire application
// This prevents hitting browser limits (usually 6 AudioContexts max)
;(function() {
    let sharedAudioContext = null;
    
    // Get or create the shared AudioContext
    function getSharedAudioContext() {
        if (!sharedAudioContext) {
            const Ctx = window.AudioContext || window.webkitAudioContext;
            if (!Ctx) return null;
            sharedAudioContext = new Ctx();
        }
        return sharedAudioContext;
    }
    
    // Expose shared AudioContext globally
    window.getSharedAudioContext = getSharedAudioContext;
    
    // Resume AudioContext if suspended (required for browsers)
    window.resumeSharedAudioContext = function() {
        const ctx = getSharedAudioContext();
        if (ctx && ctx.state === 'suspended') {
            return ctx.resume();
        }
        return Promise.resolve();
    };
})();

// Retro click sound implementation that prefers an external CC0 file (`/sounds/click.wav`)
// and falls back to a small synthesized click if the file is unavailable.
;(function() {
    let externalBuffer = null; // AudioBuffer for sounds/click.wav if loaded
    let loadingPromise = null; // Track the loading promise

    function getAudioContext() {
        return window.getSharedAudioContext();
    }

    // Synth fallback (kept small and quiet) ---------------------------------
    function playSynthClick() {
        const ctx = getAudioContext();
        if (!ctx) return;

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
        
        // Wait for loading to complete if still in progress
        if (loadingPromise) {
            try {
                await loadingPromise;
            } catch (e) {
                // Loading failed, fall through to synth
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
        // If not available, play synth
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

// Shared audio loading utility for game sound effects
;(function() {
    // Load and decode an audio file, returning an AudioBuffer
    window.loadAudioBuffer = async function(filename) {
        const ctx = window.getSharedAudioContext();
        if (!ctx) {
            throw new Error('AudioContext not available');
        }
        
        try {
            const response = await fetch(`sounds/${filename}`, {cache: 'no-cache'});
            if (!response.ok) {
                throw new Error(`Failed to fetch ${filename}: ${response.statusText}`);
            }
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
            return audioBuffer;
        } catch (error) {
            console.error(`Error loading audio file ${filename}:`, error);
            throw error;
        }
    };
    
    // Play an AudioBuffer with optional volume control
    window.playAudioBuffer = function(buffer, volume = 1.0) {
        const ctx = window.getSharedAudioContext();
        if (!ctx || !buffer || window.isMuted) return null;
        
        // Resume AudioContext if suspended
        if (ctx.state === 'suspended') {
            ctx.resume();
        }
        
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        
        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(volume, ctx.currentTime);
        
        source.connect(gainNode);
        gainNode.connect(ctx.destination);
        source.start();
        
        return { source, gainNode };
    };
})();

// Shared collision sound player for games
// Manages sound pool and prevents too many simultaneous sounds
;(function() {
    const MAX_ACTIVE_SOUNDS = 20;
    let activeSources = [];
    
    /**
     * Play a random collision sound from a buffer collection
     * @param {Object} collisionBuffers - Object with sound file names as keys and AudioBuffers as values
     * @param {number} volume - Volume level (0.0 to 1.0)
     * @param {number} minSpeed - Minimum collision speed
     * @param {number} collisionSpeed - Actual collision speed
     * @param {number} maxSpeed - Maximum collision speed for normalization
     * @param {number} minVolume - Minimum volume
     * @param {number} maxVolume - Maximum volume
     * @returns {boolean} - True if sound was played
     */
    window.playCollisionSound = function(collisionBuffers, {
        volume = 0.3,
        minSpeed = 0,
        collisionSpeed = 0,
        maxSpeed = 30,
        minVolume = 0.1,
        maxVolume = 0.4
    } = {}) {
        if (window.isMuted || Object.keys(collisionBuffers).length === 0) {
            return false;
        }
        
        // Resume AudioContext if suspended
        window.resumeSharedAudioContext();
        
        try {
            const soundFiles = Object.keys(collisionBuffers);
            const randomIndex = Math.floor(Math.random() * soundFiles.length);
            const randomSoundFile = soundFiles[randomIndex];
            
            // Calculate volume based on collision speed if provided
            let finalVolume = volume;
            if (collisionSpeed > minSpeed) {
                const normalizedSpeed = (collisionSpeed - minSpeed) / (maxSpeed - minSpeed);
                finalVolume = minVolume + (maxVolume - minVolume) * normalizedSpeed;
                finalVolume = Math.min(Math.max(finalVolume, minVolume), maxVolume);
            }
            
            const audioNodes = window.playAudioBuffer(
                collisionBuffers[randomSoundFile],
                finalVolume
            );
            
            if (audioNodes) {
                const { source, gainNode } = audioNodes;
                
                // Cleanup on end to prevent memory leak
                source.onended = () => {
                    try {
                        source.disconnect();
                        gainNode.disconnect();
                        const index = activeSources.findIndex(s => s.source === source);
                        if (index !== -1) {
                            activeSources.splice(index, 1);
                        }
                    } catch (e) {
                        // Ignore disconnect errors
                    }
                };
                
                activeSources.push({ source, gainNode });
                
                // Clean up oldest sounds if too many active
                if (activeSources.length > MAX_ACTIVE_SOUNDS) {
                    const oldest = activeSources.shift();
                    try {
                        oldest.source.stop();
                        oldest.source.disconnect();
                        oldest.gainNode.disconnect();
                    } catch (e) {
                        // Ignore stop/disconnect errors
                    }
                }
                
                return true;
            }
        } catch (error) {
            console.error("Error playing collision sound:", error);
        }
        
        return false;
    };
    
    // Cleanup all active sounds
    window.cleanupCollisionSounds = function() {
        activeSources.forEach(({ source, gainNode }) => {
            try {
                source.stop();
                source.disconnect();
                gainNode.disconnect();
            } catch (e) {
                // Ignore errors
            }
        });
        activeSources = [];
    };
})();

// Shared canvas initialization utility
;(function() {
    /**
     * Initialize a canvas with error handling
     * @param {string} canvasId - ID of the canvas element
     * @returns {Object|null} - { canvas, ctx } or null on error
     */
    window.initCanvasElement = function(canvasId) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            console.error(`Canvas element '${canvasId}' not found`);
            return null;
        }
        
        let ctx = null;
        try {
            ctx = canvas.getContext('2d');
            if (!ctx) {
                console.error(`Could not get 2D context for canvas '${canvasId}'`);
                return null;
            }
        } catch (error) {
            console.error(`Error getting canvas context for '${canvasId}':`, error);
            return null;
        }
        
        return { canvas, ctx };
    };
})();

// Shared dithered pattern generation utilities
;(function() {
    /**
     * Generate a dithered circle pattern
     * @param {number} radius - Circle radius
     * @param {string} color - Base color (hex)
     * @param {number} pixelSize - Size of each pixel (default 2)
     * @returns {Object} - { pattern, baseColor, ditherColor }
     */
    window.generateDitheredCircle = function(radius, color, pixelSize = 2) {
        const rgb = hexToRgb(color);
        const ditherColor = getDarkerShade(rgb, 0.7);
        
        const minX = Math.floor(-radius / pixelSize);
        const minY = Math.floor(-radius / pixelSize);
        const maxX = Math.ceil(radius / pixelSize);
        const maxY = Math.ceil(radius / pixelSize);
        
        const pattern = [];
        
        for (let gridX = minX; gridX <= maxX; gridX++) {
            for (let gridY = minY; gridY <= maxY; gridY++) {
                const px = gridX * pixelSize;
                const py = gridY * pixelSize;
                
                const dx = px + pixelSize / 2;
                const dy = py + pixelSize / 2;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance <= radius) {
                    const isDithered = (gridX + gridY) % 2 === 0;
                    pattern.push({
                        offsetX: px,
                        offsetY: py,
                        isDithered: isDithered
                    });
                }
            }
        }
        
        return { pattern, baseColor: color, ditherColor, pixelSize };
    };
    
    /**
     * Generate a dithered rectangle pattern
     * @param {number} width - Rectangle width
     * @param {number} height - Rectangle height
     * @param {string} color - Base color (hex)
     * @param {number} pixelSize - Size of each pixel (default 2)
     * @returns {Object} - { pattern, baseColor, ditherColor }
     */
    window.generateDitheredRect = function(width, height, color, pixelSize = 2) {
        const rgb = hexToRgb(color);
        const ditherColor = getDarkerShade(rgb, 0.7);
        
        const pattern = [];
        const cols = Math.ceil(width / pixelSize);
        const rows = Math.ceil(height / pixelSize);
        
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const isDithered = (row + col) % 2 === 0;
                pattern.push({
                    offsetX: col * pixelSize,
                    offsetY: row * pixelSize,
                    isDithered: isDithered
                });
            }
        }
        
        return { pattern, baseColor: color, ditherColor, pixelSize };
    };
    
    /**
     * Draw a dithered pattern to canvas
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {Object} patternData - Pattern data from generate functions
     */
    window.drawDitheredPattern = function(ctx, x, y, patternData) {
        const { pattern, baseColor, ditherColor, pixelSize } = patternData;
        
        // Draw base color pixels
        ctx.fillStyle = baseColor;
        for (let i = 0; i < pattern.length; i++) {
            const pixel = pattern[i];
            if (!pixel.isDithered) {
                ctx.fillRect(x + pixel.offsetX, y + pixel.offsetY, pixelSize, pixelSize);
            }
        }
        
        // Draw dithered pixels
        ctx.fillStyle = ditherColor;
        for (let i = 0; i < pattern.length; i++) {
            const pixel = pattern[i];
            if (pixel.isDithered) {
                ctx.fillRect(x + pixel.offsetX, y + pixel.offsetY, pixelSize, pixelSize);
            }
        }
    };
})();

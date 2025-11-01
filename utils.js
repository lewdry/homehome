// Shared utility functions

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
    function playRetroClick() {
        if (externalBuffer) {
            // If buffer has been loaded, play it
            try {
                if (playBufferClick()) return;
            } catch (e) {
                // fall through to synth
            }
        }
        // fallback
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
        fetch(path, {cache: 'no-cache'}).then(resp => {
            if (!resp.ok) throw new Error('failed to fetch');
            return resp.arrayBuffer();
        }).then(buf => ctx.decodeAudioData(buf)).then(decoded => {
            externalBuffer = decoded;
        }).catch(() => {
            // ignore: external buffer not available, synth will be used
        });
    })();

    // Expose globally for the rest of the app (available after utils.js loads)
    try {
        window.playRetroClick = playRetroClick;
    } catch (e) {
        // ignore
    }
})();

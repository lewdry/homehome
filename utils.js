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

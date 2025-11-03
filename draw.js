// Drawing Logic
(function() {
    // Constants
    const LINE_WIDTH = 4;
    const PIXEL_SIZE = 2; // For dithered rendering

    // Drawing state
    const ongoingTouches = [];
    const doubleTapDetector = createDoubleTapDetector({ timeout: 300, distanceThreshold: 20 });
    let drawing = false;
    let isDoubleTap = false;
    let drawInitialized = false;
    let drawCanvas = null;
    let drawCtx = null;
    let drawResizeHandler = null; // Unique name for draw's resize handler

// Helper to check if drawing is allowed
function isDrawingAllowed() {
    return window.drawStarted === true;
}

function resizeDrawCanvas() {
    if (!drawCanvas || !drawCtx) return;
    resizeCanvas(drawCanvas, drawCtx);
}

function initDrawing() {
    if (drawInitialized) return;
    drawInitialized = true;

    // Get canvas elements
    drawCanvas = document.getElementById('drawCanvas');
    if (!drawCanvas) {
        console.error('Draw canvas not found');
        return;
    }
    
    try {
        drawCtx = drawCanvas.getContext('2d');
        if (!drawCtx) {
            console.error('Could not get 2D context for draw canvas');
            return;
        }
    } catch (error) {
        console.error('Error getting canvas context:', error);
        return;
    }

    // Initial canvas resize
    resizeDrawCanvas();

    // Create resize handler and store reference for cleanup
    drawResizeHandler = () => {
        try {
            resizeDrawCanvas();
        } catch (error) {
            console.error('Error in resize handler:', error);
        }
    };
    
    // Resize canvas when the window is resized
    window.addEventListener('resize', drawResizeHandler);

    // Event listeners - mouse events
    drawCanvas.addEventListener('mousedown', handleDrawStart, { passive: false });
    drawCanvas.addEventListener('mousemove', handleDrawMove, { passive: false });
    drawCanvas.addEventListener('mouseup', handleDrawEnd, { passive: false });
    drawCanvas.addEventListener('dblclick', handleDrawDoubleTap, { passive: false });

    // Event listeners - touch events
    drawCanvas.addEventListener('touchstart', handleDrawTouchStart, { passive: false });
    drawCanvas.addEventListener('touchmove', handleDrawMove, { passive: false });
    drawCanvas.addEventListener('touchend', handleDrawEnd, { passive: false });
    drawCanvas.addEventListener('touchcancel', handleDrawCancel, { passive: false });

    // Download button event listener
    const downloadBtn = document.getElementById('draw-download');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', downloadDrawing);
        downloadBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            downloadDrawing();
        });
    }

    console.log('Drawing initialized');
}

function handleDrawTouchStart(evt) {
    if (!isDrawingAllowed()) return; // Don't allow interaction until popup is dismissed
    
    // Handle double tap for touch
    handleDrawDoubleTap(evt);
    
    // If it was a double tap, don't start drawing
    if (isDoubleTap) {
        return;
    }
    
    // Otherwise, start drawing
    handleDrawStart(evt);
}

function handleDrawStart(evt) {
    if (!isDrawingAllowed()) return; // Don't allow interaction until popup is dismissed
    
    evt.preventDefault();
    evt.stopPropagation();
    
    if (isDoubleTap) {
        isDoubleTap = false;
        return;
    }
    
    if (!drawCanvas) return;
    
    const touches = evt.changedTouches || [evt];
    const rect = drawCanvas.getBoundingClientRect();

    for (let i = 0; i < touches.length; i++) {
        const touch = touches[i];
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;

        // Validate touch coordinates
        if (!isValidCoordinate(x) || !isValidCoordinate(y)) continue;

        // Select a random color from the solarized palette
        const colour = SOLARIZED_COLORS[Math.floor(Math.random() * SOLARIZED_COLORS.length)];
        ongoingTouches.push({
            id: touch.identifier || 'mouse',
            x: x,
            y: y,
            colour: colour
        });
        drawLine(x, y, x, y, colour);
    }

    drawing = true;
}

function handleDrawMove(evt) {
    if (!isDrawingAllowed()) return; // Don't allow interaction until popup is dismissed
    
    evt.preventDefault();
    evt.stopPropagation();
    
    if (!drawing || !drawCanvas) return;

    const touches = evt.changedTouches || [evt];
    const rect = drawCanvas.getBoundingClientRect();
    
    for (let i = 0; i < touches.length; i++) {
        const touch = touches[i];
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;

        // Validate touch coordinates
        if (!isValidCoordinate(x) || !isValidCoordinate(y)) continue;

        const idx = ongoingTouchIndexById(touch.identifier || 'mouse');
        if (idx >= 0) {
            const colour = ongoingTouches[idx].colour;
            drawLine(ongoingTouches[idx].x, ongoingTouches[idx].y, x, y, colour);
            ongoingTouches[idx].x = x;
            ongoingTouches[idx].y = y;
        }
    }
}

function handleDrawEnd(evt) {
    if (!isDrawingAllowed()) return; // Don't allow interaction until popup is dismissed
    
    evt.preventDefault();
    evt.stopPropagation();

    const touches = evt.changedTouches || [evt];
    
    for (let i = 0; i < touches.length; i++) {
        const touch = touches[i];
        const idx = ongoingTouchIndexById(touch.identifier || 'mouse');
        if (idx >= 0) {
            ongoingTouches.splice(idx, 1);
        }
    }

    // Clean up any orphaned touches and stop drawing if no touches remain
    cleanupTouches();
    if (ongoingTouches.length === 0) {
        drawing = false;
    }
}

function handleDrawCancel(evt) {
    if (!isDrawingAllowed()) return; // Don't allow interaction until popup is dismissed
    
    evt.preventDefault();
    evt.stopPropagation();

    const touches = evt.changedTouches || [evt];
    
    for (let i = 0; i < touches.length; i++) {
        const idx = ongoingTouchIndexById(touches[i].identifier || 'mouse');
        if (idx >= 0) {
            ongoingTouches.splice(idx, 1);
        }
    }

    // Clean up any orphaned touches
    cleanupTouches();
    if (ongoingTouches.length === 0) {
        drawing = false;
    }
}

function handleDrawDoubleTap(evt) {
    if (!isDrawingAllowed()) return; // Don't allow interaction until popup is dismissed
    
    if (!drawCanvas || !drawCtx) return;

    if (evt.touches && evt.touches.length === 1) {
        // Get the current tap location
        const rect = drawCanvas.getBoundingClientRect();
        const x = evt.touches[0].clientX - rect.left;
        const y = evt.touches[0].clientY - rect.top;

        if (doubleTapDetector.isDoubleTap(x, y)) {
            drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
            evt.preventDefault();
            evt.stopPropagation();
            isDoubleTap = true;
            setTimeout(() => { isDoubleTap = false; }, 300);
        }
    } else if (evt.type === 'dblclick') {
        drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
        evt.preventDefault();
        evt.stopPropagation();
    }
}

function drawLine(x1, y1, x2, y2, colour) {
    // Calculate the two colors for dithering
    const rgb = hexToRgb(colour);
    const baseColor = colour;
    const ditherColor = getDarkerShade(rgb, 0.7);

    if (x1 === x2 && y1 === y2) {
        // Draw a dithered dot
        drawDitheredCircle(x1, y1, LINE_WIDTH / 2, baseColor, ditherColor);
        return;
    }

    // Dithered line drawing using Bresenham-like algorithm
    const dx = x2 - x1;
    const dy = y2 - y1;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const steps = Math.max(Math.ceil(distance / PIXEL_SIZE), 1);

    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const centerX = x1 + dx * t;
        const centerY = y1 + dy * t;
        
        // Draw a small dithered circle at this point
        drawDitheredCircle(centerX, centerY, LINE_WIDTH / 2, baseColor, ditherColor);
    }
}

function drawDitheredCircle(centerX, centerY, radius, baseColor, ditherColor) {
    // Calculate the bounding box in pixel grid
    const minX = Math.floor((centerX - radius) / PIXEL_SIZE) * PIXEL_SIZE;
    const minY = Math.floor((centerY - radius) / PIXEL_SIZE) * PIXEL_SIZE;
    const maxX = Math.ceil((centerX + radius) / PIXEL_SIZE) * PIXEL_SIZE;
    const maxY = Math.ceil((centerY + radius) / PIXEL_SIZE) * PIXEL_SIZE;
    
    // Draw pixels in a checkerboard pattern
    for (let px = minX; px < maxX; px += PIXEL_SIZE) {
        for (let py = minY; py < maxY; py += PIXEL_SIZE) {
            // Check if this pixel is within the circle
            const dx = (px + PIXEL_SIZE / 2) - centerX;
            const dy = (py + PIXEL_SIZE / 2) - centerY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance <= radius) {
                // Determine if this pixel should be base or dither color
                // Using checkerboard pattern like blok.js: (gridX + gridY) % 2
                const gridX = Math.floor(px / PIXEL_SIZE);
                const gridY = Math.floor(py / PIXEL_SIZE);
                const isDithered = (gridX + gridY) % 2 === 0;
                
                drawCtx.fillStyle = isDithered ? ditherColor : baseColor;
                drawCtx.fillRect(px, py, PIXEL_SIZE, PIXEL_SIZE);
            }
        }
    }
}

function isValidCoordinate(coord) {
    return typeof coord === 'number' && !isNaN(coord) && isFinite(coord);
}

function ongoingTouchIndexById(idToFind) {
    for (let i = 0; i < ongoingTouches.length; i++) {
        const id = ongoingTouches[i].id;
        if (id === idToFind) {
            return i;
        }
    }
    return -1;
}

function cleanupTouches() {
    // Remove any touches that might have been orphaned
    for (let i = ongoingTouches.length - 1; i >= 0; i--) {
        if (!ongoingTouches[i] || !ongoingTouches[i].id) {
            ongoingTouches.splice(i, 1);
        }
    }
}

function downloadDrawing() {
    if (!drawCanvas) return;
    
    try {
        // Create download link
        const link = document.createElement('a');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        link.download = `drawing-${timestamp}.png`;
        link.href = drawCanvas.toDataURL('image/png');
        link.click();
        
        // Play sound if available
        if (window.playRetroClick) {
            try { window.playRetroClick(); } catch (err) {}
        }
    } catch (error) {
        console.error('Error downloading drawing:', error);
    }
}

    
    // Expose initDrawing to global scope
    window.initDrawing = initDrawing;
    
    // Expose cleanup function for when leaving draw tab
    window.cleanupDrawing = function() {
        // Remove resize listener
        if (drawResizeHandler) {
            window.removeEventListener('resize', drawResizeHandler);
            drawResizeHandler = null;
        }
        
        // Remove canvas event listeners
        if (drawCanvas) {
            drawCanvas.removeEventListener('mousedown', handleDrawStart);
            drawCanvas.removeEventListener('mousemove', handleDrawMove);
            drawCanvas.removeEventListener('mouseup', handleDrawEnd);
            drawCanvas.removeEventListener('dblclick', handleDrawDoubleTap);
            drawCanvas.removeEventListener('touchstart', handleDrawTouchStart);
            drawCanvas.removeEventListener('touchmove', handleDrawMove);
            drawCanvas.removeEventListener('touchend', handleDrawEnd);
            drawCanvas.removeEventListener('touchcancel', handleDrawCancel);
        }
        
        // Reset state
        drawing = false;
        ongoingTouches.length = 0;
    };
})();
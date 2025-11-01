// Drawing Logic
(function() {
    // Solarized color palette (shared with bonk.js)
    const DRAW_COLORS = [
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

    // Constants
    const DEVICE_PIXEL_RATIO = window.devicePixelRatio || 1;
    const LINE_WIDTH = 2;

    // Drawing state
    const ongoingTouches = [];
    const doubleTapDetector = createDoubleTapDetector({ timeout: 300, distanceThreshold: 20 });
    let drawing = false;
    let isDoubleTap = false;
    let drawInitialized = false;
    let drawCanvas = null;
    let drawCtx = null;

function resizeDrawCanvas() {
    if (!drawCanvas) return;
    
    const rect = drawCanvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    drawCanvas.width = width * DEVICE_PIXEL_RATIO;
    drawCanvas.height = height * DEVICE_PIXEL_RATIO;
    drawCanvas.style.width = `${width}px`;
    drawCanvas.style.height = `${height}px`;

    drawCtx.scale(DEVICE_PIXEL_RATIO, DEVICE_PIXEL_RATIO);
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
    drawCtx = drawCanvas.getContext('2d');

    // Initial canvas resize
    resizeDrawCanvas();

    // Resize canvas when the window is resized
    window.addEventListener('resize', resizeDrawCanvas);

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

    console.log('Drawing initialized');
}

function handleDrawTouchStart(evt) {
    if (!drawStarted) return; // Don't allow interaction until popup is dismissed
    
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
    if (!drawStarted) return; // Don't allow interaction until popup is dismissed
    
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
        const colour = DRAW_COLORS[Math.floor(Math.random() * DRAW_COLORS.length)];
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
    if (!drawStarted) return; // Don't allow interaction until popup is dismissed
    
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
    if (!drawStarted) return; // Don't allow interaction until popup is dismissed
    
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
    if (!drawStarted) return; // Don't allow interaction until popup is dismissed
    
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
    if (!drawStarted) return; // Don't allow interaction until popup is dismissed
    
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
    drawCtx.beginPath();
    drawCtx.strokeStyle = colour;
    drawCtx.lineWidth = LINE_WIDTH;
    drawCtx.lineCap = "round";

    if (x1 === x2 && y1 === y2) {
        // Draw a dot
        drawCtx.arc(x1, y1, LINE_WIDTH / 2, 0, 2 * Math.PI);
        drawCtx.fillStyle = colour;
        drawCtx.fill();
    } else {
        // Draw a line
        drawCtx.moveTo(x1, y1);
        drawCtx.lineTo(x2, y2);
        drawCtx.stroke();
    }

    drawCtx.closePath();
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

    // Expose initDrawing to global scope
    window.initDrawing = initDrawing;
})();

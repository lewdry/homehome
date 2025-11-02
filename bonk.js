// Bonk Game Logic
(function() {
    // Constants
    const canvas = document.getElementById('drawingCanvas');
    const ctx = canvas ? canvas.getContext('2d') : null;

    // Game Constants
    const DRAG_COEFFICIENT = 0.999;
    const NUM_BALLS = 15;
    const COLLISION_COOLDOWN_FRAMES = 5;
    const SEPARATION_ITERATIONS = 10;
    const MAX_ACTIVE_SOUNDS = 20;
    const VELOCITY_THRESHOLD = 0.1;
    const BOUNDARY_MARGIN = 1;
    const HIDDEN_THRESHOLD = 5000; // 5 seconds
    const FIXED_TIME_STEP = 1000 / 60;
    const GRABBED_BALL_SCALE = 1.1;

    // Set canvas size to match window and calculate scale factor
    function resizeBonkCanvas() {
        if (!canvas || !ctx) return;
        resizeCanvas(canvas, ctx);
    }

// Initial canvas size
// Ensure canvas has an initial bounding rect by sizing it to window
function ensureCanvasSize() {
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.getBoundingClientRect();
}

    class Ball {
        constructor() {
            this.reset();
        }

        reset() {
        this.radius = Math.random() * 18 + 12;
        this.mass = Math.PI * this.radius ** 2;
        this.x = Math.random() * (canvas.width / window.devicePixelRatio - 2 * this.radius) + this.radius;
        this.y = Math.random() * (canvas.height / window.devicePixelRatio - 2 * this.radius) + this.radius;
        this.dx = (Math.random() - 0.5) * 5;
        this.dy = (Math.random() - 0.5) * 5;
        this.colour = SOLARIZED_COLORS[Math.floor(Math.random() * SOLARIZED_COLORS.length)];
        this.grabbed = false;
        this.collisionCooldown = 0;
        this.lastCollidedWith = null;
        
        // Pre-calculate dithered color using shared utility
        const rgb = hexToRgb(this.colour);
        this.ditherColor = getDarkerShade(rgb, 0.7);
        
        // Generate static pixelated circle pattern
        this.generatePixelPattern();
    }
    
    generatePixelPattern() {
        const pixelSize = 2;
        const drawRadius = this.radius;
        
        // Calculate the bounding box for the circle in pixels
        const minX = Math.floor(-drawRadius / pixelSize);
        const minY = Math.floor(-drawRadius / pixelSize);
        const maxX = Math.ceil(drawRadius / pixelSize);
        const maxY = Math.ceil(drawRadius / pixelSize);
        
        // Generate static pixel pattern with dithering
        this.pixelPattern = [];
        
        for (let gridX = minX; gridX <= maxX; gridX++) {
            for (let gridY = minY; gridY <= maxY; gridY++) {
                const px = gridX * pixelSize;
                const py = gridY * pixelSize;
                
                // Calculate distance from pixel center to ball center (0, 0)
                const dx = px + pixelSize / 2;
                const dy = py + pixelSize / 2;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance <= drawRadius) {
                    // Determine if this pixel should be dithered
                    // Use a checkerboard dithering pattern based on grid position
                    const isDithered = (gridX + gridY) % 2 === 0;
                    
                    this.pixelPattern.push({
                        offsetX: px,
                        offsetY: py,
                        isDithered: isDithered
                    });
                }
            }
        }
    }

    move() {
        if (!this.grabbed) {
            // Apply drag to slow down the ball
            this.dx *= DRAG_COEFFICIENT;
            this.dy *= DRAG_COEFFICIENT;

            if (Math.abs(this.dx) < VELOCITY_THRESHOLD && Math.abs(this.dy) < VELOCITY_THRESHOLD) {
                this.dx = 0;
                this.dy = 0;
            }

            this.x += this.dx;
            this.y += this.dy;
            this.resolveBoundaryCollision();
        }

        // Decrement collision cooldown
        if (this.collisionCooldown > 0) {
            this.collisionCooldown--;
        }
    }

    resolveBoundaryCollision() {
        const canvasWidth = canvas.width / window.devicePixelRatio;
        const canvasHeight = canvas.height / window.devicePixelRatio;
        if (this.x - this.radius <= BOUNDARY_MARGIN) {
            this.x = this.radius + BOUNDARY_MARGIN;
            this.dx = Math.abs(this.dx);
        } else if (this.x + this.radius >= canvasWidth - BOUNDARY_MARGIN) {
            this.x = canvasWidth - this.radius - BOUNDARY_MARGIN;
            this.dx = -Math.abs(this.dx);
        }
        if (this.y - this.radius <= BOUNDARY_MARGIN) {
            this.y = this.radius + BOUNDARY_MARGIN;
            this.dy = Math.abs(this.dy);
        } else if (this.y + this.radius >= canvasHeight - BOUNDARY_MARGIN) {
            this.y = canvasHeight - this.radius - BOUNDARY_MARGIN;
            this.dy = -Math.abs(this.dy);
        }
    }

    draw() {
        const pixelSize = 2;
        const scale = this.grabbed ? GRABBED_BALL_SCALE : 1;
        
        // Draw static pixel pattern - batch by color to minimize fillStyle changes
        // First draw all base color pixels
        ctx.fillStyle = this.colour;
        for (let i = 0; i < this.pixelPattern.length; i++) {
            const pixel = this.pixelPattern[i];
            if (!pixel.isDithered) {
                const scaledOffsetX = pixel.offsetX * scale;
                const scaledOffsetY = pixel.offsetY * scale;
                const px = this.x + scaledOffsetX;
                const py = this.y + scaledOffsetY;
                ctx.fillRect(px, py, pixelSize, pixelSize);
            }
        }
        
        // Then draw all dithered pixels
        ctx.fillStyle = this.ditherColor;
        for (let i = 0; i < this.pixelPattern.length; i++) {
            const pixel = this.pixelPattern[i];
            if (pixel.isDithered) {
                const scaledOffsetX = pixel.offsetX * scale;
                const scaledOffsetY = pixel.offsetY * scale;
                const px = this.x + scaledOffsetX;
                const py = this.y + scaledOffsetY;
                ctx.fillRect(px, py, pixelSize, pixelSize);
            }
        }

        // Add subtle glow effect when grabbed
        if (this.grabbed) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.lineWidth = 1;
            
            // Draw glow around the pattern
            const glowRadius = this.radius * scale;
            for (let i = 0; i < this.pixelPattern.length; i++) {
                const pixel = this.pixelPattern[i];
                const scaledOffsetX = pixel.offsetX * scale;
                const scaledOffsetY = pixel.offsetY * scale;
                
                // Check if this pixel is on the edge
                const distance = Math.sqrt(scaledOffsetX * scaledOffsetX + scaledOffsetY * scaledOffsetY);
                if (distance > glowRadius - 3 && distance <= glowRadius + 1) {
                    const px = this.x + scaledOffsetX;
                    const py = this.y + scaledOffsetY;
                    ctx.strokeRect(px, py, pixelSize, pixelSize);
                }
            }
        }
    }
    
    // Removed hexToRgb and getDarkerShade - now using shared utilities from utils.js

    checkCollision(other) {
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < this.radius + other.radius;
    }

    getSpeed() {
            return Math.sqrt(this.dx * this.dx + this.dy * this.dy);
        }

        separateBalls(other, moveX, moveY) {
            this.x -= moveX;
            this.y -= moveY;
            other.x += moveX;
            other.y += moveY;
        }

        updateCollisionCount(other) {
            if (bonkStarted && this.lastCollidedWith !== other && 
                this.collisionCooldown <= 0 && other.collisionCooldown <= 0) {
                collisionCount++;
                
                // Announce to screen readers
                const bonkStatus = document.getElementById('bonk-status');
                if (bonkStatus) {
                    bonkStatus.textContent = `${collisionCount} bonks`;
                }
                
                this.lastCollidedWith = other;
                other.lastCollidedWith = this;
                this.collisionCooldown = COLLISION_COOLDOWN_FRAMES;
                other.collisionCooldown = COLLISION_COOLDOWN_FRAMES;
            }
        }

        resolvePhysics(other, dx, dy, distance) {
            // Calculate collision normal and tangent vectors
            const normalX = dx / distance;
            const normalY = dy / distance;
            const tangentX = -normalY;
            const tangentY = normalX;

            // Calculate velocity components
            const dotProductThis = this.dx * normalX + this.dy * normalY;
            const dotProductOther = other.dx * normalX + other.dy * normalY;

            // Calculate tangent velocities
            const thisVt = this.dx * tangentX + this.dy * tangentY;
            const otherVt = other.dx * tangentX + other.dy * tangentY;

            // Calculate new normal velocities using conservation of momentum
            const v1n = (dotProductThis * (this.mass - other.mass) + 2 * other.mass * dotProductOther) / (this.mass + other.mass);
            const v2n = (dotProductOther * (other.mass - this.mass) + 2 * this.mass * dotProductThis) / (this.mass + other.mass);

            // Update velocities
            this.dx = v1n * normalX + thisVt * tangentX;
            this.dy = v1n * normalY + thisVt * tangentY;
            other.dx = v2n * normalX + otherVt * tangentX;
            other.dy = v2n * normalY + otherVt * tangentY;
        }

        playCollisionSound(other) {
            // Check global mute state
            if (window.isMuted) return;
            
            const minSpeed = 0;
            const maxSpeed = 30;
            const minVolume = 0.1;
            const maxVolume = 0.4;
            
            const thisSpeed = this.getSpeed();
            const otherSpeed = other.getSpeed();
            const collisionSpeed = Math.max(thisSpeed, otherSpeed);

            if (!bonkStarted || collisionSpeed <= minSpeed || Object.keys(collisionBuffers).length === 0) {
                return;
            }

            // Resume AudioContext if suspended (required for browsers)
            if (audioContext && audioContext.state === 'suspended') {
                audioContext.resume();
            }

            try {
                const soundFiles = Object.keys(collisionBuffers);
                const randomIndex = Math.floor(Math.random() * soundFiles.length);
                const randomSoundFile = soundFiles[randomIndex];

                // Create audio source and gain node
                const source = audioContext.createBufferSource();
                source.buffer = collisionBuffers[randomSoundFile];

                const gainNode = audioContext.createGain();
                
                // Calculate volume based on collision speed
                const normalizedSpeed = (collisionSpeed - minSpeed) / (maxSpeed - minSpeed);
                const volume = minVolume + (maxVolume - minVolume) * normalizedSpeed;
                const clampedVolume = Math.min(Math.max(volume, minVolume), maxVolume);
                
                gainNode.gain.setValueAtTime(clampedVolume, audioContext.currentTime);

                // Connect and play
                source.connect(gainNode);
                gainNode.connect(audioContext.destination);
                source.start();

                // Cleanup on end to prevent memory leak
                source.onended = () => {
                    try {
                        source.disconnect();
                        gainNode.disconnect();
                        // Remove from active sources array
                        const index = activeSources.findIndex(s => s.source === source);
                        if (index !== -1) {
                            activeSources.splice(index, 1);
                        }
                    } catch (e) {
                        // Ignore disconnect errors
                    }
                };

                // Track active sources
                activeSources.push({ source, gainNode });

                // Clean up old sources if too many
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

                console.log(`Collision speed: ${collisionSpeed.toFixed(2)}, Volume: ${clampedVolume.toFixed(2)}`);
            } catch (error) {
                console.error("Error playing collision sound:", error);
            }
        }

        resolveCollision(other) {
            const dx = other.x - this.x;
            const dy = other.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const overlap = this.radius + other.radius - distance;
            
            if (overlap > 0) {
                const angle = Math.atan2(dy, dx);
                const separationDistance = 1; // 1px separation
                const totalSeparation = overlap + separationDistance;
                const moveX = totalSeparation * Math.cos(angle) / 2;
                const moveY = totalSeparation * Math.sin(angle) / 2;
                
                if (!this.grabbed && !other.grabbed) {
                    // Separate the balls
                    this.separateBalls(other, moveX, moveY);
                    
                    // Update collision count
                    this.updateCollisionCount(other);
                    
                    // Resolve physics
                    this.resolvePhysics(other, dx, dy, distance);
                    
                    // Play collision sound
                    this.playCollisionSound(other);
                } else if (this.grabbed) {
                    other.x = this.x + (other.radius + this.radius + separationDistance) * Math.cos(angle);
                    other.y = this.y + (other.radius + this.radius + separationDistance) * Math.sin(angle);
                } else if (other.grabbed) {
                    this.x = other.x - (other.radius + this.radius + separationDistance) * Math.cos(angle);
                    this.y = other.y - (other.radius + this.radius + separationDistance) * Math.sin(angle);
                }
        
                return true;
            } else {
                // Reset lastCollidedWith if balls are not touching
                if (this.lastCollidedWith === other) {
                    this.lastCollidedWith = null;
                    other.lastCollidedWith = null;
                }
            }
            return false;
        }        checkGrabbed(pos) {
            const distance = Math.hypot(this.x - pos.x, this.y - pos.y);
            return distance < this.radius;
        }
    }

    // Game variables
    let balls = [];
    let collisionCount = 0;
    let grabbedBall = null;
    let interactionStartPos = null;
    let lastCursorTime = 0;
    let gameRunning = false;
    let bonkStarted = false;
    let gamePaused = false;
    let pauseResumeTimeout = null;
    let stoppedFor = 0;
    let allBallsStopped = false;
    let lastStopTime = 0;
    let activeSources = []; // Array to keep track of active audio sources
    let audioContext;
    let collisionBuffers = {};
    let lastHiddenTime = 0;
    let lastTime = 0;
    let lastGrabbedPos = null;
    let resizeHandler = null; // Store reference for cleanup
    let visibilityHandler = null; // Store reference for cleanup
    const doubleTapDetector = createDoubleTapDetector({ timeout: 300 });
    const PAUSE_RESUME_DELAY = 500; // 0.5s delay when resuming

    function initGame() {
        if (!canvas) {
            console.error('Canvas element not found');
            return;
        }
        
        if (!ctx) {
            console.error('Could not get 2D context for bonk canvas');
            return;
        }

        ensureCanvasSize();
        resizeBonkCanvas();

        resetGame();

        canvas.addEventListener('pointerdown', handleStart, { passive: false });
        canvas.addEventListener('pointermove', handleMove, { passive: false });
        canvas.addEventListener('pointerup', handleEnd, { passive: false });
        canvas.addEventListener('pointercancel', handleEnd, { passive: false });
        
        // Prevent default touch behaviors on canvas
        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            e.stopPropagation();
        }, { passive: false });
        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            e.stopPropagation();
        }, { passive: false });
        canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            e.stopPropagation();
        }, { passive: false });

        // Only set gameRunning to false if bonkStarted is false (i.e., popup is showing)
        if (!bonkStarted) {
            gameRunning = false;
        } else {
            gameRunning = true;
        }
        requestAnimationFrame(gameLoop);
    }

    function resumeAudioContext() {
        if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume().then(() => {
                console.log('AudioContext resumed successfully');
            }).catch(error => {
                console.error('Failed to resume AudioContext:', error);
            });
        }
    }

    // Handle window resizing
    function handleResize() {
        try {
            const oldWidth = canvas.width;
            const oldHeight = canvas.height;
            
            resizeBonkCanvas();
            
            const widthRatio = canvas.width / oldWidth;
            const heightRatio = canvas.height / oldHeight;
            
            balls.forEach(ball => {
                ball.x *= widthRatio;
                ball.y *= heightRatio;
                ball.dx *= widthRatio;
                ball.dy *= heightRatio;
            });
        } catch (error) {
            console.error('Error in bonk resize handler:', error);
        }
    }

    // Store handlers for cleanup
    resizeHandler = handleResize;
    visibilityHandler = handleVisibilityChange;

    function handleVisibilityChange() {
        if (document.hidden) {
            lastHiddenTime = Date.now();
        } else {
            if (Date.now() - lastHiddenTime > HIDDEN_THRESHOLD) {
                resetGame();
            } else {
                resumeAudioContext();
                if (!gameRunning) {
                    gameRunning = true;
                    requestAnimationFrame(gameLoop);
                }
            }
        }
    }

        function resetGame() {
        balls = Array.from({ length: NUM_BALLS }, () => new Ball());
        separateOverlappingBalls();
        collisionCount = 0;
        stoppedFor = 0;
        allBallsStopped = false;
    }

        function separateOverlappingBalls() {
        for (let i = 0; i < SEPARATION_ITERATIONS; i++) {
            let overlapsFound = false;
            for (let j = 0; j < balls.length; j++) {
                for (let k = j + 1; k < balls.length; k++) {
                    if (balls[j].resolveCollision(balls[k])) {
                        overlapsFound = true;
                    }
                }
            }
            if (!overlapsFound) break;
        }
    }

        function gameLoop(currentTime) {
        // Early exit if game is not running - don't request next frame
        if (!gameRunning || !bonkStarted) {
            return;
        }
        
        if (gamePaused) {
            requestAnimationFrame(gameLoop);
            return;
        }

        if (currentTime - lastTime >= FIXED_TIME_STEP) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            let allStopped = true;
            balls.forEach((ball, i) => {
                ball.move();
                for (let j = i + 1; j < balls.length; j++) {
                    if (ball.checkCollision(balls[j])) {
                        ball.resolveCollision(balls[j]);
                    }
                }
                ball.draw();
                if (ball.dx !== 0 || ball.dy !== 0) {
                    allStopped = false;
                }
            });

            if (allStopped) {
                if (!allBallsStopped) {
                    allBallsStopped = true;
                    lastStopTime = currentTime;
                    
                    // Announce to screen readers
                    const bonkStatus = document.getElementById('bonk-status');
                    if (bonkStatus) {
                        bonkStatus.textContent = `All balls stopped. ${collisionCount} total bonks.`;
                    }
                } else {
                    stoppedFor = Math.floor((currentTime - lastStopTime) / 1000);
                }
            } else {
                allBallsStopped = false;
                stoppedFor = 0; // Reset the counter when balls start moving
            }

            // Detect dark mode and set text color accordingly
            const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
            ctx.fillStyle = isDarkMode ? '#839496' : '#586e75';
            // Use a monospaced Courier font for score text to match site theme
            ctx.font = 'bold 14px "Courier New", Courier, monospace';
            
            const counterText = `${collisionCount} Bonks`;
            const textWidth = ctx.measureText(counterText).width;
            ctx.fillText(counterText, canvas.width / window.devicePixelRatio - textWidth - 6, 16);
            
            if (allBallsStopped && stoppedFor > 0) {
                const stoppedText = `Wow! Stopped for ${stoppedFor}s`;
                ctx.fillText(stoppedText, 6, 16);
            }

            lastTime = currentTime;
        }

        requestAnimationFrame(gameLoop);
    }

        function getEventPos(event) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        return {
            x: (event.clientX - rect.left) * scaleX / window.devicePixelRatio,
            y: (event.clientY - rect.top) * scaleY / window.devicePixelRatio
        };
    }

        function handleStart(event) {
        if (!bonkStarted) return; // Don't allow interaction until popup is dismissed
        
        event.preventDefault();
        event.stopPropagation();
        const pos = getEventPos(event);
        
        // Check for double tap
        if (doubleTapDetector.isDoubleTap(pos.x, pos.y)) {
            resetGame();
            return;
        }
        
        interactionStartPos = pos;
        lastCursorTime = Date.now();
        lastGrabbedPos = pos;

        for (const ball of balls) {
            if (ball.checkGrabbed(pos)) {
                grabbedBall = ball;
                ball.grabbed = true;
                ball.dx = 0;
                ball.dy = 0;
                break;
            }
        }
    }

        function handleMove(event) {
        if (!bonkStarted) return; // Don't allow interaction until popup is dismissed
        
        event.preventDefault();
        event.stopPropagation();
        const pos = getEventPos(event);

        if (grabbedBall) {
            const dx = pos.x - lastGrabbedPos.x;
            const dy = pos.y - lastGrabbedPos.y;
            const speed = Math.sqrt(dx * dx + dy * dy);
            const maxSpeed = 30;
            const normalizedSpeed = Math.min(speed, maxSpeed) / maxSpeed;

            grabbedBall.x = pos.x;
            grabbedBall.y = pos.y;

            balls.forEach(ball => {
                if (ball !== grabbedBall && grabbedBall.checkCollision(ball)) {
                    const angle = Math.atan2(ball.y - grabbedBall.y, ball.x - grabbedBall.x);
                    const pushForce = 10 * normalizedSpeed;
                    ball.dx += Math.cos(angle) * pushForce;
                    ball.dy += Math.sin(angle) * pushForce;
                }
            });

            lastGrabbedPos = pos;
        }
    }

        function handleEnd(event) {
        if (!bonkStarted) return; // Don't allow interaction until popup is dismissed
        
        event.preventDefault();
        event.stopPropagation();
        if (grabbedBall) {
            const pos = getEventPos(event);
            const timeDelta = (Date.now() - lastCursorTime) / 1000;
            const maxVelocity = 16;
            grabbedBall.dx = Math.max(-maxVelocity, Math.min(maxVelocity, (pos.x - interactionStartPos.x) / (timeDelta * 10)));
            grabbedBall.dy = Math.max(-maxVelocity, Math.min(maxVelocity, (pos.y - interactionStartPos.y) / (timeDelta * 10)));
            grabbedBall.grabbed = false;
            grabbedBall = null;
        }
    }

    // Public API
    window.BonkGame = {
        init: initGame,
        start: function() {
            bonkStarted = true;
            if (!gameRunning) {
                gameRunning = true;
            }
            // Set up event listeners when game starts
            if (resizeHandler && !window.bonkResizeListenerAdded) {
                window.addEventListener('resize', resizeHandler);
                window.bonkResizeListenerAdded = true;
            }
            if (visibilityHandler && !window.bonkVisibilityListenerAdded) {
                document.addEventListener('visibilitychange', visibilityHandler);
                window.bonkVisibilityListenerAdded = true;
            }
        },
        stop: function() {
            gameRunning = false;
            gamePaused = true;
            // Clean up timers
            if (pauseResumeTimeout) {
                clearTimeout(pauseResumeTimeout);
                pauseResumeTimeout = null;
            }
        },
        resume: function() {
            if (bonkStarted && !gameRunning) {
                // Clear any existing timeout before setting new one
                if (pauseResumeTimeout) {
                    clearTimeout(pauseResumeTimeout);
                }
                // Resume with delay
                pauseResumeTimeout = setTimeout(() => {
                    gameRunning = true;
                    gamePaused = false;
                    lastTime = performance.now();
                    requestAnimationFrame(gameLoop);
                }, PAUSE_RESUME_DELAY);
            }
        },
        isRunning: function() {
            return gameRunning;
        },
        hasStarted: function() {
            return bonkStarted;
        },
        cleanup: function() {
            // Stop game
            gameRunning = false;
            gamePaused = true;
            
            // Remove canvas event listeners
            if (canvas) {
                canvas.removeEventListener('pointerdown', handleStart);
                canvas.removeEventListener('pointermove', handleMove);
                canvas.removeEventListener('pointerup', handleEnd);
                canvas.removeEventListener('pointercancel', handleEnd);
            }
            
            // Remove window event listeners
            if (resizeHandler && window.bonkResizeListenerAdded) {
                window.removeEventListener('resize', resizeHandler);
                window.bonkResizeListenerAdded = false;
            }
            if (visibilityHandler && window.bonkVisibilityListenerAdded) {
                document.removeEventListener('visibilitychange', visibilityHandler);
                window.bonkVisibilityListenerAdded = false;
            }
            
            // Clean up timers
            if (pauseResumeTimeout) {
                clearTimeout(pauseResumeTimeout);
                pauseResumeTimeout = null;
            }
            
            // Stop all active audio sources
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
            
            // Close AudioContext
            if (audioContext) {
                try {
                    audioContext.close();
                } catch (e) {
                    console.error('Error closing AudioContext:', e);
                }
                audioContext = null;
                collisionBuffers = {};
            }
        }
    };

    // Initialize audio on page load
    document.addEventListener('DOMContentLoaded', async (event) => {
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();

            const soundFiles = ['bonk.wav'];

            const loadAudioFile = async (file) => {
                try {
                    const response = await fetch(`sounds/${file}`);
                    if (!response.ok) {
                        throw new Error(`Failed to fetch ${file}: ${response.statusText}`);
                    }
                    const arrayBuffer = await response.arrayBuffer();
                    const audioData = await audioContext.decodeAudioData(arrayBuffer);
                    collisionBuffers[file] = audioData;
                    console.log(`Audio file ${file} loaded successfully`);
                } catch (error) {
                    console.error(`Error loading audio file ${file}:`, error);
                }
            };

            await Promise.all(soundFiles.map(loadAudioFile));

            // Set up visibility change listener after audio is loaded
            if (visibilityHandler) {
                document.addEventListener('visibilitychange', visibilityHandler);
                window.bonkVisibilityListenerAdded = true;
            }

        } catch (error) {
            console.error('Error initializing audio context:', error);
        }
    });
})();

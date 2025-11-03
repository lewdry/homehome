// Blokbreaker Game Logic (Breakout)
// Version: 2024-11-02-paddle-clamp-fix
(function() {
    // Constants
    const canvas = document.getElementById('blokCanvas');
    let ctx = null;

    // Solarized color palette organized for rainbow effect
    const RAINBOW_COLORS = [
        // Reds/Oranges
        ['#dc322f', '#cc221f', '#ec423f'],
        // Oranges/Yellows
        ['#cb4b16', '#bb3b06', '#db5b26'],
        // Yellows
        ['#b58900', '#a57900', '#c59900'],
        // Greens
        ['#859900', '#719e07', '#95a900', '#617900'],
        // Cyans
        ['#2aa198', '#1a9188', '#35b1a8'],
        // Blues
        ['#268bd2', '#1e7bb2', '#3294c2'],
        // Violets
        ['#6c71c4', '#7c81d4'],
        // Magentas
        ['#d33682', '#e34692'],
    ];

    // Game configuration - tweakable parameters
    const CONFIG = {
        BALL_RADIUS: 8,
        BALL_SPEED_INITIAL: 4,
        BALL_SPEED_INCREMENT: 0.0002, // Very slight speed increase per frame
        BALL_SPEED_MAX: 5,
        SPEED_MULTIPLIER: 1, // Current speed multiplier (1, 1.5, or 2)
        PADDLE_HEIGHT: 12,
        PADDLE_WIDTH: 80,
        PADDLE_SPEED: 8,
        PADDLE_MAX_BOUNCE_ANGLE: Math.PI / 3, // 60 degrees max bounce angle
        BRICK_ROWS: 5,
        BRICK_COLS: 8,
        BRICK_HEIGHT: 30,
        BRICK_PADDING: 4,
        BRICK_OFFSET_TOP: 50,
        BRICK_OFFSET_LEFT: 10,
        BRICK_OFFSET_RIGHT: 10,
        LIVES: 3,
        PIXEL_SIZE: 2, // For dithered rendering
        PAUSE_RESUME_DELAY: 500, // 0.5s delay when returning to tab
    };

    // Game state
    let gameState = {
        ball: { x: 0, y: 0, dx: 0, dy: 0, speed: CONFIG.BALL_SPEED_INITIAL, color: '#268bd2' },
        paddle: { x: 0, y: 0, color: '#268bd2' },
        bricks: [],
        lives: CONFIG.LIVES,
        score: 0,
        gameRunning: false,
        gamePaused: false,
        gameStarted: false,
        ballInMotion: false, // Track if ball is currently moving
        keys: { left: false, right: false },
        mouseX: null,
        touchX: null,
        lastFrameTime: 0,
        pauseResumeTimeout: null,
        colorsAreRainbow: true, // Track whether colors are in rainbow order or random
    };

    // Double tap detector
    const doubleTapDetector = createDoubleTapDetector({ timeout: 300 });

    // Audio context for sounds (shared)
    let collisionBuffers = {};
    let activeSources = [];
    const MAX_ACTIVE_SOUNDS = 20;
    
    // Audio loading state
    let audioLoaded = false;
    let audioLoading = false;
    
    // Event listener references for cleanup
    let keyDownHandler = null;
    let keyUpHandler = null;
    let mouseMoveHandler = null;
    let touchMoveHandler = null;
    let pointerDownHandler = null;
    let blokResizeHandler = null; // Unique name to avoid conflicts
    let listenersAttached = false; // Track if event listeners are currently attached

    // Generate pixel pattern for dithered rectangle
    function generateRectPattern(width, height, color) {
        const pixelSize = CONFIG.PIXEL_SIZE;
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
        
        return { pattern, baseColor: color, ditherColor };
    }

    // Generate pixel pattern for dithered circle (ball)
    function generateCirclePattern(radius, color) {
        const pixelSize = CONFIG.PIXEL_SIZE;
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
        
        return { pattern, baseColor: color, ditherColor };
    }

    // Draw dithered pattern
    function drawDitheredPattern(x, y, patternData) {
        const { pattern, baseColor, ditherColor } = patternData;
        const pixelSize = CONFIG.PIXEL_SIZE;
        
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
    }

    // Initialize bricks with rainbow colors
    function initBricks() {
        const bricks = [];
        const canvasWidth = canvas.width / (window.devicePixelRatio || 1);
        const availableWidth = canvasWidth - CONFIG.BRICK_OFFSET_LEFT - CONFIG.BRICK_OFFSET_RIGHT;
        const brickWidth = (availableWidth - (CONFIG.BRICK_COLS - 1) * CONFIG.BRICK_PADDING) / CONFIG.BRICK_COLS;
        
        for (let col = 0; col < CONFIG.BRICK_COLS; col++) {
            // Assign rainbow colors by column
            const colorGroup = RAINBOW_COLORS[col % RAINBOW_COLORS.length];
            
            for (let row = 0; row < CONFIG.BRICK_ROWS; row++) {
                // Pick a color from the group based on row
                const color = colorGroup[row % colorGroup.length];
                
                const x = CONFIG.BRICK_OFFSET_LEFT + col * (brickWidth + CONFIG.BRICK_PADDING);
                const y = CONFIG.BRICK_OFFSET_TOP + row * (CONFIG.BRICK_HEIGHT + CONFIG.BRICK_PADDING);
                
                const pattern = generateRectPattern(brickWidth, CONFIG.BRICK_HEIGHT, color);
                
                bricks.push({
                    x: x,
                    y: y,
                    width: brickWidth,
                    height: CONFIG.BRICK_HEIGHT,
                    color: color,
                    status: 1, // 1 = visible, 0 = destroyed
                    pattern: pattern
                });
            }
        }
        
        return bricks;
    }

    // Toggle between random colors and ordered rainbow columns
    function toggleColors() {
        // Get all available colors
        const allColors = RAINBOW_COLORS.flat();
        
        if (gameState.colorsAreRainbow) {
            // Currently rainbow, switch to random
            gameState.bricks.forEach(brick => {
                if (brick.status === 1) {
                    const newColor = allColors[Math.floor(Math.random() * allColors.length)];
                    brick.color = newColor;
                    brick.pattern = generateRectPattern(brick.width, brick.height, newColor);
                }
            });
            
            // Randomize paddle color
            const newPaddleColor = allColors[Math.floor(Math.random() * allColors.length)];
            gameState.paddle.color = newPaddleColor;
            gameState.paddle.pattern = generateRectPattern(
                CONFIG.PADDLE_WIDTH, 
                CONFIG.PADDLE_HEIGHT, 
                newPaddleColor
            );
            
            // Randomize ball color
            const newBallColor = allColors[Math.floor(Math.random() * allColors.length)];
            gameState.ball.color = newBallColor;
            gameState.ball.pattern = generateCirclePattern(CONFIG.BALL_RADIUS, newBallColor);
            
            gameState.colorsAreRainbow = false;
        } else {
            // Currently random, switch to rainbow
            // Re-apply rainbow colors based on brick position
            const bricksPerColumn = CONFIG.BRICK_ROWS;
            
            gameState.bricks.forEach((brick, index) => {
                if (brick.status === 1) {
                    const col = Math.floor(index / bricksPerColumn);
                    const row = index % bricksPerColumn;
                    
                    const colorGroup = RAINBOW_COLORS[col % RAINBOW_COLORS.length];
                    const newColor = colorGroup[row % colorGroup.length];
                    
                    brick.color = newColor;
                    brick.pattern = generateRectPattern(brick.width, brick.height, newColor);
                }
            });
            
            // Set paddle to a random rainbow color group
            const paddleColorGroup = RAINBOW_COLORS[Math.floor(Math.random() * RAINBOW_COLORS.length)];
            const newPaddleColor = paddleColorGroup[Math.floor(Math.random() * paddleColorGroup.length)];
            gameState.paddle.color = newPaddleColor;
            gameState.paddle.pattern = generateRectPattern(
                CONFIG.PADDLE_WIDTH, 
                CONFIG.PADDLE_HEIGHT, 
                newPaddleColor
            );
            
            // Set ball to a random rainbow color group
            const ballColorGroup = RAINBOW_COLORS[Math.floor(Math.random() * RAINBOW_COLORS.length)];
            const newBallColor = ballColorGroup[Math.floor(Math.random() * ballColorGroup.length)];
            gameState.ball.color = newBallColor;
            gameState.ball.pattern = generateCirclePattern(CONFIG.BALL_RADIUS, newBallColor);
            
            gameState.colorsAreRainbow = true;
        }
    }

    // Initialize game
    function initGame() {
        if (!canvas) {
            console.error('BLOK canvas element not found');
            return;
        }

        try {
            ctx = canvas.getContext('2d');
            if (!ctx) {
                console.error('Could not get 2D context for blok canvas');
                return;
            }
        } catch (error) {
            console.error('Error getting canvas context:', error);
            return;
        }
        
        resizeBlokCanvas();
        
        // Initialize audio if not already done
        initAudio();
        
        // Create event handlers with error handling
        keyDownHandler = (e) => {
            try {
                handleKeyDown(e);
            } catch (error) {
                console.error('Error in keydown handler:', error);
            }
        };
        
        keyUpHandler = (e) => {
            try {
                handleKeyUp(e);
            } catch (error) {
                console.error('Error in keyup handler:', error);
            }
        };
        
        mouseMoveHandler = (e) => {
            try {
                handleMouseMove(e);
            } catch (error) {
                console.error('Error in mousemove handler:', error);
            }
        };
        
        touchMoveHandler = (e) => {
            try {
                handleTouchMove(e);
            } catch (error) {
                console.error('Error in touchmove handler:', error);
            }
        };
        
        pointerDownHandler = (e) => {
            try {
                handlePointerDown(e);
            } catch (error) {
                console.error('Error in pointerdown handler:', error);
            }
        };
        
        blokResizeHandler = () => {
            try {
                handleResize();
            } catch (error) {
                console.error('Error in resize handler:', error);
            }
        };
        
        // Set up event listeners
        document.addEventListener('keydown', keyDownHandler);
        document.addEventListener('keyup', keyUpHandler);
        canvas.addEventListener('mousemove', mouseMoveHandler);
        canvas.addEventListener('touchmove', touchMoveHandler, { passive: false });
        canvas.addEventListener('pointerdown', pointerDownHandler, { passive: false });
        
        window.addEventListener('resize', blokResizeHandler);
        
        listenersAttached = true;
        
        // Set up speed slider
        initSpeedSlider();
        
        console.log('BLOK game initialized');
    }

    // Resize canvas
    function resizeBlokCanvas() {
        if (!canvas || !ctx) return;
        resizeCanvas(canvas, ctx);
    }

    function handleResize() {
        resizeBlokCanvas();
        // Reposition paddle and ball if game is active
        if (gameState.gameStarted) {
            const canvasWidth = canvas.width / (window.devicePixelRatio || 1);
            const canvasHeight = canvas.height / (window.devicePixelRatio || 1);
            
            // Keep paddle in bounds - paddle.x is the center
            const paddleHalfWidth = CONFIG.PADDLE_WIDTH / 2;
            if (gameState.paddle.x + paddleHalfWidth > canvasWidth) {
                gameState.paddle.x = canvasWidth - paddleHalfWidth;
            }
            if (gameState.paddle.x - paddleHalfWidth < 0) {
                gameState.paddle.x = paddleHalfWidth;
            }
            
            // Reinitialize bricks with new dimensions
            const activeBricksCount = gameState.bricks.filter(b => b.status === 1).length;
            if (activeBricksCount > 0) {
                const newBricks = initBricks();
                // Preserve status of destroyed bricks
                gameState.bricks.forEach((oldBrick, i) => {
                    if (newBricks[i]) {
                        newBricks[i].status = oldBrick.status;
                    }
                });
                gameState.bricks = newBricks;
            }
        }
    }

    // Start a new game
    function startGame() {
        gameState.gameStarted = true;
        gameState.gameRunning = true;
        gameState.gamePaused = false;
        gameState.lives = CONFIG.LIVES;
        gameState.score = 0;
        gameState.colorsAreRainbow = true; // Reset to rainbow order
        
        // Show speed slider
        const speedSlider = document.getElementById('blok-speed-slider');
        if (speedSlider) {
            speedSlider.style.display = 'flex';
        }
        
        // Initialize bricks
        gameState.bricks = initBricks();
        
        // Initialize ball (stationary, waiting for tap to start)
        const canvasWidth = canvas.width / (window.devicePixelRatio || 1);
        const canvasHeight = canvas.height / (window.devicePixelRatio || 1);
        
        const allColors = RAINBOW_COLORS.flat();
        const ballColor = allColors[Math.floor(Math.random() * allColors.length)];
        
        // Apply speed multiplier to initial ball speed
        const adjustedSpeed = CONFIG.BALL_SPEED_INITIAL * CONFIG.SPEED_MULTIPLIER;
        
        gameState.ball = {
            x: canvasWidth / 2,
            y: canvasHeight - 100,
            dx: 0, // Ball starts stationary
            dy: 0, // Ball starts stationary
            speed: adjustedSpeed,
            color: ballColor,
            pattern: generateCirclePattern(CONFIG.BALL_RADIUS, ballColor)
        };
        
        gameState.ballInMotion = false;
        
        // Initialize paddle - using center-based coordinates
        const paddleColor = allColors[Math.floor(Math.random() * allColors.length)];
        gameState.paddle = {
            x: canvasWidth / 2, // Center of paddle, not left edge
            y: canvasHeight - 30,
            color: paddleColor,
            pattern: generateRectPattern(CONFIG.PADDLE_WIDTH, CONFIG.PADDLE_HEIGHT, paddleColor)
        };
        
        gameState.lastFrameTime = performance.now();
        requestAnimationFrame(gameLoop);
    }

    // Reset ball after losing a life
    function resetBall() {
        const canvasWidth = canvas.width / (window.devicePixelRatio || 1);
        const canvasHeight = canvas.height / (window.devicePixelRatio || 1);
        
        // Apply speed multiplier to reset ball speed
        const adjustedSpeed = CONFIG.BALL_SPEED_INITIAL * CONFIG.SPEED_MULTIPLIER;
        
        // Position ball directly above paddle (same x position)
        gameState.ball.x = gameState.paddle.x;
        gameState.ball.y = canvasHeight - 100;
        gameState.ball.dx = 0; // Ball starts stationary
        gameState.ball.dy = 0; // Ball starts stationary
        gameState.ball.speed = adjustedSpeed;
        
        gameState.ballInMotion = false; // Ball needs tap to start
        
        // Brief pause before allowing interaction
        gameState.gamePaused = true;
        setTimeout(() => {
            if (gameState.gameRunning) {
                gameState.gamePaused = false;
            }
        }, 1000);
    }

    // Game loop
    function gameLoop(currentTime) {
        // Early exit if game is not running - don't request next frame
        if (!gameState.gameRunning) {
            return;
        }
        
        if (!gameState.gamePaused) {
            const deltaTime = currentTime - gameState.lastFrameTime;
            gameState.lastFrameTime = currentTime;
            
            update(deltaTime);
            render();
        }
        
        // Only schedule next frame if still running
        if (gameState.gameRunning) {
            requestAnimationFrame(gameLoop);
        }
    }

    // Update game state
    function update(deltaTime) {
        const canvasWidth = canvas.width / (window.devicePixelRatio || 1);
        const canvasHeight = canvas.height / (window.devicePixelRatio || 1);
        
        // Update paddle position - paddle.x is the center
        const paddleHalfWidth = CONFIG.PADDLE_WIDTH / 2;
        if (gameState.keys.left && gameState.paddle.x > paddleHalfWidth) {
            gameState.paddle.x -= CONFIG.PADDLE_SPEED;
        }
        if (gameState.keys.right && gameState.paddle.x < canvasWidth - paddleHalfWidth) {
            gameState.paddle.x += CONFIG.PADDLE_SPEED;
        }
        
        // Mouse/touch control - paddle.x is the center
        if (gameState.mouseX !== null) {
            // Clamp paddle center to keep paddle within bounds
            gameState.paddle.x = Math.max(paddleHalfWidth, Math.min(gameState.mouseX, canvasWidth - paddleHalfWidth));
        }
        if (gameState.touchX !== null) {
            // Clamp paddle center to keep paddle within bounds
            gameState.paddle.x = Math.max(paddleHalfWidth, Math.min(gameState.touchX, canvasWidth - paddleHalfWidth));
        }
        
        // Only update ball physics if ball is in motion
        if (!gameState.ballInMotion) {
            // Keep ball centered above paddle when stationary
            gameState.ball.x = gameState.paddle.x;
            return; // Don't process ball physics
        }
        
        // Gradually increase ball speed
        const maxSpeed = CONFIG.BALL_SPEED_MAX * CONFIG.SPEED_MULTIPLIER;
        if (gameState.ball.speed < maxSpeed) {
            gameState.ball.speed += CONFIG.BALL_SPEED_INCREMENT * CONFIG.SPEED_MULTIPLIER;
            const speedRatio = gameState.ball.speed / Math.sqrt(gameState.ball.dx ** 2 + gameState.ball.dy ** 2);
            gameState.ball.dx *= speedRatio;
            gameState.ball.dy *= speedRatio;
        }
        
        // Update ball position
        gameState.ball.x += gameState.ball.dx;
        gameState.ball.y += gameState.ball.dy;
        
        // Ball edges for collision detection
        const ballLeft = gameState.ball.x - CONFIG.BALL_RADIUS;
        const ballRight = gameState.ball.x + CONFIG.BALL_RADIUS;
        const ballTop = gameState.ball.y - CONFIG.BALL_RADIUS;
        const ballBottom = gameState.ball.y + CONFIG.BALL_RADIUS;
        
        // Wall collision - symmetric on both sides
        if (ballLeft <= 0) {
            gameState.ball.x = CONFIG.BALL_RADIUS;
            gameState.ball.dx *= -1;
            playCollisionSound();
        }
        if (ballRight >= canvasWidth) {
            gameState.ball.x = canvasWidth - CONFIG.BALL_RADIUS;
            gameState.ball.dx *= -1;
            playCollisionSound();
        }
        
        // Top wall collision
        if (ballTop <= 0) {
            gameState.ball.y = CONFIG.BALL_RADIUS;
            gameState.ball.dy *= -1;
            playCollisionSound();
        }
        
        // Bottom - lose life
        if (ballBottom > canvasHeight) {
            gameState.lives--;
            if (gameState.lives <= 0) {
                // Game over
                endGame(false);
            } else {
                resetBall();
            }
        }
        
        // Paddle collision - center-based detection
        const paddleHalfHeight = CONFIG.PADDLE_HEIGHT / 2;
        const paddleTop = gameState.paddle.y - paddleHalfHeight;
        const paddleBottom = gameState.paddle.y + paddleHalfHeight;
        const paddleLeft = gameState.paddle.x - paddleHalfWidth;
        const paddleRight = gameState.paddle.x + paddleHalfWidth;
        
        // Check for collision
        if (ballBottom >= paddleTop &&
            ballTop < paddleBottom &&
            ballRight > paddleLeft &&
            ballLeft < paddleRight &&
            gameState.ball.dy > 0) { // Only bounce if ball is moving downward
            
            // Position ball so its bottom edge is exactly at paddle top
            gameState.ball.y = paddleTop - CONFIG.BALL_RADIUS;
            
            // Calculate normalized hit position from paddle center (-1 to +1)
            const hitPos = (gameState.ball.x - gameState.paddle.x) / paddleHalfWidth;
            const angle = hitPos * CONFIG.PADDLE_MAX_BOUNCE_ANGLE;
            
            const speed = Math.sqrt(gameState.ball.dx ** 2 + gameState.ball.dy ** 2);
            gameState.ball.dx = speed * Math.sin(angle);
            gameState.ball.dy = -Math.abs(speed * Math.cos(angle)); // Always upward
            
            playCollisionSound();
        }
        
        // Brick collision - precise edge detection
        for (let i = 0; i < gameState.bricks.length; i++) {
            const brick = gameState.bricks[i];
            if (brick.status === 0) continue;
            
            // Calculate brick edges
            const brickLeft = brick.x;
            const brickRight = brick.x + brick.width;
            const brickTop = brick.y;
            const brickBottom = brick.y + brick.height;
            
            // Check if ball edges touch or overlap with brick edges
            if (ballRight >= brickLeft &&
                ballLeft <= brickRight &&
                ballBottom >= brickTop &&
                ballTop <= brickBottom) {
                
                // Determine which side was hit based on penetration depth
                const penetrationLeft = ballRight - brickLeft;
                const penetrationRight = brickRight - ballLeft;
                const penetrationTop = ballBottom - brickTop;
                const penetrationBottom = brickBottom - ballTop;
                
                // Find minimum penetration to determine collision side
                const minPenetration = Math.min(penetrationLeft, penetrationRight, penetrationTop, penetrationBottom);
                
                // Bounce based on which side has minimum penetration
                if (minPenetration === penetrationTop) {
                    // Hit from top
                    gameState.ball.dy = -Math.abs(gameState.ball.dy);
                    gameState.ball.y = brickTop - CONFIG.BALL_RADIUS;
                } else if (minPenetration === penetrationBottom) {
                    // Hit from bottom
                    gameState.ball.dy = Math.abs(gameState.ball.dy);
                    gameState.ball.y = brickBottom + CONFIG.BALL_RADIUS;
                } else if (minPenetration === penetrationLeft) {
                    // Hit from left
                    gameState.ball.dx = -Math.abs(gameState.ball.dx);
                    gameState.ball.x = brickLeft - CONFIG.BALL_RADIUS;
                } else {
                    // Hit from right
                    gameState.ball.dx = Math.abs(gameState.ball.dx);
                    gameState.ball.x = brickRight + CONFIG.BALL_RADIUS;
                }
                
                brick.status = 0;
                gameState.score++;
                playCollisionSound();
                
                // Check for win
                if (gameState.bricks.every(b => b.status === 0)) {
                    endGame(true);
                }
                break;
            }
        }
    }

    // Render game
    function render() {
        const canvasWidth = canvas.width / (window.devicePixelRatio || 1);
        const canvasHeight = canvas.height / (window.devicePixelRatio || 1);
        
        // Clear canvas
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        
        // Draw bricks
        gameState.bricks.forEach(brick => {
            if (brick.status === 1) {
                drawDitheredPattern(brick.x, brick.y, brick.pattern);
            }
        });
        
        // Draw paddle - centered on paddle.x, paddle.y
        drawDitheredPattern(
            gameState.paddle.x - CONFIG.PADDLE_WIDTH / 2,
            gameState.paddle.y - CONFIG.PADDLE_HEIGHT / 2,
            gameState.paddle.pattern
        );
        
        // Draw ball
        drawDitheredPattern(
            gameState.ball.x - CONFIG.BALL_RADIUS,
            gameState.ball.y - CONFIG.BALL_RADIUS,
            gameState.ball.pattern
        );
        
        // Draw HUD
        const isDarkMode = document.body.classList.contains('force-dark') || 
                          (!document.body.classList.contains('force-light') && 
                           window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
        ctx.fillStyle = isDarkMode ? '#839496' : '#586e75';
        ctx.font = 'bold 14px "Courier New", Courier, monospace';
        
        // Lives
        ctx.fillText(`Lives: ${gameState.lives}`, 6, 20);
        
        // Score
        const scoreText = `Score: ${gameState.score}`;
        const scoreWidth = ctx.measureText(scoreText).width;
        ctx.fillText(scoreText, canvasWidth - scoreWidth - 6, 20);
    }

    // End game
    function endGame(won) {
        gameState.gameRunning = false;
        gameState.gamePaused = true;
        
        // Play win or game over sound
        if (won) {
            playWinSound();
        } else {
            playGameOverSound();
        }
        
        // Get popup elements
        const endgamePopup = document.getElementById('blok-endgame-popup');
        const endgameTitle = document.getElementById('blok-endgame-title');
        const endgameMessage = document.getElementById('blok-endgame-message');
        const endgameOkBtn = document.getElementById('blok-endgame-ok');
        
        if (!endgamePopup || !endgameTitle || !endgameMessage || !endgameOkBtn) {
            console.error('Endgame popup elements not found');
            return;
        }
        
        // Set message
        if (won) {
            endgameTitle.textContent = 'YOU WIN!';
            endgameMessage.textContent = `Perfect! You scored ${gameState.score} points!`;
        } else {
            endgameTitle.textContent = 'GAME OVER';
            endgameMessage.textContent = `You scored ${gameState.score} points. Try again?`;
        }
        
        // Show popup after brief delay
        setTimeout(() => {
            endgamePopup.style.display = 'flex';
            endgameOkBtn.focus();
        }, 100);
        
        // Set up OK button handler (remove old listeners first)
        const newOkBtn = endgameOkBtn.cloneNode(true);
        endgameOkBtn.parentNode.replaceChild(newOkBtn, endgameOkBtn);
        
        newOkBtn.addEventListener('click', () => {
            endgamePopup.style.display = 'none';
            startGame();
        });
    }

    // Event handlers
    function handleKeyDown(e) {
        if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
            gameState.keys.left = true;
        }
        if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
            gameState.keys.right = true;
        }
        // Launch ball with spacebar
        if (e.key === ' ' && gameState.gameStarted && !gameState.ballInMotion && !gameState.gamePaused) {
            e.preventDefault(); // Prevent page scroll
            launchBall();
        }
    }

    function handleKeyUp(e) {
        if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
            gameState.keys.left = false;
        }
        if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
            gameState.keys.right = false;
        }
    }

    function handleMouseMove(e) {
        if (!gameState.gameStarted || gameState.gamePaused) return;
        const rect = canvas.getBoundingClientRect();
        gameState.mouseX = e.clientX - rect.left;
        gameState.touchX = null; // Clear touch control
    }

    function handleTouchMove(e) {
        if (!gameState.gameStarted || gameState.gamePaused) return;
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        if (e.touches.length > 0) {
            gameState.touchX = e.touches[0].clientX - rect.left;
            gameState.mouseX = null; // Clear mouse control
        }
    }

    function handlePointerDown(e) {
        if (!gameState.gameStarted) return;
        
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // If ball is not in motion, launch it with a tap
        if (!gameState.ballInMotion && !gameState.gamePaused) {
            launchBall();
            return; // Don't process double-tap for color change on launch
        }
        
        // Check for double tap to toggle colors (only when ball is moving)
        if (doubleTapDetector.isDoubleTap(x, y)) {
            toggleColors();
        }
    }
    
    // Launch the ball from stationary state
    function launchBall() {
        const adjustedSpeed = gameState.ball.speed;
        
        // Launch ball upward with random horizontal direction
        gameState.ball.dx = adjustedSpeed * (Math.random() > 0.5 ? 1 : -1);
        gameState.ball.dy = -adjustedSpeed;
        gameState.ballInMotion = true;
        
        // Play a sound for feedback
        playCollisionSound();
    }

    // Audio functions
    function initAudio() {
        // Audio loading will happen on demand when needed
        // Using shared AudioContext from utils.js
    }

    function playCollisionSound() {
        if (window.isMuted || Object.keys(collisionBuffers).length === 0) {
            return;
        }
        
        // Resume AudioContext if suspended (required for browsers)
        window.resumeSharedAudioContext();
        
        try {
            const soundFiles = Object.keys(collisionBuffers);
            const randomIndex = Math.floor(Math.random() * soundFiles.length);
            const randomSoundFile = soundFiles[randomIndex];
            
            // Use shared audio utility
            const audioNodes = window.playAudioBuffer(
                collisionBuffers[randomSoundFile],
                0.9
            );
            
            if (audioNodes) {
                const { source, gainNode } = audioNodes;
                
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
                
                activeSources.push({ source, gainNode });
                
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
            }
        } catch (error) {
            console.error("Error playing sound:", error);
        }
    }

    function playWinSound() {
        if (window.isMuted || !collisionBuffers['D3.mp3'] || !collisionBuffers['G3.mp3']) {
            return;
        }
        
        // Resume AudioContext if suspended
        window.resumeSharedAudioContext();
        
        try {
            // Play G2
            const audioNodes1 = window.playAudioBuffer(collisionBuffers['G2.mp3'], 0.4);
            
            // Play D3 after 200ms
            setTimeout(() => {
                if (!window.isMuted) {
                    const audioNodes2 = window.playAudioBuffer(collisionBuffers['D3.mp3'], 0.4);
                }
            }, 200);
        } catch (error) {
            console.error("Error playing win sound:", error);
        }
    }

    function playGameOverSound() {
        if (window.isMuted || !collisionBuffers['D3.mp3'] || !collisionBuffers['G2.mp3']) {
            return;
        }
        
        // Resume AudioContext if suspended
        window.resumeSharedAudioContext();
        
        try {
            // Play D3
            const audioNodes1 = window.playAudioBuffer(collisionBuffers['D3.mp3'], 0.4);
            
            // Play G2 after 200ms
            setTimeout(() => {
                if (!window.isMuted) {
                    const audioNodes2 = window.playAudioBuffer(collisionBuffers['G2.mp3'], 0.4);
                }
            }, 200);
        } catch (error) {
            console.error("Error playing game over sound:", error);
        }
    }

    // Initialize speed slider
    function initSpeedSlider() {
        const speedSlider = document.getElementById('blok-speed-slider');
        if (!speedSlider) return;
        
        const speedButtons = speedSlider.querySelectorAll('.speed-step');
        
        speedButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const speed = parseFloat(button.getAttribute('data-speed'));
                
                // Update active state
                speedButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                
                // Update config
                const oldMultiplier = CONFIG.SPEED_MULTIPLIER;
                CONFIG.SPEED_MULTIPLIER = speed;
                
                // Adjust current ball speed if game is running
                if (gameState.gameStarted && gameState.ball) {
                    const speedRatio = speed / oldMultiplier;
                    gameState.ball.dx *= speedRatio;
                    gameState.ball.dy *= speedRatio;
                    gameState.ball.speed *= speedRatio;
                }
                
                // Play click sound
                if (window.playRetroClick) {
                    try { window.playRetroClick(); } catch (err) {}
                }
            });
            
            // Touch support
            button.addEventListener('touchend', (e) => {
                e.preventDefault();
                button.click();
            }, { passive: false });
        });
    }

    // Public API
    window.BlokGame = {
        init: initGame,
        start: startGame,
        stop: function() {
            gameState.gameRunning = false;
            gameState.gamePaused = true;
            // Clean up timers
            if (gameState.pauseResumeTimeout) {
                clearTimeout(gameState.pauseResumeTimeout);
                gameState.pauseResumeTimeout = null;
            }
        },
        resume: function() {
            if (gameState.gameStarted && !gameState.gameRunning) {
                // Clear any existing timeout before setting new one
                if (gameState.pauseResumeTimeout) {
                    clearTimeout(gameState.pauseResumeTimeout);
                }
                // Resume with delay
                gameState.pauseResumeTimeout = setTimeout(() => {
                    gameState.gameRunning = true;
                    gameState.gamePaused = false;
                    gameState.lastFrameTime = performance.now();
                    requestAnimationFrame(gameLoop);
                }, CONFIG.PAUSE_RESUME_DELAY);
            }
        },
        isRunning: function() {
            return gameState.gameRunning;
        },
        hasStarted: function() {
            return gameState.gameStarted;
        },
        getConfig: function() {
            return CONFIG;
        },
        isAudioLoaded: function() {
            return audioLoaded;
        },
        isAudioLoading: function() {
            return audioLoading;
        },
        cleanup: function() {
            // Stop game
            gameState.gameRunning = false;
            gameState.gamePaused = true;
            
            // Remove event listeners only if they were attached
            if (listenersAttached) {
                if (keyDownHandler) {
                    document.removeEventListener('keydown', keyDownHandler);
                    keyDownHandler = null;
                }
                if (keyUpHandler) {
                    document.removeEventListener('keyup', keyUpHandler);
                    keyUpHandler = null;
                }
                if (canvas) {
                    if (mouseMoveHandler) {
                        canvas.removeEventListener('mousemove', mouseMoveHandler);
                        mouseMoveHandler = null;
                    }
                    if (touchMoveHandler) {
                        canvas.removeEventListener('touchmove', touchMoveHandler);
                        touchMoveHandler = null;
                    }
                    if (pointerDownHandler) {
                        canvas.removeEventListener('pointerdown', pointerDownHandler);
                        pointerDownHandler = null;
                    }
                }
                if (blokResizeHandler) {
                    window.removeEventListener('resize', blokResizeHandler);
                    blokResizeHandler = null;
                }
                listenersAttached = false;
            }
            
            // Clean up timers
            if (gameState.pauseResumeTimeout) {
                clearTimeout(gameState.pauseResumeTimeout);
                gameState.pauseResumeTimeout = null;
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
            
            // Clear collision buffers (but don't close shared AudioContext)
            collisionBuffers = {};
        }
    };
    
    // Load audio files when module loads
    (async function() {
        audioLoading = true;
        try {
            const soundFiles = ['G2.mp3', 'A2.mp3', 'B2.mp3', 'D3.mp3', 'E3.mp3', 'G3.mp3'];
            
            const loadAudioFile = async (file) => {
                try {
                    const audioBuffer = await window.loadAudioBuffer(file);
                    collisionBuffers[file] = audioBuffer;
                    console.log(`Blok: Audio file ${file} loaded successfully`);
                } catch (error) {
                    console.error(`Blok: Error loading audio file ${file}:`, error);
                }
            };
            
            await Promise.all(soundFiles.map(loadAudioFile));
            audioLoaded = true;
            console.log('Blok audio loading complete');
        } catch (error) {
            console.error('Blok: Error initializing audio:', error);
        } finally {
            audioLoading = false;
        }
    })();
})();

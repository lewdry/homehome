// Bumperblock Game Logic (Breakout)
// Version: 2024-11-02-paddle-clamp-fix
(function() {
    // Constants
    const canvas = document.getElementById('bumpCanvas');
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
        BALL_SPEED_INITIAL: 3,
        BALL_SPEED_INCREMENT: 0.0002, // Very slight speed increase per frame
        BALL_SPEED_MAX: 5,
        PADDLE_HEIGHT: 12,
        PADDLE_WIDTH: 80,
        PADDLE_SPEED: 8,
        PADDLE_MAX_BOUNCE_ANGLE: Math.PI / 3, // 60 degrees max bounce angle
        BRICK_ROWS: 6,
        BRICK_COLS: 8,
        BRICK_HEIGHT: 20,
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
        keys: { left: false, right: false },
        mouseX: null,
        touchX: null,
        lastFrameTime: 0,
        pauseResumeTimeout: null,
        colorsAreRainbow: true, // Track whether colors are in rainbow order or random
    };

    // Double tap detector
    const doubleTapDetector = createDoubleTapDetector({ timeout: 300 });

    // Audio context for sounds (shared with bonk)
    let audioContext = null;
    let collisionBuffers = {};
    let activeSources = [];
    const MAX_ACTIVE_SOUNDS = 20;

    // Dithering helper functions
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
            
            // Set paddle to a rainbow color
            const paddleColorGroup = RAINBOW_COLORS[5]; // Blues
            const newPaddleColor = paddleColorGroup[0];
            gameState.paddle.color = newPaddleColor;
            gameState.paddle.pattern = generateRectPattern(
                CONFIG.PADDLE_WIDTH, 
                CONFIG.PADDLE_HEIGHT, 
                newPaddleColor
            );
            
            // Set ball to a rainbow color
            const ballColorGroup = RAINBOW_COLORS[5]; // Blues
            const newBallColor = ballColorGroup[0];
            gameState.ball.color = newBallColor;
            gameState.ball.pattern = generateCirclePattern(CONFIG.BALL_RADIUS, newBallColor);
            
            gameState.colorsAreRainbow = true;
        }
    }

    // Initialize game
    function initGame() {
        if (!canvas) {
            console.error('BRKR canvas element not found');
            return;
        }

        ctx = canvas.getContext('2d');
        resizeCanvas();
        
        // Initialize audio if not already done
        initAudio();
        
        // Set up event listeners
        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('keyup', handleKeyUp);
        canvas.addEventListener('mousemove', handleMouseMove);
        canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
        canvas.addEventListener('pointerdown', handlePointerDown, { passive: false });
        
        window.addEventListener('resize', handleResize);
        
        console.log('BRKR game initialized');
    }

    // Resize canvas
    function resizeCanvas() {
        if (!canvas) return;
        
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
        
        // Reset transform before scaling to prevent accumulation
        if (ctx) {
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.scale(dpr, dpr);
            ctx.imageSmoothingEnabled = false;
        }
    }

    function handleResize() {
        resizeCanvas();
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
        
        // Initialize bricks
        gameState.bricks = initBricks();
        
        // Initialize ball
        const canvasWidth = canvas.width / (window.devicePixelRatio || 1);
        const canvasHeight = canvas.height / (window.devicePixelRatio || 1);
        
        const allColors = RAINBOW_COLORS.flat();
        const ballColor = allColors[Math.floor(Math.random() * allColors.length)];
        gameState.ball = {
            x: canvasWidth / 2,
            y: canvasHeight - 100,
            dx: CONFIG.BALL_SPEED_INITIAL * (Math.random() > 0.5 ? 1 : -1),
            dy: -CONFIG.BALL_SPEED_INITIAL,
            speed: CONFIG.BALL_SPEED_INITIAL,
            color: ballColor,
            pattern: generateCirclePattern(CONFIG.BALL_RADIUS, ballColor)
        };
        
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
        
        gameState.ball.x = canvasWidth / 2;
        gameState.ball.y = canvasHeight - 100;
        gameState.ball.dx = CONFIG.BALL_SPEED_INITIAL * (Math.random() > 0.5 ? 1 : -1);
        gameState.ball.dy = -CONFIG.BALL_SPEED_INITIAL;
        gameState.ball.speed = CONFIG.BALL_SPEED_INITIAL;
        
        // Brief pause before resuming
        gameState.gamePaused = true;
        setTimeout(() => {
            if (gameState.gameRunning) {
                gameState.gamePaused = false;
            }
        }, 1000);
    }

    // Game loop
    function gameLoop(currentTime) {
        if (!gameState.gameRunning) {
            return;
        }
        
        if (!gameState.gamePaused) {
            const deltaTime = currentTime - gameState.lastFrameTime;
            gameState.lastFrameTime = currentTime;
            
            update(deltaTime);
            render();
        }
        
        requestAnimationFrame(gameLoop);
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
        
        // Gradually increase ball speed
        if (gameState.ball.speed < CONFIG.BALL_SPEED_MAX) {
            gameState.ball.speed += CONFIG.BALL_SPEED_INCREMENT;
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
        ctx.font = '16px "Courier New", Courier, monospace';
        
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
        
        // Get popup elements
        const endgamePopup = document.getElementById('bump-endgame-popup');
        const endgameTitle = document.getElementById('bump-endgame-title');
        const endgameMessage = document.getElementById('bump-endgame-message');
        const endgameOkBtn = document.getElementById('bump-endgame-ok');
        
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
        
        // Check for double tap to toggle colors
        if (doubleTapDetector.isDoubleTap(x, y)) {
            toggleColors();
        }
    }

    // Audio functions
    function initAudio() {
        if (audioContext) return;
        
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
                } catch (error) {
                    console.error(`Error loading audio file ${file}:`, error);
                }
            };
            
            Promise.all(soundFiles.map(loadAudioFile));
        } catch (error) {
            console.error('Error initializing audio context:', error);
        }
    }

    function playCollisionSound() {
        if (window.isMuted || !audioContext || Object.keys(collisionBuffers).length === 0) {
            return;
        }
        
        try {
            const soundFiles = Object.keys(collisionBuffers);
            const randomIndex = Math.floor(Math.random() * soundFiles.length);
            const randomSoundFile = soundFiles[randomIndex];
            
            const source = audioContext.createBufferSource();
            source.buffer = collisionBuffers[randomSoundFile];
            
            const gainNode = audioContext.createGain();
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            
            source.connect(gainNode);
            gainNode.connect(audioContext.destination);
            source.start();
            
            activeSources.push({ source, gainNode });
            
            if (activeSources.length > MAX_ACTIVE_SOUNDS) {
                const oldest = activeSources.shift();
                oldest.source.stop();
                oldest.source.disconnect();
                oldest.gainNode.disconnect();
            }
        } catch (error) {
            console.error("Error playing sound:", error);
        }
    }

    // Public API
    window.BumpGame = {
        init: initGame,
        start: startGame,
        stop: function() {
            gameState.gameRunning = false;
            gameState.gamePaused = true;
        },
        resume: function() {
            if (gameState.gameStarted && !gameState.gameRunning) {
                // Resume with delay
                clearTimeout(gameState.pauseResumeTimeout);
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
        }
    };
})();

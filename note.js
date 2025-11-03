// Note App Logic
let noteText = '';
let maxCharacters = 0;
let cursorPosition = 0; // Track cursor position for editing
let desktopKeyboardHandler = null; // Store reference for cleanup
let noteListenersAttached = false; // Track if event listeners are attached
let noteKeyboardBuilt = false; // Track if keyboard HTML has been built

// Event handler references for cleanup
let textAreaClickHandler = null;
let textAreaTouchHandler = null;
let textAreaPointerHandler = null;
let resizeHandler = null;

// QWERTY keyboard layout (uppercase only)
const keyboardLayout = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['Z', 'X', 'C', 'V', 'B', 'N', 'M', '.'],
    ['SHIFT', 'SPACE', '⌫']
];

// Alternative keyboard layout for shifted mode (numbers & symbols)
const shiftedLayout = [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
    ['!', '@', '#', '$', '%', '&', '*', '_', '⌂'],
    [',', ';', ':', '?', '"', "'", '-', '/'],
    ['SHIFT', 'SPACE', '⌫']
];

// Shift mode state
let shiftMode = false;

// Key mapping for randomization easter egg
let noteKeysRandomized = false;
const originalNoteLayout = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['Z', 'X', 'C', 'V', 'B', 'N', 'M', '.'],
    ['SHIFT', 'SPACE', '⌫']
];

const originalShiftedLayout = [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
    ['!', '@', '#', '$', '%', '&', '*', '_', '⌂'],
    [',', ';', ':', '?', '"', "'", '-', '/'],
    ['SHIFT', 'SPACE', '⌫']
];

// Backspace hold-to-delete state
let backspaceHoldTimer = null;
let backspaceHoldInterval = null;
let backspaceDeleteSpeed = 150; // Start speed in ms

function initNote() {
    const noteTextArea = document.getElementById('noteTextArea');
    const noteKeyboard = document.getElementById('noteKeyboard');
    const noteTextElement = document.getElementById('noteText');
    
    if (!noteTextArea || !noteKeyboard || !noteTextElement) {
        console.error('Note elements not found');
        return;
    }
    
    // Only build keyboard and set attributes on first initialization
    if (!noteKeyboardBuilt) {
        // Calculate max characters based on text area dimensions
        calculateMaxCharacters();
        
        // Build the keyboard
        buildKeyboard();
        
        // Prevent mobile keyboard from showing
        noteTextArea.setAttribute('readonly', 'readonly');
        noteTextArea.setAttribute('contenteditable', 'false');
        
        noteKeyboardBuilt = true;
    }
    
    // Update display (always)
    updateNoteDisplay();
    
    // Only attach listeners if not already attached
    if (!noteListenersAttached) {
        // Click/touch on text area to move cursor
        textAreaClickHandler = handleTextAreaClick;
        textAreaTouchHandler = (e) => {
            if (e.cancelable) {
                e.preventDefault();
            }
            handleTextAreaClick(e);
        };
        
        noteTextArea.addEventListener('click', textAreaClickHandler);
        noteTextArea.addEventListener('touchend', textAreaTouchHandler);
        
        // Double-tap detector for randomization easter egg
        const doubleTapDetector = createDoubleTapDetector();
        
        textAreaPointerHandler = (e) => {
            if (doubleTapDetector.isDoubleTap(e.clientX, e.clientY)) {
                randomizeNoteKeys();
                if (window.playRetroClick) {
                    try { window.playRetroClick(); } catch (err) {}
                }
            }
        };
        
        noteTextArea.addEventListener('pointerdown', textAreaPointerHandler);
        
        // Desktop keyboard input handler - use capture phase to catch events earlier
        desktopKeyboardHandler = (e) => {
            // Only handle keyboard if note tab is active
            const noteContent = document.getElementById('note-content');
            if (!noteContent || !noteContent.classList.contains('active')) {
                return;
            }
            
            // Blur any focused element to prevent spacebar from activating buttons
            if (e.key === ' ' || e.key === 'Spacebar') {
                if (document.activeElement && document.activeElement !== document.body) {
                    document.activeElement.blur();
                }
            }
            
            try {
                handleDesktopKeyboard(e);
            } catch (error) {
                console.error('Error in desktop keyboard handler:', error);
            }
        };
        
        // Use capture phase (true) to catch events before they can be stopped by other handlers
        document.addEventListener('keydown', desktopKeyboardHandler, true);
        
        // Handle window resize
        resizeHandler = () => {
            calculateMaxCharacters();
            updateNoteDisplay();
        };
        
        window.addEventListener('resize', resizeHandler);
        
        noteListenersAttached = true;
    }
}

function calculateMaxCharacters() {
    const noteTextArea = document.getElementById('noteTextArea');
    const noteTextElement = document.getElementById('noteText');
    
    // Get dimensions
    const style = window.getComputedStyle(noteTextArea);
    const fontSize = parseFloat(style.fontSize);
    const lineHeight = parseFloat(style.lineHeight);
    const width = noteTextArea.clientWidth - (parseFloat(style.paddingLeft) + parseFloat(style.paddingRight));
    const height = noteTextArea.clientHeight - (parseFloat(style.paddingTop) + parseFloat(style.paddingBottom));
    
    // Calculate characters per line (approximate for monospace)
    const charWidth = fontSize * 0.6; // Approximate width for Courier New
    const charsPerLine = Math.floor(width / charWidth);
    
    // Calculate number of lines
    const numLines = Math.floor(height / lineHeight);
    
    // Total characters (accounting for line breaks from wrapping)
    maxCharacters = charsPerLine * numLines;
    
    // Ensure minimum
    if (maxCharacters < 100) maxCharacters = 100;
}

function buildKeyboard() {
    const noteKeyboard = document.getElementById('noteKeyboard');
    noteKeyboard.innerHTML = '';
    
    // Use the appropriate layout based on shift mode
    const currentLayout = shiftMode ? shiftedLayout : keyboardLayout;
    
    // Create keyboard rows
    currentLayout.forEach((row, index) => {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'note-keyboard-row';
        
        row.forEach(key => {
            const keyButton = document.createElement('button');
            keyButton.className = 'note-key';
            
            if (key === 'SHIFT') {
                keyButton.classList.add('shift');
                if (shiftMode) {
                    keyButton.classList.add('active');
                }
                keyButton.textContent = 'SHIFT';
                keyButton.setAttribute('data-key', 'SHIFT');
                keyButton.setAttribute('aria-label', 'Shift');
                keyButton.addEventListener('click', handleShiftToggle);
                keyButton.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    handleShiftToggle();
                });
            } else if (key === 'SPACE') {
                keyButton.classList.add('space');
                keyButton.textContent = 'SPACE';
                keyButton.setAttribute('data-key', ' ');
                keyButton.setAttribute('aria-label', 'Space');
                keyButton.addEventListener('click', (e) => handleKeyPress(e.target.getAttribute('data-key')));
                keyButton.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    handleKeyPress(e.target.getAttribute('data-key'));
                });
            } else if (key === '⌫') {
                keyButton.classList.add('backspace');
                keyButton.textContent = key;
                keyButton.setAttribute('data-key', key);
                keyButton.setAttribute('aria-label', 'Backspace');
                
                // Add hold-to-delete functionality
                keyButton.addEventListener('mousedown', startBackspaceHold);
                keyButton.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    startBackspaceHold(e);
                });
                keyButton.addEventListener('mouseup', stopBackspaceHold);
                keyButton.addEventListener('mouseleave', stopBackspaceHold);
                keyButton.addEventListener('touchend', stopBackspaceHold);
                keyButton.addEventListener('touchcancel', stopBackspaceHold);
                
                keyButton.addEventListener('click', (e) => handleKeyPress(e.target.getAttribute('data-key')));
            } else {
                keyButton.textContent = key;
                keyButton.setAttribute('data-key', key);
                const label = shiftMode ? `Symbol ${key}` : `Letter ${key}`;
                keyButton.setAttribute('aria-label', label);
                keyButton.addEventListener('click', (e) => handleKeyPress(e.target.getAttribute('data-key')));
                keyButton.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    handleKeyPress(e.target.getAttribute('data-key'));
                });
            }
            
            rowDiv.appendChild(keyButton);
        });
        
        noteKeyboard.appendChild(rowDiv);
    });
}

function handleKeyPress(key, button = null) {
    if (key === '⌫') {
        // Backspace - delete at cursor position
        if (cursorPosition > 0) {
            noteText = noteText.slice(0, cursorPosition - 1) + noteText.slice(cursorPosition);
            cursorPosition--;
            updateNoteDisplay();
        }
    } else {
        // Insert character at cursor position if not full
        if (noteText.length < maxCharacters) {
            noteText = noteText.slice(0, cursorPosition) + key + noteText.slice(cursorPosition);
            cursorPosition++;
            updateNoteDisplay();
        }
    }
}

function handleDesktopKeyboard(e) {
    // Only handle keyboard if note tab is active
    const noteContent = document.getElementById('note-content');
    if (!noteContent || !noteContent.classList.contains('active')) return;
    
    // Define all valid characters that can be typed
    const validSymbols = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 
                         '!', '@', '#', '$', '%', '&', '*', '_', '⌂',
                         ',', ';', ':', '?', '"', "'", '-', '/', '.'];
    const isLetter = e.key.length === 1 && /^[A-Z]$/i.test(e.key);
    const isValidSymbol = validSymbols.includes(e.key);
    const isSpecialKey = e.key === 'Backspace' || e.key === 'Delete' || e.key === ' ' || e.key === 'Spacebar';
    
    if (isLetter || isValidSymbol || isSpecialKey) {
        e.preventDefault();
        
        if (e.key === 'Backspace' || e.key === 'Delete') {
            handleKeyPress('⌫');
        } else if (e.key === ' ' || e.key === 'Spacebar') {
            handleKeyPress(' ');
        } else if (isLetter) {
            const upperKey = e.key.toUpperCase();
            handleKeyPress(upperKey);
        } else if (isValidSymbol) {
            handleKeyPress(e.key);
        }
    }
}

function updateNoteDisplay() {
    const noteTextElement = document.getElementById('noteText');
    const noteCursor = document.getElementById('noteCursor');
    const container = noteTextElement.parentNode;
    
    // Clear the container
    container.innerHTML = '';
    
    // Split text at cursor position
    const beforeCursor = noteText.slice(0, cursorPosition);
    const afterCursor = noteText.slice(cursorPosition);
    
    // Create and append text before cursor
    const beforeSpan = document.createElement('span');
    beforeSpan.id = 'noteText';
    beforeSpan.textContent = beforeCursor;
    container.appendChild(beforeSpan);
    
    // Append cursor
    const cursorSpan = document.createElement('span');
    cursorSpan.className = 'cursor';
    cursorSpan.id = 'noteCursor';
    cursorSpan.textContent = '█';
    container.appendChild(cursorSpan);
    
    // Create and append text after cursor if exists
    if (afterCursor) {
        const afterSpan = document.createElement('span');
        afterSpan.textContent = afterCursor;
        container.appendChild(afterSpan);
    }
}

// Handle clicking on text area to move cursor
function handleTextAreaClick(e) {
    const noteTextElement = document.getElementById('noteText');
    const noteTextArea = document.getElementById('noteTextArea');
    
    // Get click position
    const rect = noteTextArea.getBoundingClientRect();
    const x = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : e.changedTouches[0].clientX);
    const y = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : e.changedTouches[0].clientY);
    
    // Get computed style for measurements
    const style = window.getComputedStyle(noteTextArea);
    const fontSize = parseFloat(style.fontSize);
    const lineHeight = parseFloat(style.lineHeight);
    const charWidth = fontSize * 0.6; // Approximate width for monospace
    
    // Calculate position relative to text area
    const relativeX = x - rect.left - parseFloat(style.paddingLeft);
    const relativeY = y - rect.top - parseFloat(style.paddingTop);
    
    // Calculate which character was clicked
    const charsPerLine = Math.floor((noteTextArea.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)) / charWidth);
    const lineClicked = Math.floor(relativeY / lineHeight);
    const charInLine = Math.floor(relativeX / charWidth);
    
    // Calculate cursor position
    const estimatedPosition = (lineClicked * charsPerLine) + charInLine;
    cursorPosition = Math.max(0, Math.min(noteText.length, estimatedPosition));
    
    updateNoteDisplay();
}

// Backspace hold-to-delete handlers
function startBackspaceHold(e) {
    // Immediate first delete
    handleKeyPress('⌫');
    
    // Reset speed
    backspaceDeleteSpeed = 150;
    
    // Start hold timer - after 300ms, start continuous deletion
    backspaceHoldTimer = setTimeout(() => {
        backspaceHoldInterval = setInterval(() => {
            handleKeyPress('⌫');
            
            // Speed up deletion (decrease interval, minimum 20ms)
            if (backspaceDeleteSpeed > 20) {
                backspaceDeleteSpeed = Math.max(20, backspaceDeleteSpeed - 10);
                clearInterval(backspaceHoldInterval);
                backspaceHoldInterval = setInterval(() => {
                    handleKeyPress('⌫');
                }, backspaceDeleteSpeed);
            }
        }, backspaceDeleteSpeed);
    }, 300);
}

function stopBackspaceHold() {
    if (backspaceHoldTimer) {
        clearTimeout(backspaceHoldTimer);
        backspaceHoldTimer = null;
    }
    if (backspaceHoldInterval) {
        clearInterval(backspaceHoldInterval);
        backspaceHoldInterval = null;
    }
    backspaceDeleteSpeed = 150; // Reset speed
}

// Handle shift key toggle
function handleShiftToggle() {
    shiftMode = !shiftMode;
    buildKeyboard(); // Rebuild keyboard with new layout
}

// Easter egg: Randomize note keyboard letter keys
function randomizeNoteKeys() {
    // Get all keys except SHIFT, SPACE, and backspace
    const letterKeys = document.querySelectorAll('.note-key:not(.shift):not(.space):not(.backspace)');
    
    if (noteKeysRandomized) {
        // Restore original layout based on current shift mode
        const originalLetters = shiftMode ? 
            originalShiftedLayout.slice(0, 3).flat() : 
            originalNoteLayout.slice(0, 3).flat(); // Flatten first 3 rows
        
        letterKeys.forEach((button, index) => {
            const originalLetter = originalLetters[index];
            button.textContent = originalLetter;
            const label = shiftMode ? 
                (originalLetter === '.' ? 'Period' : `Symbol ${originalLetter}`) : 
                (originalLetter === '.' ? 'Period' : `Letter ${originalLetter}`);
            button.setAttribute('aria-label', label);
            button.setAttribute('data-key', originalLetter);
        });
        noteKeysRandomized = false;
    } else {
        // Randomize
        const letters = Array.from(letterKeys).map(btn => btn.textContent);
        
        // Fisher-Yates shuffle
        const shuffled = [...letters];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        
        // Update button text - the displayed text becomes what gets typed
        letterKeys.forEach((button, index) => {
            const newLetter = shuffled[index];
            button.textContent = newLetter;
            const label = shiftMode ? `Symbol ${newLetter}` : `Letter ${newLetter}`;
            button.setAttribute('aria-label', label);
            // Update data-key to match displayed text
            button.setAttribute('data-key', newLetter);
        });
        
        noteKeysRandomized = true;
    }
}

// Cleanup function to remove event listener
window.cleanupNote = function() {
    const noteTextArea = document.getElementById('noteTextArea');
    
    // Remove all event listeners
    if (desktopKeyboardHandler) {
        document.removeEventListener('keydown', desktopKeyboardHandler);
        desktopKeyboardHandler = null;
    }
    
    if (noteTextArea) {
        if (textAreaClickHandler) {
            noteTextArea.removeEventListener('click', textAreaClickHandler);
        }
        if (textAreaTouchHandler) {
            noteTextArea.removeEventListener('touchend', textAreaTouchHandler);
        }
        if (textAreaPointerHandler) {
            noteTextArea.removeEventListener('pointerdown', textAreaPointerHandler);
        }
    }
    
    if (resizeHandler) {
        window.removeEventListener('resize', resizeHandler);
        resizeHandler = null;
    }
    
    // Clear handler references
    textAreaClickHandler = null;
    textAreaTouchHandler = null;
    textAreaPointerHandler = null;
    
    // Reset flag so listeners can be re-attached when returning to tab
    noteListenersAttached = false;
};

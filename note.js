// Note App Logic
let noteText = '';
let maxCharacters = 0;
let cursorPosition = 0; // Track cursor position for editing
let desktopKeyboardHandler = null; // Store reference for cleanup

// QWERTY keyboard layout (uppercase only)
const keyboardLayout = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['Z', 'X', 'C', 'V', 'B', 'N', 'M', '.'],
    ['SPACE', '⌫']
];

// Key mapping for randomization easter egg
let noteKeysRandomized = false;
const originalNoteLayout = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['Z', 'X', 'C', 'V', 'B', 'N', 'M', '.'],
    ['SPACE', '⌫']
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
    
    // Calculate max characters based on text area dimensions
    calculateMaxCharacters();
    
    // Build the keyboard
    buildKeyboard();
    
    // Update display
    updateNoteDisplay();
    
    // Prevent mobile keyboard from showing
    noteTextArea.setAttribute('readonly', 'readonly');
    noteTextArea.setAttribute('contenteditable', 'false');
    
    // Click/touch on text area to move cursor
    noteTextArea.addEventListener('click', handleTextAreaClick);
    noteTextArea.addEventListener('touchend', (e) => {
        if (e.cancelable) {
            e.preventDefault();
        }
        handleTextAreaClick(e);
    });
    
    // Double-tap detector for randomization easter egg
    const doubleTapDetector = createDoubleTapDetector();
    
    noteTextArea.addEventListener('pointerdown', (e) => {
        if (doubleTapDetector.isDoubleTap(e.clientX, e.clientY)) {
            randomizeNoteKeys();
            if (window.playRetroClick) {
                try { window.playRetroClick(); } catch (err) {}
            }
        }
    });
    
    // Allow desktop keyboard input - create handler with error handling
    desktopKeyboardHandler = (e) => {
        // Only handle keyboard if note tab is active
        const noteContent = document.getElementById('note-content');
        if (!noteContent || !noteContent.classList.contains('active')) return;
        
        try {
            handleDesktopKeyboard(e);
        } catch (error) {
            console.error('Error in desktop keyboard handler:', error);
        }
    };
    
    document.addEventListener('keydown', desktopKeyboardHandler);
    
    // Handle window resize
    window.addEventListener('resize', () => {
        calculateMaxCharacters();
        updateNoteDisplay();
    });
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
    
    // Create keyboard rows
    keyboardLayout.forEach((row, index) => {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'note-keyboard-row';
        
        row.forEach(key => {
            const keyButton = document.createElement('button');
            keyButton.className = 'note-key';
            
            if (key === 'SPACE') {
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
                keyButton.setAttribute('aria-label', `Letter ${key}`);
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
    // Tab check is now done in the handler wrapper, so this is safe to call
    
    // Prevent default behavior
    e.preventDefault();
    
    if (e.key === 'Backspace' || e.key === 'Delete') {
        handleKeyPress('⌫');
    } else if (e.key === ' ' || e.key === 'Spacebar') {
        handleKeyPress(' ');
    } else if (e.key === '.') {
        handleKeyPress('.');
    } else if (e.key.length === 1) {
        // Convert to uppercase and check if it's a letter
        const upperKey = e.key.toUpperCase();
        if (/^[A-Z]$/.test(upperKey)) {
            handleKeyPress(upperKey);
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

// Easter egg: Randomize note keyboard letter keys
function randomizeNoteKeys() {
    // Get all letter keys (exclude SPACE and backspace)
    const letterKeys = document.querySelectorAll('.note-key:not(.space):not(.backspace)');
    
    if (noteKeysRandomized) {
        // Restore original layout
        const originalLetters = originalNoteLayout.slice(0, 3).flat(); // Flatten first 3 rows (letters and period)
        letterKeys.forEach((button, index) => {
            const originalLetter = originalLetters[index];
            button.textContent = originalLetter;
            button.setAttribute('aria-label', originalLetter === '.' ? 'Period' : `Letter ${originalLetter}`);
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
            button.setAttribute('aria-label', newLetter === '.' ? 'Period' : `Letter ${newLetter}`);
            // Update data-key to match displayed text
            button.setAttribute('data-key', newLetter);
        });
        
        noteKeysRandomized = true;
    }
}

// Cleanup function to remove event listener
window.cleanupNote = function() {
    if (desktopKeyboardHandler) {
        document.removeEventListener('keydown', desktopKeyboardHandler);
        desktopKeyboardHandler = null;
    }
};

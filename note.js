// Note App Logic
let noteText = '';
let maxCharacters = 0;

// QWERTY keyboard layout (uppercase only)
const keyboardLayout = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['Z', 'X', 'C', 'V', 'B', 'N', 'M', '.'],
    ['SPACE', '⌫']
];

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
    
    // Add event listeners to prevent mobile keyboard
    noteTextArea.addEventListener('touchstart', (e) => {
        e.preventDefault();
    });
    
    noteTextArea.addEventListener('click', (e) => {
        e.preventDefault();
    });
    
    // Allow desktop keyboard input
    document.addEventListener('keydown', handleDesktopKeyboard);
    
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
                keyButton.addEventListener('click', () => handleKeyPress(' '));
                keyButton.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    handleKeyPress(' ');
                });
            } else if (key === '⌫') {
                keyButton.classList.add('backspace');
                keyButton.textContent = key;
                keyButton.setAttribute('data-key', key);
                keyButton.setAttribute('aria-label', 'Backspace');
                keyButton.addEventListener('click', () => handleKeyPress(key));
                keyButton.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    handleKeyPress(key);
                });
            } else {
                keyButton.textContent = key;
                keyButton.setAttribute('data-key', key);
                keyButton.addEventListener('click', () => handleKeyPress(key));
                keyButton.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    handleKeyPress(key);
                });
            }
            
            rowDiv.appendChild(keyButton);
        });
        
        noteKeyboard.appendChild(rowDiv);
    });
}

function handleKeyPress(key) {
    if (key === '⌫') {
        // Backspace
        if (noteText.length > 0) {
            noteText = noteText.slice(0, -1);
            updateNoteDisplay();
        }
    } else {
        // Add character if not full
        if (noteText.length < maxCharacters) {
            noteText += key;
            updateNoteDisplay();
        }
    }
}

function handleDesktopKeyboard(e) {
    // Only handle keyboard if note tab is active
    const noteContent = document.getElementById('note-content');
    if (!noteContent.classList.contains('active')) return;
    
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
    noteTextElement.textContent = noteText;
}

function cleanupNote() {
    document.removeEventListener('keydown', handleDesktopKeyboard);
}

// Calculator Logic
// Persistent state that survives tab switching
const calculatorState = {
    currentValue: '0',
    previousValue: null,
    operator: null,
    equation: '',
    shouldResetDisplay: false
};

// DOM elements
let equationDisplay;
let resultDisplay;
let calcButtons;

// LCD 7-segment display patterns
const LCD_SEGMENTS = {
    '0': [' ▄▄▄ ', '█   █', '█   █', '█   █', ' ▀▀▀ '],
    '1': ['     ', '    █', '    █', '    █', '     '],
    '2': [' ▄▄▄ ', '    █', ' ▄▄▄ ', '█    ', ' ▀▀▀ '],
    '3': [' ▄▄▄ ', '    █', ' ▄▄▄ ', '    █', ' ▀▀▀ '],
    '4': ['     ', '█   █', ' ▀▀▀█', '    █', '     '],
    '5': [' ▄▄▄ ', '█    ', ' ▄▄▄ ', '    █', ' ▀▀▀ '],
    '6': [' ▄▄▄ ', '█    ', '█▄▄▄ ', '█   █', ' ▀▀▀ '],
    '7': [' ▄▄▄ ', '    █', '    █', '    █', '     '],
    '8': [' ▄▄▄ ', '█   █', ' ▄▄▄ ', '█   █', ' ▀▀▀ '],
    '9': [' ▄▄▄ ', '█   █', ' ▀▀▀█', '    █', ' ▀▀▀ '],
    '.': ['     ', '     ', '     ', '     ', '  ▄  '],
    '-': ['     ', '     ', ' ▄▄▄ ', '     ', '     '],
    'E': [' ▄▄▄▄', '█    ', '█▄▄▄ ', '█    ', ' ▀▀▀▀'],
    'r': ['     ', '     ', '█▄▄  ', '█    ', '█    '],
    'o': ['     ', '     ', ' ▄▄▄ ', '█   █', ' ▀▀▀ '],
    ' ': ['     ', '     ', '     ', '     ', '     '],
};

// Convert text to LCD display
function textToLCD(text) {
    // Limit display to 8 characters
    const displayText = text.toString().slice(-8).toUpperCase();
    const lines = ['', '', '', '', ''];
    
    for (let char of displayText) {
        const pattern = LCD_SEGMENTS[char] || LCD_SEGMENTS[' '];
        for (let i = 0; i < 5; i++) {
            lines[i] += pattern[i] + ' ';
        }
    }
    
    return lines.join('\n');
}

// Key mapping for randomization easter egg
let calcKeysRandomized = false;
const originalCalcNumbers = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

// Event listener references for cleanup
let buttonClickHandlers = new Map();
let buttonTouchHandlers = new Map();
let doubleTapHandler = null;
let doubleTapDetector = null;
let calcInitialized = false;

// Initialize calculator when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initCalculator();
});

function initCalculator() {
    if (calcInitialized) return;
    calcInitialized = true;
    
    equationDisplay = document.getElementById('calc-equation');
    resultDisplay = document.getElementById('calc-result');
    calcButtons = document.querySelectorAll('.calc-btn');

    // Add event listeners to all calculator buttons
    calcButtons.forEach(button => {
        // Create handler references for cleanup
        const clickHandler = (e) => handleButtonClick.call(button, e);
        const touchHandler = (e) => {
            e.preventDefault();
            handleButtonClick.call(button, e);
        };
        
        buttonClickHandlers.set(button, clickHandler);
        buttonTouchHandlers.set(button, touchHandler);
        
        button.addEventListener('click', clickHandler);
        button.addEventListener('touchend', touchHandler, { passive: false });
    });

    // Double-tap detector for randomization easter egg
    doubleTapDetector = createDoubleTapDetector();
    const calcContent = document.getElementById('calc-content');
    
    doubleTapHandler = (e) => {
        // Only trigger on blank space (not on buttons)
        if (e.target.classList.contains('calc-btn') || e.target.closest('.calc-btn')) {
            return;
        }
        
        if (doubleTapDetector.isDoubleTap(e.clientX, e.clientY)) {
            randomizeCalcKeys();
            if (window.playRetroClick) {
                try { window.playRetroClick(); } catch (err) {}
            }
        }
    };
    
    calcContent.addEventListener('pointerdown', doubleTapHandler);

    // Update display on load
    updateDisplay();
}

function handleButtonClick(event) {
    const button = event.target.closest('.calc-btn');
    if (!button) return;

    let value = button.dataset.value;
    
    // If keys are randomized and this is a number, use the displayed text as the value
    if (calcKeysRandomized && button.classList.contains('calc-number')) {
        value = button.textContent;
    }

    if (button.classList.contains('calc-number')) {
        handleNumber(value);
    } else if (button.classList.contains('calc-decimal')) {
        handleDecimal();
    } else if (button.classList.contains('calc-operator')) {
        handleOperator(value);
    } else if (button.classList.contains('calc-equals')) {
        handleEquals();
    } else if (button.classList.contains('calc-clear')) {
        handleClear();
    }

    updateDisplay();
}

function handleNumber(num) {
    if (calculatorState.shouldResetDisplay) {
        calculatorState.currentValue = num;
        calculatorState.shouldResetDisplay = false;
    } else {
        if (calculatorState.currentValue === '0') {
            calculatorState.currentValue = num;
        } else {
            // Limit to 8 characters (excluding decimal point)
            const digitsOnly = calculatorState.currentValue.replace('.', '');
            if (digitsOnly.length < 8) {
                calculatorState.currentValue += num;
            }
        }
    }
}

function handleDecimal() {
    if (calculatorState.shouldResetDisplay) {
        calculatorState.currentValue = '0.';
        calculatorState.shouldResetDisplay = false;
    } else {
        // Only add decimal if there isn't one already
        if (!calculatorState.currentValue.includes('.')) {
            calculatorState.currentValue += '.';
        }
    }
}

function handleOperator(op) {
    // If there's a pending operation, calculate it first
    if (calculatorState.operator && !calculatorState.shouldResetDisplay) {
        handleEquals();
    }

    calculatorState.previousValue = calculatorState.currentValue;
    calculatorState.operator = op;
    calculatorState.shouldResetDisplay = true;

    // Update equation display
    const operatorSymbol = getOperatorSymbol(op);
    calculatorState.equation = `${calculatorState.previousValue} ${operatorSymbol}`;
}

function handleEquals() {
    if (!calculatorState.operator || calculatorState.previousValue === null) {
        return;
    }

    const prev = parseFloat(calculatorState.previousValue);
    const current = parseFloat(calculatorState.currentValue);
    let result;

    switch (calculatorState.operator) {
        case '+':
            result = prev + current;
            break;
        case '-':
            result = prev - current;
            break;
        case '*':
            result = prev * current;
            break;
        case '/':
            if (current === 0) {
                calculatorState.currentValue = 'Error';
                calculatorState.equation = '';
                calculatorState.operator = null;
                calculatorState.previousValue = null;
                calculatorState.shouldResetDisplay = true;
                return;
            }
            result = prev / current;
            break;
        default:
            return;
    }

    // Format result to avoid floating point errors and limit decimals
    result = Math.round(result * 100000000) / 100000000;
    
    // Convert to string and limit to 8 significant digits
    let resultStr = result.toString();
    
    // If result has more than 8 digits (excluding decimal point and minus sign)
    const digitsOnly = resultStr.replace(/[.\-]/g, '');
    if (digitsOnly.length > 8) {
        // Use exponential notation for very large/small numbers
        result = parseFloat(result.toPrecision(8));
        resultStr = result.toString();
        
        // If still too long, use exponential
        const stillTooLong = resultStr.replace(/[.\-]/g, '').length > 8;
        if (stillTooLong) {
            resultStr = result.toExponential(2);
        }
    }

    // Update equation to show full calculation
    const operatorSymbol = getOperatorSymbol(calculatorState.operator);
    calculatorState.equation = `${calculatorState.previousValue} ${operatorSymbol} ${calculatorState.currentValue} =`;
    
    calculatorState.currentValue = resultStr;
    calculatorState.operator = null;
    calculatorState.previousValue = null;
    calculatorState.shouldResetDisplay = true;
}

function handleClear() {
    calculatorState.currentValue = '0';
    calculatorState.previousValue = null;
    calculatorState.operator = null;
    calculatorState.equation = '';
    calculatorState.shouldResetDisplay = false;
}

function getOperatorSymbol(op) {
    switch (op) {
        case '+': return '+';
        case '-': return '−';
        case '*': return '×';
        case '/': return '÷';
        default: return op;
    }
}

function updateDisplay() {
    if (resultDisplay) {
        resultDisplay.textContent = textToLCD(calculatorState.currentValue);
    }
    if (equationDisplay) {
        equationDisplay.textContent = calculatorState.equation;
    }
}

// Easter egg: Randomize calculator number keys
function randomizeCalcKeys() {
    const numberButtons = document.querySelectorAll('.calc-btn.calc-number');
    
    if (calcKeysRandomized) {
        // Restore original layout
        numberButtons.forEach((button) => {
            const originalNumber = button.dataset.value;
            button.textContent = originalNumber;
            button.setAttribute('aria-label', originalNumber);
        });
        calcKeysRandomized = false;
    } else {
        // Randomize
        const numbers = Array.from(numberButtons).map(btn => btn.dataset.value);
        
        // Fisher-Yates shuffle
        const shuffled = [...numbers];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        
        // Update button text - the displayed text becomes the new value
        numberButtons.forEach((button, index) => {
            const newNumber = shuffled[index];
            button.textContent = newNumber;
            button.setAttribute('aria-label', newNumber);
        });
        
        calcKeysRandomized = true;
    }
}

// Cleanup function to remove event listeners
window.cleanupCalculator = function() {
    // Remove button event listeners
    if (calcButtons) {
        calcButtons.forEach(button => {
            const clickHandler = buttonClickHandlers.get(button);
            const touchHandler = buttonTouchHandlers.get(button);
            
            if (clickHandler) {
                button.removeEventListener('click', clickHandler);
            }
            if (touchHandler) {
                button.removeEventListener('touchend', touchHandler);
            }
        });
    }
    
    // Remove double-tap listener
    const calcContent = document.getElementById('calc-content');
    if (calcContent && doubleTapHandler) {
        calcContent.removeEventListener('pointerdown', doubleTapHandler);
    }
    
    // Clear handler maps
    buttonClickHandlers.clear();
    buttonTouchHandlers.clear();
    doubleTapHandler = null;
    
    // Reset initialization flag so listeners can be re-attached
    calcInitialized = false;
};

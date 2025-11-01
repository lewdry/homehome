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

// Initialize calculator when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    equationDisplay = document.getElementById('calc-equation');
    resultDisplay = document.getElementById('calc-result');
    calcButtons = document.querySelectorAll('.calc-btn');

    // Add event listeners to all calculator buttons
    calcButtons.forEach(button => {
        // Support both click and touch events
        button.addEventListener('click', handleButtonClick);
        
        // Prevent double-tap zoom on mobile
        button.addEventListener('touchend', (e) => {
            e.preventDefault();
            handleButtonClick.call(button, e);
        }, { passive: false });
    });

    // Update display on load
    updateDisplay();
});

function handleButtonClick(event) {
    const button = event.target.closest('.calc-btn');
    if (!button) return;

    const value = button.dataset.value;

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
            // Limit display length to prevent overflow
            if (calculatorState.currentValue.length < 12) {
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
    
    // Limit result length
    let resultStr = result.toString();
    if (resultStr.length > 12) {
        // Use exponential notation for very large/small numbers
        result = parseFloat(result.toExponential(6));
        resultStr = result.toString();
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
        resultDisplay.textContent = calculatorState.currentValue;
    }
    if (equationDisplay) {
        equationDisplay.textContent = calculatorState.equation;
    }
}

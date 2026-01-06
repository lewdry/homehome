// Main application logic
// Global mute state
window.isMuted = false;

// Clock interval references (separate footer and popup intervals to avoid overwriting)
let footerClockInterval = null;
let popupClockInterval = null;

// Theme toggle functionality
const themeToggle = document.querySelector('.theme-toggle');
const muteToggle = document.querySelector('.mute-toggle');
const resetApp = document.querySelector('.reset-app');
const body = document.body;

// Determine initial theme based on system preference
let isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
let themeOverride = null; // null means use system preference, 'light' or 'dark' for override

function applyTheme() {
    body.classList.remove('force-dark', 'force-light');
    if (themeOverride === 'dark') {
        body.classList.add('force-dark');
    } else if (themeOverride === 'light') {
        body.classList.add('force-light');
    }
    // null means no override - CSS media query handles it
}

function getCurrentTheme() {
    // Determine what theme is currently displayed
    if (themeOverride === 'dark') {
        return 'dark';
    } else if (themeOverride === 'light') {
        return 'light';
    } else {
        // Using system preference
        return isDarkMode ? 'dark' : 'light';
    }
}

function toggleTheme() {
    // Simply toggle between light and dark
    const currentTheme = getCurrentTheme();
    themeOverride = currentTheme === 'dark' ? 'light' : 'dark';
    
    applyTheme();
    
    // Trigger ASCII glow if on HOME tab
    const currentTab = document.querySelector('.tab.active');
    if (currentTab && currentTab.getAttribute('data-tab') === 'home') {
        if (typeof triggerAsciiGlow === 'function') {
            triggerAsciiGlow();
        }
    }
    
    // Announce theme change for screen readers
    const announcement = `${themeOverride.charAt(0).toUpperCase() + themeOverride.slice(1)} mode enabled`;
    
    // Create temporary announcement element
    const announcer = document.createElement('div');
    announcer.setAttribute('role', 'status');
    announcer.setAttribute('aria-live', 'polite');
    announcer.className = 'visually-hidden';
    announcer.textContent = announcement;
    body.appendChild(announcer);
    setTimeout(() => body.removeChild(announcer), 1000);
}

function toggleMute() {
    window.isMuted = !window.isMuted;
    
    if (window.isMuted) {
        muteToggle.textContent = '∅';
        muteToggle.setAttribute('aria-label', 'Sound is off. Click to unmute');
    } else {
        muteToggle.textContent = '♫';
        muteToggle.setAttribute('aria-label', 'Sound is on. Click to mute');
        // Play click sound when unmuting
        if (window.playRetroClick) {
            try { 
                window.playRetroClick(); 
            } catch (err) {}
        }
    }
    
    // Don't save mute state to localStorage - only persist during session
    
    // Announce mute state change for screen readers
    const announcement = window.isMuted ? 'Sound muted' : 'Sound unmuted';
    const announcer = document.createElement('div');
    announcer.setAttribute('role', 'status');
    announcer.setAttribute('aria-live', 'polite');
    announcer.className = 'visually-hidden';
    announcer.textContent = announcement;
    body.appendChild(announcer);
    setTimeout(() => body.removeChild(announcer), 1000);
}

themeToggle.addEventListener('click', () => {
    if (window.playRetroClick) {
        try { 
            window.playRetroClick(); 
        } catch (err) {}
    }
    toggleTheme();
});
themeToggle.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (window.playRetroClick) {
            try { 
                window.playRetroClick(); 
            } catch (err) {}
        }
        toggleTheme();
    }
});

muteToggle.addEventListener('click', toggleMute);
muteToggle.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleMute();
    }
});

// Reset app functionality
function handleResetApp() {
    // Cleanup all games before reload
    if (window.BonkGame && window.BonkGame.cleanup) {
        try { window.BonkGame.cleanup(); } catch (e) {}
    }
    if (window.BlokGame && window.BlokGame.cleanup) {
        try { window.BlokGame.cleanup(); } catch (e) {}
    }
    if (window.cleanupDrawing) {
        try { window.cleanupDrawing(); } catch (e) {}
    }
    if (window.cleanupNote) {
        try { window.cleanupNote(); } catch (e) {}
    }
    if (window.cleanupCalculator) {
        try { window.cleanupCalculator(); } catch (e) {}
    }
    
    // Clear bonk ever-started flag
    bonkEverStarted = false;
    // Clear blok ever-started flag
    blokEverStarted = false;
    
    // Play click sound before reload
    if (window.playRetroClick) {
        try { 
            window.playRetroClick(); 
        } catch (err) {}
    }
    
    // Brief delay to let sound play, then navigate back to HOME tab and force a reload
    setTimeout(() => {
        try {
            // Hide any open popups
            if (typeof hideClockPopup === 'function') hideClockPopup();
            if (bonkPopup) bonkPopup.style.display = 'none';
            if (blokPopup) blokPopup.style.display = 'none';
            if (drawPopup) drawPopup.style.display = 'none';

            // Hide credits if visible
            if (thksVisible && typeof hideCredits === 'function') hideCredits();

            // Switch to the home tab first so the app state is consistent in history
            const homeTab = document.querySelector('.tab[data-tab="home"]');
            if (homeTab) {
                switchToTab(homeTab);
            }

            // Now perform a cache-bypassing reload (similar to pressing F5).
            // We use a timestamp query param to ensure a fresh load and include
            // the ?=home token so the internal router returns to the HOME tab
            // after reload. Use replace() to avoid adding an extra history entry.
            try {
                const base = (location.pathname && location.pathname !== '/') ? location.pathname.split('?')[0] : '/';
                const reloadUrl = (base === '/' ? '/' : base) + `?=${encodeURIComponent('home')}&_=${Date.now()}`;
                // Replace current history entry and navigate to the fresh URL
                window.location.replace(reloadUrl);
            } catch (navErr) {
                // Fallback to a standard reload if building a URL fails
                try { window.location.reload(); } catch (e) {}
            }
        } catch (err) {
            // Final fallback - try a normal reload
            try { window.location.reload(); } catch (e) {}
        }
    }, 120);
}

resetApp.addEventListener('click', handleResetApp);
resetApp.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleResetApp();
    }
});

// Tab switching functionality
const tabs = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.tab-content');
const bonkTab = document.querySelector('.tab[data-tab="bonk"]');
const tabsContainer = document.querySelector('.tabs');
let bonkInitialized = false;
let blokInitialized = false;
let drawInitialized = false;
let noteInitialized = false;
let bonkStarted = false;
let blokStarted = false;
let drawStarted = false;
let bonkEverStarted = false; // Track if bonk has ever been started
let blokEverStarted = false; // Track if blok has ever been started
// When true, the next call to switchToTab will not move focus to the tab.
// Used to avoid showing the browser focus ring on initial load routing.
let suppressNextTabFocus = false;

// --- Simple client-side router / history helpers ---
let isNavigatingHistory = false; // true when handling popstate/route to avoid loops
let routerPreviousPath = '/';
let previousPathBeforePopup = null;

function getPathForTabName(name) {
    switch (name) {
        case 'home': return '/';
        case 'bonk': return '/bonk';
        case 'blok': return '/blok';
        case 'book': return '/book';
        case 'calc': return '/calc';
        case 'draw': return '/draw';
        case 'note': return '/note';
        default: return '/';
    }
}

function updateHistory(path, replace = false) {
    try {
        if (replace) history.replaceState({ path }, '', path);
        else history.pushState({ path }, '', path);
    } catch (err) {
        // ignore URL update errors (some platforms may restrict)
    }
}

function route(path) {
    // route to a path (called from popstate or initial load). Avoid pushing new history here.
    isNavigatingHistory = true;
    try {
        routerPreviousPath = (location.pathname || '/') + (location.search || '');

        // If there's a special query param format like ?=bonk or ?=books/frankenstein, prefer that
        const search = location.search || '';
        if (search.startsWith('?=')) {
            const raw = decodeURIComponent(search.slice(2).split('&')[0] || '');
            if (!raw || raw === 'home') {
                const homeTab = document.querySelector('.tab[data-tab="home"]');
                if (homeTab) switchToTab(homeTab);
                if (clockPopupVisible) hideClockPopup();
                if (thksVisible) hideCredits();
                return;
            }

            // books deep-link: ?=books/:id
            if (raw.startsWith('books/')) {
                const parts = raw.split('/');
                const id = parts[1];
                const tab = document.querySelector('.tab[data-tab="book"]');
                if (tab) {
                    switchToTab(tab);
                    setTimeout(() => { if (typeof openBook === 'function' && id) openBook(id); }, 50);
                }
                return;
            }

            // single token routes: bonk, blok, book, calc, draw, note, clock, thks
            switch (raw) {
                case 'bonk': case 'blok': case 'book': case 'calc': case 'draw': case 'note': {
                    const tab = document.querySelector(`.tab[data-tab="${raw}"]`);
                    if (tab) switchToTab(tab);
                    return;
                }
                case 'clock':
                    showClockPopup();
                    return;
                case 'thks':
                case 'thanks':
                case 'credits':
                    showCredits();
                    return;
                default: {
                    // Unknown token -> fallback to home
                    const homeTab = document.querySelector('.tab[data-tab="home"]');
                    if (homeTab) switchToTab(homeTab);
                    return;
                }
            }
        }

        // Fallback to pathname-based routing (existing behavior)
        // normalize trailing slash (except root)
        if (path && path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);

        if (!path || path === '/' || path === '/home') {
            const homeTab = document.querySelector('.tab[data-tab="home"]');
            if (homeTab) switchToTab(homeTab);
            if (clockPopupVisible) hideClockPopup();
            if (thksVisible) hideCredits();
            return;
        }

        if (path === '/bonk' || path === '/blok' || path === '/book' || path === '/calc' || path === '/draw' || path === '/note') {
            const tabName = path.slice(1);
            const tab = document.querySelector(`.tab[data-tab="${tabName}"]`);
            if (tab) switchToTab(tab);
            return;
        }

        if (path === '/clock') {
            showClockPopup();
            return;
        }

        if (path === '/thks' || path === '/thanks' || path === '/credits') {
            showCredits();
            return;
        }

        // books deep-link: /books/:id
        if (path.startsWith('/books/')) {
            const id = path.split('/')[2];
            const tab = document.querySelector('.tab[data-tab="book"]');
            if (tab) {
                switchToTab(tab);
                // open the book after a short delay to allow book list to initialize
                setTimeout(() => {
                    if (typeof openBook === 'function' && id) openBook(id);
                }, 50);
            }
            return;
        }

        // Unknown path -> fallback to home
        const homeTab = document.querySelector('.tab[data-tab="home"]');
        if (homeTab) switchToTab(homeTab);
    } finally {
        isNavigatingHistory = false;
    }
}

window.addEventListener('popstate', (e) => {
    const path = location.pathname || '/';
    route(path);
});

function updateTabOverflowClass() {
    if (!tabsContainer) return;
    // Remove all responsive classes first
    tabsContainer.classList.remove('tight-tabs', 'tighter-tabs', 'tiny-tabs');
    // Check if tabs overflow
    const containerWidth = tabsContainer.clientWidth;
    // Sum the rendered widths of tabs using getBoundingClientRect to avoid fractional rounding issues
    let totalTabsWidth = 0;
    tabs.forEach(tab => {
        totalTabsWidth += tab.getBoundingClientRect().width;
    });
    // Compare using rounded values so tiny sub-pixel/box-model differences don't trigger the responsive classes
    if (Math.ceil(totalTabsWidth) > Math.floor(containerWidth)) {
        tabsContainer.classList.add('tight-tabs');
        // Recalculate after class applied
        setTimeout(() => {
            let totalTabsWidth2 = 0;
            tabs.forEach(tab => { totalTabsWidth2 += tab.getBoundingClientRect().width; });
            if (Math.ceil(totalTabsWidth2) > Math.floor(containerWidth)) {
                tabsContainer.classList.remove('tight-tabs');
                tabsContainer.classList.add('tighter-tabs');
                setTimeout(() => {
                    let totalTabsWidth3 = 0;
                    tabs.forEach(tab => { totalTabsWidth3 += tab.getBoundingClientRect().width; });
                    if (Math.ceil(totalTabsWidth3) > Math.floor(containerWidth)) {
                        tabsContainer.classList.remove('tighter-tabs');
                        tabsContainer.classList.add('tiny-tabs');
                    }
                }, 10);
            }
        }, 10);
    }
}

window.addEventListener('resize', updateTabOverflowClass);
window.addEventListener('DOMContentLoaded', updateTabOverflowClass);
setTimeout(updateTabOverflowClass, 100);

// Update footer year and relevant meta tags to the current year
(function updateYearDisplay() {
    const startYear = 1988;
    const now = new Date().getFullYear();

    // Update footer text (keeps 1988 and adds current year if later)
    const footerEl = document.querySelector('.footer-text');
    if (footerEl) {
        const yearText = (now <= startYear) ? `${startYear}` : `${startYear}-${now}`;
        footerEl.textContent = `© ${yearText} Homehomehome`;
    }

    // Update some meta tags and the document title for consistency
    try {
        const titleText = `Homehomehome ⌂ Web 0.1 (1988-${now})`;
        document.title = titleText;
        const metaTitle = document.querySelector('meta[name="title"]');
        if (metaTitle) metaTitle.setAttribute('content', titleText);
        const ogTitle = document.querySelector('meta[property="og:title"]');
        if (ogTitle) ogTitle.setAttribute('content', titleText);
        const twitterTitle = document.querySelector('meta[name="twitter:title"]');
        if (twitterTitle) twitterTitle.setAttribute('content', titleText);
        const copyrightMeta = document.querySelector('meta[name="copyright"]');
        if (copyrightMeta) copyrightMeta.setAttribute('content', `© 1988-${now} Lewis Dryburgh`);
    } catch (err) { /* ignore errors in older browsers */ }
})();

// Popup elements
const bonkPopup = document.getElementById('bonk-popup');
const bonkStartBtn = document.getElementById('bonk-start');
const blokPopup = document.getElementById('blok-popup');
const blokStartBtn = document.getElementById('blok-start');
const drawPopup = document.getElementById('draw-popup');
const drawStartBtn = document.getElementById('draw-start');

// Handle BONK start button
bonkStartBtn.addEventListener('click', () => {
    bonkPopup.style.display = 'none';
    bonkStarted = true;
    bonkEverStarted = true; // Mark that bonk has been started at least once
    if (bonkInitialized && window.BonkGame) {
        window.BonkGame.start();
    }
    // Return focus to the tab after closing popup
    bonkTab.focus();
});

// Handle BLOK start button
blokStartBtn.addEventListener('click', () => {
    blokPopup.style.display = 'none';
    blokStarted = true;
    blokEverStarted = true; // Mark that blok has been started at least once
    if (blokInitialized && window.BlokGame) {
        window.BlokGame.start();
    }
    // Return focus to the tab after closing popup
    document.querySelector('.tab[data-tab="blok"]').focus();
});

// Handle DRAW start button
drawStartBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    drawPopup.style.display = 'none';
    window.drawStarted = true;
    // Return focus to the tab after closing popup
    document.querySelector('.tab[data-tab="draw"]').focus();
});

// Function to switch to a specific tab
function switchToTab(tab) {
    const tabName = tab.getAttribute('data-tab');
    const currentTab = document.querySelector('.tab.active');
    const currentTabName = currentTab ? currentTab.getAttribute('data-tab') : null;
    
    // Hide credits if visible
    if (thksVisible) {
        thksVisible = false;
        thksContent.classList.remove('active');
    }
    
    // Cleanup when leaving tabs
    if (currentTabName === 'bonk' && bonkInitialized && window.BonkGame) {
        if (window.BonkGame.isRunning()) {
            window.BonkGame.stop();
        }
    }
    
    if (currentTabName === 'blok' && blokInitialized && window.BlokGame) {
        if (window.BlokGame.isRunning()) {
            window.BlokGame.stop();
        }
    }
    
    if (currentTabName === 'draw' && window.cleanupDrawing) {
        // Note: We don't fully cleanup draw, just pause it
        // Could add cleanup here if needed
    }
    
    if (currentTabName === 'note' && window.cleanupNote) {
        // Clean up note keyboard listener when leaving note tab
        window.cleanupNote();
    }
    
    if (currentTabName === 'calc' && window.cleanupCalculator) {
        // Clean up calculator listeners when leaving calc tab
        window.cleanupCalculator();
    }
    
    // Update active tab
    tabs.forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
        t.setAttribute('tabindex', '-1');
    });
    tab.classList.add('active');
    tab.setAttribute('aria-selected', 'true');
    tab.setAttribute('tabindex', '0');
    
    // Update active content
    tabContents.forEach(content => content.classList.remove('active'));
    const activeContent = document.getElementById(`${tabName}-content`);
    activeContent.classList.add('active');
    
    // Trigger ASCII glow when returning to HOME tab
    if (tabName === 'home' && typeof triggerAsciiGlow === 'function') {
        triggerAsciiGlow();
    }

    // Initialize BOOK tab when switching to it
    if (tabName === 'book' && typeof window.initBookTab === 'function') {
        console.log('[BOOK] switchToTab: calling initBookTab (tab switch)');
        window.initBookTab();
    }

    // Focus the tab for screen reader announcement
    // Focus the tab for screen reader announcement unless we've suppressed
    // focus for the next tab activation (used on initial routing to avoid
    // the browser showing a focus ring on load).
    if (suppressNextTabFocus) {
        // Clear the flag so subsequent switches behave normally
        suppressNextTabFocus = false;
    } else {
        tab.focus();
    }
    
    // Initialize bonk game on first click
    if (tabName === 'bonk' && !bonkInitialized) {
        bonkInitialized = true;
        // Only show popup if bonk has never been started before
        if (!bonkEverStarted) {
            bonkPopup.style.display = 'flex';
            // Focus the START button for keyboard users
            setTimeout(() => bonkStartBtn.focus(), 100);
        } else {
            bonkStarted = true; // Allow interaction immediately
            if (window.BonkGame) {
                window.BonkGame.start();
            }
        }
        if (window.BonkGame) {
            window.BonkGame.init();
        }
    } else if (tabName === 'bonk' && bonkInitialized && window.BonkGame) {
        // Resume game when returning to tab
        window.BonkGame.resume();
    }
    
    // Initialize blok game on first click
    if (tabName === 'blok' && !blokInitialized) {
        blokInitialized = true;
        // Only show popup if blok has never been started before
        if (!blokEverStarted) {
            blokPopup.style.display = 'flex';
            // Focus the START button for keyboard users
            setTimeout(() => blokStartBtn.focus(), 100);
        }
        if (window.BlokGame) {
            window.BlokGame.init();
        }
    } else if (tabName === 'blok' && blokInitialized && window.BlokGame) {
        // Resume game when returning to tab
        window.BlokGame.resume();
    }
    
    // Initialize drawing on first click
    if (tabName === 'draw' && !drawInitialized) {
        drawInitialized = true;
        drawPopup.style.display = 'flex';
        // Focus the START button for keyboard users
        setTimeout(() => drawStartBtn.focus(), 100);
        if (typeof initDrawing === 'function') {
            initDrawing();
        }
    }
    
    // Initialize note on first click
    if (tabName === 'note' && !noteInitialized) {
        noteInitialized = true;
        if (typeof initNote === 'function') {
            initNote();
        }
    }
    
    // Initialize calculator on first click (listeners will be re-attached each time)
    if (tabName === 'calc') {
        if (typeof initCalculator === 'function') {
            initCalculator();
        }
    }

    // Update address bar silently (don't push when handling popstate/route)
    if (!isNavigatingHistory) {
        // Use query-style routing to avoid server rewrite requirements.
        // Compute base from current pathname (so subpath hosting still works)
        const base = (location.pathname && location.pathname !== '/') ? location.pathname.split('?')[0] : '/';
        const q = `?=${encodeURIComponent(tabName)}`;
        const pathToPush = (base === '/' ? '/' : base) + q;
        updateHistory(pathToPush);
    }
}

// Click event for tabs
tabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
        // Prevent tab switching if clock popup is visible
        if (clockPopupVisible) {
            e.preventDefault();
            e.stopPropagation();
            return;
        }
        switchToTab(tab);
    });
    
    // Keyboard navigation for tabs
    tab.addEventListener('keydown', (e) => {
        // Prevent tab switching if clock popup is visible
        if (clockPopupVisible && (e.key === 'Enter' || e.key === ' ' || e.key.startsWith('Arrow') || e.key === 'Home' || e.key === 'End')) {
            e.preventDefault();
            e.stopPropagation();
            return;
        }
        
        let targetTab = null;
        const currentIndex = Array.from(tabs).indexOf(tab);
        
        switch(e.key) {
            case 'ArrowRight':
            case 'ArrowDown':
                e.preventDefault();
                targetTab = tabs[currentIndex + 1] || tabs[0];
                break;
            case 'ArrowLeft':
            case 'ArrowUp':
                e.preventDefault();
                targetTab = tabs[currentIndex - 1] || tabs[tabs.length - 1];
                break;
            case 'Home':
                e.preventDefault();
                targetTab = tabs[0];
                break;
            case 'End':
                e.preventDefault();
                targetTab = tabs[tabs.length - 1];
                break;
            case 'Enter':
            case ' ':
        e.preventDefault();
        // Play sound for keyboard activation
        if (window.playRetroClick) try { window.playRetroClick(); } catch (err) {}
        switchToTab(tab);
        return;
        }
        
        if (targetTab) {
            switchToTab(targetTab);
        }
    });
});

// Footer click to toggle credits tab
const footerText = document.querySelector('.footer-text');
const thksContent = document.getElementById('thks-content');
let thksVisible = false;
// --- Drag/Touch Scroll Implementation for Credits/Thanks Page ---
function enableThksContentDragScroll() {
    const thksArea = document.getElementById('thks-content-area');
    if (!thksArea) return;
    let isPointerDown = false;
    let lastY = 0;
    let lastScrollTop = 0;
    let pointerId = null;

    thksArea.addEventListener('pointerdown', (e) => {
        // For mouse: implement click-drag scrolling. For touch/pen let native scrolling handle momentum.
        if (e.pointerType === 'mouse') {
            if (e.button !== 0) return;
            isPointerDown = true;
            pointerId = e.pointerId;
            lastY = e.clientY;
            lastScrollTop = thksArea.scrollTop;
            try { thksArea.setPointerCapture(pointerId); } catch (err) {}
            thksArea.style.cursor = 'grabbing';
            e.preventDefault();
        }
        // touch/pen: do not preventDefault so native momentum scrolling works
    });
    thksArea.addEventListener('pointermove', (e) => {
        if (!isPointerDown || e.pointerId !== pointerId) return;
        const deltaY = e.clientY - lastY;
        thksArea.scrollTop = lastScrollTop - deltaY;
        // Don't select text while dragging
        if (Math.abs(deltaY) > 2) {
            window.getSelection()?.removeAllRanges();
        }
    });
    thksArea.addEventListener('pointerup', (e) => {
        if (e.pointerId !== pointerId) return;
        isPointerDown = false;
        pointerId = null;
        thksArea.releasePointerCapture(e.pointerId);
        thksArea.style.cursor = '';
    });
    thksArea.addEventListener('pointerleave', (e) => {
        if (!isPointerDown || e.pointerId !== pointerId) return;
        isPointerDown = false;
        pointerId = null;
        thksArea.releasePointerCapture(e.pointerId);
        thksArea.style.cursor = '';
    });
    // Prevent accidental text selection on drag
    thksArea.addEventListener('dragstart', (e) => e.preventDefault());
}

// Enable drag scroll for credits on DOMContentLoaded and when showing credits
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', enableThksContentDragScroll, { once: true });
} else {
    enableThksContentDragScroll();
}

// Also re-enable when credits are shown (in case of tab switch)
function showCreditsWithScroll() {
    showCredits();
    setTimeout(enableThksContentDragScroll, 0);
}

// Patch toggleCredits to use showCreditsWithScroll
const origToggleCredits = toggleCredits;
toggleCredits = function() {
    if (thksVisible) {
        hideCredits();
    } else {
        showCreditsWithScroll();
    }
};
let previousTab = null;

function showCredits() {
    // Stop bonk game when leaving bonk tab
    if (bonkInitialized && window.BonkGame && window.BonkGame.isRunning()) {
        const currentTab = document.querySelector('.tab.active');
        if (currentTab && currentTab.getAttribute('data-tab') === 'bonk') {
            window.BonkGame.stop();
        }
    }
    
    // Stop/pause blok game when leaving blok tab
    if (blokInitialized && window.BlokGame && window.BlokGame.isRunning()) {
        const currentTab = document.querySelector('.tab.active');
        if (currentTab && currentTab.getAttribute('data-tab') === 'blok') {
            window.BlokGame.stop();
        }
    }

    // Store current active tab (if not already showing credits)
    if (!thksVisible) {
        const activeTab = document.querySelector('.tab.active');
        if (activeTab) {
            previousTab = activeTab;
        }
    }

    // Hide all tabs
    tabs.forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
    });

    // Hide all content
    tabContents.forEach(content => content.classList.remove('active'));

    // Show credits content
    thksContent.classList.add('active');
    thksVisible = true;

    // update URL to credits
    if (!isNavigatingHistory) {
        const base = (location.pathname && location.pathname !== '/') ? location.pathname.split('?')[0] : '/';
        const pathToPush = (base === '/' ? '/' : base) + `?=${encodeURIComponent('thks')}`;
        updateHistory(pathToPush);
    }
}

function hideCredits() {
    // Hide credits
    thksContent.classList.remove('active');
    thksVisible = false;

    // Restore previous tab
    if (previousTab) {
        switchToTab(previousTab);
    } else {
        // Default to home if no previous tab
        const homeTab = document.querySelector('.tab[data-tab="home"]');
        if (homeTab) {
            switchToTab(homeTab);
        }
    }

    // Restore URL to previous tab path (replace rather than push)
    if (!isNavigatingHistory) {
        const prevPath = previousTab ? previousTab.getAttribute('data-tab') : 'home';
        const base = (location.pathname && location.pathname !== '/') ? location.pathname.split('?')[0] : '/';
        const pathToPush = (base === '/' ? '/' : base) + `?=${encodeURIComponent(prevPath)}`;
        updateHistory(pathToPush, true);
    }
}

function toggleCredits() {
    // Prevent credits toggle if clock popup is visible
    if (clockPopupVisible) {
        return;
    }
    
    // Only play the retro click here for keyboard-triggered activation.
    // Pointer interactions are handled globally by the pointerdown listener
    // (which already plays the click), so avoid playing twice.
    const event = arguments[0];
    if (event && (event.type === 'keydown' || event.type === 'keypress')) {
        if (window.playRetroClick) {
            try { window.playRetroClick(); } catch (err) {}
        }
    }

    if (thksVisible) {
        hideCredits();
    } else {
        showCredits();
    }
}

footerText.addEventListener('click', (e) => {
    // Prevent footer text interaction if clock popup is visible
    if (clockPopupVisible) {
        e.preventDefault();
        e.stopPropagation();
        return;
    }
    toggleCredits(e);
});
footerText.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        // Prevent footer text interaction if clock popup is visible
        if (clockPopupVisible) {
            return;
        }
        toggleCredits(e);
    }
});

// Play retro click on pointer interactions with interactive elements
document.addEventListener('pointerdown', async (e) => {
    try {
        const el = e.target.closest('button, .tab, .calc-btn, .note-key, .footer-text, [role="tab"]');
        if (el) {
            // Resume AudioContext before playing sound (critical for mobile)
            if (window.resumeSharedAudioContext) {
                await window.resumeSharedAudioContext();
            }
            if (window.playRetroClick) {
                await window.playRetroClick();
            }
        }
    } catch (err) {
        // ignore
    }
});

// Clock functionality
function updateClock() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    
    const clockElement = document.getElementById('clock');
    if (clockElement) {
        clockElement.innerHTML = `${hours}<span class="clock-colon">:</span>${minutes}`;
    }
}

// Update footer clock immediately and then every second
updateClock();
footerClockInterval = setInterval(updateClock, 1000);

// Cleanup clock interval on page unload
window.addEventListener('beforeunload', () => {
    if (clockInterval) {
        clearInterval(clockInterval);
        clockInterval = null;
    }
});

// Random modern tech term
const modernTechTerms = [
    'the cloud',
    'cyberspace',
    'an alternate universe',
    'virtual reality',
    'the metaverse',
    'blockchain',
    'the matrix',
    'quantum space',
    'space tourism'
];

// Get a random term that's different from the default "the cloud"
const defaultTerm = 'utopia';
let randomTerm;
do {
    randomTerm = modernTechTerms[Math.floor(Math.random() * modernTechTerms.length)];
} while (randomTerm === defaultTerm);

document.getElementById('modernTech').textContent = randomTerm;

// ASCII art glow effect
function triggerAsciiGlow() {
    const asciiArt = document.querySelector('.ascii-art');
    if (asciiArt) {
        asciiArt.classList.remove('glow');
        // Force reflow to restart animation
        void asciiArt.offsetWidth;
        asciiArt.classList.add('glow');
        
        // Remove class after animation completes
        setTimeout(() => {
            asciiArt.classList.remove('glow');
        }, 500);
    }
}

// Trigger glow on page load
window.addEventListener('load', () => {
    triggerAsciiGlow();
});

// Clock popup functionality
const clockPopup = document.getElementById('clock-popup');
const clockHomeBtn = document.getElementById('clock-home-btn');
const footerClock = document.getElementById('clock');
let clockPopupVisible = false;

// ASCII clock drawing function
function drawAsciiClock(hours, minutes, seconds) {
    const centerX = 20;
    const centerY = 10;
    const radius = 9;
    
    // Create 2D array for the clock face with character and color info
    const grid = Array(21).fill(null).map(() => Array(41).fill(null).map(() => ({ char: ' ', color: null })));
    
    // Draw circle
    for (let angle = 0; angle < 360; angle += 3) {
        const rad = angle * Math.PI / 180;
        const x = Math.round(centerX + radius * 1.8 * Math.cos(rad));
        const y = Math.round(centerY + radius * Math.sin(rad));
        if (y >= 0 && y < 21 && x >= 0 && x < 41) {
            grid[y][x] = { char: '○', color: null };
        }
    }
    
    // Draw hour markers
    for (let i = 0; i < 12; i++) {
        const angle = (i * 30 - 90) * Math.PI / 180;
        const x = Math.round(centerX + (radius - 1) * 1.8 * Math.cos(angle));
        const y = Math.round(centerY + (radius - 1) * Math.sin(angle));
        if (y >= 0 && y < 21 && x >= 0 && x < 41) {
            grid[y][x] = { char: '•', color: null };
        }
    }
    
    // Replace all hour markers with bold numbers (1-12)
    const numbers = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    for (let i = 0; i < 12; i++) {
        const angle = (i * 30 - 90) * Math.PI / 180;
        const x = Math.round(centerX + (radius - 1) * 1.8 * Math.cos(angle));
        const y = Math.round(centerY + (radius - 1) * Math.sin(angle));
        const num = numbers[i].toString();
        
        if (num.length === 1) {
            // Single digit numbers (1-9)
            if (y >= 0 && y < 21 && x >= 0 && x < 41) {
                grid[y][x] = { char: `<b>${num}</b>`, color: null, isBold: true };
            }
        } else {
            // Two digit numbers (10, 11, 12)
            if (y >= 0 && y < 21) {
                // Place first digit one position to the left
                if (x - 1 >= 0 && x - 1 < 41) {
                    grid[y][x - 1] = { char: `<b>${num[0]}</b>`, color: null, isBold: true };
                }
                // Place second digit at the calculated position
                if (x >= 0 && x < 41) {
                    grid[y][x] = { char: `<b>${num[1]}</b>`, color: null, isBold: true };
                }
            }
        }
    }
    
    // Draw center
    grid[centerY][centerX] = { char: '●', color: null };
    
    // Draw hour hand (blue - #1e7bb2)
    const hourAngle = ((hours % 12) * 30 + minutes * 0.5 - 90) * Math.PI / 180;
    for (let i = 1; i <= 5; i++) {
        const x = Math.round(centerX + i * 1.8 * 0.6 * Math.cos(hourAngle));
        const y = Math.round(centerY + i * 0.6 * Math.sin(hourAngle));
        if (y >= 0 && y < 21 && x >= 0 && x < 41) {
            grid[y][x] = { char: '█', color: '#1e7bb2' };
        }
    }
    
    // Draw minute hand (green - #719e07)
    const minuteAngle = (minutes * 6 - 90) * Math.PI / 180;
    for (let i = 1; i <= 7; i++) {
        const x = Math.round(centerX + i * 1.8 * 0.8 * Math.cos(minuteAngle));
        const y = Math.round(centerY + i * 0.8 * Math.sin(minuteAngle));
        if (y >= 0 && y < 21 && x >= 0 && x < 41) {
            grid[y][x] = { char: '║', color: '#719e07' };
        }
    }
    
    // Draw second hand (red - #ec423f)
    const secondAngle = (seconds * 6 - 90) * Math.PI / 180;
    for (let i = 1; i <= 8; i++) {
        const x = Math.round(centerX + i * 1.8 * 0.9 * Math.cos(secondAngle));
        const y = Math.round(centerY + i * 0.9 * Math.sin(secondAngle));
        if (y >= 0 && y < 21 && x >= 0 && x < 41) {
            grid[y][x] = { char: '│', color: '#ec423f' };
        }
    }
    
    // Convert grid to HTML string with colored spans
    return grid.map(row => {
        return row.map(cell => {
            if (cell.color) {
                return `<span style="color: ${cell.color}">${cell.char}</span>`;
            }
            // Bold numbers are already wrapped in <b> tags in the char property
            return cell.char;
        }).join('');
    }).join('\n');
}

// Update clock display
function updateClockPopup() {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    
    // Update ASCII clock
    const asciiClockDisplay = document.getElementById('ascii-clock-display');
    if (asciiClockDisplay) {
        asciiClockDisplay.innerHTML = drawAsciiClock(hours, minutes, seconds);
    }
    
    // Update digital clock (HH:MM:SS)
    const digitalDisplay = document.getElementById('clock-digital-display');
    if (digitalDisplay) {
        const hoursStr = String(hours).padStart(2, '0');
        const minutesStr = String(minutes).padStart(2, '0');
        const secondsStr = String(seconds).padStart(2, '0');
        digitalDisplay.innerHTML = `<span style=\"color:#1e7bb2\">${hoursStr}</span><span class=\"clock-colon\">:</span><span style=\"color:#859900\">${minutesStr}</span><span class=\"clock-colon\">:</span><span style=\"color:#dc322f\">${secondsStr}</span>`;
    }
    
    // Update date display
    const dateDisplay = document.getElementById('clock-date-display');
    if (dateDisplay) {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December'];
        
        const dayName = days[now.getDay()];
        const day = now.getDate();
        const monthName = months[now.getMonth()];
        const year = now.getFullYear();
        
        dateDisplay.textContent = `${dayName}, ${day} ${monthName} ${year}`;
    }
}

// Show clock popup
function showClockPopup() {
    clockPopupVisible = true;
    const clockOverlay = document.getElementById('clock-overlay');
    clockPopup.style.display = 'flex';
    if (clockOverlay) clockOverlay.style.display = 'block';
    
    // Stop bonk game if running (but keep bonkStarted and bonkInitialized)
    if (bonkInitialized && window.BonkGame && window.BonkGame.isRunning()) {
        window.BonkGame.stop();
    }
    
    // Stop blok game if running
    if (blokInitialized && window.BlokGame && window.BlokGame.isRunning()) {
        window.BlokGame.stop();
    }
    
    // Update clock popup immediately and start popup interval
    updateClockPopup();
    popupClockInterval = setInterval(updateClockPopup, 1000);
    
    // Focus the Home button for keyboard users
    setTimeout(() => clockHomeBtn.focus(), 100);

    // update URL to /clock
    try {
        previousPathBeforePopup = (location.pathname || '/') + (location.search || '');
        if (!isNavigatingHistory) {
            const base = (location.pathname && location.pathname !== '/') ? location.pathname.split('?')[0] : '/';
            const pathToPush = (base === '/' ? '/' : base) + `?=${encodeURIComponent('clock')}`;
            updateHistory(pathToPush);
        }
    } catch (err) {}
}

// Hide clock popup
function hideClockPopup() {
    // If the BOOK tab is active when closing the clock popup, re-init the book tab
    const activeTab = document.querySelector('.tab.active');
    if (activeTab && activeTab.getAttribute('data-tab') === 'book') {
        console.log('[BOOK] hideClockPopup: calling initBookTab');
        if (typeof window.initBookTab === 'function') {
            window.initBookTab();
        }
    }
    clockPopupVisible = false;
    const clockOverlay = document.getElementById('clock-overlay');
    clockPopup.style.display = 'none';
    if (clockOverlay) clockOverlay.style.display = 'none';
    
    // Clear popup interval
    if (popupClockInterval) {
        clearInterval(popupClockInterval);
        popupClockInterval = null;
    }
    
    // Resume games if they were on their respective tabs
    const currentTab = document.querySelector('.tab.active');
    
    // Resume bonk game if it was on the bonk tab
    if (currentTab && currentTab.getAttribute('data-tab') === 'bonk' && bonkInitialized && window.BonkGame) {
        window.BonkGame.resume();
    }
    
    // Resume blok game if it was on the blok tab
    if (currentTab && currentTab.getAttribute('data-tab') === 'blok' && blokInitialized && window.BlokGame) {
        window.BlokGame.resume();
    }
    
    // Return focus to the footer clock
    footerClock.focus();

    // restore URL to previous path (replace to avoid adding extra history)
    try {
        if (!isNavigatingHistory) {
            const to = previousPathBeforePopup || '/';
            updateHistory(to, true);
        }
    } catch (err) {}
    previousPathBeforePopup = null;
}

// Clock home button click handler
clockHomeBtn.addEventListener('click', hideClockPopup);

// Footer clock click handler
footerClock.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!clockPopupVisible) {
        showClockPopup();
    }
});

// Make footer clock keyboard accessible
footerClock.setAttribute('role', 'button');
footerClock.setAttribute('tabindex', '0');
footerClock.setAttribute('aria-label', 'Open clock application');

footerClock.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (!clockPopupVisible) {
            if (window.playRetroClick) {
                try { window.playRetroClick(); } catch (err) {}
            }
            showClockPopup();
        }
    }
});

// On initial load, route to current location (supports deep links)
document.addEventListener('DOMContentLoaded', () => {
    try {
        // Allow other init code to run first. Suppress the automatic focus
        // on the first tab activation so the browser doesn't show the focus
        // ring on page load.
        suppressNextTabFocus = true;
        setTimeout(() => route(location.pathname || '/'), 50);
    } catch (err) {}
});

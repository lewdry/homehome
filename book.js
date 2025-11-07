// --- Book Scroll Slider Logic ---

// --- Book Scroll Slider Logic ---
function showBookScrollSlider(show) {
  const slider = document.getElementById('book-scroll-slider');
  if (slider) slider.style.display = show ? 'flex' : 'none';
}

function initBookScrollSlider() {
  const slider = document.getElementById('book-scroll-slider');
  const handle = document.getElementById('slider-handle');
  const track = slider ? slider.querySelector('.slider-track') : null;
  if (!slider || !handle || !track) return;

  let dragging = false;
  let trackRect = null;

  function setHandlePosition(percent) {
    percent = Math.max(1, Math.min(99, percent));
    handle.style.left = percent + '%';
  }

  function getBookContentElement() {
    return document.getElementById('book-reader-content');
  }

  function scrollBookToPercent(percent) {
    const content = getBookContentElement();
    if (!content) return;
    const scrollHeight = content.scrollHeight - content.clientHeight;
    const scrollTop = scrollHeight * (percent / 100);
    content.scrollTop = scrollTop;
    // Save scroll position for current book
    if (currentBookId) setBookState(currentBookId, percent, getReadStateFromScroll(percent));
  }

  function getCurrentBookPercent() {
    const content = getBookContentElement();
    if (!content) return 1;
    const scrollHeight = content.scrollHeight - content.clientHeight;
    if (scrollHeight <= 0) return 1;
    const percent = (content.scrollTop / scrollHeight) * 100;
    return Math.max(1, Math.min(99, percent));
  }

  handle.addEventListener('mousedown', function(e) {
    dragging = true;
    trackRect = track.getBoundingClientRect();
    document.body.style.userSelect = 'none';
  });
  document.addEventListener('mousemove', function(e) {
    if (!dragging || !trackRect) return;
    let x = e.clientX - trackRect.left;
    let percent = (x / trackRect.width) * 100;
    percent = Math.max(1, Math.min(99, percent));
    setHandlePosition(percent);
    scrollBookToPercent(percent);
  });
  document.addEventListener('mouseup', function(e) {
    if (dragging) {
      dragging = false;
      document.body.style.userSelect = '';
    }
  });

  track.addEventListener('click', function(e) {
    trackRect = track.getBoundingClientRect();
    let x = e.clientX - trackRect.left;
    let percent = (x / trackRect.width) * 100;
    percent = Math.max(1, Math.min(99, percent));
    setHandlePosition(percent);
    scrollBookToPercent(percent);
  });

  // Sync handle position with scroll
  const content = getBookContentElement();
  if (content) {
    content.addEventListener('scroll', function() {
      setHandlePosition(getCurrentBookPercent());
    });
    setHandlePosition(getCurrentBookPercent());
  }
}

// Show/hide slider when book is opened/closed
function showBookReader(bookId) {
  // ...existing code...
  showBookScrollSlider(true);
  setTimeout(() => {
    initBookScrollSlider();
  }, 300);
}

function hideBookReader() {
  // ...existing code...
  showBookScrollSlider(false);
}

// Patch renderBookList to hide slider when not reading
const origRenderBookList = renderBookList;
renderBookList = function() {
  origRenderBookList.apply(this, arguments);
  showBookScrollSlider(false);
};

// Patch book reader open/close logic
// If you have a function that opens the book reader, call showBookReader(bookId) there
// If you have a function that closes the book reader, call hideBookReader() there
// book.js — Homehomehome BOOK Tab logic
// See PRD for requirements
console.log('[BOOK] book.js loaded');

const books = [
  { id: 'frankenstein', title: 'Frankenstein; or, The Modern Prometheus', author: 'Mary Shelley', file: '/books/frankenstein.txt' },
  { id: 'thirtyninesteps', title: 'The Thirty-Nine Steps', author: 'John Buchan', file: '/books/thirtyninesteps.txt' },
  { id: 'littlewomen', title: 'Little Women', author: 'Louisa May Alcott', file: '/books/littlewomen.txt' },
  { id: 'janeeyre', title: 'Jane Eyre', author: 'Charlotte Brontë', file: '/books/janeeyre.txt' },
  { id: 'treasureisland', title: 'Treasure Island', author: 'Robert Louis Stevenson', file: '/books/treasureisland.txt' },
  { id: 'yellowwallpaper', title: 'The Yellow Wallpaper', author: 'Charlotte Perkins Gilman', file: '/books/yellowwallpaper.txt' },
  { id: 'awakening', title: 'The Awakening', author: 'Kate Chopin', file: '/books/awakening.txt' },
  { id: 'mobydick', title: 'Moby-Dick; or, The Whale', author: 'Herman Melville', file: '/books/mobydick.txt' },
  { id: 'rubaiyat', title: 'The Rubaiyat of Omar Khayyam', author: 'Omar Khayyam', file: '/books/rubaiyat.txt' },
  { id: 'aroundtheworld', title: 'Around the World in Eighty Days', author: 'Jules Verne', file: '/books/aroundtheworld.txt' },
  { id: 'callofcthulhu', title: 'The Call of Cthulhu', author: 'H. P. Lovecraft', file: '/books/callofcthulhu.txt' },
  { id: 'prideandprejudice', title: 'Pride and Prejudice', author: 'Jane Austen', file: '/books/prideandprejudice.txt' },
  { id: 'middlemarch', title: 'Middlemarch', author: 'George Eliot', file: '/books/middlemarch.txt' },
  { id: 'beowulf', title: 'Beowulf', author: 'Unknown', file: '/books/beowulf.txt' },
  { id: 'enchantedapril', title: 'The Enchanted April', author: 'Elizabeth Von Arnim', file: '/books/enchantedapril.txt' },
  { id: 'metamorphosis', title: 'Metamorphosis', author: 'Franz Kafka', file: '/books/metamorphosis.txt' },
  { id: 'roomwithaview', title: 'A Room with a View', author: 'E. M. Forster', file: '/books/roomwithaview.txt' },
  { id: 'greatgatsby', title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', file: '/books/greatgatsby.txt' },
  { id: 'anneofgreengables', title: 'Anne of Green Gables', author: 'L. M. Montgomery', file: '/books/anneofgreengables.txt' },
  { id: 'dubliners', title: 'Dubliners', author: 'James Joyce', file: '/books/dubliners.txt' },
  { id: 'bookoftea', title: 'The Book of Tea', author: 'Kakuzo Okakura', file: '/books/bookoftea.txt' },
  { id: 'gulliverstravels', title: 'Gulliver\'s Travels', author: 'Jonathan Swift', file: '/books/gulliverstravels.txt' },
  { id: 'mrsspringfragrance', title: 'Mrs. Spring Fragrance', author: 'Sui Sin Far', file: '/books/mrsspringfragrance.txt' },
  { id: 'opioneers', title: 'O Pioneers!', author: 'Willa Cather', file: '/books/opioneers.txt' },
  { id: 'goldenthreshold', title: 'The Golden Threshold', author: 'Sarojini Naidu', file: '/books/goldenthreshold.txt' },
  { id: 'shipsthatpass', title: 'Ships That Pass In The Night', author: 'Beatrice Harraden', file: '/books/shipsthatpass.txt' },
  { id: 'meditations', title: 'Meditations', author: 'Marcus Aurelius', file: '/books/meditations.txt' },
  { id: 'timemachine', title: 'The Time Machine', author: 'H. G. Wells', file: '/books/timemachine.txt' },
  { id: 'wutheringheights', title: 'Wuthering Heights', author: 'Emily Brontë', file: '/books/wutheringheights.txt' },
  { id: 'poemsandsongs', title: 'Poems and Songs of Robert Burns', author: 'Robert Burns', file: '/books/poemsandsongs.txt' },
  { id: 'secretgarden', title: 'The Secret Garden', author: 'Frances Hodgson Burnett', file: '/books/secretgarden.txt' },
  { id: 'heidi', title: 'Heidi', author: 'Johanna Spyri', file: '/books/heidi.txt' },
  { id: 'junglebook', title: 'The Jungle Book', author: 'Rudyard Kipling', file: '/books/junglebook.txt' },
  { id: 'peterpan', title: 'Peter Pan', author: 'J. M. Barrie', file: '/books/peterpan.txt' },
  { id: 'aliceinwonderland', title: 'Alice\'s Adventures in Wonderland', author: 'Lewis Carroll', file: '/books/aliceinwonderland.txt' },
  { id: 'peterrabbit', title: 'The Tale of Peter Rabbit', author: 'Beatrix Potter', file: '/books/peterrabbit.txt' },
  { id: 'blackbeauty', title: 'Black Beauty', author: 'Anna Sewell', file: '/books/blackbeauty.txt' },
  { id: 'railwaychildren', title: 'The Railway Children', author: 'E. Nesbit', file: '/books/railwaychildren.txt' },
  { id: 'winniethepooh', title: 'Winnie-the-Pooh', author: 'A. A. Milne', file: '/books/winniethepooh.txt' },
  { id: 'velveteenrabbit', title: 'The Velveteen Rabbit', author: 'Margery Williams Bianco', file: '/books/velveteenrabbit.txt' }, 
  // Add new books here
];

let bookTabInitialized = false;
let currentBookId = null;
let scrollSaveTimeout = null;

function getBookState(id) {
  const pos = parseFloat(localStorage.getItem(`homehome:book:${id}:pos`) || '0');
  const state = localStorage.getItem(`homehome:book:${id}:state`) || 'unread';
  return { pos, state };
}

function setBookState(id, pos, state) {
  localStorage.setItem(`homehome:book:${id}:pos`, String(pos));
  localStorage.setItem(`homehome:book:${id}:state`, state);
  localStorage.setItem(`homehome:book:${id}:lastOpenedAt`, new Date().toISOString());
}

function getReadStateFromScroll(percent) {
  if (percent >= 95) return 'read';
  if (percent >= 1) return 'started';
  return 'unread';
}

function renderBookList() {
  console.log('[BOOK] renderBookList called');
  const listContainer = document.getElementById('book-list-container');
  const readerContainer = document.getElementById('book-reader-container');
  if (!listContainer) {
    console.warn('[BOOK] #book-list-container not found');
    return;
  }
  if (!readerContainer) {
    console.warn('[BOOK] #book-reader-container not found');
  }
  listContainer.style.display = '';
  if (readerContainer) {
    readerContainer.style.display = 'none';
    readerContainer.innerHTML = '';
  }
  listContainer.innerHTML = '';
  const ul = document.createElement('ul');
  ul.className = 'book-list';

  // Gather book states and lastOpenedAt
  const bookStates = books.map(book => {
    const { state } = getBookState(book.id);
    const lastOpenedAt = localStorage.getItem(`homehome:book:${book.id}:lastOpenedAt`) || '';
    return { ...book, state, lastOpenedAt };
  });

  // Helper: compare titles ignoring leading articles "A", "An", "The" (case-insensitive)
  function stripLeadingArticle(title) {
    if (!title || typeof title !== 'string') return title;
    // Remove leading A, An, The (with optional surrounding whitespace), case-insensitive
    return title.replace(/^\s*(?:the|an|a)\s+/i, '').trim();
  }

  function compareTitlesIgnoringArticle(a, b) {
    return stripLeadingArticle(a.title).localeCompare(stripLeadingArticle(b.title));
  }

  // Sort logic:
  // 1. Completed books (read) at the bottom, sorted by title
  // 2. Started/Recently read books at the top, sorted by lastOpenedAt desc
  // 3. Unread books in the middle/top, sorted alphabetically
  const readBooks = bookStates.filter(b => b.state === 'read').sort(compareTitlesIgnoringArticle);
  const startedBooks = bookStates
    .filter(b => b.state === 'started')
    .sort((a, b) => (b.lastOpenedAt || '').localeCompare(a.lastOpenedAt || ''));
  const unreadBooks = bookStates.filter(b => b.state === 'unread').sort(compareTitlesIgnoringArticle);

  // Final order: started, unread, read
  const orderedBooks = [...startedBooks, ...unreadBooks, ...readBooks];

  orderedBooks.forEach(book => {
    const li = document.createElement('li');
    li.className = `book-list-item ${book.state}`;
    li.setAttribute('tabindex', '0');
    li.setAttribute('role', 'option');
    li.setAttribute('aria-label', book.title);
    li.dataset.bookId = book.id;
    // Get percent read
    const { pos } = getBookState(book.id);
    let percentRead = Math.round(pos);
    // Always show percentage (show 0% for first-time users)
    // Move percent to the same line as the author to avoid title collisions
    let percentSpan = `<span class="book-percent-read" style="float:right;display:inline-block;text-align:right;min-width:3em;font-weight:normal;color:inherit;">${percentRead}%</span>`;
    li.innerHTML =
      // Title on its own line
      `<span class="book-title" style="display:block;vertical-align:middle;">${book.title}</span>` +
      // Author and percent on the same line: author left, percent floated right
      `<span class="book-author" style="display:block;vertical-align:middle;opacity:0.95;margin-top:0px;">` +
        `<span class="book-author-name" style="display:inline-block;">${book.author ? book.author : ''}</span>` +
        `${percentSpan}` +
      `</span>` +
      // Offline indicator (absolutely positioned)
      `<span class="offline-indicator" title="Offline/cached status" aria-label="Offline/cached status">●</span>`;
    // Font weight and strikethrough for state
    if (book.state === 'unread') {
      li.style.fontWeight = 'bold';
      li.style.textDecoration = '';
    } else if (book.state === 'started') {
      li.style.fontWeight = 'normal';
      li.style.textDecoration = '';
    } else if (book.state === 'read') {
      li.style.fontWeight = 'normal';
      li.style.textDecoration = 'line-through';
    }
    li.addEventListener('click', () => openBook(book.id));
    li.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openBook(book.id);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next = li.nextElementSibling;
        if (next) next.focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = li.previousElementSibling;
        if (prev) prev.focus();
      }
    });
    ul.appendChild(li);
  });
  listContainer.appendChild(ul);
  console.log('[BOOK] Book list rendered:', orderedBooks.map(b => b.title));

    // --- Drag/Touch Scroll Implementation for Book List ---
    let isPointerDown = false;
    let lastY = 0;
    let lastScrollTop = 0;
    let pointerId = null;

    ul.addEventListener('pointerdown', (e) => {
      // For mouse: implement click-drag scrolling. For touch/pen let native scrolling handle momentum.
      if (e.pointerType === 'mouse') {
        if (e.button !== 0) return;
        isPointerDown = true;
        pointerId = e.pointerId;
        lastY = e.clientY;
        lastScrollTop = ul.scrollTop;
        try { ul.setPointerCapture(pointerId); } catch (err) {}
        ul.style.cursor = 'grabbing';
        e.preventDefault();
      }
      // touch/pen: do not preventDefault so native momentum scrolling works
    });
    ul.addEventListener('pointermove', (e) => {
      if (!isPointerDown || e.pointerId !== pointerId) return;
      const deltaY = e.clientY - lastY;
      ul.scrollTop = lastScrollTop - deltaY;
      // Don't select text while dragging
      if (Math.abs(deltaY) > 2) {
        window.getSelection()?.removeAllRanges();
      }
    });
    ul.addEventListener('pointerup', (e) => {
      if (e.pointerId !== pointerId) return;
      isPointerDown = false;
      pointerId = null;
      ul.releasePointerCapture(e.pointerId);
      ul.style.cursor = '';
    });
    ul.addEventListener('pointerleave', (e) => {
      if (!isPointerDown || e.pointerId !== pointerId) return;
      isPointerDown = false;
      pointerId = null;
      ul.releasePointerCapture(e.pointerId);
      ul.style.cursor = '';
    });
    // Prevent accidental text selection on drag
    ul.addEventListener('dragstart', (e) => e.preventDefault());
}

function showBookSpinner() {
  const reader = document.getElementById('book-reader-container');
  if (reader) {
    reader.innerHTML = `<div class="book-spinner" aria-live="polite">| Loading...</div>`;
    reader.style.display = 'flex';
  }
}

function hideBookSpinner() {
  // No-op: content will be replaced
}

function openBook(bookId) {
  currentBookId = bookId;
  showBookSpinner();
  // update URL to deep-link for this book (if router is present)
  try {
    if (typeof updateHistory === 'function') {
      if (typeof isNavigatingHistory === 'undefined' || !isNavigatingHistory) {
        // Use query-style deep link to avoid server rewrite issues: ?=books/<id>
        const base = (location.pathname && location.pathname !== '/') ? location.pathname.split('?')[0] : '/';
        const q = `?=${encodeURIComponent('books/' + bookId)}`;
        const pathToPush = (base === '/' ? '/' : base) + q;
        updateHistory(pathToPush);
      }
    }
  } catch (err) { /* ignore */ }
  const book = books.find(b => b.id === bookId);
  if (!book) return;
  fetchBookContent(book)
    .then(text => {
      renderBookReader(book, text);
    })
    .catch(err => {
      document.getElementById('book-reader-container').innerHTML = `<div style="color:#dc322f;padding:32px;">Error loading book: ${err.message || err}</div>`;
    });
}

function fetchBookContent(book) {
  // Try to fetch from SW cache first, fallback to network
  // For now, just fetch (SW will intercept if registered)
  return fetch(book.file)
    .then(resp => {
      if (!resp.ok) throw new Error('Not available offline or file missing');
      return resp.text();
    });
}

function renderBookReader(book, text) {
  const reader = document.getElementById('book-reader-container');
  if (!reader) return;
  // Get font size from localStorage or default
  const fontSize = localStorage.getItem(`homehome:book:${book.id}:fontSize`) || '1.1em';
  // Header with close button
  const fileName = book.file.split('/').pop().toUpperCase();
  reader.innerHTML = `
    <div class="book-reader-header" style="display:flex;align-items:center;justify-content:center;position:relative;background:var(--bg-surface);border-bottom:2px solid var(--border-color);padding:8px 12px;font-family:inherit;font-size:1em;font-weight:bold;letter-spacing:2px;">
      <span class="book-reader-title" style="flex:1;text-align:center;">${fileName}</span>
      <button class="book-reader-close" aria-label="Close book reader" style="position:absolute;right:16px;top:8px;font-size:1.2em;background:none;border:none;color:#dc322f;font-weight:bold;user-select:none;">✕</button>
    </div>
    <div class="book-reader-content" tabindex="0" style="font-size:${fontSize};"></div>
    <div class="book-reader-footer-bar">
      <div class="book-font-controls" aria-label="Font size controls">
        <span class="book-font-size book-font-small" role="button" tabindex="0" aria-label="Small font" style="font-size:0.9em;${fontSize==='0.9em'?'font-weight:bold;text-decoration:underline;':''}">A</span>
        <span class="book-font-size book-font-medium" role="button" tabindex="0" aria-label="Medium font" style="font-size:1.1em;${fontSize==='1.1em'?'font-weight:bold;text-decoration:underline;':''}">A</span>
        <span class="book-font-size book-font-large" role="button" tabindex="0" aria-label="Large font" style="font-size:1.3em;${fontSize==='1.3em'?'font-weight:bold;text-decoration:underline;':''}">A</span>
      </div>
    </div>
  `;
  reader.style.display = 'flex';
  document.getElementById('book-list-container').style.display = 'none';
  const closeBtn = reader.querySelector('.book-reader-close');
  closeBtn.addEventListener('click', closeBookReader);
  closeBtn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      closeBookReader();
    }
  });
  // Render text, normalize line endings, preserve paragraphs, unwrap lines, and format markup
  const contentDiv = reader.querySelector('.book-reader-content');
  let normalized = text.replace(/\r\n?/g, '\n');
  const lines = normalized.split('\n');
  function formatMarkdown(str) {
    return str
      .replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>');
  }
  const preserved = lines.slice(0, 3).map(line => formatMarkdown(line ? line : '&nbsp;')).join('<br>');
  let rest = lines.slice(3).join('\n');
  rest = rest.replace(/([^\n])\n(?!\n)/g, '$1 ');
  rest = rest.replace(/\n{3,}/g, '\n\n');
  let html = rest
    .replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .split(/\n{2,}/).map(p => `<p>${p.trim()}</p>`).join('');
  contentDiv.innerHTML = preserved + '<br><br>' + html;
  // Restore scroll position
  const { pos } = getBookState(book.id);
  setTimeout(() => {
    contentDiv.scrollTop = (contentDiv.scrollHeight * pos) / 100;
    contentDiv.focus();
  }, 0);

  // Font size controls logic
  const fontControls = reader.querySelector('.book-font-controls');
  if (fontControls) {
    fontControls.addEventListener('click', (e) => {
      if (!e.target.classList.contains('book-font-size')) return;
      let newSize = '1.1em';
      if (e.target.classList.contains('book-font-small')) newSize = '0.9em';
      if (e.target.classList.contains('book-font-medium')) newSize = '1.1em';
      if (e.target.classList.contains('book-font-large')) newSize = '1.3em';
      // Save scroll position as percent of content
      const scrollPercent = Math.max(0, Math.min(100, 100 * contentDiv.scrollTop / (contentDiv.scrollHeight - contentDiv.clientHeight)));
      localStorage.setItem(`homehome:book:${book.id}:fontSize`, newSize);
      // Re-render with new font size, restoring scroll position
      renderBookReader(book, text);
      setTimeout(() => {
        const newContentDiv = reader.querySelector('.book-reader-content');
        // Restore scroll position to same percent
        newContentDiv.scrollTop = (newContentDiv.scrollHeight * scrollPercent) / 100;
        newContentDiv.focus();
      }, 0);
    });
    // Keyboard accessibility
    fontControls.querySelectorAll('.book-font-size').forEach(el => {
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          el.click();
        }
      });
    });
  }

  // --- Drag/Touch Scroll Implementation ---
  let isPointerDown = false;
  let lastY = 0;
  let lastScrollTop = 0;
  let pointerId = null;
  contentDiv.addEventListener('pointerdown', (e) => {
    // For mouse: implement click-drag scrolling. For touch/pen let native scrolling handle momentum.
    if (e.pointerType === 'mouse') {
      if (e.button !== 0) return;
      isPointerDown = true;
      pointerId = e.pointerId;
      lastY = e.clientY;
      lastScrollTop = contentDiv.scrollTop;
      try { contentDiv.setPointerCapture(pointerId); } catch (err) {}
      contentDiv.style.cursor = 'grabbing';
      e.preventDefault();
    }
    // touch/pen: do not preventDefault so native momentum scrolling works
  });
  contentDiv.addEventListener('pointermove', (e) => {
    if (!isPointerDown || e.pointerId !== pointerId) return;
    const deltaY = e.clientY - lastY;
    contentDiv.scrollTop = lastScrollTop - deltaY;
    if (Math.abs(deltaY) > 2) {
      window.getSelection()?.removeAllRanges();
    }
  });
  contentDiv.addEventListener('pointerup', (e) => {
    if (e.pointerId !== pointerId) return;
    isPointerDown = false;
    pointerId = null;
    contentDiv.releasePointerCapture(e.pointerId);
    contentDiv.style.cursor = '';
  });
  contentDiv.addEventListener('pointerleave', (e) => {
    if (!isPointerDown || e.pointerId !== pointerId) return;
    isPointerDown = false;
    pointerId = null;
    contentDiv.releasePointerCapture(e.pointerId);
    contentDiv.style.cursor = '';
  });
  contentDiv.addEventListener('dragstart', (e) => e.preventDefault());

  // Scroll tracking
  contentDiv.onscroll = () => {
    if (scrollSaveTimeout) clearTimeout(scrollSaveTimeout);
    scrollSaveTimeout = setTimeout(() => {
      const percent = Math.max(0, Math.min(100, 100 * contentDiv.scrollTop / (contentDiv.scrollHeight - contentDiv.clientHeight)));
      const state = getReadStateFromScroll(percent);
      setBookState(book.id, percent, state);
      updateBookListItemState(book.id, state);
    }, 200);
  };
  // Initial state update
  const percent = Math.max(0, Math.min(100, 100 * contentDiv.scrollTop / (contentDiv.scrollHeight - contentDiv.clientHeight)));
  const state = getReadStateFromScroll(percent);
  setBookState(book.id, percent, state);
  updateBookListItemState(book.id, state);
}

function closeBookReader() {
  const reader = document.getElementById('book-reader-container');
  if (reader) {
    reader.style.display = 'none';
    reader.innerHTML = '';
  }
  document.getElementById('book-list-container').style.display = '';
  currentBookId = null;
  // Refresh book list to update order and percent
  renderBookList();
  // ensure URL reflects book list rather than a specific book
  try {
    if (typeof updateHistory === 'function') {
      if (typeof isNavigatingHistory === 'undefined' || !isNavigatingHistory) {
        const base = (location.pathname && location.pathname !== '/') ? location.pathname.split('?')[0] : '/';
        const pathToPush = (base === '/' ? '/' : base) + `?=${encodeURIComponent('book')}`;
        updateHistory(pathToPush, true);
      }
    }
  } catch (err) { /* ignore */ }
}

function updateBookListItemState(bookId, state) {
  const list = document.querySelectorAll('.book-list-item');
  list.forEach(li => {
    if (li.dataset.bookId === bookId) {
      li.classList.remove('unread', 'started', 'read');
      li.classList.add(state);
      // Update font weight immediately
      if (state === 'unread') {
        li.style.fontWeight = 'bold';
        li.style.textDecoration = '';
      } else if (state === 'started') {
        li.style.fontWeight = 'normal';
        li.style.textDecoration = '';
      } else if (state === 'read') {
        li.style.fontWeight = 'normal';
        li.style.textDecoration = 'line-through';
      }
      // Update percent text so list reflects the latest saved progress
      try {
        const percentSpan = li.querySelector('.book-percent-read');
        const percent = Math.round(getBookState(bookId).pos || 0);
        if (percentSpan) {
          percentSpan.textContent = percent + '%';
        } else {
          // If for some reason the span is missing (older markup), create and insert it
          const span = document.createElement('span');
          span.className = 'book-percent-read';
          span.style.cssText = 'float:right;display:inline-block;text-align:right;min-width:3em;font-weight:normal;color:inherit;';
          span.textContent = percent + '%';
          const offline = li.querySelector('.offline-indicator');
          if (offline && offline.parentNode) offline.parentNode.insertBefore(span, offline);
          else li.appendChild(span);
        }
      } catch (err) {
        // Non-critical: if getBookState isn't available for any reason, skip updating percent
      }
    }
  });
}

function initBookTab() {
  console.log('[BOOK] initBookTab called, readyState:', document.readyState);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      console.log('[BOOK] DOMContentLoaded event for initBookTab');
      renderBookList();
      bookTabInitialized = true;
    }, { once: true });
  } else {
    renderBookList();
    bookTabInitialized = true;
  }
}

// Expose for main.js
window.initBookTab = initBookTab;
window.books = books;

// Variable to store prayers loaded from external JSON file
let prayersData = [];

// State Management
let themeSetting = localStorage.getItem('theme_preference') || 'system';

// DOM Elements
const categorySelect = document.getElementById('category-select');
const displayTitle = document.getElementById('display-title');
const displaySubtitle = document.getElementById('display-subtitle');
const displayintroText = document.getElementById('display-introText');
const displayBody = document.getElementById('display-body');
const themeBtn = document.getElementById('theme-btn');
const themeIcon = document.getElementById('theme-icon');

// Theme Engine
function applyTheme(theme) {
    const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    if (isDark) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }

    // Update Theme Icon
    if (theme === 'dark') {
        themeIcon.setAttribute('data-lucide', 'moon');
    } else if (theme === 'light') {
        themeIcon.setAttribute('data-lucide', 'sun');
    } else {
        themeIcon.setAttribute('data-lucide', 'laptop');
    }
    lucide.createIcons();
}

function cycleTheme() {
    if (themeSetting === 'system') themeSetting = 'light';
    else if (themeSetting === 'light') themeSetting = 'dark';
    else themeSetting = 'system';

    localStorage.setItem('theme_preference', themeSetting);
    applyTheme(themeSetting);
}

// Handle OS Theme changes when in "system" mode
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (themeSetting === 'system') applyTheme('system');
});

// Populate Select Dropdown
function populateCategories() {
    categorySelect.innerHTML = '';

    prayersData.forEach(item => {
        const opt = document.createElement('option');
        opt.value = item.id;
        opt.textContent = item.title;
        categorySelect.appendChild(opt);
    });

    categorySelect.selectedIndex = 0;
    renderSelectedPrayer();
}

// Get currently selected item
function getSelectedItem() {
    const id = categorySelect.value;
    return prayersData.find(p => p.id === id);
}

// Render current selection
function renderSelectedPrayer() {
    const item = getSelectedItem();
    if (!item) return;

    displayTitle.textContent = item.title;
    displaySubtitle.textContent = item.subtitle;
    displayintroText.textContent = item.introText;

    const mysteriesHtml = item.mysteries.map(m => `
        <div class="relative overflow-hidden p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-700/40 transition-all space-y-0.5">
            
            <!-- Faint Background Image Layer (Locked inside this specific card) -->
            ${m.image ? `<div class="absolute inset-0 bg-cover bg-center opacity-20 dark:opacity-15 pointer-events-none" style="background-image: url('${m.image}')"></div>` : ''}

            <!-- Card Content (Placed above the background) -->
            <div class="relative z-10">
                <h3 class="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <span class="inline-flex items-center justify-center bg-brand-600 text-white rounded-full w-6 h-6 text-xs font-black shrink-0">${m.num}</span>
                    <span class="font-bold">${m.title}</span>
                </h3>
                
                <div class="pl-8 pt-1 flex flex-col gap-1.5 overflow-visible">
                    <p class="italic text-slate-700 dark:text-slate-300 font-medium text-sm sm:text-base leading-relaxed my-0.5">
                        ${m.description || ''}
                    </p>
                    ${m.decprayer ? `<p class="text-slate-600 dark:text-slate-500 font-bold text-sm sm:text-base leading-relaxed">${m.decprayer}</p>` : ''}
                    ${m.prayer ? `<p class="text-slate-700 dark:text-slate-300 font-medium text-sm sm:text-base leading-relaxed"><strong class="font-bold text-slate-900 dark:text-white">Prayer:</strong> ${m.prayer}</p>` : ''}
                </div>
            </div>
        </div>
    `).join('');

    displayBody.innerHTML = mysteriesHtml;
}

// FETCH EXTERNAL JSON FILE
async function loadPrayersFromFile() {
    try {
        const response = await fetch('prayers.json');
        if (!response.ok) throw new Error('Network response was not ok');
        prayersData = await response.json();
        populateCategories();
    } catch (error) {
        console.error('Failed to load prayers JSON:', error);
        displayTitle.textContent = 'Error Loading Prayers';
        displayBody.innerHTML = '<p class="text-red-500 font-semibold">Could not load prayers.json file. Make sure the file exists in the same folder.</p>';
    }
}

// Event Listeners
categorySelect.addEventListener('change', renderSelectedPrayer);
themeBtn.addEventListener('click', cycleTheme);

// Initialize App
window.addEventListener('DOMContentLoaded', () => {
    applyTheme(themeSetting);
    loadPrayersFromFile();
    loadUniversalisReadings();
    lucide.createIcons();
});

// Toggle prayer balloon popups
// In prayers.json file, wrap any word you want to make clickable inside a <span class="clickable-prayer" data-prayer="Your short prayer text here...">Word</span>            
// Global Click Listener for Prayer Balloons
document.addEventListener('click', (event) => {
    // Use .closest() to catch clicks on nested elements or text nodes
    const target = event.target.closest('.clickable-prayer');

    if (target) {
        event.stopPropagation();

        let balloon = target.querySelector('.prayer-balloon');

        if (!balloon) {
            // Remove any other open balloons across the page
            document.querySelectorAll('.prayer-balloon').forEach(b => b.classList.remove('active'));

            // Create balloon element
            balloon = document.createElement('div');
            balloon.className = 'prayer-balloon';
            balloon.textContent = target.getAttribute('data-prayer');
            target.appendChild(balloon);

            // Force browser reflow to trigger animation on remote servers
            void balloon.offsetWidth;
            balloon.classList.add('active');
        } else {
            balloon.classList.toggle('active');
        }
    } else {
        // Dismiss balloons when clicking outside
        document.querySelectorAll('.prayer-balloon').forEach(b => b.classList.remove('active'));
    }
});

// --- UNIVERSALIS.COM MASS READINGS INTEGRATION ---
// 1. The global callback function expected by Universalis JSONP
// Global callback expected by Universalis
window.universalisCallback = function(data) {
    console.log("Universalis Data Received:", data);

    // 1. Set Title / Celebration Name
    const titleEl = document.getElementById('universalis-title');
    if (titleEl) {
        titleEl.innerHTML = data.day || data.title || "Today's Mass";
    }

    // 2. Set Gospel Source & Text
    const sourceEl = document.getElementById('universalis-gospel-source');
    const gospelEl = document.getElementById('universalis-gospel');

    let gospelText = "";
    let gospelSource = "";

    // Extract text and source safely from Universalis payload structures
    if (data.Mass_G) {
        if (typeof data.Mass_G === 'string') {
            gospelText = data.Mass_G;
        } else {
            gospelText = data.Mass_G.text || "";
            gospelSource = data.Mass_G.source || "";
        }
    } else if (data.mass && data.mass.gospel) {
        gospelText = typeof data.mass.gospel === 'string' ? data.mass.gospel : data.mass.gospel.text || "";
        gospelSource = data.mass.gospel.source || "";
    }

    // Update source element if available
    if (sourceEl) {
        sourceEl.innerHTML = gospelSource ? gospelSource : "";
    }

    // Update Gospel text element
    if (gospelEl) {
        if (gospelText) {
            gospelEl.innerHTML = gospelText;
        } else {
            gospelEl.innerHTML = "Gospel reading not available for today. <a href='https://universalis.com/mass.htm' target='_blank' class='underline text-brand-600'>Read on Universalis</a>";
        }
    }
};

// Function to dynamically inject the correct Universalis.com JSONP script
function loadUniversalisReadings() {
    const existingScript = document.getElementById('universalis-script');
    if (existingScript) existingScript.remove();

    const script = document.createElement('script');
    script.id = 'universalis-script';

    // Specify region/calendar (e.g., Europe.England.Westminster, USA, or Europe)
    // Using 'today' lets Universalis serve today's readings dynamically
    const regionCalendar = "Europe.England.Westminster"; 
    script.src = `https://universalis.com/${regionCalendar}/today/jsonpmass.js?callback=universalisCallback`;
    
    script.async = true;

    script.onerror = () => {
        const gospelEl = document.getElementById('universalis-gospel');
        if (gospelEl) {
            gospelEl.innerHTML = "Unable to load live readings. <a href='https://universalis.com/mass.htm' target='_blank' class='underline text-brand-600'>Open Universalis directly</a>";
        }
    };

    document.body.appendChild(script);
}

// Back to Top Button Functionality
const backToTopBtn = document.getElementById('back-to-top');

window.addEventListener('scroll', () => {
    if (window.scrollY > 300) {
        backToTopBtn.classList.remove('opacity-0', 'pointer-events-none');
        backToTopBtn.classList.add('opacity-100');
    } else {
        backToTopBtn.classList.add('opacity-0', 'pointer-events-none');
        backToTopBtn.classList.remove('opacity-100');
    }
});

backToTopBtn.addEventListener('click', () => {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
});
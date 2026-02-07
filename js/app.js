/**
 * SUPER WEB IPTV - Main Application JavaScript
 * Version 3.0.0
 */

// Global Variables
let allChannels = [];
let filteredChannels = [];
let categories = [];
let countries = {};
let favorites = JSON.parse(localStorage.getItem('iptv_favorites')) || [];
let history = JSON.parse(localStorage.getItem('iptv_history')) || [];
let currentPage = 1;
let channelsPerPage = 24;
let currentView = 'grid';
let playerInstance = null;
let floatingPlayerInstance = null;
let appData = null;
let currentChannel = null;

// Initialize App
async function initApp() {
    console.log("SUPER WEB IPTV - Po inicializohet...");
    
    try {
        // Load data from JSON file
        await loadChannelsData();
        
        // Initialize data
        allChannels = [...appData.channels];
        filteredChannels = [...allChannels];
        categories = [...appData.categories];
        countries = {...appData.countries};
        
        // Load UI components
        updateStats();
        loadCategories();
        loadLiveChannels();
        renderChannels();
        setupEventListeners();
        initializeVideoPlayers();
        
        // Set online status
        updateOnlineStatus();
        
        console.log("Aplikacioni u inicializua me sukses!");
        
        // Show welcome notification
        setTimeout(() => {
            showNotification(`Mirë se vini! Gjetët ${allChannels.length} kanale`, 'success');
        }, 1000);
        
    } catch (error) {
        console.error('Dështoi inicializimi:', error);
        showNotification('Gabim në ngarkimin e të dhënave. Ju lutem rifreskoni faqen.', 'error');
        
        // Load fallback data
        loadFallbackData();
    }
}

// Load channels data from JSON
async function loadChannelsData() {
    try {
        console.log('Po ngarkohen të dhënat nga channels.json...');
        const response = await fetch('channels.json');
        
        if (!response.ok) {
            throw new Error(`HTTP gabim! status: ${response.status}`);
        }
        
        appData = await response.json();
        console.log('Të dhënat u ngarkuan:', appData);
        
    } catch (error) {
        console.error('Gabim në ngarkimin e channels.json:', error);
        
        // Try alternative paths
        try {
            const response = await fetch('./channels.json');
            appData = await response.json();
        } catch (error2) {
            console.error('Gabim në ngarkimin nga rruga alternative:', error2);
            throw error2;
        }
    }
}

// Fallback data if JSON fails to load
function loadFallbackData() {
    appData = {
        channels: [
            {
                id: 1,
                name: "┃AL┃ RTSH 1 HD",
                url: "",
                logo: "",
                category: "┃AL┃ ALBANIA",
                country: "AL",
                quality: "HD",
                working: true,
                viewers: 1000,
                language: "sq",
                isLive: true
            }
        ],
        categories: [
            { id: "all", name: "Të gjitha", icon: "fas fa-globe", count: 1 },
            { id: "┃AL┃ ALBANIA", name: "Shqipëri", icon: "fas fa-home", count: 1 }
        ],
        countries: { "AL": "Shqipëri" }
    };
    
    allChannels = [...appData.channels];
    filteredChannels = [...allChannels];
    categories = [...appData.categories];
    countries = {...appData.countries};
    
    updateStats();
    loadCategories();
    loadLiveChannels();
    renderChannels();
}

// Update statistics
function updateStats() {
    const total = allChannels.length;
    const working = allChannels.filter(ch => ch.working).length;
    
    document.getElementById('total-stats').textContent = total;
    document.getElementById('working-stats').textContent = working;
    
    // Calculate total viewers
    const totalViewers = allChannels.reduce((sum, ch) => sum + (ch.viewers || 0), 0);
    let formattedViewers;
    
    if (totalViewers >= 1000000) {
        formattedViewers = (totalViewers / 1000000).toFixed(1) + 'M';
    } else if (totalViewers >= 1000) {
        formattedViewers = (totalViewers / 1000).toFixed(1) + 'K';
    } else {
        formattedViewers = totalViewers;
    }
    
    document.getElementById('viewers-stats').textContent = formattedViewers;
}

// Update online status
function updateOnlineStatus() {
    const statusElement = document.getElementById('online-status');
    if (navigator.onLine) {
        statusElement.innerHTML = '<i class="fas fa-circle" style="color: var(--success-color)"></i> Online';
    } else {
        statusElement.innerHTML = '<i class="fas fa-circle" style="color: var(--error-color)"></i> Offline';
    }
}

// Load categories from JSON data
function loadCategories() {
    const categoriesScroll = document.getElementById('categories-scroll');
    if (!categoriesScroll) return;
    
    categoriesScroll.innerHTML = '';
    
    // Calculate counts from actual data
    const categoryCounts = {};
    allChannels.forEach(channel => {
        categoryCounts[channel.category] = (categoryCounts[channel.category] || 0) + 1;
    });
    
    // Update category counts
    categories.forEach(category => {
        if (category.id !== 'all') {
            category.count = categoryCounts[category.id] || 0;
        }
    });
    
    // Add "All" category with total count
    const allCategories = [
        {
            id: 'all',
            name: 'Të gjitha',
            icon: 'fas fa-globe',
            count: allChannels.length
        },
        ...categories.filter(cat => cat.id !== 'all')
    ];
    
    allCategories.forEach(category => {
        const categoryElement = document.createElement('div');
        categoryElement.className = 'category-item';
        categoryElement.innerHTML = `
            <div class="category-icon">
                <i class="${category.icon}"></i>
            </div>
            <div class="category-info">
                <h4>${cleanCategoryName(category.name)}</h4>
                <small>${category.count} kanale</small>
            </div>
        `;
        
        categoryElement.addEventListener('click', () => {
            filterByCategory(category.id);
        });
        
        categoriesScroll.appendChild(categoryElement);
    });
}

// Clean category name (remove prefix symbols)
function cleanCategoryName(categoryName) {
    return categoryName.replace(/^[┃|‖│║╏]+\s*[A-Z]{2}\s*[┃|‖│║╏]+\s*/, '');
}

// Clean channel name for display
function cleanChannelName(channelName) {
    return channelName.replace(/^[┃|‖│║╏]+\s*[A-Z]{2}\s*[┃|‖│║╏]+\s*/, '');
}

// Load live channels for carousel
function loadLiveChannels() {
    const liveCarousel = document.getElementById('live-carousel');
    if (!liveCarousel) return;
    
    const liveChannels = allChannels.filter(ch => ch.isLive && ch.working).slice(0, 10);
    
    liveCarousel.innerHTML = '';
    
    liveChannels.forEach(channel => {
        const channelElement = document.createElement('div');
        channelElement.className = 'channel-card live';
        channelElement.innerHTML = `
            <div class="channel-logo">
                ${channel.logo ? `<img src="${channel.logo}" alt="${cleanChannelName(channel.name)}" onerror="this.onerror=null; this.innerHTML='📺'">` : '📺'}
            </div>
            <div class="channel-info">
                <h4 title="${cleanChannelName(channel.name)}">${cleanChannelName(channel.name)}</h4>
                <div class="channel-meta">
                    <span class="quality-badge ${channel.quality.toLowerCase()}">${channel.quality}</span>
                    <span class="viewers"><i class="fas fa-eye"></i> ${formatNumber(channel.viewers)}</span>
                </div>
                <div class="live-indicator-small">
                    <span class="live-dot"></span>
                    <span>LIVE</span>
                </div>
            </div>
            <button class="play-btn" onclick="playChannel(${channel.id})">
                <i class="fas fa-play"></i>
            </button>
        `;
        
        liveCarousel.appendChild(channelElement);
    });
}

// Format number with K/M suffix
function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num;
}

// Render channels based on current view
function renderChannels() {
    const channelsContainer = document.getElementById('channels-container');
    if (!channelsContainer) return;
    
    channelsContainer.innerHTML = '';
    
    // Calculate pagination
    const startIndex = (currentPage - 1) * channelsPerPage;
    const endIndex = startIndex + channelsPerPage;
    const currentChannels = filteredChannels.slice(startIndex, endIndex);
    
    // Update pagination
    updatePagination();
    
    if (currentChannels.length === 0) {
        channelsContainer.innerHTML = `
            <div class="no-results">
                <i class="fas fa-tv-slash"></i>
                <h3>Nuk u gjet asnjë kanal</h3>
                <p>Provoni të ndryshoni filtrat ose kërkimin</p>
                <button class="btn-action" onclick="resetFilters()">
                    <i class="fas fa-redo"></i> Reset Filtra
                </button>
            </div>
        `;
        return;
    }
    
    currentChannels.forEach(channel => {
        const channelElement = createChannelElement(channel);
        channelsContainer.appendChild(channelElement);
    });
}

// Create channel element based on current view
function createChannelElement(channel) {
    const isFavorite = favorites.includes(channel.id);
    const favoriteIcon = isFavorite ? 'fas fa-heart' : 'far fa-heart';
    const isWorking = channel.working;
    const workingClass = isWorking ? '' : 'not-working';
    const cleanedName = cleanChannelName(channel.name);
    
    if (currentView === 'list') {
        return createListViewElement(channel, favoriteIcon, cleanedName, workingClass);
    } else if (currentView === 'compact') {
        return createCompactViewElement(channel, favoriteIcon, cleanedName, workingClass);
    } else {
        return createGridViewElement(channel, favoriteIcon, cleanedName, workingClass);
    }
}

// Grid view element
function createGridViewElement(channel, favoriteIcon, cleanedName, workingClass) {
    const element = document.createElement('div');
    element.className = `channel-card ${workingClass}`;
    element.innerHTML = `
        <div class="channel-header">
            <div class="channel-logo">
                ${channel.logo ? `<img src="${channel.logo}" alt="${cleanedName}" onerror="this.onerror=null; this.innerHTML='📺'">` : '📺'}
            </div>
            <div class="channel-actions">
                ${!channel.working ? '<span class="status-badge"><i class="fas fa-exclamation-triangle"></i></span>' : ''}
                <button class="btn-action-small" onclick="toggleFavorite(${channel.id})">
                    <i class="${favoriteIcon}"></i>
                </button>
                <button class="btn-action-small" onclick="shareChannel(${channel.id})">
                    <i class="fas fa-share-alt"></i>
                </button>
            </div>
        </div>
        <div class="channel-info">
            <h4 title="${cleanedName}">${cleanedName}</h4>
            <p class="channel-category">
                <i class="fas fa-tag"></i> ${cleanCategoryName(channel.category)}
            </p>
            <div class="channel-meta">
                <span class="country-flag">${getCountryFlag(channel.country)}</span>
                <span class="quality-badge ${channel.quality.toLowerCase()}">${channel.quality}</span>
                <span class="viewers"><i class="fas fa-eye"></i> ${formatNumber(channel.viewers)}</span>
                <span class="language-badge">${getLanguageFlag(channel.language)}</span>
            </div>
        </div>
        <button class="play-btn-large ${!channel.working ? 'disabled' : ''}" onclick="${channel.working ? `playChannel(${channel.id})` : 'showNotification(\'Ky kanal nuk punon aktualisht\', \'error\')'}" ${!channel.working ? 'disabled' : ''}>
            <i class="fas fa-play"></i> ${channel.working ? 'PLAY' : 'JO PUNON'}
        </button>
    `;
    return element;
}

// List view element
function createListViewElement(channel, favoriteIcon, cleanedName, workingClass) {
    const element = document.createElement('div');
    element.className = `channel-list-item ${workingClass}`;
    element.innerHTML = `
        <div class="list-logo">
            ${channel.logo ? `<img src="${channel.logo}" alt="${cleanedName}" onerror="this.onerror=null; this.innerHTML='📺'">` : '📺'}
        </div>
        <div class="list-info">
            <h4 title="${cleanedName}">${cleanedName}</h4>
            <div class="list-details">
                <span><i class="fas fa-tag"></i> ${cleanCategoryName(channel.category)}</span>
                <span><i class="fas fa-globe"></i> ${getCountryName(channel.country)}</span>
                <span class="quality-badge ${channel.quality.toLowerCase()}">${channel.quality}</span>
                ${!channel.working ? '<span class="status-text"><i class="fas fa-exclamation-triangle"></i> Jo punon</span>' : ''}
            </div>
        </div>
        <div class="list-actions">
            <span class="viewers"><i class="fas fa-eye"></i> ${formatNumber(channel.viewers)}</span>
            <button class="btn-action-small" onclick="toggleFavorite(${channel.id})">
                <i class="${favoriteIcon}"></i>
            </button>
            <button class="btn-play-small ${!channel.working ? 'disabled' : ''}" onclick="${channel.working ? `playChannel(${channel.id})` : 'showNotification(\'Ky kanal nuk punon aktualisht\', \'error\')'}" ${!channel.working ? 'disabled' : ''}>
                <i class="fas fa-play"></i>
            </button>
        </div>
    `;
    return element;
}

// Compact view element
function createCompactViewElement(channel, favoriteIcon, cleanedName, workingClass) {
    const element = document.createElement('div');
    element.className = `channel-compact ${workingClass}`;
    element.innerHTML = `
        <div class="compact-logo">
            ${channel.logo ? `<img src="${channel.logo}" alt="${cleanedName}" onerror="this.onerror=null; this.innerHTML='📺'">` : '📺'}
        </div>
        <div class="compact-info">
            <h5 title="${cleanedName}">${cleanedName}</h5>
            <span class="compact-quality ${channel.quality.toLowerCase()}">${channel.quality}</span>
        </div>
        <div class="compact-actions">
            ${!channel.working ? '<span class="status-dot"></span>' : ''}
            <button class="btn-action-tiny ${!channel.working ? 'disabled' : ''}" onclick="${channel.working ? `playChannel(${channel.id})` : 'showNotification(\'Ky kanal nuk punon aktualisht\', \'error\')'}" ${!channel.working ? 'disabled' : ''}>
                <i class="fas fa-play"></i>
            </button>
        </div>
    `;
    return element;
}

// Update pagination
function updatePagination() {
    const pageNumbers = document.getElementById('page-numbers');
    if (!pageNumbers) return;
    
    const totalPages = Math.ceil(filteredChannels.length / channelsPerPage);
    
    pageNumbers.innerHTML = '';
    
    // Show limited page numbers
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    // Previous pages indicator
    if (startPage > 1) {
        const span = document.createElement('span');
        span.textContent = '...';
        pageNumbers.appendChild(span);
    }
    
    // Page numbers
    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.className = `page-number ${i === currentPage ? 'active' : ''}`;
        pageBtn.textContent = i;
        pageBtn.onclick = () => goToPage(i);
        pageNumbers.appendChild(pageBtn);
    }
    
    // Next pages indicator
    if (endPage < totalPages) {
        const span = document.createElement('span');
        span.textContent = '...';
        pageNumbers.appendChild(span);
    }
    
    // Update total pages display
    const pageInfo = document.createElement('span');
    pageInfo.className = 'page-info';
    pageInfo.textContent = ` faqe ${currentPage} nga ${totalPages}`;
    pageNumbers.appendChild(pageInfo);
}

// Pagination functions
function goToPage(page) {
    currentPage = page;
    renderChannels();
    const channelsContainer = document.getElementById('channels-container');
    if (channelsContainer) {
        window.scrollTo({ top: channelsContainer.offsetTop - 100, behavior: 'smooth' });
    }
}

function prevPage() {
    if (currentPage > 1) {
        goToPage(currentPage - 1);
    }
}

function nextPage() {
    const totalPages = Math.ceil(filteredChannels.length / channelsPerPage);
    if (currentPage < totalPages) {
        goToPage(currentPage + 1);
    }
}

// Change view mode
function changeView(view) {
    currentView = view;
    
    // Update active button
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.view === view) {
            btn.classList.add('active');
        }
    });
    
    // Update container class
    const channelsContainer = document.getElementById('channels-container');
    if (channelsContainer) {
        channelsContainer.className = `channels-container view-${view}`;
    }
    
    // Re-render channels
    renderChannels();
}

// Filter by category
function filterByCategory(categoryId) {
    if (categoryId === 'all') {
        filteredChannels = [...allChannels];
    } else {
        filteredChannels = allChannels.filter(channel => channel.category === categoryId);
    }
    
    currentPage = 1;
    renderChannels();
    
    // Update active category
    document.querySelectorAll('.category-item').forEach(item => {
        item.classList.remove('active');
    });
    
    const activeCategory = categories.find(c => c.id === categoryId);
    if (activeCategory) {
        const activeItem = [...document.querySelectorAll('.category-item')].find(item => 
            item.querySelector('h4').textContent === cleanCategoryName(activeCategory.name)
        );
        if (activeItem) activeItem.classList.add('active');
    }
}

// Apply advanced filters
function applyFilters() {
    const country = document.getElementById('country-filter')?.value || '';
    const quality = document.getElementById('quality-filter')?.value || '';
    const category = document.getElementById('category-filter')?.value || '';
    const sort = document.getElementById('sort-filter')?.value || 'name';
    const workingOnly = document.getElementById('working-filter')?.checked || false;
    
    filteredChannels = [...allChannels];
    
    // Apply filters
    if (country) {
        filteredChannels = filteredChannels.filter(ch => ch.country === country);
    }
    
    if (quality) {
        filteredChannels = filteredChannels.filter(ch => ch.quality === quality);
    }
    
    if (category) {
        filteredChannels = filteredChannels.filter(ch => ch.category === category);
    }
    
    if (workingOnly) {
        filteredChannels = filteredChannels.filter(ch => ch.working);
    }
    
    // Apply sorting
    switch(sort) {
        case 'name':
            filteredChannels.sort((a, b) => cleanChannelName(a.name).localeCompare(cleanChannelName(b.name)));
            break;
        case 'quality':
            const qualityOrder = { '8K': 5, '4K': 4, 'FHD': 3, 'HD': 2, 'SD': 1 };
            filteredChannels.sort((a, b) => (qualityOrder[b.quality] || 0) - (qualityOrder[a.quality] || 0));
            break;
        case 'popular':
            filteredChannels.sort((a, b) => b.viewers - a.viewers);
            break;
        case 'new':
            filteredChannels.sort((a, b) => b.id - a.id);
            break;
        case 'working':
            filteredChannels.sort((a, b) => b.working - a.working);
            break;
    }
    
    currentPage = 1;
    renderChannels();
    
    showNotification(`U gjetën ${filteredChannels.length} kanale`);
}

// Reset filters
function resetFilters() {
    const countryFilter = document.getElementById('country-filter');
    const qualityFilter = document.getElementById('quality-filter');
    const categoryFilter = document.getElementById('category-filter');
    const sortFilter = document.getElementById('sort-filter');
    const workingFilter = document.getElementById('working-filter');
    
    if (countryFilter) countryFilter.value = '';
    if (qualityFilter) qualityFilter.value = '';
    if (categoryFilter) categoryFilter.value = '';
    if (sortFilter) sortFilter.value = 'name';
    if (workingFilter) workingFilter.checked = false;
    
    filteredChannels = [...allChannels];
    currentPage = 1;
    renderChannels();
    
    showNotification('Filtrat u rivendosën');
}

// Setup search functionality
function setupSearch() {
    const globalSearch = document.getElementById('global-search');
    const searchSuggestions = document.getElementById('search-suggestions');
    
    if (!globalSearch || !searchSuggestions) return;
    
    globalSearch.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase().trim();
        
        if (searchTerm.length === 0) {
            searchSuggestions.innerHTML = '';
            searchSuggestions.classList.remove('active');
            filteredChannels = [...allChannels];
            renderChannels();
            return;
        }
        
        // Filter channels
        filteredChannels = allChannels.filter(channel => 
            cleanChannelName(channel.name).toLowerCase().includes(searchTerm) ||
            cleanCategoryName(channel.category).toLowerCase().includes(searchTerm) ||
            channel.quality.toLowerCase().includes(searchTerm) ||
            getCountryName(channel.country).toLowerCase().includes(searchTerm)
        );
        
        // Update suggestions
        updateSearchSuggestions(searchTerm);
        
        // Render filtered channels
        currentPage = 1;
        renderChannels();
    });
    
    // Close suggestions when clicking outside
    document.addEventListener('click', function(event) {
        if (!searchSuggestions.contains(event.target) && event.target !== globalSearch) {
            searchSuggestions.classList.remove('active');
        }
    });
}

// Update search suggestions
function updateSearchSuggestions(searchTerm) {
    const searchSuggestions = document.getElementById('search-suggestions');
    if (!searchSuggestions) return;
    
    const suggestions = allChannels.filter(channel => 
        cleanChannelName(channel.name).toLowerCase().includes(searchTerm)
    ).slice(0, 5);
    
    if (suggestions.length === 0) {
        searchSuggestions.innerHTML = '<div class="suggestion-item">Nuk u gjet asnjë kanal</div>';
    } else {
        searchSuggestions.innerHTML = suggestions.map(channel => `
            <div class="suggestion-item" onclick="selectSuggestion('${cleanChannelName(channel.name)}')">
                <i class="fas fa-tv"></i>
                <span>${cleanChannelName(channel.name)}</span>
                <small>${cleanCategoryName(channel.category)}</small>
            </div>
        `).join('');
    }
    
    searchSuggestions.classList.add('active');
}

// Select search suggestion
function selectSuggestion(channelName) {
    const globalSearch = document.getElementById('global-search');
    const searchSuggestions = document.getElementById('search-suggestions');
    
    if (globalSearch) {
        globalSearch.value = channelName;
    }
    
    if (searchSuggestions) {
        searchSuggestions.classList.remove('active');
    }
    
    const channel = allChannels.find(ch => cleanChannelName(ch.name) === channelName);
    if (channel) {
        playChannel(channel.id);
    }
}

// Play channel
function playChannel(channelId) {
    const channel = allChannels.find(ch => ch.id === channelId);
    if (!channel) {
        showNotification('Kanal nuk u gjet!', 'error');
        return;
    }
    
    // Check if working
    if (!channel.working) {
        showNotification('Ky kanal nuk punon aktualisht', 'error');
        return;
    }
    
    // Set current channel
    currentChannel = channel;
    
    // Add to history
    addToHistory(channelId);
    
    // Show player modal
    const playerModal = document.getElementById('player-modal');
    if (playerModal) {
        playerModal.classList.add('active');
    }
    
    // Update player title
    const playerTitle = document.getElementById('player-title');
    if (playerTitle) {
        playerTitle.textContent = cleanChannelName(channel.name);
    }
    
    // Initialize or update player
    if (!playerInstance) {
        initializeMainPlayer(channel);
    } else {
        updatePlayer(channel);
    }
    
    // Start playing
    setTimeout(() => {
        const player = videojs.getPlayer('main-player');
        if (player) {
            player.play().catch(e => {
                console.error('Playback error:', e);
                showNotification('Gabim në luajtjen e kanalit. Provoni një kanal tjetër.', 'error');
                
                // Mark as not working
                channel.working = false;
                updateStats();
                renderChannels();
            });
        }
    }, 500);
}

// Initialize main video player
function initializeMainPlayer(channel) {
    const playerElement = document.getElementById('main-player');
    if (!playerElement) return;
    
    playerInstance = videojs(playerElement, {
        controls: true,
        autoplay: true,
        preload: 'auto',
        fluid: true,
        responsive: true,
        playbackRates: [0.5, 1, 1.5, 2],
        sources: [{
            src: channel.url,
            type: 'application/x-mpegURL'
        }],
        html5: {
            vhs: {
                overrideNative: true
            },
            nativeAudioTracks: false,
            nativeVideoTracks: false
        }
    });
    
    // Add HLS support
    if (Hls.isSupported()) {
        const hls = new Hls({
            enableWorker: true,
            lowLatencyMode: true,
            backBufferLength: 90
        });
        
        hls.loadSource(channel.url);
        hls.attachMedia(playerElement);
        hls.on(Hls.Events.MANIFEST_PARSED, function() {
            if (playerInstance) {
                playerInstance.play();
            }
        });
        
        hls.on(Hls.Events.ERROR, function(event, data) {
            if (data.fatal) {
                showNotification('Gabim në transmetim. Kanali mund të mos punojë.', 'error');
                if (channel) {
                    channel.working = false;
                }
                updateStats();
                renderChannels();
            }
        });
    }
    
    // Handle errors
    playerInstance.on('error', function() {
        showNotification('Gabim në transmetim. Provoni të rifreskoni.', 'error');
        if (channel) {
            channel.working = false;
        }
        updateStats();
        renderChannels();
    });
}

// Update player with new channel
function updatePlayer(channel) {
    if (playerInstance && channel) {
        playerInstance.pause();
        playerInstance.src({
            src: channel.url,
            type: 'application/x-mpegURL'
        });
        playerInstance.play();
    }
}

// Initialize floating player
function initializeFloatingPlayer() {
    const floatingVideo = document.getElementById('floating-video');
    if (!floatingVideo) return;
    
    floatingPlayerInstance = videojs(floatingVideo, {
        controls: true,
        autoplay: false,
        preload: 'auto',
        fluid: true,
        responsive: true
    });
}

// Toggle favorite
function toggleFavorite(channelId) {
    const index = favorites.indexOf(channelId);
    
    if (index === -1) {
        favorites.push(channelId);
        showNotification('U shtua te favorite', 'success');
    } else {
        favorites.splice(index, 1);
        showNotification('U hoq nga favorite', 'info');
    }
    
    // Save to localStorage
    localStorage.setItem('iptv_favorites', JSON.stringify(favorites));
    
    // Re-render channels to update heart icons
    renderChannels();
}

// Add to history
function addToHistory(channelId) {
    // Remove if already exists
    const existingIndex = history.indexOf(channelId);
    if (existingIndex !== -1) {
        history.splice(existingIndex, 1);
    }
    
    // Add to beginning
    history.unshift(channelId);
    
    // Keep only last 50 items
    if (history.length > 50) {
        history.pop();
    }
    
    // Save to localStorage
    localStorage.setItem('iptv_history', JSON.stringify(history));
}

// Show favorites
function showFavorites() {
    filteredChannels = allChannels.filter(ch => favorites.includes(ch.id));
    
    if (filteredChannels.length === 0) {
        showNotification('Nuk keni asnjë kanal të preferuar', 'info');
        return;
    }
    
    currentPage = 1;
    renderChannels();
    
    showNotification(`Duke shfaqur ${filteredChannels.length} kanale të preferuara`);
}

// Show history
function showHistory() {
    const historyChannels = history.map(id => allChannels.find(ch => ch.id === id)).filter(Boolean);
    
    if (historyChannels.length === 0) {
        showNotification('Nuk keni asnjë kanal të shikuar së fundmi', 'info');
        return;
    }
    
    filteredChannels = [...historyChannels];
    currentPage = 1;
    renderChannels();
    
    showNotification(`Duke shfaqur ${historyChannels.length} kanale të shikuara së fundmi`);
}

// Share channel
function shareChannel(channelId) {
    const channel = allChannels.find(ch => ch.id === channelId);
    if (!channel) return;
    
    const shareUrl = `${window.location.origin}?channel=${channelId}`;
    const shareText = `Shiko ${cleanChannelName(channel.name)} në SUPER WEB IPTV`;
    
    if (navigator.share) {
        navigator.share({
            title: 'SUPER WEB IPTV',
            text: shareText,
            url: shareUrl
        }).catch(() => {
            // Fallback if share fails
            copyToClipboard(shareUrl);
        });
    } else {
        // Fallback: copy to clipboard
        copyToClipboard(shareUrl);
    }
}

// Copy text to clipboard
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showNotification('Link u kopjua në clipboard!', 'success');
    }).catch(err => {
        console.error('Failed to copy:', err);
        showNotification('Nuk mund të kopjohet linku', 'error');
    });
}

// Test all channels
async function testAllChannels() {
    showNotification('Po testohen të gjitha kanalet... Kjo mund të zgjasë', 'info');
    
    let tested = 0;
    let working = 0;
    const total = allChannels.length;
    
    // Create progress modal
    showTestProgressModal(total);
    
    for (const channel of allChannels) {
        try {
            // Update current testing display
            updateCurrentTesting(channel.name);
            
            // Test channel
            const isWorking = await testChannelStream(channel.url);
            
            channel.working = isWorking;
            channel.isLive = isWorking;
            
            if (isWorking) {
                working++;
            }
            
            tested++;
            
            // Update progress
            updateTestProgress(tested, total, working);
            
            // Update UI periodically
            if (tested % 10 === 0) {
                updateStats();
                renderChannels();
            }
            
        } catch (error) {
            console.error(`Error testing channel ${channel.name}:`, error);
            channel.working = false;
            tested++;
        }
        
        // Delay between tests
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Final update
    updateStats();
    renderChannels();
    closeTestProgressModal();
    
    showNotification(`Testimi përfundoi! ${working}/${total} kanale janë aktive`, 'success');
}

// Test channel stream
async function testChannelStream(url) {
    return new Promise((resolve) => {
        // In a real app, you would make a HEAD request to check if stream is available
        // For demo, simulate based on URL
        const isWorking = Math.random() > 0.3; // 70% success rate for demo
        
        // Simulate network delay
        setTimeout(() => {
            resolve(isWorking);
        }, 50);
    });
}

// Show test progress modal
function showTestProgressModal(total) {
    const modalHTML = `
        <div id="test-progress-modal" class="modal active">
            <div class="modal-content">
                <h2><i class="fas fa-vial"></i> Testimi i Kanaleve</h2>
                <div class="progress-info">
                    <div class="progress-stats">
                        <span>Testuar: <span id="tested-count">0</span>/<span id="total-count">${total}</span></span>
                        <span>Aktive: <span id="working-count">0</span></span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" id="progress-fill"></div>
                    </div>
                    <div class="current-testing" id="current-testing"></div>
                </div>
                <button class="btn-action" onclick="cancelTesting()" style="margin-top: 20px;">
                    <i class="fas fa-stop"></i> Anulo Testimin
                </button>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// Update test progress
function updateTestProgress(tested, total, working) {
    const progressFill = document.getElementById('progress-fill');
    const testedCount = document.getElementById('tested-count');
    const workingCount = document.getElementById('working-count');
    
    if (progressFill && testedCount && workingCount) {
        const percentage = (tested / total) * 100;
        progressFill.style.width = `${percentage}%`;
        testedCount.textContent = tested;
        workingCount.textContent = working;
    }
}

// Update current testing display
function updateCurrentTesting(channelName) {
    const currentTesting = document.getElementById('current-testing');
    if (currentTesting) {
        currentTesting.textContent = `Po testohet: ${cleanChannelName(channelName)}`;
    }
}

// Close test progress modal
function closeTestProgressModal() {
    const modal = document.getElementById('test-progress-modal');
    if (modal) {
        modal.remove();
    }
}

// Cancel testing
function cancelTesting() {
    closeTestProgressModal();
    showNotification('Testimi u anulua', 'warning');
}

// Refresh channels
function refreshChannels() {
    showNotification('Po rifreskohen kanalet...', 'info');
    
    // In a real app, you would fetch new data from server
    // For demo, we'll just shuffle some data
    allChannels.forEach(channel => {
        // Simulate viewer count changes
        channel.viewers += Math.floor(Math.random() * 100) - 50;
        if (channel.viewers < 100) channel.viewers = 100;
        
        // Randomly change working status (for demo)
        if (Math.random() > 0.95) {
            channel.working = !channel.working;
            channel.isLive = channel.working;
        }
    });
    
    updateStats();
    loadLiveChannels();
    renderChannels();
    
    showNotification('Kanale u rifreshuan me sukses!', 'success');
}

// Download M3U playlist
function downloadM3U() {
    const m3uContent = generateM3UContent();
    const blob = new Blob([m3uContent], { type: 'application/x-mpegurl' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'super-web-iptv.m3u';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showNotification('Playlist u shkarkua me sukses!', 'success');
}

// Generate M3U content
function generateM3UContent() {
    let m3u = '#EXTM3U\n';
    m3u += '# Generated by SUPER WEB IPTV\n';
    m3u += `# Date: ${new Date().toISOString()}\n`;
    m3u += `# Total channels: ${allChannels.length}\n\n`;
    
    allChannels.forEach(channel => {
        if (!channel.working) return;
        
        const tvgName = cleanChannelName(channel.name).replace(/[^\x00-\x7F]/g, "");
        const groupTitle = cleanCategoryName(channel.category);
        
        m3u += `#EXTINF:-1 tvg-id="${channel.id}" tvg-name="${tvgName}" tvg-logo="${channel.logo}" group-title="${groupTitle}",${cleanChannelName(channel.name)}\n`;
        m3u += `${channel.url}\n`;
    });
    
    return m3u;
}

// Export channels data
function exportChannels(format = 'json') {
    if (format === 'json') {
        const dataStr = JSON.stringify(appData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        downloadBlob(dataBlob, 'channels-export.json');
    } else if (format === 'm3u') {
        downloadM3U();
    } else if (format === 'csv') {
        exportToCSV();
    }
}

// Export to CSV
function exportToCSV() {
    let csv = 'ID,Name,Category,Country,Quality,URL,Viewers,Working,Language,IsLive\n';
    
    allChannels.forEach(channel => {
        const row = [
            channel.id,
            `"${channel.name}"`,
            channel.category,
            channel.country,
            channel.quality,
            `"${channel.url}"`,
            channel.viewers,
            channel.working,
            channel.language,
            channel.isLive
        ].join(',');
        
        csv += row + '\n';
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    downloadBlob(blob, 'channels-export.csv');
}

// Download blob helper
function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Save settings
function saveSettings() {
    const autoPlay = document.getElementById('auto-play')?.checked || false;
    const defaultQuality = document.getElementById('quality-default')?.value || 'auto';
    const bufferSize = document.getElementById('buffer-size')?.value || '20';
    const parentalPassword = document.getElementById('parental-password')?.value || '';
    
    const settings = {
        autoPlay,
        defaultQuality,
        bufferSize,
        parentalPassword
    };
    
    localStorage.setItem('iptv_settings', JSON.stringify(settings));
    showNotification('Cilësimet u ruajtën', 'success');
    closeSettingsModal();
}

// Load settings
function loadSettings() {
    const savedSettings = localStorage.getItem('iptv_settings');
    if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        
        const autoPlay = document.getElementById('auto-play');
        const qualityDefault = document.getElementById('quality-default');
        const bufferSize = document.getElementById('buffer-size');
        const parentalPassword = document.getElementById('parental-password');
        
        if (autoPlay) autoPlay.checked = settings.autoPlay;
        if (qualityDefault) qualityDefault.value = settings.defaultQuality;
        if (bufferSize) bufferSize.value = settings.bufferSize;
        if (parentalPassword && settings.parentalPassword) {
            parentalPassword.value = settings.parentalPassword;
        }
    }
}

// Update country filter options
function updateCountryFilter() {
    const countryFilter = document.getElementById('country-filter');
    if (!countryFilter) return;
    
    // Clear existing options except the first one
    while (countryFilter.options.length > 1) {
        countryFilter.remove(1);
    }
    
    // Add countries from JSON data
    Object.entries(countries).forEach(([code, name]) => {
        const option = document.createElement('option');
        option.value = code;
        option.textContent = `${getCountryFlag(code)} ${name}`;
        countryFilter.appendChild(option);
    });
}

// Update category filter options
function updateCategoryFilter() {
    const categoryFilter = document.getElementById('category-filter');
    if (!categoryFilter) return;
    
    // Clear existing options except the first one
    while (categoryFilter.options.length > 1) {
        categoryFilter.remove(1);
    }
    
    // Add categories from JSON data (excluding "all")
    categories.filter(cat => cat.id !== 'all').forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = cleanCategoryName(category.name);
        categoryFilter.appendChild(option);
    });
}

// Add working filter to advanced filters
function addWorkingFilter() {
    const filterGroup = document.querySelector('.filter-group');
    if (!filterGroup) return;
    
    // Check if already exists
    if (!document.getElementById('working-filter')) {
        const workingFilterHTML = `
            <div class="filter-checkbox">
                <input type="checkbox" id="working-filter" onchange="applyFilters()">
                <label for="working-filter">Vetëm kanalet që punojnë</label>
            </div>
        `;
        
        filterGroup.insertAdjacentHTML('beforeend', workingFilterHTML);
    }
}

// Utility functions
function getCountryName(countryCode) {
    return countries[countryCode] || countryCode;
}

function getCountryFlag(countryCode) {
    const flags = {
        'AL': '🇦🇱',
        'XK': '🇽🇰',
        'MK': '🇲🇰',
        'IT': '🇮🇹',
        'GR': '🇬🇷',
        'US': '🇺🇸',
        'UK': '🇬🇧',
        'DE': '🇩🇪',
        'FR': '🇫🇷',
        'ES': '🇪🇸',
        'TR': '🇹🇷',
        'RU': '🇷🇺',
        'CN': '🇨🇳',
        'JP': '🇯🇵',
        'IN': '🇮🇳',
        'BR': '🇧🇷',
        'CA': '🇨🇦',
        'AU': '🇦🇺'
    };
    return flags[countryCode] || '🌐';
}

function getLanguageFlag(languageCode) {
    const languageFlags = {
        'sq': '🇦🇱',
        'en': '🇬🇧',
        'mk': '🇲🇰',
        'it': '🇮🇹',
        'el': '🇬🇷',
        'de': '🇩🇪',
        'fr': '🇫🇷',
        'es': '🇪🇸',
        'tr': '🇹🇷',
        'ru': '🇷🇺',
        'ar': '🇸🇦',
        'zh': '🇨🇳',
        'ja': '🇯🇵',
        'hi': '🇮🇳'
    };
    return languageFlags[languageCode] || '🌐';
}

// Show notification (wrapper for global function)
function showNotification(message, type = 'info') {
    if (typeof window.showNotification === 'function') {
        window.showNotification(message, type);
    } else {
        console.log(`[${type.toUpperCase()}] ${message}`);
        // Fallback alert
        alert(message);
    }
}

// Setup event listeners
function setupEventListeners() {
    setupSearch();
    
    // Filter change listeners
    const countryFilter = document.getElementById('country-filter');
    const qualityFilter = document.getElementById('quality-filter');
    const categoryFilter = document.getElementById('category-filter');
    const sortFilter = document.getElementById('sort-filter');
    
    if (countryFilter) countryFilter.addEventListener('change', applyFilters);
    if (qualityFilter) qualityFilter.addEventListener('change', applyFilters);
    if (categoryFilter) categoryFilter.addEventListener('change', applyFilters);
    if (sortFilter) sortFilter.addEventListener('change', applyFilters);
    
    // Load saved settings
    loadSettings();
    
    // Update filters with JSON data
    updateCountryFilter();
    updateCategoryFilter();
    addWorkingFilter();
    
    // Online/offline events
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    
    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // Ctrl+T to test all channels
        if (e.ctrlKey && e.key === 't') {
            e.preventDefault();
            testAllChannels();
        }
        
        // Ctrl+D to download M3U
        if (e.ctrlKey && e.key === 'd') {
            e.preventDefault();
            downloadM3U();
        }
        
        // Ctrl+F to focus search
        if (e.ctrlKey && e.key === 'f') {
            e.preventDefault();
            const globalSearch = document.getElementById('global-search');
            if (globalSearch) {
                globalSearch.focus();
            }
        }
        
        // Space to play/pause
        if (e.code === 'Space' && !e.target.matches('input, textarea')) {
            e.preventDefault();
            if (playerInstance) {
                if (playerInstance.paused()) {
                    playerInstance.play();
                } else {
                    playerInstance.pause();
                }
            }
        }
        
        // Escape to close modals
        if (e.code === 'Escape') {
            document.querySelectorAll('.modal.active').forEach(modal => {
                modal.classList.remove('active');
            });
        }
        
        // F for fullscreen
        if (e.code === 'KeyF' && !e.target.matches('input, textarea')) {
            if (playerInstance && playerInstance.isFullscreen) {
                playerInstance.exitFullscreen();
            } else if (playerInstance) {
                playerInstance.requestFullscreen();
            }
        }
    });
}

// Initialize video players
function initializeVideoPlayers() {
    // Main player will be initialized when needed
    // Initialize floating player
    initializeFloatingPlayer();
}

// Make functions available globally
window.initApp = initApp;
window.playChannel = playChannel;
window.toggleFavorite = toggleFavorite;
window.shareChannel = shareChannel;
window.testAllChannels = testAllChannels;
window.downloadPlaylist = downloadM3U;
window.showFavorites = showFavorites;
window.showHistory = showHistory;
window.refreshChannels = refreshChannels;
window.applyFilters = applyFilters;
window.resetFilters = resetFilters;
window.changeView = changeView;
window.prevPage = prevPage;
window.nextPage = nextPage;
window.selectSuggestion = selectSuggestion;
window.exportChannels = exportChannels;
window.refreshFromServer = refreshChannels;
window.loadChannelsData = loadChannelsData;
window.cancelTesting = cancelTesting;
window.downloadM3U = downloadM3U;
window.testAllChannels = testAllChannels;
window.showPlayer = showPlayer;
window.showSettings = showSettings;
window.showPremiumModal = showPremiumModal;
window.closeFloatingPlayer = closeFloatingPlayer;
window.scrollToTop = scrollToTop;
window.closePremiumModal = closePremiumModal;
window.closeSettingsModal = closeSettingsModal;
window.closePlayerModal = closePlayerModal;
window.saveSettings = saveSettings;
window.selectPlan = selectPlan;

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initApp,
        playChannel,
        toggleFavorite,
        testAllChannels,
        cleanChannelName,
        cleanCategoryName,
        getCountryName,
        getCountryFlag
    };
}

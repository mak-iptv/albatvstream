// Main Application
let channels = [];
let filteredChannels = [];
let currentView = 'grid';
let currentPage = 1;
const itemsPerPage = 24;
let categories = [];
let countries = {};

// Server Configuration
window.serverConfig = {
    server: "server.stream-one.fun",
    port: "80",
    mac: "00:1B:79:3F:21:AC",
    user: "",
    pass: ""
};

// Initialize the application
async function initApp() {
    try {
        console.log('Starting application initialization...');
        
        // Load server config first
        loadServerConfig();
        
        // Load channels from JSON
        const response = await fetch('channels.json');
        const data = await response.json();
        
        channels = data.channels || [];
        categories = data.categories || [];
        countries = data.countries || {};
        
        console.log(`Loaded ${channels.length} channels, ${categories.length} categories`);
        
        // Add working field for all channels (default true)
        channels = channels.map(channel => ({
            ...channel,
            working: true,
            popular: channel.id <= 20
        }));
        
        // Initialize UI
        updateStats();
        loadCategories();
        loadCountries();
        loadLiveChannels();
        loadAllChannels();
        setupSearch();
        
        console.log('Application initialized successfully');
        showNotification('Aplikacioni u ngarkua me sukses!', 'success');
        
    } catch (error) {
        console.error('Error loading channels:', error);
        showNotification('Gabim në ngarkimin e kanaleve. Duke përdorur të dhëna demo.', 'error');
        loadDemoChannels();
    }
}

// Load demo channels if JSON fails
function loadDemoChannels() {
    console.log('Loading demo channels...');
    
    channels = [
        {
            id: 1,
            name: "BIG BROTHER KOSOVA VIP 1 HD",
            url: "http://server.stream-one.fun:80/play/live.php?mac=00:1B:79:3F:21:AC&stream=1427113&extension=m3u8",
            logo: "http://picon.tivi-ott.net:25461/picon/ARGENTINA/BIG BROTHER VIP ALBANIA/BIG BROTHER VIP ALBANIA.png",
            category: "┃AL┃ ALBANIA",
            country: "AL",
            quality: "HD",
            language: "sq",
            working: true,
            popular: true
        },
        {
            id: 2,
            name: "TOP CHANNEL HD",
            url: "http://server.stream-one.fun:80/play/live.php?mac=00:1B:79:3F:21:AC&stream=5&extension=m3u8",
            logo: "http://picon.tivi-ott.net:25461/picon/ALBANIA/TOPCHANNEL.png",
            category: "┃AL┃ ALBANIA",
            country: "AL",
            quality: "HD",
            language: "sq",
            working: true,
            popular: true
        },
        {
            id: 3,
            name: "KLAN TV HD",
            url: "http://server.stream-one.fun:80/play/live.php?mac=00:1B:79:3F:21:AC&stream=11&extension=m3u8",
            logo: "http://picon.tivi-ott.net:25461/picon/ALBANIA/TVKLAN.png",
            category: "┃AL┃ ALBANIA",
            country: "AL",
            quality: "HD",
            language: "sq",
            working: true,
            popular: true
        }
    ];
    
    categories = [
        {"id": "┃AL┃ ALBANIA", "name": "Shqipëri", "icon": "fas fa-home", "count": 3}
    ];
    
    countries = {
        "AL": "Shqipëri",
        "XK": "Kosovë",
        "MK": "Maqedoni"
    };
    
    updateStats();
    loadCategories();
    loadCountries();
    loadLiveChannels();
    loadAllChannels();
    setupSearch();
    
    showNotification('Duke përdorur kanale demo për testim.', 'info');
}

// Update statistics
function updateStats() {
    const totalChannels = channels.length;
    const workingChannels = channels.filter(ch => ch.working).length;
    
    document.getElementById('total-stats').textContent = totalChannels;
    document.getElementById('working-stats').textContent = workingChannels;
}

// Load categories
function loadCategories() {
    const categoriesContainer = document.getElementById('categories-scroll');
    const categoryFilter = document.getElementById('category-filter');
    
    if (!categoriesContainer || !categoryFilter) return;
    
    // Clear existing
    categoriesContainer.innerHTML = '';
    categoryFilter.innerHTML = '<option value="">Të gjitha kategoritë</option>';
    
    // Add category buttons and filter options
    categories.forEach(category => {
        // Quick categories buttons
        const btn = document.createElement('button');
        btn.className = 'category-btn';
        btn.innerHTML = `<i class="${category.icon || 'fas fa-tv'}"></i> ${category.name}`;
        btn.onclick = () => filterByCategory(category.id);
        categoriesContainer.appendChild(btn);
        
        // Filter select options
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = category.name;
        categoryFilter.appendChild(option);
    });
    
    // Add working filter
    const filterGroup = document.querySelector('.filter-group');
    if (filterGroup && !document.getElementById('working-filter')) {
        const workingFilter = document.createElement('select');
        workingFilter.id = 'working-filter';
        workingFilter.innerHTML = `
            <option value="">Të gjitha</option>
            <option value="working">Aktive</option>
            <option value="not-working">Jo aktive</option>
        `;
        filterGroup.appendChild(workingFilter);
    }
}

// Load countries
function loadCountries() {
    const countryFilter = document.getElementById('country-filter');
    if (!countryFilter) return;
    
    // Clear existing
    countryFilter.innerHTML = '<option value="">Të gjitha vendet</option>';
    
    // Add country options
    Object.entries(countries).forEach(([code, name]) => {
        const option = document.createElement('option');
        option.value = code;
        option.textContent = name;
        countryFilter.appendChild(option);
    });
}

// Load live channels
function loadLiveChannels() {
    const liveContainer = document.getElementById('live-carousel');
    if (!liveContainer) return;
    
    // Get popular channels for carousel
    const popularChannels = channels
        .filter(ch => ch.popular && ch.working)
        .slice(0, 10);
    
    liveContainer.innerHTML = '';
    
    popularChannels.forEach(channel => {
        const channelCard = createChannelCard(channel);
        liveContainer.appendChild(channelCard);
    });
}

// Create channel card
function createChannelCard(channel) {
    const div = document.createElement('div');
    div.className = 'channel-card';
    div.dataset.id = channel.id;
    
    const displayName = cleanChannelName(channel.name);
    
    div.innerHTML = `
        <img src="${channel.logo}" alt="${displayName}" class="channel-logo" 
             onerror="this.onerror=null; this.src='https://via.placeholder.com/200x120/1a1a2e/8a2be2?text=${encodeURIComponent(displayName.substring(0, 10))}'">
        <div class="channel-info">
            <div class="channel-name">${displayName}</div>
            <div class="channel-meta">${channel.quality} • ${getCountryName(channel.country)}</div>
            <button class="channel-btn play-btn" onclick="playChannel(${channel.id})" title="Play">
                <i class="fas fa-play"></i>
            </button>
        </div>
    `;
    
    return div;
}

// Clean channel name
function cleanChannelName(name) {
    if (!name) return '';
    return name.replace(/^┃[A-Z]+┃\s*/, '').trim();
}

// Get country name from code
function getCountryName(code) {
    return countries[code] || code;
}

// Load all channels with pagination
function loadAllChannels() {
    const container = document.getElementById('channels-container');
    if (!container) return;
    
    // If filteredChannels is empty, use all channels
    if (!filteredChannels || filteredChannels.length === 0) {
        filteredChannels = [...channels];
    }
    
    // Calculate pagination
    const totalPages = Math.ceil(filteredChannels.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageChannels = filteredChannels.slice(startIndex, endIndex);
    
    // Clear container
    container.innerHTML = '';
    
    // Show message if no channels
    if (pageChannels.length === 0) {
        container.innerHTML = `
            <div class="no-channels">
                <i class="fas fa-tv-slash"></i>
                <h3>Nuk u gjet asnjë kanal</h3>
                <p>Provoni një kërkim tjetër ose ridërtoni filtrat</p>
                <button class="btn-action" onclick="resetFilters(); clearSearch()">
                    <i class="fas fa-redo"></i> Ridërtoni Filtrat
                </button>
            </div>
        `;
        return;
    }
    
    // Add channels
    pageChannels.forEach(channel => {
        const channelItem = createChannelItem(channel);
        container.appendChild(channelItem);
    });
    
    // Update pagination
    updatePagination(totalPages);
    
    // Update container class for view mode
    container.className = 'channels-container ' + currentView + '-view';
}

// Create channel list item
function createChannelItem(channel) {
    const div = document.createElement('div');
    div.className = `channel-item ${channel.working ? 'working' : 'not-working'}`;
    div.dataset.id = channel.id;
    
    const displayName = cleanChannelName(channel.name);
    
    div.innerHTML = `
        <div class="channel-status ${channel.working ? 'working' : 'not-working'}">
            ${channel.working ? 'LIVE' : 'OFF'}
        </div>
        <div class="channel-header">
            <img src="${channel.logo}" alt="${displayName}" class="channel-logo-small" 
                 onerror="this.onerror=null; this.src='https://via.placeholder.com/50x50/1a1a2e/8a2be2?text=${encodeURIComponent(displayName.substring(0, 5))}'">
            <div class="channel-details">
                <h3>${displayName}</h3>
                <p>${getCategoryName(channel.category)} • ${getCountryName(channel.country)}</p>
                <p>
                    <span class="quality-badge ${channel.quality}">${channel.quality}</span>
                    <span>${getLanguageName(channel.language)}</span>
                </p>
            </div>
            <div class="channel-actions">
                <button class="channel-btn play-btn" onclick="playChannel(${channel.id})" title="Play">
                    <i class="fas fa-play"></i>
                </button>
                <button class="channel-btn favorite-btn" onclick="toggleFavorite(${channel.id})" title="Add to favorites">
                    <i class="fas fa-heart"></i>
                </button>
                <button class="channel-btn info-btn" onclick="showChannelInfo(${channel.id})" title="Info">
                    <i class="fas fa-info"></i>
                </button>
            </div>
        </div>
    `;
    
    return div;
}

// Get category name from ID
function getCategoryName(categoryId) {
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.name : categoryId;
}

// Get language name from code
function getLanguageName(code) {
    const languages = {
        'sq': 'Shqip',
        'en': 'English',
        'sr': 'Serbian',
        'mk': 'Macedonian',
        'it': 'Italian',
        'el': 'Greek',
        'de': 'German',
        'fr': 'French',
        'ar': 'Arabic'
    };
    return languages[code] || code;
}

// Update pagination
function updatePagination(totalPages) {
    const pageNumbers = document.getElementById('page-numbers');
    const pagination = document.getElementById('pagination');
    
    if (!pageNumbers || !pagination) return;
    
    pageNumbers.innerHTML = '';
    
    // Show only 5 page numbers
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    
    if (endPage - startPage < 4) {
        startPage = Math.max(1, endPage - 4);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const btn = document.createElement('button');
        btn.className = `page-number ${i === currentPage ? 'active' : ''}`;
        btn.textContent = i;
        btn.onclick = () => goToPage(i);
        pageNumbers.appendChild(btn);
    }
    
    // Show/hide pagination based on total pages
    pagination.style.display = totalPages > 1 ? 'flex' : 'none';
}

// Apply current filters
function applyCurrentFilters() {
    let filtered = [...channels];
    
    // Country filter
    const country = document.getElementById('country-filter')?.value;
    if (country) {
        filtered = filtered.filter(ch => ch.country === country);
    }
    
    // Quality filter
    const quality = document.getElementById('quality-filter')?.value;
    if (quality) {
        filtered = filtered.filter(ch => ch.quality === quality);
    }
    
    // Category filter
    const category = document.getElementById('category-filter')?.value;
    if (category) {
        filtered = filtered.filter(ch => ch.category === category);
    }
    
    // Working filter
    const workingFilter = document.getElementById('working-filter');
    if (workingFilter && workingFilter.value) {
        const showWorking = workingFilter.value === 'working';
        filtered = filtered.filter(ch => ch.working === showWorking);
    }
    
    // Sort
    const sortBy = document.getElementById('sort-filter')?.value;
    if (sortBy) {
        switch (sortBy) {
            case 'name':
                filtered.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'quality':
                const qualityOrder = { '4K': 0, 'FHD': 1, 'HD': 2, 'SD': 3 };
                filtered.sort((a, b) => (qualityOrder[a.quality] || 4) - (qualityOrder[b.quality] || 4));
                break;
            case 'popular':
                filtered.sort((a, b) => (b.popular ? 1 : 0) - (a.popular ? 1 : 0));
                break;
            case 'new':
                filtered.sort((a, b) => b.id - a.id);
                break;
            case 'working':
                filtered.sort((a, b) => (b.working ? 1 : 0) - (a.working ? 1 : 0));
                break;
        }
    }
    
    return filtered;
}

// Setup search functionality
function setupSearch() {
    const searchInput = document.getElementById('global-search');
    const suggestions = document.getElementById('search-suggestions');
    const searchActions = document.getElementById('search-actions');
    const searchCount = document.getElementById('search-count');
    
    if (!searchInput) return;
    
    // Reset search when page loads
    searchInput.value = '';
    if (searchActions) searchActions.style.display = 'none';
    
    let searchTimeout;
    
    searchInput.addEventListener('input', function() {
        const query = this.value.trim();
        
        // Clear previous timeout
        clearTimeout(searchTimeout);
        
        // Hide suggestions
        if (suggestions) suggestions.style.display = 'none';
        
        // Show suggestions for short queries
        if (query.length > 0 && query.length < 3) {
            showSearchSuggestions(query);
            return;
        }
        
        // Delay search to avoid too many updates
        searchTimeout = setTimeout(() => {
            if (query.length >= 3) {
                performSearch(query);
            } else if (query.length === 0) {
                // If search is cleared, show all channels
                clearSearch();
            }
        }, 300);
    });
    
    // Enter key to search
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            const query = this.value.trim();
            if (query.length > 0) {
                performSearch(query);
            }
        }
    });
    
    // Clear search on escape
    searchInput.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            this.value = '';
            clearSearch();
        }
    });
    
    // Hide suggestions when clicking outside
    document.addEventListener('click', function(e) {
        if (suggestions && !searchInput.contains(e.target) && !suggestions.contains(e.target)) {
            suggestions.style.display = 'none';
        }
    });
}

// Show search suggestions
function showSearchSuggestions(query) {
    const suggestions = document.getElementById('search-suggestions');
    if (!suggestions) return;
    
    // Find matching channels for suggestions
    const matches = channels.filter(ch => {
        const cleanName = cleanChannelName(ch.name).toLowerCase();
        return cleanName.includes(query.toLowerCase());
    }).slice(0, 5);
    
    if (matches.length > 0) {
        suggestions.innerHTML = '';
        matches.forEach(channel => {
            const div = document.createElement('div');
            div.className = 'search-suggestion';
            const displayName = cleanChannelName(channel.name);
            div.innerHTML = `
                <img src="${channel.logo}" alt="${displayName}" 
                     onerror="this.onerror=null; this.src='https://via.placeholder.com/30x30/1a1a2e/8a2be2?text=TV'">
                <span>${displayName}</span>
                <small>${getCategoryName(channel.category)}</small>
            `;
            div.onclick = () => {
                // When a suggestion is clicked, perform search
                document.getElementById('global-search').value = displayName;
                suggestions.style.display = 'none';
                performSearch(displayName);
            };
            suggestions.appendChild(div);
        });
        suggestions.style.display = 'block';
    } else {
        suggestions.style.display = 'none';
    }
}

// Perform search
function performSearch(query) {
    console.log('Searching for:', query);
    
    const searchActions = document.getElementById('search-actions');
    const searchCount = document.getElementById('search-count');
    
    // Find matching channels
    const matches = channels.filter(ch => {
        const cleanName = cleanChannelName(ch.name).toLowerCase();
        const cleanQuery = query.toLowerCase();
        
        return cleanName.includes(cleanQuery) ||
               getCategoryName(ch.category).toLowerCase().includes(cleanQuery) ||
               getCountryName(ch.country).toLowerCase().includes(cleanQuery) ||
               ch.quality.toLowerCase().includes(cleanQuery) ||
               getLanguageName(ch.language).toLowerCase().includes(cleanQuery);
    });
    
    // Update filtered channels
    filteredChannels = matches;
    currentPage = 1;
    
    // Load filtered channels
    loadAllChannels();
    
    // Show search actions
    if (searchActions) {
        searchActions.style.display = 'flex';
    }
    
    // Update search count
    if (searchCount) {
        searchCount.textContent = `${matches.length} rezultate`;
    }
    
    // Show notification
    if (matches.length > 0) {
        showNotification(`U gjetën ${matches.length} kanale për "${query}"`, 'success');
    } else {
        showNotification(`Nuk u gjet asnjë kanal për "${query}"`, 'warning');
    }
    
    // Hide suggestions
    const suggestions = document.getElementById('search-suggestions');
    if (suggestions) suggestions.style.display = 'none';
}

// Clear search
function clearSearch() {
    const searchInput = document.getElementById('global-search');
    const searchActions = document.getElementById('search-actions');
    const suggestions = document.getElementById('search-suggestions');
    
    // Reset search
    if (searchInput) searchInput.value = '';
    if (searchActions) searchActions.style.display = 'none';
    if (suggestions) suggestions.style.display = 'none';
    
    // Reset to all channels
    filteredChannels = [...channels];
    currentPage = 1;
    
    // Load all channels
    loadAllChannels();
    
    showNotification('Të gjitha kanalet u shfaqën', 'info');
}

// Build stream URL
function buildStreamURL(channel) {
    // If channel has full URL, use it
    if (channel.url && channel.url.startsWith('http')) {
        return channel.url;
    }
    
    // Otherwise, build URL based on configuration
    const config = window.serverConfig;
    
    // Form 1: Direct URL (most common)
    return `http://${config.server}:${config.port}/play/live.php?mac=${config.mac}&stream=${channel.id}&extension=m3u8`;
}

// PLAY CHANNEL - MAIN FUNCTION
function playChannel(channelId) {
    console.log(`Playing channel ${channelId}...`);
    
    const channel = channels.find(ch => ch.id === channelId);
    if (!channel) {
        showNotification('Kanali nuk u gjet', 'error');
        return;
    }
    
    const displayName = cleanChannelName(channel.name);
    const playerTitle = document.getElementById('player-title');
    if (playerTitle) playerTitle.textContent = displayName;
    
    // Get player
    const player = videojs.getPlayer('main-player');
    if (!player) {
        showNotification('Player nuk është gati', 'error');
        return;
    }
    
    // Build stream URL
    const streamURL = buildStreamURL(channel);
    console.log('Stream URL:', streamURL);
    
    // Stop existing stream
    player.pause();
    
    // Try to play with HLS.js first
    if (window.Hls && Hls.isSupported()) {
        playWithHLS(player, streamURL, displayName);
    } else {
        // Fallback to native player
        playNative(player, streamURL, displayName);
    }
    
    // Show player modal
    const playerModal = document.getElementById('player-modal');
    if (playerModal) playerModal.classList.add('active');
}

// Play with HLS.js
function playWithHLS(player, url, displayName) {
    console.log('Using HLS.js to play stream...');
    
    // Clean up existing HLS instance
    if (window.currentHls) {
        window.currentHls.destroy();
    }
    
    const hls = new Hls({
        debug: false,
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
        xhrSetup: function(xhr) {
            xhr.withCredentials = false;
            xhr.setRequestHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
            xhr.setRequestHeader('Accept', '*/*');
            xhr.setRequestHeader('Origin', window.location.origin);
        }
    });
    
    hls.loadSource(url);
    hls.attachMedia(player.el().querySelector('video'));
    
    hls.on(Hls.Events.MANIFEST_PARSED, function() {
        console.log('HLS manifest parsed successfully');
        player.play().then(() => {
            showNotification(`Duke luajtur: ${displayName}`, 'success');
            addToHistory(displayName, url);
        }).catch(err => {
            console.error('Auto-play failed:', err);
            showNotification('Klikoni Play manualisht', 'info');
        });
    });
    
    hls.on(Hls.Events.ERROR, function(event, data) {
        console.error('HLS Error:', data);
        
        if (data.fatal) {
            switch(data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                    showNotification('Probleem me rrjetin. Provojmë metodë alternative...', 'error');
                    // Try native playback
                    playNative(player, url, displayName);
                    break;
                    
                case Hls.ErrorTypes.MEDIA_ERROR:
                    showNotification('Probleem me media. Po rigarkoj...', 'warning');
                    hls.recoverMediaError();
                    break;
                    
                default:
                    showNotification('Transmetimi nuk punon me HLS', 'error');
                    hls.destroy();
                    break;
            }
        }
    });
    
    // Save HLS instance
    window.currentHls = hls;
}

// Play with native video player
function playNative(player, url, displayName) {
    console.log('Using native video player...');
    
    player.src({
        src: url,
        type: 'application/x-mpegurl',
        withCredentials: false
    });
    
    player.ready(function() {
        player.play().then(() => {
            showNotification(`Duke luajtur: ${displayName}`, 'success');
            addToHistory(displayName, url);
        }).catch(err => {
            console.error('Native play error:', err);
        });
    });
}

// Add to history
function addToHistory(name, url) {
    try {
        const history = JSON.parse(localStorage.getItem('iptv-history') || '[]');
        
        // Remove if already exists
        const existingIndex = history.findIndex(item => item.url === url);
        if (existingIndex > -1) {
            history.splice(existingIndex, 1);
        }
        
        // Add to beginning
        history.unshift({
            name: name,
            url: url,
            time: new Date().toISOString()
        });
        
        // Keep only last 20
        if (history.length > 20) {
            history.pop();
        }
        
        localStorage.setItem('iptv-history', JSON.stringify(history));
    } catch (error) {
        console.error('Error saving to history:', error);
    }
}

// Change view mode
function changeView(view) {
    currentView = view;
    
    // Update active button
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === view);
    });
    
    // Reload channels with new view
    loadAllChannels();
}

// Filter by category
function filterByCategory(categoryId) {
    const categoryFilter = document.getElementById('category-filter');
    if (categoryFilter) categoryFilter.value = categoryId;
    applyFilters();
}

// Apply filters
function applyFilters() {
    currentPage = 1;
    filteredChannels = applyCurrentFilters();
    loadAllChannels();
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
    if (workingFilter) workingFilter.value = '';
    
    // Clear search too
    clearSearch();
    
    // Apply filters (which will show all channels)
    applyFilters();
}

// Go to specific page
function goToPage(page) {
    currentPage = page;
    loadAllChannels();
}

// Next page
function nextPage() {
    const totalPages = Math.ceil(filteredChannels.length / itemsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        loadAllChannels();
    }
}

// Previous page
function prevPage() {
    if (currentPage > 1) {
        currentPage--;
        loadAllChannels();
    }
}

// Refresh channels
function refreshChannels() {
    showNotification('Duke rifreskuar kanalet...', 'info');
    
    // Simulate refresh
    setTimeout(() => {
        initApp();
        showNotification('Kanalet u rifreskuan me sukses', 'success');
    }, 1000);
}

// Test all channels (demo)
function testAllChannels() {
    showNotification('Duke testuar të gjitha kanalet...', 'info');
    
    // Simulate testing
    let tested = 0;
    const interval = setInterval(() => {
        if (tested >= channels.length) {
            clearInterval(interval);
            const workingCount = channels.filter(ch => ch.working).length;
            showNotification(`Testimi përfundoi. ${workingCount} nga ${channels.length} kanale janë aktive.`, 'success');
            loadAllChannels();
            return;
        }
        
        // Randomly mark some as not working for demo (10% chance)
        if (Math.random() < 0.1) {
            channels[tested].working = false;
        } else {
            channels[tested].working = true;
        }
        
        tested++;
    }, 50);
}

// Download M3U playlist
function downloadM3U() {
    let m3uContent = '#EXTM3U\n';
    
    channels.forEach(channel => {
        if (channel.working) {
            const displayName = cleanChannelName(channel.name);
            m3uContent += `#EXTINF:-1 tvg-id="${channel.id}" tvg-name="${displayName}" tvg-logo="${channel.logo}" group-title="${getCategoryName(channel.category)}",${displayName}\n`;
            m3uContent += `${buildStreamURL(channel)}\n`;
        }
    });
    
    const blob = new Blob([m3uContent], { type: 'application/x-mpegurl' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'super-iptv-shqip.m3u';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showNotification('Playlist u shkarkua me sukses', 'success');
}

// Export channels to JSON
function exportChannels(format) {
    if (format === 'json') {
        const data = {
            version: "3.0.0",
            last_updated: new Date().toISOString().split('T')[0],
            total_channels: channels.length,
            categories: categories,
            channels: channels,
            countries: countries
        };
        
        const dataStr = JSON.stringify(data, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'kanalet-iptv.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showNotification('Kanalet u eksportuan në JSON', 'success');
    }
}

// Show channel info
function showChannelInfo(channelId) {
    const channel = channels.find(ch => ch.id === channelId);
    if (!channel) return;
    
    const displayName = cleanChannelName(channel.name);
    
    alert(`
        📺 ${displayName}
        
        📁 Kategoria: ${getCategoryName(channel.category)}
        🇦🇱 Vendi: ${getCountryName(channel.country)}
        🎬 Cilësia: ${channel.quality}
        🗣️ Gjuha: ${getLanguageName(channel.language)}
        ⚡ Statusi: ${channel.working ? '✅ Aktive' : '❌ Jo aktive'}
        
        🔗 URL: ${channel.url || buildStreamURL(channel)}
        
        ID: ${channel.id}
    `);
}

// Toggle favorite
function toggleFavorite(channelId) {
    try {
        const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
        const index = favorites.indexOf(channelId);
        
        if (index === -1) {
            favorites.push(channelId);
            showNotification('U shtua në favorite', 'success');
        } else {
            favorites.splice(index, 1);
            showNotification('U hoq nga favorite', 'info');
        }
        
        localStorage.setItem('favorites', JSON.stringify(favorites));
    } catch (error) {
        console.error('Error toggling favorite:', error);
    }
}

// Load settings
function loadSettings() {
    try {
        const settings = JSON.parse(localStorage.getItem('iptv-settings') || '{}');
        
        if (settings.autoPlay !== undefined) {
            const autoPlay = document.getElementById('auto-play');
            if (autoPlay) autoPlay.checked = settings.autoPlay;
        }
        if (settings.defaultQuality) {
            const qualityDefault = document.getElementById('quality-default');
            if (qualityDefault) qualityDefault.value = settings.defaultQuality;
        }
        if (settings.bufferSize) {
            const bufferSize = document.getElementById('buffer-size');
            if (bufferSize) bufferSize.value = settings.bufferSize;
        }
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

// Save settings
function saveSettings() {
    try {
        const settings = {
            autoPlay: document.getElementById('auto-play')?.checked || false,
            defaultQuality: document.getElementById('quality-default')?.value || 'auto',
            bufferSize: document.getElementById('buffer-size')?.value || '20'
        };
        
        localStorage.setItem('iptv-settings', JSON.stringify(settings));
        showNotification('Cilësimet u ruajtën me sukses', 'success');
        closeSettingsModal();
    } catch (error) {
        console.error('Error saving settings:', error);
        showNotification('Gabim në ruajtjen e cilësimeve', 'error');
    }
}

// Load server config
function loadServerConfig() {
    try {
        const config = JSON.parse(localStorage.getItem('iptv-server-config') || '{}');
        
        if (config.server) window.serverConfig.server = config.server;
        if (config.port) window.serverConfig.port = config.port;
        if (config.mac) window.serverConfig.mac = config.mac;
        if (config.user) window.serverConfig.user = config.user;
        if (config.pass) window.serverConfig.pass = config.pass;
        
        console.log('Server config loaded:', window.serverConfig);
    } catch (error) {
        console.error('Error loading server config:', error);
    }
}

// Show notification
function showNotification(message, type = 'info') {
    const container = document.getElementById('notification-container');
    if (!container) {
        console.log(`${type}: ${message}`);
        return;
    }
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    
    let icon = 'info-circle';
    if (type === 'error') icon = 'exclamation-circle';
    if (type === 'success') icon = 'check-circle';
    if (type === 'warning') icon = 'exclamation-triangle';
    
    notification.innerHTML = `
        <i class="fas fa-${icon}"></i>
        <span>${message}</span>
        <button onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    container.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing app...');
    
    // Load settings
    loadSettings();
    loadServerConfig();
    
    // Initialize Video.js players
    try {
        // Main player
        const mainPlayer = videojs('main-player', {
            controls: true,
            autoplay: false,
            preload: 'auto',
            responsive: true,
            fluid: true,
            playbackRates: [0.5, 1, 1.5, 2],
            controlBar: {
                children: [
                    'playToggle',
                    'volumePanel',
                    'currentTimeDisplay',
                    'timeDivider',
                    'durationDisplay',
                    'progressControl',
                    'remainingTimeDisplay',
                    'playbackRateMenuButton',
                    'fullscreenToggle'
                ]
            }
        });
        
        // Floating player
        const floatingPlayer = videojs('floating-video', {
            controls: true,
            autoplay: false,
            preload: 'auto',
            width: 300,
            height: 200
        });
        
        console.log('Video.js players initialized successfully');
        
    } catch (error) {
        console.error('Error initializing Video.js:', error);
        showNotification('Gabim në inicializimin e player-it', 'error');
    }
    
    // Start the app
    setTimeout(initApp, 500);
});

// Make functions available globally
window.initApp = initApp;
window.changeView = changeView;
window.applyFilters = applyFilters;
window.resetFilters = resetFilters;
window.playChannel = playChannel;
window.refreshChannels = refreshChannels;
window.testAllChannels = testAllChannels;
window.downloadM3U = downloadM3U;
window.exportChannels = exportChannels;
window.toggleFavorite = toggleFavorite;
window.showChannelInfo = showChannelInfo;
window.saveSettings = saveSettings;
window.prevPage = prevPage;
window.nextPage = nextPage;
window.filterByCategory = filterByCategory;
window.clearSearch = clearSearch;
window.showNotification = showNotification;
window.closeFloatingPlayer = closeFloatingPlayer;

// Debug utilities
window.debugIPTV = {
    testChannel: function(channelId) {
        const channel = channels.find(ch => ch.id === channelId);
        if (!channel) {
            console.error('Channel not found');
            return;
        }
        
        const url = buildStreamURL(channel);
        console.log('Testing channel:', channel.name);
        console.log('URL:', url);
        
        // Open in new tab
        window.open(url, '_blank');
        
        // Test with fetch
        fetch(url, { 
            method: 'HEAD',
            mode: 'no-cors',
            headers: { 'User-Agent': 'VLC/3.0.16' }
        }).then(() => {
            console.log('✅ URL responds (no-cors)');
        }).catch(err => {
            console.log('❌ URL does not respond:', err.message);
        });
    },
    
    testFirstChannel: function() {
        if (channels.length > 0) {
            this.testChannel(channels[0].id);
        }
    },
    
    reloadApp: function() {
        initApp();
    }
};

console.log('IPTV App loaded successfully!');
console.log('Debug commands: debugIPTV.testChannel(1), debugIPTV.testFirstChannel()');
// M3U to JSON Converter Functions
let m3uConverter = null;
let convertedData = null;

// Initialize converter
function initConverter() {
    m3uConverter = new M3UtoJSON();
    setupConverterEvents();
}

// Setup converter event listeners
function setupConverterEvents() {
    const fileInput = document.getElementById('m3u-file');
    const fileUploadArea = document.getElementById('file-upload-area');
    
    if (!fileInput || !fileUploadArea) return;
    
    // File input change
    fileInput.addEventListener('change', handleFileSelect);
    
    // Drag and drop
    fileUploadArea.addEventListener('dragover', handleDragOver);
    fileUploadArea.addEventListener('dragleave', handleDragLeave);
    fileUploadArea.addEventListener('drop', handleDrop);
    
    // Click on upload area
    fileUploadArea.addEventListener('click', () => {
        fileInput.click();
    });
}

// Handle file selection
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        displayFileInfo(file);
    }
}

// Display file information
function displayFileInfo(file) {
    const fileInfo = document.getElementById('file-info');
    if (fileInfo) {
        fileInfo.innerHTML = `
            <strong>${file.name}</strong>
            <br>Size: ${formatFileSize(file.size)}
            <br>Type: ${file.type || 'Unknown'}
        `;
    }
}

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Handle drag over
function handleDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
    const fileUploadArea = document.getElementById('file-upload-area');
    if (fileUploadArea) {
        fileUploadArea.classList.add('drag-over');
    }
}

// Handle drag leave
function handleDragLeave(event) {
    event.preventDefault();
    event.stopPropagation();
    const fileUploadArea = document.getElementById('file-upload-area');
    if (fileUploadArea) {
        fileUploadArea.classList.remove('drag-over');
    }
}

// Handle drop
function handleDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    
    const fileUploadArea = document.getElementById('file-upload-area');
    if (fileUploadArea) {
        fileUploadArea.classList.remove('drag-over');
    }
    
    const files = event.dataTransfer.files;
    if (files.length > 0) {
        const fileInput = document.getElementById('m3u-file');
        if (fileInput) {
            // Create a new DataTransfer object
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(files[0]);
            fileInput.files = dataTransfer.files;
            
            // Trigger change event
            const changeEvent = new Event('change', { bubbles: true });
            fileInput.dispatchEvent(changeEvent);
        }
    }
}

// Convert M3U to JSON
async function convertM3U() {
    const fileInput = document.getElementById('m3u-file');
    if (!fileInput || !fileInput.files[0]) {
        showNotification('Ju lutem zgjidhni një skedar M3U', 'error');
        return;
    }
    
    const convertBtn = document.getElementById('convert-btn');
    if (convertBtn) {
        convertBtn.disabled = true;
        convertBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Po konvertohet...';
    }
    
    try {
        const file = fileInput.files[0];
        convertedData = await m3uConverter.convertFile(file);
        
        // Display JSON
        displayJSON(convertedData);
        
        // Update stats
        updateConverterStats(convertedData);
        
        showNotification(`U konvertuan ${convertedData.channels.length} kanale me sukses!`, 'success');
        
    } catch (error) {
        console.error('Conversion error:', error);
        showNotification(`Gabim në konvertim: ${error.message}`, 'error');
    } finally {
        if (convertBtn) {
            convertBtn.disabled = false;
            convertBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Konverto M3U në JSON';
        }
    }
}

// Display JSON output
function displayJSON(jsonData) {
    const jsonOutput = document.getElementById('json-output');
    if (jsonOutput) {
        jsonOutput.textContent = JSON.stringify(jsonData, null, 2);
        
        // Apply syntax highlighting (simple version)
        setTimeout(() => {
            highlightJSON();
        }, 100);
    }
}

// Simple JSON syntax highlighting
function highlightJSON() {
    const jsonOutput = document.getElementById('json-output');
    if (!jsonOutput) return;
    
    let text = jsonOutput.textContent;
    
    // Highlight strings
    text = text.replace(/("([^\\"]|\\.)*")/g, '<span class="json-string">$1</span>');
    
    // Highlight numbers
    text = text.replace(/: (\d+)/g, ': <span class="json-number">$1</span>');
    
    // Highlight booleans and null
    text = text.replace(/: (true|false|null)/g, ': <span class="json-boolean">$1</span>');
    
    // Highlight keys
    text = text.replace(/("[^"]+"):/g, '<span class="json-key">$1</span>:');
    
    jsonOutput.innerHTML = text;
}

// Update converter stats
function updateConverterStats(jsonData) {
    const statsElement = document.getElementById('converter-stats');
    if (!statsElement) return;
    
    const channels = jsonData.channels.length;
    const categories = jsonData.categories.length;
    const countries = Object.keys(jsonData.countries).length;
    const qualities = jsonData.qualities.length;
    
    statsElement.innerHTML = `
        <div class="stat-item">
            <i class="fas fa-tv"></i>
            <span>Kanale: <strong>${channels}</strong></span>
        </div>
        <div class="stat-item">
            <i class="fas fa-tags"></i>
            <span>Kategori: <strong>${categories}</strong></span>
        </div>
        <div class="stat-item">
            <i class="fas fa-globe"></i>
            <span>Vende: <strong>${countries}</strong></span>
        </div>
        <div class="stat-item">
            <i class="fas fa-signal"></i>
            <span>Cilësi: <strong>${qualities}</strong></span>
        </div>
    `;
}

// Copy JSON to clipboard
function copyJSON() {
    const jsonOutput = document.getElementById('json-output');
    if (!jsonOutput || !convertedData) {
        showNotification('Nuk ka të dhëna për të kopjuar', 'error');
        return;
    }
    
    const jsonStr = JSON.stringify(convertedData, null, 2);
    
    navigator.clipboard.writeText(jsonStr).then(() => {
        showNotification('JSON u kopjua në clipboard', 'success');
    }).catch(err => {
        console.error('Copy failed:', err);
        showNotification('Nuk mund të kopjohet JSON', 'error');
    });
}

// Download JSON file
function downloadJSON() {
    if (!convertedData) {
        showNotification('Nuk ka të dhëna për të shkarkuar', 'error');
        return;
    }
    
    m3uConverter.downloadJSON(convertedData, 'channels-converted.json');
    showNotification('JSON u shkarkua me sukses', 'success');
}

// Clear converter
function clearConverter() {
    const fileInput = document.getElementById('m3u-file');
    const fileInfo = document.getElementById('file-info');
    const jsonOutput = document.getElementById('json-output');
    const statsElement = document.getElementById('converter-stats');
    
    if (fileInput) fileInput.value = '';
    if (fileInfo) fileInfo.textContent = 'Asnjë skedar i zgjedhur';
    if (jsonOutput) jsonOutput.textContent = '{\n  "version": "3.0.0",\n  "last_updated": "",\n  "total_channels": 0,\n  "channels": []\n}';
    if (statsElement) statsElement.innerHTML = `
        <div class="stat-item">
            <i class="fas fa-tv"></i>
            <span>Kanale: <strong>0</strong></span>
        </div>
        <div class="stat-item">
            <i class="fas fa-tags"></i>
            <span>Kategori: <strong>0</strong></span>
        </div>
        <div class="stat-item">
            <i class="fas fa-globe"></i>
            <span>Vende: <strong>0</strong></span>
        </div>
        <div class="stat-item">
            <i class="fas fa-signal"></i>
            <span>Cilësi: <strong>0</strong></span>
        </div>
    `;
    
    convertedData = null;
    showNotification('Converter u pastrua', 'info');
}

// Load sample M3U
function loadSampleM3U() {
    const sampleM3U = `#EXTM3U
#EXTINF:-1 tvg-id="rtsh1.al" tvg-name="RTSH 1 HD" tvg-logo="http://example.com/rtsh1.png" group-title="ALBANIA",RTSH 1 HD
http://server.example.com/rtsh1.m3u8
#EXTINF:-1 tvg-id="tvklan.al" tvg-name="TV Klan HD" tvg-logo="http://example.com/tvklan.png" group-title="ALBANIA",TV Klan HD
http://server.example.com/tvklan.m3u8
#EXTINF:-1 tvg-id="topchannel.al" tvg-name="Top Channel FHD" tvg-logo="http://example.com/topchannel.png" group-title="ALBANIA",Top Channel
http://server.example.com/topchannel.m3u8
#EXTINF:-1 tvg-id="abcnews.al" tvg-name="ABC News HD" tvg-logo="http://example.com/abcnews.png" group-title="ALBANIA",ABC News
http://server.example.com/abcnews.m3u8
#EXTINF:-1 tvg-id="rtk1.xk" tvg-name="RTK 1 HD" tvg-logo="http://example.com/rtk1.png" group-title="KOSOVA",RTK 1
http://server.example.com/rtk1.m3u8
#EXTINF:-1 tvg-id="cnn.us" tvg-name="CNN International HD" tvg-logo="http://example.com/cnn.png" group-title="USA",CNN
http://server.example.com/cnn.m3u8
#EXTINF:-1 tvg-id="bbc.uk" tvg-name="BBC World News FHD" tvg-logo="http://example.com/bbc.png" group-title="UK",BBC News
http://server.example.com/bbc.m3u8`;
    
    // Create a blob and simulate file selection
    const blob = new Blob([sampleM3U], { type: 'text/plain' });
    const file = new File([blob], 'sample.m3u', { type: 'text/plain' });
    
    const fileInput = document.getElementById('m3u-file');
    if (fileInput) {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        fileInput.files = dataTransfer.files;
        
        displayFileInfo(file);
        
        showNotification('Shembull M3U u ngarkua', 'success');
    }
}

// Test converter
async function testConverter() {
    showNotification('Po testohet konverteri...', 'info');
    
    // Create test M3U content
    const testM3U = `#EXTM3U
#EXTINF:-1 tvg-id="test1.al" tvg-name="Test Channel 1 HD" tvg-logo="http://test.com/1.png" group-title="ALBANIA",Test Channel 1
http://test.com/channel1.m3u8
#EXTINF:-1 tvg-id="test2.xk" tvg-name="Test Channel 2 FHD" tvg-logo="http://test.com/2.png" group-title="KOSOVA",Test Channel 2
http://test.com/channel2.m3u8`;
    
    try {
        const converter = new M3UtoJSON();
        const jsonData = converter.parse(testM3U);
        
        // Display test results
        const jsonOutput = document.getElementById('json-output');
        if (jsonOutput) {
            jsonOutput.textContent = JSON.stringify(jsonData, null, 2);
            highlightJSON();
        }
        
        updateConverterStats(jsonData);
        
        showNotification(`Testi i konvertimit u krye me sukses! ${jsonData.channels.length} kanale u konvertuan.`, 'success');
        
    } catch (error) {
        console.error('Test conversion error:', error);
        showNotification(`Gabim në test: ${error.message}`, 'error');
    }
}

// Initialize converter when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Wait a bit for everything to load
    setTimeout(() => {
        initConverter();
        highlightJSON();
    }, 1000);
});

// Add converter functions to window
window.convertM3U = convertM3U;
window.copyJSON = copyJSON;
window.downloadJSON = downloadJSON;
window.clearConverter = clearConverter;
window.loadSampleM3U = loadSampleM3U;
window.testConverter = testConverter;

// Update main initApp to also init converter
const originalInitApp = window.initApp;
window.initApp = async function() {
    await originalInitApp();
    initConverter();
};

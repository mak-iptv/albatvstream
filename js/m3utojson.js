/**
 * M3U to JSON Converter
 * Version 1.0.0
 */

class M3UtoJSON {
    constructor() {
        this.channels = [];
        this.categories = new Set();
        this.countries = new Set();
        this.qualities = new Set();
    }

    /**
     * Parse M3U content to JSON
     * @param {string} m3uContent - M3U file content
     * @returns {Object} JSON object with channels
     */
    parse(m3uContent) {
        this.channels = [];
        this.categories = new Set();
        this.countries = new Set();
        this.qualities = new Set();

        const lines = m3uContent.split('\n');
        let currentChannel = null;
        let channelId = 1;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            // Skip empty lines
            if (!line) continue;

            // Check if line is an EXTINF entry
            if (line.startsWith('#EXTINF:')) {
                currentChannel = this.parseExtinf(line, channelId);
            }
            // Check if line is a URL (and we have a channel)
            else if (currentChannel && !line.startsWith('#')) {
                currentChannel.url = line;
                this.processChannel(currentChannel);
                this.channels.push(currentChannel);
                channelId++;
                currentChannel = null;
            }
        }

        return this.generateJSON();
    }

    /**
     * Parse EXTINF line
     * @param {string} extinfLine - EXTINF line
     * @param {number} id - Channel ID
     * @returns {Object} Channel object
     */
    parseExtinf(extinfLine, id) {
        const channel = {
            id: id,
            name: '',
            url: '',
            logo: '',
            category: '',
            country: '',
            quality: 'HD',
            working: true,
            viewers: Math.floor(Math.random() * 1000) + 100,
            language: 'sq',
            isLive: true
        };

        // Extract attributes from EXTINF line
        const attributesMatch = extinfLine.match(/#EXTINF:[^,]+,(.+)/);
        if (attributesMatch) {
            channel.name = this.cleanChannelName(attributesMatch[1].trim());
        }

        // Extract tvg-name, tvg-logo, group-title
        const tvgNameMatch = extinfLine.match(/tvg-name="([^"]+)"/);
        const tvgLogoMatch = extinfLine.match(/tvg-logo="([^"]+)"/);
        const groupTitleMatch = extinfLine.match(/group-title="([^"]+)"/);
        const tvgIdMatch = extinfLine.match(/tvg-id="([^"]+)"/);

        if (tvgNameMatch && tvgNameMatch[1]) {
            channel.name = this.cleanChannelName(tvgNameMatch[1]);
        }

        if (tvgLogoMatch && tvgLogoMatch[1]) {
            channel.logo = tvgLogoMatch[1];
        }

        if (groupTitleMatch && groupTitleMatch[1]) {
            channel.category = this.cleanCategoryName(groupTitleMatch[1]);
            this.categories.add(channel.category);
        }

        if (tvgIdMatch && tvgIdMatch[1]) {
            // Try to extract country from tvg-id
            const countryCode = this.extractCountryCode(tvgIdMatch[1]);
            if (countryCode) {
                channel.country = countryCode;
                this.countries.add(countryCode);
            }
        }

        // Auto-detect quality from name
        channel.quality = this.detectQuality(channel.name);
        this.qualities.add(channel.quality);

        // Auto-detect country from name if not set
        if (!channel.country) {
            channel.country = this.detectCountry(channel.name);
            if (channel.country) {
                this.countries.add(channel.country);
            }
        }

        return channel;
    }

    /**
     * Clean channel name (remove prefixes)
     * @param {string} name - Original channel name
     * @returns {string} Cleaned channel name
     */
    cleanChannelName(name) {
        // Remove common prefixes
        const prefixes = [
            /^[┃|‖│║╏]+\s*[A-Z]{2}\s*[┃|‖│║╏]+\s*/,
            /^\[[A-Z]{2}\]\s*/,
            /^\([A-Z]{2}\)\s*/,
            /^[A-Z]{2}:\s*/,
            /^[A-Z]{2}\s*-\s*/,
            /^HD\s*/,
            /^FHD\s*/,
            /^4K\s*/,
            /^SD\s*/
        ];

        let cleaned = name;
        prefixes.forEach(prefix => {
            cleaned = cleaned.replace(prefix, '');
        });

        // Remove quality indicators from end
        cleaned = cleaned.replace(/\s*\((?:HD|FHD|4K|SD|1080p|720p|480p)\)$/i, '');
        cleaned = cleaned.replace(/\s*\[(?:HD|FHD|4K|SD|1080p|720p|480p)\]$/i, '');

        return cleaned.trim();
    }

    /**
     * Clean category name
     * @param {string} category - Original category name
     * @returns {string} Cleaned category name
     */
    cleanCategoryName(category) {
        // Add prefix for Albanian channels
        if (category.toLowerCase().includes('albania') || 
            category.toLowerCase().includes('shqip') ||
            category.toLowerCase().includes('al')) {
            return `┃AL┃ ${category.toUpperCase()}`;
        }
        
        // Add prefix for Kosova channels
        if (category.toLowerCase().includes('kosova') || 
            category.toLowerCase().includes('kosovo') ||
            category.toLowerCase().includes('xk')) {
            return `┃XK┃ ${category.toUpperCase()}`;
        }
        
        // Add prefix for Macedonian channels
        if (category.toLowerCase().includes('macedonia') || 
            category.toLowerCase().includes('maqedoni') ||
            category.toLowerCase().includes('mk')) {
            return `┃MK┃ ${category.toUpperCase()}`;
        }

        return category;
    }

    /**
     * Extract country code from tvg-id
     * @param {string} tvgId - TVG ID
     * @returns {string|null} Country code
     */
    extractCountryCode(tvgId) {
        const countryCodes = {
            'al': 'AL', 'sq': 'AL', // Albania
            'xk': 'XK', 'ks': 'XK', // Kosovo
            'mk': 'MK', // Macedonia
            'us': 'US', 'en': 'US', // USA
            'uk': 'UK', 'gb': 'UK', // UK
            'it': 'IT', // Italy
            'gr': 'GR', 'el': 'GR', // Greece
            'de': 'DE', // Germany
            'fr': 'FR', // France
            'es': 'ES', // Spain
            'tr': 'TR', // Turkey
            'ru': 'RU'  // Russia
        };

        // Check if tvg-id contains country code
        const parts = tvgId.split('.');
        if (parts.length > 1) {
            const lastPart = parts[parts.length - 1].toLowerCase();
            if (countryCodes[lastPart]) {
                return countryCodes[lastPart];
            }
        }

        // Check for country code in the middle
        const lowerId = tvgId.toLowerCase();
        for (const [code, countryCode] of Object.entries(countryCodes)) {
            if (lowerId.includes(`.${code}.`) || lowerId.endsWith(`.${code}`)) {
                return countryCode;
            }
        }

        return null;
    }

    /**
     * Detect quality from channel name
     * @param {string} name - Channel name
     * @returns {string} Quality (SD, HD, FHD, 4K)
     */
    detectQuality(name) {
        const lowerName = name.toLowerCase();
        
        if (lowerName.includes('4k') || lowerName.includes('uhd')) {
            return '4K';
        } else if (lowerName.includes('fhd') || lowerName.includes('1080p') || lowerName.includes('full hd')) {
            return 'FHD';
        } else if (lowerName.includes('hd') || lowerName.includes('720p')) {
            return 'HD';
        } else {
            return 'SD';
        }
    }

    /**
     * Detect country from channel name
     * @param {string} name - Channel name
     * @returns {string} Country code
     */
    detectCountry(name) {
        const countryPatterns = {
            'AL': [/albania/i, /shqip/i, /rtsh/i, /tv klan/i, /top channel/i, /abc news/i],
            'XK': [/kosova/i, /kosovo/i, /rtk/i, /tv 21/i, /rtv 21/i, /k.tv/i],
            'MK': [/macedonia/i, /maqedoni/i, /a1/i, /sitel/i],
            'US': [/cnn/i, /fox/i, /hbo/i, /discovery/i, /national geographic/i, /mtv/i],
            'UK': [/bbc/i, /sky/i, /itv/i, /channel 4/i],
            'IT': [/rai/i, /italia/i, /italy/i],
            'GR': [/ert/i, /greece/i, /greqi/i],
            'DE': [/dw/i, /zdf/i, /ard/i, /germany/i],
            'FR': [/france/i, /tf1/i, /france 24/i],
            'ES': [/spain/i, /spanj/i, /tv.e/i],
            'TR': [/turkey/i, /turqi/i, /trt/i],
            'RU': [/russia/i, /rusi/i, /rt rus/i]
        };

        for (const [countryCode, patterns] of Object.entries(countryPatterns)) {
            for (const pattern of patterns) {
                if (pattern.test(name)) {
                    return countryCode;
                }
            }
        }

        return 'AL'; // Default to Albania
    }

    /**
     * Process channel data
     * @param {Object} channel - Channel object
     */
    processChannel(channel) {
        // Ensure category has proper prefix
        if (!channel.category) {
            channel.category = `┃${channel.country}┃ ${this.getCountryName(channel.country).toUpperCase()}`;
        }

        // Add country prefix to name if not present
        if (!channel.name.startsWith('┃')) {
            channel.name = `┃${channel.country}┃ ${channel.name}`;
        }

        // Add quality to name if not present
        if (!channel.name.includes(channel.quality) && !channel.name.match(/(HD|FHD|4K|SD)$/i)) {
            channel.name += ` ${channel.quality}`;
        }
    }

    /**
     * Get country name from code
     * @param {string} code - Country code
     * @returns {string} Country name
     */
    getCountryName(code) {
        const countries = {
            'AL': 'ALBANIA',
            'XK': 'KOSOVA',
            'MK': 'MAQEDONI',
            'US': 'USA',
            'UK': 'UK',
            'IT': 'ITALIA',
            'GR': 'GREQI',
            'DE': 'GJERMANI',
            'FR': 'FRANCE',
            'ES': 'SPAIN',
            'TR': 'TURQI',
            'RU': 'RUSI'
        };
        return countries[code] || code;
    }

    /**
     * Generate JSON structure
     * @returns {Object} Complete JSON structure
     */
    generateJSON() {
        // Count channels per category
        const categoryCounts = {};
        this.channels.forEach(channel => {
            categoryCounts[channel.category] = (categoryCounts[channel.category] || 0) + 1;
        });

        // Create categories array
        const categories = Array.from(this.categories).map(cat => ({
            id: cat,
            name: this.cleanCategoryNameForDisplay(cat),
            icon: this.getCategoryIcon(cat),
            count: categoryCounts[cat] || 0
        }));

        // Sort categories by count
        categories.sort((a, b) => b.count - a.count);

        return {
            version: "3.0.0",
            last_updated: new Date().toISOString(),
            total_channels: this.channels.length,
            categories: categories,
            channels: this.channels,
            countries: this.generateCountriesObject(),
            qualities: Array.from(this.qualities),
            languages: ['sq', 'en', 'mk', 'it', 'el', 'de', 'fr', 'es', 'tr', 'ru']
        };
    }

    /**
     * Clean category name for display
     * @param {string} category - Category name with prefix
     * @returns {string} Cleaned name
     */
    cleanCategoryNameForDisplay(category) {
        return category.replace(/^[┃|‖│║╏]+\s*[A-Z]{2}\s*[┃|‖│║╏]+\s*/, '');
    }

    /**
     * Get category icon
     * @param {string} category - Category name
     * @returns {string} FontAwesome icon class
     */
    getCategoryIcon(category) {
        const icons = {
            'AL': 'fas fa-home',
            'XK': 'fas fa-flag',
            'MK': 'fas fa-mountain',
            'US': 'fas fa-flag-usa',
            'UK': 'fas fa-crown',
            'IT': 'fas fa-pizza-slice',
            'GR': 'fas fa-olive-branch',
            'DE': 'fas fa-car',
            'SPORT': 'fas fa-futbol',
            'NEWS': 'fas fa-newspaper',
            'MOVIES': 'fas fa-film',
            'MUSIC': 'fas fa-music',
            'KIDS': 'fas fa-child'
        };

        // Extract country code from category
        const match = category.match(/┃([A-Z]{2})┃/);
        if (match && icons[match[1]]) {
            return icons[match[1]];
        }

        // Check for other categories
        const lowerCat = category.toLowerCase();
        if (lowerCat.includes('sport')) return icons.SPORT;
        if (lowerCat.includes('news')) return icons.NEWS;
        if (lowerCat.includes('movie') || lowerCat.includes('film')) return icons.MOVIES;
        if (lowerCat.includes('music')) return icons.MUSIC;
        if (lowerCat.includes('kids') || lowerCat.includes('children')) return icons.KIDS;

        return 'fas fa-tv'; // Default icon
    }

    /**
     * Generate countries object
     * @returns {Object} Countries mapping
     */
    generateCountriesObject() {
        const countries = {
            'AL': 'Shqipëri',
            'XK': 'Kosovë',
            'MK': 'Maqedoni',
            'US': 'SHBA',
            'UK': 'Angli',
            'IT': 'Itali',
            'GR': 'Greqi',
            'DE': 'Gjermani',
            'FR': 'Francë',
            'ES': 'Spanjë',
            'TR': 'Turqi',
            'RU': 'Rusi'
        };

        // Only include countries that are actually used
        const usedCountries = {};
        Array.from(this.countries).forEach(code => {
            if (countries[code]) {
                usedCountries[code] = countries[code];
            }
        });

        return usedCountries;
    }

    /**
     * Convert file to JSON
     * @param {File} file - M3U file
     * @returns {Promise<Object>} JSON data
     */
    async convertFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (event) => {
                try {
                    const m3uContent = event.target.result;
                    const jsonData = this.parse(m3uContent);
                    resolve(jsonData);
                } catch (error) {
                    reject(error);
                }
            };
            
            reader.onerror = () => {
                reject(new Error('Failed to read file'));
            };
            
            reader.readAsText(file);
        });
    }

    /**
     * Download JSON file
     * @param {Object} jsonData - JSON data
     * @param {string} filename - Output filename
     */
    downloadJSON(jsonData, filename = 'channels.json') {
        const jsonStr = JSON.stringify(jsonData, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
    }
}

// Export for use in browser
if (typeof window !== 'undefined') {
    window.M3UtoJSON = M3UtoJSON;
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = M3UtoJSON;
}

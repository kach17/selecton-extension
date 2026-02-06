console.log("Selecton: popup.js script started");

// Embedded defaults (no external dependencies)
const DEFAULT_CONFIGS = {
    addActionButtonsForTextFields: false,
    addButtonToCopyLinkToText: true,
    addCalendarButton: true,
    addClearButton: true,
    addColorPreviewButton: true,
    addDragHandles: true,
    addExtendSelectionButton: true,
    addFontFormatButtons: true,
    addMarkerButton: true,
    addOpenLinks: true,
    addPasteButton: true,
    addPasteOnlyEmptyField: true,
    addPhoneButton: true,
    addQuoteButton: true,
    addTooltipShadow: false,
    animationDuration: 200,
    applyConfigsImmediately: false,
    borderRadius: 4,
    buttonsStyle: "onlylabel",
    changeTextSelectionColor: false,
    collapseAsSecondPanel: false,
    collapseButtons: true,
    convertCurrencies: true,
    convertMetrics: true,
    convertResultClickAction: "search",
    convertTime: true,
    convertToCurrency: "USD",
    correctTooltipPositionByMoreButtonWidth: true,
    customSearchButtons: [
        { enabled: true, title: "YouTube", url: "https://www.youtube.com/results?search_query=%s" },
        { enabled: true, title: "Spotify", url: "https://open.spotify.com/search/%s" },
        { enabled: true, icon: "https://img.icons8.com/color/452/aliexpress.png", title: "Ali (ru)", url: "https://aliexpress.ru/wholesale?catId=&SearchText=%s" },
        { enabled: false, title: "Ali (en)", url: "https://www.aliexpress.com/wholesale?SearchText=%s" },
        { enabled: true, icon: "https://www.amazon.com/favicon.ico", title: "Amazon", url: "https://www.amazon.com/s?k=%s" },
        { enabled: false, title: "Wikipedia", url: "https://wikipedia.org/w/index.php?search=%s" },
        { enabled: false, title: "IMDB", url: "https://www.imdb.com/find?s=alt&q=%s" },
        { enabled: false, title: "Search on website", url: "https://google.com/search?q=site:%w %s" }
    ],
    customSearchOptionsDisplay: "hoverCustomSearchStyle",
    customSearchUrl: "",
    debugMode: false,
    delayToRevealHoverPanels: 700,
    delayToRevealSearchTooltip: 350,
    delayToRevealTranslateTooltip: 550,
    dictionaryButtonResponseCharsAmount: 400,
    dictionaryButtonWordsAmount: 1,
    disableWordSnapForCode: false,
    disableWordSnappingOnCtrlKey: true,
    dontSnapTextfieldSelection: true,
    dragHandleStyle: "circle",
    draggableTooltip: true,
    enabled: true,
    enableMultiCopyStack: true,
    multiCopySeparator: "doubleNewline",
    excludedDomains: "",
    floatingOffscreenTooltip: true,
    fontSize: 12.5,
    fullOpacityOnHover: true,
    hideOnKeypress: true,
    hideOnScroll: true,
    hideTooltipOnActionButtonClick: true,
    hideTooltipOnContextMenuOpen: true,
    hideTooltipWhenCursorMovesAway: false,
    hideTranslateButtonForUserLanguage: true,
    invertColorOnDarkWebsite: true,
    languageToTranslate: (navigator.language || navigator.userLanguage || "en").split('-')[0],
    leftClickBackgroundTab: false,
    liveTranslation: true,
    maxIconsInRow: 5,
    maxMarkerPagesToStore: 10,
    maxTooltipButtonsToShow: 3,
    middleClickHidesTooltip: false,
    performSimpleMathOperations: false,
    preferCurrencySymbol: false,
    preferredMapsService: "google",
    preferredMetricsSystem: "metric",
    preferredNewEmailMethod: "mailto",
    preferredSearchEngine: "google",
    preferredTranslateService: "google",
    ratesLastFetchedDate: "",
    recreateTooltipAfterScroll: true,
    removeSelectionOnActionButtonClick: true,
    secondaryTooltipEnabled: true,
    secondaryTooltipIconSize: 16,
    secondaryTooltipLayout: "verticalLayout",
    shadowOpacity: 0.5,
    shiftTooltipWhenWebsiteHasOwn: false,
    shouldOverrideWebsiteSelectionColor: false,
    showButtonBorders: true,
    showButtonLabelOnHover: true,
    showDictionaryButton: true,
    showDotForHoverButtons: true,
    showEmailButton: true,
    showInfoPanel: true,
    showOnMapButtonEnabled: true,
    showPasteContentPreview: false,
    showSecondaryTooltipTitleOnHover: false,
    showStatsOnCopyButtonHover: true,
    showTooltipArrow: true,
    showTranslateButton: true,
    showTranslateIfLanguageUnknown: true,
    showUnconvertedValue: false,
    showUpdateNotification: true,
    snapSelectionToWord: true,
    textSelectionBackground: "#338FFF",
    textSelectionBackgroundOpacity: 1,
    textSelectionColor: "#ffffff",
    tooltipBackground: "#333232",
    tooltipInvertedBackground: "#bfbfbf",
    tooltipOpacity: 1,
    tooltipPosition: "overCursor",
    tooltipRevealEffect: "moveUpTooltipEffect",
    translateSingleWordsImmediately: false,
    updateRatesEveryDays: 7,
    useCustomStyle: false,
    verticalLayoutTooltip: false,
    wordSnappingBlacklist: ""
};

const CURRENCIES = {
    AUD: { name: "Australian Dollar", symbol: "A$", rate: 1.29009 },
    BGN: { name: "Bulgarian Lev", symbol: "лв", rate: 1.640562 },
    BRL: { name: "Brazilian real", symbol: "R$", rate: 5.616101 },
    BYN: { name: "Belarussian Ruble", rate: 2.596137 },
    CAD: { name: "Canadian Dollar", symbol: "C$", rate: 1.269384 },
    CHF: { name: "Swiss Franc", symbol: "CHF", rate: 0.926525 },
    CNY: { name: "Chinese Yuan", symbol: "¥", rate: 6.497301 },
    CRC: { name: "Costa Rican Colon", symbol: "₡", rate: 610.339772 },
    CZK: { name: "Czech Koruna", symbol: "Kč", rate: 21.936455 },
    DKK: { name: "Danish Krone", symbol: " kr", rate: 6.229502 },
    EUR: { name: "Euro", symbol: "€", rate: 0.8378 },
    GBP: { name: "British Pound", symbol: "£", rate: 0.721124 },
    HKD: { name: "Hong Kong dollar", symbol: "HK$", rate: 7.765632 },
    HUF: { name: "Hungarian forint", rate: 316.005504 },
    IDR: { name: "Indonesian Rupiah", symbol: "Rp", rate: 15711.86182839 },
    ILS: { name: "Israeli New Sheqel", symbol: "₪", rate: 3.310401 },
    INR: { name: "Indian Rupee", symbol: "₹", rate: 72.452006 },
    IRR: { name: "Iranian Rial", symbol: "﷼", rate: 42105.017329 },
    JPY: { name: "Japanese Yen", symbol: "¥", rate: 109.188027 },
    KRW: { name: "South Korean Won", symbol: "₩", rate: 1193.057307 },
    KPW: { name: "North Korean Won", symbol: "₩", rate: 900.00022 },
    KZT: { name: "Kazakhstani Tenge", symbol: "₸", rate: 418.821319 },
    MNT: { name: "Mongolian Tugrik", symbol: "₮", rate: 2849.930035 },
    MXN: { name: "Mexican Peso", symbol: "peso", rate: 20.655212 },
    MYR: { name: "Malaysian Ringgit", symbol: "RM", rate: 4.208613 },
    NGN: { name: "Nigerian Naira", symbol: "₦", rate: 410.317377 },
    NOK: { name: "Norwegian Krone", symbol: " kr", rate: 8.51191 },
    PHP: { name: "Philippine Peso", symbol: "₱", rate: 56.012 },
    PLN: { name: "Polish złoty", symbol: "zł", rate: 3.845051 },
    RON: { name: "Romanian leu", symbol: "leu", rate: 5.058587 },
    RUB: { name: "Russian Ruble", symbol: "₽", rate: 72.880818 },
    SAR: { name: "Saudi Riyal", symbol: "﷼", rate: 3.750694 },
    SEK: { name: "Swedish Krona", symbol: " kr", rate: 8.514027 },
    THB: { name: "Thai Baht", symbol: "฿", rate: 34.700854 },
    TRY: { name: "Turkish Lira", symbol: "₺", rate: 0.14 },
    TWD: { name: "New Taiwan dollar", symbol: "NT$", rate: 31.99368752 },
    UAH: { name: "Ukrainian Hryvnia", symbol: "₴", rate: 27.852288 },
    USD: { name: "United States Dollar", symbol: "$", rate: 1 },
    VND: { name: "Vietnamese Dong", symbol: "₫", rate: 23054.385489 },
    ZAR: { name: "Rand", rate: 14.856969 },
    BTC: { name: "Bitcoin", rate: 18e-6, symbol: "₿" },
    ETH: { name: "Ethereum", rate: 3208e-7 },
    LTC: { name: "Litecoin", rate: 0.006242 },
    ADA: { name: "Cardano", rate: 0.4492 },
};

let customSearchButtonsList = [];

document.addEventListener("DOMContentLoaded", function () {
    console.log("Selecton: DOMContentLoaded event fired");
    
    // Load settings from storage and merge with defaults
    chrome.storage.local.get(null, (storedItems) => {
        console.log("Selecton: Storage loaded", Object.keys(storedItems).length, "items");
        
        const mergedConfigs = Object.assign({}, DEFAULT_CONFIGS, storedItems);
        
        console.log("Selecton: Configs initialized");
        initializePopup(storedItems, mergedConfigs);
    });
});

function initializePopup(items, configs) {
    console.log("Selecton: Initializing popup UI");
    
    document.getElementById('selecton-settings-label').innerHTML = 
        chrome.i18n.getMessage("selectonSettings") ?? 'Selecton settings';

    let openSettingsInTabButton = document.getElementById('openSettingsInTabButton');
    openSettingsInTabButton.setAttribute('title', 
        chrome.i18n.getMessage("openInNewTab") ?? 'Open in new tab');
    openSettingsInTabButton.addEventListener('mouseup', function (e) {
        const url = chrome.runtime.getURL('popup/popup.html');
        if (e.button == 0) {
            chrome.tabs.create({ url: url });
            window.close();
        } else if (e.button == 1) {
            window.open(url);
        }
    });

    // Handle Collapsible Accordions
    var coll = document.getElementsByClassName("collapsible-header");
    console.log("Selecton: Found", coll.length, "accordions");
    for (var i = 0; i < coll.length; i++) {
        coll[i].addEventListener("click", function() {
            this.classList.toggle("active");
            var content = this.nextElementSibling;
            if (content.style.maxHeight){
                content.style.maxHeight = null;
            } else {
                content.style.maxHeight = content.scrollHeight + "px";
            }
        });
    }

    // Load and bind settings
    const inputs = document.querySelectorAll('input:not([type="file"]), select');

    // Load saved values into inputs
    inputs.forEach(input => {
        if (input.id && items[input.id] !== undefined) {
            if (input.type === 'checkbox') {
                input.checked = items[input.id];
            } else {
                input.value = items[input.id];
            }
        }
    });

    // Initialize currency dropdown
    setCurrenciesDropdown(items.convertToCurrency, CURRENCIES);

    // Load Custom Search Buttons
    customSearchButtonsList = items.customSearchButtons || configs.customSearchButtons || [];
    renderCustomSearchButtons();

    // Load Website Markers
    renderWebsiteMarkers(items.websiteMarkers);

    // Update UI dependencies
    updateDisabledOptions();

    // Save settings on change
    inputs.forEach(input => {
        input.addEventListener('change', () => {
            if (input.id) {
                let value;
                if (input.type === 'checkbox') {
                    value = input.checked;
                } else if (input.type === 'number') {
                    value = parseFloat(input.value);
                } else {
                    value = input.value;
                }
                console.log("Selecton: Saving", input.id, "=", value);
                chrome.storage.local.set({ [input.id]: value });
                updateDisabledOptions();
            }
        });
    });

    // Display version
    const versionEl = document.getElementById('selecton-version');
    if (versionEl) {
        versionEl.textContent = 'v' + chrome.runtime.getManifest().version;
    }

    // Initialize Import/Export
    setupImportExport(configs);

    // Initialize Reset Button
    const resetBtn = document.getElementById('resetDefaults');
    if (resetBtn) {
        resetBtn.onclick = () => {
            if (confirm("Are you sure you want to reset all settings to defaults?")) {
                chrome.storage.local.get(['websiteMarkers'], (current) => {
                    const defaults = { ...DEFAULT_CONFIGS };
                    if (current.websiteMarkers) defaults.websiteMarkers = current.websiteMarkers;
                    chrome.storage.local.set(defaults, () => location.reload());
                });
            }
        };
    }
    
    console.log("Selecton: Popup initialization complete!");
}

function updateDisabledOptions() {
    const elements = {
        convertCurrencies: document.getElementById("convertCurrencies"),
        convertMetrics: document.getElementById("convertMetrics"),
        showTranslateButton: document.getElementById("showTranslateButton"),
        useCustomStyle: document.getElementById("useCustomStyle"),
        enableMultiCopyStack: document.getElementById("enableMultiCopyStack"),
        preferredSearchEngine: document.getElementById("preferredSearchEngine"),
        buttonsStyle: document.getElementById("buttonsStyle"),
        addDragHandles: document.getElementById("addDragHandles"),
        snapSelectionToWord: document.getElementById("snapSelectionToWord"),
        changeTextSelectionColor: document.getElementById("changeTextSelectionColor"),
        addActionButtonsForTextFields: document.getElementById("addActionButtonsForTextFields"),
        addPasteButton: document.getElementById("addPasteButton"),
        addMarkerButton: document.getElementById("addMarkerButton"),
        customSearchOptionsDisplay: document.getElementById("customSearchOptionsDisplay"),
        secondaryTooltipEnabled: document.getElementById("secondaryTooltipEnabled"),
        secondaryTooltipLayout: document.getElementById("secondaryTooltipLayout"),
    };

    const toggle = (id, condition) => {
        const el = document.getElementById(id);
        if (!el) return;
        const container = el.closest('.option, .child-option, #customStylesSection') || el;
        container.classList.toggle('hidden-option', !condition);
    };

    toggle("convertToCurrency", elements.convertCurrencies?.checked);
    toggle("preferredMetricsSystem", elements.convertMetrics?.checked);
    
    const showTranslate = elements.showTranslateButton?.checked;
    toggle("preferredTranslateService", showTranslate);
    toggle("languageToTranslate", showTranslate);
    toggle("liveTranslation", showTranslate);

    toggle("customStylesSection", elements.useCustomStyle?.checked);
    toggle("multiCopySeparator", elements.enableMultiCopyStack?.checked);
    toggle("customSearchUrl", elements.preferredSearchEngine?.value === 'custom');
    toggle("showButtonLabelOnHover", elements.buttonsStyle?.value === 'onlyicon');
    toggle("dragHandleStyle", elements.addDragHandles?.checked);
    
    const snap = elements.snapSelectionToWord?.checked;
    toggle("disableWordSnappingOnCtrlKey", snap);
    toggle("disableWordSnapForCode", snap);
    toggle("wordSnappingBlacklist", snap);
    
    const customSelection = elements.changeTextSelectionColor?.checked;
    toggle("textSelectionBackground", customSelection);
    toggle("textSelectionColor", customSelection);
    toggle("textSelectionBackgroundOpacity", customSelection);
    toggle("shouldOverrideWebsiteSelectionColor", customSelection);

    const addActionButtonsForTextFields = elements.addActionButtonsForTextFields?.checked;
    toggle("addFontFormatButtons", addActionButtonsForTextFields);
    toggle("addPasteButton", addActionButtonsForTextFields);
    toggle("addPasteOnlyEmptyField", addActionButtonsForTextFields && elements.addPasteButton?.checked);
    toggle("addClearButton", addActionButtonsForTextFields);

    const addMarkerButton = elements.addMarkerButton?.checked;
    toggle("maxMarkerPagesToStore", addMarkerButton);
    toggle("recentMarkersLabel", addMarkerButton);
    toggle("website-markers-list", addMarkerButton);

    const isHoverStyle = elements.customSearchOptionsDisplay?.value === 'hoverCustomSearchStyle';
    const hoverOptions = document.getElementById("hoverSearchPanelOptions");
    if (hoverOptions) hoverOptions.style.display = isHoverStyle ? 'block' : 'none';

    const secondaryTooltipEnabled = elements.secondaryTooltipEnabled?.checked;
    toggle("secondaryTooltipIconSize", secondaryTooltipEnabled);
    toggle("secondaryTooltipLayout", secondaryTooltipEnabled);
    toggle("showSecondaryTooltipTitleOnHover", secondaryTooltipEnabled && elements.secondaryTooltipLayout?.value !== 'verticalLayout');
    toggle("maxIconsInRow", secondaryTooltipEnabled);
}

function setCurrenciesDropdown(savedValue, currencies) {
    let select = document.getElementById('convertToCurrency');
    if (!select) {
        console.error("Selecton: Currency dropdown not found!");
        return;
    }
    
    console.log("Selecton: Populating currency dropdown");
    select.innerHTML = '';
    let initialValue = savedValue || 'USD';

    Object.keys(currencies).forEach(key => {
        let option = document.createElement('option');
        const curr = currencies[key];
        const symbol = curr.symbol;
        option.textContent = key + (symbol ? ` (${symbol})` : '') + ' — ' + curr.name;
        option.value = key;
        select.appendChild(option);
        if (option.value == initialValue) option.selected = true;
    });
}

function setupImportExport(configs) {
    const exportBtn = document.getElementById('exportSettings');
    if (exportBtn) {
        exportBtn.onclick = function () {
            chrome.storage.local.get(null, (items) => {
                const jsonStr = JSON.stringify(items, null, 2);
                const blob = new Blob([jsonStr], {type: "application/json"});
                const url = URL.createObjectURL(blob);
                const element = document.createElement('a');
                element.href = url;
                element.download = 'selecton-settings.json';
                element.style.display = 'none';
                document.body.appendChild(element);
                element.click();
                document.body.removeChild(element);
            });
        };
    }

    const importBtn = document.getElementById('importSettingsBtn');
    const fileInput = document.getElementById('importSettingsInput');

    if (importBtn && fileInput) {
        importBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const importedSettings = JSON.parse(event.target.result);
                    if (importedSettings && typeof importedSettings === 'object') {
                        chrome.storage.local.set(importedSettings, () => location.reload());
                    }
                } catch (error) {
                    console.error("Invalid settings file", error);
                    alert("Failed to import settings: Invalid JSON file.");
                }
            };
            reader.readAsText(file);
        });
    }
}

function renderCustomSearchButtons() {
    const container = document.getElementById('customSearchButtonsContainer');
    if (!container) return;
    container.innerHTML = '';

    customSearchButtonsList.forEach((btn, index) => {
        const row = document.createElement('div');
        row.className = 'custom-search-row';
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.marginBottom = '8px';
        row.style.gap = '5px';
        
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = btn.enabled;
        cb.title = 'Enable/Disable';
        cb.onchange = () => {
            btn.enabled = cb.checked;
            saveCustomSearchButtons();
        };
        
        const img = document.createElement('img');
        img.src = btn.icon || `https://www.google.com/s2/favicons?domain=${getDomain(btn.url)}`;
        img.width = 16;
        img.height = 16;
        
        const titleInput = document.createElement('input');
        titleInput.type = 'text';
        titleInput.value = btn.title;
        titleInput.placeholder = 'Title';
        titleInput.style.width = '80px';
        titleInput.oninput = () => {
            btn.title = titleInput.value;
            saveCustomSearchButtons();
        };

        const urlInput = document.createElement('input');
        urlInput.type = 'text';
        urlInput.value = btn.url;
        urlInput.placeholder = 'URL (%s for query)';
        urlInput.style.flex = '1';
        urlInput.oninput = () => {
            btn.url = urlInput.value;
            saveCustomSearchButtons();
        };

        const upBtn = createMoveBtn('▲', () => moveSearchButton(index, -1));
        const downBtn = createMoveBtn('▼', () => moveSearchButton(index, 1));
        const delBtn = createMoveBtn('✕', () => deleteSearchButton(index));
        delBtn.style.color = '#d9534f';

        row.appendChild(cb);
        row.appendChild(img);
        row.appendChild(titleInput);
        row.appendChild(urlInput);
        row.appendChild(upBtn);
        row.appendChild(downBtn);
        row.appendChild(delBtn);
        
        container.appendChild(row);
    });

    const addBtn = document.createElement('button');
    addBtn.textContent = '+ Add Search Engine';
    addBtn.style.marginTop = '10px';
    addBtn.style.width = '100%';
    addBtn.onclick = addSearchButton;
    container.appendChild(addBtn);
}

function createMoveBtn(text, onClick) {
    const btn = document.createElement('button');
    btn.textContent = text;
    btn.className = 'custom-search-option-move-button';
    btn.style.padding = '2px 6px';
    btn.style.minWidth = '24px';
    btn.onclick = onClick;
    return btn;
}

function getDomain(url) {
    try { return new URL(url).hostname; } catch (e) { return 'google.com'; }
}

function saveCustomSearchButtons() {
    chrome.storage.local.set({ customSearchButtons: customSearchButtonsList });
}

function moveSearchButton(index, direction) {
    if (index + direction < 0 || index + direction >= customSearchButtonsList.length) return;
    const temp = customSearchButtonsList[index];
    customSearchButtonsList[index] = customSearchButtonsList[index + direction];
    customSearchButtonsList[index + direction] = temp;
    saveCustomSearchButtons();
    renderCustomSearchButtons();
}

function deleteSearchButton(index) {
    customSearchButtonsList.splice(index, 1);
    saveCustomSearchButtons();
    renderCustomSearchButtons();
}

function addSearchButton() {
    customSearchButtonsList.push({ enabled: true, title: 'New', url: '', icon: '' });
    saveCustomSearchButtons();
    renderCustomSearchButtons();
}

function renderWebsiteMarkers(markersData) {
    const container = document.getElementById('website-markers-list');
    if (!container) return;
    container.innerHTML = '';

    if (!markersData || Object.keys(markersData).length === 0) {
        container.innerHTML = '<div style="text-align:center; color:gray; padding:10px;">No highlights saved.</div>';
        return;
    }

    Object.keys(markersData).forEach(url => {
        const siteData = markersData[url];
        const markers = siteData.markers || [];
        if (markers.length === 0) return;

        const header = document.createElement('div');
        header.className = 'marker-website-tile';
        header.innerHTML = `
            <img src="https://www.google.com/s2/favicons?domain=${new URL(url).hostname}" class="marker-website-favicon">
            <span style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:12px;">${siteData.title || url}</span>
            <span style="background:#eee; padding:2px 6px; border-radius:10px; font-size:11px;">${markers.length}</span>
        `;
        header.style.display = 'flex';
        header.style.alignItems = 'center';
        header.style.padding = '8px';

        const details = document.createElement('div');
        details.className = 'collapsible-content';
        details.style.marginLeft = '0';
        details.style.borderLeft = 'none';

        header.onclick = () => {
            details.style.maxHeight = details.style.maxHeight ? null : details.scrollHeight + "px";
        };

        markers.forEach((marker, mIndex) => {
            const row = document.createElement('div');
            row.className = 'marker-tile';
            row.innerHTML = `
                <div style="width:10px; height:10px; background:${marker.background}; margin-right:8px; flex-shrink:0;"></div>
                <span style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; cursor:pointer;" title="Open Page">${marker.text}</span>
                <span class="marker-highlight-delete" style="position:static; opacity:1; color:#999; margin-left:8px;">✕</span>
            `;
            row.style.display = 'flex';
            row.style.alignItems = 'center';
            row.querySelector('span[title="Open Page"]').onclick = () => chrome.tabs.create({ url: url });
            row.querySelector('.marker-highlight-delete').onclick = (e) => {
                e.stopPropagation();
                markersData[url].markers.splice(mIndex, 1);
                if (markersData[url].markers.length === 0) delete markersData[url];
                chrome.storage.local.set({ websiteMarkers: markersData }, () => renderWebsiteMarkers(markersData));
            };
            details.appendChild(row);
        });

        container.appendChild(header);
        container.appendChild(details);
    });
}
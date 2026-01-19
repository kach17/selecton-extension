console.log("Selecton: popup.js script started");
let customSearchButtonsList = [];

document.addEventListener("DOMContentLoaded", function () {
    console.log("Selecton: DOMContentLoaded event fired");
    console.log("Selecton: Popup DOMContentLoaded");
    document.getElementById('selecton-settings-label').innerHTML = chrome.i18n.getMessage("selectonSettings") ?? 'Selecton settings';

    let openSettingsInTabButton = document.getElementById('openSettingsInTabButton');
    openSettingsInTabButton.setAttribute('title', chrome.i18n.getMessage("openInNewTab") ?? 'Open in new tab');
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

    // Load saved settings
    chrome.storage.local.get(null, (items) => {
        console.log("Selecton: Storage loaded", items);
        // Resolve globals safely
        const loadedConfigs = (typeof window.configs !== 'undefined') ? window.configs : (typeof configs !== 'undefined' ? configs : {});
        const loadedCurrencies = (typeof window.currenciesList !== 'undefined') ? window.currenciesList : (typeof currenciesList !== 'undefined' ? currenciesList : undefined);

        inputs.forEach(input => {
            if (input.id && items[input.id] !== undefined) {
                if (input.type === 'checkbox') {
                    input.checked = items[input.id];
                } else {
                    input.value = items[input.id];
                }
            }
        });

        // Initialize UI
        if (loadedCurrencies) {
            setCurrenciesDropdown(items.convertToCurrency, loadedCurrencies);
        } else {
            console.error("Selecton: Currencies list not loaded. Check src/data/currencies.js path.");

            const select = document.getElementById('convertToCurrency');
            if (select) {
                select.innerHTML = '<option>Error: Currencies not loaded</option>';
            }
        }

        // Load Custom Search Buttons
        customSearchButtonsList = items.customSearchButtons || (loadedConfigs.customSearchButtons || []);
        renderCustomSearchButtons();

        // Load Website Markers
        renderWebsiteMarkers(items.websiteMarkers);

        updateDisabledOptions();
    });

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
    setupImportExport();

    // Initialize Reset Button
    const resetBtn = document.getElementById('resetDefaults');
    if (resetBtn) {
        resetBtn.onclick = () => {
            if (confirm("Are you sure you want to reset all settings to defaults?")) {
                if (typeof window.configs !== 'undefined') {
                    // Preserve markers, reset everything else
                    chrome.storage.local.get(['websiteMarkers'], (current) => {
                        const defaults = { ...window.configs };
                        if (current.websiteMarkers) defaults.websiteMarkers = current.websiteMarkers;
                        chrome.storage.local.set(defaults, () => location.reload());
                    });
                } else {
                    alert("Cannot reset: Default configs not loaded.");
                }
            }
        };
    }
});

function updateDisabledOptions() {
    // Cache DOM lookups for performance and clarity
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
        
        // Find the parent container that should be hidden/shown and toggle its class
        const container = el.closest('.option, .child-option, #customStylesSection') || el;
        container.classList.toggle('hidden-option', !condition);
    };

    // Dependencies
    toggle("convertToCurrency", elements.convertCurrencies.checked);
    toggle("preferredMetricsSystem", elements.convertMetrics.checked);
    
    const showTranslate = elements.showTranslateButton.checked;
    toggle("preferredTranslateService", showTranslate);
    toggle("languageToTranslate", showTranslate);
    toggle("liveTranslation", showTranslate);

    toggle("customStylesSection", elements.useCustomStyle.checked);
    toggle("multiCopySeparator", elements.enableMultiCopyStack.checked);
    toggle("customSearchUrl", elements.preferredSearchEngine.value === 'custom');
    toggle("showButtonLabelOnHover", elements.buttonsStyle.value === 'onlyicon');
    toggle("dragHandleStyle", elements.addDragHandles.checked);
    
    const snap = elements.snapSelectionToWord.checked;
    toggle("disableWordSnappingOnCtrlKey", snap);
    toggle("disableWordSnapForCode", snap);
    toggle("wordSnappingBlacklist", snap);
    
    const customSelection = elements.changeTextSelectionColor.checked;
    toggle("textSelectionBackground", customSelection);
    toggle("textSelectionColor", customSelection);
    toggle("textSelectionBackgroundOpacity", customSelection);
    toggle("shouldOverrideWebsiteSelectionColor", customSelection);

    // Text Fields
    const addActionButtonsForTextFields = elements.addActionButtonsForTextFields.checked;
    toggle("addFontFormatButtons", addActionButtonsForTextFields);
    toggle("addPasteButton", addActionButtonsForTextFields);
    toggle("addPasteOnlyEmptyField", addActionButtonsForTextFields && elements.addPasteButton.checked);
    toggle("addClearButton", addActionButtonsForTextFields);

    // Markers
    const addMarkerButton = elements.addMarkerButton.checked;
    toggle("maxMarkerPagesToStore", addMarkerButton);
    toggle("recentMarkersLabel", addMarkerButton);
    toggle("website-markers-list", addMarkerButton);

    // Custom Search
    const isHoverStyle = elements.customSearchOptionsDisplay.value === 'hoverCustomSearchStyle';
    const hoverOptions = document.getElementById("hoverSearchPanelOptions");
    if (hoverOptions) hoverOptions.style.display = isHoverStyle ? 'block' : 'none';

    const secondaryTooltipEnabled = elements.secondaryTooltipEnabled.checked;
    toggle("secondaryTooltipIconSize", secondaryTooltipEnabled);
    toggle("secondaryTooltipLayout", secondaryTooltipEnabled);
    toggle("showSecondaryTooltipTitleOnHover", secondaryTooltipEnabled && elements.secondaryTooltipLayout.value !== 'verticalLayout');
    toggle("maxIconsInRow", secondaryTooltipEnabled);
}

function setCurrenciesDropdown(savedValue, currencies) {
    let select = document.getElementById('convertToCurrency');
    if (!select) {
        console.error("Selecton: Currency dropdown element 'convertToCurrency' not found!");
        return;
    }
    
    console.log("Selecton: Populating currency dropdown with " + Object.keys(currencies).length + " items.");
    select.innerHTML = '';
    let initialValue = savedValue || 'USD';

    Object.keys(currencies).forEach(key => {
        let option = document.createElement('option');
        const currencySymbol = currencies[key]['currencySymbol'] || currencies[key]['symbol'];
        option.textContent = key + (currencySymbol == undefined ? '' : ` (${currencySymbol})`) + ' — ' + (currencies[key]['currencyName'] || currencies[key]['name']);
        option.setAttribute('value', key);
        select.appendChild(option);

        if (option.value == initialValue) option.selected = true;
    });
}

function setupImportExport() {
    // Export Logic
    const exportBtn = document.getElementById('exportSettings');
    if (exportBtn) {
        exportBtn.onclick = function () {
            chrome.storage.local.get(null, (items) => {
                const jsonStr = JSON.stringify(items, null, 2);
                const blob = new Blob([jsonStr], {type: "application/json"});
                const url = URL.createObjectURL(blob);
                
                const element = document.createElement('a');
                element.setAttribute('href', url);
                element.setAttribute('download', 'selecton-settings.json');
                element.style.display = 'none';
                document.body.appendChild(element);
                element.click();
                document.body.removeChild(element);
            });
        };
    }

    // Import Logic (Better Workflow)
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
                        chrome.storage.local.set(importedSettings, () => {
                            // Reload to apply changes
                            location.reload();
                        });
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

// --- Custom Search Buttons Logic ---

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
        
        // Checkbox
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = btn.enabled;
        cb.title = 'Enable/Disable';
        cb.onchange = () => {
            btn.enabled = cb.checked;
            saveCustomSearchButtons();
        };
        
        // Icon
        const img = document.createElement('img');
        img.src = btn.icon || `https://www.google.com/s2/favicons?domain=${getDomain(btn.url)}`;
        img.width = 16;
        img.height = 16;
        
        // Title
        const titleInput = document.createElement('input');
        titleInput.type = 'text';
        titleInput.value = btn.title;
        titleInput.placeholder = 'Title';
        titleInput.style.width = '80px';
        titleInput.oninput = () => {
            btn.title = titleInput.value;
            saveCustomSearchButtons();
        };

        // URL
        const urlInput = document.createElement('input');
        urlInput.type = 'text';
        urlInput.value = btn.url;
        urlInput.placeholder = 'URL (%s for query)';
        urlInput.style.flex = '1';
        urlInput.oninput = () => {
            btn.url = urlInput.value;
            saveCustomSearchButtons();
        };

        // Controls
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

    // Add New Button
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

// --- Website Markers Logic ---

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

        // Header
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

        // Details
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
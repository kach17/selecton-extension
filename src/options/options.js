/// TODO: 
/// 1. On Firefox, using options page as a popup causes a bug - color picker closes the popup on init, and therefore selected color isn't saved
/// Those are used on settings page

let userConfigs, importedConfigs, isSafari = false;
const settingsHeaders = [];
const expandedSettingsSections = [];
let exportFileName = 'selecton-settings.json';
var keys = Object.keys(configs);
let markersData;
function loadSettings() {
    /// Load expanded sections list
    chrome.storage.local.get(['expandedSettingsSections'], function (val) {
        if (val.expandedSettingsSections !== null && val.expandedSettingsSections !== undefined)
            val.expandedSettingsSections.forEach(function (v) {
                expandedSettingsSections.push(v);
            })
    });

    /// Fix for older browsers
    if (!String.prototype.replaceAll) {
        String.prototype.replaceAll = function (search, replacement) {
            return this.replace(new RegExp(search, 'g'), replacement);
        };
    }

    isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    if (isSafari) {
        document.querySelector("#showUpdateNotification").parentNode.parentNode.style.display = 'none';
    }

    /// Load configs
    chrome.storage.local.get(keys, setInputs);

    /// Set options page
    setVersionLabel();
    setImportExportButtons();

    setTimeout(function () {
        chrome.storage.local.get(['websiteMarkers'], function (value) {
            setMarkerSection(value);
        });
    }, 15)
}

function setInputs(result) {
    userConfigs = result;

    keys.forEach(function (key) {
        let input = document.getElementById(key.toString());

        /// Set input value
        if (input !== null && input !== undefined) {
            if (input.type == 'checkbox') {
                if ((result[key] !== null && result[key] == true) || (result[key] == null && configs[key] == true))
                    input.setAttribute('checked', 0);
                else input.removeAttribute('checked', 0);
            } else if (input.tagName == 'SELECT') {
                let options = input.querySelectorAll('option');
                if (options !== null)
                    options.forEach(function (option) {
                        let selectedValue = result[key] ?? configs[key];
                        if (option.value == selectedValue) option.setAttribute('selected', true);

                        try {
                            if (chrome.i18n.getMessage(option.innerHTML) != '')
                                option.innerHTML = chrome.i18n.getMessage(option.innerHTML);
                            else if (chrome.i18n.getMessage(option['value']) != '')
                                option.innerHTML = chrome.i18n.getMessage(option['value']);
                        } catch (e) { }

                    });
            } else {
                input.setAttribute('value', result[key] ?? configs[key]);
            }

            /// Set translated label for input
            if (!input.parentNode.innerHTML.includes(chrome.i18n.getMessage(key))) {
                if (input.tagName == 'SELECT' || input.id == 'excludedDomains' || input.id == 'wordSnappingBlacklist')
                    input.parentNode.innerHTML = chrome.i18n.getMessage(key) + ':   ' + input.parentNode.innerHTML;
                else
                    input.parentNode.innerHTML += chrome.i18n.getMessage(key);
            }

            input = document.querySelector('#' + key.toString());

            /// Set event listener
            input.addEventListener("input", function (e) {
                let id = input.getAttribute('id');
                let inputValue = input.getAttribute('type') == 'checkbox' ? input.checked : input.value;
                userConfigs[id] = inputValue;

                saveAllSettings();
                updateDisabledOptions();
            });

        }
    });

    /// Set custom style for 'Excluded domains' textfields
    var excludedDomainsTextfields = document.querySelectorAll("#excludedDomains, #wordSnappingBlacklist");
    excludedDomainsTextfields.forEach(function (excludedDomainsTextfield) {
        excludedDomainsTextfield.setAttribute('placeholder', 'example.com, another.example.com');
        excludedDomainsTextfield.style.maxWidth = '200px';
    });

    setTranslatedLabels();

    updateDisabledOptions();

    setCurrenciesDropdown();

    enhanceUiInputs();

    setTimeout(function () {
        loadCustomSearchButtons();

        setTimeout(function (e) {
            setCollapsibleHeaders();
        }, 100);

    }, 1);

}

function setImportExportButtons() {
    /// Export settings
    const exportNameInput = document.getElementById('exportName');

    if (isSafari) {
        exportNameInput.style.visibility = 'hidden';
        exportNameInput.style.width = '1px';

        let exportNote = document.createElement('span');
        exportNote.innerText = chrome.i18n.getMessage('fallbackExportLabel');
        exportNameInput.parentNode.prepend(exportNote);
    } else {
        exportNameInput.onchange = function () {
            exportFileName = exportNameInput.value;
        }
    }

    document.getElementById('exportSettings').onclick = function () {
        if (markersData) userConfigs['websiteMarkers'] = markersData;
        // chrome.runtime.sendMessage({ type: 'selecton-export-configs', configs: !userConfigs ? {} : userConfigs, name: exportFileName });
        const filename = exportFileName ?? 'selecton-settings.json';
        const jsonStr = JSON.stringify(!userConfigs ? {} : userConfigs);

        if (/^((?!chrome|android).)*safari/i.test(navigator.userAgent)) {
            /// Safari-specific method, until 'download' attribute is properly supported
            window.open('data:text/plain;charset=utf-8,' + encodeURIComponent(jsonStr));
        } else {
            let element = document.createElement('a');
            element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(jsonStr));
            element.setAttribute('download', filename);
            element.style.display = 'none';
            element.style.position = 'absolute';
            document.body.appendChild(element);
            element.click();
            element.remove();
        }
    }

    /// Import settings
    const fileSelector = document.getElementById('importSettings');
    const importSettingsConfirmButton = document.getElementById('importSettingsButton');
    disableImportButton();

    importedConfigs = null;

    fileSelector.addEventListener('change', (event) => {
        const reader = new FileReader();
        reader.addEventListener('load', (event) => {
            const result = event.target.result;
            importedConfigs = JSON.parse(result);

            if (importedConfigs != null && importedConfigs !== undefined) {
                enableImportButton();
            }
        });
        reader.readAsText(event.target.files[0]);
    });

    importSettingsConfirmButton.addEventListener('click', function () {

        /// Confirm prompt is disabled here, as on Chrome-based browsers, when options page is open fullscreen,
        /// it doesn't work due to the Chromium bug:
        /// https://bugs.chromium.org/p/chromium/issues/detail?id=476350
        /// and I was too lazy to come up with other way to display warning prompt

        // if (window.confirm(chrome.i18n.getMessage("importAlert"))) {

        /// restore configs
        userConfigs = importedConfigs;
        setInputs(importedConfigs);
        saveAllSettings();

        /// disable import button
        const fileSelector = document.getElementById('importSettings');
        fileSelector.value = null;
        disableImportButton();

        /// restore markers
        let restoredMarkers = importedConfigs['websiteMarkers'];
        if (restoredMarkers) {
            chrome.storage.local.set({ 'websiteMarkers': restoredMarkers });
            setMarkerSection({ 'websiteMarkers': restoredMarkers });
        }

        // }
    });

    function enableImportButton() {
        importSettingsConfirmButton.disabled = false;
        importSettingsConfirmButton.title = '';
    }

    function disableImportButton() {
        importSettingsConfirmButton.disabled = true;
        importSettingsConfirmButton.title = chrome.i18n.getMessage('chooseFileFirst');
    }
}

function setTranslatedLabels() {
    /// Set translated headers
    document.querySelector("#importSettingsLabel").innerHTML = chrome.i18n.getMessage("importSettingsLabel");
    document.querySelector("#exportSettingsLabel").innerHTML = chrome.i18n.getMessage("exportSettingsLabel");
    document.querySelector("#exportSettingsNote").innerHTML = chrome.i18n.getMessage("exportSettingsNote");
    document.querySelector("#dictionaryButtonRemark").innerHTML = chrome.i18n.getMessage("dictionaryButtonRemark");
    document.querySelector("#quoteButtonRemark").innerHTML = chrome.i18n.getMessage("quoteButtonRemark");

    document.querySelector("#appearanceHeader").innerHTML += chrome.i18n.getMessage("appearanceHeader");
    document.querySelector("#behaviorHeader").innerHTML += chrome.i18n.getMessage("behaviorHeader");
    document.querySelector("#highlightHeader").innerHTML += chrome.i18n.getMessage("markersLabel");
    document.querySelector("#textFieldsHeader").innerHTML += chrome.i18n.getMessage("textFieldsHeader");
    document.querySelector("#convertionHeader").innerHTML += chrome.i18n.getMessage("convertionHeader");
    document.querySelector("#actionButtonsHeader").innerHTML += chrome.i18n.getMessage("contextualButtonsHeader");
    document.querySelector("#selectionHeader").innerHTML += chrome.i18n.getMessage("selectionHeader");
    document.querySelector("#customSearchTooltip").innerHTML += chrome.i18n.getMessage("customSearchTooltip");
    document.querySelector("#exportImportSettings").innerHTML += chrome.i18n.getMessage("exportImportSettings");

    // document.querySelector("#customSearchTooltipHint").innerHTML = chrome.i18n.getMessage("customSearchTooltipHint").replaceAll('<br/>', '<br/> •  ');
    document.querySelector("#customSearchTooltipHint").innerHTML = chrome.i18n.getMessage("customSearchTooltipHint");
    document.querySelector("#customSearchButtonsHeader").innerText = chrome.i18n.getMessage("customSearchButtonsHeader");
    document.querySelector("#addActionButtonsForTextFields").parentNode.parentNode.setAttribute('title', chrome.i18n.getMessage("disableForBetterPerformance"));
    document.querySelector("#liveTranslation").parentNode.parentNode.setAttribute('title', chrome.i18n.getMessage("disableForBetterPerformance"));
    document.getElementById('recentMarkersLabel').innerText = chrome.i18n.getMessage('recentMarkersLabel');
    document.getElementById('testPageButton').innerText = chrome.i18n.getMessage('testPageButton');
    // document.getElementById('markerHintHeader').innerText = chrome.i18n.getMessage('markerHint');

    /// Change CTRL key label on macs
    if (isSafari) {
        let k = document.querySelector("#disableWordSnappingOnCtrlKey");
        k.parentNode.innerHTML = k.parentNode.innerHTML.replaceAll('CTRL', '⌘cmd');
    }

    /// "All changes saved automatically" block
    let hintEl = document.querySelector("#allChangesSavedAutomaticallyHeader");
    hintEl.innerHTML = chrome.i18n.getMessage("allChangesSavedAutomatically");
    hintEl.innerHTML += '.<br />';
    hintEl.innerHTML += chrome.i18n.getMessage("updatePageToSeeChanges");

    /// Translate footer buttons
    document.querySelector("#githubButton").innerHTML = chrome.i18n.getMessage("visitGithub") + document.querySelector("#githubButton").innerHTML;
    document.querySelector("#writeAReviewButton").style.display = 'none';
    document.querySelector("#donateButton").style.display = 'none';

    document.querySelector("#exportSettings").innerHTML = chrome.i18n.getMessage("export");
    document.querySelector("#importSettingsButton").innerHTML = chrome.i18n.getMessage("import");
}

function setVersionLabel() {
    let label = document.getElementById('selecton-version');
    var manifestData = chrome.runtime.getManifest();
    label.innerHTML = 'Selecton ' + manifestData.version + ` (<a target='_blank' href='https://github.com/kach17/selecton-extension/blob/master/CHANGELOG.md'>${chrome.i18n.getMessage("whatsNew") ?? "What's new"}</a>)`;
}

function updateDisabledOptions() {
    /// Grey out unavailable optoins
    document.getElementById("all-options-container").className = document.getElementById("enabled").checked ? 'enabled-option' : 'hidden-option';

    const toggle = (id, condition) => {
        const el = document.getElementById(id);
        if (!el) return;
        
        let target = el.closest('.option');
        if (!target) target = el; // Fallback
        
        // Handle containers that are not .option
        if (target.id === 'customStylesSection' || target.id === 'customSearchButtonsContainer') {
             target.className = condition ? 'enabled-option' : 'hidden-option';
             return;
        }

        if (condition) {
            target.classList.remove('hidden-option', 'disabled-option');
            target.classList.add('enabled-option');
        } else {
            target.classList.remove('enabled-option');
            target.classList.add('hidden-option');
        }
    };

    toggle("convertToCurrencyDropdown", document.getElementById("convertCurrencies").checked);
    toggle("preferredMetricsSystem", document.getElementById("convertMetrics").checked);
    toggle("languageToTranslate", document.getElementById("showTranslateButton").checked);
    
    const useCustomStyle = document.getElementById("useCustomStyle").checked;
    toggle("customStylesSection", useCustomStyle);
    
    toggle("fullOpacityOnHover", document.getElementById("tooltipOpacity").value < 1.0);
    toggle("shadowOpacity", document.getElementById("addTooltipShadow").checked);
    
    const changeTextSelectionColor = document.getElementById("changeTextSelectionColor").checked;
    toggle("textSelectionBackground", changeTextSelectionColor);
    toggle("textSelectionColor", changeTextSelectionColor);
    toggle("textSelectionBackgroundOpacity", changeTextSelectionColor);
    toggle("shouldOverrideWebsiteSelectionColor", changeTextSelectionColor);
    
    toggle("preferredNewEmailMethod", document.getElementById("showEmailButton").checked);
    toggle("preferredMapsService", document.getElementById("showOnMapButtonEnabled").checked);
    
    const secondaryTooltipEnabled = document.getElementById("secondaryTooltipEnabled").checked;
    toggle("secondaryTooltipIconSize", secondaryTooltipEnabled);
    toggle("secondaryTooltipLayout", secondaryTooltipEnabled);
    
    toggle("preferCurrencySymbol", document.getElementById("convertCurrencies").checked);
    
    const snapSelectionToWord = document.getElementById("snapSelectionToWord").checked;
    toggle("disableWordSnappingOnCtrlKey", snapSelectionToWord);
    toggle("wordSnappingBlacklist", snapSelectionToWord);
    toggle("disableWordSnapForCode", snapSelectionToWord);
    
    const addActionButtonsForTextFields = document.getElementById("addActionButtonsForTextFields").checked;
    const addPasteButton = document.getElementById("addPasteButton").checked;
    
    toggle("addPasteOnlyEmptyField", addPasteButton && addActionButtonsForTextFields);
    toggle("addFontFormatButtons", addActionButtonsForTextFields);
    toggle("addPasteButton", addActionButtonsForTextFields);
    
    const showTranslateButton = document.getElementById("showTranslateButton").checked;
    toggle("liveTranslation", showTranslateButton);
    toggle("hideTranslateButtonForUserLanguage", showTranslateButton);
    toggle("showTranslateIfLanguageUnknown", showTranslateButton && document.getElementById("hideTranslateButtonForUserLanguage").checked);
    toggle("preferredTranslateService", showTranslateButton);
    
    toggle("updateRatesEveryDays", document.getElementById("convertCurrencies").checked);
    
    toggle("customSearchButtonsContainer", secondaryTooltipEnabled);
    
    const showDictionaryButton = document.getElementById("showDictionaryButton").checked;
    toggle("dictionaryButtonWordsAmount", showDictionaryButton);
    toggle("dictionaryButtonResponseCharsAmount", showDictionaryButton);
    
    const collapseButtons = document.getElementById("collapseButtons").checked;
    toggle("maxTooltipButtonsToShow", collapseButtons);
    toggle("collapseAsSecondPanel", collapseButtons);
    toggle("correctTooltipPositionByMoreButtonWidth", collapseButtons && !document.getElementById("collapseAsSecondPanel").checked);
    
    const pasteOnlyEmpty = document.getElementById("addPasteOnlyEmptyField").checked;
    toggle("addClearButton", !pasteOnlyEmpty && addPasteButton && addActionButtonsForTextFields);
    
    toggle("hideTooltipWhenCursorMovesAway", document.getElementById("tooltipPosition").value == 'overCursor');
    toggle("dragHandleStyle", document.getElementById("addDragHandles").checked);
    toggle("floatingOffscreenTooltip", document.getElementById("recreateTooltipAfterScroll").checked);
    
    const addMarkerButton = document.getElementById("addMarkerButton").checked;
    toggle("maxMarkerPagesToStore", addMarkerButton);
    toggle("recentMarkersLabel", addMarkerButton);
    toggle("website-markers-list", addMarkerButton);

    const multiCopyEl = document.getElementById("multiCopySeparator");
    if (multiCopyEl) toggle("multiCopySeparator", document.getElementById("enableMultiCopyStack").checked);

    toggle("customSearchUrl", document.getElementById("preferredSearchEngine").value == 'custom');
    toggle("showButtonLabelOnHover", document.getElementById("buttonsStyle").value == 'onlyicon');
    toggle("tooltipInvertedBackground", document.getElementById("invertColorOnDarkWebsite").checked);
    
    const secondaryTooltipLayout = document.getElementById("secondaryTooltipLayout").value;
    const showTitleCondition = secondaryTooltipEnabled && secondaryTooltipLayout != 'verticalLayout';
    toggle("showSecondaryTooltipTitleOnHover", showTitleCondition);
    toggle("maxIconsInRow", showTitleCondition);
    
    toggle("hoverSearchPanelOptions", document.getElementById("customSearchOptionsDisplay").value != 'panelCustomSearchStyle');

    /// Hide language detection option if current browser doesn't support it
    if (!chrome.i18n.detectLanguage) {
        toggle("hideTranslateButtonForUserLanguage", false);
        toggle("showTranslateIfLanguageUnknown", false);
    }
}

function setCollapsibleHeaders() {
    let coll = document.getElementsByClassName("collapsible-header");

    for (let i = 0, l = coll.length; i < l; i++) {
        const c = coll[i];

        /// Make section initially expanded
        if (expandedSettingsSections.includes(c.id)) {
            const it = coll[i];
            it.classList.toggle("active");
            let content = it.nextElementSibling;
            content.style.maxHeight = content.scrollHeight + "px";
        }

        c.onclick = function () {
            this.classList.toggle("active");
            let content = this.nextElementSibling;
            if (content.style.maxHeight) {
                /// Collapse
                content.style.maxHeight = null;
                let indexInArray = expandedSettingsSections.indexOf(this.id);
                if (indexInArray > -1) {
                    expandedSettingsSections.splice(indexInArray, 1);
                }
            } else {
                /// Expand
                content.style.maxHeight = content.scrollHeight + "px";
                if (!expandedSettingsSections.includes(this.id))
                    expandedSettingsSections.push(this.id);
            }
            saveExpandedSections();
        }
    }
}

/// Configure additional elements
function setCurrenciesDropdown() {
    chrome.storage.local.get(['convertToCurrency'], function (result) {
        let initialValue = result.convertToCurrency || 'USD';
        let select = document.getElementById('convertToCurrencyDropdown');

        Object.keys(currenciesList).forEach((function (key) {
            let option = document.createElement('option');
            const currencySymbol = currenciesList[key]['currencySymbol'] || currenciesList[key]['symbol'];
            option.innerHTML = key + (currencySymbol == undefined ? '' : ` (${currencySymbol})`) + ' — ' + (currenciesList[key]['currencyName'] || currenciesList[key]['name']);
            option.setAttribute('value', key);
            select.appendChild(option);

            if (option.value == initialValue) option.setAttribute('selected', true);
        }));

        select.parentNode.innerHTML = chrome.i18n.getMessage('convertToCurrency') + '<br />' + select.parentNode.innerHTML;

        setTimeout(function () {
            document.getElementById('convertToCurrencyDropdown').addEventListener("input", function (e) {
                let selectInput = document.getElementById('convertToCurrencyDropdown');
                chrome.storage.local.set({ 'convertToCurrency': selectInput.value.split(' — ')[0] });
            });
        }, 300);
    });
}

var customSearchButtonsList;

function loadCustomSearchButtons() {
    chrome.storage.local.get(['customSearchButtons'], function (value) {
        customSearchButtonsList = value.customSearchButtons ?? configs.customSearchButtons;

        generateCustomSearchButtonsList();
    });
}

function generateCustomSearchButtonsList() {
    var container = document.getElementById('customSearchButtonsContainer');
    container.innerHTML = '';

    for (var i = 0; i < customSearchButtonsList.length; i++) {
        var item = customSearchButtonsList[i];

        let entry = document.createElement('div');
        entry.setAttribute('class', 'option');
        entry.setAttribute('style', 'margin: 8px 0px;');

        if (item['enabled'] == false)
            entry.style.opacity = 0.7;
        else
            entry.style.opacity = 1.0;

        /// Enabled checkbox
        let checkbox = document.createElement('input');
        checkbox.setAttribute('type', 'checkbox');
        checkbox.setAttribute('title', 'On/off');
        checkbox.setAttribute('style', 'pointer: cursor; vertical-align: middle !important;');
        checkbox.value = item['enabled'];
        if (item['enabled'])
            checkbox.setAttribute('checked', 0);
        else checkbox.removeAttribute('checked', 0);
        checkbox.setAttribute('id', 'checkbox' + i.toString());
        checkbox.addEventListener("input", function (e) {
            customSearchButtonsList[parseInt(this.id.replaceAll('checkbox', ''))]['enabled'] = this.checked;
            saveCustomSearchButtons();

            if (this.checked)
                entry.style.opacity = 1.0;
            else
                entry.style.opacity = 0.7;
        });
        entry.appendChild(checkbox);

        /// Create favicon preview
        let imgButton = document.createElement('img');
        let icon = item['icon'];
        imgButton.setAttribute('src', icon !== null && icon !== undefined && icon !== '' ? icon : 'https://www.google.com/s2/favicons?domain=' + item['url'].split('/')[2])
        imgButton.setAttribute('width', '18px');
        imgButton.setAttribute('height', '18px');
        imgButton.setAttribute('loading', 'lazy');
        imgButton.setAttribute('style', 'margin-left: 3px; padding: 1px; vertical-align: middle !important;min-width:18px !important;');
        entry.appendChild(imgButton);

        /// Title field
        let title = document.createElement('input');
        title.setAttribute('type', 'text');
        title.setAttribute('placeholder', 'Title');
        title.setAttribute('style', 'margin-left: 3px; min-width: 100px; margin-bottom: 3px; display: inline;');
        title.value = item['title'];
        title.setAttribute('id', 'title' + i.toString());
        title.addEventListener("input", function (e) {
            customSearchButtonsList[parseInt(this.id.replaceAll('title', ''))]['title'] = this.value;
            saveCustomSearchButtons();
        });
        entry.appendChild(title);

        /// 'Use google icon' switch
        let useGoogleIconSwitch = document.createElement('input');
        useGoogleIconSwitch.setAttribute('type', 'checkbox');
        useGoogleIconSwitch.setAttribute('id', 'useCustomIcon' + i.toString());

        let switched = item['icon'] !== null && item['icon'] !== undefined;
        if (switched == false)
            useGoogleIconSwitch.setAttribute('checked', 0);

        let label = document.createElement('label');
        label.appendChild(useGoogleIconSwitch);

        setTimeout(function () {
            label.addEventListener('change', function (e) {
                let currentIcon = customSearchButtonsList[parseInt(this.firstChild.id.replaceAll('useCustomIcon', ''))]['icon'];

                if (currentIcon !== null && currentIcon !== undefined) {
                    customSearchButtonsList[parseInt(this.firstChild.id.replaceAll('useCustomIcon', ''))]['icon'] = null;
                } else {
                    customSearchButtonsList[parseInt(this.firstChild.id.replaceAll('useCustomIcon', ''))]['icon'] = '';
                }
                saveCustomSearchButtons();
                generateCustomSearchButtonsList();
            });
        }, 1);

        label.innerHTML += chrome.i18n.getMessage("useIconFromGoogle");
        label.setAttribute('style', 'padding-right: 3px; display: inline; float: right; max-width: 60%;');
        entry.appendChild(label);

        /// URL field
        let urlInputDiv = document.createElement('div');

        var urlInput = document.createElement('input');
        urlInput.setAttribute('type', 'text');
        urlInput.setAttribute('placeholder', 'URL');
        urlInput.setAttribute('title', 'URL');
        urlInput.setAttribute('class', 'custom-search-option-url-input');
        urlInput.value = item['url'];
        urlInput.setAttribute('id', 'url' + i.toString());
        urlInput.addEventListener("input", function (e) {
            customSearchButtonsList[parseInt(this.id.replaceAll('url', ''))]['url'] = this.value;
            saveCustomSearchButtons();
        });
        urlInputDiv.appendChild(urlInput);

        entry.appendChild(urlInputDiv);

        /// Custom icon URL field
        if (item['icon'] !== null && item['icon'] !== undefined) {
            var iconInputDiv = document.createElement('div');

            /// Custom icon URL field
            var iconInput = document.createElement('input');
            iconInput.setAttribute('type', 'text');
            iconInput.setAttribute('placeholder', chrome.i18n.getMessage("customIconUrl"));
            iconInput.setAttribute('class', 'custom-search-option-icon-input');
            iconInput.setAttribute('title', chrome.i18n.getMessage("customIconUrl"));
            iconInput.setAttribute('id', 'icon' + i.toString());
            iconInput.value = item['icon'];
            iconInput.addEventListener("input", function (e) {
                customSearchButtonsList[parseInt(this.id.replaceAll('icon', ''))]['icon'] = this.value;
                saveCustomSearchButtons();

                generateCustomSearchButtonsList();
            });
            iconInputDiv.appendChild(iconInput);

            entry.appendChild(iconInputDiv);
        }

        /// Move up/down buttons
        var moveButtonsContainer = document.createElement('div');
        moveButtonsContainer.setAttribute('style', ' display: inline;');

        var moveUpButton = document.createElement('button');
        moveUpButton.textContent = 'ᐱ';
        moveUpButton.setAttribute('id', 'moveup' + i.toString());
        moveUpButton.className = 'custom-search-option-move-button';
        moveUpButton.setAttribute('title', chrome.i18n.getMessage("moveUpLabel"));
        moveUpButton.onmouseup = function () {
            var currentIndex = parseInt(this.id.replaceAll('moveup', ''), 10);
            if (currentIndex > 0) {
                var movedItem = customSearchButtonsList[currentIndex];
                customSearchButtonsList.splice(currentIndex, 1);
                customSearchButtonsList.splice(currentIndex - 1, 0, movedItem);
                saveCustomSearchButtons();
                generateCustomSearchButtonsList();
            }
        };

        var moveDownButton = document.createElement('button');
        moveDownButton.textContent = 'ᐯ';
        moveDownButton.setAttribute('id', 'movedown' + i.toString());
        moveDownButton.className = 'custom-search-option-move-button';
        moveDownButton.setAttribute('title', chrome.i18n.getMessage("moveDownLabel"));
        moveDownButton.onmouseup = function () {
            var currentIndex = parseInt(this.id.replaceAll('movedown', ''), 10);
            if (currentIndex < customSearchButtonsList.length) {
                var movedItem = customSearchButtonsList[currentIndex];
                customSearchButtonsList.splice(currentIndex, 1);
                customSearchButtonsList.splice(currentIndex + 1, 0, movedItem);
                saveCustomSearchButtons();
                generateCustomSearchButtonsList();
            }
        };
        moveButtonsContainer.appendChild(moveUpButton);
        moveButtonsContainer.appendChild(moveDownButton);
        entry.appendChild(moveButtonsContainer);

        /// Delete button
        var deleteButton = document.createElement('button');
        deleteButton.textContent = chrome.i18n.getMessage("deleteLabel");
        deleteButton.setAttribute('style', ' float: right;display: inline-block; max-width: 100px;');
        deleteButton.setAttribute('id', 'delete' + i.toString());
        deleteButton.onmouseup = function () {
            var index = parseInt(this.id.replaceAll('delete', ''));
            if (customSearchButtonsList[index] !== null && customSearchButtonsList[index] !== undefined) {
                customSearchButtonsList.splice(parseInt(this.id.replaceAll('delete', ''), 10), 1);
                saveCustomSearchButtons();
                generateCustomSearchButtonsList();
            }

        };
        entry.appendChild(deleteButton);

        container.appendChild(entry);
    }

    var addButton = document.createElement('button');
    addButton.textContent = chrome.i18n.getMessage("addNewSearchOption") + ' ＋';
    addButton.setAttribute('style', 'max-width: 99%;')
    addButton.onmouseup = function () {
        customSearchButtonsList.push({
            'url': '',
            'title': '',
            'enabled': true,
            // 'icon': ''
        });
        saveCustomSearchButtons();
        generateCustomSearchButtonsList();

        /// Increase max height of collapsible section
        let customSearchConfigs = document.getElementById('customSearchTooltip');
        let content = customSearchConfigs.nextElementSibling;
        content.style.maxHeight = content.scrollHeight + "px";

    };
    container.appendChild(addButton);
}

function saveCustomSearchButtons() {
    chrome.storage.local.set({ 'customSearchButtons': customSearchButtonsList });
}

function saveExpandedSections() {
    chrome.storage.local.set({ 'expandedSettingsSections': expandedSettingsSections });
}

function saveAllSettings() {
    chrome.storage.local.set(userConfigs);
}

const expandedMarkerSections = [];

function setMarkerSection(value) {
    if (!value) return;
    let container = document.getElementById('website-markers-list');

    markersData = value['websiteMarkers'];
    if (!markersData) return;
    let markerKeys = Object.keys(markersData);

    if (!markersData || markerKeys.length == 0) {
        container.innerText = '—';
        return;
    }

    container.innerText = null;

    /// sort pages by timeUpdated
    markerKeys.sort(function (a, b) {
        return a.timeUpdated > b.timeUpdated ? 1 : -1;
    });

    markerKeys.forEach(function (url) {
        /// create website tile
        let tile = document.createElement('div');
        tile.className = 'option marker-website-tile';

        let favicon = document.createElement('img');
        favicon.className = 'marker-website-favicon';
        favicon.height = '15px';
        favicon.width = '15px';
        favicon.src = 'https://www.google.com/s2/favicons?domain=' + url.split('/')[2];
        tile.appendChild(favicon);

        let link = document.createElement('span');
        let title = markersData[url]['title'];
        link.innerText = title ?? url;
        if (title)
            link.title = url;
        // if (url == window.location.href) link.style.color = 'blue';
        tile.appendChild(link);

        container.appendChild(tile);

        /// expand if previously expanded
        if (expandedMarkerSections.includes(url)) {
            setTimeout(function () {
                let content = tile.nextElementSibling;
                content.style.maxHeight = content.scrollHeight + "px";
            }, 50)
        }

        /// create markers
        let markersContainer = document.createElement('div');
        markersContainer.className = 'collapsible-content';
        markersContainer.style.marginLeft = '20px';
        markersContainer.style.marginBottom = '10px';

        let websiteMarkers = markersData[url]['markers'];

        /// add counter
        let counter = document.createElement('div');
        counter.className = 'markers-counter-circle';
        counter.textContent = websiteMarkers.length;
        tile.appendChild(counter);

        /// sort markers by dateAdded
        websiteMarkers.sort(function (a, b) {
            return a.dateAdded > b.dateAdded ? -1 : 1;
        });

        /// append tiles for each marker
        for (let i = 0, websiteMarkersLength = websiteMarkers.length; i < websiteMarkersLength; i++) {
            const marker = websiteMarkers[i], tile = document.createElement('div');
            tile.className = 'option marker-tile';

            /// color preview
            const colorCircle = document.createElement('div');
            colorCircle.setAttribute('class', 'marker-color-preview');
            colorCircle.style.background = marker.background;
            tile.appendChild(colorCircle);

            /// set text
            tile.innerHTML += marker.text;

            /// show time added on hover
            if (marker.timeAdded)
                tile.title = new Date(marker.timeAdded).toLocaleString();

            /// append delete button
            let deleteButton = document.createElement('div');
            deleteButton.className = 'marker-highlight-delete';
            deleteButton.innerText = '✕';
            deleteButton.title = chrome.i18n.getMessage('deleteLabel');
            tile.appendChild(deleteButton);

            deleteButton.onclick = async function (e) {
                e.stopPropagation();

                // remove data
                const indexOfMarker = websiteMarkers.indexOf(marker);
                if (indexOfMarker > -1) websiteMarkers.splice(indexOfMarker, 1);
                markersData[url]['markers'] = websiteMarkers;
                if (websiteMarkers.length <= 0)
                    delete markersData[url];

                /// save updated markers
                try {
                    chrome.storage.local.set({ 'websiteMarkers': markersData });
                } catch (e) {
                    alert(e);
                }

                /// Recreate the view
                setTimeout(function () {
                    container.innerHTML = '';
                    setMarkerSection({ 'websiteMarkers': markersData });
                }, 5);
            }

            markersContainer.appendChild(tile);

            if (i !== websiteMarkersLength - 1)
                markersContainer.appendChild(document.createElement('hr'));

            /// add click listener
            tile.onclick = function () {
                /// open page, and scroll to selected marker

                chrome.tabs.create({ url: url, active: true }, async tab => {
                    let timeoutToDispatch, isTabLoaded = false, timeout = 5000;

                    chrome.tabs.onUpdated.addListener(onTabLoad);

                    timeoutToDispatch = setTimeout(function () {
                        if (isTabLoaded) return;
                        chrome.tabs.onUpdated.removeListener(onTabLoad);
                    }, timeout);

                    function onTabLoad(tabId, info) {
                        if (info.status === 'complete' && tabId === tab.id) {
                            chrome.tabs.onUpdated.removeListener(onTabLoad);
                            isTabLoaded = true;
                            clearTimeout(timeoutToDispatch);

                            chrome.tabs.sendMessage(
                                tabId,
                                { command: "selecton-scroll-to-marker-message:" + marker.hintDy.toString() }
                            ).then(response => { }).catch(error => { });
                        }
                    }
                });
            }
        }
        // );

        container.appendChild(markersContainer);

        /// set expand/collapse on hover
        tile.onclick = function () {
            // this.classList.toggle("active");
            let content = markersContainer;
            if (content.style.maxHeight) {
                /// Collapse
                content.style.maxHeight = null;

                let indexInArray = expandedMarkerSections.indexOf(url);
                if (indexInArray > -1) {
                    expandedMarkerSections.splice(indexInArray, 1);
                }
            } else {
                if (!expandedMarkerSections.includes(url))
                    expandedMarkerSections.push(url);

                /// Expand
                content.style.maxHeight = content.scrollHeight + "px";
                setTimeout(function () {
                    tile.parentNode.parentNode.style.maxHeight = tile.parentNode.parentNode.scrollHeight + "px";
                }, 201)
            }
        }
    })
}



document.addEventListener("DOMContentLoaded", loadSettings);

document.querySelector("#githubButton").addEventListener("click", function() {
    window.open('https://github.com/kach17/selecton-extension', '_blank');
});

document.querySelector('#testPageButton').addEventListener('click', function (e) {
    window.open(chrome.runtime.getURL('options/test-page.html'));
});

function enhanceUiInputs() {
    // --- 1. Helper Functions ---

    // Helper to replace input with slider
    const createSlider = (id, min, max, step) => {
        const input = document.getElementById(id);
        if (!input || input.dataset.enhanced) return;
        
        const container = document.createElement('div');
        container.className = 'slider-container';
        
        const range = document.createElement('input');
        range.type = 'range';
        range.min = min;
        range.max = max;
        range.step = step;
        range.value = input.value;
        
        const display = document.createElement('span');
        display.className = 'slider-value';
        display.textContent = input.value;
        
        range.addEventListener('input', () => {
            input.value = range.value;
            display.textContent = range.value;
            input.dispatchEvent(new Event('input'));
        });
        
        input.parentNode.insertBefore(container, input);
        container.appendChild(range);
        container.appendChild(display);
        input.style.display = 'none';
        input.dataset.enhanced = 'true';
    };

    // Helper to wrap input in stepper
    const createStepper = (id, min = 0) => {
        const input = document.getElementById(id);
        if (!input || input.dataset.enhanced) return;

        const container = document.createElement('div');
        container.className = 'stepper-container';
        
        const btnMinus = document.createElement('button');
        btnMinus.type = 'button';
        btnMinus.className = 'stepper-btn';
        btnMinus.textContent = '-';
        
        const btnPlus = document.createElement('button');
        btnPlus.type = 'button';
        btnPlus.className = 'stepper-btn';
        btnPlus.textContent = '+';

        input.parentNode.insertBefore(container, input);
        container.appendChild(btnMinus);
        container.appendChild(input);
        container.appendChild(btnPlus);
        
        input.classList.add('stepper-input');
        input.readOnly = true;

        const update = (delta) => {
            let val = parseInt(input.value) || 0;
            val += delta;
            if (val < min) val = min;
            input.value = val;
            input.dispatchEvent(new Event('input'));
        };

        btnMinus.onclick = () => update(-1);
        btnPlus.onclick = () => update(1);
        input.dataset.enhanced = 'true';
    };

    // --- 2. Simplifications & Removals ---

    // Hide Shadow Opacity (User requested removal)
    const shadowInput = document.getElementById('shadowOpacity');
    if (shadowInput) shadowInput.closest('.option').style.display = 'none';

    // Hide Currency Update Interval (User requested removal)
    const ratesInput = document.getElementById('updateRatesEveryDays');
    if (ratesInput) ratesInput.closest('.option').style.display = 'none';

    // Simplify Animation Duration -> Toggle
    createAnimationToggle();

    // Merge Delay Timers -> Hover Sensitivity
    createHoverSensitivityDropdown();

    // --- 3. UX Improvements ---

    // Tooltip Opacity (User requested to KEEP this, so we just improve it to a slider)
    createSlider('tooltipOpacity', 0, 1, 0.1);
    
    // Other visual sliders
    createSlider('textSelectionBackgroundOpacity', 0, 1, 0.1);
    createSlider('borderRadius', 0, 20, 1);
    createSlider('fontSize', 10, 30, 1);

    // Steppers for counters
    createStepper('maxTooltipButtonsToShow', 1);
    createStepper('maxIconsInRow', 1);
    createStepper('maxMarkerPagesToStore', 1);

    // Language Dropdown
    createLanguageDropdown();
}

function createAnimationToggle() {
    const id = 'animationDuration';
    const input = document.getElementById(id);
    if (!input || input.dataset.enhanced) return;

    const container = document.createElement('div');
    container.className = 'option';
    
    const label = document.createElement('label');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    
    // Logic: > 0 is enabled
    checkbox.checked = parseInt(input.value) > 0;
    
    checkbox.addEventListener('change', () => {
        input.value = checkbox.checked ? 200 : 0;
        input.dispatchEvent(new Event('input'));
    });

    label.appendChild(checkbox);
    label.appendChild(document.createTextNode("Enable animations"));
    
    container.appendChild(label);
    
    // Replace the original option container
    const originalContainer = input.closest('.option');
    originalContainer.parentNode.insertBefore(container, originalContainer);
    originalContainer.style.display = 'none';
    input.dataset.enhanced = 'true';
}

function createHoverSensitivityDropdown() {
    const hoverInput = document.getElementById('delayToRevealHoverPanels');
    const searchInput = document.getElementById('delayToRevealSearchTooltip');
    const translateInput = document.getElementById('delayToRevealTranslateTooltip');

    if (!hoverInput || hoverInput.dataset.enhanced) return;

    // Hide original inputs
    [hoverInput, searchInput, translateInput].forEach(el => {
        if (el && el.closest('.option')) el.closest('.option').style.display = 'none';
    });

    const container = document.createElement('div');
    container.className = 'option';
    
    const label = document.createElement('label');
    label.innerText = "Hover sensitivity: ";
    
    const select = document.createElement('select');
    const options = [
        { text: 'Fast', hover: 300, search: 200, translate: 400 },
        { text: 'Normal', hover: 700, search: 350, translate: 550 },
        { text: 'Slow', hover: 1200, search: 800, translate: 1000 }
    ];

    // Determine current value (approximate based on hoverInput)
    const currentVal = parseInt(hoverInput.value);
    let selectedIndex = 1; // Default Normal
    if (currentVal <= 300) selectedIndex = 0;
    else if (currentVal >= 1200) selectedIndex = 2;

    options.forEach((opt, index) => {
        const optionEl = document.createElement('option');
        optionEl.text = opt.text;
        optionEl.value = index;
        if (index === selectedIndex) optionEl.selected = true;
        select.appendChild(optionEl);
    });

    select.addEventListener('change', () => {
        const settings = options[select.value];
        if (hoverInput) { hoverInput.value = settings.hover; hoverInput.dispatchEvent(new Event('input')); }
        if (searchInput) { searchInput.value = settings.search; searchInput.dispatchEvent(new Event('input')); }
        if (translateInput) { translateInput.value = settings.translate; translateInput.dispatchEvent(new Event('input')); }
    });

    label.appendChild(select);
    container.appendChild(label);

    // Insert before the first hidden input
    const anchor = hoverInput.closest('.option');
    anchor.parentNode.insertBefore(container, anchor);
    hoverInput.dataset.enhanced = 'true';
}

function createLanguageDropdown() {
    const id = 'languageToTranslate';
    const input = document.getElementById(id);
    if (!input || input.tagName === 'SELECT') return;

    const languages = {
        "af": "Afrikaans", "sq": "Albanian", "am": "Amharic", "ar": "Arabic",
        "hy": "Armenian", "az": "Azerbaijani", "eu": "Basque", "be": "Belarusian",
        "bn": "Bengali", "bs": "Bosnian", "bg": "Bulgarian", "ca": "Catalan",
        "ceb": "Cebuano", "ny": "Chichewa", "zh-CN": "Chinese (Simplified)",
        "zh-TW": "Chinese (Traditional)", "co": "Corsican", "hr": "Croatian",
        "cs": "Czech", "da": "Danish", "nl": "Dutch", "en": "English",
        "eo": "Esperanto", "et": "Estonian", "tl": "Filipino", "fi": "Finnish",
        "fr": "French", "fy": "Frisian", "gl": "Galician", "ka": "Georgian",
        "de": "German", "el": "Greek", "gu": "Gujarati", "ht": "Haitian Creole",
        "ha": "Hausa", "haw": "Hawaiian", "iw": "Hebrew", "hi": "Hindi",
        "hmn": "Hmong", "hu": "Hungarian", "is": "Icelandic", "ig": "Igbo",
        "id": "Indonesian", "ga": "Irish", "it": "Italian", "ja": "Japanese",
        "jw": "Javanese", "kn": "Kannada", "kk": "Kazakh", "km": "Khmer",
        "ko": "Korean", "ku": "Kurdish (Kurmanji)", "ky": "Kyrgyz", "lo": "Lao",
        "la": "Latin", "lv": "Latvian", "lt": "Lithuanian", "lb": "Luxembourgish",
        "mk": "Macedonian", "mg": "Malagasy", "ms": "Malay", "ml": "Malayalam",
        "mt": "Maltese", "mi": "Maori", "mr": "Marathi", "mn": "Mongolian",
        "my": "Myanmar (Burmese)", "ne": "Nepali", "no": "Norwegian", "ps": "Pashto",
        "fa": "Persian", "pl": "Polish", "pt": "Portuguese", "pa": "Punjabi",
        "ro": "Romanian", "ru": "Russian", "sm": "Samoan", "gd": "Scots Gaelic",
        "sr": "Serbian", "st": "Sesotho", "sn": "Shona", "sd": "Sindhi",
        "si": "Sinhala", "sk": "Slovak", "sl": "Slovenian", "so": "Somali",
        "es": "Spanish", "su": "Sundanese", "sw": "Swahili", "sv": "Swedish",
        "tg": "Tajik", "ta": "Tamil", "te": "Telugu", "th": "Thai", "tr": "Turkish",
        "uk": "Ukrainian", "ur": "Urdu", "uz": "Uzbek", "vi": "Vietnamese",
        "cy": "Welsh", "xh": "Xhosa", "yi": "Yiddish", "yo": "Yoruba", "zu": "Zulu"
    };

    const select = document.createElement('select');
    select.id = id;
    
    // Add options
    for (const [code, name] of Object.entries(languages)) {
        const opt = document.createElement('option');
        opt.value = code;
        opt.textContent = name;
        if (input.value === code) opt.selected = true;
        select.appendChild(opt);
    }

    // Handle change
    select.addEventListener('change', () => {
        userConfigs[id] = select.value;
        saveAllSettings();
        updateDisabledOptions();
    });

    // Fix label position: Move text node before the input so it appears as "Label: [Dropdown]"
    const labelText = input.nextSibling;
    if (labelText && labelText.nodeType === 3) {
        input.parentNode.insertBefore(labelText, input);
    }

    input.parentNode.replaceChild(select, input);
}
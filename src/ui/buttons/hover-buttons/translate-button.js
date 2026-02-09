async function addTranslateButton(onFinish, selectionLength, wordsCount) {
    try {
        if (!chrome.i18n.detectLanguage) {
            processButton(true);
            return;
        }

        chrome.i18n.detectLanguage(selectedText, (result) => {
            if (configs.debugMode) console.log('Checking translation necessity...');

            let shouldTranslate = false;
            let languageOfSelectedText = result?.languages?.[0]?.language;

            if (languageOfSelectedText) {
                if (configs.debugMode) console.log(`Detected: ${languageOfSelectedText}`);

                // Update Info Panel with detected language
                if (configs.showInfoPanel && result.isReliable && !configs.verticalLayoutTooltip) {
                    setTimeout(() => {
                        if (infoPanel?.isConnected) {
                            infoPanel.innerText += ` · ${languageOfSelectedText}`;
                        }
                    }, 5);
                }

                // Logic: Translate if language differs OR if user wants it anyway
                const isUserLang = languageOfSelectedText === configs.languageToTranslate;
                shouldTranslate = isUserLang ? !configs.hideTranslateButtonForUserLanguage : true;
            } else {
                if (configs.debugMode) console.log('Detection failed');
                shouldTranslate = configs.showTranslateIfLanguageUnknown ?? false;
            }

            processButton(shouldTranslate, languageOfSelectedText);
        });
    } catch (e) {
        if (configs.debugMode) console.error(e);
    }

    function processButton(shouldTranslate, languageOfSelectedText) {
        if (shouldTranslate) {
            setRegularTranslateButton(languageOfSelectedText, selectionLength, wordsCount);
        }
        onFinish?.();
    }
}

function setRegularTranslateButton(languageOfSelectedText, selectionLength, wordsCount) {
    const isUserLang = languageOfSelectedText === configs.languageToTranslate;
    const targetLang = (isUserLang && !configs.hideTranslateButtonForUserLanguage) ? 'en' : configs.languageToTranslate;
    
    const translateUrl = returnTranslateUrl(selectedText, targetLang, languageOfSelectedText);
    const translateButton = addLinkTooltipButton(translateLabel, translateButtonIcon, translateUrl);

    translateButton.id = 'selecton-translate-button';

    // Live Translation Trigger
    if (configs.liveTranslation && selectionLength < 500) {
        setTimeout(() => {
            const isSingleWord = wordsCount === 1 && !/[:\/"'']/.test(selectedText);
            if (configs.translateSingleWordsImmediately && isSingleWord) {
                fetchTranslation(selectedText, 'auto', configs.languageToTranslate, null, translateButton, true);
            } else {
                setLiveTranslateOnHoverButton(selectedText, 'auto', configs.languageToTranslate, translateButton);
            }
        }, 5);
    }
}

function setLiveTranslateOnHoverButton(word, sourceLang, targetLang, translateButton) {
    let fetched = false;
    const loadingMsg = chrome.i18n.getMessage("translating") || 'Translating';
    const liveTranslationPanel = createHoverPanelForButton(translateButton, `${loadingMsg}...`, () => {
        if (!fetched) {
            fetched = true;
            fetchTranslation(word, sourceLang, targetLang, liveTranslationPanel, translateButton);
        }
    });
    translateButton.appendChild(liveTranslationPanel);
}

/**
 * Refined CSS Injection Logic
 * Improves the visual transition between the loading state and the result.
 */
function renderHoverPanelContent(panel, text, originLang) {
    panel.innerHTML = ''; // Clear "Translating..." text safely
    panel.style.padding = '0';

    const header = document.createElement('span');
    header.className = 'selecton-hover-panel-header';
    // Use Intl.DisplayNames if you want the full language name instead of the code (e.g., "en" -> "English")
    header.textContent = `Google Translate${originLang ? ` · ${originLang.toUpperCase()}` : ''}`;

    const body = document.createElement('div');
    body.className = 'selecton-hover-panel-container selecton-live-translation';
    body.innerText = text;

    // Handle layout based on tooltip position
    if (window.tooltipOnBottom) {
        header.style.paddingBottom = '2px';
        body.style.marginTop = '3px';
        panel.append(body, header);
    } else {
        panel.append(header, body);
    }
}

/**
 * Enhanced Fetch with Timeout
 * Prevents the "Translating..." message from hanging indefinitely.
 */
async function fetchTranslation(word, sourceLang, targetLang, liveTranslationPanel, translateButton, showResultInButton = false) {
    const noTranslationLabel = chrome.i18n.getMessage("noTranslationFound") || "No translation found";
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&dt=bd&dj=1&q=${encodeURIComponent(word)}`;

    // Set a safety timeout for the background message
    const fetchPromise = new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: 'background_fetch', url: url }, resolve);
        setTimeout(() => resolve(null), 5000); // 5s timeout
    });

    const result = await fetchPromise;

    if (!result) {
        if (liveTranslationPanel) liveTranslationPanel.innerText = noTranslationLabel;
        return;
    }

    // Extract translation using modern optional chaining and coalescing
    const translatedText = result.dict?.[0]?.terms?.[0] || 
                         result.sentences?.map(s => s.trans).filter(Boolean).join("") || 
                         "";

    const isDuplicate = translatedText.toLowerCase().trim() === word.toLowerCase().trim();

    if (!translatedText || isDuplicate) {
        if (liveTranslationPanel) liveTranslationPanel.innerText = noTranslationLabel;
        return;
    }

    if (showResultInButton) {
        const target = translateButton.querySelector('span') || translateButton;
        target.innerText = translatedText;
        target.classList.add('selecton-live-translation');
        translateButton.title = 'Source: Google Translate';
    } else if (liveTranslationPanel) {
        renderHoverPanelContent(liveTranslationPanel, translatedText, result.src);
    }
}
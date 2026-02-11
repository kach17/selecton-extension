/**
 * Entry point: Validates the state and triggers the workflow.
 */
function createTooltip(e, recreated = false) {
    if (isDraggingTooltip || dontShowTooltip) return;
    if (e && e.button !== 0) return;

    setTimeout(() => {
        handleTooltipWorkflow(e, recreated);
    }, 0);
}

/**
 * Coordinator: Orchestrates the logic flow.
 */
function handleTooltipWorkflow(e, recreated) {
    lastMouseUpEvent = e;
    selection = window.getSelection();
    if (!selection) return;

    tooltipOnBottom = false;

    // 1. Process Word Snapping
    performWordSnapping(e, recreated);

    // 2. Handle Text Fields
    if (isTextFieldFocused) {
        handleTextFieldTooltip(e);
        return;
    }

    // 3. Handle Standard Selection
    handleSelectionTooltip(e, recreated);
}

/**
 * Logic: Handles word-snapping rules.
 */
function performWordSnapping(e, recreated) {
    if (!configs.snapSelectionToWord || recreated || isTextFieldFocused) return;
    
    if (configs.disableWordSnappingOnCtrlKey && e && (e.ctrlKey || e.metaKey)) return;

    let selectedTextIsCode = false;
    if (configs.disableWordSnapForCode || configs.showInfoPanel) {
        const text = selection.toString();
        selectedTextIsCode = codeMarkers.some(marker => text.includes(marker));
    }

    const canSnap = !isDraggingDragHandle && (!selectedTextIsCode || !configs.disableWordSnapForCode);
    const isValidTarget = domainIsBlacklistedForSnapping == false && e.detail < 2 && !timerToRecreateOverlays;

    if (canSnap && isValidTarget && e.target.id !== 'selecton-extend-selection-button') {
        snapSelectionByWords(selection);
    }
}

/**
 * UI: Renders the tooltip for text areas/inputs.
 */
function handleTextFieldTooltip(e) {
    if (!configs.addActionButtonsForTextFields) return;

    setUpTooltip();
    addBasicTooltipButtons('textfield');

    if (tooltip.children.length < 1) {
        tooltip.remove();
        return;
    }

    finalizeTooltipUI(e);
}

/**
 * UI: Renders the standard selection tooltip.
 */
function handleSelectionTooltip(e, recreated) {
    if (tooltip) hideTooltip();

    selection = window.getSelection();
    selectedText = sanitizeText(selection.toString());

    if (!selectedText) {
        hideDragHandles();
        return;
    }

    setUpTooltip(recreated);
    addBasicTooltipButtons(null);

    if (!dontShowTooltip) {
        addContextualButtons(() => {
            setBorderRadiusForSideButtons(tooltip);
            finalizeTooltipUI(e, recreated, true);
        });
    } else {
        hideTooltip();
    }
}

function finalizeTooltipUI(e, recreated = false, isStandard = false) {
    // 1. Prepare styles but keep it invisible
    tooltip.style.visibility = 'hidden'; 
    tooltip.style.display = 'block'; 
    
    // 2. Append to DOM so clientHeight is no longer 0
    document.body.appendChild(tooltip); 
    standardizeButtonBorders(tooltip);

    // 3. Now that it exists in DOM, calculate math
    if (isStandard) {
        calculateTooltipPosition(e, recreated);
        setupPostRenderListeners();
    } else {
        const coords = getTextFieldCoords(e);
        showTooltip(coords.x, coords.y);
    }

    // 4. Make it visible (inside showTooltip)
    tooltip.style.visibility = 'visible';
}

/**
 * Utility: Standardizes borders across all buttons (DRY).
 */
function standardizeButtonBorders(container) {
    if (!configs.showButtonBorders) return;
    
    const buttons = container.querySelectorAll('.selection-popup-button');
    buttons.forEach((btn, i) => {
        btn.classList.add('button-with-border');
        if (i === 0) {
            btn.style.borderLeft = 'none';
            btn.style.borderTop = 'none';
        }
    });
}

/**
 * Utility: Sets up selection listeners after the tooltip appears.
 */
function setupPostRenderListeners() {
    if (configs.customSearchOptionsDisplay === 'hoverCustomSearchStyle') {
        setTimeout(() => {
            if (configs.secondaryTooltipEnabled && configs.customSearchButtons) {
                setHoverForSearchButton(searchButton);
            }
        }, 5);
    }

    setTimeout(() => {
        if (tooltipIsShown) document.addEventListener("selectionchange", selectionChangeListener);
    }, configs.animationDuration);
}

let cachedTooltip = null;
let cachedArrow = null;

function setUpTooltip(recreated = false) {
    // 1. Recycle or Create Elements (Singleton Pattern)
    tooltip = cachedTooltip || document.createElement('div');
    cachedTooltip = tooltip;
    tooltip.innerHTML = ''; // Clear previous state

    arrow = cachedArrow || document.createElement('div');
    cachedArrow = arrow;

    // 2. Base Styling & Classes
    tooltip.className = 'selecton-tooltip selecton-entity';
    applyLayoutClasses();

    // 3. Dynamic Styles (Transition & Transform)
    const { animationDuration, tooltipRevealEffect, tooltipOpacity } = configs;
    
    Object.assign(tooltip.style, {
        opacity: 0,
        position: 'fixed',
        pointerEvents: 'none',
        transition: `opacity ${animationDuration}ms ease-out${recreated ? '' : `, transform ${animationDuration}ms ease-out`}`,
        transform: returnTooltipRevealTransform(false),
        transformOrigin: getTransformOrigin(tooltipRevealEffect)
    });

    // 4. Feature-Specific Logic
    if (configs.useCustomStyle) applyCustomStyles();
    if (configs.showTooltipArrow) setupArrow(arrow);
    
    // 5. Hover Effects (Opacity)
    if (configs.useCustomStyle && tooltipOpacity != 1.0 && configs.fullOpacityOnHover) {
        setupOpacityListeners(tooltipOpacity);
    }

    if (configs.debugMode) console.log('Selecton tooltip was created');
}

/** * Sub-routines to keep the main function clean 
 */

function applyLayoutClasses() {
    if (configs.verticalLayoutTooltip) {
        tooltip.classList.add('vertical-layout-tooltip', 'reversed-order');
    }
    if (['onlyicon', 'iconlabel'].includes(configs.buttonsStyle)) {
        tooltip.classList.add('tooltip-with-icons');
    }
}

function getTransformOrigin(effect) {
    const origins = {
        'scaleUpTooltipEffect': '50% 30% 0',
        'scaleUpFromBottomTooltipEffect': '50% 125% 0'
    };
    return origins[effect] || '50% 100% 0';
}

function setupArrow(arrowElement) {
    arrowElement.setAttribute('class', 'selecton-tooltip-arrow');
    tooltip.appendChild(arrowElement);
    if (configs.draggableTooltip) makeTooltipElementDraggable(arrowElement);
}

function applyCustomStyles() {
    if (configs.addTooltipShadow) {
        tooltip.style.boxShadow = `0 2px 7px rgba(0,0,0,${configs.shadowOpacity})`;
        arrow.style.boxShadow = `1px 1px 3px rgba(0,0,0,${configs.shadowOpacity / 1.5})`;
    }

    const radius = configs.borderRadius / 1.5;
    if (configs.verticalLayoutTooltip) {
        firstButtonBorderRadius = `0px 0px ${radius}px ${radius}px`;
        lastButtonBorderRadius = `${radius}px ${radius}px 0px 0px`;
    } else {
        firstButtonBorderRadius = `${radius}px 0px 0px ${radius}px`;
        lastButtonBorderRadius = `0px ${radius}px ${radius}px 0px`;
    }
    onlyButtonBorderRadius = `${radius}px`;
}

function setupOpacityListeners(inactiveOpacity) {
    tooltip.onmouseover = () => setTimeout(() => tooltip.style.opacity = 1.0, 1);
    tooltip.onmouseout = () => setTimeout(() => tooltip.style.opacity = inactiveOpacity, 1);
}

function calculateTooltipPosition(e, recreated = false) {
    const start = getSelectionCoordinates(true);
    const end = getSelectionCoordinates(false);

    // 1. Determine base coordinates
    let { x, y } = (configs.tooltipPosition === 'overCursor' && !recreated) 
        ? getCursorAlignedCoords(e, start, end) 
        : getSelectionCenteredCoords(start, end);

    // 2. Adjust for vertical overflow (flip to bottom if needed)
    const dimensions = { height: tooltip.clientHeight, arrow: arrow.clientHeight };
    y = validateVerticalBounds(y, start, end, dimensions);

    // 3. Handle Floating State (If selection is off-screen)
    if (configs.floatingOffscreenTooltip) {
        y = handleFloatingLogic(y, dimensions.height);
    }

    // 4. Update UI
    if (floatingTooltipTop || floatingTooltipBottom) {
        transformToScrollButton();
    }

    showTooltip(x, y);

    if (configs.addDragHandles && !start.dontAddDragHandles && !floatingTooltipTop && !floatingTooltipBottom) {
        setDragHandles(start, end);
    }
}

/**
 * Math Helpers
 */

function getCursorAlignedCoords(e, start, end) {
    let x = e.clientX;
    // Clamp X within selection boundaries
    x = Math.max(start.dx + 5, Math.min(x, end.dx - 5));
    
    const y = start.dy - tooltip.clientHeight - (arrow.clientHeight / 1.5) - 2;
    return { x, y };
}

function getSelectionCenteredCoords(start, end) {
    const delta = Math.abs(end.dx - start.dx);
    const x = Math.min(start.dx, end.dx) + (delta / 2);
    const y = start.dy - tooltip.clientHeight - arrow.clientHeight + 2;
    return { x, y };
}

function validateVerticalBounds(y, start, end, dims) {
    // Force a fresh measurement
    const actualHeight = tooltip.offsetHeight; 
    
    // Check if it fits on top
    if (start.dy - actualHeight - dims.arrow > 0) {
        return start.dy - actualHeight - dims.arrow;
    }

    // Otherwise, flip to bottom
    setTooltipOnBottom();
    return end.dy + (end.lineHeight ?? 0) + dims.arrow;
}

function handleFloatingLogic(y, tooltipHeight) {
    const padding = 15;
    floatingTooltipTop = false; 
    floatingTooltipBottom = false;

    if (y < 0) {
        floatingTooltipTop = window.scrollY;
        return padding;
    } 
    
    if (y > window.innerHeight) {
        floatingTooltipBottom = window.scrollY;
        return window.innerHeight - (tooltipHeight ?? 50) - padding;
    }

    return y;
}

function transformToScrollButton() {
    tooltip.querySelectorAll('.selection-popup-button').forEach(el => el.remove());

    const btn = addBasicTooltipButton('Selected text: ', clearIcon, (e) => {
        selection.focusNode.parentNode.scrollIntoView({ behavior: "smooth", block: "center" });
        dontShowTooltip = true;
        setTimeout(() => { dontShowTooltip = false; }, configs.animationDuration);
        setTimeout(() => { createTooltip(e, true); }, 300);
    }, false, undefined, false);

    btn.innerHTML = `<span style="opacity:0.65">${chrome.i18n.getMessage('selectionHeader')}: </span>` + 
                    (selectedText.length > 30 ? selectedText.substring(0, 30) + '...' : selectedText);
    btn.title = selectedText;
    tooltip.prepend(btn);
    
    if (floatingTooltipBottom) moveInfoPanelToBottom();
}

function showTooltip(dx, dy) {
    // 1. Set position while still invisible
    tooltip.style.top = `${dy}px`;
    tooltip.style.left = `${dx}px`;

    // 2. Check collisions (modifies position if needed)
    checkTooltipForCollidingWithSideEdges();

    // 3. Trigger the single transition
    requestAnimationFrame(() => {
        tooltip.style.pointerEvents = 'none';
        tooltip.style.opacity = configs.useCustomStyle ? configs.tooltipOpacity : 1.0;
        tooltip.style.transform = returnTooltipRevealTransform(true);
        tooltipIsShown = true;

        // Enable interaction after animation
        setTimeout(() => {
            if (tooltipIsShown && tooltip) tooltip.style.pointerEvents = 'all';
        }, configs.animationDuration);
    });
}

let oldTooltips;
function hideTooltip(animated = true) {
    if (!tooltip) return;

    if (configs.debugMode) {
        console.log('--- Hiding Selecton tooltips ---');
        console.log('Checking for existing tooltips...');
    }

    /// Hide tooltip (Singleton pattern)
    if (tooltip) {
        tooltipIsShown = false;
        if (!animated) tooltip.style.transition = '';
        tooltip.style.opacity = 0.0;
        tooltip.style.pointerEvents = 'none';
        
        /// Do not remove from DOM, just hide to recycle
    } else {
        if (configs.debugMode)
            console.log('No existing tooltips found');
    }

    // tooltip = null; /// Keep reference for reuse
    secondaryTooltip = null;
    timerToRecreateOverlays = null;
    isTextFieldFocused = false;

    document.removeEventListener("selectionchange", selectionChangeListener);
    window.removeEventListener('mousemove', mouseMoveToHideListener);
}

function performWordSnapping(e, recreated) {
    if (!configs.snapSelectionToWord || recreated) return;

    if (isTextFieldFocused) {
        if (configs.debugMode) console.log('Word snapping rejected while textfield is focused');
        return;
    }
    
    if (configs.disableWordSnappingOnCtrlKey && e && (e.ctrlKey || e.metaKey)) {
        if (configs.debugMode) console.log('Word snapping rejected due to pressed CTRL key');
        return;
    }

    selectedTextIsCode = false;
    if (configs.disableWordSnapForCode || configs.showInfoPanel)
        for (let i = 0; i < codeMarkers.length; i++) {
            if (selectedText.includes(codeMarkers[i])) {
                selectedTextIsCode = true; break;
            }
        }

    if (!isDraggingDragHandle && (!selectedTextIsCode || !configs.disableWordSnapForCode)) {
        if (!domainIsBlacklistedForSnapping && e.detail < 2 && !timerToRecreateOverlays &&
            e.target.id !== 'selecton-extend-selection-button' && (!e.target.parentNode || e.target.parentNode.id !== 'selecton-extend-selection-button')
        ) {
            snapSelectionByWords(selection);
        }
    }
}

function handleTextFieldTooltip(e) {
    if (!configs.addActionButtonsForTextFields) return;

    setUpTooltip();
    addBasicTooltipButtons('textfield');

    // FIX: Changed from < 2 to < 1 to allow tooltips with single button (e.g., just paste button)
    if (tooltip.children.length < 1) {
        tooltip.remove();
        return;
    }

    standardizeButtonBorders(tooltip);
    document.body.appendChild(tooltip);

    let resultDy = e.clientY - tooltip.clientHeight - arrow.clientHeight - 9;
    if (resultDy <= 0) {
        resultDy = e.clientY + arrow.clientHeight;
        arrow.classList.add('arrow-on-bottom');
        tooltipOnBottom = true;
    }

    showTooltip(e.clientX, resultDy);
}

function handleSelectionTooltip(e, recreated) {
    if (tooltip) hideTooltip();

    selection = window.getSelection();
    selectedText = sanitizeText(selection.toString());

    if (selectedText == '') {
        hideDragHandles();
        return;
    }

    setUpTooltip(recreated);
    addBasicTooltipButtons(null);

    if (!dontShowTooltip && selectedText !== '') {
        addContextualButtons(function () {
            setBorderRadiusForSideButtons(tooltip);
            standardizeButtonBorders(tooltip);
            document.body.appendChild(tooltip);
            calculateTooltipPosition(e, recreated);

            if (configs.customSearchOptionsDisplay == 'hoverCustomSearchStyle' && configs.secondaryTooltipEnabled && configs.customSearchButtons)
                setTimeout(() => setHoverForSearchButton(searchButton), 5);

            setTimeout(() => {
                if (tooltipIsShown) document.addEventListener("selectionchange", selectionChangeListener);
            }, configs.animationDuration);
        });
    } else hideTooltip();
}

function standardizeButtonBorders(container) {
    if (!configs.showButtonBorders) return;
    
    const buttons = container.querySelectorAll('.selection-popup-button');
    for (let i = 0; i < buttons.length; i++) {
        buttons[i].classList.add('button-with-border');
        if (i === 0) {
            buttons[i].style.borderLeft = 'none';
            buttons[i].style.borderTop = 'none';
        }
    }
}
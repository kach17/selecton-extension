const markers = [];

function createSelectionHighlightSpan(bg, fg, marker, scrollbarHint) {
    let span = document.createElement("span");
    span.style.backgroundColor = bg ?? "yellow";
    span.style.color = fg ?? "inherit";
    span.style.position = 'relative';
    span.className = 'selecton-marker-highlight';
    span.dataset.markerId = marker.id;

    if (configs.debugMode)
        setTimeout(() => console.log('created text marker:', span), 3);

    // No delete button in spans anymore - we'll create one floating button per marker

    return span;
}

function createFloatingDeleteButton(marker) {
    // Create ONE delete button for the entire highlight
    let deleteButton = document.createElement('div');
    deleteButton.className = 'marker-highlight-delete-floating';
    deleteButton.textContent = '✕';
    deleteButton.title = chrome.i18n.getMessage('deleteLabel');
    deleteButton.dataset.markerId = marker.id;
    deleteButton.style.position = 'absolute';
    deleteButton.style.display = 'none';
    deleteButton.style.zIndex = '999999999';
    
    if (marker.timeAdded) {
        let date = new Date();
        date.setTime(marker.timeAdded);
        deleteButton.title = chrome.i18n.getMessage('markedLabel') + ' ' + date.toLocaleString();
    }

    deleteButton.onclick = function (e) {
        e.stopPropagation();
        removeMarker(marker.id);
    };

    document.body.appendChild(deleteButton);
    return deleteButton;
}

function positionDeleteButton(markerId) {
    // Use RAF batching instead of immediate layout
    schedulePositionUpdate(markerId);
}

function showDeleteButton(markerId) {
    const deleteButton = document.querySelector(`.marker-highlight-delete-floating[data-marker-id="${markerId}"]`);
    if (deleteButton) {
        positionDeleteButton(markerId);
        deleteButton.style.display = 'block';
    }
}

function hideDeleteButton(markerId) {
    const deleteButton = document.querySelector(`.marker-highlight-delete-floating[data-marker-id="${markerId}"]`);
    if (deleteButton) {
        deleteButton.style.display = 'none';
    }
}

function removeMarker(markerId) {
    try {
        const marker = markers.find(m => m.id === markerId);
        if (!marker) return;

        // Remove floating delete button immediately
        const deleteButton = document.querySelector(`.marker-highlight-delete-floating[data-marker-id="${markerId}"]`);
        if (deleteButton) {
            deleteButton.remove();
        }

        // Fade out ONLY background, not text
        const spans = document.querySelectorAll(`span[data-marker-id="${markerId}"]`);
        spans.forEach(span => {
            span.style.transition = 'background-color 150ms ease-out';
            span.style.backgroundColor = 'transparent';
        });

        // Remove spans after animation
        setTimeout(() => {
            if (marker.scrollbarHint) {
                marker.scrollbarHint.remove();
            }

            spans.forEach(span => {
                const parent = span.parentNode;
                if (parent) {
                    while (span.firstChild) {
                        parent.insertBefore(span.firstChild, span);
                    }
                    parent.removeChild(span);
                    parent.normalize();
                }
            });

            const idx = markers.indexOf(marker);
            if (idx > -1) {
                markers.splice(idx, 1);
                saveAllMarkers();
            }
        }, 150);
    } catch (e) {
        if (configs.debugMode) console.log(e);
    }
}

function markTextSelection(bg, fg, text, restoredMarker) {
    const selectionRect = restoredMarker ? {} : getSelectionRectDimensions();
    const minHintHeight = 10;

    let scrollbarHint = document.createElement('div');
    scrollbarHint.className = 'marker-scrollbar-hint';
    scrollbarHint.style.backgroundColor = bg ?? "yellow";

    let dyForHint = restoredMarker ? restoredMarker.hintDy : 
        ((selectionRect.dy + window.scrollY) * window.innerHeight) / document.body.scrollHeight;
    if (dyForHint < 5) dyForHint = 5;
    if (dyForHint > window.innerHeight - 5) dyForHint = window.innerHeight - 5;
    scrollbarHint.style.top = `${dyForHint}px`;

    let hintHeight = restoredMarker ? restoredMarker.hintHeight : 
        (selectionRect.height * window.innerHeight) / document.body.scrollHeight;
    if (hintHeight < minHintHeight) hintHeight = minHintHeight;
    scrollbarHint.style.height = `${hintHeight}px`;

    const markersOnTheSameHeight = markers.filter(m => m.hintDy === dyForHint);
    if (markersOnTheSameHeight.length !== 0) {
        const shift = 100 * markersOnTheSameHeight.length;
        scrollbarHint.style.transform = `translate(-${shift + 5}%, 0)`;
    }

    let hoverHint = document.createElement('span');
    hoverHint.innerText = text;
    hoverHint.className = 'marker-scrollbar-tooltip';
    hoverHint.style.maxWidth = `${window.innerWidth * 0.3}px`;
    hoverHint.style.maxHeight = `${window.innerHeight * 0.6}px`;
    scrollbarHint.appendChild(hoverHint);
    document.body.appendChild(scrollbarHint);

    if (hoverHint.getBoundingClientRect().top < 0) {
        hoverHint.classList.add('marker-scrollbar-tooltip-bottom');
    }

    let containerSelector, range;
    const markerId = 'marker-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    
    if (restoredMarker) {
        containerSelector = restoredMarker.startContainer;
    } else {
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) {
            scrollbarHint.remove();
            return;
        }
        range = sel.getRangeAt(0);
        containerSelector = getNodeSelector(range.startContainer.nodeType == 1 ? 
            range.startContainer : range.startContainer.parentNode);
    }

    let marker = {
        id: markerId,
        hintDy: dyForHint,
        hintHeight: hintHeight,
        startContainer: containerSelector,
        background: bg ?? "yellow",
        foreground: fg ?? "inherit",
        text: text,
        timeAdded: restoredMarker ? restoredMarker.timeAdded : Date.now(),
        scrollbarHint: scrollbarHint
    };

    // Apply highlight using Mark.js-style approach
    let success = false;
    if (restoredMarker) {
        const element = document.querySelector(restoredMarker.startContainer);
        if (element) {
            const foundRange = findRangeForText(element, text);
            if (foundRange) {
                success = wrapTextNodes(foundRange, marker, bg, fg);
            }
        }
    } else {
        success = wrapTextNodes(range, marker, bg, fg);
    }

    if (success) {
        markers.push(marker);
        saveAllMarkers();

        // Scroll on hint click
        scrollbarHint.onmousedown = function () {
            const firstSpan = document.querySelector(`span[data-marker-id="${markerId}"]`);
            if (firstSpan) {
                firstSpan.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });
            }
        };
    } else {
        scrollbarHint.remove();
    }
}

/**
 * Mark.js-style approach: Wrap each text node individually
 * Optimized: Merges consecutive text nodes into single span
 */
function wrapTextNodes(range, marker, bg, fg) {
    try {
        const startContainer = range.startContainer;
        const endContainer = range.endContainer;
        const startOffset = range.startOffset;
        const endOffset = range.endOffset;

        // Collect all text nodes in the range with their parent info
        const textNodesData = [];
        const walker = document.createTreeWalker(
            range.commonAncestorContainer,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: function(node) {
                    const nodeRange = document.createRange();
                    nodeRange.selectNodeContents(node);
                    
                    if (range.compareBoundaryPoints(Range.END_TO_START, nodeRange) < 0 &&
                        range.compareBoundaryPoints(Range.START_TO_END, nodeRange) > 0) {
                        return NodeFilter.FILTER_ACCEPT;
                    }
                    return NodeFilter.FILTER_REJECT;
                }
            }
        );

        let node;
        while (node = walker.nextNode()) {
            const isFirst = (node === startContainer);
            const isLast = (node === endContainer);
            
            let start = 0;
            let end = node.nodeValue.length;
            
            if (isFirst) start = startOffset;
            if (isLast) end = endOffset;
            
            if (start < end) {
                textNodesData.push({
                    node: node,
                    start: start,
                    end: end,
                    parent: node.parentNode
                });
            }
        }

        if (textNodesData.length === 0) return false;

        // Group consecutive nodes by parent - optimization
        const groups = [];
        let currentGroup = [textNodesData[0]];
        
        for (let i = 1; i < textNodesData.length; i++) {
            const prev = textNodesData[i - 1];
            const curr = textNodesData[i];
            
            // If same parent and nodes are siblings, group them
            if (curr.parent === prev.parent && 
                curr.node.previousSibling === prev.node) {
                currentGroup.push(curr);
            } else {
                groups.push(currentGroup);
                currentGroup = [curr];
            }
        }
        groups.push(currentGroup);

        // Process each group
        const createdSpans = [];
        groups.forEach(group => {
            if (group.length === 1) {
                // Single node - wrap normally
                const data = group[0];
                const text = data.node.nodeValue;
                const before = text.substring(0, data.start);
                const highlighted = text.substring(data.start, data.end);
                const after = text.substring(data.end);
                
                const span = createSelectionHighlightSpan(bg, fg, marker, marker.scrollbarHint);
                span.appendChild(document.createTextNode(highlighted));
                createdSpans.push(span);
                
                const parent = data.parent;
                if (before) parent.insertBefore(document.createTextNode(before), data.node);
                parent.insertBefore(span, data.node);
                if (after) parent.insertBefore(document.createTextNode(after), data.node);
                parent.removeChild(data.node);
            } else {
                // Multiple consecutive nodes - merge into one span (optimization)
                const parent = group[0].parent;
                const fragment = document.createDocumentFragment();
                
                group.forEach((data, idx) => {
                    const text = data.node.nodeValue;
                    const start = data.start;
                    const end = data.end;
                    
                    if (idx === 0 && start > 0) {
                        parent.insertBefore(document.createTextNode(text.substring(0, start)), data.node);
                    }
                    
                    fragment.appendChild(document.createTextNode(text.substring(start, end)));
                    
                    if (idx === group.length - 1 && end < text.length) {
                        parent.insertBefore(document.createTextNode(text.substring(end)), data.node);
                    }
                });
                
                const span = createSelectionHighlightSpan(bg, fg, marker, marker.scrollbarHint);
                span.appendChild(fragment);
                createdSpans.push(span);
                parent.insertBefore(span, group[0].node);
                
                group.forEach(data => parent.removeChild(data.node));
            }
        });

        // Create ONE floating delete button for all spans
        const deleteButton = createFloatingDeleteButton(marker);

        return true;
    } catch (e) {
        if (configs.debugMode) console.error('Error wrapping text nodes:', e);
        return false;
    }
}

function getNodeSelector(el) {
    return UTILS.cssPath(el);
}

function saveAllMarkers() {
    setTimeout(function () {
        if (!markers) return;
        try {
            chrome.storage.local.get(['websiteMarkers'], function (value) {
                let existingMap = value['websiteMarkers'] || {};

                if (markers.length <= 0) {
                    delete existingMap[window.location.href];
                } else {
                    let markerKeys = Object.keys(existingMap);
                    if (markerKeys.length >= (configs.maxMarkerPagesToStore ?? 10)) {
                        delete existingMap[markerKeys[0]];
                    }

                    existingMap[window.location.href] = {
                        title: document.title,
                        timeUpdated: Date.now(),
                        markers: markers.map(m => ({
                            hintDy: m.hintDy,
                            hintHeight: m.hintHeight,
                            startContainer: m.startContainer,
                            background: m.background,
                            foreground: m.foreground,
                            text: m.text,
                            timeAdded: m.timeAdded
                        }))
                    };
                }

                chrome.storage.local.set({ 'websiteMarkers': existingMap });
            });
        } catch (e) {
            console.log(e);
        }
    }, 5);
}

function restoreMarkers() {
    if (configs.debugMode) {
        console.log('--------');
        console.log('Searching for markers on current page...');
    }

    chrome.storage.local.get(['websiteMarkers'], function (value) {
        if (configs.debugMode) {
            console.log('restored markers:', value);
        }

        if (value['websiteMarkers'] && value['websiteMarkers'][window.location.href]) {
            let markersForCurrentPage = value['websiteMarkers'][window.location.href]['markers'];

            if (markersForCurrentPage && markersForCurrentPage.length > 0) {
                if (configs.debugMode) {
                    console.log('Found markers for current page:', markersForCurrentPage);
                }

                markersForCurrentPage.forEach(marker => {
                    try {
                        markTextSelection(marker.background, marker.foreground, marker.text, marker);
                    } catch (e) {
                        if (configs.debugMode) console.log(e);
                    }
                });
            }
        }
    });
}

// OPTIMIZATION #1: Layout batching with RAF
let pendingPositionUpdates = new Set();
let rafScheduled = false;

function schedulePositionUpdate(markerId) {
    pendingPositionUpdates.add(markerId);
    
    if (!rafScheduled) {
        rafScheduled = true;
        requestAnimationFrame(() => {
            // BATCH READ - all getBoundingClientRect calls together
            const updates = [];
            pendingPositionUpdates.forEach(id => {
                const spans = document.querySelectorAll(`span[data-marker-id="${id}"]`);
                if (spans.length === 0) return;

                let minTop = Infinity, maxRight = -Infinity;
                spans.forEach(span => {
                    const rect = span.getBoundingClientRect();
                    if (rect.top < minTop) minTop = rect.top;
                    if (rect.right > maxRight) maxRight = rect.right;
                });

                updates.push({
                    id: id,
                    top: minTop + window.scrollY - 20,
                    left: maxRight + window.scrollX + 2
                });
            });

            // BATCH WRITE - all style updates together
            updates.forEach(update => {
                const deleteButton = document.querySelector(`.marker-highlight-delete-floating[data-marker-id="${update.id}"]`);
                if (deleteButton) {
                    deleteButton.style.top = `${update.top}px`;
                    deleteButton.style.left = `${update.left}px`;
                }
            });

            pendingPositionUpdates.clear();
            rafScheduled = false;
        });
    }
}

// OPTIMIZATION #2: Event delegation
let hoverTimeout;
let currentHoveredMarkerId = null;

function initEventDelegation() {
    // Single mouseover listener for entire document
    document.addEventListener('mouseover', (e) => {
        const span = e.target.closest('.selecton-marker-highlight');
        const deleteBtn = e.target.closest('.marker-highlight-delete-floating');
        
        if (span) {
            const markerId = span.dataset.markerId;
            if (markerId !== currentHoveredMarkerId) {
                clearTimeout(hoverTimeout);
                currentHoveredMarkerId = markerId;
                showDeleteButton(markerId);
            }
        } else if (deleteBtn) {
            // Keep current button visible
            clearTimeout(hoverTimeout);
        } else {
            // Mouse over something else - hide after delay
            if (currentHoveredMarkerId) {
                const previousMarkerId = currentHoveredMarkerId;
                hoverTimeout = setTimeout(() => {
                    hideDeleteButton(previousMarkerId);
                    currentHoveredMarkerId = null;
                }, 200);
            }
        }
    });
}

function initMarkersRestore() {
    function init() {
        try {
            // Initialize event delegation system
            initEventDelegation();
            
            restoreMarkers();

            chrome.runtime.onMessage.addListener(request => {
                if (request.command && request.command.includes('selecton-scroll-to-marker-message')) {
                    const selectedHintDy = parseInt(request.command.split(':')[1]);
                    if (!selectedHintDy || isNaN(selectedHintDy)) return;

                    const dyToScroll = selectedHintDy * document.body.scrollHeight / window.innerHeight;
                    window.scrollTo(0, dyToScroll - (window.innerHeight / 2));
                }
            });
        } catch (e) {
            console.log(e);
        }
    }

    if (document.readyState === "complete" || document.readyState === 'interactive') {
        init();
    } else {
        document.addEventListener('DOMContentLoaded', init);
    }
}

function findRangeForText(container, text) {
    if (!container) return null;
    
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null, false);
    const nodes = [];
    let accumulatedText = "";

    let node;
    while (node = walker.nextNode()) {
        nodes.push(node);
        accumulatedText += node.nodeValue;
    }

    const foundIndex = accumulatedText.indexOf(text);
    if (foundIndex === -1) return null;

    let startNode = null, startOffset = 0;
    let endNode = null, endOffset = 0;
    let len = 0;

    for (const n of nodes) {
        const nodeLen = n.nodeValue.length;

        if (!startNode && foundIndex < len + nodeLen) {
            startNode = n;
            startOffset = foundIndex - len;
        }

        if (startNode && !endNode && (foundIndex + text.length) <= len + nodeLen) {
            endNode = n;
            endOffset = (foundIndex + text.length) - len;
            break;
        }
        len += nodeLen;
    }

    if (startNode && endNode) {
        const r = document.createRange();
        r.setStart(startNode, startOffset);
        r.setEnd(endNode, endOffset);
        return r;
    }
    return null;
}
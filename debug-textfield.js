// Debug script to test text field functionality
// Load this in the browser console on a page with the extension

console.log('=== TEXT FIELD DEBUG ===');

// Check if extension is loaded
if (typeof window.selectonEventManager !== 'undefined') {
    console.log('✓ Selecton extension is loaded');
} else {
    console.log('✗ Selecton extension is NOT loaded');
}

// Check configs
chrome.storage.local.get(['addActionButtonsForTextFields'], (result) => {
    console.log('addActionButtonsForTextFields:', result.addActionButtonsForTextFields);
});

// Test text field detection
function testTextFieldDetection() {
    const inputs = document.querySelectorAll('input[type="text"], input[type="email"], input[type="search"], textarea, [contenteditable="true"]');
    console.log('Found text fields:', inputs.length);
    
    inputs.forEach((field, index) => {
        console.log(`Field ${index + 1}:`, {
            tag: field.tagName,
            type: field.type || 'N/A',
            contentEditable: field.hasAttribute('contenteditable'),
            value: field.value || field.innerHTML || 'empty'
        });
    });
}

// Test focus events
document.addEventListener('focus', (e) => {
    const target = e.target;
    const isTextField = (
        target.tagName === "INPUT" && (
            target.type == 'text' || 
            target.type == 'email' || 
            target.type == 'search'
        )) ||  target.tagName === "TEXTAREA" || target.hasAttribute('contenteditable');
    
    if (isTextField) {
        console.log('✓ Text field focused:', target.tagName, target.type);
    }
}, true);

document.addEventListener('click', (e) => {
    const target = e.target;
    const isTextField = (
        target.tagName === "INPUT" && (
            target.type == 'text' || 
            target.type == 'email' || 
            target.type == 'search'
        )) ||  target.tagName === "TEXTAREA" || target.hasAttribute('contenteditable');
    
    if (isTextField) {
        console.log('✓ Text field clicked:', target.tagName, target.type);
        
        // Check if tooltip appears after a delay
        setTimeout(() => {
            const tooltip = document.querySelector('.selecton-tooltip');
            if (tooltip) {
                console.log('✓ Tooltip found:', tooltip.innerHTML.length > 0 ? 'has content' : 'empty');
            } else {
                console.log('✗ No tooltip found');
            }
        }, 100);
    }
}, true);

// Run initial test
testTextFieldDetection();

console.log('=== END DEBUG ===');
console.log('Click on text fields to see debug output');

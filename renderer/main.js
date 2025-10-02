// Main entry point for the TermInA frontend application

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOM is ready. Initializing application...');

    // Check if all necessary classes are available
    if (typeof SimpleTerminal !== 'undefined' && typeof PTYTerminal !== 'undefined' && typeof AIStatusManager !== 'undefined') {
        console.log('✅ All required classes are available.');

        // Initialize the main terminal component
        if (!window.simpleTerminal) {
            console.log('Creating new SimpleTerminal instance...');
            window.simpleTerminal = new SimpleTerminal();
            window.simpleTerminal.init(); // Explicitly call init
            console.log('SimpleTerminal instance created and initialized.');
        } else {
            console.log('SimpleTerminal instance already exists.');
        }
    } else {
        console.error('❌ Critical Error: Not all required classes are loaded. Check script order in index.html.');
        // Provide feedback in the UI
        const terminalContainer = document.getElementById('terminal');
        if (terminalContainer) {
            terminalContainer.innerHTML = '<div style="color: red; padding: 10px;">Error: Application failed to load. Please check the console for details.</div>';
        }
    }
});

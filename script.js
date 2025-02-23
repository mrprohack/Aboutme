// script.js

// This file will contain JavaScript for interactivity in the future. 

// Update clock
function updateClock() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { 
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
    });
    document.getElementById('clock').textContent = timeString;
}

setInterval(updateClock, 1000);
updateClock();

// Window Management System
class WindowManager {
    constructor() {
        this.windows = {};
        this.activeWindow = null;
        this.zIndex = 100;
        this.snapThreshold = 20; // pixels from screen edge to trigger snap
        this.screenWidth = window.innerWidth;
        this.screenHeight = window.innerHeight;

        // Initialize windows
        document.querySelectorAll('.window').forEach(window => {
            const id = window.id;
            this.windows[id] = {
                element: window,
                isOpen: false,
                position: { x: 0, y: 0 },
                size: { width: '', height: '' },
                isMaximized: false,
                lastPosition: null,
                lastSize: null
            };
            this.setupWindowControls(id);
        });

        // Setup click handlers for icons and menu items
        document.querySelectorAll('[data-window]').forEach(trigger => {
            trigger.addEventListener('click', () => {
                const windowId = trigger.getAttribute('data-window');
                this.openWindow(windowId);
            });
        });

        // Global keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (this.activeWindow) {
                const window = this.windows[this.activeWindow];
                // Alt + F4 to close window
                if (e.altKey && e.key === 'F4') {
                    this.closeWindow(this.activeWindow);
                }
                // Alt + Space to show window menu
                if (e.altKey && e.key === ' ') {
                    this.showWindowMenu(this.activeWindow);
                }
                // Windows/Meta + Up to maximize
                if (e.metaKey && e.key === 'ArrowUp') {
                    this.maximizeWindow(this.activeWindow);
                }
                // Windows/Meta + Down to restore/minimize
                if (e.metaKey && e.key === 'ArrowDown') {
                    if (window.isMaximized) {
                        this.restoreWindow(this.activeWindow);
                    } else {
                        this.minimizeWindow(this.activeWindow);
                    }
                }
                // Windows/Meta + Left/Right to snap to sides
                if (e.metaKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
                    this.snapWindow(this.activeWindow, e.key === 'ArrowLeft' ? 'left' : 'right');
                }
            }
        });

        // Handle window resize
        window.addEventListener('resize', () => {
            this.screenWidth = window.innerWidth;
            this.screenHeight = window.innerHeight;
            this.updateMaximizedWindows();
        });
    }

    setupWindowControls(windowId) {
        const window = this.windows[windowId];
        const element = window.element;
        const header = element.querySelector('.window-header');
        
        let isDragging = false;
        let currentX;
        let currentY;
        let initialX;
        let initialY;
        let xOffset = 0;
        let yOffset = 0;
        let dragStartTime;
        let lastClickTime = 0;

        const dragStart = (e) => {
            if (e.target === header || e.target.parentElement === header) {
                if (e.target.classList.contains('window-controls') || 
                    e.target.parentElement.classList.contains('window-controls')) {
                    return;
                }

                // Handle double click on title bar
                const clickTime = new Date().getTime();
                if (clickTime - lastClickTime < 300) {
                    this.maximizeWindow(windowId);
                    return;
                }
                lastClickTime = clickTime;

                const rect = element.getBoundingClientRect();
                initialX = e.clientX - rect.left;
                initialY = e.clientY - rect.top;
                
                isDragging = true;
                dragStartTime = new Date().getTime();
                element.classList.add('dragging');
                
                // Store current position and size before drag
                window.lastPosition = { x: rect.left, y: rect.top };
                window.lastSize = { width: rect.width, height: rect.height };
                
                this.focusWindow(windowId);
            }
        };

        const drag = (e) => {
            if (isDragging) {
                e.preventDefault();
                
                currentX = e.clientX - initialX;
                currentY = e.clientY - initialY;

                // Constrain to window boundaries
                currentX = Math.max(0, Math.min(currentX, this.screenWidth - element.offsetWidth));
                currentY = Math.max(28, Math.min(currentY, this.screenHeight - element.offsetHeight));

                // Check for window snapping
                if (currentX < this.snapThreshold) { // Left edge
                    this.snapWindow(windowId, 'left');
                    isDragging = false;
                    return;
                }
                if (currentX > this.screenWidth - this.snapThreshold - element.offsetWidth) { // Right edge
                    this.snapWindow(windowId, 'right');
                    isDragging = false;
                    return;
                }
                if (currentY < this.snapThreshold + 28) { // Top edge
                    this.maximizeWindow(windowId);
                    isDragging = false;
                    return;
                }

                element.style.left = currentX + 'px';
                element.style.top = currentY + 'px';
                element.style.transform = 'none';

                // Show snap preview
                this.showSnapPreview(e.clientX, e.clientY);
            }
        };

        const dragEnd = () => {
            if (isDragging) {
                isDragging = false;
                element.classList.remove('dragging');
                this.hideSnapPreview();
                
                // Update window position
                const rect = element.getBoundingClientRect();
                window.position = { x: rect.left, y: rect.top };
                
                // If the drag was very short (like a click), restore position
                if (new Date().getTime() - dragStartTime < 100) {
                    element.style.left = window.lastPosition.x + 'px';
                    element.style.top = window.lastPosition.y + 'px';
                }
            }
        };

        header.addEventListener('mousedown', dragStart);
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', dragEnd);

        // Window controls
        const controls = element.querySelector('.window-controls');
        if (controls) {
            const closeBtn = controls.querySelector('.close');
            const maximizeBtn = controls.querySelector('.maximize');
            const minimizeBtn = controls.querySelector('.minimize');

            if (closeBtn) {
                closeBtn.addEventListener('click', () => this.closeWindow(windowId));
            }

            if (maximizeBtn) {
                maximizeBtn.addEventListener('click', () => this.maximizeWindow(windowId));
            }

            if (minimizeBtn) {
                minimizeBtn.addEventListener('click', () => this.minimizeWindow(windowId));
            }
        }

        // Focus window on click
        element.addEventListener('mousedown', () => this.focusWindow(windowId));

        // Add resize handles
        this.addResizeHandles(windowId);
    }

    addResizeHandles(windowId) {
        const window = this.windows[windowId];
        const element = window.element;
        
        // Create resize handles
        const handles = ['n', 'e', 's', 'w', 'ne', 'se', 'sw', 'nw'];
        handles.forEach(direction => {
            const handle = document.createElement('div');
            handle.className = `resize-handle resize-${direction}`;
            element.appendChild(handle);
            
            let startX, startY, startWidth, startHeight, startLeft, startTop;
            
            const startResize = (e) => {
                e.preventDefault();
                startX = e.clientX;
                startY = e.clientY;
                const rect = element.getBoundingClientRect();
                startWidth = rect.width;
                startHeight = rect.height;
                startLeft = rect.left;
                startTop = rect.top;
                element.classList.add('resizing');
                document.addEventListener('mousemove', resize);
                document.addEventListener('mouseup', stopResize);
            };
            
            const resize = (e) => {
                const dx = e.clientX - startX;
                const dy = e.clientY - startY;
                
                // Minimum size constraints
                const minWidth = 400;
                const minHeight = 300;
                
                if (direction.includes('e')) {
                    const newWidth = Math.max(minWidth, startWidth + dx);
                    element.style.width = `${newWidth}px`;
                }
                if (direction.includes('s')) {
                    const newHeight = Math.max(minHeight, startHeight + dy);
                    element.style.height = `${newHeight}px`;
                }
                if (direction.includes('w')) {
                    const newWidth = Math.max(minWidth, startWidth - dx);
                    const newLeft = startLeft + (startWidth - newWidth);
                    element.style.width = `${newWidth}px`;
                    element.style.left = `${newLeft}px`;
                }
                if (direction.includes('n')) {
                    const newHeight = Math.max(minHeight, startHeight - dy);
                    const newTop = startTop + (startHeight - newHeight);
                    element.style.height = `${newHeight}px`;
                    element.style.top = `${newTop}px`;
                }
                
                // Update window position
                const rect = element.getBoundingClientRect();
                window.position = { x: rect.left, y: rect.top };
            };
            
            const stopResize = () => {
                element.classList.remove('resizing');
                document.removeEventListener('mousemove', resize);
                document.removeEventListener('mouseup', stopResize);
            };
            
            handle.addEventListener('mousedown', startResize);
        });
    }

    snapWindow(windowId, direction) {
        const window = this.windows[windowId];
        if (!window) return;

        const element = window.element;
        window.isMaximized = false;

        switch (direction) {
            case 'left':
                element.style.top = '28px';
                element.style.left = '0';
                element.style.width = '50%';
                element.style.height = 'calc(100vh - 28px)';
                break;
            case 'right':
                element.style.top = '28px';
                element.style.left = '50%';
                element.style.width = '50%';
                element.style.height = 'calc(100vh - 28px)';
                break;
        }
        element.style.transform = 'none';
    }

    showSnapPreview(x, y) {
        if (!this.snapPreview) {
            this.snapPreview = document.createElement('div');
            this.snapPreview.className = 'snap-preview';
            document.body.appendChild(this.snapPreview);
        }

        if (x < this.snapThreshold) {
            this.snapPreview.style.left = '0';
            this.snapPreview.style.top = '28px';
            this.snapPreview.style.width = '50%';
            this.snapPreview.style.height = 'calc(100vh - 28px)';
            this.snapPreview.style.display = 'block';
        } else if (x > this.screenWidth - this.snapThreshold) {
            this.snapPreview.style.left = '50%';
            this.snapPreview.style.top = '28px';
            this.snapPreview.style.width = '50%';
            this.snapPreview.style.height = 'calc(100vh - 28px)';
            this.snapPreview.style.display = 'block';
        } else {
            this.hideSnapPreview();
        }
    }

    hideSnapPreview() {
        if (this.snapPreview) {
            this.snapPreview.style.display = 'none';
        }
    }

    showWindowMenu(windowId) {
        // Implement window menu (minimize, maximize, close)
        const menu = document.createElement('div');
        menu.className = 'window-menu';
        menu.innerHTML = `
            <div class="menu-item">Minimize</div>
            <div class="menu-item">Maximize</div>
            <div class="menu-item">Close</div>
        `;
        
        const window = this.windows[windowId];
        const rect = window.element.getBoundingClientRect();
        menu.style.left = `${rect.left}px`;
        menu.style.top = `${rect.top + 28}px`;
        
        document.body.appendChild(menu);
        
        const closeMenu = () => {
            document.body.removeChild(menu);
            document.removeEventListener('click', closeMenu);
        };
        
        setTimeout(() => {
            document.addEventListener('click', closeMenu);
        }, 0);
    }

    restoreWindow(windowId) {
        const window = this.windows[windowId];
        if (window && window.lastPosition && window.lastSize) {
            window.isMaximized = false;
            window.element.style.width = window.lastSize.width + 'px';
            window.element.style.height = window.lastSize.height + 'px';
            this.updateWindowPosition(windowId, window.lastPosition.x, window.lastPosition.y);
        }
    }

    updateMaximizedWindows() {
        Object.keys(this.windows).forEach(windowId => {
            const window = this.windows[windowId];
            if (window.isMaximized) {
                window.element.style.width = '100%';
                window.element.style.height = 'calc(100vh - 28px)';
            }
        });
    }

    openWindow(windowId) {
        const window = this.windows[windowId];
        if (window) {
            window.isOpen = true;
            window.element.style.display = 'block';
            this.focusWindow(windowId);
            
            // Position the window if it hasn't been moved yet
            if (window.position.x === 0 && window.position.y === 0) {
                window.position = {
                    x: 50 + Math.random() * 100,
                    y: 50 + Math.random() * 100
                };
                this.updateWindowPosition(windowId);
            }
        }
    }

    closeWindow(windowId) {
        const window = this.windows[windowId];
        if (window) {
            window.isOpen = false;
            window.element.style.display = 'none';
        }
    }

    focusWindow(windowId) {
        const window = this.windows[windowId];
        if (window) {
            this.zIndex++;
            window.element.style.zIndex = this.zIndex;
            
            // Remove active class from all windows
            Object.values(this.windows).forEach(w => {
                w.element.classList.remove('active');
            });
            
            // Add active class to focused window
            window.element.classList.add('active');
            this.activeWindow = windowId;
        }
    }

    maximizeWindow(windowId) {
        const window = this.windows[windowId];
        if (window) {
            const element = window.element;
            if (element.style.width === '100%') {
                // Restore
                element.style.width = '';
                element.style.height = '';
                element.style.top = '';
                element.style.left = '';
                this.updateWindowPosition(windowId);
            } else {
                // Maximize
                window.position = { x: 0, y: 0 };
                element.style.width = '100%';
                element.style.height = 'calc(100vh - 28px)';
                element.style.top = '28px';
                element.style.left = '0';
                element.style.transform = 'none';
            }
        }
    }

    minimizeWindow(windowId) {
        const window = this.windows[windowId];
        if (window) {
            window.element.style.display = 'none';
        }
    }

    updateWindowPosition(windowId) {
        const window = this.windows[windowId];
        if (window) {
            window.element.style.transform = 
                `translate(${window.position.x}px, ${window.position.y}px)`;
        }
    }
}

// Initialize Window Manager
const windowManager = new WindowManager();

// Terminal functionality
const terminalInput = document.getElementById('terminal-input');
const terminalOutput = document.getElementById('terminal-output');
let commandHistory = [];
let historyIndex = -1;

// Function to ensure terminal is scrolled to the latest content
function scrollToBottom() {
    terminalOutput.scrollTop = terminalOutput.scrollHeight;
    terminalInput.scrollIntoView({ behavior: 'smooth' });
}

// Add smooth scrolling to terminal output
terminalOutput.style.scrollBehavior = 'smooth';

terminalInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        const command = this.value.trim();
        if (command) {
            executeCommand(command);
            commandHistory.push(command);
            historyIndex = commandHistory.length;
            this.value = '';
            // Scroll to bottom after command execution
            setTimeout(scrollToBottom, 0);
        }
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (historyIndex > 0) {
            historyIndex--;
            this.value = commandHistory[historyIndex];
        }
    } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (historyIndex < commandHistory.length - 1) {
            historyIndex++;
            this.value = commandHistory[historyIndex];
        } else {
            historyIndex = commandHistory.length;
            this.value = '';
        }
    }
});

// Add input focus handling
terminalInput.addEventListener('focus', scrollToBottom);

function executeCommand(command) {
    const output = document.createElement('div');
    // Clear previous prompt before adding new command
    terminalOutput.innerHTML += `<span class="prompt">[mrprohack@localhost ~]$</span> ${command}<br>`;
    
    switch(command.toLowerCase()) {
        case 'help':
            output.innerHTML += `
                Available commands:<br>
                - help: Show this help message<br>
                - clear: Clear the terminal<br>
                - date: Show current date and time<br>
                - ls: List directory contents<br>
                - whoami: Show current user<br>
                - open [file/folder]: Open file manager<br>
                - about me: Show user information<br>
                - job: Show job information<br>
            `;
            break;
        case 'clear':
            terminalOutput.innerHTML = '';
            return;
        case 'date':
            output.innerHTML += new Date().toString() + '<br>';
            break;
        case 'ls':
            output.innerHTML += `
                Documents/<br>
                Downloads/<br>
                Pictures/<br>
                readme.txt<br>
            `;
            break;
        case 'whoami':
            output.innerHTML += 'Manikandan<br>';
            break;
        case 'about me':
            output.innerHTML += `
                Name: Manikandan<br>
                About: A developer passionate about:<br>
                <br>
                🤖 AI & LLMs<br>
                🖼️ Image Generation<br>
                💻 Development<br>
                🔐 Cybersecurity<br>
                <br>
                🚀 Exploring AI, building cool projects, and learning every day!<br>
            `;
            break;
        case 'job':
            output.innerHTML += `
                Job: Developer<br>
                Specializations:<br>
                - Artificial Intelligence<br>
                - Large Language Models<br>
                - Image Generation<br>
                - Software Development<br>
                - Cybersecurity<br>
            `;
            break;
        case 'open documents':
        case 'open documents/':
            windowManager.openWindow('documents-folder');
            output.innerHTML += 'Opening Documents folder...<br>';
            break;
        case 'open home':
        case 'open ~':
            windowManager.openWindow('home-folder');
            output.innerHTML += 'Opening Home folder...<br>';
            break;
        default:
            if (command.startsWith('open ')) {
                output.innerHTML += `File or directory not found: ${command.slice(5)}<br>`;
            } else {
                output.innerHTML += `Command not found: ${command}<br>`;
            }
    }
    
    terminalOutput.appendChild(output);
    // Use the new scrollToBottom function
    setTimeout(scrollToBottom, 0);
}

// Phone window functionality
const phoneWindow = document.getElementById('phone');
const phoneHeader = phoneWindow.querySelector('.window-header');

phoneHeader.addEventListener('mousedown', (e) => {
    if (e.target === phoneHeader || e.target.parentElement === phoneHeader) {
        windowManager.focusWindow('phone');
    }
});

const phoneCloseBtn = phoneWindow.querySelector('.close');
phoneCloseBtn.addEventListener('click', () => {
    windowManager.closeWindow('phone');
});

const phoneMinimizeBtn = phoneWindow.querySelector('.minimize');
phoneMinimizeBtn.addEventListener('click', () => {
    windowManager.minimizeWindow('phone');
});

const phoneMaximizeBtn = phoneWindow.querySelector('.maximize');
phoneMaximizeBtn.addEventListener('click', () => {
    windowManager.maximizeWindow('phone');
});

// Open phone window from start menu
const phoneMenuItem = document.querySelector('.menu-item[data-window="phone"]');
phoneMenuItem.addEventListener('click', () => {
    windowManager.openWindow('phone');
});

// Open About Me window from start menu
const aboutMeMenuItem = document.createElement('div');
aboutMeMenuItem.className = 'menu-item';
aboutMeMenuItem.setAttribute('data-window', 'about-me');
aboutMeMenuItem.innerHTML = '<i class="fas fa-user"></i> About Me';

const startMenu = document.getElementById('start-menu');
startMenu.appendChild(aboutMeMenuItem);

aboutMeMenuItem.addEventListener('click', () => {
    windowManager.openWindow('about-me');
}); 
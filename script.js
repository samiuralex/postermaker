
// State
const state = {
    templateImage: null,
    templateType: 'image', // 'image' or 'svg'
    svgContent: null, // Raw SVG string
    userImage: null,
    userImageSrc: null, // Keep raw base64 for SVG injection
    userName: '',
    config: {
        x: 50,
        y: 50,
        width: 200,
        height: 200
    },
    // Image Controls
    imageScale: 1.0,
    imageX: 0,
    imageY: 0,

    isAdminMode: false,
    isDragging: false,
    dragStart: { x: 0, y: 0 }
};

// DOM Elements
const elements = {
    toggleAdminBtn: document.getElementById('toggle-admin-btn'),
    adminSection: document.getElementById('admin-section'),
    templateUpload: document.getElementById('template-upload'),
    userPhotoUpload: document.getElementById('user-photo-upload'),
    userNameInput: document.getElementById('user-name-input'),
    photoLabelText: document.getElementById('photo-label-text'),
    canvas: document.getElementById('poster-canvas'),
    ctx: document.getElementById('poster-canvas').getContext('2d'),
    downloadBtn: document.getElementById('download-btn'),
    inputs: {
        x: document.getElementById('slot-x'),
        y: document.getElementById('slot-y'),
        w: document.getElementById('slot-w'),
        h: document.getElementById('slot-h')
    },
    saveConfigBtn: document.getElementById('save-config-btn')
};

// Initialize
function init() {
    setupEventListeners();
    const savedConfig = localStorage.getItem('poster_config');
    if (savedConfig) {
        state.config = JSON.parse(savedConfig);
        updateConfigInputs();
    }

    // Default canvas size
    elements.canvas.width = 800;
    elements.canvas.height = 600;

    // Draw placeholder or load default template
    if (typeof DEFAULT_SVG_TEMPLATE !== 'undefined') {
        processSVGString(DEFAULT_SVG_TEMPLATE);
    } else {
        drawCanvas();
    }
}

function setupEventListeners() {
    elements.toggleAdminBtn.addEventListener('click', toggleAdminMode);
    elements.templateUpload.addEventListener('change', handleTemplateUpload);
    elements.userPhotoUpload.addEventListener('change', handleUserPhotoUpload);
    elements.userNameInput.addEventListener('input', (e) => {
        state.userName = e.target.value;
        drawCanvas();
    });
    elements.downloadBtn.addEventListener('click', downloadPoster);
    elements.saveConfigBtn.addEventListener('click', saveConfig);

    // Config inputs
    Object.keys(elements.inputs).forEach(key => {
        elements.inputs[key].addEventListener('input', updateConfigFromInputs);
    });

    // Canvas Interaction
    elements.canvas.addEventListener('mousedown', handleCanvasMouseDown);
    elements.canvas.addEventListener('mousemove', handleCanvasMouseMove);
    elements.canvas.addEventListener('mouseup', handleCanvasMouseUp);
    elements.canvas.addEventListener('wheel', handleCanvasWheel);
}

function toggleAdminMode() {
    state.isAdminMode = !state.isAdminMode;
    elements.adminSection.classList.toggle('hidden', !state.isAdminMode);
    elements.toggleAdminBtn.textContent = state.isAdminMode ? 'Exit Admin' : 'Admin Setup';
    drawCanvas();
}

function handleTemplateUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type === 'image/svg+xml') {
        state.templateType = 'svg';
        const reader = new FileReader();
        reader.onload = (event) => {
            processSVGString(event.target.result);
        };
        reader.readAsText(file);
    } else {
        state.templateType = 'image';
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                state.templateImage = img;
                elements.canvas.width = img.width;
                elements.canvas.height = img.height;
                drawCanvas();
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }
}

function handleUserPhotoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    elements.photoLabelText.textContent = file.name;

    const reader = new FileReader();
    reader.onload = (event) => {
        state.userImageSrc = event.target.result;
        const img = new Image();
        img.onload = () => {
            state.userImage = img;
            // Reset image position on new upload
            state.imageScale = 1.0;
            state.imageX = 0;
            state.imageY = 0;
            elements.downloadBtn.disabled = false;
            drawCanvas();
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

function updateConfigInputs() {
    elements.inputs.x.value = state.config.x;
    elements.inputs.y.value = state.config.y;
    elements.inputs.w.value = state.config.width;
    elements.inputs.h.value = state.config.height;
}

function updateConfigFromInputs() {
    state.config.x = parseInt(elements.inputs.x.value) || 0;
    state.config.y = parseInt(elements.inputs.y.value) || 0;
    state.config.width = parseInt(elements.inputs.w.value) || 0;
    state.config.height = parseInt(elements.inputs.h.value) || 0;
    drawCanvas();
}

// Canvas Interaction Logic
function handleCanvasMouseDown(e) {
    const rect = elements.canvas.getBoundingClientRect();
    const scaleX = elements.canvas.width / rect.width;
    const scaleY = elements.canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    state.isDragging = true;
    state.dragStart = { x, y };

    // Admin Mode: Define Slot
    if (state.isAdminMode && state.templateType !== 'svg') {
        state.config.x = Math.round(x);
        state.config.y = Math.round(y);
        state.config.width = 0;
        state.config.height = 0;
        updateConfigInputs();
        drawCanvas();
        return;
    }

    // Default Mode (SVG): Drag Image
    // Just start tracking, logic in Move
}

function handleCanvasMouseMove(e) {
    if (!state.isDragging) return;

    const rect = elements.canvas.getBoundingClientRect();
    const scaleX = elements.canvas.width / rect.width;
    const scaleY = elements.canvas.height / rect.height;
    const currentX = (e.clientX - rect.left) * scaleX;
    const currentY = (e.clientY - rect.top) * scaleY;

    const deltaX = currentX - state.dragStart.x;
    const deltaY = currentY - state.dragStart.y;

    if (state.isAdminMode && state.templateType !== 'svg') {
        // Admin Slot Logic
        if (deltaX < 0) {
            state.config.x = Math.round(currentX);
            state.config.width = Math.round(Math.abs(deltaX));
        } else {
            state.config.x = Math.round(state.dragStart.x);
            state.config.width = Math.round(deltaX);
        }
        if (deltaY < 0) {
            state.config.y = Math.round(currentY);
            state.config.height = Math.round(Math.abs(deltaY));
        } else {
            state.config.y = Math.round(state.dragStart.y);
            state.config.height = Math.round(deltaY);
        }
        updateConfigInputs();
    } else {
        // Visual Positioning (SVG or Standard)
        // For SVG, we update state.imageX/Y
        // deltaX is in canvas coordinates.
        // We add this delta to the image position and reset dragStart
        state.imageX += deltaX;
        state.imageY += deltaY;
        state.dragStart = { x: currentX, y: currentY };
    }

    drawCanvas();
}

function handleCanvasMouseUp(e) {
    if (state.isDragging) {
        state.isDragging = false;

        if (state.isAdminMode && state.templateType !== 'svg') {
            if (state.config.width < 0) {
                state.config.x += state.config.width;
                state.config.width = Math.abs(state.config.width);
            }
            if (state.config.height < 0) {
                state.config.y += state.config.height;
                state.config.height = Math.abs(state.config.height);
            }
            updateConfigInputs();
            drawCanvas();
        }
    }
}

function handleCanvasWheel(e) {
    e.preventDefault(); // Prevent page scroll
    if (state.isAdminMode) return;

    const zoomIntensity = 0.1;
    if (e.deltaY < 0) {
        // Zoom In
        state.imageScale = Math.min(3.0, state.imageScale + zoomIntensity);
    } else {
        // Zoom Out
        state.imageScale = Math.max(0.1, state.imageScale - zoomIntensity);
    }

    drawCanvas();
}

function saveConfig() {
    localStorage.setItem('poster_config', JSON.stringify(state.config));
    alert('Configuration saved!');
}

async function drawCanvas() {
    const { ctx, canvas } = elements;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (state.templateType === 'svg' && state.svgContent) {
        await drawSmartSVG();
    } else {
        drawStandardTemplate();
    }
}

function drawStandardTemplate() {
    const { ctx, canvas } = elements;

    // 1. Draw Background
    if (state.templateImage) {
        ctx.drawImage(state.templateImage, 0, 0);
    } else {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#94a3b8';
        ctx.textAlign = 'center';
        ctx.font = '20px Outfit';
        ctx.fillText('No Template Loaded', canvas.width / 2, canvas.height / 2);
    }

    // 2. Draw User Image
    if (state.userImage) {
        // Apply similar logic for consistency? Or stick to simple config rect? 
        // Let's support pan/zoom here too if we want "Visual Positioning" globally.
        // But for now, stick to the config rect unless we detect "Smart Mode" implies different handling.
        // Actually, let's keep it simple: Standard Mode uses Admin Config Slot.
        // But we added visual positioning tasks specifically for "Refine SVG Targeting".

        ctx.drawImage(
            state.userImage,
            state.config.x,
            state.config.y,
            state.config.width,
            state.config.height
        );
    }

    // 3. Draw Name (Simple Overlay for Standard Mode)
    if (state.userName) {
        ctx.fillStyle = 'white';
        ctx.font = 'bold 20px "Noto Sans Bengali", Outfit, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(state.userName, canvas.width / 2, canvas.height - 50);
    }

    // 4. Draw Admin Guides
    if (state.isAdminMode) {
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 4;
        ctx.setLineDash([10, 5]);
        ctx.strokeRect(
            state.config.x,
            state.config.y,
            state.config.width,
            state.config.height
        );
        ctx.setLineDash([]);

        ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
        ctx.fillRect(
            state.config.x,
            state.config.y,
            state.config.width,
            state.config.height
        );
    }
}

async function drawSmartSVG() {
    const { ctx, canvas } = elements;
    const parser = new DOMParser();
    const doc = parser.parseFromString(state.svgContent, 'image/svg+xml');
    const svg = doc.querySelector('svg');

    // 1. Find Red Circle (Placeholder for Image)
    let redElement = doc.querySelector('[fill="#ff0000"], [fill="red"]');

    // Fallback logic
    let clipPathIdForImage = null;
    let targetX = 0, targetY = 0, targetW = 800, targetH = 600;

    if (!redElement) {
        const specificClip = doc.getElementById('70f4b2e59f'); // Middle circle clip path
        if (specificClip) {
            clipPathIdForImage = '70f4b2e59f';
            // Default center for this clip logic... 
            // Based on previous analysis: bounds ~ x=251, y=251, w=307, h=307. Center 405, 405.
            targetX = 251; targetY = 251; targetW = 307; targetH = 307;
            // Or just default to full canvas for safety if we pan/zoom? 
            // It's safer to center it. 
        }
    }

    if (state.userImageSrc) {
        let clipIdToUse = clipPathIdForImage;

        if (redElement) {
            const defs = doc.querySelector('defs') || document.createElementNS('http://www.w3.org/2000/svg', 'defs');
            if (!doc.querySelector('defs')) svg.prepend(defs);

            clipIdToUse = 'clip-' + Date.now();
            const clipPath = document.createElementNS('http://www.w3.org/2000/svg', 'clipPath');
            clipPath.setAttribute('id', clipIdToUse);

            const clone = redElement.cloneNode(true);
            clone.removeAttribute('fill');
            clipPath.appendChild(clone);
            defs.appendChild(clipPath);

            // Calculate dimensions from redElement
            if (redElement.tagName === 'circle') {
                const r = parseFloat(redElement.getAttribute('r'));
                targetW = targetH = r * 2;
                targetX = parseFloat(redElement.getAttribute('cx')) - r;
                targetY = parseFloat(redElement.getAttribute('cy')) - r;
            } else if (redElement.tagName === 'rect') {
                targetW = parseFloat(redElement.getAttribute('width'));
                targetH = parseFloat(redElement.getAttribute('height'));
                targetX = parseFloat(redElement.getAttribute('x')) || 0;
                targetY = parseFloat(redElement.getAttribute('y')) || 0;
            }
        }

        if (clipIdToUse) {
            const image = document.createElementNS('http://www.w3.org/2000/svg', 'image');
            image.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', state.userImageSrc);
            image.setAttribute('preserveAspectRatio', 'xMidYMid slice');

            // Image Transform Logic
            const centerX = targetX + targetW / 2;
            const centerY = targetY + targetH / 2;

            const scale = state.imageScale || 1.0;
            const panX = state.imageX || 0;
            const panY = state.imageY || 0;

            // Assume we want to fill the target area at scale 1.0
            // We set width/height to targetW/H * scale
            const scaledW = targetW * scale;
            const scaledH = targetH * scale;

            // Center the image
            const newX = centerX - (scaledW / 2) + panX;
            const newY = centerY - (scaledH / 2) + panY;

            image.setAttribute('x', newX);
            image.setAttribute('y', newY);
            image.setAttribute('width', scaledW);
            image.setAttribute('height', scaledH);

            image.setAttribute('clip-path', `url(#${clipIdToUse})`);

            if (redElement) {
                redElement.parentNode.replaceChild(image, redElement);
            } else {
                svg.appendChild(image);
            }
        }
    }

    // 2. Find Green Section (Placeholder for Text)
    // Always use fallback for now if no green element found
    let greenElement = doc.querySelector('[fill="#00ff00"], [fill="green"]');
    let textTargetX = 0, textTargetY = 0;

    if (!greenElement) {
        const specificFooterClip = doc.getElementById('6328c3845f');
        if (specificFooterClip) {
            textTargetX = 405;
            textTargetY = 778;
        }
    }

    if (state.userName) {
        if (greenElement) {
            let cx, cy;
            if (greenElement.tagName === 'rect') {
                const x = parseFloat(greenElement.getAttribute('x')) || 0;
                const y = parseFloat(greenElement.getAttribute('y')) || 0;
                const w = parseFloat(greenElement.getAttribute('width'));
                const h = parseFloat(greenElement.getAttribute('height'));
                cx = x + w / 2;
                cy = y + h / 2;
            } else {
                cx = 400; // default
                cy = 500;
            }
            textTargetX = cx;
            textTargetY = cy;
            greenElement.setAttribute('fill-opacity', '0');
        }

        if (greenElement || (textTargetX !== 0 && textTargetY !== 0)) {
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.textContent = state.userName;
            text.setAttribute('x', textTargetX);
            text.setAttribute('y', textTargetY);
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('dominant-baseline', 'middle');
            text.setAttribute('font-family', '"Noto Sans Bengali", Outfit, sans-serif');
            text.setAttribute('font-size', '24');
            text.setAttribute('font-weight', 'bold');
            text.setAttribute('fill', 'white');

            if (greenElement) {
                greenElement.parentNode.insertBefore(text, greenElement.nextSibling);
            } else {
                svg.appendChild(text);
            }
        }
    }

    const serializer = new XMLSerializer();
    const newSvgStr = serializer.serializeToString(doc);
    const img = new Image();

    // Fix for Chrome/Safari not rendering SVG with external refs in canvas often requires clean data URI or Blob URL
    const blob = new Blob([newSvgStr], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    return new Promise((resolve) => {
        img.onload = () => {
            ctx.drawImage(img, 0, 0);
            URL.revokeObjectURL(url);
            resolve();
        };
        img.src = url;
    });
}

function downloadPoster() {
    if (!state.templateImage && !state.svgContent) {
        alert("Please upload a template first.");
        return;
    }

    const wasAdmin = state.isAdminMode;
    state.isAdminMode = false;
    drawCanvas().then(() => {
        const link = document.createElement('a');
        link.download = 'poster.png';
        link.href = elements.canvas.toDataURL();
        link.click();

        state.isAdminMode = wasAdmin;
        drawCanvas();
    });
}

// Helper to process SVG string
function processSVGString(svgString) {
    state.svgContent = svgString;
    state.templateType = 'svg';

    // Parse SVG to set canvas dimensions
    const parser = new DOMParser();
    const doc = parser.parseFromString(state.svgContent, 'image/svg+xml');
    const svg = doc.querySelector('svg');

    // Try to get width/height from attributes or viewBox
    let width = svg.getAttribute('width');
    let height = svg.getAttribute('height');

    if (!width || !height) {
        const viewBox = svg.getAttribute('viewBox');
        if (viewBox) {
            const parts = viewBox.split(/\s+|,/);
            width = parts[2];
            height = parts[3];
        }
    }

    elements.canvas.width = parseInt(width) || 800;
    elements.canvas.height = parseInt(height) || 600;

    drawCanvas();
}

// Start
init();

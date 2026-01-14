
// State
const state = {
    templateImage: null,
    templateType: 'image', // 'image' or 'svg'
    svgContent: null, // Raw SVG string (working copy)
    originalSvgContent: null, // Original pristine SVG template
    userImage: null,
    userImageSrc: null, // Keep raw base64 for SVG injection
    userName: '',
    config: {
        x: 50,
        y: 50,
        width: 200,
        height: 200
    },
    // Image Controls for SVG mode
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

// Template-specific configuration for tamplate.svg
const TEMPLATE_CONFIG = {
    // Middle circle for image (clipPath ID: 70f4b2e59f)
    imageClipId: '70f4b2e59f',
    imageBounds: {
        x: 251.441406,
        y: 251.441406,
        width: 306.75, // 558.191406 - 251.441406
        height: 306.75
    },

    // Bottom section for text (clipPath ID: 6328c3845f)
    textClipId: '6328c3845f',
    textPosition: {
        x: 405, // Center of 810px width
        y: 778  // Bottom section center
    },

    // Canvas dimensions
    canvasWidth: 810,
    canvasHeight: 810
};

// Initialize
function init() {
    setupEventListeners();
    const savedConfig = localStorage.getItem('poster_config');
    if (savedConfig) {
        state.config = JSON.parse(savedConfig);
        updateConfigInputs();
    }

    // Set canvas size
    elements.canvas.width = TEMPLATE_CONFIG.canvasWidth;
    elements.canvas.height = TEMPLATE_CONFIG.canvasHeight;

    // Load default template from file
    fetch('tamplate.svg')
        .then(response => response.text())
        .then(svgText => {
            processSVGString(svgText);
        })
        .catch(error => {
            console.error('Error loading template:', error);
            drawCanvas();
        });
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

    // Canvas Interaction - only for SVG mode
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
    if (state.templateType !== 'svg') return;

    const rect = elements.canvas.getBoundingClientRect();
    const scaleX = elements.canvas.width / rect.width;
    const scaleY = elements.canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    state.isDragging = true;
    state.dragStart = { x, y };
}

function handleCanvasMouseMove(e) {
    if (!state.isDragging || state.templateType !== 'svg') return;

    const rect = elements.canvas.getBoundingClientRect();
    const scaleX = elements.canvas.width / rect.width;
    const scaleY = elements.canvas.height / rect.height;
    const currentX = (e.clientX - rect.left) * scaleX;
    const currentY = (e.clientY - rect.top) * scaleY;

    const deltaX = currentX - state.dragStart.x;
    const deltaY = currentY - state.dragStart.y;

    // Update image position
    state.imageX += deltaX;
    state.imageY += deltaY;
    state.dragStart = { x: currentX, y: currentY };

    drawCanvas();
}

function handleCanvasMouseUp(e) {
    state.isDragging = false;
}

function handleCanvasWheel(e) {
    e.preventDefault();
    if (state.isAdminMode || state.templateType !== 'svg') return;

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
        ctx.drawImage(
            state.userImage,
            state.config.x,
            state.config.y,
            state.config.width,
            state.config.height
        );
    }

    // 3. Draw Name
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

    // IMPORTANT: Always work on a fresh copy of the original template
    const freshSvgContent = state.originalSvgContent || state.svgContent;
    const doc = parser.parseFromString(freshSvgContent, 'image/svg+xml');
    const svg = doc.querySelector('svg');

    // 1. Insert User Image into the middle circle (clipPath: 70f4b2e59f)
    if (state.userImageSrc) {
        const imageClip = doc.getElementById(TEMPLATE_CONFIG.imageClipId);

        if (imageClip) {
            // Create image element
            const image = document.createElementNS('http://www.w3.org/2000/svg', 'image');
            image.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', state.userImageSrc);

            // Calculate position and size based on template bounds
            const bounds = TEMPLATE_CONFIG.imageBounds;
            const centerX = bounds.x + bounds.width / 2;
            const centerY = bounds.y + bounds.height / 2;

            const scale = state.imageScale || 1.0;
            const panX = state.imageX || 0;
            const panY = state.imageY || 0;

            // Scale the image to fill the circle
            const scaledW = bounds.width * scale;
            const scaledH = bounds.height * scale;

            // Center the image with pan offset
            const newX = centerX - (scaledW / 2) + panX;
            const newY = centerY - (scaledH / 2) + panY;

            image.setAttribute('x', newX);
            image.setAttribute('y', newY);
            image.setAttribute('width', scaledW);
            image.setAttribute('height', scaledH);
            image.setAttribute('preserveAspectRatio', 'xMidYMid slice');
            image.setAttribute('clip-path', `url(#${TEMPLATE_CONFIG.imageClipId})`);

            // Insert the image element into the SVG
            svg.appendChild(image);
        }
    }

    // 2. Insert User Name into the bottom text area (clipPath: 6328c3845f)
    if (state.userName) {
        const textPos = TEMPLATE_CONFIG.textPosition;

        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.textContent = state.userName;
        text.setAttribute('x', textPos.x);
        text.setAttribute('y', textPos.y);
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('dominant-baseline', 'middle');
        text.setAttribute('font-family', '"Noto Sans Bengali", sans-serif');
        text.setAttribute('font-size', '32');
        text.setAttribute('font-weight', 'bold');
        text.setAttribute('fill', 'white');

        svg.appendChild(text);
    }

    // 3. Render the modified SVG to canvas
    const serializer = new XMLSerializer();
    const newSvgStr = serializer.serializeToString(doc);
    const img = new Image();

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
    state.originalSvgContent = svgString; // Store pristine original
    state.svgContent = svgString; // Working copy
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

    elements.canvas.width = parseInt(width) || TEMPLATE_CONFIG.canvasWidth;
    elements.canvas.height = parseInt(height) || TEMPLATE_CONFIG.canvasHeight;

    drawCanvas();
}

// Start
init();

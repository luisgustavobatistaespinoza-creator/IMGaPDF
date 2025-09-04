// Inicialización de jsPDF
const { jsPDF } = window.jspdf;

// Estado de la aplicación
const state = {
    images: [],
    selectedImages: new Set()
};

// Elementos DOM
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const selectImagesBtn = document.getElementById('selectImagesBtn');
const imagesSection = document.getElementById('imagesSection');
const imagesList = document.getElementById('imagesList');
const selectAllBtn = document.getElementById('selectAllBtn');
const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
const deleteAllBtn = document.getElementById('deleteAllBtn');
const generatePdfBtn = document.getElementById('generatePdfBtn');
const pageSize = document.getElementById('pageSize');
const marginTop = document.getElementById('marginTop');
const marginRight = document.getElementById('marginRight');
const marginBottom = document.getElementById('marginBottom');
const marginLeft = document.getElementById('marginLeft');
const fileName = document.getElementById('fileName');

// Variables para el reordenamiento táctil
let touchDragEnabled = false;
let activeTouch = null;
let dragElement = null;
let placeholder = null;
let dragStartIndex = null;

// Inicialización de eventos
function initEvents() {
    // Eventos de drag and drop
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        handleFiles(e.dataTransfer.files);
    });

    // Eventos de click en la zona de drop
    dropZone.addEventListener('click', () => {
        fileInput.click();
    });

    selectImagesBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        fileInput.click();
    });

    // Evento para seleccionar archivos
    fileInput.addEventListener('change', () => {
        handleFiles(fileInput.files);
        fileInput.value = ''; // Resetear input para permitir seleccionar los mismos archivos otra vez
    });

    // Eventos de botones de gestión
    selectAllBtn.addEventListener('click', selectAllImages);
    deleteSelectedBtn.addEventListener('click', deleteSelectedImages);
    deleteAllBtn.addEventListener('click', deleteAllImages);
    generatePdfBtn.addEventListener('click', generatePDF);

    // Evento para habilitar/deshabilitar botón de generar PDF
    document.addEventListener('imageListUpdated', updateGenerateButton);
    
    // Inicializar eventos táctiles para el reordenamiento
    initTouchEvents();
}

// Inicializar eventos táctiles para arrastrar en dispositivos móviles
function initTouchEvents() {
    // Detectar si es un dispositivo táctil
    const isTouchDevice = 'ontouchstart' in document.documentElement;
    
    if (isTouchDevice) {
        // Añadir instrucciones para usuarios táctiles
        const instructions = document.createElement('div');
        instructions.className = 'touch-instructions';
        instructions.innerHTML = '<p>💡 Presiona prolongadamente sobre una imagen para arrastrarla</p>';
        imagesSection.appendChild(instructions);
        
        // Añadir eventos táctiles a cada elemento de imagen
        document.addEventListener('imageListUpdated', initImageTouchEvents);
    }
}

// Inicializar eventos táctiles para las imágenes
function initImageTouchEvents() {
    const imageItems = imagesList.querySelectorAll('.image-item');
    
    imageItems.forEach(item => {
        // Eliminar eventos anteriores para evitar duplicados
        item.ontouchstart = null;
        item.ontouchmove = null;
        item.ontouchend = null;
        item.ontouchcancel = null;
        
        // Evento para iniciar el arrastre táctil
        item.addEventListener('touchstart', handleTouchStart, { passive: false });
        item.addEventListener('touchmove', handleTouchMove, { passive: false });
        item.addEventListener('touchend', handleTouchEnd);
        item.addEventListener('touchcancel', handleTouchEnd);
    });
}

// Manejar el inicio de un toque
function handleTouchStart(e) {
    if (e.touches.length !== 1) return;
    
    activeTouch = e.touches[0];
    dragElement = this;
    dragStartIndex = Array.from(imagesList.children).indexOf(dragElement);
    
    // Crear un placeholder para mostrar dónde se insertará
    placeholder = document.createElement('div');
    placeholder.className = 'image-placeholder';
    imagesList.insertBefore(placeholder, dragElement);
    
    // Añadir clase de arrastre
    dragElement.classList.add('dragging');
    
    // Posicionar el elemento que se está arrastrando
    dragElement.style.position = 'absolute';
    dragElement.style.zIndex = '1000';
    updateElementPosition(e.touches[0]);
    
    touchDragEnabled = true;
    e.preventDefault();
}

// Manejar el movimiento durante el toque
function handleTouchMove(e) {
    if (!touchDragEnabled || e.touches.length !== 1) return;
    
    updateElementPosition(e.touches[0]);
    updatePlaceholderPosition();
    e.preventDefault();
}

// Manejar el final del toque
function handleTouchEnd() {
    if (!touchDragEnabled) return;
    
    // Restaurar estilos
    if (dragElement) {
        dragElement.classList.remove('dragging');
        dragElement.style.position = '';
        dragElement.style.zIndex = '';
        dragElement.style.left = '';
        dragElement.style.top = '';
    }
    
    // Mover el elemento a la nueva posición
    if (placeholder && placeholder.parentNode) {
        imagesList.insertBefore(dragElement, placeholder);
        imagesList.removeChild(placeholder);
        
        // Actualizar el estado según el nuevo orden
        const newIndex = Array.from(imagesList.children).indexOf(dragElement);
        if (dragStartIndex !== newIndex) {
            // Reordenar el array de imágenes en el estado
            const imageId = dragElement.dataset.id;
            const imageIndex = state.images.findIndex(img => img.id === imageId);
            const image = state.images[imageIndex];
            
            state.images.splice(imageIndex, 1);
            state.images.splice(newIndex, 0, image);
        }
    }
    
    // Resetear variables
    touchDragEnabled = false;
    activeTouch = null;
    dragElement = null;
    placeholder = null;
    dragStartIndex = null;
}

// Actualizar la posición del elemento durante el arrastre
function updateElementPosition(touch) {
    if (!dragElement) return;
    
    const rect = imagesList.getBoundingClientRect();
    const x = touch.clientX - rect.left - (dragElement.offsetWidth / 2);
    const y = touch.clientY - rect.top - (dragElement.offsetHeight / 2);
    
    dragElement.style.left = `${x}px`;
    dragElement.style.top = `${y}px`;
}

// Actualizar la posición del placeholder durante el arrastre
function updatePlaceholderPosition() {
    if (!placeholder || !dragElement) return;
    
    // Encontrar el elemento más cercano al punto de toque
    const items = Array.from(imagesList.children).filter(item => 
        item !== placeholder && item !== dragElement
    );
    
    let closestItem = null;
    let closestOffset = Number.NEGATIVE_INFINITY;
    
    // Determinar la posición del placeholder
    for (const item of items) {
        const rect = item.getBoundingClientRect();
        const offset = activeTouch.clientY - rect.top - rect.height / 2;
        
        if (offset < 0 && offset > closestOffset) {
            closestOffset = offset;
            closestItem = item;
        }
    }
    
    // Mover el placeholder a la posición correcta
    if (closestItem) {
        imagesList.insertBefore(placeholder, closestItem.nextSibling);
    } else {
        // Si no hay elemento cercano, colocar al final
        imagesList.appendChild(placeholder);
    }
}

// Manejar archivos cargados
function handleFiles(files) {
    const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) {
        alert('Por favor, selecciona solo archivos de imagen.');
        return;
    }
    
    // Procesar cada imagen
    imageFiles.forEach(file => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            const imageData = {
                id: Date.now() + Math.random().toString(36).substr(2, 9), // ID único
                name: file.name,
                dataUrl: e.target.result
            };
            
            state.images.push(imageData);
            renderImage(imageData);
            
            // Mostrar sección de imágenes si está oculta
            if (state.images.length > 0) {
                imagesSection.style.display = 'block';
            }
            
            // Disparar evento personalizado para actualizar UI
            document.dispatchEvent(new CustomEvent('imageListUpdated'));
        };
        
        reader.readAsDataURL(file);
    });
}

// Renderizar imagen en la lista
function renderImage(imageData) {
    const imageItem = document.createElement('div');
    imageItem.className = 'image-item';
    imageItem.draggable = true;
    imageItem.dataset.id = imageData.id;
    
    imageItem.innerHTML = `
        <input type="checkbox" class="image-checkbox" data-id="${imageData.id}">
        <img src="${imageData.dataUrl}" alt="${imageData.name}">
        <div class="image-actions">
            <button class="delete-btn" data-id="${imageData.id}" title="Eliminar imagen">✕</button>
        </div>
    `;
    
    // Eventos para la miniatura
    const checkbox = imageItem.querySelector('.image-checkbox');
    checkbox.addEventListener('change', (e) => {
        toggleImageSelection(imageData.id, e.target.checked);
    });
    
    const deleteBtn = imageItem.querySelector('.delete-btn');
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteImage(imageData.id);
    });
    
    // Hacer la imagen arrastrable (para desktop)
    imageItem.addEventListener('dragstart', handleDragStart);
    imageItem.addEventListener('dragover', handleDragOver);
    imageItem.addEventListener('dragenter', handleDragEnter);
    imageItem.addEventListener('dragleave', handleDragLeave);
    imageItem.addEventListener('drop', handleDrop);
    imageItem.addEventListener('dragend', handleDragEnd);
    
    imagesList.appendChild(imageItem);
}

// Funcionalidad de drag and drop para reordenar (para desktop)
let draggedItem = null;

function handleDragStart(e) {
    draggedItem = this;
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', this.dataset.id);
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}

function handleDragEnter(e) {
    this.classList.add('drag-over');
}

function handleDragLeave(e) {
    this.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    this.classList.remove('drag-over');
    
    if (draggedItem !== this) {
        // Reordenar en el DOM
        const allItems = Array.from(imagesList.querySelectorAll('.image-item'));
        const thisIndex = allItems.indexOf(this);
        const draggedIndex = allItems.indexOf(draggedItem);
        
        if (draggedIndex < thisIndex) {
            imagesList.insertBefore(draggedItem, this.nextSibling);
        } else {
            imagesList.insertBefore(draggedItem, this);
        }
        
        // Reordenar en el estado
        const imageId = draggedItem.dataset.id;
        const imageIndex = state.images.findIndex(img => img.id === imageId);
        const image = state.images[imageIndex];
        
        state.images.splice(imageIndex, 1);
        
        const newIndex = allItems.indexOf(this);
        state.images.splice(newIndex, 0, image);
    }
}

function handleDragEnd(e) {
    this.classList.remove('dragging');
    const items = imagesList.querySelectorAll('.image-item');
    items.forEach(item => item.classList.remove('drag-over'));
}

// Gestión de selección de imágenes
function toggleImageSelection(imageId, isSelected) {
    if (isSelected) {
        state.selectedImages.add(imageId);
    } else {
        state.selectedImages.delete(imageId);
    }
    
    updateDeleteButton();
}

function selectAllImages() {
    const checkboxes = imagesList.querySelectorAll('.image-checkbox');
    let allSelected = true;
    
    checkboxes.forEach(checkbox => {
        if (!checkbox.checked) {
            allSelected = false;
        }
    });
    
    checkboxes.forEach(checkbox => {
        checkbox.checked = !allSelected;
        toggleImageSelection(checkbox.dataset.id, !allSelected);
    });
    
    selectAllBtn.textContent = allSelected ? 'Seleccionar todas' : 'Deseleccionar todas';
}

function deleteSelectedImages() {
    if (state.selectedImages.size === 0) return;
    
    if (!confirm(`¿Estás seguro de que quieres eliminar ${state.selectedImages.size} imagen(es)?`)) {
        return;
    }
    
    state.images = state.images.filter(image => !state.selectedImages.has(image.id));
    state.selectedImages.clear();
    
    updateImagesList();
}

function deleteAllImages() {
    if (state.images.length === 0) return;
    
    if (!confirm('¿Estás seguro de que quieres eliminar todas las imágenes?')) {
        return;
    }
    
    state.images = [];
    state.selectedImages.clear();
    
    updateImagesList();
}

function deleteImage(imageId) {
    if (!confirm('¿Estás seguro de que quieres eliminar esta imagen?')) {
        return;
    }
    
    state.images = state.images.filter(image => image.id !== imageId);
    state.selectedImages.delete(imageId);
    
    updateImagesList();
}

// Actualizar la lista de imágenes en el DOM
function updateImagesList() {
    imagesList.innerHTML = '';
    state.images.forEach(renderImage);
    
    if (state.images.length === 0) {
        imagesSection.style.display = 'none';
    }
    
    updateDeleteButton();
    document.dispatchEvent(new CustomEvent('imageListUpdated'));
}

// Actualizar estado de botones
function updateDeleteButton() {
    deleteSelectedBtn.disabled = state.selectedImages.size === 0;
}

function updateGenerateButton() {
    generatePdfBtn.disabled = state.images.length === 0;
}

// Generar el PDF
async function generatePDF() {
    if (state.images.length === 0) {
        alert('No hay imágenes para generar el PDF.');
        return;
    }
    
    // Obtener configuración
    const pageSizeValue = pageSize.value;
    const margins = {
        top: parseFloat(marginTop.value),
        right: parseFloat(marginRight.value),
        bottom: parseFloat(marginBottom.value),
        left: parseFloat(marginLeft.value)
    };
    
    let pdfName = fileName.value.trim();
    if (pdfName === '') {
        pdfName = 'documento';
    }
    if (!pdfName.toLowerCase().endsWith('.pdf')) {
        pdfName += '.pdf';
    }
    
    // Dimensiones de página en mm (jsPDF usa mm)
    const pageDimensions = {
        'a4': { width: 210, height: 297 },
        'letter': { width: 216, height: 279 },
        'legal': { width: 216, height: 356 }
    };
    
    const { width: pageWidth, height: pageHeight } = pageDimensions[pageSizeValue];
    
    // Convertir márgenes de cm a mm
    const marginTopMM = margins.top * 10;
    const marginRightMM = margins.right * 10;
    const marginBottomMM = margins.bottom * 10;
    const marginLeftMM = margins.left * 10;
    
    // Calcular área útil de la página
    const contentWidth = pageWidth - marginLeftMM - marginRightMM;
    const contentHeight = pageHeight - marginTopMM - marginBottomMM;
    
    // Crear PDF
    const pdf = new jsPDF({
        orientation: contentWidth > contentHeight ? 'landscape' : 'portrait',
        unit: 'mm',
        format: pageSizeValue
    });
    
    // Procesar cada imagen
    for (let i = 0; i < state.images.length; i++) {
        if (i > 0) {
            pdf.addPage();
        }
        
        const imgData = state.images[i].dataUrl;
        
        // Crear imagen para obtener dimensiones originales
        const img = new Image();
        img.src = imgData;
        
        // Esperar a que la imagen cargue
        await new Promise(resolve => {
            img.onload = resolve;
        });
        
        // Redimensionar imagen para que ocupe el área útil (ignorando relación de aspecto)
        pdf.addImage({
            imageData: imgData,
            x: marginLeftMM,
            y: marginTopMM,
            width: contentWidth,
            height: contentHeight
        });
    }
    
    // Descargar PDF
    pdf.save(pdfName);
}

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    initEvents();
});
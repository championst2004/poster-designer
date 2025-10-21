document.addEventListener('DOMContentLoaded', () => {
        const wallWidthInput = document.getElementById('wallWidth');
        const wallHeightInput = document.getElementById('wallHeight');
        const unitsSelect = document.getElementById('units');
        const wallColorInput = document.getElementById('wallColor');
        const posterWidthInput = document.getElementById('posterWidth');
        const posterHeightInput = document.getElementById('posterHeight');
        const standardSizesSelect = document.getElementById('standardSizes');
        const posterImageInput = document.getElementById('posterImage');
        const imagePreviewContainer = document.getElementById('imagePreviewContainer');
        const imagePreview = document.getElementById('imagePreview');
        const addPosterBtn = document.getElementById('addPosterBtn');
        const clearAllBtn = document.getElementById('clearAllBtn');
        const wall = document.getElementById('wall');
        const canvasContainer = document.getElementById('canvasContainer');
        
        const layoutGridBtn = document.getElementById('layoutGrid');
        const layoutHorizontalBtn = document.getElementById('layoutHorizontal');
        const layoutVerticalBtn = document.getElementById('layoutVertical');
        const exportImageBtn = document.getElementById('exportImageBtn');


        let state = {
            wall: {
                width: 400,
                height: 250,
                units: 'cm'
            },
            posters: [],
            scale: 1,
            nextPosterId: 0,
            currentImage: null
        };
        
        function render() {
            const wallState = state.wall;
            const containerWidth = canvasContainer.clientWidth - 64; 
            const containerHeight = canvasContainer.clientHeight - 64;

            const widthRatio = containerWidth / wallState.width;
            const heightRatio = containerHeight / wallState.height;
            state.scale = Math.min(widthRatio, heightRatio);

            wall.style.width = `${wallState.width * state.scale}px`;
            wall.style.height = `${wallState.height * state.scale}px`;
            wall.innerHTML = ''; 

            state.posters.forEach(poster => {
                const posterEl = document.createElement('div');
                posterEl.classList.add('poster');
                posterEl.dataset.id = poster.id;
                posterEl.style.width = `${poster.width * state.scale}px`;
                posterEl.style.height = `${poster.height * state.scale}px`;
                posterEl.style.left = `${poster.x * state.scale}px`;
                posterEl.style.top = `${poster.y * state.scale}px`;
                posterEl.style.backgroundImage = `url(${poster.imageUrl})`;
                
                posterEl.addEventListener('mousedown', onMouseDown);
                wall.appendChild(posterEl);
            });
        }
        
        function updateWallDimensions() {
            state.wall.width = parseFloat(wallWidthInput.value) || 0;
            state.wall.height = parseFloat(wallHeightInput.value) || 0;
            state.wall.units = unitsSelect.value;
            render();
        }

        function handleImageUpload(event) {
            const file = event.target.files[0];
            if (!file) {
                state.currentImage = null;
                imagePreviewContainer.classList.add('hidden');
                addPosterBtn.disabled = true;
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                state.currentImage = e.target.result;
                imagePreview.src = state.currentImage;
                imagePreviewContainer.classList.remove('hidden');
                addPosterBtn.disabled = false;
                posterWidthInput.value = '';
                posterHeightInput.value = '';
                standardSizesSelect.value = '';
            };
            reader.readAsDataURL(file);
        }

        function addPoster() {
            let width = parseFloat(posterWidthInput.value);
            let height = parseFloat(posterHeightInput.value);

            if (isNaN(width) || isNaN(height) || width <= 0 || height <= 0 || !state.currentImage) {
                return;
            }

            const newPoster = {
                id: state.nextPosterId++,
                width: width,
                height: height,
                x: (state.wall.width / 2) - (width / 2),
                y: (state.wall.height / 2) - (height / 2),
                imageUrl: state.currentImage
            };
            state.posters.push(newPoster);
            
            posterWidthInput.value = '';
            posterHeightInput.value = '';
            standardSizesSelect.value = '';
            posterImageInput.value = '';
            state.currentImage = null;
            imagePreviewContainer.classList.add('hidden');
            addPosterBtn.disabled = true;

            render();
        }
        
        function clearAllPosters() {
            state.posters = [];
            state.nextPosterId = 0;
            render();
        }

        function handleStandardSizeChange() {
            const selectedValue = standardSizesSelect.value;
            if (!selectedValue) return;

            const [width, height] = selectedValue.split(',');
            posterWidthInput.value = width;
            posterHeightInput.value = height;
            
            const selectedOption = standardSizesSelect.options[standardSizesSelect.selectedIndex];
            const parentLabel = selectedOption.parentElement.label;
            
            if (parentLabel.includes('Inches')) {
                unitsSelect.value = 'in';
            } else {
                unitsSelect.value = 'cm';
            }
            updateWallDimensions();
        }

        let activePoster = null;
        let offsetX, offsetY;

        function onMouseDown(e) {
            e.preventDefault();
            const posterEl = e.currentTarget;
            posterEl.classList.add('dragging');
            
            const id = parseInt(posterEl.dataset.id);
            activePoster = state.posters.find(p => p.id === id);
            
            const wallRect = wall.getBoundingClientRect();
            
            offsetX = e.clientX - wallRect.left - (activePoster.x * state.scale);
            offsetY = e.clientY - wallRect.top - (activePoster.y * state.scale);
            
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        }

        function onMouseMove(e) {
            if (!activePoster) return;
            e.preventDefault();

            const wallRect = wall.getBoundingClientRect();
            let x = (e.clientX - wallRect.left - offsetX) / state.scale;
            let y = (e.clientY - wallRect.top - offsetY) / state.scale;
            
            x = Math.max(0, Math.min(x, state.wall.width - activePoster.width));
            y = Math.max(0, Math.min(y, state.wall.height - activePoster.height));

            activePoster.x = x;
            activePoster.y = y;

            const posterEl = wall.querySelector(`[data-id='${activePoster.id}']`);
            if (posterEl) {
                posterEl.style.left = `${x * state.scale}px`;
                posterEl.style.top = `${y * state.scale}px`;
            }
        }

        function onMouseUp(e) {
            if (!activePoster) return;
            const posterEl = wall.querySelector(`[data-id='${activePoster.id}']`);
            if (posterEl) {
                posterEl.classList.remove('dragging');
            }
            activePoster = null;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        }

        function applyHorizontalLayout() {
            if (state.posters.length === 0) return;
            const totalPosterWidth = state.posters.reduce((sum, p) => sum + p.width, 0);
            const gapCount = state.posters.length > 1 ? state.posters.length - 1 : 0;
            const gap = 20;
            const totalWidthWithGaps = totalPosterWidth + (gap * gapCount);
            
            let currentX = (state.wall.width - totalWidthWithGaps) / 2;
            state.posters.forEach(p => {
                p.x = currentX;
                p.y = (state.wall.height - p.height) / 2;
                currentX += p.width + gap;
            });
            render();
        }

        function applyVerticalLayout() {
            if (state.posters.length === 0) return;
            const totalPosterHeight = state.posters.reduce((sum, p) => sum + p.height, 0);
            const gapCount = state.posters.length > 1 ? state.posters.length - 1 : 0;
            const gap = 20;
            const totalHeightWithGaps = totalPosterHeight + (gap * gapCount);
            
            let currentY = (state.wall.height - totalHeightWithGaps) / 2;
            state.posters.forEach(p => {
                p.y = currentY;
                p.x = (state.wall.width - p.width) / 2;
                currentY += p.height + gap;
            });
            render();
        }

        function applyGridLayout() {
            if (state.posters.length === 0) return;
            const numPosters = state.posters.length;
            const cols = Math.ceil(Math.sqrt(numPosters));
            const rows = Math.ceil(numPosters / cols);
            const gap = 20;

            const rowData = [];
            for (let i = 0; i < rows; i++) {
                rowData.push({ items: state.posters.slice(i * cols, i * cols + cols), width: 0, height: 0 });
                rowData[i].width = rowData[i].items.reduce((sum, p) => sum + p.width, 0) + (rowData[i].items.length - 1) * gap;
                rowData[i].height = Math.max(...rowData[i].items.map(p => p.height));
            }
            
            const totalGridWidth = Math.max(...rowData.map(r => r.width));
            const totalGridHeight = rowData.reduce((sum, r) => sum + r.height, 0) + (rows - 1) * gap;
            const startY = (state.wall.height - totalGridHeight) / 2;

            let currentY = startY;
            rowData.forEach(row => {
                let startX = (state.wall.width - row.width) / 2;
                let currentX = startX;
                row.items.forEach(p => {
                    p.x = currentX;
                    p.y = currentY;
                    currentX += p.width + gap;
                });
                currentY += row.height + gap;
            });
            
            render();
        }

        async function exportWallAsImage() {
            if (state.posters.length === 0) {
                alert('Add some posters to the wall first!');
                return;
            }

            // Temporarily scale up the wall for higher resolution capture
            const originalScale = state.scale;
            const exportScale = 3; // Export at 3x current resolution

            // Adjust wall and poster sizes for export
            wall.style.width = `${state.wall.width * exportScale}px`;
            wall.style.height = `${state.wall.height * exportScale}px`;
            state.posters.forEach(poster => {
                const posterEl = wall.querySelector(`[data-id='${poster.id}']`);
                if (posterEl) {
                    posterEl.style.width = `${poster.width * exportScale}px`;
                    posterEl.style.height = `${poster.height * exportScale}px`;
                    posterEl.style.left = `${poster.x * exportScale}px`;
                    posterEl.style.top = `${poster.y * exportScale}px`;
                }
            });

            // Use html2canvas to capture the wall div
            const canvas = await html2canvas(wall, {
                scale: 1, // html2canvas will use the already scaled-up DOM
                useCORS: true, // Important for images loaded from data URLs
                allowTaint: true // Allow tainting the canvas with cross-origin images (if any, though data URLs should be fine)
            });

            // Revert wall and poster sizes to original scale
            wall.style.width = `${state.wall.width * originalScale}px`;
            wall.style.height = `${state.wall.height * originalScale}px`;
            state.posters.forEach(poster => {
                const posterEl = wall.querySelector(`[data-id='${poster.id}']`);
                if (posterEl) {
                    posterEl.style.width = `${poster.width * originalScale}px`;
                    posterEl.style.height = `${poster.height * originalScale}px`;
                    posterEl.style.left = `${poster.x * originalScale}px`;
                    posterEl.style.top = `${poster.y * originalScale}px`;
                }
            });
            render(); // Re-render to ensure everything is back to normal

            // Create a link to download the image
            const link = document.createElement('a');
            link.download = 'poster-wall-design.png';
            link.href = canvas.toDataURL('image/png');
            link.click();
        }

        wallWidthInput.addEventListener('input', updateWallDimensions);
        wallHeightInput.addEventListener('input', updateWallDimensions);
        unitsSelect.addEventListener('change', updateWallDimensions);
        posterImageInput.addEventListener('change', handleImageUpload);
        addPosterBtn.addEventListener('click', addPoster);
        clearAllBtn.addEventListener('click', clearAllPosters);
        standardSizesSelect.addEventListener('change', handleStandardSizeChange);
        
        layoutGridBtn.addEventListener('click', applyGridLayout);
        layoutHorizontalBtn.addEventListener('click', applyHorizontalLayout);
        layoutVerticalBtn.addEventListener('click', applyVerticalLayout);
        exportImageBtn.addEventListener('click', exportWallAsImage);

        wallColorInput.addEventListener('input', () => {
            wall.style.backgroundColor = wallColorInput.value;
        });
        
        const resizeObserver = new ResizeObserver(() => render());
        resizeObserver.observe(canvasContainer);
        
        updateWallDimensions();
        render();
    });
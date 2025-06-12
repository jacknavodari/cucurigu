document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded event fired.');
    const componentLibrary = document.getElementById('component-library');
    const canvas = document.getElementById('panel-canvas');
    const controlsDiv = document.getElementById('controls');

    if (!canvas) {
        console.error('ERROR: Canvas element #panel-canvas not found!');
        return;
    }
    if (!controlsDiv) {
        console.error('ERROR: Controls div #controls not found!');
        return;
    }
    if (!componentLibrary) {
        console.error('ERROR: Component library div #component-library not found!');
        // Depending on strictness, you might return here or allow it to proceed if components are optional
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error('ERROR: Failed to get 2D rendering context for canvas!');
        return;
    }
    console.log('Canvas and context obtained:', canvas, ctx);

    const canvasWidth = 600;
    const canvasHeight = 400;
    canvas.width = canvasWidth; // Set drawing buffer size
    canvas.height = canvasHeight; // Set drawing buffer size
    console.log(`Canvas dimensions set - canvas.width: ${canvas.width}, canvas.height: ${canvas.height}`);
    console.log(`CSS dimensions - canvas.style.width: ${canvas.style.width}, canvas.style.height: ${canvas.style.height}`);


    const components = [
        // Home Electrical Panel Components
        { name: "Main Breaker", id: "main_breaker", width: 50, height: 70, color: '#FF6347' }, // TomatoRed
        { name: "CB 10A", id: "cb_10a", width: 25, height: 60, color: 'lightgrey' },
        { name: "CB 15A", id: "cb_15a", width: 25, height: 60, color: 'lightblue' },
        { name: "CB 20A", id: "cb_20a", width: 25, height: 60, color: 'lightpink' },
        { name: "CB 30A", id: "cb_30a", width: 50, height: 60, color: 'lightgreen' }, // double pole
        { name: "Bus Bar", id: "bus_bar", width: 200, height: 20, color: '#D2B48C' }, // Tan
        { name: "Neutral Bar", id: "neutral_bar", width: 150, height: 15, color: '#E0E0E0' }, // LightSilver
        { name: "Ground Bar", id: "ground_bar", width: 150, height: 15, color: '#90EE90' }, // LightGreen

        // Industrial Electrical Panel Components
        { name: "Contactor", id: "contactor", width: 60, height: 70, color: '#4682B4' }, // SteelBlue
        { name: "Overload Relay", id: "overload_relay", width: 50, height: 60, color: '#FFA07A' }, // LightSalmon
        { name: "Fuse Block 3P", id: "fuse_block_3p", width: 70, height: 50, color: '#808080' }, // Gray
        { name: "Transformer", id: "transformer", width: 80, height: 90, color: '#F4A460' }, // SandyBrown
        { name: "Terminal Strip", id: "terminal_block_strip", width: 120, height: 30, color: '#A9A9A9' }, // DarkGray
        { name: "Pilot Light R", id: "pilot_light_red", width: 25, height: 25, color: 'red' },
        { name: "Pilot Light G", id: "pilot_light_green", width: 25, height: 25, color: 'green' },
        { name: "Push Button G", id: "push_button_green", width: 30, height: 30, color: '#2E8B57' }, // SeaGreen
        { name: "E-Stop", id: "emergency_stop", width: 40, height: 40, color: '#DC143C' } // Crimson
    ];

    let placedComponents = [];
    let wires = [];
    let nextComponentInstanceId = 0;
    let isWiringMode = false;
    let firstSelectedComponentForWire = null;

    const wiringModeButton = document.createElement('button');
    wiringModeButton.textContent = 'Toggle Wiring Mode (OFF)';
    wiringModeButton.id = 'wiring-mode-button';
    controlsDiv.appendChild(wiringModeButton);

    wiringModeButton.addEventListener('click', () => {
        isWiringMode = !isWiringMode;
        wiringModeButton.textContent = `Toggle Wiring Mode (${isWiringMode ? 'ON' : 'OFF'})`;
        wiringModeButton.classList.toggle('active', isWiringMode);
        firstSelectedComponentForWire = null;
        console.log("Wiring mode toggled:", isWiringMode);
        redrawCanvas();
    });

    components.forEach(component => {
        const div = document.createElement('div');
        div.classList.add('component');
        div.setAttribute('draggable', true);
        div.setAttribute('data-component-id', component.id);
        div.setAttribute('data-component-name', component.name);
        div.setAttribute('data-component-width', component.width);
        div.setAttribute('data-component-height', component.height);
        div.textContent = component.name;
        if (componentLibrary) {
            componentLibrary.appendChild(div);
        }

        div.addEventListener('dragstart', (event) => {
            // console.log('Drag Start:', component.name);
            event.dataTransfer.setData('application/json', JSON.stringify(component));
            event.dataTransfer.effectAllowed = 'copy';
        });
    });

    canvas.addEventListener('dragover', (event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
    });

    canvas.addEventListener('drop', (event) => {
        event.preventDefault();
        // console.log('Drop event triggered on canvas.');
        if (isWiringMode) {
            // console.log('Drop ignored: Wiring mode is ON.');
            return;
        }

        const componentDataString = event.dataTransfer.getData('application/json');
        if (!componentDataString) {
            console.error('ERROR: No component data transferred on drop.');
            return;
        }
        const componentType = JSON.parse(componentDataString);
        // console.log('Dropped component type:', componentType);

        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        const newComponent = {
            instanceId: nextComponentInstanceId++,
            typeId: componentType.id,
            name: componentType.name,
            x: x - (componentType.width / 2),
            y: y - (componentType.height / 2),
            width: componentType.width,
            height: componentType.height,
            color: componentType.color || 'black'
        };
        // console.log('New component created:', newComponent);
        placedComponents.push(newComponent);
        // console.log('placedComponents after push:', JSON.stringify(placedComponents));
        redrawCanvas();
    });

    canvas.addEventListener('click', (event) => {
        // console.log('Canvas click event triggered.');
        if (!isWiringMode) {
            // console.log('Canvas click ignored: Wiring mode is OFF.');
            return;
        }

        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        // console.log(`Wiring click at canvas coordinates: (${x}, ${y})`);

        const clickedComponent = getClickedComponent(x, y);
        // console.log('Clicked component for wiring:', clickedComponent);

        if (clickedComponent) {
            if (!firstSelectedComponentForWire) {
                firstSelectedComponentForWire = clickedComponent;
                // console.log("Selected first component for wire:", firstSelectedComponentForWire);
            } else {
                if (firstSelectedComponentForWire.instanceId !== clickedComponent.instanceId) {
                    const wireExists = wires.some(wire =>
                        (wire.startInstanceId === firstSelectedComponentForWire.instanceId && wire.endInstanceId === clickedComponent.instanceId) ||
                        (wire.startInstanceId === clickedComponent.instanceId && wire.endInstanceId === firstSelectedComponentForWire.instanceId)
                    );
                    if (!wireExists) {
                        const newWire = {
                            startInstanceId: firstSelectedComponentForWire.instanceId,
                            endInstanceId: clickedComponent.instanceId
                        };
                        wires.push(newWire);
                        // console.log("Wire created:", newWire, "Current wires:", JSON.stringify(wires));
                    } else {
                        // console.log("Wire already exists.");
                    }
                    firstSelectedComponentForWire = null;
                } else {
                    // console.log("Cannot connect a component to itself.");
                }
            }
        } else {
            firstSelectedComponentForWire = null;
            // console.log("Wiring click on empty space, selection reset.");
        }
        redrawCanvas();
    });

    function getClickedComponent(x, y) {
        for (let i = placedComponents.length - 1; i >= 0; i--) {
            const comp = placedComponents[i];
            if (x >= comp.x && x <= comp.x + comp.width &&
                y >= comp.y && y <= comp.y + comp.height) {
                return comp;
            }
        }
        return null;
    }

    function redrawCanvas() {
        // console.log('redrawCanvas called.');
        // console.log('Canvas actual width/height for drawing:', canvas.width, canvas.height); // Kept for initial setup
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // console.log('Current wires:', JSON.stringify(wires));
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        wires.forEach(wire => {
            const compStart = placedComponents.find(c => c.instanceId === wire.startInstanceId);
            const compEnd = placedComponents.find(c => c.instanceId === wire.endInstanceId);
            // console.log(`Processing wire: ${JSON.stringify(wire)}. Start comp: ${JSON.stringify(compStart)}, End comp: ${JSON.stringify(compEnd)}`);

            if (compStart && compEnd) {
                const startX = compStart.x + compStart.width / 2;
                const startY = compStart.y + compStart.height / 2;
                const endX = compEnd.x + compEnd.width / 2;
                const endY = compEnd.y + compEnd.height / 2;
                // console.log(`Drawing wire from (${startX}, ${startY}) to (${endX}, ${endY})`);
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
                ctx.stroke();
            } else {
                console.warn('Could not find start or end component for wire:', wire); // Kept this warn
            }
        });

        // console.log('Current placedComponents:', JSON.stringify(placedComponents));
        placedComponents.forEach(comp => {
            // console.log('Drawing component:', comp);
            ctx.fillStyle = comp.color;
            ctx.fillRect(comp.x, comp.y, comp.width, comp.height);

            if (isWiringMode && firstSelectedComponentForWire && firstSelectedComponentForWire.instanceId === comp.instanceId) {
                // console.log('Highlighting component for wiring:', comp.name);
                ctx.strokeStyle = 'yellow';
                ctx.lineWidth = 3;
                ctx.strokeRect(comp.x, comp.y, comp.width, comp.height);
            }

            ctx.fillStyle = 'white';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(comp.name, comp.x + comp.width / 2, comp.y + comp.height / 2);
        });
        // console.log('redrawCanvas finished.');
    }

    // console.log('Initial app.js setup complete. Calling redrawCanvas.');
    redrawCanvas();
    console.log('app.js loaded and initialized.'); // Modified this to be more generic
});

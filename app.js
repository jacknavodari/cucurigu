document.addEventListener('DOMContentLoaded', () => {
    const componentLibrary = document.getElementById('component-library');
    const canvas = document.getElementById('panel-canvas');
    const ctx = canvas.getContext('2d');
    const controlsDiv = document.getElementById('controls'); // Get the new controls div

    const canvasWidth = 600;
    const canvasHeight = 400;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    const components = [
        { name: "Resistor", id: "resistor", width: 60, height: 20, color: 'gray' },
        { name: "Capacitor", id: "capacitor", width: 40, height: 40, color: 'blue' },
        { name: "LED", id: "led", width: 30, height: 30, color: 'red' },
        { name: "Switch", id: "switch", width: 50, height: 30, color: 'green' }
    ];

    let placedComponents = []; // Use let as it might be reassigned if loading from storage later
    let wires = []; // To store wire connections
    let nextComponentInstanceId = 0;
    let isWiringMode = false;
    let firstSelectedComponentForWire = null;

    // --- Create Wiring Mode Button ---
    const wiringModeButton = document.createElement('button');
    wiringModeButton.textContent = 'Toggle Wiring Mode (OFF)';
    wiringModeButton.id = 'wiring-mode-button';
    controlsDiv.appendChild(wiringModeButton);

    wiringModeButton.addEventListener('click', () => {
        isWiringMode = !isWiringMode;
        wiringModeButton.textContent = `Toggle Wiring Mode (${isWiringMode ? 'ON' : 'OFF'})`;
        wiringModeButton.classList.toggle('active', isWiringMode);
        firstSelectedComponentForWire = null; // Reset wire selection
        console.log("Wiring mode:", isWiringMode);
        redrawCanvas(); // Redraw to show selection highlights if any
    });

    // Populate the component library
    components.forEach(component => {
        const div = document.createElement('div');
        div.classList.add('component');
        div.setAttribute('draggable', true);
        div.setAttribute('data-component-id', component.id);
        div.setAttribute('data-component-name', component.name);
        div.setAttribute('data-component-width', component.width);
        div.setAttribute('data-component-height', component.height);
        div.textContent = component.name;
        componentLibrary.appendChild(div);

        div.addEventListener('dragstart', (event) => {
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
        if (isWiringMode) return; // Don't drop if in wiring mode

        const componentDataString = event.dataTransfer.getData('application/json');
        if (!componentDataString) return;
        const componentType = JSON.parse(componentDataString);

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
        placedComponents.push(newComponent);
        redrawCanvas();
    });

    // --- Wiring Logic ---
    canvas.addEventListener('click', (event) => {
        if (!isWiringMode) return;

        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        const clickedComponent = getClickedComponent(x, y);

        if (clickedComponent) {
            if (!firstSelectedComponentForWire) {
                firstSelectedComponentForWire = clickedComponent;
                console.log("Selected first component for wire:", firstSelectedComponentForWire.name);
                // Optionally, highlight the first selected component
            } else {
                // Ensure not connecting a component to itself (unless intended for specific components)
                if (firstSelectedComponentForWire.instanceId !== clickedComponent.instanceId) {
                    // Check if this wire already exists to avoid duplicates
                    const wireExists = wires.some(wire =>
                        (wire.startInstanceId === firstSelectedComponentForWire.instanceId && wire.endInstanceId === clickedComponent.instanceId) ||
                        (wire.startInstanceId === clickedComponent.instanceId && wire.endInstanceId === firstSelectedComponentForWire.instanceId)
                    );

                    if (!wireExists) {
                        wires.push({
                            startInstanceId: firstSelectedComponentForWire.instanceId,
                            endInstanceId: clickedComponent.instanceId
                        });
                        console.log("Wire created between:", firstSelectedComponentForWire.name, "and", clickedComponent.name);
                    } else {
                        console.log("Wire already exists between these components.");
                    }
                    firstSelectedComponentForWire = null; // Reset for next wire
                } else {
                    console.log("Cannot connect a component to itself in this manner.");
                    // Potentially reset firstSelectedComponentForWire or allow different logic
                }
            }
        } else {
            // Clicked on empty canvas space, reset selection
            firstSelectedComponentForWire = null;
            console.log("Wiring click on empty space, selection reset.");
        }
        redrawCanvas();
    });

    function getClickedComponent(x, y) {
        // Iterate in reverse order so top-most components are checked first
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
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw wires first (so they are underneath components)
        ctx.strokeStyle = 'black'; // Wire color
        ctx.lineWidth = 2;
        wires.forEach(wire => {
            const compStart = placedComponents.find(c => c.instanceId === wire.startInstanceId);
            const compEnd = placedComponents.find(c => c.instanceId === wire.endInstanceId);

            if (compStart && compEnd) {
                ctx.beginPath();
                ctx.moveTo(compStart.x + compStart.width / 2, compStart.y + compStart.height / 2);
                ctx.lineTo(compEnd.x + compEnd.width / 2, compEnd.y + compEnd.height / 2);
                ctx.stroke();
            }
        });

        // Draw all placed components
        placedComponents.forEach(comp => {
            ctx.fillStyle = comp.color;
            ctx.fillRect(comp.x, comp.y, comp.width, comp.height);

            // Highlight if it's the first selected component for wiring
            if (isWiringMode && firstSelectedComponentForWire && firstSelectedComponentForWire.instanceId === comp.instanceId) {
                ctx.strokeStyle = 'yellow'; // Highlight color
                ctx.lineWidth = 3;
                ctx.strokeRect(comp.x, comp.y, comp.width, comp.height);
            }

            ctx.fillStyle = 'white';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(comp.name, comp.x + comp.width / 2, comp.y + comp.height / 2);
        });
    }

    // Initial draw
    redrawCanvas();
    console.log('app.js loaded and initialized with drag & drop and basic wiring.');
});

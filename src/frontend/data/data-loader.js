import { fetchJSON } from '../utils/fetch.js';

/**
 * A utility function to create an HTML element with specified options.
 * @param {keyof HTMLElementTagNameMap} tag - The HTML tag name for the element.
 * @param {object} [options={}] - An object of attributes and properties to set on the element.
 * @returns {HTMLElement} The created HTML element.
 */
const createElement = (tag, options = {}) => {
    const element = document.createElement(tag);

    for (const [key, value] of Object.entries(options)) {
        if (key === 'className') element.className = value;
        else if (key === 'id') element.id = value;
        else if (key === 'textContent') element.textContent = value;
        else if (key === 'title') element.title = value;
        else if (key === 'href') element.href = value;
        else if (key === 'type') element.type = value;
        else if (key === 'min') element.min = value;
        else if (key === 'max') element.max = value;
        else if (key === 'value') element.value = value;
        else if (key === 'cssText') element.style.cssText = value;
        else if (key === 'draggable') element.draggable = value;
        else if (key === 'ariaLabel') element.setAttribute('aria-label', value);
        else if (key in element) element[key] = value;
    }

    return element;
};

/**
 * Populates a select element with options.
 * @param {HTMLSelectElement} selectElement - The select element to populate.
 * @param {Array<{value: string, text: string}>} options - An array of option objects.
 */
const populateSelect = (selectElement, options) => {
    const fragment = document.createDocumentFragment();

    options.forEach(opt => {
        fragment.appendChild(
            createElement('option', {
                value: opt.value,
                textContent: opt.text
            })
        );
    });

    selectElement.appendChild(fragment);
};

/**
 * Creates a color picker control component.
 * @param {object} controlInfo - The configuration object for the color picker.
 * @returns {HTMLDivElement} The container div for the color picker control.
 */
const createColorPicker = (controlInfo) => {
    const controlDiv = createElement('div', {
        className: 'control',
        id: controlInfo.id || ''
    });

    const label = createElement('label', {
        className: controlInfo.labelClass
    });

    const span = createElement('span', {
        id: controlInfo.triggerId,
        className: controlInfo.previewClass
    });
    span.style.backgroundColor = controlInfo.defaultColor;

    const pickerContainer = createElement('div', {
        id: controlInfo.pickerContainerId,
        cssText: `
            display: none;
            position: absolute;
            z-index: 100;
            background: var(--toolbar-bg);
            padding: 16px;
            border-radius: 12px;
            outline: var(--theme-border) solid 1.7px;
            bottom: 70px;
            left: 50%;
            transform: translateX(-50%);
            min-width: 310px;`
    });

    label.appendChild(span);
    controlDiv.appendChild(label);
    controlDiv.appendChild(pickerContainer);

    return controlDiv;
};

/**
 * Creates a range input (slider) control component.
 * @param {object} controlInfo - The configuration object for the range input.
 * @returns {HTMLDivElement} The container div for the range input control.
 */
const createRangeInput = (controlInfo) => {
    const controlDiv = createElement('div', {
        className: 'control',
        id: controlInfo.id || ''
    });

    const input = createElement('input', {
        type: 'range',
        id: controlInfo.inputId,
        min: controlInfo.min,
        max: controlInfo.max,
        value: controlInfo.value
    });

    const sizeDisplay = createElement('span', {
        id: controlInfo.displayId,
        className: controlInfo.displayClass,
        textContent: controlInfo.displayText
    });

    controlDiv.appendChild(input);
    controlDiv.appendChild(sizeDisplay);

    return controlDiv;
};

/**
 * Creates a select (dropdown) input control component.
 * @param {object} controlInfo - The configuration object for the select input.
 * @returns {HTMLDivElement} The container div for the select input control.
 */
const createSelectInput = (controlInfo) => {
    const controlDiv = createElement('div', {
        className: 'control'
    });

    const select = createElement('select', {
        id: controlInfo.id,
        title: controlInfo.title,
        ariaLabel: controlInfo.ariaLabel
    });

    populateSelect(select, controlInfo.options);
    controlDiv.appendChild(select);

    return controlDiv;
};

/**
 * Creates and populates the main toolbar with controls and buttons from data.
 * @param {object} toolbarData - The data object containing toolbar configuration.
 */
const createToolbar = (toolbarData) => {
    const toolbarContainer = document.querySelector('.toolbar');
    if (!toolbarContainer) return;

    const fragment = document.createDocumentFragment();

    // Create controls
    toolbarData.controls.forEach(controlInfo => {
        let controlDiv;

        switch (controlInfo.type) {
            case 'color-picker':
                controlDiv = createColorPicker(controlInfo);
                break;
            case 'range':
                controlDiv = createRangeInput(controlInfo);
                break;
            case 'select':
                controlDiv = createSelectInput(controlInfo);
                break;
        }

        if (controlDiv) {
            fragment.appendChild(controlDiv);
        }
    });

    // Create buttons
    toolbarData.buttons.forEach(buttonInfo => {
        const button = createElement('button', {
            id: buttonInfo.id,
            className: buttonInfo.class || '',
            textContent: buttonInfo.text
        });

        fragment.appendChild(button);
    });

    toolbarContainer.appendChild(fragment);
};

/**
 * Creates and populates the main navigation links.
 * @param {Array<object>} navLinks - An array of navigation link objects.
 */
const createNavigation = (navLinks) => {
    const navContainer = document.getElementById('MainLINKS');
    if (!navContainer) return;

    const fragment = document.createDocumentFragment();

    navLinks.forEach(link => {
        const li = createElement('li', {
            id: link.isCurrent ? 'CurrentPage' : ''
        });

        const a = createElement('a', {
            href: link.href,
            textContent: link.text,
            className: 'requestShiftkeyHolder',
            draggable: false
        });

        li.appendChild(a);
        fragment.appendChild(li);
    });

    navContainer.appendChild(fragment);
};

/**
 * Asynchronously fetches application data from data.json,
 * then initializes the UI components like navigation and toolbar.
 */
const initApplication = async () => {
    try {
        const data = await fetchJSON('frontend/data/content/data.json', {
            cache: true,
            retry: 2
        });

        // Set page metadata
        // document.title = data.pageTitle;
        // document.getElementById('headerTitle').textContent = data.headerTitle;

        // Create navigation
        createNavigation(data.navLinks);

        // Create toolbar
        createToolbar(data.toolbar);

        // Initialize paint application if function exists from `../paint/paint.js`
        if (typeof initializePaint === 'function') {
            initializePaint(data);
        }

    } catch (error) {
        console.error('Failed to load application data:', error);
        // Optional: Show user-friendly error message
        const errorDiv = createElement('div', {
            className: 'error-message',
            textContent: 'Failed to load application. Please refresh the page.'
        });
        document.body.prepend(errorDiv);
    }
};

/**
 * Ensures the application initialization runs after the DOM is fully loaded.
 */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApplication);
} else {
    initApplication();
}
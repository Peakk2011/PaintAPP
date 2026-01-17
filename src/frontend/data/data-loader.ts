import { fetchJSON } from '../utils/fetch.js';

/**
 * Element options interface
 */
interface ElementOptions {
    className?: string;
    id?: string;
    textContent?: string;
    title?: string;
    href?: string;
    type?: string;
    min?: string | number;
    max?: string | number;
    value?: string | number;
    cssText?: string;
    draggable?: boolean;
    ariaLabel?: string;
    [key: string]: unknown;
}

/**
 * Select option interface
 */
interface SelectOption {
    value: string;
    text: string;
}

/**
 * Color picker control info interface
 */
interface ColorPickerControlInfo {
    id?: string;
    labelClass: string;
    triggerId: string;
    previewClass: string;
    defaultColor: string;
    pickerContainerId: string;
}

/**
 * Range input control info interface
 */
interface RangeInputControlInfo {
    id?: string;
    inputId: string;
    min: string | number;
    max: string | number;
    value: string | number;
    displayId: string;
    displayClass: string;
    displayText: string;
}

/**
 * Select input control info interface
 */
interface SelectInputControlInfo {
    id: string;
    title: string;
    ariaLabel: string;
    options: SelectOption[];
}

/**
 * Control info interface
 */
interface ControlInfo {
    type: 'color-picker' | 'range' | 'select';
    id?: string;
    labelClass?: string;
    triggerId?: string;
    previewClass?: string;
    defaultColor?: string;
    pickerContainerId?: string;
    inputId?: string;
    min?: string | number;
    max?: string | number;
    value?: string | number;
    displayId?: string;
    displayClass?: string;
    displayText?: string;
    title?: string;
    ariaLabel?: string;
    options?: SelectOption[];
}

/**
 * Button info interface
 */
interface ButtonInfo {
    id: string;
    class?: string;
    text: string;
}

/**
 * Toolbar data interface
 */
interface ToolbarData {
    controls: ControlInfo[];
    buttons: ButtonInfo[];
}

/**
 * Navigation link interface
 */
interface NavLink {
    href: string;
    text: string;
    isCurrent?: boolean;
}

/**
 * SVG config interface
 */
interface SVGConfig {
    xmlns: string;
    height: string;
    viewBox: string;
    width: string;
    fill: string;
    path: string;
}

/**
 * Tool interface
 */
interface Tool {
    id: string;
    class: string;
    title: string;
    svg: SVGConfig;
    span: string;
}

/**
 * Tools data interface
 */
interface ToolsData {
    hamburger: {
        id: string;
        class: string;
        title: string;
        svg: SVGConfig;
    };
    tools: Tool[];
}

/**
 * Application data interface
 */
interface ApplicationData {
    navLinks: NavLink[];
    toolbar: ToolbarData;
    color?: string;
    brushSize?: number;
    brushType?: string;
}

/**
 * A utility function to create an HTML element with specified options.
 */
const createElement = <K extends keyof HTMLElementTagNameMap>(
    tag: K,
    options: ElementOptions = {}
): HTMLElementTagNameMap[K] => {
    const element = document.createElement(tag);

    for (const [key, value] of Object.entries(options)) {
        if (key === 'className') (element as HTMLElement).className = String(value);
        else if (key === 'id') element.id = String(value);
        else if (key === 'textContent') element.textContent = String(value);
        else if (key === 'title') (element as HTMLElement).title = String(value);
        else if (key === 'href') (element as HTMLAnchorElement).href = String(value);
        else if (key === 'type') (element as HTMLInputElement).type = String(value);
        else if (key === 'min') (element as HTMLInputElement).min = String(value);
        else if (key === 'max') (element as HTMLInputElement).max = String(value);
        else if (key === 'value') (element as HTMLInputElement).value = String(value);
        else if (key === 'cssText') (element as HTMLElement).style.cssText = String(value);
        else if (key === 'draggable') element.draggable = Boolean(value);
        else if (key === 'ariaLabel') element.setAttribute('aria-label', String(value));
        else if (key in element) {
            (element as Record<string, unknown>)[key] = value;
        }
    }

    return element;
};

/**
 * Populates a select element with options.
 */
const populateSelect = (selectElement: HTMLSelectElement, options: SelectOption[]): void => {
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
 */
const createColorPicker = (controlInfo: ColorPickerControlInfo): HTMLDivElement => {
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
 */
const createRangeInput = (controlInfo: RangeInputControlInfo): HTMLDivElement => {
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
 */
const createSelectInput = (controlInfo: SelectInputControlInfo): HTMLDivElement => {
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
 */
const createToolbar = (toolbarData: ToolbarData): void => {
    const toolbarContainer = document.querySelector('.toolbar');
    if (!toolbarContainer) return;

    const fragment = document.createDocumentFragment();

    // Create controls
    toolbarData.controls.forEach(controlInfo => {
        let controlDiv: HTMLDivElement | undefined;

        switch (controlInfo.type) {
            case 'color-picker':
                controlDiv = createColorPicker(controlInfo as ColorPickerControlInfo);
                break;
            case 'range':
                controlDiv = createRangeInput(controlInfo as RangeInputControlInfo);
                break;
            case 'select':
                controlDiv = createSelectInput(controlInfo as SelectInputControlInfo);
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
 */
const createNavigation = (navLinks: NavLink[]): void => {
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
 * Creates SVG element from configuration object.
 */
const createSVG = (svgConfig: SVGConfig): SVGElement => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('xmlns', svgConfig.xmlns);
    svg.setAttribute('height', svgConfig.height);
    svg.setAttribute('viewBox', svgConfig.viewBox);
    svg.setAttribute('width', svgConfig.width);
    svg.setAttribute('fill', svgConfig.fill);

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', svgConfig.path);
    
    svg.appendChild(path);
    return svg;
};

/**
 * Creates and populates the tool menu with hamburger button and tool buttons.
 */
const createToolMenu = (toolsData: ToolsData): void => {
    const toolbarContainer = document.querySelector('.toolbar-container');
    if (!toolbarContainer) return;

    // Create hamburger button
    const hamburgerBtn = createElement('button', {
        id: toolsData.hamburger.id,
        className: toolsData.hamburger.class,
        title: toolsData.hamburger.title
    });
    
    hamburgerBtn.appendChild(createSVG(toolsData.hamburger.svg));
    toolbarContainer.appendChild(hamburgerBtn);

    // Create tool menu container
    const toolMenu = createElement('div', {
        id: 'tool-menu',
        className: 'hidden'
    });

    // Create tool buttons
    toolsData.tools.forEach(tool => {
        const toolBtn = createElement('button', {
            id: tool.id,
            className: tool.class,
            title: tool.title
        });

        toolBtn.appendChild(createSVG(tool.svg));
        
        const span = createElement('span', {
            textContent: tool.span
        });

        toolBtn.appendChild(span);
        toolMenu.appendChild(toolBtn);
    });

    toolbarContainer.appendChild(toolMenu);
};

/**
 * Init options interface (same as paint.ts)
 */
interface InitOptions {
    color?: string;
    brushSize?: number;
    brushType?: string;
}

/**
 * Declare initializePaint function from window
 */
declare global {
    interface Window {
        initializePaint?: (data?: ApplicationData | InitOptions) => Promise<void>;
        Electron?: {
            ipcRenderer?: {
                on: (channel: string, callback: (...args: unknown[]) => void) => void;
                send: (channel: string, ...args: unknown[]) => void;
            };
            platform?: string;
            isMac?: boolean;
            isWindows?: boolean;
        };
    }
}

/**
 * Asynchronously fetches application data from data.json,
 * then initializes the UI components like navigation and toolbar.
 */
const initApplication = async (): Promise<void> => {
    try {
        const data = await fetchJSON('frontend/data/content/data.json', {
            cache: true,
            retry: 2
        }) as ApplicationData;

        // Load tools data
        const toolsData = await fetchJSON('frontend/data/content/toolbar.json', {
            cache: true,
            retry: 2
        }) as ToolsData;

        // Create navigation
        createNavigation(data.navLinks);

        // Create toolbar
        createToolbar(data.toolbar);

        // Create tool menu
        createToolMenu(toolsData);

        // Initialize paint application if function exists from `../paint/paint.js`
        if (typeof window.initializePaint === 'function') {
            window.initializePaint(data);
        }

    } catch (error) {
        console.error('Failed to load application data:', error);

        // Display error message
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
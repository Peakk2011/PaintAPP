 const populateSelect = (selectElement, options) => {
     options.forEach(opt => {
         const option = document.createElement('option');
         option.value = opt.value;
         option.textContent = opt.text;
         selectElement.appendChild(option);
     });
 };
 
 const createToolbar = (toolbarData) => {
     const toolbarContainer = document.querySelector('.toolbar');
     if (!toolbarContainer) return;
 
     // Create Controls from JSON
     toolbarData.controls.forEach(controlInfo => {
         const controlDiv = document.createElement('div');
         controlDiv.className = 'control';
         if (controlInfo.id) {
            controlDiv.id = controlInfo.id;
         }
 
         switch (controlInfo.type) {
             case 'color-picker':
                 const label = document.createElement('label');
                 label.className = controlInfo.labelClass;
 
                 const span = document.createElement('span');
                 span.id = controlInfo.triggerId;
                 span.className = controlInfo.previewClass;
                 span.style.backgroundColor = controlInfo.defaultColor;
 
                 const pickerContainer = document.createElement('div');
                 pickerContainer.id = controlInfo.pickerContainerId;
                 pickerContainer.style.cssText = `
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
                     min-width: 310px;`;
 
                 label.appendChild(span);
                 controlDiv.appendChild(label);
                 controlDiv.appendChild(pickerContainer);
                 break;
 
             case 'range':
                 const input = document.createElement('input');
                 input.type = 'range';
                 input.id = controlInfo.inputId;
                 input.min = controlInfo.min;
                 input.max = controlInfo.max;
                 input.value = controlInfo.value;
 
                 const sizeDisplay = document.createElement('span');
                 sizeDisplay.id = controlInfo.displayId;
                 sizeDisplay.className = controlInfo.displayClass;
                 sizeDisplay.textContent = controlInfo.displayText;
 
                 controlDiv.appendChild(input);
                 controlDiv.appendChild(sizeDisplay);
                 break;
 
             case 'select':
                 const select = document.createElement('select');
                 select.id = controlInfo.id;
                 select.title = controlInfo.title;
                 if (controlInfo.ariaLabel) {
                     select.setAttribute('aria-label', controlInfo.ariaLabel);
                 }
                 populateSelect(select, controlInfo.options);
                 controlDiv.appendChild(select);
                 break;
         }
         toolbarContainer.appendChild(controlDiv);
     });
 
     // Create Buttons from JSON
     toolbarData.buttons.forEach(buttonInfo => {
         const button = document.createElement('button');
         button.id = buttonInfo.id;
         if (buttonInfo.class) {
             button.className = buttonInfo.class;
         }
         button.textContent = buttonInfo.text;
         toolbarContainer.appendChild(button);
     });
 };
 
 document.addEventListener('DOMContentLoaded', () => {
     fetch('./data.json') 
         .then(response => {
             if (!response.ok) {
                 throw new Error('Network response was not ok ' + response.statusText);
             }
             return response.json();
         })
         .then(data => {
             // Page Title
             document.title = data.pageTitle;
 
             // Header Title
             document.getElementById('headerTitle').textContent = data.headerTitle;
 
             // Navigation Links
             const navContainer = document.getElementById('MainLINKS');
             data.navLinks.forEach(link => {
                 const li = document.createElement('li');
                 if (link.isCurrent) {
                     li.id = 'CurrentPage';
                 } 
                 const a = document.createElement('a');
                 a.href = link.href;
                 a.textContent = link.text;
                 a.classList.add('requestShiftkeyHolder');
                 a.draggable = false; // Default
                 li.appendChild(a);
                 navContainer.appendChild(li);
             });
 
             // Create Toolbar
             createToolbar(data.toolbar, data);

            // Now that the DOM is ready, initialize the paint script
            if (typeof initializePaint === 'function') {
                initializePaint(data);
            }
         })
         .catch(error => {
            console.error('Failed to load application data:', error);
         });
 });
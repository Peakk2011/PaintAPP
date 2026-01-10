/**
 * @file Main process entry point for the PaintAPP Electron application.
 * @author Peakk2011 <peakk3984@gmail.com>
 */

import { app } from 'electron';
import { initializeApp } from './main_process/index.js';

// Start the application
initializeApp();
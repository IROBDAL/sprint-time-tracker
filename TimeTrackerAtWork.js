// Time Tracker for Testing Tasks
// Tracks time spent on Jira tasks with 8-hour workday consideration

class TimeTracker {
    constructor() {
        this.entries = this.loadEntries();
        this.sprints = this.loadSprints();
        this.currentSprint = this.loadCurrentSprint();
        this.WORK_DAY_HOURS = 8;
        this.SPRINT_DAYS = 10; // 2 weeks = 10 working days
        this.SPRINT_TOTAL_HOURS = this.WORK_DAY_HOURS * this.SPRINT_DAYS; // 80 hours
    }

    // Load entries from localStorage
    loadEntries() {
        const saved = localStorage.getItem('timeTrackerEntries');
        return saved ? JSON.parse(saved) : [];
    }

    // Load sprints from localStorage
    loadSprints() {
        const saved = localStorage.getItem('timeTrackerSprints');
        return saved ? JSON.parse(saved) : [];
    }

    // Load current sprint from localStorage
    loadCurrentSprint() {
        const saved = localStorage.getItem('timeTrackerCurrentSprint');
        return saved ? JSON.parse(saved) : null;
    }

    // Save entries to localStorage
    saveEntries() {
        localStorage.setItem('timeTrackerEntries', JSON.stringify(this.entries));
    }

    // Save sprints to localStorage
    saveSprints() {
        localStorage.setItem('timeTrackerSprints', JSON.stringify(this.sprints));
    }

    // Save current sprint to localStorage
    saveCurrentSprint() {
        localStorage.setItem('timeTrackerCurrentSprint', JSON.stringify(this.currentSprint));
    }

    // Create a new sprint
    createSprint(name, startDate, endDate) {
        const sprint = {
            id: Date.now(),
            name: name.trim(),
            startDate: this.formatDate(startDate),
            endDate: this.formatDate(endDate),
            createdAt: new Date().toISOString()
        };

        this.sprints.push(sprint);
        this.saveSprints();
        return sprint;
    }

    // Set current active sprint
    setCurrentSprint(sprintId) {
        const sprint = this.sprints.find(s => s.id === sprintId);
        if (sprint) {
            this.currentSprint = sprint;
            this.saveCurrentSprint();
            return true;
        }
        return false;
    }

    // Get current sprint info
    getCurrentSprint() {
        return this.currentSprint;
    }

    // Calculate sprint dates (10 working days from start date, including both start and end)
    calculateSprintEndDate(startDate) {
        const start = new Date(startDate);
        let workDays = 1; // Start counting from 1 since start date is day 1
        let current = new Date(start);

        // If start date is weekend, this shouldn't happen in normal usage
        if (current.getDay() === 0 || current.getDay() === 6) {
            throw new Error('Sprint start date must be a working day (Monday-Friday)');
        }

        // Count working days to reach exactly 10 working days total
        while (workDays < this.SPRINT_DAYS) {
            // Move to next day
            current.setDate(current.getDate() + 1);
            
            // Skip weekends (0 = Sunday, 6 = Saturday)
            if (current.getDay() !== 0 && current.getDay() !== 6) {
                workDays++;
            }
        }

        // Ensure we have exactly 10 working days including start and end
        return this.formatDate(current);
    }

    // Add a new time entry
    addEntry(date, jiraId, timeSpent, workDone, allowPastDates = false) {
        // Validate inputs
        if (!date || !jiraId || !timeSpent || !workDone) {
            throw new Error('All fields are required: date, Jira ID, time spent, and work done');
        }

        if (isNaN(timeSpent) || timeSpent <= 0) {
            throw new Error('Time spent must be a positive number');
        }

        if (!this.currentSprint) {
            throw new Error('No active sprint selected. Please create or select a sprint first.');
        }

        // Check if the date is a working day (not weekend)
        const checkDate = new Date(date);
        if (checkDate.getDay() === 0 || checkDate.getDay() === 6) {
            throw new Error('Time entries can only be added for working days (Monday to Friday)');
        }

        // Check if date is within sprint period (allow past dates if specified)
        if (!allowPastDates && !this.isDateInCurrentSprint(date)) {
            throw new Error('Date must be within the current sprint period and on a working day');
        } else if (allowPastDates && !this.isDateInSprintPeriod(date, this.currentSprint)) {
            throw new Error('Date must be within the selected sprint period and on a working day');
        }

        const entry = {
            id: Date.now(), // Simple ID generation
            date: this.formatDate(date),
            jiraId: jiraId.trim(),
            timeSpent: parseFloat(timeSpent),
            workDone: workDone.trim(),
            sprintId: this.currentSprint.id,
            timestamp: new Date().toISOString()
        };

        this.entries.push(entry);
        this.saveEntries();
        return entry;
    }

    // Format date to YYYY-MM-DD
    formatDate(date) {
        if (date instanceof Date) {
            return date.toISOString().split('T')[0];
        }
        // If it's already a string in the right format, return as is
        return date;
    }

    // Get entries for a specific date
    getEntriesForDate(date) {
        const formattedDate = this.formatDate(date);
        return this.entries.filter(entry => entry.date === formattedDate);
    }

    // Get entries for current sprint
    getCurrentSprintEntries() {
        if (!this.currentSprint) return [];
        return this.entries.filter(entry => entry.sprintId === this.currentSprint.id);
    }

    // Get entries for a specific sprint
    getSprintEntries(sprintId) {
        return this.entries.filter(entry => entry.sprintId === sprintId);
    }

    // Calculate total time spent in current sprint
    getCurrentSprintTotalTime() {
        const entries = this.getCurrentSprintEntries();
        return entries.reduce((total, entry) => total + entry.timeSpent, 0);
    }

    // Calculate remaining time for current sprint
    getCurrentSprintRemainingTime() {
        const totalTime = this.getCurrentSprintTotalTime();
        return Math.max(0, this.SPRINT_TOTAL_HOURS - totalTime);
    }

    // Get progress percentage for current sprint
    getCurrentSprintProgress() {
        const totalTime = this.getCurrentSprintTotalTime();
        return Math.min(100, (totalTime / this.SPRINT_TOTAL_HOURS) * 100);
    }

    // Calculate working days remaining in current sprint (excluding weekends)
    getCurrentSprintDaysRemaining() {
        if (!this.currentSprint) return 0;
        
        const today = new Date();
        const endDate = new Date(this.currentSprint.endDate);
        
        // If today is past the end date, return 0
        if (today > endDate) return 0;
        
        let workingDaysRemaining = 0;
        let current = new Date(today);
        
        // Count working days from today until end date (inclusive)
        while (current <= endDate) {
            // Skip weekends (0 = Sunday, 6 = Saturday)
            if (current.getDay() !== 0 && current.getDay() !== 6) {
                workingDaysRemaining++;
            }
            current.setDate(current.getDate() + 1);
        }
        
        return workingDaysRemaining;
    }

    // Check if current date is within sprint period and is a working day
    isDateInCurrentSprint(date) {
        if (!this.currentSprint) return false;
        
        const checkDate = new Date(date);
        const startDate = new Date(this.currentSprint.startDate);
        const endDate = new Date(this.currentSprint.endDate);
        
        // Check if date is within sprint range
        const isInRange = checkDate >= startDate && checkDate <= endDate;
        
        // Check if it's a working day (not weekend)
        const isWorkingDay = checkDate.getDay() !== 0 && checkDate.getDay() !== 6;
        
        return isInRange && isWorkingDay;
    }

    // Check if date is within any sprint period (for past date entries)
    isDateInSprintPeriod(date, sprint) {
        if (!sprint) return false;
        
        const checkDate = new Date(date);
        const startDate = new Date(sprint.startDate);
        const endDate = new Date(sprint.endDate);
        
        // Check if date is within sprint range
        const isInRange = checkDate >= startDate && checkDate <= endDate;
        
        // Check if it's a working day (not weekend)
        const isWorkingDay = checkDate.getDay() !== 0 && checkDate.getDay() !== 6;
        
        return isInRange && isWorkingDay;
    }

    // Check if current sprint is over
    isCurrentSprintOver() {
        if (!this.currentSprint) return false;
        
        const today = new Date();
        const endDate = new Date(this.currentSprint.endDate);
        
        return today > endDate;
    }

    // Calculate total time spent on a specific date
    getTotalTimeForDate(date) {
        const entries = this.getEntriesForDate(date);
        return entries.reduce((total, entry) => total + entry.timeSpent, 0);
    }

    // Calculate remaining time for the workday
    getRemainingTimeForDate(date) {
        const totalTime = this.getTotalTimeForDate(date);
        return Math.max(0, this.WORK_DAY_HOURS - totalTime);
    }

    // Get progress percentage for the workday
    getProgressForDate(date) {
        const totalTime = this.getTotalTimeForDate(date);
        return Math.min(100, (totalTime / this.WORK_DAY_HOURS) * 100);
    }

    // Get all entries grouped by date
    getEntriesByDate() {
        const grouped = {};
        this.entries.forEach(entry => {
            if (!grouped[entry.date]) {
                grouped[entry.date] = [];
            }
            grouped[entry.date].push(entry);
        });
        return grouped;
    }

    // Get summary statistics for current sprint
    getCurrentSprintSummary() {
        const entries = this.getCurrentSprintEntries();
        const totalEntries = entries.length;
        const totalTime = entries.reduce((sum, entry) => sum + entry.timeSpent, 0);
        
        // Only count working days (exclude weekends)
        const uniqueDates = [...new Set(entries.map(entry => entry.date))];
        const workingDatesWithEntries = uniqueDates.filter(date => {
            const checkDate = new Date(date);
            return checkDate.getDay() !== 0 && checkDate.getDay() !== 6; // Exclude weekends
        });
        
        const averageTimePerDay = workingDatesWithEntries.length > 0 ? totalTime / workingDatesWithEntries.length : 0;
        const daysRemaining = this.getCurrentSprintDaysRemaining();
        const progress = this.getCurrentSprintProgress();

        return {
            totalEntries,
            totalTime: parseFloat(totalTime.toFixed(2)),
            uniqueDates: workingDatesWithEntries.length,
            averageTimePerDay: parseFloat(averageTimePerDay.toFixed(2)),
            daysRemaining,
            progress: parseFloat(progress.toFixed(1)),
            sprintName: this.currentSprint ? this.currentSprint.name : 'No Sprint Selected'
        };
    }

    // Get overall summary statistics
    getSummary() {
        const totalEntries = this.entries.length;
        const totalTime = this.entries.reduce((sum, entry) => sum + entry.timeSpent, 0);
        const uniqueDates = [...new Set(this.entries.map(entry => entry.date))];
        const averageTimePerDay = uniqueDates.length > 0 ? totalTime / uniqueDates.length : 0;

        return {
            totalEntries,
            totalTime: parseFloat(totalTime.toFixed(2)),
            uniqueDates: uniqueDates.length,
            averageTimePerDay: parseFloat(averageTimePerDay.toFixed(2)),
            totalSprints: this.sprints.length
        };
    }

    // Delete an entry
    deleteEntry(id) {
        const index = this.entries.findIndex(entry => entry.id === id);
        if (index !== -1) {
            this.entries.splice(index, 1);
            this.saveEntries();
            return true;
        }
        return false;
    }

    // Clear all entries
    clearAllEntries() {
        this.entries = [];
        this.saveEntries();
    }

    // Debug function to recalculate all sprint end dates
    recalculateAllSprintEndDates() {
        let updated = 0;
        this.sprints.forEach(sprint => {
            const newEndDate = this.calculateSprintEndDate(sprint.startDate);
            if (sprint.endDate !== newEndDate) {
                console.log(`Updating sprint "${sprint.name}" end date from ${sprint.endDate} to ${newEndDate}`);
                sprint.endDate = newEndDate;
                updated++;
            }
        });
        
        if (updated > 0) {
            this.saveSprints();
            // Update current sprint if it was changed
            if (this.currentSprint) {
                const updatedCurrentSprint = this.sprints.find(s => s.id === this.currentSprint.id);
                if (updatedCurrentSprint) {
                    this.currentSprint = updatedCurrentSprint;
                    this.saveCurrentSprint();
                }
            }
        }
        
        return updated;
    }

    // Clear all data (for debugging)
    clearAllData() {
        this.entries = [];
        this.sprints = [];
        this.currentSprint = null;
        this.saveEntries();
        this.saveSprints();
        this.saveCurrentSprint();
    }
}

// UI Controller
class TimeTrackerUI {
    constructor() {
        this.tracker = new TimeTracker();
        this.init();
    }

    init() {
        this.createUI();
        this.bindEvents();
        this.refreshDisplay();
    }

    createUI() {
        document.body.innerHTML = `
            <div class="container">
                <h1>🏃‍♂️ Sprint Time Tracker</h1>
                
                <div class="input-section">
                    <div class="sprint-management">
                        <h2>Sprint Management</h2>
                        <div id="currentSprintInfo"></div>
                        <button id="createSprintBtn" class="secondary-btn">Create New Sprint</button>
                        <button id="selectSprintBtn" class="secondary-btn">Select Sprint</button>
                    </div>
                    
                    <div class="time-entry" id="timeEntrySection" style="display: none;">
                        <h2>Add Time Entry</h2>
                        <div id="pastSprintWarning" class="past-sprint-warning" style="display: none;">
                            <p>⚠️ This sprint has ended. You can still add entries for past dates within the sprint period.</p>
                        </div>
                        <form id="entryForm">
                            <div class="form-group">
                                <label for="dateInput">Date:</label>
                                <input type="date" id="dateInput" required>
                            </div>
                            
                            <div class="form-group">
                                <label for="jiraInput">Jira Task ID:</label>
                                <input type="text" id="jiraInput" placeholder="e.g., PROJ-123" required>
                            </div>
                            
                            <div class="form-group">
                                <label for="timeInput">Time Spent (hours):</label>
                                <input type="number" id="timeInput" step="0.25" min="0.25" placeholder="e.g., 2.5" required>
                            </div>
                            
                            <div class="form-group">
                                <label for="workDoneInput">Work Done:</label>
                                <textarea id="workDoneInput" placeholder="e.g., Tested login functionality, found 2 bugs" rows="3" required></textarea>
                            </div>
                            
                            <button type="submit">Add Entry</button>
                        </form>
                    </div>
                </div>

                <div class="sprint-progress-section">
                    <h2>Current Sprint Progress</h2>
                    <div id="sprintProgress"></div>
                </div>

                <div class="main-content">
                    <div class="entries-section">
                        <h2>Sprint Entries</h2>
                        <div class="controls">
                            <button id="clearSprintBtn" class="danger-btn">Clear Sprint Entries</button>
                        </div>
                        <div id="entriesList"></div>
                    </div>

                    <div class="summary-section">
                        <h2>Sprint Summary</h2>
                        <div id="summaryDisplay"></div>
                    </div>
                </div>
            </div>

            <!-- Sprint Creation Modal -->
            <div id="sprintModal" class="modal" style="display: none;">
                <div class="modal-content">
                    <span class="close">&times;</span>
                    <h2>Create New Sprint</h2>
                    <form id="sprintForm">
                        <div class="form-group">
                            <label for="sprintNameInput">Sprint Name:</label>
                            <input type="text" id="sprintNameInput" placeholder="e.g., Sprint 24.15" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="sprintStartInput">Start Date:</label>
                            <input type="date" id="sprintStartInput" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="sprintEndInput">End Date:</label>
                            <input type="date" id="sprintEndInput" required>
                            <small style="color: #666;">You can manually set the end date or use auto-calculate</small>
                        </div>
                        
                        <div class="form-group">
                            <button type="button" id="autoCalculateBtn" class="secondary-btn">Auto-Calculate End Date (10 working days)</button>
                        </div>
                        
                        <button type="submit">Create Sprint</button>
                        <button type="button" id="cancelSprintBtn">Cancel</button>
                    </form>
                </div>
            </div>

            <!-- Sprint Selection Modal -->
            <div id="selectSprintModal" class="modal" style="display: none;">
                <div class="modal-content">
                    <span class="close">&times;</span>
                    <h2>Select Sprint</h2>
                    <div id="sprintsList"></div>
                    <button type="button" id="cancelSelectBtn">Cancel</button>
                </div>
            </div>
        `;

        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }

            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background-color: #f5f5f5;
                color: #333;
                line-height: 1.6;
                min-height: 100vh;
            }

            .container {
                max-width: 1400px;
                margin: 0 auto;
                padding: 20px;
                display: grid;
                grid-template-columns: 350px 1fr;
                grid-template-rows: auto auto 1fr;
                gap: 20px;
                height: 100vh;
                grid-template-areas: 
                    "header header"
                    "input sprint-progress"
                    "input main";
            }

            h1 {
                grid-area: header;
                text-align: center;
                color: #2c3e50;
                margin-bottom: 0;
                font-size: 2.5em;
            }

            h2 {
                color: #34495e;
                margin-bottom: 15px;
                border-bottom: 2px solid #3498db;
                padding-bottom: 5px;
                font-size: 1.3em;
            }

            .input-section {
                grid-area: input;
                background: white;
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                height: fit-content;
                position: sticky;
                top: 20px;
                max-height: calc(100vh - 40px);
                overflow-y: auto;
            }

            .sprint-progress-section {
                grid-area: sprint-progress;
                background: white;
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                height: fit-content;
            }

            .main-content {
                grid-area: main;
                display: flex;
                flex-direction: column;
                gap: 20px;
                overflow: hidden;
            }

            .entries-section, .summary-section {
                background: white;
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }

            .entries-section {
                flex: 1;
                overflow: hidden;
                display: flex;
                flex-direction: column;
            }

            #entriesList {
                overflow-y: auto;
                flex: 1;
                max-height: 400px;
            }

            @media (max-width: 1024px) {
                .container {
                    grid-template-columns: 1fr;
                    grid-template-rows: auto auto auto auto;
                    grid-template-areas: 
                        "header"
                        "input"
                        "sprint-progress"
                        "main";
                    height: auto;
                }
                
                .input-section {
                    position: static;
                    max-height: none;
                }
                
                .main-content {
                    overflow: visible;
                }
                
                #entriesList {
                    max-height: 300px;
                }
            }

            .form-group {
                margin-bottom: 15px;
            }

            label {
                display: block;
                margin-bottom: 5px;
                font-weight: bold;
                color: #555;
            }

            input {
                width: 100%;
                padding: 10px;
                border: 2px solid #ddd;
                border-radius: 4px;
                font-size: 16px;
                transition: border-color 0.3s;
            }

            textarea {
                width: 100%;
                padding: 10px;
                border: 2px solid #ddd;
                border-radius: 4px;
                font-size: 16px;
                transition: border-color 0.3s;
                font-family: inherit;
                resize: vertical;
                min-height: 80px;
            }

            input:focus, textarea:focus {
                outline: none;
                border-color: #3498db;
            }

            button {
                background-color: #3498db;
                color: white;
                padding: 12px 24px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 16px;
                transition: background-color 0.3s;
            }

            button:hover {
                background-color: #2980b9;
            }

            .danger-btn {
                background-color: #e74c3c;
            }

            .danger-btn:hover {
                background-color: #c0392b;
            }

            .progress-bar {
                width: 100%;
                height: 30px;
                background-color: #ecf0f1;
                border-radius: 15px;
                overflow: hidden;
                margin: 10px 0;
            }

            .progress-fill {
                height: 100%;
                background: linear-gradient(90deg, #27ae60, #2ecc71);
                transition: width 0.3s ease;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-weight: bold;
            }

            .entry-item {
                background-color: #f8f9fa;
                padding: 15px;
                margin-bottom: 10px;
                border-radius: 6px;
                border-left: 4px solid #3498db;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .entry-info {
                flex: 1;
            }

            .entry-actions {
                margin-left: 15px;
            }

            .delete-btn {
                background-color: #e74c3c;
                padding: 6px 12px;
                font-size: 14px;
            }

            .stats-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 15px;
                margin-top: 15px;
            }

            .stat-card {
                background-color: #f8f9fa;
                padding: 15px;
                border-radius: 6px;
                text-align: center;
                border-top: 3px solid #3498db;
            }

            .stat-number {
                font-size: 2em;
                font-weight: bold;
                color: #2c3e50;
            }

            .stat-label {
                color: #7f8c8d;
                margin-top: 5px;
            }

            .controls {
                margin-bottom: 15px;
            }

            .no-entries {
                text-align: center;
                color: #7f8c8d;
                padding: 40px;
                font-style: italic;
            }

            .secondary-btn {
                background-color: #95a5a6;
                margin-right: 10px;
                margin-bottom: 10px;
            }

            .secondary-btn:hover {
                background-color: #7f8c8d;
            }

            .sprint-management {
                margin-bottom: 20px;
                padding-bottom: 20px;
                border-bottom: 1px solid #eee;
            }

            .time-entry {
                margin-top: 20px;
            }

            .modal {
                position: fixed;
                z-index: 1000;
                left: 0;
                top: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0,0,0,0.5);
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .modal-content {
                background-color: white;
                padding: 20px;
                border-radius: 8px;
                width: 90%;
                max-width: 500px;
                max-height: 80%;
                overflow-y: auto;
                position: relative;
            }

            .close {
                position: absolute;
                right: 15px;
                top: 15px;
                font-size: 28px;
                font-weight: bold;
                cursor: pointer;
            }

            .close:hover {
                color: #e74c3c;
            }

            .sprint-item {
                background-color: #f8f9fa;
                padding: 15px;
                margin-bottom: 10px;
                border-radius: 6px;
                border-left: 4px solid #3498db;
                cursor: pointer;
                transition: background-color 0.3s;
            }

            .sprint-item:hover {
                background-color: #e9ecef;
            }

            .sprint-item.active {
                border-left-color: #27ae60;
                background-color: #d4edda;
            }

            .current-sprint-info {
                background-color: #e8f5e8;
                padding: 15px;
                border-radius: 6px;
                margin-bottom: 15px;
                border-left: 4px solid #27ae60;
            }

            .no-sprint {
                background-color: #fff3cd;
                padding: 15px;
                border-radius: 6px;
                margin-bottom: 15px;
                border-left: 4px solid #ffc107;
                color: #856404;
            }

            .past-sprint-warning {
                background-color: #fff3cd;
                padding: 15px;
                border-radius: 6px;
                margin-bottom: 15px;
                border-left: 4px solid #ff9800;
                color: #e65100;
            }

            .past-sprint-warning p {
                margin: 0;
                font-weight: bold;
            }
        `;
        document.head.appendChild(style);

        // Set today's date as default when sprint is active
        this.refreshDisplay();
    }

    bindEvents() {
        // Time entry form
        document.getElementById('entryForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addEntry();
        });

        // Sprint management buttons
        document.getElementById('createSprintBtn').addEventListener('click', () => {
            this.showCreateSprintModal();
        });

        document.getElementById('selectSprintBtn').addEventListener('click', () => {
            this.showSelectSprintModal();
        });

        // Sprint form
        document.getElementById('sprintForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.createSprint();
        });

        // Auto-calculate button
        document.getElementById('autoCalculateBtn').addEventListener('click', () => {
            const startDate = document.getElementById('sprintStartInput').value;
            if (startDate) {
                const endDate = this.tracker.calculateSprintEndDate(startDate);
                document.getElementById('sprintEndInput').value = endDate;
                this.showMessage('End date calculated for 10 working days from start date', 'success');
            } else {
                this.showMessage('Please select a start date first', 'error');
            }
        });

        // Modal close buttons
        document.querySelectorAll('.close, #cancelSprintBtn, #cancelSelectBtn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.closeModals();
            });
        });

        // Clear sprint entries button
        document.getElementById('clearSprintBtn').addEventListener('click', () => {
            if (confirm('Are you sure you want to delete all entries for this sprint? This action cannot be undone.')) {
                this.clearCurrentSprintEntries();
            }
        });

        // Close modal when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModals();
            }
        });
    }

    addEntry() {
        try {
            const date = document.getElementById('dateInput').value;
            const jiraId = document.getElementById('jiraInput').value;
            const timeSpent = document.getElementById('timeInput').value;
            const workDone = document.getElementById('workDoneInput').value;

            // Check if sprint is over and allow past dates
            const allowPastDates = this.tracker.isCurrentSprintOver();
            
            this.tracker.addEntry(date, jiraId, timeSpent, workDone, allowPastDates);
            
            // Clear form
            document.getElementById('jiraInput').value = '';
            document.getElementById('timeInput').value = '';
            document.getElementById('workDoneInput').value = '';
            
            this.refreshDisplay();
            this.showMessage('Entry added successfully!', 'success');
        } catch (error) {
            this.showMessage(error.message, 'error');
        }
    }

    refreshDisplay() {
        this.updateCurrentSprintInfo();
        this.updateSprintProgress();
        this.updateEntriesList();
        this.updateSummary();
        this.updateTimeEntryVisibility();
    }

    updateCurrentSprintInfo() {
        const currentSprint = this.tracker.getCurrentSprint();
        const infoDiv = document.getElementById('currentSprintInfo');
        
        if (currentSprint) {
            const isSprintOver = this.tracker.isCurrentSprintOver();
            const sprintStatus = isSprintOver ? 
                '<p style="color: #e74c3c; font-weight: bold;">📅 Sprint Completed</p>' : 
                '<p style="color: #27ae60; font-weight: bold;">🔄 Sprint Active</p>';
            
            infoDiv.innerHTML = `
                <div class="current-sprint-info">
                    <h3>${currentSprint.name}</h3>
                    ${sprintStatus}
                    <p><strong>Start:</strong> ${currentSprint.startDate}</p>
                    <p><strong>End:</strong> ${currentSprint.endDate}</p>
                    <p><strong>Days Remaining:</strong> ${this.tracker.getCurrentSprintDaysRemaining()} working days</p>
                </div>
            `;
        } else {
            infoDiv.innerHTML = `
                <div class="no-sprint">
                    <p>⚠️ No active sprint selected. Create or select a sprint to start tracking time.</p>
                </div>
            `;
        }
    }

    updateTimeEntryVisibility() {
        const timeEntrySection = document.getElementById('timeEntrySection');
        const pastSprintWarning = document.getElementById('pastSprintWarning');
        const currentSprint = this.tracker.getCurrentSprint();
        
        if (currentSprint) {
            timeEntrySection.style.display = 'block';
            
            // Check if sprint is over
            const isSprintOver = this.tracker.isCurrentSprintOver();
            
            if (isSprintOver) {
                pastSprintWarning.style.display = 'block';
                // For past sprints, set date to the last day of the sprint
                const dateInput = document.getElementById('dateInput');
                dateInput.value = currentSprint.endDate;
                dateInput.min = currentSprint.startDate;
                dateInput.max = currentSprint.endDate;
            } else {
                pastSprintWarning.style.display = 'none';
                // Set date input to today if it's a working day, otherwise set to next working day
                const today = new Date();
                let defaultDate = today;
                
                // If today is weekend, find next Monday
                if (today.getDay() === 0) { // Sunday
                    defaultDate.setDate(today.getDate() + 1); // Next Monday
                } else if (today.getDay() === 6) { // Saturday
                    defaultDate.setDate(today.getDate() + 2); // Next Monday
                }
                
                const dateInput = document.getElementById('dateInput');
                dateInput.value = defaultDate.toISOString().split('T')[0];
                dateInput.min = currentSprint.startDate;
                dateInput.max = currentSprint.endDate;
            }
            
            // Add event listener to warn about weekends (remove existing listeners first)
            const dateInput = document.getElementById('dateInput');
            const newDateInput = dateInput.cloneNode(true);
            dateInput.parentNode.replaceChild(newDateInput, dateInput);
            
            newDateInput.addEventListener('change', (e) => {
                const selectedDate = new Date(e.target.value);
                if (selectedDate.getDay() === 0 || selectedDate.getDay() === 6) {
                    this.showMessage('⚠️ Selected date is a weekend. Time entries are only allowed for working days (Monday-Friday).', 'error');
                }
            });
        } else {
            timeEntrySection.style.display = 'none';
            pastSprintWarning.style.display = 'none';
        }
    }

    updateSprintProgress() {
        const currentSprint = this.tracker.getCurrentSprint();
        const progressDiv = document.getElementById('sprintProgress');
        
        if (!currentSprint) {
            progressDiv.innerHTML = '<p>No active sprint selected.</p>';
            return;
        }

        const totalTime = this.tracker.getCurrentSprintTotalTime();
        const progress = this.tracker.getCurrentSprintProgress();
        const remaining = this.tracker.getCurrentSprintRemainingTime();
        const daysRemaining = this.tracker.getCurrentSprintDaysRemaining();
        const totalHours = this.tracker.SPRINT_TOTAL_HOURS;
        const isSprintOver = this.tracker.isCurrentSprintOver();

        const progressHtml = `
            <div class="progress-info">
                <p><strong>Sprint:</strong> ${currentSprint.name}</p>
                <p><strong>Time logged:</strong> ${totalTime.toFixed(2)} / ${totalHours} hours</p>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progress}%">
                        ${progress.toFixed(1)}%
                    </div>
                </div>
                <p><strong>Remaining time:</strong> ${remaining.toFixed(2)} hours</p>
                <p><strong>Days remaining:</strong> ${daysRemaining} working days</p>
                ${progress >= 100 ? '<p style="color: #27ae60; font-weight: bold;">🎉 Sprint goal achieved!</p>' : ''}
                ${isSprintOver ? '<p style="color: #e74c3c; font-weight: bold;">📅 Sprint period has ended</p>' : ''}
            </div>
        `;

        progressDiv.innerHTML = progressHtml;
    }

    updateEntriesList() {
        const entries = this.tracker.getCurrentSprintEntries().slice().reverse(); // Show newest first
        
        if (entries.length === 0) {
            document.getElementById('entriesList').innerHTML = '<div class="no-entries">No entries yet for this sprint. Add your first time entry above!</div>';
            return;
        }

        const entriesHtml = entries.map(entry => `
            <div class="entry-item">
                <div class="entry-info">
                    <strong>${entry.date}</strong> - ${entry.jiraId}
                    <br>
                    <span style="color: #7f8c8d;">Time: ${entry.timeSpent} hours</span>
                    <br>
                    <span style="color: #555; font-style: italic;">${entry.workDone || 'No description'}</span>
                </div>
                <div class="entry-actions">
                    <button class="delete-btn" onclick="timeTrackerUI.deleteEntry(${entry.id})">Delete</button>
                </div>
            </div>
        `).join('');

        document.getElementById('entriesList').innerHTML = entriesHtml;
    }

    updateSummary() {
        const summary = this.tracker.getCurrentSprintSummary();
        
        const summaryHtml = `
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-number">${summary.totalEntries}</div>
                    <div class="stat-label">Sprint Entries</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${summary.totalTime}</div>
                    <div class="stat-label">Hours Logged</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${summary.uniqueDates}</div>
                    <div class="stat-label">Active Days</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${summary.averageTimePerDay}</div>
                    <div class="stat-label">Avg Hours/Day</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${summary.daysRemaining}</div>
                    <div class="stat-label">Working Days Left</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${summary.progress}%</div>
                    <div class="stat-label">Sprint Progress</div>
                </div>
            </div>
        `;

        document.getElementById('summaryDisplay').innerHTML = summaryHtml;
    }

    showCreateSprintModal() {
        // Set default start date to today and clear end date
        document.getElementById('sprintStartInput').value = new Date().toISOString().split('T')[0];
        document.getElementById('sprintEndInput').value = '';
        document.getElementById('sprintModal').style.display = 'flex';
    }

    showSelectSprintModal() {
        this.updateSprintsList();
        document.getElementById('selectSprintModal').style.display = 'flex';
    }

    closeModals() {
        document.getElementById('sprintModal').style.display = 'none';
        document.getElementById('selectSprintModal').style.display = 'none';
        // Clear form
        document.getElementById('sprintForm').reset();
    }

    createSprint() {
        try {
            const name = document.getElementById('sprintNameInput').value;
            const startDate = document.getElementById('sprintStartInput').value;
            const endDate = document.getElementById('sprintEndInput').value;

            if (!name || !startDate) {
                throw new Error('Sprint name and start date are required');
            }

            const sprint = this.tracker.createSprint(name, startDate, endDate);
            this.tracker.setCurrentSprint(sprint.id);
            
            this.closeModals();
            this.refreshDisplay();
            this.showMessage('Sprint created and activated successfully!', 'success');
        } catch (error) {
            this.showMessage(error.message, 'error');
        }
    }

    updateSprintsList() {
        const sprints = this.tracker.sprints.slice().reverse(); // Show newest first
        const currentSprint = this.tracker.getCurrentSprint();
        const sprintsListDiv = document.getElementById('sprintsList');

        if (sprints.length === 0) {
            sprintsListDiv.innerHTML = '<p>No sprints created yet.</p>';
            return;
        }

        const sprintsHtml = sprints.map(sprint => `
            <div class="sprint-item ${currentSprint && currentSprint.id === sprint.id ? 'active' : ''}" 
                 onclick="timeTrackerUI.selectSprint(${sprint.id})">
                <h4>${sprint.name}</h4>
                <p>${sprint.startDate} to ${sprint.endDate}</p>
                ${currentSprint && currentSprint.id === sprint.id ? '<p><strong>Currently Active</strong></p>' : ''}
            </div>
        `).join('');

        sprintsListDiv.innerHTML = sprintsHtml;
    }

    selectSprint(sprintId) {
        this.tracker.setCurrentSprint(sprintId);
        this.closeModals();
        this.refreshDisplay();
        this.showMessage('Sprint activated successfully!', 'success');
    }

    clearCurrentSprintEntries() {
        const currentSprint = this.tracker.getCurrentSprint();
        if (!currentSprint) return;

        // Remove all entries for current sprint
        this.tracker.entries = this.tracker.entries.filter(entry => entry.sprintId !== currentSprint.id);
        this.tracker.saveEntries();
        
        this.refreshDisplay();
        this.showMessage('Sprint entries cleared successfully!', 'success');
    }

    deleteEntry(id) {
        if (confirm('Are you sure you want to delete this entry?')) {
            this.tracker.deleteEntry(id);
            this.refreshDisplay();
            this.showMessage('Entry deleted successfully!', 'success');
        }
    }

    showMessage(message, type = 'info') {
        const messageDiv = document.createElement('div');
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 4px;
            color: white;
            font-weight: bold;
            z-index: 1000;
            transition: opacity 0.3s;
            ${type === 'success' ? 'background-color: #27ae60;' : 'background-color: #e74c3c;'}
        `;
        messageDiv.textContent = message;
        document.body.appendChild(messageDiv);

        setTimeout(() => {
            messageDiv.remove();
        }, 3000);
    }
}

// Initialize the application when the DOM is loaded
let timeTrackerUI;
document.addEventListener('DOMContentLoaded', () => {
    timeTrackerUI = new TimeTrackerUI();
});

// Console interface for quick testing
console.log('Sprint Time Tracker loaded! You can also use these commands in the console:');
console.log('- tracker.createSprint("Sprint 24.15", "2025-07-30", "2025-08-12")');
console.log('- tracker.setCurrentSprint(sprintId)');
console.log('- tracker.getCurrentSprintTotalTime()');
console.log('- tracker.getCurrentSprintSummary()');
console.log('- tracker.recalculateAllSprintEndDates() // Fix existing sprints');
console.log('- tracker.clearAllData() // Clear all data and start fresh');

// Export for console use
window.tracker = new TimeTracker();

// Automatically fix existing sprints on load
setTimeout(() => {
    const updated = window.tracker.recalculateAllSprintEndDates();
    if (updated > 0) {
        console.log(`Fixed ${updated} sprint(s) with corrected end dates. Refreshing display...`);
        if (window.timeTrackerUI) {
            window.timeTrackerUI.refreshDisplay();
        }
    }
}, 1000);

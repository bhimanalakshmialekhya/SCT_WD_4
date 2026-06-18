document.addEventListener('DOMContentLoaded', () => {
    const taskForm = document.getElementById('taskForm');
    const taskInput = document.getElementById('taskInput');
    const taskPriority = document.getElementById('taskPriority');
    const taskDate = document.getElementById('taskDate');
    const taskList = document.getElementById('taskList');
    const emptyState = document.getElementById('emptyState');
    const voiceBtn = document.getElementById('voiceBtn');
    const voiceStatus = document.getElementById('voiceStatus');
    const filterBtns = document.querySelectorAll('.filter-btn');

    let db = JSON.parse(localStorage.getItem('PROFESSIONAL_TASKS')) || [];
    let currentFilter = 'all';

    // --- INTEGRATED VOICE PARSING (SPEECH TO METADATA) ---
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.lang = 'en-US';

        voiceBtn.addEventListener('click', () => {
            if (voiceBtn.classList.contains('recording')) {
                recognition.stop();
            } else {
                recognition.start();
            }
        });

        recognition.onstart = () => {
            voiceBtn.classList.add('recording');
            voiceStatus.style.display = 'block';
        };

        recognition.onresult = (event) => {
            let transcript = event.results[0][0].transcript.toLowerCase();
            
            // Smart Extraction Logic
            let extractedPriority = 'medium';
            if (transcript.includes('high priority') || transcript.includes('urgent') || transcript.includes('critical')) {
                extractedPriority = 'high';
                transcript = transcript.replace(/high priority|urgent|critical/g, '');
            } else if (transcript.includes('low priority') || transcript.includes('easy')) {
                extractedPriority = 'low';
                transcript = transcript.replace(/low priority|easy/g, '');
            }

            let today = new Date();
            let targetDate = '';

            if (transcript.includes('tomorrow')) {
                today.setDate(today.getDate() + 1);
                targetDate = today.toISOString().split('T')[0];
                transcript = transcript.replace('tomorrow', '');
            } else if (transcript.includes('today')) {
                targetDate = today.toISOString().split('T')[0];
                transcript = transcript.replace('today', '');
            }

            // Clean up and assign to inputs dynamically
            taskInput.value = transcript.trim().charAt(0).toUpperCase() + transcript.trim().slice(1);
            taskPriority.value = extractedPriority;
            if (targetDate) taskDate.value = targetDate;
        };

        recognition.onend = () => {
            voiceBtn.classList.remove('recording');
            voiceStatus.style.display = 'none';
        };

        recognition.onerror = () => {
            voiceBtn.classList.remove('recording');
            voiceStatus.style.display = 'none';
        };
    } else {
        voiceBtn.style.display = 'none';
    }

    // --- CORE CRUD OPERATORS ---
    taskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = taskInput.value.trim();
        if (!text) return;

        const record = {
            id: 'task_' + Date.now(),
            text: text,
            priority: taskPriority.value,
            date: taskDate.value ? reformatDate(taskDate.value) : 'No due date',
            completed: false
        };

        db.unshift(record);
        taskInput.value = '';
        taskDate.value = '';
        taskPriority.value = 'medium';
        saveAndRefresh();
    });

    window.toggleComplete = (id) => {
        db = db.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
        saveAndRefresh();
    };

    window.deleteTask = (id) => {
        db = db.filter(t => t.id !== id);
        saveAndRefresh();
    };

    function saveAndRefresh() {
        localStorage.setItem('PROFESSIONAL_TASKS', JSON.stringify(db));
        render();
    }

    function render() {
        taskList.innerHTML = '';
        const filtered = db.filter(t => {
            if (currentFilter === 'pending') return !t.completed;
            if (currentFilter === 'completed') return t.completed;
            return true;
        });

        emptyState.style.display = filtered.length === 0 ? 'block' : 'none';

        filtered.forEach(t => {
            const li = document.createElement('li');
            li.className = `task-item ${t.completed ? 'done' : ''}`;
            li.innerHTML = `
                <div class="item-left" onclick="toggleComplete('${t.id}')">
                    <div class="check-circle"></div>
                    <div class="item-info">
                        <span class="item-text">${escape(t.text)}</span>
                        <div class="item-meta">
                            <span class="badge ${t.priority}">${t.priority}</span>
                            <span class="date-badge">📅 ${t.date}</span>
                        </div>
                    </div>
                </div>
                <button class="btn-delete" onclick="deleteTask('${t.id}')">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
            `;
            taskList.appendChild(li);
        });
    }

    filterBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            filterBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentFilter = e.target.getAttribute('data-filter');
            render();
        });
    });

    function reformatDate(inputDate) {
        const parts = inputDate.split('-');
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }

    function escape(str) {
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    render();
});
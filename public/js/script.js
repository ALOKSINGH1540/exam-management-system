document.addEventListener('DOMContentLoaded', () => {
    const userData = JSON.parse(localStorage.getItem('userData'));

    document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const requiredRole = document.getElementById('role').value;

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, requiredRole })
            });
            const data = await response.json();

            if (!data.success) {
                alert(data.message || 'Login failed.');
                return;
            }

            localStorage.setItem('userData', JSON.stringify(data.user));
            window.location.href = 'dashboard.html';
        } catch (error) {
            console.error('Login error:', error);
            alert('Connection error with server!');
        }
    });

    document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('regName').value;
        const email = document.getElementById('regEmail').value;
        const password = document.getElementById('regPassword').value;

        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password })
            });
            const data = await response.json();

            if (!data.success) {
                alert(data.message || 'Registration failed.');
                return;
            }

            alert(data.message || 'Registration successful! Please log in.');
            window.location.href = 'login.html';
        } catch (error) {
            console.error('Registration error:', error);
            alert('Connection error with server!');
        }
    });
    
    // LOGIN PROTECTION & ROLE SETUP
    if (document.getElementById('welcomeMessage')) {
        if (!userData) { window.location.href = 'login.html'; return; }
        
        document.getElementById('welcomeMessage').textContent = `Welcome, ${userData.name}!`;

        if (userData.role === 'admin') {
            document.getElementById('roleSubtitle').textContent = "Administrator Portal";
            document.getElementById('adminPanel').style.display = 'block';
            document.querySelectorAll('.admin-menu-item').forEach(el => el.style.display = 'block');
        }

        // TABS LOGIC
        const navLinks = document.querySelectorAll('.nav-link');
        const sections = document.querySelectorAll('.content-section');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                navLinks.forEach(l => l.classList.remove('active'));
                sections.forEach(s => s.classList.remove('active'));
                link.classList.add('active');
                document.getElementById(link.getAttribute('data-target')).classList.add('active');
            });
        });

        // Logout
        document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('userData');
            window.location.href = 'login.html';
        });

        fetchPublishedData();
    }

    // --- ADMIN FORMS SUBMISSION (Write Data) ---
    async function submitExamForm(apiUrl, bodyData, formElement) {
        bodyData.role = userData.role; // Security: Send role to server
        try {
            const response = await fetch(apiUrl, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bodyData)
            });
            const data = await response.json();
            alert(data.message);
            if (data.success) formElement.reset();
        } catch (error) { alert("Connection error!"); }
    }

    // Bind Admin Forms
    document.getElementById('addStudentForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        submitExamForm('/api/students', { name: document.getElementById('stuName').value, roll_number: document.getElementById('stuRoll').value, course: document.getElementById('stuCourse').value }, e.target);
    });
    document.getElementById('timeTableForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        submitExamForm('/api/timetables', { course: document.getElementById('ttCourse').value, subject: document.getElementById('ttSubject').value, exam_date: document.getElementById('ttDate').value, exam_time: document.getElementById('ttTime').value }, e.target);
    });
    document.getElementById('admitCardForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        submitExamForm('/api/admit-cards', { roll_number: document.getElementById('acRoll').value, exam_center: document.getElementById('acCenter').value }, e.target);
    });
    document.getElementById('resultForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        submitExamForm('/api/results', { roll_number: document.getElementById('resRoll').value, subject: document.getElementById('resSubject').value, marks: document.getElementById('resMarks').value }, e.target);
    });

    // --- STUDENT VIEW LOGIC (Read-Only Data) ---
    
    // View Timetable
    document.getElementById('loadTimetableBtn')?.addEventListener('click', async () => {
        const display = document.getElementById('timetableDisplay');
        display.innerHTML = 'Loading...';
        try {
            const res = await fetch('/api/view-timetable');
            const data = await res.json();
            if(data.success && data.data.length > 0) {
                let html = '<table style="width:100%; text-align:left; border-collapse: collapse; margin-top:10px;"><tr><th style="border-bottom:1px solid #ccc; padding:8px;">Course</th><th style="border-bottom:1px solid #ccc; padding:8px;">Subject</th><th style="border-bottom:1px solid #ccc; padding:8px;">Date</th><th style="border-bottom:1px solid #ccc; padding:8px;">Time</th></tr>';
                data.data.forEach(tt => {
                    const date = new Date(tt.exam_date).toLocaleDateString();
                    html += `<tr><td style="padding:8px; border-bottom:1px solid #eee;">${tt.course}</td><td style="padding:8px; border-bottom:1px solid #eee;">${tt.subject}</td><td style="padding:8px; border-bottom:1px solid #eee;">${date}</td><td style="padding:8px; border-bottom:1px solid #eee;">${tt.exam_time}</td></tr>`;
                });
                display.innerHTML = html + '</table>';
            } else { display.innerHTML = 'No schedule available.'; }
        } catch(err) { display.innerHTML = 'Error loading timetable.'; }
    });

    // View Admit Card
    document.getElementById('fetchAdmitCardForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const roll = document.getElementById('fetchAcRoll').value;
        const display = document.getElementById('admitCardDisplay');
        try {
            const res = await fetch('/api/view-admit-card', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({roll_number: roll}) });
            const data = await res.json();
            display.style.display = 'block';
            if(data.success) {
                display.innerHTML = `<h3>Admit Card</h3><p><b>Name:</b> ${data.data.name}</p><p><b>Roll No:</b> ${data.data.roll_number}</p><p><b>Course:</b> ${data.data.course}</p><p><b>Exam Center:</b> ${data.data.exam_center}</p>`;
            } else { display.innerHTML = `<p style="color:red;">${data.message}</p>`; }
        } catch(err) { display.innerHTML = 'Error fetching details.'; }
    });

    // View Result
    document.getElementById('fetchResultForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const roll = document.getElementById('fetchResRoll').value;
        const display = document.getElementById('resultDisplay');
        try {
            const res = await fetch('/api/view-result', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({roll_number: roll}) });
            const data = await res.json();
            display.style.display = 'block';
            if(data.success) {
                let html = `<h3>Result for ${data.data[0].name} (${roll})</h3><ul>`;
                data.data.forEach(r => { html += `<li><b>${r.subject}:</b> ${r.marks}/100</li>`; });
                display.innerHTML = html + '</ul>';
            } else { display.innerHTML = `<p style="color:red;">${data.message}</p>`; }
        } catch(err) { display.innerHTML = 'Error fetching result.'; }
    });

    document.getElementById('publishForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const subject = document.getElementById('pubSubject').value.trim();
        const department = document.getElementById('pubDept').value.trim();
        const description = document.getElementById('pubDesc').value.trim();

        if (!userData || userData.role !== 'admin') {
            alert('Only administrators can publish notices.');
            return;
        }

        try {
            const response = await fetch('/api/submit-application', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: userData.id, subject, department, description })
            });
            const data = await response.json();
            alert(data.message || 'Notice published successfully!');
            if (data.success) {
                document.getElementById('publishForm').reset();
                fetchPublishedData();
            }
        } catch (error) {
            console.error('Publish error:', error);
            alert('Connection error while publishing notice!');
        }
    });

    document.getElementById('askAiBtn')?.addEventListener('click', async () => {
        const prompt = document.getElementById('aiPrompt').value.trim();
        if (!prompt) {
            alert('Please enter a topic for the AI notice generator.');
            return;
        }

        try {
            const response = await fetch('/api/ai-help', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ promptText: prompt })
            });
            const data = await response.json();

            if (!data.success) {
                alert(data.message || 'AI failed to generate a notice.');
                return;
            }

            document.getElementById('pubDesc').value = data.aiResponse || '';
            document.getElementById('pubSubject').value = prompt;
            document.getElementById('pubDept').value = 'Academic Notice';
            alert('AI-generated notice is ready to review.');
        } catch (error) {
            console.error('AI generation error:', error);
            alert('Connection error while generating AI notice!');
        }
    });

    // --- OTHER EXISTING FUNCTIONS ---
    async function fetchPublishedData() {
        const container = document.getElementById('recordsContainer');
        if(!container) return;
        try {
            const response = await fetch('/api/applications');
            const data = await response.json();
            if (data.success && data.data.length > 0) {
                container.innerHTML = '';
                data.data.forEach(item => {
                    const dateString = new Date(item.submitted_at).toLocaleDateString('en-US');
                    container.innerHTML += `<div class="card" style="border-top-color:#d4af37;">
                        <h3 style="margin-bottom:5px; color:#0a2240;">${item.subject} <span style="font-size:12px; float:right;">${dateString}</span></h3>
                        <p style="font-size:13px; color:#888; font-weight:bold;">${item.department} | By Admin (${item.author})</p>
                        <p style="background:#fafafa; padding:10px; border-radius:4px; margin-top:10px;">${item.description}</p>
                    </div>`;
                });
            } else { container.innerHTML = '<p>No notices available.</p>'; }
        } catch(err) {}
    }
});
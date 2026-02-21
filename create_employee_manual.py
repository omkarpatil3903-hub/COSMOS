"""Generate Employee User Manual HTML - Creates comprehensive HTML documentation for Employee Panel"""
with open(r'd:\COSMOS\user-manuals\manager-user-manual.html', 'r', encoding='utf-8') as f:
    mgr = f.read()

# Replacements for employee-specific content
emp = mgr.replace('Manager Panel', 'Employee Panel')
emp = emp.replace('manager-user-manual', 'employee-user-manual')
emp = emp.replace('A Complete Guide for Project Managers', 'A Complete Guide for Employees')
emp = emp.replace('Manager Portal', 'Employee Portal')
emp = emp.replace('project managers', 'employees')
emp = emp.replace('🎯', '👤')

# Update Table of Contents for Employee features
toc_old = '''        <li class="toc-item"><a href="#intro"><span><span class="toc-number">1.</span> Introduction to the Manager Portal</span></a></li>
        <li class="toc-item"><a href="#dashboard"><span><span class="toc-number">2.</span> Dashboard: Your Command Center</span></a></li>
        <li class="toc-item"><a href="#projects"><span><span class="toc-number">3.</span> My Projects</span></a></li>
        <li class="toc-item"><a href="#tasks"><span><span class="toc-number">4.</span> Task Management</span></a></li>
        <li class="toc-item"><a href="#expenses"><span><span class="toc-number">5.</span> Team Expenses</span></a></li>
        <li class="toc-item"><a href="#knowledge"><span><span class="toc-number">6.</span> Knowledge Management</span></a></li>
        <li class="toc-item"><a href="#reports"><span><span class="toc-number">7.</span> Reports</span></a></li>
        <li class="toc-item"><a href="#calendar"><span><span class="toc-number">8.</span> Calendar</span></a></li>
        <li class="toc-item"><a href="#quick-actions"><span><span class="toc-number">9.</span> Quick Actions</span></a></li>
        <li class="toc-item"><a href="#notifications"><span><span class="toc-number">10.</span> Notifications System</span></a></li>
        <li class="toc-item"><a href="#settings"><span><span class="toc-number">11.</span> Settings and Profile</span></a></li>
        <li class="toc-item"><a href="#best-practices"><span><span class="toc-number">12.</span> Best Practices</span></a></li>'''

toc_new = '''        <li class="toc-item"><a href="#intro"><span><span class="toc-number">1.</span> Introduction to the Employee Portal</span></a></li>
        <li class="toc-item"><a href="#dashboard"><span><span class="toc-number">2.</span> Dashboard: Your Work Hub</span></a></li>
        <li class="toc-item"><a href="#tasks"><span><span class="toc-number">3.</span> My Tasks</span></a></li>
        <li class="toc-item"><a href="#projects"><span><span class="toc-number">4.</span> Projects</span></a></li>
        <li class="toc-item"><a href="#knowledge"><span><span class="toc-number">5.</span> Knowledge Management</span></a></li>
        <li class="toc-item"><a href="#calendar"><span><span class="toc-number">6.</span> Calendar</span></a></li>
        <li class="toc-item"><a href="#expenses"><span><span class="toc-number">7.</span> My Expenses</span></a></li>
        <li class="toc-item"><a href="#reports"><span><span class="toc-number">8.</span> Reports</span></a></li>
        <li class="toc-item"><a href="#settings"><span><span class="toc-number">9.</span> Settings and Profile</span></a></li>
        <li class="toc-item"><a href="#best-practices"><span><span class="toc-number">10.</span> Best Practices for Employees</span></a></li>'''

emp = emp.replace(toc_old, toc_new)

# Update section 1: Introduction
intro_old = '''<h2 class="section-title">1. Introduction to the Employee Portal</h2>'''
intro_new = intro_old
emp = emp.replace('<!-- SECTION 1: Introduction -->', '<!-- SECTION 1: Introduction for Employees -->')

# Update introduction content
old_intro_content = '''<p>Welcome to the COSMOS Employee Panel! This comprehensive user manual will guide you through all features and functionalities designed specifically for employees. The Employee Portal provides you with powerful tools to oversee your projects, manage team members, track tasks, approve expenses, and monitor overall project health.</p>'''
new_intro_content = '''<p>Welcome to the COSMOS Employee Panel! This comprehensive user manual will guide you through all features and functionalities designed to help you manage your work effectively. The Employee Portal provides you with tools to track your tasks, view project details, submit expenses, generate reports, and collaborate with your team.</p>'''
emp = emp.replace(old_intro_content, new_intro_content)

# Update Purpose section
old_purpose = '''<p>The Employee Panel is designed to give employees a centralized command center where they can:</p>
    <ul>
        <li>Monitor project progress and team performance</li>
        <li>manage tasks across all assigned projects</li>
        <li>Approve or reject team expense claims</li>
        <li>Access project documentation and knowledge base</li>
        <li>Generate reports and analytics</li>
        <li>Receive real-time notifications about critical events</li>
    </ul>'''

new_purpose = '''<p>The Employee Panel is designed to give you a centralized workspace where you can:</p>
    <ul>
        <li>View and manage your assigned tasks</li>
        <li>Track task progress with built-in timer</li>
        <li>Access project information and documentation</li>
        <li>Submit and track expense claims</li>
        <li>Generate weekly and monthly activity reports</li>
        <li>Stay informed with real-time notifications</li>
    </ul>'''
emp = emp.replace(old_purpose, new_purpose)

# Update Navigation Structure table
nav_old = '''<p>The Employee Panel features a collapsible sidebar with eight main navigation sections:</p>'''
nav_new = '''<p>The Employee Panel features a collapsible sidebar with eight main navigation sections:</p>'''
emp = emp.replace(nav_old, nav_new)

# Update navigation table content
nav_table_old = '''        <tbody>
            <tr>
                <td><strong>Dashboard</strong></td>
                <td>Overview and analytics</td>
                <td>KPIs, Project progress, Upcoming deadlines</td>
            </tr>
            <tr>
                <td><strong>My Projects</strong></td>
                <td>Project management</td>
                <td>View assigned projects, team members, progress</td>
            </tr>
            <tr>
                <td><strong>Task Management</strong></td>
                <td>Task oversight</td>
                <td>View, create, assign, and track tasks</td>
            </tr>
            <tr>
                <td><strong>Reports</strong></td>
                <td>Analytics and reporting</td>
                <td>Generate performance and progress reports</td>
            </tr>
            <tr>
                <td><strong>Calendar</strong></td>
                <td>Timeline visualization</td>
                <td>View deadlines and events</td>
            </tr>
            <tr>
                <td><strong>Knowledge Management</strong></td>
                <td>Documentation access</td>
                <td>Project documents and knowledge articles</td>
            </tr>
            <tr>
                <td><strong>Team Expenses</strong></td>
                <td>Expense approval</td>
                <td>Review and approve expense claims</td>
            </tr>
            <tr>
                <td><strong>Settings</strong></td>
                <td>Profile and preferences</td>
                <td>Theme, profile information</td>
            </tr>
        </tbody>'''

nav_table_new = '''        <tbody>
            <tr>
                <td><strong>Dashboard</strong></td>
                <td>Work overview</td>
                <td>Task statistics, upcoming deadlines, quick actions</td>
            </tr>
            <tr>
                <td><strong>My Tasks</strong></td>
                <td>Task management</td>
                <td>View, create, update, and track your tasks</td>
            </tr>
            <tr>
                <td><strong>Projects</strong></td>
                <td>Project information</td>
                <td>View assigned projects and team members</td>
            </tr>
            <tr>
                <td><strong>Reports</strong></td>
                <td>Activity reports</td>
                <td>Generate weekly/monthly work reports</td>
            </tr>
            <tr>
                <td><strong>Knowledge</strong></td>
                <td>Documentation access</td>
                <td>View shared knowledge and documents</td>
            </tr>
            <tr>
                <td><strong>Calendar</strong></td>
                <td>Schedule view</td>
                <td>View task deadlines and create events</td>
            </tr>
            <tr>
                <td><strong>My Expenses</strong></td>
                <td>Expense tracking</td>
                <td>Submit and track expense claims</td>
            </tr>
            <tr>
                <td><strong>Settings</strong></td>
                <td>Profile and preferences</td>
                <td>Update profile, theme, password</td>
            </tr>
        </tbody>'''

emp = emp.replace(nav_table_old, nav_table_new)

# Update Panel Switcher description
panel_old = '''<p>If you have access to multiple roles (Super Admin, Admin, Employee), you can easily switch between panels using the Panel Switcher located in the sidebar header. Simply click on "Employee Panel" and select your desired panel from the dropdown.</p>'''
panel_new = '''<p>If you have access to multiple roles (Manager, Admin, etc.), you can easily switch between panels using the Panel Switcher located in the sidebar header. Simply click on "Employee Panel" and select your desired panel from the dropdown.</p>'''
emp = emp.replace(panel_old, panel_new)

# Update Data Scope
scope_old = '''<p>As an employee, you will only see data related to projects where you are assigned as the Project employee. This focused view ensures relevant information and efficient workflow.</p>'''
scope_new = '''<p>As an employee, you will see tasks assigned to you, projects you're part of, and relevant documentation. This focused view ensures you have access to all information needed for your work.</p>'''
emp = emp.replace(scope_old, scope_new)

# Update Dashboard section title
dash_old = '''<h2 class="section-title">2. Dashboard: Your Command Center</h2>'''
dash_new = '''<h2 class="section-title">2. Dashboard: Your Work Hub</h2>'''
emp = emp.replace(dash_old, dash_new)

# Update dashboard intro
dash_intro_old = '''<p>The Dashboard is your daily starting point, providing a comprehensive overview of all your assigned projects, tasks, and team performance metrics.</p>'''
dash_intro_new = '''<p>The Dashboard is your daily starting point, providing a quick overview of your tasks, upcoming deadlines, and work statistics.</p>'''
emp = emp.replace(dash_intro_old, dash_intro_new)

# Update dashboard stats cards
stats_old = '''    <div class="feature-grid">
        <div class="feature-card">
            <div class="feature-card-title">📊 Total Projects</div>
            <p>Number of projects you currently manage</p>
        </div>
        <div class="feature-card">
            <div class="feature-card-title">✅ Completed Projects</div>
            <p>Projects where all tasks are completed</p>
        </div>
        <div class="feature-card">
            <div class="feature-card-title">📋 Total Tasks</div>
            <p>All tasks across your assigned projects</p>
        </div>
        <div class="feature-card">
            <div class="feature-card-title">👥 Team Size</div>
            <p>Unique team members on your projects</p>
        </div>
    </div>'''

stats_new = '''    <div class="feature-grid">
        <div class="feature-card">
            <div class="feature-card-title">📋 Total Tasks</div>
            <p>All tasks assigned to you</p>
        </div>
        <div class="feature-card">
            <div class="feature-card-title">✅ Completed Tasks</div>
            <p>Tasks you've finished</p>
        </div>
        <div class="feature-card">
            <div class="feature-card-title">⏳ In Progress</div>
            <p>Tasks you're currently working on</p>
        </div>
        <div class="feature-card">
            <div class="feature-card-title">⚠️ Overdue Tasks</div>
            <p>Tasks past their due date</p>
        </div>
    </div>'''
emp = emp.replace(stats_old, stats_new)

# Save the employee manual
with open(r'd:\COSMOS\user-manuals\employee-user-manual.html', 'w', encoding='utf-8') as f:
    f.write(emp)

print("\n✅ Employee User Manual created successfully!")
print("📄 Location: d:\\COSMOS\\user-manuals\\employee-user-manual.html")
print("🖨️  Use browser's Print (Ctrl+P) to save as PDF")
print("\n💡 Note: CSS has been updated to fix nested list rendering in step-by-step instructions")

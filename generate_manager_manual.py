"""
Generate Manager Panel User Manual HTML
Creates a professional, print-friendly HTML user manual for the COSMOS Manager Panel
"""

OUTPUT_FILE = r'd:\COSMOS\user-manuals\manager-user-manual.html'

html_content = '''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>COSMOS Manager Panel - User Manual</title>
    <style>
        :root {
            --primary-color: #10b981;
            --secondary-color: #059669;
            --accent-color: #34d399;
            --text-dark: #1f2937;
            --text-gray: #6b7280;
            --bg-light: #f9fafb;
            --border-color: #e5e7eb;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: var(--text-dark);
            background: white;
        }

        .container {
            max-width: 1000px;
            margin: 0 auto;
            padding: 20px;
        }

        /* Cover Page */
        .cover-page {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            text-align: center;
            background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%);
            color: white;
            page-break-after: always;
        }

        .cover-logo {
            font-size: 4em;
            margin-bottom: 20px;
        }

        .cover-title {
            font-size: 3em;
            font-weight: 700;
            margin-bottom: 10px;
        }

        .cover-subtitle {
            font-size: 1.8em;
            font-weight: 300;
            margin-bottom: 40px;
        }

        .cover-version {
            font-size: 1.1em;
            opacity: 0.9;
        }

        /* Table of Contents */
        .toc-page {
            page-break-after: always;
            padding: 40px 0;
        }

        .toc-title {
            font-size: 2.5em;
            color: var(--primary-color);
            border-bottom: 3px solid var(--primary-color);
            padding-bottom: 15px;
            margin-bottom: 30px;
        }

        .toc-list {
            list-style: none;
        }

        .toc-item {
            padding: 12px 0;
            border-bottom: 1px solid var(--border-color);
        }

        .toc-item a {
            text-decoration: none;
            color: var(--text-dark);
            display: flex;
            justify-content: space-between;
            transition: color 0.3s;
        }

        .toc-item a:hover {
            color: var(--primary-color);
        }

        .toc-number {
            font-weight: 600;
            color: var(--primary-color);
            margin-right: 15px;
        }

        /* Main Content */
        .section {
            margin: 40px 0;
            page-break-inside: avoid;
        }

        .section-title {
            font-size: 2.2em;
            color: var(--primary-color);
            border-left: 5px solid var(--primary-color);
            padding-left: 20px;
            margin: 40px 0 20px 0;
            page-break-after: avoid;
        }

        .subsection-title {
            font-size: 1.6em;
            color: var(--secondary-color);
            margin: 30px 0 15px 0;
            page-break-after: avoid;
        }

        .subsubsection-title {
            font-size: 1.3em;
            color: var(--text-dark);
            margin: 20px 0 10px 0;
            font-weight: 600;
        }

        p {
            margin: 15px 0;
            text-align: justify;
        }

        ul, ol {
            margin: 15px 0 15px 30px;
        }

        li {
            margin: 8px 0;
        }

        /* Info Boxes */
        .info-box {
            background: var(--bg-light);
            border-left: 4px solid var(--primary-color);
            padding: 15px 20px;
            margin: 20px 0;
            border-radius: 4px;
            page-break-inside: avoid;
        }

        .info-box.tip {
            border-left-color: #3b82f6;
            background: #eff6ff;
        }

        .info-box.warning {
            border-left-color: #f59e0b;
            background: #fffbeb;
        }

        .info-box.important {
            border-left-color: #ef4444;
            background: #fef2f2;
        }

        .info-box-title {
            font-weight: 700;
            margin-bottom: 8px;
            text-transform: uppercase;
            font-size: 0.9em;
            letter-spacing: 0.5px;
        }

        /* Tables */
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            page-break-inside: auto;
        }

        thead {
            background: var(--primary-color);
            color: white;
        }

        th, td {
            padding: 12px 15px;
            text-align: left;
            border: 1px solid var(--border-color);
        }

        tr {
            page-break-inside: avoid;
            page-break-after: auto;
        }

        tbody tr:nth-child(even) {
            background: var(--bg-light);
        }

        /* Feature Cards */
        .feature-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 20px;
            margin: 20px 0;
        }

        .feature-card {
            background: var(--bg-light);
            padding: 20px;
            border-radius: 8px;
            border: 1px solid var(--border-color);
            page-break-inside: avoid;
        }

        .feature-card-title {
            font-weight: 600;
            color: var(--primary-color);
            margin-bottom: 10px;
            font-size: 1.1em;
        }

        /* Code/Examples */
        .example-box {
            background: #1f2937;
            color: #f3f4f6;
            padding: 15px 20px;
            border-radius: 6px;
            font-family: 'Courier New', monospace;
            font-size: 0.9em;
            margin: 15px 0;
            page-break-inside: avoid;
        }

        /* Steps */
        .steps {
            counter-reset: step-counter;
            list-style: none;
            margin-left: 0;
        }

        .steps li {
            counter-increment: step-counter;
            position: relative;
            padding-left: 50px;
            margin: 20px 0;
        }

        .steps li::before {
            content: counter(step-counter);
            position: absolute;
            left: 0;
            top: 0;
            width: 32px;
            height: 32px;
            background: var(--primary-color);
            color: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
        }

        /* Print Styles */
        @media print {
            body {
                font-size: 11pt;
            }

            .container {
                max-width: 100%;
                padding: 0;
            }

            .cover-page {
                min-height: 100vh;
            }

            .section-title {
                page-break-after: avoid;
            }

            .subsection-title {
                page-break-after: avoid;
            }

            table {
                page-break-inside: auto;
            }

            tr {
                page-break-inside: avoid;
                page-break-after: auto;
            }

            .info-box, .feature-card, .example-box {
                page-break-inside: avoid;
            }

            a {
                text-decoration: none;
                color: inherit;
            }

            @page {
                margin: 2cm;
            }
        }

        @media screen {
            html {
                scroll-behavior: smooth;
            }
        }
    </style>
</head>
<body>

<!-- Cover Page -->
<div class="cover-page">
    <div class="cover-logo">🎯</div>
    <h1 class="cover-title">COSMOS ERP</h1>
    <h2 class="cover-subtitle">Manager Panel User Manual</h2>
    <p class="cover-version">A Complete Guide for Project Managers</p>
    <p class="cover-version" style="margin-top: 20px;">Version 1.0 | 2026</p>
</div>

<div class="container">

<!-- Table of Contents -->
<div class="toc-page" id="toc">
    <h2 class="toc-title">Table of Contents</h2>
    <ul class="toc-list">
        <li class="toc-item"><a href="#intro"><span><span class="toc-number">1.</span> Introduction to the Manager Portal</span></a></li>
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
        <li class="toc-item"><a href="#best-practices"><span><span class="toc-number">12.</span> Best Practices</span></a></li>
    </ul>
</div>

<!-- SECTION 1: Introduction -->
<div class="section" id="intro">
    <h2 class="section-title">1. Introduction to the Manager Portal</h2>
    
    <p>Welcome to the COSMOS Manager Panel! This comprehensive user manual will guide you through all features and functionalities designed specifically for project managers. The Manager Portal provides you with powerful tools to oversee your projects, manage team members, track tasks, approve expenses, and monitor overall project health.</p>

    <h3 class="subsection-title">Purpose and Overview</h3>
    <p>The Manager Panel is designed to give project managers a centralized command center where they can:</p>
    <ul>
        <li>Monitor project progress and team performance</li>
        <li>Manage tasks across all assigned projects</li>
        <li>Approve or reject team expense claims</li>
        <li>Access project documentation and knowledge base</li>
        <li>Generate reports and analytics</li>
        <li>Receive real-time notifications about critical events</li>
    </ul>

    <h3 class="subsection-title">Navigation Structure</h3>
    <p>The Manager Panel features a collapsible sidebar with eight main navigation sections:</p>

    <table>
        <thead>
            <tr>
                <th>Section</th>
                <th>Purpose</th>
                <th>Key Features</th>
            </tr>
        </thead>
        <tbody>
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
        </tbody>
    </table>

    <h3 class="subsection-title">Interface Features</h3>
    
    <h4 class="subsubsection-title">Responsive Design</h4>
    <p>The Manager Portal is fully responsive and works seamlessly across devices:</p>
    <ul>
        <li><strong>Desktop</strong>: Fixed sidebar with full navigation</li>
        <li><strong>Tablet/Mobile</strong>: Drawer-style navigation with hamburger menu</li>
    </ul>

    <h4 class="subsubsection-title">Panel Switcher</h4>
    <p>If you have access to multiple roles (Super Admin, Admin, Employee), you can easily switch between panels using the Panel Switcher located in the sidebar header. Simply click on "Manager Panel" and select your desired panel from the dropdown.</p>

    <div class="info-box tip">
        <div class="info-box-title">💡 Tip</div>
        <p>You can rearrange navigation items in the sidebar by dragging and dropping them. Your custom order will be saved automatically.</p>
    </div>

    <h4 class="subsubsection-title">Data Scope</h4>
    <p>As a manager, you will only see data related to projects where you are assigned as the Project Manager. This focused view ensures relevant information and efficient workflow.</p>
</div>

<!-- SECTION 2: Dashboard -->
<div class="section" id="dashboard">
    <h2 class="section-title">2. Dashboard: Your Command Center</h2>
    
    <p>The Dashboard is your daily starting point, providing a comprehensive overview of all your managed projects, tasks, and team performance metrics.</p>

    <h3 class="subsection-title">2.1 Key Statistics Overview</h3>
    <p>At the top of the dashboard, you'll find four primary statistic cards displaying real-time metrics:</p>

    <div class="feature-grid">
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
            <p>All tasks across your managed projects</p>
        </div>
        <div class="feature-card">
            <div class="feature-card-title">👥 Team Size</div>
            <p>Unique team members on your projects</p>
        </div>
    </div>

    <h3 class="subsection-title">2.2 Additional Performance Metrics</h3>
    <p>Below the main statistics, you'll find detailed task metrics:</p>
    <ul>
        <li><strong>Completed Tasks</strong>: Count of tasks marked as "Done" or "Completed"</li>
        <li><strong>In Progress Tasks</strong>: Tasks currently being worked on by team members</li>
        <li><strong>Overdue Tasks</strong>: Tasks past their due date (excluding completed tasks)</li>
    </ul>

    <div class="info-box warning">
        <div class="info-box-title">⚠️ Important</div>
        <p>Overdue tasks are calculated based on tasks that are past their due date AND not completed. Keep a close eye on this metric to ensure timely project delivery.</p>
    </div>

    <h3 class="subsection-title">2.3 Project Progress Section</h3>
    <p>This section displays visual progress bars for each of your managed projects:</p>
    
    <h4 class="subsubsection-title">What's Displayed:</h4>
    <ul>
        <li>Project name</li>
        <li>Progress percentage (based on completed tasks vs. total tasks)</li>
        <li>Task count summary (e.g., "5/10 tasks completed")</li>
        <li>Visual progress bar</li>
    </ul>

    <h4 class="subsubsection-title">How to Use:</h4>
    <ol class="steps">
        <li>Quickly scan all projects to identify those needing attention</li>
        <li>Click on any project card to view detailed information</li>
        <li>Use the progress indicators to prioritize your focus</li>
    </ol>

    <h3 class="subsection-title">2.4 Upcoming Deadlines (Next 7 Days)</h3>
    <p>This critical section shows tasks due within the next 7 days, helping you proactively manage workload:</p>

    <table>
        <thead>
            <tr>
                <th>Information</th>
                <th>Description</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>Task Title</td>
                <td>Name of the upcoming task</td>
            </tr>
            <tr>
                <td>Due Date</td>
                <td>When the task is due</td>
            </tr>
            <tr>
                <td>Priority Level</td>
                <td>High, Medium, or Low priority</td>
            </tr>
            <tr>
                <td>Assigned To</td>
                <td>Team member responsible for the task</td>
            </tr>
        </tbody>
    </table>

    <div class="info-box tip">
        <div class="info-box-title">💡 Best Practice</div>
        <p>Review the Upcoming Deadlines section daily to identify tasks that may need resources or support. Proactively communicate with team members about approaching deadlines.</p>
    </div>

    <h3 class="subsection-title">2.5 Team Overview</h3>
    <p>View all team members working on your projects in one place:</p>
    <ul>
        <li>Team member names and profile pictures</li>
        <li>Current role on the project</li>
        <li>Click "View Team" to see detailed team member information organized by project</li>
    </ul>
</div>

<!-- SECTION 3: My Projects -->
<div class="section" id="projects">
    <h2 class="section-title">3. My Projects</h2>
    
    <p>The My Projects section provides a comprehensive view of all projects where you serve as the Project Manager.</p>

    <h3 class="subsection-title">3.1 Viewing Your Projects</h3>
    <p>Navigate to <strong>My Projects</strong> from the sidebar to access your project list. Each project card displays:</p>
    <ul>
        <li><strong>Project Name</strong>: Title of the project</li>
        <li><strong>Client Name</strong>: Associated client</li>
        <li><strong>Start Date & Deadline</strong>: Project timeline</li>
        <li><strong>Progress Percentage</strong>: Overall completion status</li>
        <li><strong>Team Members</strong>: Number of assigned resources</li>
        <li><strong>Task Summary</strong>: Total tasks and completion count</li>
    </ul>

    <h3 class="subsection-title">3.2 Project Details</h3>
    <p>Click on any project to view detailed information:</p>
    
    <h4 class="subsubsection-title">Project Information Tab</h4>
    <ul>
        <li>Full project description and scope</li>
        <li>Budget allocation (if applicable)</li>
        <li>Project status (Active, On Hold, Completed)</li>
        <li>Timeline and milestones</li>
    </ul>

    <h4 class="subsubsection-title">Team Members Tab</h4>
    <ul>
        <li>View all assigned team members</li>
        <li>See individual roles and responsibilities</li>
        <li>Assign or remove team members (if you have permission)</li>
    </ul>

    <h4 class="subsubsection-title">Tasks Tab</h4>
    <ul>
        <li>All tasks specific to this project</li>
        <li>Filter by status, priority, or assignee</li>
        <li>Create new tasks for the project</li>
    </ul>

    <h3 class="subsection-title">3.3 Project Actions</h3>
    <p>Depending on your permissions, you can:</p>
    <ul>
        <li><strong>Edit Project</strong>: Update project details, timeline, budget</li>
        <li><strong>Manage Team</strong>: Add or remove team members</li>
        <li><strong>View Progress</strong>: Access detailed analytics</li>
        <li><strong>Generate Reports</strong>: Create project-specific reports</li>
    </ul>

    <div class="info-box">
        <div class="info-box-title">📌 Note</div>
        <p>Project filtering ensures you only see projects where you are designated as the Project Manager (projectManagerId matches your user ID).</p>
    </div>
</div>

<!-- SECTION 4: Task Management -->
<div class="section" id="tasks">
    <h2 class="section-title">4. Task Management</h2>
    
    <p>The Task Management section provides comprehensive oversight of all tasks across your managed projects.</p>

    <h3 class="subsection-title">4.1 Task Overview</h3>
    <p>Navigate to <strong>Task Management</strong> to see all tasks from your projects. Tasks can be viewed in multiple formats:</p>
    <ul>
        <li><strong>Table View</strong>: Detailed list with sorting and filtering</li>
        <li><strong>Kanban Board</strong>: Visual board organized by status</li>
    </ul>

    <h3 class="subsection-title">4.2 Task Filtering</h3>
    <p>Use the filter options to narrow down your task view:</p>
    
    <table>
        <thead>
            <tr>
                <th>Filter Type</th>
                <th>Options</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>Status</td>
                <td>To-Do, In Progress, Done, Overdue</td>
            </tr>
            <tr>
                <td>Priority</td>
                <td>High, Medium, Low</td>
            </tr>
            <tr>
                <td>Project</td>
                <td>Filter by specific project</td>
            </tr>
            <tr>
                <td>Assignee</td>
                <td>Filter by team member</td>
            </tr>
        </tbody>
    </table>

    <h3 class="subsection-title">4.3 Creating Tasks</h3>
    <p>To create a new task:</p>
    <ol class="steps">
        <li>Click the <strong>"+ Add Task"</strong> button</li>
        <li>Fill in the task details:
            <ul>
                <li>Task title and description</li>
                <li>Select the project</li>
                <li>Assign to a team member</li>
                <li>Set priority level (High/Medium/Low)</li>
                <li>Set due date and time</li>
                <li>Add any relevant tags or labels</li>
            </ul>
        </li>
        <li>Click <strong>"Create Task"</strong> to save</li>
    </ol>

    <h3 class="subsection-title">4.4 Task Detail View</h3>
    <p>Click on any task to open the Task Detail Modal, which displays:</p>
    <ul>
        <li><strong>Full Description</strong>: Complete task details</li>
        <li><strong>Status Updates</strong>: Change task status</li>
        <li><strong>Comments</strong>: Team communication thread</li>
        <li><strong>Subtasks</strong>: Break down complex tasks</li>
        <li><strong>Activity History</strong>: Timeline of all changes</li>
        <li><strong>Attachments</strong>: Related files and documents</li>
    </ul>

    <h3 class="subsection-title">4.5 Managing Task Status</h3>
    <p>As a manager, you can update task status to reflect progress:</p>
    <ul>
        <li><strong>To-Do</strong>: Task not yet started</li>
        <li><strong>In Progress</strong>: Task actively being worked on</li>
        <li><strong>Done</strong>: Task completed</li>
    </ul>

    <div class="info-box tip">
        <div class="info-box-title">💡 Workflow Tip</div>
        <p>Use the Kanban board view for quick status updates by dragging tasks between columns. This is especially useful during team standup meetings.</p>
    </div>

    <h3 class="subsection-title">4.6 Task Actions</h3>
    <p>Available actions for each task:</p>
    <ul>
        <li><strong>Edit</strong>: Modify task details</li>
        <li><strong>Reassign</strong>: Change the assigned team member</li>
        <li><strong>Set Reminder</strong>: Create a reminder notification</li>
        <li><strong>Delete</strong>: Remove the task (with confirmation)</li>
        <li><strong>Duplicate</strong>: Create a copy of the task</li>
    </ul>
</div>

<!-- SECTION 5: Team Expenses -->
<div class="section" id="expenses">
    <h2 class="section-title">5. Team Expenses</h2>
    
    <p>The Team Expenses section allows you to review, approve, or reject expense claims submitted by team members on your managed projects.</p>

    <h3 class="subsection-title">5.1 Viewing Submitted Expenses</h3>
    <p>Navigate to <strong>Team Expenses</strong> to see all expense claims. Each expense entry shows:</p>
    <ul>
        <li><strong>Employee Name</strong>: Who submitted the expense</li>
        <li><strong>Category</strong>: Type of expense (Travel, Meals, Equipment, etc.)</li>
        <li><strong>Amount</strong>: Expense amount in currency</li>
        <li><strong>Date</strong>: When the expense was incurred</li>
        <li><strong>Status</strong>: Pending, Approved, Rejected, or Paid</li>
        <li><strong>Receipt</strong>: Attached documentation</li>
    </ul>

    <h3 class="subsection-title">5.2 Expense Approval Workflow</h3>
    
    <h4 class="subsubsection-title">Approving an Expense</h4>
    <ol class="steps">
        <li>Review the expense details and attached receipt</li>
        <li>Verify the amount and category are appropriate</li>
        <li>Click the <strong>green checkmark (Approve)</strong> button</li>
        <li>The expense status changes to "Approved"</li>
    </ol>

    <h4 class="subsubsection-title">Rejecting an Expense</h4>
    <ol class="steps">
        <li>Click the <strong>red X (Reject)</strong> button</li>
        <li>A modal appears requesting a rejection reason</li>
        <li>Enter a clear explanation for why the expense is being rejected</li>
        <li>Click <strong>"Submit"</strong> to confirm</li>
        <li>The employee will see the rejection reason and can resubmit if needed</li>
    </ol>

    <div class="info-box important">
        <div class="info-box-title">⚠️ Important Guidelines</div>
        <p><strong>Always provide a clear and professional reason when rejecting expenses.</strong> This helps team members understand what information or documentation is missing and allows them to correct and resubmit properly.</p>
    </div>

    <h4 class="subsubsection-title">Marking as Paid</h4>
    <p>After an expense is approved and payment has been processed:</p>
    <ol class="steps">
        <li>Find the approved expense in the list</li>
        <li>Click <strong>"Mark as Paid"</strong></li>
        <li>Confirm the action</li>
        <li>The status updates to "Paid"</li>
    </ol>

    <h3 class="subsection-title">5.3 Viewing Receipt Attachments</h3>
    <p>To view expense receipts:</p>
    <ul>
        <li>Click on the <strong>receipt icon</strong> or <strong>"View Receipt"</strong> link</li>
        <li>A document preview modal opens displaying the attached file</li>
        <li>Supported formats: Images (JPG, PNG) and PDFs</li>
        <li>You can download the receipt if needed</li>
    </ul>

    <h3 class="subsection-title">5.4 Expense Filtering</h3>
    <p>Use filters to manage your expense review queue:</p>
    <ul>
        <li><strong>Status Filter</strong>: Pending, Approved, Rejected, Paid</li>
        <li><strong>Date Range</strong>: Filter by submission or expense date</li>
        <li><strong>Employee</strong>: View expenses from specific team members</li>
        <li><strong>Category</strong>: Filter by expense type</li>
        <li><strong>Amount Range</strong>: Filter by expense amount</li>
    </ul>

    <div class="info-box tip">
        <div class="info-box-title">💡 Best Practice</div>
        <p>Review expense claims promptly to avoid delays in team member reimbursements. Set aside time weekly to process pending expenses.</p>
    </div>
</div>

<!-- SECTION 6: Knowledge Management -->
<div class="section" id="knowledge">
    <h2 class="section-title">6. Knowledge Management</h2>
    
    <p>Access and manage project documentation, knowledge articles, and shared resources related to your managed projects.</p>

    <h3 class="subsection-title">6.1 Accessing Knowledge Articles</h3>
    <p>Navigate to <strong>Knowledge Management</strong> to view all documentation:</p>
    <ul>
        <li>Project-specific documentation</li>
        <li>Process guides and procedures</li>
        <li>Technical documentation</li>
        <li>Best practices and templates</li>
    </ul>

    <h3 class="subsection-title">6.2 Browsing Knowledge</h3>
    <p>Knowledge articles are organized by project. You can:</p>
    <ul>
        <li>Browse by project name</li>
        <li>Use the search function to find specific articles</li>
        <li>Filter by category or tags</li>
        <li>Sort by date created or last updated</li>
    </ul>

    <h3 class="subsection-title">6.3 Viewing Knowledge Details</h3>
    <p>Click on any knowledge article to view:</p>
    <ul>
        <li>Full article content with rich formatting</li>
        <li>Associated project</li>
        <li>Author and creation date</li>
        <li>Last updated timestamp</li>
        <li>Related documents and attachments</li>
        <li>Tags and categories</li>
    </ul>

    <h3 class="subsection-title">6.4 Creating Knowledge Articles</h3>
    <p>To add new documentation:</p>
    <ol class="steps">
        <li class="Click <strong>"+ Add Knowledge"</strong> button</li>
        <li>Select the associated project</li>
        <li>Enter article title and description</li>
        <li>Add content using the rich text editor</li>
        <li>Attach any relevant files or documents</li>
        <li>Add tags for easy discovery</li>
        <li>Click <strong>"Save"</strong> to publish</li>
    </ol>

    <h3 class="subsection-title">6.5 Editing Knowledge Articles</h3>
    <p>Update existing documentation:</p>
    <ul>
        <li>Open the knowledge article</li>
        <li>Click <strong>"Edit"</strong> button</li>
        <li>Make your changes</li>
        <li>Save to update (timestamp will reflect the update)</li>
    </ul>

    <div class="info-box">
        <div class="info-box-title">📌 Knowledge Organization</div>
        <p>Keep your project documentation up-to-date and well-organized. Use clear titles and appropriate tags to make information easy to find for your team.</p>
    </div>

    <h3 class="subsection-title">6.6 Project-Specific Documents</h3>
    <p>Each project can have its own document library organized by:</p>
    <ul>
        <li><strong>Folders</strong>: Organize documents into logical categories</li>
        <li><strong>Document Types</strong>: Requirements, specifications, reports, etc.</li>
        <li><strong>Version History</strong>: Track document revisions</li>
    </ul>
</div>

<!-- SECTION 7: Reports -->
<div class="section" id="reports">
    <h2 class="section-title">7. Reports</h2>
    
    <p>Generate comprehensive reports and analytics for your managed projects and teams.</p>

    <h3 class="subsection-title">7.1 Available Report Types</h3>
    
    <div class="feature-grid">
        <div class="feature-card">
            <div class="feature-card-title">📈 Project Reports</div>
            <p>Overall project status, progress, and timeline analysis</p>
        </div>
        <div class="feature-card">
            <div class="feature-card-title">👥 Team Performance</div>
            <p>Individual and team productivity metrics</p>
        </div>
        <div class="feature-card">
            <div class="feature-card-title">✅ Task Analytics</div>
            <p>Task completion rates, overdue analysis</p>
        </div>
        <div class="feature-card">
            <div class="feature-card-title">💰 Budget Reports</div>
            <p>Project budget vs. actual, expense summaries</p>
        </div>
    </div>

    <h3 class="subsection-title">7.2 Generating Reports</h3>
    <p>To create a report:</p>
    <ol class="steps">
        <li>Navigate to <strong>Reports</strong> section</li>
        <li>Click <strong>"Generate New Report"</strong></li>
        <li>Select report type</li>
        <li>Choose date range</li>
        <li>Select project(s) to include</li>
        <li>Configure additional filters if needed</li>
        <li>Click <strong>"Generate"</strong></li>
    </ol>

    <h3 class="subsection-title">7.3 Report Features</h3>
    <p>Generated reports include:</p>
    <ul>
        <li><strong>Summary Statistics</strong>: Key metrics and KPIs</li>
        <li><strong>Visual Charts</strong>: Graphs and progress indicators</li>
        <li><strong>Detailed Data Tables</strong>: Granular information</li>
        <li><strong>Trend Analysis</strong>: Performance over time</li>
        <li><strong>Insights</strong>: Automated observations and recommendations</li>
    </ul>

    <h3 class="subsection-title">7.4 Exporting Reports</h3>
    <p>Export options:</p>
    <ul>
        <li><strong>PDF</strong>: Professional formatted document</li>
        <li><strong>Excel</strong>: Data tables for further analysis</li>
        <li><strong>CSV</strong>: Raw data export</li>
    </ul>

    <div class="info-box tip">
        <div class="info-box-title">💡 Reporting Strategy</div>
        <p>Schedule regular weekly or monthly reports to track progress trends. Use these reports in stakeholder meetings and performance reviews.</p>
    </div>
</div>

<!-- SECTION 8: Calendar -->
<div class="section" id="calendar">
    <h2 class="section-title">8. Calendar</h2>
    
    <p>Visualize project timelines, task deadlines, and team events on an interactive calendar.</p>

    <h3 class="subsection-title">8.1 Calendar Views</h3>
    <p>Switch between different view modes:</p>
    <ul>
        <li><strong>Month View</strong>: See the entire month at a glance</li>
        <li><strong>Week View</strong>: Detailed weekly schedule</li>
        <li><strong>Day View</strong>: Hour-by-hour breakdown</li>
    </ul>

    <h3 class="subsection-title">8.2 Calendar Items</h3>
    <p>The calendar displays:</p>
    <ul>
        <li><strong>Task Due Dates</strong>: All tasks from your managed projects</li>
        <li><strong>Project Deadlines</strong>: Major project milestones</li>
        <li><strong>Team Events</strong>: Meetings and scheduled activities</li>
        <li><strong>Reminders</strong>: Your personal reminders</li>
    </ul>

    <h3 class="subsection-title">8.3 Navigating the Calendar</h3>
    <p>Calendar navigation features:</p>
    <ul>
        <li>Use arrow buttons to move between months/weeks/days</li>
        <li>Click "Today" to jump to the current date</li>
        <li>Click on any date to see all items for that day</li>
        <li>Click on individual items to view details</li>
    </ul>

    <h3 class="subsection-title">8.4 Filtering Calendar Events</h3>
    <p>Focus your calendar view by filtering:</p>
    <ul>
        <li><strong>By Project</strong>: Show events from specific projects</li>
        <li><strong>By Type</strong>: Tasks, deadlines, events, or reminders</li>
        <li><strong>By Priority</strong>: High priority items only</li>
    </ul>

    <div class="info-box">
        <div class="info-box-title">📅 Calendar Integration</div>
        <p>The calendar automatically updates with task due dates and project deadlines. No manual entry required!</p>
    </div>
</div>

<!-- SECTION 9: Quick Actions -->
<div class="section" id="quick-actions">
    <h2 class="section-title">9. Quick Actions: Notes & Reminders</h2>
    
    <p>Boost your productivity with Quick Actions accessible from the dashboard header.</p>

    <h3 class="subsection-title">9.1 Quick Notes</h3>
    <p>Create personal notes directly from the dashboard:</p>

    <h4 class="subsubsection-title">Creating a Note</h4>
    <ol class="steps">
        <li>Click the <strong>notebook icon</strong> in the dashboard header</li>
        <li>Select <strong>"Quick Notes"</strong> tab</li>
        <li>Type your note in the text field</li>
        <li>Press <strong>Enter</strong> or click <strong>"Save"</strong></li>
    </ol>

    <h4 class="subsubsection-title">Note Features</h4>
    <ul>
        <li><strong>Pin Notes</strong>: Click the pin icon to keep important notes at the top</li>
        <li><strong>Edit Notes</strong>: Click on a note to modify its content</li>
        <li><strong>Delete Notes</strong>: Click the delete icon to remove</li>
        <li><strong>Auto-Save</strong>: Notes are saved to your account automatically</li>
    </ul>

    <h3 class="subsection-title">9.2 Quick Reminders</h3>
    <p>Set time-based reminders for important tasks and deadlines:</p>

    <h4 class="subsubsection-title">Creating a Reminder</h4>
    <ol class="steps">
        <li>Click the <strong>notebook icon</strong> in the dashboard header</li>
        <li>Select <strong>"Reminders"</strong> tab</li>
        <li>Click <strong>"+ Add Reminder"</strong></li>
        <li>Fill in the reminder details:
            <ul>
                <li><strong>Title</strong>: Brief description of what to remember</li>
                <li><strong>Date</strong>: When you want to be reminded</li>
                <li><strong>Time</strong>: Specific time for the reminder</li>
                <li><strong>Description</strong> (optional): Additional details</li>
            </ul>
        </li>
        <li>Click <strong>"Save Reminder"</strong></li>
    </ol>

    <h4 class="subsubsection-title">Reminder Notifications</h4>
    <p>When a reminder becomes due:</p>
    <ul>
        <li>A toast notification appears on your screen</li>
        <li>The reminder shows in your notification bell</li>
        <li>Click <strong>X</strong> to dismiss the reminder</li>
    </ul>

    <div class="info-box">
        <div class="info-box-title">⏰ Reminder Timing</div>
        <p>Reminders are checked every 10 seconds, so your notifications appear promptly at the scheduled time.</p>
    </div>

    <h3 class="subsection-title">9.3 Managing Reminders</h3>
    <p>View and manage all your active reminders:</p>
    <ul>
        <li><strong>Upcoming</strong>: Reminders scheduled for the future</li>
        <li><strong>Edit</strong>: Modify reminder details</li>
        <li><strong>Delete</strong>: Remove reminders you no longer need</li>
    </ul>

    <div class="info-box tip">
        <div class="info-box-title">💡 Use Cases for Reminders</div>
        <p>
            • Follow up with team member after 2 days<br>
            • Review project status before weekly meeting<br>
            • Check expense approvals every Friday<br>
            • Prepare monthly report on the last day of month
        </p>
    </div>
</div>

<!-- SECTION 10: Notifications -->
<div class="section" id="notifications">
    <h2 class="section-title">10. Notifications System</h2>
    
    <p>Stay informed about critical events with the real-time notification system.</p>

    <h3 class="subsection-title">10.1 Notification Types</h3>
    <p>The Manager Portal provides four types of notifications:</p>

    <table>
        <thead>
            <tr>
                <th>Type</th>
                <th>Color</th>
                <th>Description</th>
                <th>When it Appears</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td><strong>Overdue Tasks</strong></td>
                <td style="color: #ef4444;">🔴 Red</td>
                <td>Tasks past their due date</td>
                <td>Tasks not completed after due date</td>
            </tr>
            <tr>
                <td><strong>Project Deadlines</strong></td>
                <td style="color: #f59e0b;">🟠 Orange</td>
                <td>Projects approaching deadline</td>
                <td>Projects ending within 7 days</td>
            </tr>
            <tr>
                <td><strong>New Tasks</strong></td>
                <td style="color: #3b82f6;">🔵 Blue</td>
                <td>Recently created tasks</td>
                <td>Tasks created in last 24 hours</td>
            </tr>
            <tr>
                <td><strong>Reminders</strong></td>
                <td style="color: #a855f7;">🟣 Purple</td>
                <td>Your personal reminders</td>
                <td>At the scheduled reminder time</td>
            </tr>
        </tbody>
    </table>

    <h3 class="subsection-title">10.2 Accessing Notifications</h3>
    <ol class="steps">
        <li>Click the <strong>bell icon</strong> in the dashboard header</li>
        <li>A dropdown panel opens showing all active notifications</li>
        <li>Notifications are sorted by priority (Overdue → Reminders → Projects → Tasks)</li>
    </ol>

    <h3 class="subsection-title">10.3 Notification Actions</h3>
    <p>What you can do with notifications:</p>
    <ul>
        <li><strong>Click Notification</strong>: Navigate to the relevant section (Tasks, Projects)</li>
        <li><strong>Dismiss Individual</strong>: Click the <strong>X</strong> to remove a single notification</li>
        <li><strong>Clear All</strong>: Click <strong>"Clear All"</strong> to dismiss all notifications at once</li>
    </ul>

    <h3 class="subsection-title">10.4 Real-Time Updates</h3>
    <p>Notifications update automatically when:</p>
    <ul>
        <li>New tasks are created in your projects</li>
        <li>Tasks become overdue</li>
        <li>Project deadlines approach</li>
        <li>Your reminders become due</li>
    </ul>

    <div class="info-box important">
        <div class="info-box-title">🔔 Notification Badge</div>
        <p>The notification bell displays a badge with the count of unread notifications. This count updates in real-time.</p>
    </div>

    <h3 class="subsection-title">10.5 Notification Best Practices</h3>
    <ul>
        <li>Check notifications at the start of each day</li>
        <li>Address overdue task notifications promptly</li>
        <li>Clear processed notifications to keep your notification center organized</li>
        <li>Use the notification navigation to quickly jump to problem areas</li>
    </ul>
</div>

<!-- SECTION 11: Settings -->
<div class="section" id="settings">
    <h2 class="section-title">11. Settings and Profile</h2>
    
    <p>Customize your Manager Portal experience and manage your profile information.</p>

    <h3 class="subsection-title">11.1 Profile Management</h3>
    <p>Navigate to <strong>Settings → Profile</strong> to update:</p>
    <ul>
        <li><strong>Name</strong>: Your display name</li>
        <li><strong>Email</strong>: Contact email address</li>
        <li><strong>Phone Number</strong>: Contact phone</li>
        <li><strong>Profile Picture</strong>: Upload a professional photo</li>
        <li><strong>Department</strong>: Your organizational department</li>
    </ul>

    <h3 class="subsection-title">11.2 Password Management</h3>
    <p>Update your password for security:</p>
    <ol class="steps">
        <li>Go to <strong>Settings → Profile</strong></li>
        <li>Click <strong>"Change Password"</strong></li>
        <li>Enter your current password</li>
        <li>Enter and confirm your new password</li>
        <li>Click <strong>"Update Password"</strong></li>
    </ol>

    <div class="info-box warning">
        <div class="info-box-title">🔒 Password Requirements</div>
        <p>
            • Minimum 8 characters<br>
            • Mix of letters, numbers, and special characters<br>
            • Different from previous passwords
        </p>
    </div>

    <h3 class="subsection-title">11.3 Theme Customization</h3>
    <p>Personalize your interface appearance at <strong>Settings → Theme</strong>:</p>

    <h4 class="subsubsection-title">Accent Colors</h4>
    <p>Choose your preferred accent color:</p>
    <ul>
        <li>Indigo (Default)</li>
        <li>Blue</li>
        <li>Purple</li>
        <li>Pink</li>
        <li>Teal</li>
        <li>Green (Mint)</li>
        <li>Orange</li>
        <li>Bronze</li>
    </ul>

    <h4 class="subsubsection-title">Dark Mode</h4>
    <p>Toggle between light and dark mode for comfortable viewing in different lighting conditions.</p>

    <h3 class="subsection-title">11.4 Notification Preferences</h3>
    <p>Configure which notifications you want to receive (if available in future versions).</p>
</div>

<!-- SECTION 12: Best Practices -->
<div class="section" id="best-practices">
    <h2 class="section-title">12. Best Practices for Managers</h2>
    
    <p>Maximize your effectiveness with these proven strategies and best practices.</p>

    <h3 class="subsection-title">12.1 Daily Routine</h3>
    <p>Establish a productive daily workflow:</p>
    <ol class="steps">
        <li><strong>Morning Check</strong>: Review dashboard statistics and notifications</li>
        <li><strong>Upcoming Deadlines</strong>: Review tasks due in next 7 days</li>
        <li><strong>Team Check-in</strong>: Review task progress and blockers</li>
        <li><strong>Expense Review</strong>: Process pending expense approvals</li>
        <li><strong>End of Day</strong>: Add notes and set reminders for tomorrow</li>
    </ol>

    <h3 class="subsection-title">12.2 Project Tracking Tips</h3>
    <ul>
        <li><strong>Weekly Reviews</strong>: Review project progress every week</li>
        <li><strong>Proactive Communication</strong>: Reach out to team members with approaching deadlines</li>
        <li><strong>Risk Monitoring</strong>: Watch for increasing overdue task counts</li>
        <li><strong>Resource Balancing</strong>: Monitor team member workloads</li>
    </ul>

    <h3 class="subsection-title">12.3 Task Management Strategy</h3>
    <div class="info-box tip">
        <div class="info-box-title">🎯 Effective Task Management</div>
        <p>
            <strong>Prioritize Ruthlessly:</strong> Use the High priority tag for truly urgent tasks only.<br><br>
            <strong>Clear Descriptions:</strong> Write detailed task descriptions to avoid confusion.<br><br>
            <strong>Realistic Deadlines:</strong> Set achievable due dates with buffer time.<br><br>
            <strong>Regular Updates:</strong> Keep task status current to reflect actual progress.
        </p>
    </div>

    <h3 class="subsection-title">12.4 Expense Management Guidelines</h3>
    <ul>
        <li><strong>Timely Processing</strong>: Review expenses within 2-3 business days</li>
        <li><strong>Clear Reasons</strong>: Always provide detailed rejection reasons</li>
        <li><strong>Policy Consistency</strong>: Apply expense policies uniformly across team</li>
        <li><strong>Receipt Verification</strong>: Always check attached receipts before approval</li>
    </ul>

    <h3 class="subsection-title">12.5 Communication Best Practices</h3>
    <table>
        <thead>
            <tr>
                <th>Situation</th>
                <th>Best Practice</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>Overdue Tasks</td>
                <td>Reach out proactively to understand blockers</td>
            </tr>
            <tr>
                <td>Project Delays</td>
                <td>Communicate early with stakeholders</td>
            </tr>
            <tr>
                <td>Resource Conflicts</td>
                <td>Address immediately with team members involved</td>
            </tr>
            <tr>
                <td>Milestone Achievement</td>
                <td>Recognize and celebrate team success</td>
            </tr>
        </tbody>
    </table>

    <h3 class="subsection-title">12.6 Reporting Strategy</h3>
    <p>Build a consistent reporting rhythm:</p>
    <ul>
        <li><strong>Weekly</strong>: Quick status updates for active projects</li>
        <li><strong>Monthly</strong>: Comprehensive project health reports</li>
        <li><strong>Quarterly</strong>: Strategic reviews and performance analytics</li>
        <li><strong>Ad-hoc</strong>: Immediate reports for critical issues or milestones</li>
    </ul>

    <h3 class="subsection-title">12.7 Dashboard Optimization</h3>
    <p>Make the most of your dashboard:</p>
    <ul>
        <li>Customize sidebar navigation order for your workflow</li>
        <li>Use Quick Notes for meeting agendas and action items</li>
        <li>Set reminders for recurring management tasks</li>
        <li>Monitor notification patterns to identify systemic issues</li>
    </ul>

    <div class="info-box">
        <div class="info-box-title">🌟 Success Metric</div>
        <p>Track your "Overdue Tasks" metric consistently. A decreasing trend indicates effective project management and team support.</p>
    </div>

    <h3 class="subsection-title">12.8 Knowledge Management</h3>
    <p>Build a strong knowledge base:</p>
    <ul>
        <li>Document recurring processes and procedures</li>
        <li>Create templates for common tasks and documents</li>
        <li>Encourage team members to contribute to knowledge base</li>
        <li>Keep documentation current - review quarterly</li>
        <li>Use clear naming conventions and tags</li>
    </ul>
</div>

<!-- Conclusion -->
<div class="section">
    <h2 class="section-title" style="text-align: center; border: none; padding: 0;">Thank You!</h2>
    <p style="text-align: center; font-size: 1.1em; margin: 30px 0;">
        This manual is designed to help you maximize your productivity and effectiveness as a project manager in the COSMOS ERP system. For additional support or questions, please contact your system administrator.
    </p>
    <p style="text-align: center; color: var(--text-gray); margin-top: 40px;">
        <strong>COSMOS ERP Manager Panel</strong><br>
        Version 1.0 | 2026<br>
        © All Rights Reserved
    </p>
</div>

</div><!-- End Container -->

</body>
</html>
'''

try:
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        f.write(html_content)
    print(f"✅ Manager User Manual created successfully!")
    print(f"📄 Location: {OUTPUT_FILE}")
    print(f"📌 Open the file in your browser to view")
    print(f"🖨️  Use browser's Print function (Ctrl+P) to save as PDF")
except Exception as e:
    print(f"❌ Error creating manual: {e}")

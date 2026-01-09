---
description: Triology Business Lab Coding Comment SOP - Standards for writing code comments
---

# Triology Business Lab – Coding Comment SOP

## 1. Purpose
This SOP defines the standard for writing code comments so that any new developer can understand, maintain, and safely extend the system without relying on verbal explanations. The objective is **continuity, clarity, and long-term ownership** of the codebase.

## 2. Core Principle
> Code must be self-explanatory, readable, and supported by meaningful comments.
> Code is written not only for execution, but for future developers, reviewers, and auditors.

---

## 3. Mandatory Commenting Areas

### 3.1 File-Level Comments
Every file must begin with a short header explaining:
- **Purpose** of the file
- **Key responsibility**
- **Dependencies** (if any)
- Last modified date (optional)

**Example:**
```javascript
/**
 * Login Page Component
 * 
 * Purpose: Authenticates users and redirects them to their role-specific dashboard.
 * 
 * Responsibilities:
 * - Validates user credentials against Firebase Auth
 * - Determines user role from Firestore (users/clients collections)
 * - Handles force password change flow for new users
 * 
 * Dependencies:
 * - Firebase Auth (signInWithEmailAndPassword)
 * - Firestore (users, clients collections)
 * - AuthContext (for session state)
 */
```

### 3.2 Function / Method-Level Comments
Comments are **mandatory** for functions that:
- Contain business logic
- Handle role-based access
- Perform validations, approvals, escalations, or calculations
- Interact with multiple services or modules

Each such function must explain:
- **What** the function does
- **Inputs and outputs**
- Any **side effects** or important assumptions

**Example:**
```javascript
/**
 * Handles user login and role-based dashboard redirect.
 * 
 * @param {Event} e - Form submission event
 * 
 * Business Logic:
 * 1. Authenticates user via Firebase Auth
 * 2. Fetches user role from 'users' collection first, then 'clients'
 * 3. Redirects to role-specific dashboard
 * 
 * Side Effects:
 * - May create new document in 'users' collection for Super Admin recovery
 * 
 * @throws Displays toast error on authentication failure
 */
```

### 3.3 Business Logic & Decision Rules
All business rules must be **explicitly commented**.
This includes logic related to:
- User roles and permissions
- Deadlines and exceptions
- Approval flows
- Financial or compliance-related conditions

> **The comment must explain WHY the rule exists, not just what the code is doing.**

**Example:**
```javascript
// SECURITY RULE: Default to 'member' role (lowest privilege) for users not found in Firestore.
// Reason: Prevents unauthorized privilege escalation if a user exists in Firebase Auth
// but their Firestore record was deleted or never created.
// Business Decision: Safer to deny access than grant admin.
role: "member",
```

### 3.4 Complex or Non-Obvious Code
If the logic is complex, optimized, or not immediately intuitive, it must be explained.

> **Guideline: If the developer had to pause and think while writing the logic, it requires a comment.**

**Example:**
```javascript
// CREATE SECONDARY FIREBASE APP FOR USER CREATION
// Problem: Creating a user with Firebase Auth auto-signs in as that user,
// which would log out the current admin.
// Solution: Use a secondary Firebase app instance to create users,
// then immediately sign out of that instance.
const secondaryAuth = getAuthMod(secondaryApp);
```

---

## 4. What Should NOT Be Commented
- ❌ Obvious or self-explanatory code
- ❌ Simple variable increments or assignments
- ❌ Code that repeats the same meaning as the statement
- ❌ Commented-out or dead code

> Comments should add clarity, not noise.

---

## 5. Comment Quality Standards
All comments must be:
- ✅ Written in **clear, simple English**
- ✅ **Short and precise**
- ✅ Focused on **intent and reasoning**
- ✅ Free of unnecessary abbreviations

---

## 6. Code Review & Enforcement
Code comments are part of the **mandatory review checklist**.

A pull request will **NOT be approved** if:
- [ ] Business logic is not explained
- [ ] Role-based decisions are unclear
- [ ] Complex flows lack documentation

Reviewers must assess whether a **new developer can understand the code without additional explanation**.

---

## 7. Ownership & Responsibility
Every developer is responsible for the **readability and maintainability** of their code.
At Triology Business Lab, code ownership includes responsibility for future continuity.

---

## 8. Guiding Statement
> *"At Triology Business Lab, we believe that well-documented code reflects disciplined thinking, professional ownership, and respect for future teams."*

---

## Quick Reference Checklist

### Before Submitting PR:
- [ ] Every file has a header comment (purpose, responsibility, dependencies)
- [ ] All business logic functions have JSDoc comments
- [ ] Role-based decisions are documented with WHY
- [ ] Complex/non-obvious code is explained
- [ ] No commented-out code remains
- [ ] No incomplete TODOs without tracking

### JSDoc Template for Functions:
```javascript
/**
 * [Brief description of what this function does]
 * 
 * @param {Type} paramName - Description
 * @returns {Type} Description
 * 
 * Business Logic:
 * - [Rule 1]
 * - [Rule 2]
 * 
 * Side Effects:
 * - [Any mutations, API calls, logging]
 * 
 * @throws {ErrorType} When [condition]
 */
```

### File Header Template:
```javascript
/**
 * [File Name / Component Name]
 * 
 * Purpose: [One-line description]
 * 
 * Responsibilities:
 * - [Responsibility 1]
 * - [Responsibility 2]
 * 
 * Dependencies:
 * - [External lib/module]
 * - [Internal module]
 * 
 * Last Modified: [Date] (optional)
 */
```

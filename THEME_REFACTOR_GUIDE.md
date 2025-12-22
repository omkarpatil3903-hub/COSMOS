# Theme Styles Refactoring Guide

## Overview
We've created a centralized `useThemeStyles` hook to eliminate code duplication across components.

**Location:** `src/hooks/useThemeStyles.js`

## Usage

### Before (Duplicated Code):
```javascript
import { useTheme } from "../context/ThemeContext";

function MyComponent() {
  const { accent } = useTheme();

  const getButtonClass = () => {
    if (accent === 'black') return 'bg-blue-600 hover:bg-blue-700 text-white';
    // ... 50+ more lines
  };

 const getIconColor = () => {
    // ... another 20+ lines
  };

  const buttonClass = getButtonClass();
  const iconColor = getIconColor();
  
  // ... rest of component
}
```

### After (Centralized Hook):
```javascript
import { useThemeStyles } from "../hooks/useThemeStyles";

function MyComponent() {
  const { buttonClass, iconColor, headerIconClass } = useThemeStyles();
  
  // ... rest of component - use the classes directly!
}
```

## Available Classes from useThemeStyles

The hook returns an object with these properties:

- `buttonClass` - For submit buttons and primary action buttons
- `iconColor` - For section header icons
- `headerIconClass` - For modal/page header icons with backgrounds
- `badgeClass` - For badge/pill elements
- `gradientClass` - For avatar/placeholder gradients
- `hoverBorderClass` - For hover effects on cards
- `linkColor` - For text links
- `emailLinkClass` - For email links (includes dark mode)

## Components to Update

### ✅ Already Updated:
- `src/pages/SuperAdmin/ManageResources.jsx`
- `src/components/AddResourceModal.jsx`

### 🔄 Need to Update:

1. **EditResourceModal.jsx**
   ```javascript
   // Replace lines with theme functions with:
   const { buttonClass, iconColor, headerIconClass } = useThemeStyles();
   ```

2. **ViewResourceModal.jsx**
   ```javascript
   const { headerIconClass, badgeClass, gradientClass, hoverBorderClass, emailLinkClass } = useThemeStyles();
   ```

3. **ManageClients.jsx**
   ```javascript
   const { buttonClass } = useThemeStyles();
   ```

4. **ClientFormModal.jsx**
   ```javascript
   const { buttonClass, iconColor, headerIconClass, linkColor } = useThemeStyles();
   ```

5. **ClientViewModal.jsx**
   ```javascript
   const { headerIconClass, gradientClass, emailLinkClass } = useThemeStyles();
   ```

## Step-by-Step Migration

For each component:

1. **Change the import:**
   ```javascript
   // Remove this:
   import { useTheme } from "../context/ThemeContext";
   
   // Add this:
   import { useThemeStyles } from "../hooks/useThemeStyles";
   ```

2. **Replace theme logic:**
   ```javascript
   // Remove these:
   const { accent } = useTheme();
   const getButtonClass = () => { ... };
   const getIconColor = () => { ... };
   const buttonClass = getButtonClass();
   const iconColor = getIconColor();
   
   // Add this single line:
   const { buttonClass, iconColor, headerIconClass } = useThemeStyles();
   ```

3. **Keep everything else the same** - The class names are used exactly as before!

## Benefits

✅ **Reduced code**: Removes 50-80 lines of duplicated code per component  
✅ **Single source of truth**: All theme logic in one place  
✅ **Easier maintenance**: Update theme colors in one file  
✅ **Consistent styling**: All components use exact same theme classes  
✅ **Better performance**: Functions are defined once, not per component instance  

## Example: Full EditResourceModal Refactor

**Before (Lines 1-90):**
```javascript
import React, { useState, useEffect } from "react";
import { useTheme } from "../context/ThemeContext";
// ... other imports

function EditResourceModal({ ... }) {
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [roleOptions, setRoleOptions] = useState([]);
  const { accent } = useTheme();

  const getButtonClass = () => {
    if (accent === 'black') return 'bg-blue-600 hover:bg-blue-700 text-white';
    switch (accent) {
      case 'purple': return 'bg-purple-600 hover:bg-purple-700 text-white';
      // ... 10 more cases
    }
  };

  const getIconColor = () => {
    if (accent === 'black') return 'text-blue-500';
    switch (accent) {
      // ... 10 more cases
    }
  };

  const getHeaderIconClass = () => {
    if (accent === 'black') return 'bg-blue-100 text-blue-600...';
    switch (accent) {
      // ... 10 more cases
    }
  };

  const buttonClass = getButtonClass();
  const iconColor = getIconColor();
  const headerIconClass = getHeaderIconClass();
  
  // ... rest of component
}
```

**After (Lines 1-40):**
```javascript
import React, { useState, useEffect } from "react";
import { useThemeStyles } from "../hooks/useThemeStyles";
// ... other imports

function EditResourceModal({ ... }) {
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [roleOptions, setRoleOptions] = useState([]);
  
  const { buttonClass, iconColor, headerIconClass } = useThemeStyles();
  
  // ... rest of component (unchanged)
}
```

**Result:** Removed ~50 lines of boilerplate code! 🎉

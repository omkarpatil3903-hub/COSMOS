# Admin Settings Dark Mode Update

This document outlines the changes needed to update Admin settings pages to match SuperAdmin styling.

## Key Changes Required:

### 1. Cards - Add dark background
```
className="[.dark_&]:bg-[#181B2A] [.dark_&]:border-white/10"
```

### 2. Input Fields - Dark mode
```
className="[.dark_&]:bg-[#1F2234] [.dark_&]:border-white/10 [.dark_&]:text-white [.dark_&]:placeholder-gray-500"
```

### 3. Table - Dark backgrounds and zebra striping
**Table:**
```
className="bg-white [.dark_&]:bg-[#181B2A] [.dark_&]:divide-white/5"
```

**THead:**
```
className="bg-gradient-to-r from-gray-50 to-gray-100 [.dark_&]:from-[#1F2234] [.dark_&]:to-[#1F2234]"
```

**TH:**
```
className="[.dark_&]:text-gray-400 [.dark_&]:border-white/10"
```

**TR (Zebra Pattern):**
```
className="odd:bg-white even:bg-gray-50 [.dark_&]:odd:bg-[#181B2A] [.dark_&]:even:bg-[#1F2234]"
```

**TD Sticky (Actions column):**
```
className="group-odd:bg-white group-even:bg-gray-50 [.dark_&]:group-odd:bg-[#181B2A] [.dark_&]:group-even:bg-[#1F2234]"
```

### 4. Text Colors
- Primary text: `[.dark_&]:text-white`
- Secondary text: `[.dark_&]:text-gray-400`
- Tertiary text: `[.dark_&]:text-gray-500`

### 5. Modals
```
className="bg-white [.dark_&]:bg-[#181B2A] [.dark_&]:border [.dark_&]:border-white/10"
```

### 6. Buttons
- Use `useThemeStyles` hook for buttonClass
- Add dark hover states: `[.dark_&]:hover:bg-yellow-400/20`

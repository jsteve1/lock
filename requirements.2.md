# Requirements for New Feature Additions

This document contains prompt-engineered instructions for the o3-mini LLM (via Cursor IDE's composer agent) to generate concise source code diffs. The diffs must add new features to the project without modifying existing functionality.

---

## Feature 1: System Option for Dark Mode/Light Mode

**Context:**
- Add a new computer icon (using react-bootstrap-icons, the 'bi-pc-display' SVG) to the Header component (Header.tsx).
- The icon toggles a new "system theme" flag. When clicked, it should use `window.matchMedia` to detect the OS dark mode preference and update the theme store accordingly.
- The icon must follow the current theme's color scheme.

**Prompt for o3-mini:**
```
Extend the Header component by adding a new button containing the computer icon (bi-pc-display) from react-bootstrap-icons. When the icon is clicked, it toggles a system theme flag that uses window.matchMedia to detect the OS dark/light mode preference and updates the theme store appropriately. Ensure that this addition integrates with the existing theme logic without modifying current functionality.
```

---

## Feature 2: Permanent Menu with Icons for Notes, Archive, and Trash

**Context:**
- Create a permanent navigation menu that displays buttons for 'Notes', 'Archive', and 'Trash' using react-bootstrap-icons (choose icons such as a star, lock, cloud, archive box, and trash can).
- The menu should be always visible for authenticated users on desktop, but should collapse into a hamburger menu on mobile devices.
- The design should mimic Google Keep's style.

**Prompt for o3-mini:**
```
Add a permanent navigation menu component that becomes visible as soon as the user is logged in. The menu should include icons for 'Notes', 'Archive', and 'Trash' (using react-bootstrap-icons) with clear labels or tooltips. For mobile devices, implement a responsive collapse into a hamburger menu. The additions should be modular and not alter existing routing logic.
```

---

## Feature 3: Checkboxes and List Items in Note Editor

**Context:**
- Enhance the Note Editor to support task lists with nested list items up to three indentation levels.
- Add a new bullet-point button near the textarea in the NoteEditor component. When clicked, it should insert a bullet marker (such as '-' or a bullet "•") at the beginning of the current line or a new line.
- Allow users to use the Tab key to manage indentation levels.

**Prompt for o3-mini:**
```
Update the NoteEditor component by adding a new bullet-point button adjacent to the text area. This button should, when activated, insert a bullet point marker for task lists, and support nested list items (up to three levels) using Tab for indentation. Implement this feature as an addition, ensuring that it integrates seamlessly with the current note editing workflow.
```

---

## Feature 4: Freehand Drawing Modal

**Context:**
- Implement a new full-screen modal that allows the user to perform freehand drawing.
- The modal should include a canvas element with a basic pen tool for drawing.
- Once the drawing is complete, capture the content as a blob and attach it to the note (simulate an image upload to the server).

**Prompt for o3-mini:**
```
Create a new full-screen modal component dedicated to freehand drawing. This modal must contain a canvas with a simple pen tool for drawing. Upon completion, convert the drawing on the canvas to a blob and attach it as an image to the corresponding note. Maintain modularity by treating this as an additional feature without modifying existing note functionalities.
```

---

## Feature 5: Note Color Change Feature

**Context:**
- In the note editing interface, integrate a palette icon (using a palette icon from react-bootstrap-icons) that, when clicked, shows a dropdown menu with a grid of 10 subtle color swatches (covering a range from rainbow tones through tans to browns).
- Clicking a color changes the note's background color, and the text color should update automatically for readability.
- This color selection feature is hidden when the application is in night mode. In night mode, user-defined colors are disregarded and the night theme is enforced.

**Prompt for o3-mini:**
```
Enhance the note editing view by adding a new palette icon button that opens a dropdown menu with a grid of 10 predefined color swatches. When a color is selected, update the note's background and adjust the text color for accessibility. Additionally, ensure that if night mode is active, the palette button is hidden and all note colors default to the night mode scheme. The implementation should be added as a new feature without altering existing editing functionalities.
```

---

## General Guidelines for All Prompts

- All source code additions must be concise and modular.
- Use the existing file and component structure (e.g., Header.tsx, NoteEditor.tsx) and adhere to current naming conventions and styling.
- The diffs generated should add new functionality without altering the current code base.
- Focus on integration by extending components using additional buttons, modals, and dropdowns, rather than modifying existing logic.
- Ensure mobile responsiveness where specified.

# End of Requirements

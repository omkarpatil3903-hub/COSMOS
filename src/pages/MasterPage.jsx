// src/pages/MasterPage.jsx
import React from "react";
import PageHeader from "../components/PageHeader";
import MasterCategory from "../components/MasterCategory";
import Accordion from "../components/Accordion"; // Import the new Accordion component

// --- Placeholder Data (no change here) ---
const subCasteData = [
  { id: 1, nameMarathi: "मराठा", nameEnglish: "Maratha" },
  { id: 2, nameMarathi: "ब्राह्मण", nameEnglish: "Brahmin" },
];
const professionData = [
  { id: 1, nameMarathi: "शेतकरी", nameEnglish: "Farmer" },
  { id: 2, nameMarathi: "डॉक्टर", nameEnglish: "Doctor" },
];
const designationData = [
  { id: 1, nameMarathi: "सरपंच", nameEnglish: "Sarpanch" },
  { id: 2, nameMarathi: "अध्यक्ष", nameEnglish: "President" },
];
const otherData = [
  { id: 1, nameMarathi: "उदाहरण १", nameEnglish: "Example 1" },
  { id: 2, nameMarathi: "उदाहरण २", nameEnglish: "Example 2" },
];
// --- End Placeholder Data ---

function MasterPage() {
  // Create an array of items to pass to the Accordion component.
  // Each item has a title and its content is our MasterCategory component.
  const accordionItems = [
    {
      title: "Sub Caste",
      content: <MasterCategory title="Sub Caste" initialData={subCasteData} />,
    },
    {
      title: "Profession",
      content: (
        <MasterCategory title="Profession" initialData={professionData} />
      ),
    },
    {
      title: "Designation",
      content: (
        <MasterCategory title="Designation" initialData={designationData} />
      ),
    },
    {
      title: "Other",
      content: <MasterCategory title="Other" initialData={otherData} />,
    },
  ];

  return (
    <div>
      <PageHeader title="Master Data Management">
        Add, edit, or delete master entries for various categories.
      </PageHeader>

      <Accordion items={accordionItems} />
    </div>
  );
}

export default MasterPage;

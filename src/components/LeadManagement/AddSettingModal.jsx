/**
 * AddSettingModal Component
 *
 * Purpose: Modal for adding new dynamic settings for lead management.
 * Handles status, priority, source, sector, product category, and product.
 *
 * Responsibilities:
 * - Display modal with type-specific title and label
 * - Input validation (alphabets and spaces only)
 * - Submit on Enter key press
 * - Theme-aware styling with customizable button class
 *
 * Dependencies:
 * - react-icons (FaPlus for add button)
 * - HiXMark (close icon)
 *
 * Props:
 * - isOpen: Modal visibility state
 * - onClose: Close handler
 * - settingType: 'status' | 'priority' | 'source' | 'sector' | 'productCategory' | 'product'
 * - setSettingType: Not used directly (controlled by parent)
 * - newSettingValue: Current input value
 * - setNewSettingValue: Update input value
 * - onAdd: Submit handler
 * - buttonClass: Theme button class
 * - iconColor: Theme icon color class
 *
 * Setting Types & Labels:
 * - status → "Status Name"
 * - priority → "Priority Level"
 * - source → "Source Name"
 * - sector → "Sector Name"
 * - productCategory → "Category Name"
 * - product → "Product Name"
 * - default → "Type Name" (for followup types)
 *
 * Last Modified: 2026-01-10
 */

import React from 'react';
import { FaPlus } from 'react-icons/fa';
import { HiXMark } from 'react-icons/hi2';

const AddSettingModal = ({
    isOpen,
    onClose,
    settingType,
    setSettingType,
    newSettingValue,
    setNewSettingValue,
    onAdd,
    buttonClass = "bg-blue-600 hover:bg-blue-700 text-white",
    iconColor = "text-blue-600"
}) => {
    if (!isOpen) return null;

    const getTitle = () => {
        switch (settingType) {
            case "status": return "Status";
            case "priority": return "Priority";
            case "source": return "Source";
            case "sector": return "Sector";
            case "productCategory": return "Product Category";
            case "product": return "Product";
            default: return "Follow-up Type";
        }
    };

    const getLabel = () => {
        switch (settingType) {
            case "status": return "Status Name";
            case "priority": return "Priority Level";
            case "source": return "Source Name";
            case "sector": return "Sector Name";
            case "productCategory": return "Category Name";
            case "product": return "Product Name";
            default: return "Type Name";
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div
                className="bg-white [.dark_&]:bg-[#181B2A] rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 [.dark_&]:border-white/10">
                    <h2 className="text-lg font-bold text-gray-900 [.dark_&]:text-white flex items-center gap-2">
                        <FaPlus className={iconColor} />
                        Add New {getTitle()}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 [.dark_&]:hover:bg-white/10 rounded-full"
                    >
                        <HiXMark className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    <label className="block text-sm font-medium text-gray-700 [.dark_&]:text-gray-300 mb-2">
                        {getLabel()}
                    </label>
                    <input
                        type="text"
                        value={newSettingValue}
                        onChange={(e) => {
                            const val = e.target.value;
                            // Allow only alphabets and spaces
                            if (/[^a-zA-Z\s]/.test(val)) return;
                            setNewSettingValue(val);
                        }}
                        placeholder={`Enter ${settingType}...`}
                        className="w-full rounded-lg border border-gray-200 [.dark_&]:border-white/10 bg-white [.dark_&]:bg-[#181B2A] py-3 px-4 text-sm text-gray-900 [.dark_&]:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        onKeyPress={(e) => {
                            if (e.key === "Enter") {
                                onAdd();
                            }
                        }}
                        autoFocus
                    />
                </div>

                {/* Footer */}
                <div className="flex gap-3 px-6 py-4 border-t border-gray-100 [.dark_&]:border-white/10">
                    <button
                        onClick={onAdd}
                        className={`flex-1 ${buttonClass} px-4 py-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors`}
                    >
                        <FaPlus />
                        Add
                    </button>
                    <button
                        onClick={onClose}
                        className="flex-1 bg-gray-200 hover:bg-gray-300 [.dark_&]:bg-gray-700 [.dark_&]:hover:bg-gray-600 text-gray-700 [.dark_&]:text-gray-200 px-4 py-3 rounded-lg text-sm font-medium transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddSettingModal;

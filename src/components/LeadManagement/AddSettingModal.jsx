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
import {
    FaPlus,
    FaFlag,
    FaExclamationTriangle,
    FaBullhorn,
    FaIndustry,
    FaBoxOpen,
    FaTag,
    FaPhoneAlt
} from 'react-icons/fa';
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

    const getIcon = () => {
        switch (settingType) {
            case "status": return <FaFlag className="text-lg" />;
            case "priority": return <FaExclamationTriangle className="text-lg" />;
            case "source": return <FaBullhorn className="text-lg" />;
            case "sector": return <FaIndustry className="text-lg" />;
            case "productCategory": return <FaBoxOpen className="text-lg" />;
            case "product": return <FaTag className="text-lg" />;
            default: return <FaPhoneAlt className="text-lg" />;
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div
                className="bg-white [.dark_&]:bg-[#181B2A] rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header - Centered & Professional */}
                <div className="flex items-center justify-between px-6 pt-6 pb-2">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
                            {getIcon()}
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 [.dark_&]:text-white">
                            Add New {getTitle()}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 [.dark_&]:hover:bg-white/10 p-2 rounded-full transition-all"
                    >
                        <HiXMark className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="px-6 py-4">
                    <label className="block text-sm font-semibold text-gray-700 [.dark_&]:text-gray-300 mb-2">
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
                        placeholder={`Enter ${settingType.toLowerCase()}...`}
                        className={`w-full rounded-xl border-2 border-blue-500/50 bg-white [.dark_&]:bg-[#181B2A] py-3 px-4 text-base text-gray-900 [.dark_&]:text-white placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-blue-500/20 transition-all shadow-sm`}
                        onKeyPress={(e) => {
                            if (e.key === "Enter") {
                                onAdd();
                            }
                        }}
                        autoFocus
                    />
                </div>

                {/* Footer - Buttons Right & Smaller */}
                <div className="flex items-center justify-end gap-3 px-6 pb-6 pt-2">
                    <button
                        onClick={onClose}
                        className="bg-gray-100 hover:bg-gray-200 [.dark_&]:bg-white/5 [.dark_&]:hover:bg-white/10 text-gray-700 [.dark_&]:text-gray-300 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onAdd}
                        className={`${buttonClass} px-5 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors shadow-md shadow-blue-500/20`}
                    >
                        Add
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddSettingModal;

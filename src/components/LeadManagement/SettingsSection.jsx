import React from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { FaPlus, FaTrash, FaGripVertical, FaExclamationTriangle } from 'react-icons/fa';

/**
 * EmptyState Component
 * Displays when no items are present in the list
 */
const EmptyState = ({ message, suggestions, onAdd, iconColor = "text-gray-400" }) => (
    <div className="text-center py-8 px-4 bg-white [.dark_&]:bg-slate-800/60 rounded-lg border-2 border-dashed border-gray-300 [.dark_&]:border-gray-600">
        <FaExclamationTriangle className={`h-12 w-12 mx-auto mb-3 ${iconColor}`} />
        <p className="font-medium text-gray-700 [.dark_&]:text-gray-300 mb-1">{message}</p>
        {suggestions && (
            <p className="text-sm text-gray-500 [.dark_&]:text-gray-400 mb-4">
                {suggestions}
            </p>
        )}
        <button
            onClick={onAdd}
            type="button"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium inline-flex items-center gap-2 transition-colors"
        >
            <FaPlus className="text-xs" />
            Add First Item
        </button>
    </div>
);

/**
 * DraggableList Component
 * Handles the list rendering with Drag and Drop capabilities
 */
const DraggableList = ({
    items,
    type,
    onReorder,
    onEdit,
    onDelete,
    editingItem,
    editValue,
    setEditingItem,
    setEditValue,
    itemColorClass = "bg-white [.dark_&]:bg-slate-800/60",
    ringColorClass = "ring-blue-500",
    inputBgClass = "bg-blue-50 [.dark_&]:bg-blue-900/20",
    inputBorderClass = "border-blue-300 [.dark_&]:border-blue-600",
    usageCounts = {}
}) => {
    return (
        <DragDropContext onDragEnd={(result) => onReorder(result, type)}>
            <Droppable droppableId={type}>
                {(provided) => (
                    <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                        {items.map((item, index) => (
                            <Draggable key={item} draggableId={item} index={index}>
                                {(provided, snapshot) => (
                                    <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        className={`flex items-center gap-2 p-3 rounded-lg border border-gray-200 [.dark_&]:border-white/10 transition-all ${itemColorClass} ${snapshot.isDragging ? `shadow-lg ring-2 ${ringColorClass} opacity-90` : 'hover:shadow-md'
                                            }`}
                                    >
                                        <div
                                            {...provided.dragHandleProps}
                                            className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 [.dark_&]:hover:text-gray-300"
                                        >
                                            <FaGripVertical className="text-sm" />
                                        </div>

                                        {editingItem === `${type}-${index}` ? (
                                            <input
                                                type="text"
                                                value={editValue}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    // Allow only alphabets and spaces
                                                    if (/[^a-zA-Z\s]/.test(val)) return;
                                                    setEditValue(val);
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') onEdit(type, item, editValue);
                                                    if (e.key === 'Escape') setEditingItem(null);
                                                }}
                                                onBlur={() => setEditingItem(null)}
                                                autoFocus
                                                className={`flex-1 px-2 py-1 text-sm font-medium text-gray-900 [.dark_&]:text-white border rounded focus:outline-none focus:ring-2 ${inputBgClass} ${inputBorderClass}`}
                                            />
                                        ) : (
                                            <div
                                                onClick={() => {
                                                    setEditingItem(`${type}-${index}`);
                                                    setEditValue(item);
                                                }}
                                                className="flex-1 flex items-center justify-between cursor-pointer group"
                                                title="Click to edit"
                                            >
                                                <span className="text-sm font-medium text-gray-900 [.dark_&]:text-white group-hover:underline transition-colors block truncate">
                                                    {item}
                                                </span>
                                                {usageCounts[item] > 0 && (
                                                    <span className="text-xs text-gray-400 bg-gray-100 [.dark_&]:bg-slate-700 px-2 py-0.5 rounded-full mr-2">
                                                        {usageCounts[item]} uses
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        <button
                                            onClick={() => onDelete(type, item)}
                                            disabled={usageCounts[item] > 0}
                                            className={`transition-colors p-1 ${usageCounts[item] > 0
                                                ? 'text-gray-300 cursor-not-allowed'
                                                : 'text-gray-400 hover:text-red-600 [.dark_&]:hover:text-red-400'
                                                }`}
                                            title={usageCounts[item] > 0 ? "Cannot delete item in use" : "Delete"}
                                            type="button"
                                        >
                                            <FaTrash className="text-xs" />
                                        </button>
                                    </div>
                                )}
                            </Draggable>
                        ))}
                        {provided.placeholder}
                    </div>
                )}
            </Droppable>
        </DragDropContext>
    );
};

/**
 * SettingsSection Component
 * Main wrapper for a settings management section
 */
const SettingsSection = ({
    title,
    description,
    icon: Icon,
    iconColor = "text-gray-600",
    items,
    type,
    onAdd,
    onEdit,
    onDelete,
    onReorder,
    editingItem,
    editValue,
    setEditingItem,
    setEditValue,
    emptyMessage,
    emptySuggestions,
    colors = {}, // Object to override default colors: { ring, inputBg, inputBorder, item }
    usageCounts = {}
}) => {
    return (
        <div className="bg-gray-50 [.dark_&]:bg-slate-700/30 rounded-xl p-5 border border-gray-200 [.dark_&]:border-white/10 h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-gray-900 [.dark_&]:text-white flex items-center gap-2">
                    {Icon && <Icon className={iconColor} />}
                    {title}
                </h3>
                <button
                    onClick={onAdd}
                    type="button"
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                    <FaPlus className="text-xs" />
                    Add {title.endsWith('s') ? title.slice(0, -1) : 'Item'}
                </button>
            </div>

            {description && (
                <p className="text-sm text-gray-600 [.dark_&]:text-gray-300 mb-4">
                    {description}
                </p>
            )}

            <div className="flex-1">
                {items.length === 0 ? (
                    <EmptyState
                        message={emptyMessage || `No ${title.toLowerCase()} defined`}
                        suggestions={emptySuggestions}
                        onAdd={onAdd}
                    />
                ) : (
                    <DraggableList
                        items={items}
                        type={type}
                        onReorder={onReorder}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        editingItem={editingItem}
                        editValue={editValue}
                        setEditingItem={setEditingItem}
                        setEditValue={setEditValue}
                        ringColorClass={colors.ring}
                        inputBgClass={colors.inputBg}
                        inputBorderClass={colors.inputBorder}
                        usageCounts={usageCounts}
                    />
                )}
            </div>
        </div>
    );
};

export default SettingsSection;

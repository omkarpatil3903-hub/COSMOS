import React from "react";
import { HiXMark } from "react-icons/hi2";
import {
    FaBuilding,
    FaEnvelope,
    FaPhone,
    FaBriefcase,
    FaUsers,
    FaMapMarkerAlt
} from "react-icons/fa";
import Button from "../Button";

const ClientViewModal = ({ isOpen, onClose, client }) => {
    if (!isOpen || !client) return null;

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-xl shadow-2xl w-full max-w-4xl relative z-[10000] flex flex-col max-h-[90vh] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50 sticky top-0 z-10 backdrop-blur-md">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                            <FaBuilding className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 leading-tight">
                                Client Details
                            </h2>
                            <p className="text-xs text-gray-500 font-medium">
                                View complete client information
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all duration-200"
                    >
                        <HiXMark className="h-6 w-6" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto">
                    <div className="space-y-8">
                        {/* Logo & Header Info */}
                        <div className="flex flex-col items-center justify-center pb-6 border-b border-gray-100">
                            <div className="relative mb-4 group">
                                {client.imageUrl ? (
                                    <img
                                        src={client.imageUrl}
                                        alt="Logo"
                                        className="h-28 w-28 object-cover rounded-full border-4 border-white shadow-xl ring-1 ring-gray-100"
                                    />
                                ) : (
                                    <div className="h-28 w-28 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-4xl shadow-xl ring-4 ring-white">
                                        {client.companyName?.charAt(0)?.toUpperCase() || "C"}
                                    </div>
                                )}
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 text-center">
                                {client.companyName}
                            </h3>
                            <p className="text-sm text-gray-500 font-medium text-center mt-1">
                                {client.clientName}
                            </p>
                        </div>

                        {/* Info Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InfoBox
                                icon={<FaEnvelope className="h-4 w-4 text-blue-500" />}
                                label="Email Address"
                                value={client.email}
                                isEmail
                            />
                            <InfoBox
                                icon={<FaPhone className="h-4 w-4 text-green-500" />}
                                label="Contact Number"
                                value={client.contactNo}
                            />
                            <InfoBox
                                icon={<FaBriefcase className="h-4 w-4 text-purple-500" />}
                                label="Business Type"
                                value={client.typeOfBusiness}
                            />
                            <InfoBox
                                icon={<FaUsers className="h-4 w-4 text-orange-500" />}
                                label="Employees"
                                value={client.noOfEmployees}
                            />

                            <div className="md:col-span-2 bg-gray-50 rounded-xl p-4 border border-gray-100">
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-white rounded-lg shadow-sm text-red-500 mt-0.5">
                                        <FaMapMarkerAlt className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">
                                            Address
                                        </label>
                                        <p className="text-gray-900 text-sm font-medium leading-relaxed">
                                            {client.address || "No address provided"}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end rounded-b-xl sticky bottom-0 backdrop-blur-md">
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={onClose}
                        className="px-6"
                    >
                        Close
                    </Button>
                </div>
            </div>
        </div>
    );
};

const InfoBox = ({ icon, label, value, isEmail }) => (
    <div className="bg-white border border-gray-100 p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 flex items-start gap-3">
        <div className="p-2 bg-gray-50 rounded-lg shrink-0">
            {icon}
        </div>
        <div className="overflow-hidden">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-0.5">
                {label}
            </label>
            <p className={`text-gray-900 font-semibold text-sm truncate ${isEmail ? 'text-indigo-600 hover:underline cursor-pointer' : ''}`}>
                {value || "Not provided"}
            </p>
        </div>
    </div>
);

export default ClientViewModal;
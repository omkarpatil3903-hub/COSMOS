import { HiXMark } from "react-icons/hi2";
import Button from "../Button";

const ClientViewModal = ({ isOpen, onClose, client }) => {
    if (!isOpen || !client) return null;

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-lg shadow-2xl w-full max-w-md relative z-[10000]"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-semibold text-gray-800">
                            Client Details
                        </h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            <HiXMark className="h-6 w-6" />
                        </button>
                    </div>

                    <div className="space-y-6">
                        {/* Logo */}
                        <div className="flex items-center justify-center pb-4 border-b border-gray-200">
                            {client.imageUrl ? (
                                <img
                                    src={client.imageUrl}
                                    alt="Logo"
                                    className="h-24 w-24 object-cover rounded-full border-4 border-indigo-100 shadow-lg"
                                />
                            ) : (
                                <div className="h-24 w-24 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-3xl shadow-lg">
                                    {client.companyName?.charAt(0)?.toUpperCase() || "C"}
                                </div>
                            )}
                        </div>

                        {/* Info Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InfoBox label="Company Name" value={client.companyName} />
                            <InfoBox label="Client Name" value={client.clientName} />
                            <InfoBox label="Email" value={client.email} />
                            <InfoBox label="Contact No" value={client.contactNo} />
                            <InfoBox label="Business Type" value={client.typeOfBusiness} />
                            <InfoBox label="Employees" value={client.noOfEmployees} />
                            <div className="md:col-span-2 bg-gray-50 p-3 rounded-lg">
                                <label className="block text-xs font-medium text-gray-500 mb-1">
                                    Address
                                </label>
                                <p className="text-gray-900 text-sm">{client.address || "N/A"}</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-6 border-t mt-6">
                        <Button type="button" variant="ghost" onClick={onClose}>
                            Close
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const InfoBox = ({ label, value }) => (
    <div className="bg-gray-50 p-3 rounded-lg">
        <label className="block text-xs font-medium text-gray-500 mb-1">
            {label}
        </label>
        <p className="text-gray-900 font-semibold text-sm">
            {value || "Not provided"}
        </p>
    </div>
);

export default ClientViewModal;
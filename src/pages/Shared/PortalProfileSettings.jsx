import React from "react";
import Card from "../../components/Card";

export default function PortalProfileSettings() {
  return (
    <Card className="p-6 [.dark_&]:bg-[#181B2A] [.dark_&]:border-white/10" tone="white">
      <h2 className="text-base font-semibold text-gray-900 mb-1 [.dark_&]:text-white">Profile</h2>
      <p className="text-sm text-gray-500 mb-4 [.dark_&]:text-gray-400">
        Coming soon: manage your personal information and preferences.
      </p>
    </Card>
  );
}

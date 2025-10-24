// src/pages/ReportsPage.jsx
import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import {
  FaDownload,
  FaUniversity,
  FaRegBuilding,
  FaVenusMars,
} from "react-icons/fa";

// Reusable UI Components
import PageHeader from "../components/PageHeader";
import Card from "../components/Card";
import Button from "../components/Button";
import SkeletonRow from "../components/SkeletonRow";

// --- Placeholder Data ---
const allVotersData = Array.from({ length: 128 }, (_, i) => ({
  id: i + 1,
  boothNumber: 101 + (i % 3),
  voterNumber: 1001 + i,
  fullName: `Voter Name ${i + 1}`,
  age: 20 + (i % 50),
  gender: i % 2 === 0 ? "Male" : "Female",
  epicNumber: `XYZ${1234567 + i}`,
  mobileNumber: `98765432${String(i).padStart(2, "0")}`,
  villageName: i % 4 < 2 ? "Sangli" : "Miraj",
  boothName: `School No. ${1 + (i % 3)}`,
  address: `House No. ${i + 1}, Main Street`,
}));

const villageOptions = ["Sangli", "Miraj"];
const boothOptions = [101, 102, 103];
// --- End of Placeholder Data ---

function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState([]);

  // State for filters & pagination
  const [filterVillage, setFilterVillage] = useState("");
  const [filterBooth, setFilterBooth] = useState("");
  const [filterGender, setFilterGender] = useState("");
  const [filterAgeMin, setFilterAgeMin] = useState("");
  const [filterAgeMax, setFilterAgeMax] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    setTimeout(() => setLoading(false), 1500); // Simulate load time
  }, []);

  const generateReport = () => {
    let result = allVotersData;
    if (filterVillage)
      result = result.filter((v) => v.villageName === filterVillage);
    if (filterBooth)
      result = result.filter((v) => v.boothNumber.toString() === filterBooth);
    if (filterGender) result = result.filter((v) => v.gender === filterGender);
    if (filterAgeMin)
      result = result.filter((v) => v.age >= Number(filterAgeMin));
    if (filterAgeMax)
      result = result.filter((v) => v.age <= Number(filterAgeMax));

    setReportData(result);
    setCurrentPage(1);
    toast.success(`Report generated with ${result.length} voters.`);
  };

  const handleResetFilters = () => {
    setFilterVillage("");
    setFilterBooth("");
    setFilterGender("");
    setFilterAgeMin("");
    setFilterAgeMax("");
    setReportData([]);
    setCurrentPage(1);
  };

  const downloadReport = () => {
    toast.success("Downloading report...");
    console.log("Downloading report with this data:", reportData);
  };

  // Pagination logic
  const totalPages = Math.ceil(reportData.length / rowsPerPage);
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = reportData.slice(indexOfFirstRow, indexOfLastRow);
  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };
  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  if (loading) {
    return (
      <div>
        <PageHeader title="Generate Reports">
          Use multiple filters to create and download specific voter reports.
        </PageHeader>
        <div className="space-y-6">
          <Card title="Report Filters">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
              <div className="h-10 bg-gray-200 rounded-md"></div>
              <div className="h-10 bg-gray-200 rounded-md"></div>
              <div className="h-10 bg-gray-200 rounded-md"></div>
              <div className="h-10 bg-gray-200 rounded-md"></div>
            </div>
          </Card>
          <Card title="Report Results">
            <div className="h-40 bg-gray-200 rounded-md animate-pulse"></div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Generate Reports">
        Use multiple filters to create and download specific voter reports.
      </PageHeader>
      <div className="space-y-6">
        <Card title="Report Filters">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                <FaUniversity />
              </span>
              <select
                value={filterVillage}
                onChange={(e) => setFilterVillage(e.target.value)}
                className="w-full pl-10 px-3 py-2 border border-gray-300 rounded-md appearance-none"
              >
                <option value="">All Villages</option>
                {villageOptions.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                <FaRegBuilding />
              </span>
              <select
                value={filterBooth}
                onChange={(e) => setFilterBooth(e.target.value)}
                className="w-full pl-10 px-3 py-2 border border-gray-300 rounded-md appearance-none"
              >
                <option value="">All Booths</option>
                {boothOptions.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                <FaVenusMars />
              </span>
              <select
                value={filterGender}
                onChange={(e) => setFilterGender(e.target.value)}
                className="w-full pl-10 px-3 py-2 border border-gray-300 rounded-md appearance-none"
              >
                <option value="">All Genders</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="Min Age"
                value={filterAgeMin}
                onChange={(e) => setFilterAgeMin(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
              <span>-</span>
              <input
                type="number"
                placeholder="Max Age"
                value={filterAgeMax}
                onChange={(e) => setFilterAgeMax(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>
          <div className="mt-6 flex items-center gap-4">
            <Button onClick={generateReport}>Generate Report</Button>
            <Button onClick={handleResetFilters} variant="secondary">
              Reset Filters
            </Button>
          </div>
        </Card>

        <Card
          title="Report Results"
          actions={
            <Button
              onClick={downloadReport}
              disabled={reportData.length === 0}
              className="!bg-green-600 hover:!bg-green-700 focus:!ring-green-500 flex items-center gap-2"
            >
              <FaDownload /> Download
            </Button>
          }
        >
          <p className="text-sm text-gray-600 mb-4">
            Found {reportData.length} voters matching your criteria.
          </p>
          <div className="flex justify-between items-center mb-4">
            <div>
              <span className="text-sm text-gray-700">
                Rows per page:
                <select
                  value={rowsPerPage}
                  onChange={(e) => {
                    setRowsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="ml-2 border-gray-300 rounded-md"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </span>
            </div>
            <div>
              <span className="text-sm text-gray-700">
                Page {currentPage} of {totalPages > 0 ? totalPages : 1}
              </span>
              <Button
                onClick={handlePrevPage}
                disabled={currentPage === 1}
                variant="secondary"
                className="ml-4 !px-3 !py-1 text-sm"
              >
                Previous
              </Button>
              <Button
                onClick={handleNextPage}
                disabled={currentPage === totalPages || totalPages === 0}
                variant="secondary"
                className="ml-2 !px-3 !py-1 text-sm"
              >
                Next
              </Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead className="bg-gray-50">
                <tr>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase">
                    Sr. No.
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase">
                    Booth Number
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase">
                    Voter Number
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase">
                    Voter Name
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase">
                    Age
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase">
                    Gender
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase">
                    Epic Number
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase">
                    Mobile Number
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase">
                    Village Name
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase">
                    Booth Name
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase">
                    Address
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {currentRows.map((voter, index) => (
                  <tr
                    key={voter.id}
                    className="hover:bg-gray-50 odd:bg-white even:bg-slate-50"
                  >
                    <td className="py-4 px-4 whitespace-nowrap">
                      {indexOfFirstRow + index + 1}
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      {voter.boothNumber}
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      {voter.voterNumber}
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      {voter.fullName}
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">{voter.age}</td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      {voter.gender}
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      {voter.epicNumber}
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      {voter.mobileNumber}
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      {voter.villageName}
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      {voter.boothName}
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      {voter.address}
                    </td>
                  </tr>
                ))}
                {reportData.length === 0 && (
                  <tr>
                    <td
                      colSpan="11"
                      className="text-center py-10 text-gray-500"
                    >
                      No data. Please select filters and click "Generate
                      Report".
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default ReportsPage;

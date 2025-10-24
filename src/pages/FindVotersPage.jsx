// src/pages/FindVotersPage.jsx
import React, { useState, useEffect } from "react";
import { FaSearch, FaUniversity, FaRegBuilding } from "react-icons/fa";

// Reusable UI Components
import PageHeader from "../components/PageHeader";
import Card from "../components/Card";
import Button from "../components/Button";
import SkeletonRow from "../components/SkeletonRow"; // Make sure you have this component

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
  villageName: i % 4 < 2 ? "Sunrise Valley" : "Green Meadows",
  boothName: `School No. ${1 + (i % 3)}`,
  address: `House No. ${i + 1}, Main Street`,
}));

const villageOptions = ["Sunrise Valley", "Green Meadows"];
const boothOptions = [101, 102, 103];
// --- End of Placeholder Data ---

function FindVotersPage() {
  const [voters, setVoters] = useState([]);
  const [loading, setLoading] = useState(true);

  // State for search, filters, and pagination
  const [searchTerm, setSearchTerm] = useState("");
  const [filterVillage, setFilterVillage] = useState("");
  const [filterBooth, setFilterBooth] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [filteredVoters, setFilteredVoters] = useState([]);

  // Simulate fetching data
  useEffect(() => {
    setTimeout(() => {
      setVoters(allVotersData);
      setFilteredVoters(allVotersData);
      setLoading(false);
    }, 1500); // Increased delay to better see the skeleton
  }, []);

  // Effect to apply all filters
  useEffect(() => {
    let result = voters;
    if (searchTerm) {
      result = result.filter((voter) =>
        voter.fullName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (filterVillage) {
      result = result.filter((voter) => voter.villageName === filterVillage);
    }
    if (filterBooth) {
      result = result.filter(
        (voter) => voter.boothNumber.toString() === filterBooth
      );
    }
    setFilteredVoters(result);
    setCurrentPage(1);
  }, [searchTerm, filterVillage, filterBooth, voters]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredVoters.length / rowsPerPage);
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = filteredVoters.slice(indexOfFirstRow, indexOfLastRow);
  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };
  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  // --- SKELETON LOADER ---
  if (loading) {
    return (
      <div>
        <PageHeader title="Find Voters">
          Search and filter through the complete voter database.
        </PageHeader>
        <div className="space-y-6">
          <Card title="Filters & Search">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-pulse">
              <div className="h-10 bg-gray-200 rounded-md"></div>
              <div className="h-10 bg-gray-200 rounded-md"></div>
              <div className="h-10 bg-gray-200 rounded-md"></div>
            </div>
          </Card>
          <Card title="Voter List">
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white">
                <thead className="bg-gray-50">
                  {/* Headers are static, so they can be rendered */}
                  <tr>
                    <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sr. No.
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Booth Number
                    </th>
                    {/* ... other headers ... */}
                    <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Address
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {Array.from({ length: rowsPerPage }).map((_, i) => (
                    <SkeletonRow key={i} columns={11} />
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Find Voters">
        Search and filter through the complete voter database.
      </PageHeader>
      <div className="space-y-6">
        <Card
          title="Filters & Search"
          actions={
            <h3 className="text-lg font-semibold text-gray-700">
              Total Found: {filteredVoters.length}
            </h3>
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                <FaSearch />
              </span>
              <input
                type="text"
                placeholder="Search by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
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
                {villageOptions.map((village) => (
                  <option key={village} value={village}>
                    {village}
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
                {boothOptions.map((booth) => (
                  <option key={booth} value={booth}>
                    {booth}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        <Card title="Voter List">
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
                {currentRows.length === 0 && (
                  <tr>
                    <td
                      colSpan="11"
                      className="text-center py-10 text-gray-500"
                    >
                      No voters found.
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

export default FindVotersPage;

// src/pages/FindVotersPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  FaSearch,
  FaUniversity,
  FaRegBuilding,
  FaSortAmountDownAlt,
  FaSortAmountUpAlt,
} from "react-icons/fa";
import { HiOutlineArrowDownTray, HiMiniArrowPath } from "react-icons/hi2";
import ExcelJS from "exceljs";
import toast from "react-hot-toast";

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
  villageName: i % 4 < 2 ? "Sunrise Valley" : "Green Meadows",
  boothName: `School No. ${1 + (i % 3)}`,
  address: `House No. ${i + 1}, Main Street`,
}));

const villageOptions = ["Sunrise Valley", "Green Meadows"];
const boothOptions = [101, 102, 103];

const tableHeaders = [
  { key: "srNo", label: "Sr. No.", sortable: false },
  { key: "boothNumber", label: "Booth Number", sortable: true },
  { key: "voterNumber", label: "Voter Number", sortable: true },
  { key: "fullName", label: "Voter Name", sortable: true },
  { key: "age", label: "Age", sortable: true },
  { key: "gender", label: "Gender", sortable: true },
  { key: "epicNumber", label: "Epic Number", sortable: true },
  { key: "mobileNumber", label: "Mobile Number", sortable: true },
  { key: "villageName", label: "Village Name", sortable: true },
  { key: "boothName", label: "Booth Name", sortable: true },
  { key: "address", label: "Address", sortable: true },
];
// --- End Placeholder Data ---

function FindVotersPage() {
  const [voters, setVoters] = useState([]);
  const [loading, setLoading] = useState(true);

  // State for search, filters, sorting, and pagination
  const [searchTerm, setSearchTerm] = useState("");
  const [filterVillage, setFilterVillage] = useState("");
  const [filterBooth, setFilterBooth] = useState("");
  const [sortConfig, setSortConfig] = useState({
    key: "fullName",
    direction: "asc",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Simulate fetching data
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setVoters(allVotersData);
      setLoading(false);
    }, 1500);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const filteredVoters = useMemo(() => {
    let result = [...voters];

    if (searchTerm) {
      const normalisedTerm = searchTerm.trim().toLowerCase();
      result = result.filter((voter) =>
        voter.fullName.toLowerCase().includes(normalisedTerm)
      );
    }

    if (filterVillage) {
      result = result.filter((voter) => voter.villageName === filterVillage);
    }

    if (filterBooth) {
      result = result.filter(
        (voter) => String(voter.boothNumber) === String(filterBooth)
      );
    }

    if (sortConfig?.key) {
      const { key, direction } = sortConfig;
      const multiplier = direction === "asc" ? 1 : -1;

      result.sort((a, b) => {
        const aValue = a[key];
        const bValue = b[key];

        if (typeof aValue === "number" && typeof bValue === "number") {
          return (aValue - bValue) * multiplier;
        }

        return String(aValue).localeCompare(String(bValue)) * multiplier;
      });
    }

    return result;
  }, [voters, searchTerm, filterVillage, filterBooth, sortConfig]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterVillage, filterBooth, sortConfig]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredVoters.length / rowsPerPage)
  );
  const indexOfFirstRow = (currentPage - 1) * rowsPerPage;
  const currentRows = filteredVoters.slice(
    indexOfFirstRow,
    indexOfFirstRow + rowsPerPage
  );

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleSort = (columnKey) => {
    setSortConfig((prev) => {
      if (!prev || prev.key !== columnKey) {
        return { key: columnKey, direction: "asc" };
      }

      return {
        key: columnKey,
        direction: prev.direction === "asc" ? "desc" : "asc",
      };
    });
  };

  const handleReset = () => {
    setSearchTerm("");
    setFilterVillage("");
    setFilterBooth("");
    setSortConfig({ key: "fullName", direction: "asc" });
    setRowsPerPage(10);
    setCurrentPage(1);
  };

  const handleExport = async () => {
    if (!filteredVoters.length) {
      toast.error("No voter records available to export.");
      return;
    }

    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Voters");

      worksheet.columns = [
        { header: "Sr. No.", key: "srNo", width: 10 },
        { header: "Booth Number", key: "boothNumber", width: 15 },
        { header: "Voter Number", key: "voterNumber", width: 15 },
        { header: "Full Name", key: "fullName", width: 26 },
        { header: "Age", key: "age", width: 10 },
        { header: "Gender", key: "gender", width: 12 },
        { header: "Epic Number", key: "epicNumber", width: 18 },
        { header: "Mobile Number", key: "mobileNumber", width: 18 },
        { header: "Village", key: "villageName", width: 18 },
        { header: "Booth Name", key: "boothName", width: 18 },
        { header: "Address", key: "address", width: 30 },
      ];

      worksheet.addRows(
        filteredVoters.map((voter, index) => ({
          srNo: index + 1,
          ...voter,
        }))
      );

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `voters-export-${new Date()
        .toISOString()
        .slice(0, 10)}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);

      toast.success("Export started. Check your downloads.");
    } catch (error) {
      console.error("Failed to export voters", error);
      toast.error("Something went wrong while exporting.");
    }
  };

  const sortIndicator = (columnKey) => {
    if (!sortConfig || sortConfig.key !== columnKey) {
      return null;
    }

    return sortConfig.direction === "asc" ? (
      <FaSortAmountUpAlt
        className="h-4 w-4 text-indigo-600"
        aria-hidden="true"
      />
    ) : (
      <FaSortAmountDownAlt
        className="h-4 w-4 text-indigo-600"
        aria-hidden="true"
      />
    );
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
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="h-12 rounded-lg bg-surface-strong animate-pulse" />
              <div className="h-12 rounded-lg bg-surface-strong animate-pulse" />
              <div className="h-12 rounded-lg bg-surface-strong animate-pulse" />
            </div>
          </Card>
          <Card title="Voter List">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-surface-subtle">
                  <tr>
                    {tableHeaders.map((header) => (
                      <th
                        key={header.key}
                        className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-content-tertiary"
                      >
                        {header.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-subtle">
                  {Array.from({ length: rowsPerPage }).map((_, index) => (
                    <SkeletonRow key={index} columns={tableHeaders.length} />
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
            <div className="flex items-center gap-3">
              <span
                className="text-sm font-medium text-content-secondary"
                aria-live="polite"
              >
                Showing {filteredVoters.length} records
              </span>
              <Button
                variant="ghost"
                onClick={handleReset}
                className="hidden sm:inline-flex"
              >
                <HiMiniArrowPath className="h-4 w-4" aria-hidden="true" />
                Reset
              </Button>
              <Button onClick={handleExport}>
                <HiOutlineArrowDownTray
                  className="h-4 w-4"
                  aria-hidden="true"
                />
                Export
              </Button>
            </div>
          }
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <label className="flex flex-col gap-2 text-sm font-medium text-content-secondary">
              Search by name
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-content-tertiary">
                  <FaSearch className="h-4 w-4" aria-hidden="true" />
                </span>
                <input
                  type="text"
                  placeholder="e.g. Priya Kulkarni"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-lg border border-subtle bg-surface py-2 pl-9 pr-3 text-sm text-content-primary placeholder:text-content-tertiary focus-visible:border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100"
                />
              </div>
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-content-secondary">
              Filter by village
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-content-tertiary">
                  <FaUniversity className="h-4 w-4" aria-hidden="true" />
                </span>
                <select
                  value={filterVillage}
                  onChange={(e) => setFilterVillage(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-subtle bg-surface py-2 pl-9 pr-10 text-sm text-content-primary focus-visible:border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100"
                >
                  <option value="">All Villages</option>
                  {villageOptions.map((village) => (
                    <option key={village} value={village}>
                      {village}
                    </option>
                  ))}
                </select>
              </div>
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-content-secondary">
              Filter by booth
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-content-tertiary">
                  <FaRegBuilding className="h-4 w-4" aria-hidden="true" />
                </span>
                <select
                  value={filterBooth}
                  onChange={(e) => setFilterBooth(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-subtle bg-surface py-2 pl-9 pr-10 text-sm text-content-primary focus-visible:border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100"
                >
                  <option value="">All Booths</option>
                  {boothOptions.map((booth) => (
                    <option key={booth} value={booth}>
                      {booth}
                    </option>
                  ))}
                </select>
              </div>
            </label>
          </div>
          <div className="mt-4 flex gap-3 sm:hidden">
            <Button variant="ghost" onClick={handleReset} className="flex-1">
              <HiMiniArrowPath className="h-4 w-4" aria-hidden="true" />
              Reset
            </Button>
            <Button onClick={handleExport} className="flex-1">
              <HiOutlineArrowDownTray className="h-4 w-4" aria-hidden="true" />
              Export
            </Button>
          </div>
        </Card>

        <Card title="Voter List">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="text-sm text-content-secondary">
              Page {Math.min(currentPage, totalPages)} of {totalPages}
            </div>
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-content-secondary">
                Rows per page
              </label>
              <select
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="rounded-lg border border-subtle bg-surface px-3 py-2 text-sm text-content-primary focus-visible:border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handlePrevPage}
                  variant="secondary"
                  className="px-3 py-1"
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <Button
                  onClick={handleNextPage}
                  variant="secondary"
                  className="px-3 py-1"
                  disabled={
                    currentPage === totalPages || !filteredVoters.length
                  }
                >
                  Next
                </Button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-subtle">
              <caption className="sr-only">
                Filtered voter records with search and pagination controls
              </caption>
              <thead className="bg-surface-subtle">
                <tr>
                  {tableHeaders.map((header) => {
                    const isActive = sortConfig.key === header.key;
                    const ariaSort = !header.sortable
                      ? "none"
                      : isActive
                      ? sortConfig.direction === "asc"
                        ? "ascending"
                        : "descending"
                      : "none";

                    return (
                      <th
                        key={header.key}
                        scope="col"
                        aria-sort={ariaSort}
                        className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-content-tertiary"
                      >
                        {header.sortable ? (
                          <button
                            type="button"
                            onClick={() => handleSort(header.key)}
                            className="flex items-center gap-2 text-left"
                          >
                            <span>{header.label}</span>
                            {sortIndicator(header.key)}
                          </button>
                        ) : (
                          header.label
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-subtle">
                {currentRows.map((voter, index) => (
                  <tr
                    key={voter.id}
                    className="bg-surface hover:bg-surface-subtle"
                  >
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-content-secondary">
                      {indexOfFirstRow + index + 1}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm">
                      {voter.boothNumber}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm">
                      {voter.voterNumber}
                    </td>
                    <td className="px-4 py-4 text-sm font-medium text-content-primary">
                      {voter.fullName}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm">
                      {voter.age}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm">
                      {voter.gender}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm">
                      {voter.epicNumber}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm">
                      {voter.mobileNumber}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm">
                      {voter.villageName}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm">
                      {voter.boothName}
                    </td>
                    <td className="px-4 py-4 text-sm text-content-secondary">
                      {voter.address}
                    </td>
                  </tr>
                ))}
                {!currentRows.length && (
                  <tr>
                    <td
                      colSpan={tableHeaders.length}
                      className="px-4 py-10 text-center text-sm text-content-secondary"
                    >
                      No voters match the selected filters. Adjust your search
                      or try resetting filters.
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

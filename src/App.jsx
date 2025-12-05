import EmployeeExpenses from "./pages/EmployeeExpenses";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/employee/expenses" element={<EmployeeExpenses />} />
      </Routes>
    </Router>
  );
}

export default App;

/**
 * Admin Expense Management Page
 * Uses shared ExpenseManagementBase component
 */
import ExpenseManagementBase from "../../components/expenses/ExpenseManagementBase";

const ExpenseManagement = () => {
  return (
    <ExpenseManagementBase
      useDarkMode={false}
    />
  );
};

export default ExpenseManagement;

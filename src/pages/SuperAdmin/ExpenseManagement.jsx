/**
 * SuperAdmin Expense Management Page
 * Uses shared ExpenseManagementBase component
 */
import { useThemeStyles } from "../../hooks/useThemeStyles";
import ExpenseManagementBase from "../../components/expenses/ExpenseManagementBase";

const ExpenseManagement = () => {
  const { buttonClass } = useThemeStyles();

  return (
    <ExpenseManagementBase
      buttonClass={buttonClass}
      useDarkMode={true}
    />
  );
};

export default ExpenseManagement;

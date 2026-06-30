import { useRouteError } from "react-router-dom";
import ErrorScreen from "./ErrorScreen.jsx";

// Router errorElement: catches render crashes inside route components. The data router intercepts these before the top-level class ErrorBoundary can see them, so route trees need their own fallback.
function RouteError() {
  const error = useRouteError();
  console.error("Route render error:", error);
  return <ErrorScreen />;
}

export default RouteError;

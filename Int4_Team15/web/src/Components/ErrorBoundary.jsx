import { Component } from "react";
import ErrorScreen from "./ErrorScreen.jsx";

/*** Catch-all for runtime render errors in providers / anything outside the router's route tree. *** 

Without this, a single component throwing during render unmounts the whole app to a blank white screen!

GraphError covers the *expected* failure (API fetch); this covers the *unexpected* one (a JS error).

Route-component crashes are handled by the router's errorElement (see main.jsx), since the data router intercepts those before they reach a class boundary. ***/

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // Keep the trace in the console for debugging; the UI stays friendly.
    console.error("Uncaught render error:", error, info);
  }

  render() {
    if (this.state.hasError) return <ErrorScreen />;
    return this.props.children;
  }
}

export default ErrorBoundary;

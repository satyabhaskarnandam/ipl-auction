import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import ErrorBoundary from "./components/ErrorBoundary";
import LobbyPage from "./pages/LobbyPage";
import AuctionPage from "./pages/AuctionPage";
import BrowseRoomsPage from "./pages/BrowseRoomsPage";
import SupportPage from "./pages/SupportPage";

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/" element={<LobbyPage />} />
          <Route path="/browse-rooms" element={<BrowseRoomsPage />} />
          <Route path="/support" element={<SupportPage />} />
          <Route path="/auction/:roomId" element={<AuctionPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
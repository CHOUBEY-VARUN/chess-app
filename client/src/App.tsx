import { BrowserRouter, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/home/common/ProtectedRoute";
import Account from "./pages/Account";
import Home from "./pages/Home";
import Lobby from "./pages/Lobby";
import LocalGame from "./pages/LocalGame";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Room from "./pages/Room";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/account"
          element={
            <ProtectedRoute>
              <Account />
            </ProtectedRoute>
          }
        />
        <Route
          path="/local-game"
          element={
            <ProtectedRoute>
              <LocalGame />
            </ProtectedRoute>
          }
        />
        <Route
          path="/lobby"
          element={
            <ProtectedRoute>
              <Lobby />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rooms/:roomCode"
          element={
            <ProtectedRoute>
              <Room />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
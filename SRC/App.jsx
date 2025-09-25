import "./App.css";
import { Routes, Route } from "react-router-dom";
import Landing from "./components/landing/landing.jsx";
import Entryes from "./components/entryes/entryes.jsx";
import Main from "./components/main/main.jsx";
import RefCapture from "./components/entryes/ref-capture.jsx";
const writeDefault = "профиль пользователя"

function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Entryes />} />
      <Route path="/registration" element={<Entryes />} />
      <Route path="/ref/:refCode" element={<RefCapture />} />
      <Route path="/personal-room" element={<Main menuName={writeDefault}  />} />
      <Route path="/personal-room/partners" element={<Main menuName={writeDefault}  />} />
      <Route path="/personal-room/accounts" element={<Main menuName={writeDefault}  />} />
      <Route path="/personal-room/transactions" element={<Main menuName={writeDefault}  />} />
      <Route path="/personal-room/reports" element={<Main menuName={writeDefault}  />} />
      <Route path="/personal-room/documents" element={<Main menuName={writeDefault}  />} />
    </Routes>
  );
}

export default App;

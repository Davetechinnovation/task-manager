import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify'; // Import ToastContainer
import 'react-toastify/dist/ReactToastify.css'; // Import the CSS for toast notifications
import Dashboard from './component/dashboard';
import Task from './pages/task';
import Login from './component/login';
import Signup from './component/signup';

function App() {
  return (
    <Router>
      {/* Toast Container */}
      <ToastContainer
        position="top-right" // Position of the toasts
        autoClose={3000} // Auto-close toasts after 3 seconds
        hideProgressBar={false} // Show progress bar
        newestOnTop={false} // New toasts appear below older ones
        closeOnClick // Close toasts when clicked
        rtl={false} // Left-to-right layout
        pauseOnFocusLoss // Pause toasts when the window loses focus
        draggable // Allow dragging toasts
        pauseOnHover // Pause toasts when hovered
      />

      {/* Routes */}
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/task" element={<Task />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
      </Routes>
    </Router>
  );
}

export default App;
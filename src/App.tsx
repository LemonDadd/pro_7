import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Workbench from '@/pages/Workbench'

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Workbench />} />
      </Routes>
    </Router>
  )
}

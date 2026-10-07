import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import EventDetail from './pages/EventDetail';
import Checkout from './pages/Checkout';
import OrderStatus from './pages/OrderStatus';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/events/:id" element={<EventDetail />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/status" element={<OrderStatus />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
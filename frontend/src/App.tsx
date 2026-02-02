import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import Home from './pages/Home';
import AddItem from './pages/AddItem';
import EditItem from './pages/EditItem';
import Inventory from './pages/Inventory';
import Analytics from './pages/Analytics';
import Identify from './pages/Identify';
import Stores from './pages/Stores';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="add" element={<AddItem />} />
            <Route path="edit/:id" element={<EditItem />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="identify" element={<Identify />} />
            <Route path="stores" element={<Stores />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster position="top-center" />
    </QueryClientProvider>
  );
}

export default App;

import './App.css';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { Layout } from './components/Layout';
import { Admin } from './pages/Admin';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Favorites } from './pages/Favorites';
import { ShoppingList } from './pages/ShoppingList';
import { MyProfile } from './pages/MyProfile';
import { RecipeDetails } from './pages/RecipeDetails';
import { Register } from './pages/Register';
import { VerifyEmail } from './pages/VerifyEmail';
import { AuthProvider } from './state/auth';
import { UserProfile } from './pages/UserProfile';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/recipes/:id" element={<RecipeDetails />} />
            <Route path="/me" element={<MyProfile />} />
            <Route path="/favorites" element={<Favorites />} />
            <Route path="/shopping-list" element={<ShoppingList />} />
            <Route path="/u/:username" element={<UserProfile />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

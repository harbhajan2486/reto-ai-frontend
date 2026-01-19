
import React, { useState } from 'react';
import { User, AllowedUser, AppView } from '../types';
import { Mail, Lock, User as UserIcon, LogIn, ArrowRight, Chrome } from 'lucide-react';

interface AuthProps {
  view: AppView; // LOGIN or SIGNUP
  setView: (view: AppView) => void;
  onLogin: (user: User) => void;
  users: User[];
  allowedUsers: AllowedUser[];
  onSignup: (user: User) => void;
}

const Auth: React.FC<AuthProps> = ({ view, setView, onLogin, users, allowedUsers, onSignup }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Simulate login
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    // In a real app, we would check password hash. 
    // Here we assume "password" is correct if user exists for simplicity in this mock, 
    // or just check if password field is not empty.
    if (user && password) {
      onLogin(user);
    } else {
      setError('Invalid credentials or user does not exist.');
    }
  };

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
      setError('User already exists. Please login.');
      return;
    }

    // UAM Check: Is this email allowed?
    const allowed = allowedUsers.find(a => a.email.toLowerCase() === email.toLowerCase());
    
    if (!allowed) {
      setError('Access Denied. Your email is not whitelisted by the Administrator.');
      return;
    }

    const newUser: User = {
      id: `u-${Math.random().toString(36).substr(2, 9)}`,
      email: allowed.email, // Use normalized email from allow list or input
      name: name,
      role: allowed.role,
      retailerId: allowed.retailerId
    };

    onSignup(newUser);
  };

  const handleGoogleSim = () => {
      // Simulate Google Auth
      const googleEmail = prompt("Simulating Google Login. Enter email address:");
      if (!googleEmail) return;

      const existingUser = users.find(u => u.email.toLowerCase() === googleEmail.toLowerCase());
      if (existingUser) {
          onLogin(existingUser);
      } else {
          // If not existing, try to sign up if allowed
          const allowed = allowedUsers.find(a => a.email.toLowerCase() === googleEmail.toLowerCase());
          if (allowed) {
               const newUser: User = {
                id: `u-${Math.random().toString(36).substr(2, 9)}`,
                email: allowed.email,
                name: googleEmail.split('@')[0], // derived name
                role: allowed.role,
                retailerId: allowed.retailerId
              };
              onSignup(newUser);
          } else {
              setError(`Google Account (${googleEmail}) is not authorized. Contact Admin.`);
          }
      }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
        <div className="p-8 bg-blue-600 text-center">
            <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">RETO AI</h1>
            <p className="text-blue-100 opacity-90">Retail & Electronics Trade Operations</p>
        </div>

        <div className="p-8">
            <div className="flex justify-center mb-8 bg-slate-100 rounded-lg p-1">
                <button 
                    onClick={() => { setView(AppView.LOGIN); setError(''); }}
                    className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${view === AppView.LOGIN ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Login
                </button>
                <button 
                    onClick={() => { setView(AppView.SIGNUP); setError(''); }}
                    className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${view === AppView.SIGNUP ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Sign Up
                </button>
            </div>

            {view === AppView.LOGIN ? (
                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email Address</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-2.5 text-gray-400" size={18}/>
                            <input 
                                type="email" 
                                required
                                className="w-full pl-10 pr-4 py-2 border border-gray-600 rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                placeholder="name@company.com"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-2.5 text-gray-400" size={18}/>
                            <input 
                                type="password" 
                                required
                                className="w-full pl-10 pr-4 py-2 border border-gray-600 rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                placeholder="••••••••"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                            />
                        </div>
                    </div>
                    
                    {error && <div className="text-red-500 text-xs bg-red-50 p-2 rounded">{error}</div>}

                    <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg transition-colors flex items-center justify-center">
                        Sign In <ArrowRight size={18} className="ml-2"/>
                    </button>
                </form>
            ) : (
                <form onSubmit={handleSignup} className="space-y-4">
                     <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Full Name</label>
                        <div className="relative">
                            <UserIcon className="absolute left-3 top-2.5 text-gray-400" size={18}/>
                            <input 
                                type="text" 
                                required
                                className="w-full pl-10 pr-4 py-2 border border-gray-600 rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                placeholder="John Doe"
                                value={name}
                                onChange={e => setName(e.target.value)}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email Address</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-2.5 text-gray-400" size={18}/>
                            <input 
                                type="email" 
                                required
                                className="w-full pl-10 pr-4 py-2 border border-gray-600 rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                placeholder="name@company.com"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                            />
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1">* Email must be pre-authorized by Admin</p>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Create Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-2.5 text-gray-400" size={18}/>
                            <input 
                                type="password" 
                                required
                                className="w-full pl-10 pr-4 py-2 border border-gray-600 rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                placeholder="Create a strong password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    {error && <div className="text-red-500 text-xs bg-red-50 p-2 rounded">{error}</div>}

                    <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg transition-colors flex items-center justify-center">
                        Create Account <ArrowRight size={18} className="ml-2"/>
                    </button>
                </form>
            )}

            <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">Or continue with</span>
                </div>
            </div>

            <button onClick={handleGoogleSim} className="w-full border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center">
                <Chrome size={18} className="mr-2 text-red-500"/> Google Account
            </button>
        </div>
      </div>
      <div className="fixed bottom-4 text-slate-500 text-xs">
          &copy; 2024 Reto AI Inc.
      </div>
    </div>
  );
};

export default Auth;

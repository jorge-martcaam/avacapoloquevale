import { useState } from 'react';
import { LogIn, Mail, ArrowLeft, Loader2 } from 'lucide-react';
import { 
  signInWithGoogle, 
  loginWithEmail, 
  registerWithEmail
} from '../lib/firebase';

export default function AuthScreen() {
  const [method, setMethod] = useState<'options' | 'email'>('options');
  const [isLogin, setIsLogin] = useState(true);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setError(err.message || 'Erro co inicio de sesión de Google');
    }
    setLoading(false);
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (isLogin) {
        await loginWithEmail(email, password);
      } else {
        await registerWithEmail(email, password);
      }
    } catch (err: any) {
      setError(err.message || 'Erro coa autenticación de correo');
    }
    setLoading(false);
  };

  if (method === 'options') {
    return (
      <div className="max-w-md mx-auto text-center space-y-6 pt-8 border-t border-slate-100">
        <p className="text-slate-500">Inicia sesión na túa conta para acceder aos teus movementos de forma segura e integral.</p>
        
        {error && <p className="text-red-500 text-sm">{error}</p>}
        
        <div className="space-y-3">
          <button
             onClick={handleGoogleSignIn}
             disabled={loading}
             className="w-full flex items-center justify-center space-x-2 font-bold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 p-4 rounded-2xl shadow-sm transition-all"
          >
             {loading ? <Loader2 className="animate-spin" size={20} /> : <LogIn size={20} />}
             <span>Acceder con Google</span>
          </button>

          <button
             onClick={() => { setMethod('email'); setError(''); }}
             className="w-full flex items-center justify-center space-x-2 font-bold text-white bg-slate-800 hover:bg-slate-900 p-4 rounded-2xl shadow-sm transition-all"
          >
             <Mail size={20} />
             <span>Continuar con Correo</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto text-center space-y-6 pt-8 border-t border-slate-100">
      <button 
        onClick={() => { setMethod('options'); setError(''); }}
        className="flex items-center text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors mb-4"
      >
        <ArrowLeft size={16} className="mr-1" /> Volver
      </button>

      {method === 'email' && (
        <form onSubmit={handleEmailAuth} className="space-y-4">
          <h2 className="text-xl font-bold text-slate-800">{isLogin ? 'Iniciar Sesión' : 'Rexistrarse'}</h2>
          
          {error && <p className="text-red-500 text-sm text-left">{error}</p>}
          
          <div>
            <input 
              type="email" 
              placeholder="Enderezo de correo" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-4 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-800 bg-white"
              required
            />
          </div>
          <div>
            <input 
              type="password" 
              placeholder="Contrasinal" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-4 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-800 bg-white"
              required
            />
          </div>
          
          <button
             type="submit"
             disabled={loading}
             className="w-full flex items-center justify-center space-x-2 font-bold text-white bg-slate-800 hover:bg-slate-900 p-4 rounded-2xl shadow-sm transition-all"
          >
             {loading ? <Loader2 className="animate-spin" size={20} /> : <Mail size={20} />}
             <span>{isLogin ? 'Acceder' : 'Crear Conta'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm text-slate-500 hover:text-slate-800 font-medium"
          >
            {isLogin ? 'Non tes conta? Rexístrate' : 'Xa tes conta? Inicia sesión'}
          </button>
        </form>
      )}
    </div>
  );
}
